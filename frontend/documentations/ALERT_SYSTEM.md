# Real-Time Alert System

## Overview

### Purpose

The Real-Time Alert System automatically notifies clinicians when a newly submitted diagnosis is flagged as anomalous by the surveillance service. It bridges the anomaly detection pipeline (Isolation Forest on the Flask backend) with a live clinician-facing UI — without requiring a page refresh or manual polling.

### Target Users

- **Clinicians**: Receive instant notifications and review flagged cases from any page in the dashboard
- **Healthcare Administrators**: Monitor alert volume and response times
- **Developers**: Extend or maintain the alert pipeline and real-time subscription layer

### Key Benefits

- **Reliable detection**: Supabase Cron runs every 15 minutes — no alerts lost to serverless cold starts or transient failures
- **Persistent record**: Every alert is stored in PostgreSQL and survives page refreshes
- **Actionable**: Each alert can be acknowledged or dismissed directly from the alerts page
- **Explainable**: Reason codes describe exactly why a diagnosis was flagged, in plain language
- **Single shared subscription**: All UI consumers share one Zustand store and one Supabase Realtime channel — no duplicate connections
- **Batched toast notifications**: Exactly 1 summary toast per cron run (not 1 per alert) — prevents toast spam when many anomalies are detected

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| **7.0** | 2026-04-05 | Migrated from per-alert toasts to batched summary toasts (1 toast per cron run) |
| **6.0** | 2026-04-05 | Migrated from event-driven fire-and-forget to Supabase Cron-based surveillance |
| **5.0** | 2026-03-22 | Migrated from CDC EARS C1 to DOH PIDSR methodology |
| **4.0** | 2026-03-14 | Added K-Means spatial clustering + real-time toast notifications |
| **3.0** | 2026-03-09 | Added Supabase Realtime subscription + Zustand store |
| **2.0** | 2026-03-05 | Added alert acknowledgment/dismissal workflow |
| **1.0** | 2026-03-01 | Initial alert system with PostgreSQL storage |

---

## How It Works

### Core Functionality

Alerts are created by a Supabase Edge Function running on a 15-minute cron schedule:

1. Supabase Cron triggers the `/surveillance-cron` Edge Function
2. The Edge Function calls the Flask backend's unified `/api/surveillance/cron` endpoint
3. The backend runs Isolation Forest anomaly detection on all VERIFIED diagnoses
4. The Edge Function matches anomalies and creates `Alert` records in PostgreSQL (with dedup)
5. After all alerts are created, the Edge Function **broadcasts a single summary event** to all connected clinicians
6. Every connected clinician sees:
   - **Exactly 1 toast notification** summarizing all alerts from that cron run (e.g., "5 new alerts detected: 3 anomalies, 2 outbreaks")
   - The alerts table updates incrementally as each `Alert` row is inserted
   - The sidebar badge increments
   - All without refreshing

> **Note:** Surveillance runs on a 15-minute cron schedule, not at verification time. This ensures all VERIFIED diagnoses are analyzed within 15 minutes, with self-healing on transient failures. The cron endpoint only queries diagnoses with `status = 'VERIFIED'`, so PENDING diagnoses are not analyzed until a clinician verifies them.

> **Batched toast design:** Instead of firing 1 toast per `Alert` INSERT (which would spam clinicians when many anomalies are detected), the Edge Function broadcasts a single `cron-run-complete` event after all alerts are created. The frontend listens to this broadcast and shows exactly 1 summary toast per cron run.

### End-to-End Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Cron (every 15 minutes)                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Edge Function: /surveillance-cron                        │  │
│  │  1. GET /api/surveillance/cron                            │  │
│  │  2. Process anomalies[] + outbreaks[]                     │  │
│  │  3. Upsert Alert records with dedup                       │  │
│  │  4. Broadcast cron-run-complete summary                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────┬──────────────┘
                       │                           │
                       │ Alert INSERTs             │ broadcast event
                       ▼                           ▼
┌──────────────────────┐      ┌───────────────────────────────────────┐
│  Flask Backend       │      │  PostgreSQL + Supabase Realtime       │
│  /api/surveillance/  │─────▶│  Alert table    │  broadcast channel  │
│  cron                │      │  (INSERT events)│  (cron-run-complete)│
│  IsolationForest     │      └──────────┬────────┴─────────┬─────────┘
│  (VERIFIED-only)     │                 │                  │
└──────────────────────┘                 │                  │
                                         ▼                  ▼
                         ┌───────────────────────────────────────┐
                         │  Clinician Browser(s)                 │
                         │                                       │
                         │  useAlertsStore ("alerts-store")      │
                         │  ← single shared Zustand store        │
                         │    + single Supabase channel          │
                         │                                       │
                         │  postgres_changes INSERT listener     │
                         │  → AlertsList table updated           │
                         │  → AlertsNavBadge updated             │
                         │                                       │
                         │  broadcast cron-run-complete listener │
                         │  → AlertsToastListener fires 1 toast  │
                         │    with summary: "X anomalies,        │
                         │     Y outbreaks detected"             │
                         └───────────────────────────────────────┘
```
┌──────────────────────┐
│  Clinician Browser    │
│  /pending-diagnoses   │
│  approveDiagnosis     │
└──────────┬───────────┘
           │ next-safe-action (Server Action)
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Next.js Server      │────▶│  PostgreSQL           │
│  verify-diagnosis.ts │     │  Diagnosis table      │
│  or override-        │     │  (Prisma UPDATE to    │
│  diagnosis.ts        │     │   VERIFIED status)    │
└──────────┬───────────┘     └──────────────────────┘
           │ fire-and-forget (.catch)
           ▼
┌──────────────────────┐
│  checkAndCreateAlert │
│  (async, background) │
└──────────┬───────────┘
           │ HTTP GET (no-store)
           ▼
┌──────────────────────┐
│  Flask Backend       │
│  /api/surveillance/  │
│  outbreaks           │
│  IsolationForest     │
│  (VERIFIED-only)     │
└──────────┬───────────┘
           │ JSON { anomalies: [...] }
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  match anomaly by    │────▶│  PostgreSQL           │
│  diagnosisId?        │     │  Alert table          │
│                      │     │  (Prisma INSERT)      │
└──────────────────────┘     └──────────────────────┘
                              │ WAL → Supabase Realtime
                              ▼
                   ┌──────────────────────┐
                   │  supabase_realtime   │
                   │  publication         │
                   │  (postgres_changes)  │
                   └──────────┬───────────┘
                              │ WebSocket push
                              ▼
             ┌───────────────────────────────────────┐
             │  Clinician Browser(s)                 │
             │                                       │
             │  useAlertsStore ("alerts-store")      │
             │  ← single shared Zustand store        │
             │    + single Supabase channel          │
             │                                       │
             │  AlertsList        reads store        │
             │  → table updated                      │
             │                                       │
             │  AlertsNavBadge    reads store        │
             │  → sidebar badge updated              │
             │                                       │
             │  AlertsToastListener reads store      │
             │  → toast notification fired           │
             └───────────────────────────────────────┘
```
┌──────────────────────┐
│  Patient Browser     │
│  /diagnosis          │
│  autoRecordDiagnosis │
└──────────┬───────────┘
           │ next-safe-action (Server Action)
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Next.js Server      │────▶│  PostgreSQL           │
│  auto-record-        │     │  Diagnosis table      │
│  diagnosis.ts        │     │  (Prisma INSERT)      │
└──────────┬───────────┘     └──────────────────────┘
           │ fire-and-forget (.catch)
           ▼
┌──────────────────────┐
│  checkAndCreateAlert │
│  (async, background) │
└──────────┬───────────┘
           │ HTTP GET (no-store)
           ▼
┌──────────────────────┐
│  Flask Backend       │
│  /api/surveillance/  │
│  outbreaks           │
│  IsolationForest     │
└──────────┬───────────┘
           │ JSON { anomalies: [...] }
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  match anomaly by    │────▶│  PostgreSQL           │
│  diagnosisId?        │     │  Alert table          │
│                      │     │  (Prisma INSERT)      │
└──────────────────────┘     └──────────┬───────────┘
                                        │ WAL → Supabase Realtime
                                        ▼
                             ┌──────────────────────┐
                             │  supabase_realtime   │
                             │  publication         │
                             │  (postgres_changes)  │
                             └──────────┬───────────┘
                                        │ WebSocket push
                                        ▼
                    ┌───────────────────────────────────────┐
                    │  Clinician Browser(s)                 │
                    │                                       │
                    │  useAlertsStore ("alerts-store")      │
                    │  ← single shared Zustand store        │
                    │    + single Supabase channel          │
                    │                                       │
                    │  AlertsList        reads store        │
                    │  → table updated                      │
                    │                                       │
                    │  AlertsNavBadge    reads store        │
                    │  → sidebar badge updated              │
                    │                                       │
                    │  AlertsToastListener reads store      │
                    │  → toast notification fired           │
                    └───────────────────────────────────────┘
```

### Alert Creation Pipeline (Detail)

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  Supabase Cron       │     │  Flask Backend       │     │  Edge Function       │
│  (every 15 min)      │────▶│  /api/surveillance/  │────▶│  /surveillance-cron  │
│                      │     │  cron                │     │                      │
│  Trigger             │     │  IsolationForest     │     │  Process anomalies[] │
└──────────────────────┘     │  + Outbreak Detect   │     │  + outbreaks[]       │
                             └──────────────────────┘     └──────────┬───────────┘
                                                                      │
                                                                      ▼
                                                       ┌──────────────────────┐
                                                       │  PostgreSQL           │
                                                       │  Alert table          │
                                                       │  (Supabase INSERT)    │
                                                       │  with dedup           │
                                                       └──────────────────────┘
```

### User Flow — Clinician

1. Patient submits symptoms and receives an AI-generated diagnosis (status: PENDING)
2. Clinician opens `/pending-diagnoses` or any page under `/dashboard`
3. Clinician reviews the diagnosis and clicks "Verify"
4. `approveDiagnosis` action updates the diagnosis status to `VERIFIED`
5. Supabase Cron (every 15 minutes) triggers the surveillance Edge Function
6. Edge Function calls Flask `/api/surveillance/cron` — runs Isolation Forest on all VERIFIED diagnoses
7. If the new diagnosis is anomalous: an `Alert` row is inserted into PostgreSQL
8. Supabase Realtime broadcasts the INSERT via WebSocket to all connected clinician browsers
9. The store's single channel callback fires, updating `alerts` and `latestAlert` in one place
10. All consumers react via their selectors:
    - `AlertsList` inserts the new row at the top of the table
    - `AlertsNavBadge` increments the sidebar count badge
    - `AlertsToastListener` fires a severity-coloured toast notification
11. Clinician clicks "View Alerts" on the toast or navigates to `/alerts`
12. Clinician reviews the alert detail modal (reason codes, metadata, diagnosis link)
13. Clinician acknowledges or dismisses the alert; status change propagates back via Realtime UPDATE event to all connected clinicians

> **Clinical Override Path:** When a clinician applies a clinical override (`override-diagnosis.ts`), the diagnosis is auto-verified. The next cron run (within 15 minutes) will analyze it alongside all other VERIFIED diagnoses.

---

## Implementation

### Technical Requirements

#### Dependencies (Frontend)

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x",
  "@tanstack/react-table": "^8.x",
  "next-safe-action": "^7.x",
  "sonner": "^1.x",
  "zustand": "^5.x",
  "zod": "^3.x",
  "lucide-react": "^0.x"
}
```

#### Database

- PostgreSQL (via Supabase)
- Prisma ORM v6.x
- Supabase Realtime with `supabase_realtime` publication enabled on the `Alert` table

#### Supabase Setup (required once)

Run the following SQL in the Supabase SQL Editor or apply via migration:

```sql
-- Allow authenticated users to read the Alert table
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public."Alert" TO authenticated;

-- Enable Row Level Security
ALTER TABLE public."Alert" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read alerts"
  ON public."Alert"
  FOR SELECT
  TO authenticated
  USING (true);

-- Add Alert to the Realtime publication so WAL events are broadcast
ALTER PUBLICATION supabase_realtime ADD TABLE public."Alert";
```

Migration file: `frontend/supabase/migrations/20260309143938_alert_rls_realtime.sql`

### File Structure

```
supabase/
├── functions/
│   └── surveillance-cron/
│       ├── index.ts                          # Edge Function: calls backend, creates alerts
│       └── deno.json                         # Deno config
frontend/
├── prisma/
│   └── schema.prisma                         # Alert model, enums, User relation
├── supabase/
│   └── migrations/
│       └── 20260309143938_alert_rls_realtime.sql  # RLS + Realtime publication
├── types/
│   └── index.ts                              # Alert, AlertSeverity, AlertStatus, AlertType, AlertMetadata, AlertNote
├── schemas/
│   ├── CreateAlertSchema.ts                  # Zod schema for alert creation
│   ├── AlertIdSchema.ts                      # Zod schema for acknowledge/dismiss/resolve
│   ├── AlertNoteSchema.ts                    # Zod schema for creating a note
│   └── UpdateAlertNoteSchema.ts              # Zod schema for editing a note
├── actions/
│   ├── verify-diagnosis.ts                   # No alert calls — cron handles surveillance
│   ├── override-diagnosis.ts                 # No alert calls — cron handles surveillance
│   ├── create-alert.ts                       # next-safe-action: creates an Alert
│   ├── acknowledge-alert.ts                  # next-safe-action: sets ACKNOWLEDGED
│   ├── dismiss-alert.ts                      # next-safe-action: sets DISMISSED
│   ├── resolve-alert.ts                      # next-safe-action: sets RESOLVED (tracks resolvedAt/resolvedBy)
│   ├── create-alert-note.ts                  # next-safe-action: adds a note to an alert
│   └── update-alert-note.ts                  # next-safe-action: edits an existing note (author only)
├── utils/
│   └── alert-severity.ts                     # Severity mapping + badge helpers
├── stores/
│   └── use-alerts-store.ts                   # Zustand store: single channel + all alert state
├── components/clinicians/alerts/
│   ├── alerts-store-provider.tsx             # Mounts store (initialize/teardown) in layout
│   ├── columns.tsx                           # TanStack Table column definitions
│   ├── alerts-table.tsx                      # Full data table + detail modal
│   ├── alerts-list.tsx                       # Reads store → renders table
│   ├── alerts-nav-badge.tsx                  # Reads store → sidebar unread count badge
│   └── alerts-toast-listener.tsx             # Reads store → background toast notifier
├── components/patient/layout/
│   ├── nav-link.tsx                          # Modified: accepts optional badge prop
│   └── nav-links.tsx                         # Modified: passes badge to Alerts item
└── app/(app)/(clinician)/
    ├── layout.tsx                            # Mounts AlertsStoreProvider + AlertsToastListener
    └── alerts/
        └── page.tsx                          # Alerts page (gradient header + AlertsList)
```

---

## Database Schema

### `Alert` Model

```prisma
model Alert {
  id             Int           @id @default(autoincrement())
  type           AlertType
  severity       AlertSeverity
  status         AlertStatus   @default(NEW)
  diagnosisId    Int?
  diagnosis      Diagnosis?    @relation(fields: [diagnosisId], references: [id], onDelete: SetNull)
  reasonCodes    String[]
  message        String
  metadata       Json?
  createdAt      DateTime      @default(now())
  acknowledgedAt DateTime?
  acknowledgedBy Int?
  acknowledger   User?         @relation("AlertAcknowledger", fields: [acknowledgedBy], references: [id], onDelete: SetNull)
  resolvedAt     DateTime?
  resolvedBy     Int?
  resolver       User?         @relation("AlertResolver", fields: [resolvedBy], references: [id], onDelete: SetNull)
  notes          AlertNote[]
}
```

### Enums

```prisma
enum AlertType {
  ANOMALY           // Geographic, temporal, spatial group, age, gender, or combined anomaly
}

enum AlertSeverity {
  CRITICAL  // GEOGRAPHIC:RARE + COMBINED:MULTI both present
  HIGH      // GEOGRAPHIC:RARE alone, or COMBINED:MULTI with ≥3 codes
  MEDIUM    // CLUSTER:DENSE or OUTBREAK:VOL_SPIKE
  LOW       // Any other single reason
}

enum AlertStatus {
  NEW           // Freshly created, not yet acted upon
  ACKNOWLEDGED  // Clinician has reviewed and acknowledged
  RESOLVED      // Clinician has marked the alert as fully resolved
  DISMISSED     // Clinician has dismissed as non-actionable
}
```

### Metadata Shape (`Json?`)

The `AlertMetadata` type is exported from `frontend/types/index.ts`:

```typescript
export type AlertMetadata = {
  disease?: string;
  city?: string;
  province?: string;
  region?: string;
  barangay?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  patientAge?: number;
  patientGender?: string;
  anomalyScore?: number;
  confidence?: number;
  uncertainty?: number;
};
```

---

## Component Architecture

### 1. `supabase/functions/surveillance-cron/index.ts` — Supabase Edge Function

**Location**: `supabase/functions/surveillance-cron/index.ts`

The Edge Function is triggered by Supabase Cron every 15 minutes. It:

1. Calls the Flask backend's unified `/api/surveillance/cron` endpoint
2. Processes anomaly results — creates `ANOMALY` alerts with dedup by `diagnosisId`
3. Processes outbreak results — creates `OUTBREAK` alerts with 24h dedup by disease+district
4. **Broadcasts a single `cron-run-complete` summary event** to all connected clinicians
5. Returns `{ success, results: { anomalies, outbreaks, errors } }` for cron logging

```typescript
// Called by Supabase Cron every 15 minutes
serve(async (req) => {
  const backendRes = await fetch(`${BACKEND_URL}/api/surveillance/cron`);
  const data = await backendRes.json();

  // Process anomalies — skip if alert already exists for diagnosisId
  results.anomalies = await processAnomalies(supabase, data.anomalies);

  // Process outbreaks — skip if active alert exists within 24h
  results.outbreaks = await processOutbreaks(supabase, data.outbreaks);

  // Broadcast single summary event → triggers exactly 1 toast per cron run
  await supabase.channel("surveillance-cron-run").send({
    type: "broadcast",
    event: "cron-run-complete",
    payload: {
      anomalyCount: results.anomalies,
      outbreakCount: results.outbreaks,
      timestamp: new Date().toISOString(),
    },
  });
});
```

**Batched toast design:**
- Individual `Alert` INSERTs fire `postgres_changes` events → update table + badge
- After all alerts are created, a single `broadcast` event fires → triggers 1 summary toast
- This prevents toast spam when many anomalies are detected in one cron run

Key design decisions:
- **Idempotent**: Upsert logic + 24h dedup means double-fires are no-ops
- **Partial failure tolerant**: If one detection engine fails, the other still processes
- **Self-healing**: If the cron run fails entirely, the next 5-minute tick catches all VERIFIED diagnoses

---

### 2. `use-alerts-store.ts` — Zustand Store

**Location**: `frontend/stores/use-alerts-store.ts`

The single source of truth for all alert state. Replaces the former `useAlerts` hook pattern where each consumer opened its own Supabase channel. Now, one store holds all alerts (all statuses) and one channel (`"alerts-store"`) handles all Realtime events.

```typescript
const useAlertsStore = create<AlertsState>()((set, get) => ({ ... }))
```

#### State Shape

| Field | Type | Description |
|-------|------|-------------|
| `alerts` | `Alert[]` | All alerts, all statuses, newest-first |
| `latestCronRun` | `CronRunSummary \| null` | Summary of the most recent cron run (triggers batched toast) |
| `isLoading` | `boolean` | True until initial fetch resolves |
| `error` | `string \| null` | Fetch error message if initial load fails |
| `isInitialized` | `boolean` | Guards against double-initialization |

#### CronRunSummary Shape

```typescript
interface CronRunSummary {
  anomalyCount: number;
  outbreakCount: number;
  timestamp: string;
}
```

#### Actions

| Action | Description |
|--------|-------------|
| `initialize()` | Fetches all alerts (with notes) + opens the Realtime channels. Guarded by `isInitialized`. |
| `teardown()` | Removes both Realtime channels, resets `isInitialized`. |
| `clearLatestCronRun()` | Sets `latestCronRun` to null after a batched toast has been shown. |
| `acknowledge(id)` | Calls the `acknowledgeAlert` server action. |
| `dismiss(id)` | Calls the `dismissAlert` server action. |
| `resolve(id)` | Calls the `resolveAlert` server action; records `resolvedAt`/`resolvedBy`. |
| `addNote(alertId, content)` | Calls the `createAlertNote` server action; on success, immediately applies the returned note to local state. |
| `editNote(noteId, content)` | Calls the `updateAlertNote` server action (author-only enforcement server-side); on success, immediately patches the note in local state. |

#### Initial Fetch

On `initialize()`, the store queries the full `Alert` table via the Supabase browser client:

```typescript
const { data } = await supabase
  .from("Alert")
  .select("*")
  .order("createdAt", { ascending: false });
```

All statuses are fetched in one query. Consumers derive their own views client-side via selectors.

#### Realtime Subscription (In Depth)

```typescript
_channel = supabase
  .channel("alerts-store")           // unique suffix per mount
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "Alert" },
    (payload) => {
      const incoming = { ...(payload.new as Alert), notes: [] };
      set((state) => {
        const exists = state.alerts.some((a) => a.id === incoming.id);
        if (!exists) state.alerts.unshift(incoming);
      });
    },
  )
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "Alert" },
    (payload) => {
      const updated = payload.new as Alert;
      set((state) => {
        const exists = state.alerts.some((a) => a.id === updated.id);
        if (exists) {
          const existingNotes = state.alerts.find((a) => a.id === updated.id)?.notes ?? [];
          state.alerts[state.alerts.findIndex((a) => a.id === updated.id)] = { ...updated, notes: existingNotes };
        } else {
          state.alerts.unshift({ ...updated, notes: [] });
        }
      });
    },
  )
  .subscribe();

// Separate channel for cron-run broadcast events
_broadcastChannel = supabase.channel("surveillance-cron-run");
_broadcastChannel
  .on("broadcast", { event: "cron-run-complete" }, (payload) => {
    set((state) => {
      state.latestCronRun = payload.payload as CronRunSummary;
    });
  })
  .subscribe();
```

**Two-channel design:**
1. **`alerts-store-{random}`** (`postgres_changes`) — Fires for every `Alert` INSERT/UPDATE. Updates the table and sidebar badge incrementally. Does **not** trigger toasts.
2. **`surveillance-cron-run`** (`broadcast`) — Subscribed to by the frontend, broadcast to by the Edge Function. Fires once per cron run after all alerts are created. Triggers exactly 1 summary toast in `AlertsToastListener`.

> **Why two channels?** The Edge Function broadcasts to a fixed channel name (`surveillance-cron-run`) so all clinician browsers receive the same event. The `postgres_changes` channel uses a random suffix to avoid React Strict Mode double-mount collisions — these can't be the same channel.

> **Note:** The `AlertNote` table is **not** added to the Supabase Realtime publication. Note mutations (`addNote`, `editNote`) are reflected in the UI immediately by consuming the server action's return value directly in the store, then applying it to local state. No Realtime round-trip is needed for notes.

**How Supabase Realtime works under the hood:**

1. When `prisma.alert.create()` executes on the server, PostgreSQL writes to its Write-Ahead Log (WAL)
2. The `supabase_realtime` logical replication publication is watching the `Alert` table — since we added it via `ALTER PUBLICATION supabase_realtime ADD TABLE public."Alert"`
3. Supabase's Realtime server reads the WAL event and routes it to any WebSocket channel subscribers that match the filter `{ schema: "public", table: "Alert" }`
4. The browser receives the event payload over the existing WebSocket connection (no new HTTP request)
5. The store's `.on("postgres_changes", ...)` callback fires with `payload.new` containing the full new row

**Why the channel reference lives outside the store:**

The `_channel` variable is module-scoped rather than stored in Zustand state. This avoids making the channel object reactive, preventing unnecessary re-renders when the channel status changes.

**Cleanup:**

```typescript
teardown: () => {
  if (_channel) {
    const supabase = createClient();
    supabase.removeChannel(_channel);
    _channel = null;
  }
  set({ isInitialized: false });
},
```

The channel is explicitly removed when `AlertsStoreProvider` unmounts (on clinician layout teardown).

#### Consuming the Store — Selector Patterns

```typescript
// Multiple related values — use useShallow to prevent re-renders
const { alerts, isLoading, acknowledge } = useAlertsStore(
  useShallow((s) => ({ alerts: s.alerts, isLoading: s.isLoading, acknowledge: s.acknowledge }))
);

// Single derived value — inline selector, no useShallow needed
const unreadCount = useAlertsStore(
  (s) => s.alerts.filter((a) => a.status === "NEW").length
);
```

---

### 3. `AlertsStoreProvider` — Store Lifecycle

**Location**: `frontend/components/clinicians/alerts/alerts-store-provider.tsx`

A `"use client"` component that calls `initialize()` on mount and `teardown()` on unmount. Renders `null`. Mounted once in `app/(app)/(clinician)/layout.tsx` alongside `AlertsToastListener`.

```typescript
const AlertsStoreProvider = () => {
  const initialize = useAlertsStore((s) => s.initialize);
  const teardown = useAlertsStore((s) => s.teardown);

  useEffect(() => {
    initialize();
    return () => teardown();
  }, [initialize, teardown]);

  return null;
};
```

This is the only place `initialize()` is called. All other components read from the store passively.

---

### 4. `AlertsToastListener` — Batched Summary Toast Notifier

**Location**: `frontend/components/clinicians/alerts/alerts-toast-listener.tsx`

Mounted once in `app/(app)/(clinician)/layout.tsx` so it runs on every clinician page. It reads `latestCronRun` from the store and fires a single `sonner` toast summarizing all alerts from that cron run:

```typescript
const AlertsToastListener = () => {
  const { latestCronRun, clearLatestCronRun } = useAlertsStore(
    useShallow((s) => ({
      latestCronRun: s.latestCronRun,
      clearLatestCronRun: s.clearLatestCronRun,
    }))
  );

  useEffect(() => {
    if (!latestCronRun) return;

    const { anomalyCount, outbreakCount, timestamp } = latestCronRun;
    const totalAlerts = anomalyCount + outbreakCount;

    if (totalAlerts === 0) {
      clearLatestCronRun();
      return;
    }

    // Build summary: "3 anomalies, 2 outbreaks"
    const parts: string[] = [];
    if (anomalyCount > 0) parts.push(`${anomalyCount} anomal${anomalyCount === 1 ? "y" : "ies"}`);
    if (outbreakCount > 0) parts.push(`${outbreakCount} outbreak${outbreakCount === 1 ? "" : "s"}`);
    const summary = parts.join(", ");

    // Severity colour based on what was detected
    const toastFn =
      anomalyCount > 0 || outbreakCount > 2
        ? toast.error
        : outbreakCount > 0
          ? toast.warning
          : toast.info;

    toastFn(`${totalAlerts} new alert${totalAlerts === 1 ? "" : "s"} detected`, {
      description: `${summary} · ${new Date(timestamp).toLocaleTimeString()}`,
      duration: 8000,
      action: { label: "View Alerts", onClick: () => window.location.href = "/alerts" },
    });

    clearLatestCronRun(); // prevent re-firing on re-render
  }, [latestCronRun, clearLatestCronRun]);

  return null; // renders nothing
};
```

Toast severity mapping (batched):

| Condition | Sonner Function | Visual |
|-----------|----------------|--------|
| Any anomalies detected | `toast.error` | Red |
| 3+ outbreaks detected | `toast.error` | Red |
| 1-2 outbreaks detected | `toast.warning` | Yellow |
| Only anomalies (low priority) | `toast.info` | Blue |

**Why batched toasts?**
Before this change, each `Alert` INSERT fired a separate toast. With cron runs detecting 10+ anomalies at once, clinicians would see 10+ consecutive toasts — a poor UX. The batched approach shows exactly 1 summary toast per 15-minute cycle.

---

### 5. `AlertsNavBadge` — Sidebar Unread Count

**Location**: `frontend/components/clinicians/alerts/alerts-nav-badge.tsx`

Reads the `NEW` alert count from the store via an inline derived selector:

```typescript
const AlertsNavBadge = () => {
  const unreadCount = useAlertsStore(
    (s) => s.alerts.filter((a) => a.status === "NEW").length
  );

  if (unreadCount === 0) return null;

  return (
    <span className="badge badge-error badge-xs absolute -top-1 -right-1">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
};
```

The badge is passed as a `badge` prop to `NavLink` and rendered inside the icon container's relative positioning context. This required a small modification to `nav-link.tsx` to accept `badge?: ReactNode` and wrap the icon in a `relative` container.

---

### 6. `AlertsList` + `AlertsTable` — Alerts Page

**Location**: `frontend/components/clinicians/alerts/alerts-list.tsx` and `alerts-table.tsx`

`AlertsList` reads directly from the store and passes live data down to `AlertsTable`:

```typescript
const AlertsList = () => {
  const { alerts, isLoading, error, acknowledge, dismiss } = useAlertsStore(
    useShallow((s) => ({
      alerts: s.alerts,
      isLoading: s.isLoading,
      error: s.error,
      acknowledge: s.acknowledge,
      dismiss: s.dismiss,
    }))
  );
  // ...
};
```

Because the store fetches all statuses, the full alert history is always available — no status filter needed here.

#### Notes State — Live Derivation

`AlertsTable` stores only the selected alert's **ID** (`selectedAlertId: number | null`) rather than the full alert object. The alert passed to the modal is derived live on every render:

```typescript
const selectedAlert = selectedAlertId !== null
  ? (data.find((a) => a.id === selectedAlertId) ?? null)
  : null;
```

This means that whenever `addNote()` or `editNote()` updates the store and `data` re-flows into `AlertsTable`, `selectedAlert` automatically reflects the latest state — including any newly added or edited notes — and the modal re-renders without needing to be closed and reopened.

**Why not `useState<Alert | null>`?** Storing the full alert object as a snapshot at click-time would cause the modal to display stale data: mutations that update the store would propagate to `data` but never reach `selectedAlert`, because `useState` does not automatically re-sync with changed prop values.

- **Search**: global filter across all columns
- **Sort**: by date (newest/oldest) or severity (high-low / low-high)
- **Status filter**: dropdown for NEW / ACKNOWLEDGED / RESOLVED / DISMISSED
- **Severity filter**: dropdown for CRITICAL / HIGH / MEDIUM / LOW
- **Pagination**: configurable rows per page (10 / 25 / 50 / 100)
- **Detail modal**: DaisyUI `<dialog>` showing full alert fields including reason code descriptions, metadata, and acknowledge/dismiss actions

---

### 7. Server Actions

#### `create-alert.ts`

A `next-safe-action` action for manually creating alerts (e.g. from tests or future admin tools). In the automated pipeline, `checkAndCreateAlert()` in `auto-record-diagnosis.ts` writes directly via Prisma to avoid a nested server-action round-trip.

```typescript
export const createAlert = actionClient
  .inputSchema(CreateAlertSchema)
  .action(async ({ parsedInput }) => {
    const alert = await prisma.alert.create({ data: { ...parsedInput } });
    return { success: alert };
  });
```

#### `acknowledge-alert.ts`

Sets `status: "ACKNOWLEDGED"`, `acknowledgedAt: new Date()`, and `acknowledgedBy: dbUser.id`:

```typescript
export const acknowledgeAlert = actionClient
  .inputSchema(AlertIdSchema)
  .action(async ({ parsedInput }) => {
    const alert = await prisma.alert.update({
      where: { id: parsedInput.alertId },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        acknowledgedBy: dbUser.id,
      },
    });
    return { success: alert };
  });
```

The UPDATE triggers a Supabase Realtime `UPDATE` event, which the store processes to update the alert's status on all connected clinician browsers without a reload.

#### `dismiss-alert.ts`

Sets `status: "DISMISSED"` only:

```typescript
export const dismissAlert = actionClient
  .inputSchema(AlertIdSchema)
  .action(async ({ parsedInput }) => {
    const alert = await prisma.alert.update({
      where: { id: parsedInput.alertId },
      data: { status: "DISMISSED" },
    });
    return { success: alert };
  });
```

---

### 8. `alert-severity.ts` — Severity Utilities

**Location**: `frontend/utils/alert-severity.ts`

#### `mapReasonCodesToSeverity(reasonCodes: string[]): AlertSeverity`

Evaluated in priority order:

| Condition | Severity |
|-----------|----------|
| `GEOGRAPHIC:RARE` AND `COMBINED:MULTI` both present | `CRITICAL` |
| `GEOGRAPHIC:RARE` alone | `HIGH` |
| `COMBINED:MULTI` with ≥ 3 codes | `HIGH` |
| `CLUSTER:DENSE` or `OUTBREAK:VOL_SPIKE` | `MEDIUM` |
| Any other single code | `LOW` |

#### `getSeverityBadgeClass(severity): string`

Returns the DaisyUI badge class: `badge-error` / `badge-warning` / `badge-info` / `badge-ghost`.

#### `getSeverityLabel(severity): string`

Returns the human label: `"Critical"` / `"High"` / `"Medium"` / `"Low"`.

---

## Shared Types

Alert-related types are exported from `frontend/types/index.ts` alongside all other shared frontend types:

```typescript
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "NEW" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
export type AlertType = "ANOMALY" | "OUTBREAK";
export type AlertMetadata = { ... };
export type Alert = { ... };
```

Import from `@/types` in any component or store that needs these types.

---

## Zod Schemas

### `CreateAlertSchema`

```typescript
z.object({
  type: z.enum(["ANOMALY", "OUTBREAK"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  diagnosisId: z.number().optional(),
  reasonCodes: z.array(z.string()).min(1),
  message: z.string().min(1),
  metadata: z.object({
    disease, city, province, region, barangay, district,
    latitude, longitude, patientAge, patientGender,
    anomalyScore, confidence, uncertainty,
  }).optional(),
})
```

### `AlertIdSchema`

```typescript
z.object({
  alertId: z.number().min(1),
})
```

Used by both `acknowledge-alert.ts` and `dismiss-alert.ts`.

---

## Reason Codes

Reason codes are sourced from the Flask surveillance service's `reason` field (pipe-separated string, e.g. `"GEOGRAPHIC:RARE|COMBINED:MULTI"`). They are split into a `String[]` array when the `Alert` is created.

| Code | Label | Description |
|------|-------|-------------|
| `GEOGRAPHIC:RARE` | Unusual location | Disease rarely reported in this area |
| `TEMPORAL:RARE` | Unusual timing | Case recorded at an atypical time of year |
| `COMBINED:MULTI` | Multiple factors | Two or more independent factors contributed |
| `AGE:RARE` | Unusual age | Patient age outside typical range for this disease |
| `GENDER:RARE` | Unusual gender | Patient gender uncommon for this disease |

Human-readable labels and descriptions are defined in `frontend/utils/anomaly-reasons.ts` and reused across both the anomaly map view and the alerts detail modal.

---

## Alerts Page

**Route**: `/alerts`
**File**: `frontend/app/(app)/(clinician)/alerts/page.tsx`

A Server Component page with the standard clinician gradient header layout. The data table is a Client Component (`AlertsList`) that handles all interactivity and live updates:

```
┌─────────────────────────────────────────────────┐
│  Alerts                                         │
│  Real-time anomaly alerts from the              │
│  surveillance system                            │
├─────────────────────────────────────────────────┤
│  [Search...]  [Sort ▼]  [Status ▼]  [Severity▼] │
├──────────┬────────┬──────────┬──────┬───────────┤
│ Severity │ Status │ Type     │ Date │ Actions   │
├──────────┼────────┼──────────┼──────┼───────────┤
│ CRITICAL │ NEW    │ Anomaly  │ ...  │ 👁 ✓ ✕   │
│ HIGH     │ NEW    │ Anomaly  │ ...  │ 👁 ✓ ✕   │
│ LOW      │ ACK'd  │ Anomaly  │ ...  │ 👁        │
└──────────┴────────┴──────────┴──────┴───────────┘
│  Rows per page: [10 ▼]   1-10 of 24  ← Prev Next→ │
```

Action buttons per row:
- **👁 View Details** — opens DaisyUI dialog with full alert information, notes, and note composer
- **✓ Acknowledge** — only shown for `NEW` alerts
- **✕ Dismiss** — only shown for `NEW` alerts
- **Resolve** — only shown for `NEW` and `ACKNOWLEDGED` alerts

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Flask surveillance unavailable | Edge Function logs the error, returns 500. Next cron run (15 min) retries — no alerts permanently lost |
| Flask responds non-200 | Edge Function logs the error, returns partial results with `errors` field |
| Diagnosis not in anomaly list | No alert created (diagnosis is normal) |
| Supabase alert creation fails | Error logged by Edge Function; next cron run will retry (idempotent) |
| Supabase initial fetch fails | `error` state set in store; `AlertsList` renders an error alert banner |
| RLS permission denied (42501) | Caused by missing `GRANT USAGE ON SCHEMA public` — fixed by migration `20260309143938_alert_rls_realtime.sql` |
| Realtime events not firing | Caused by `Alert` table missing from `supabase_realtime` publication — fixed by `ALTER PUBLICATION supabase_realtime ADD TABLE public."Alert"` |
| Edge Function timeout | 400s timeout is more than enough for ML inference. If hit, next cron run catches up |

---

## Configuration

### Surveillance Contamination Rate

The unified cron endpoint uses a fixed contamination rate of `0.05` (5%):

```python
contamination = float(request.args.get("contamination", 0.05))
```

This can be made configurable via an environment variable if different sensitivity is needed.

### Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `createClient()` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `createClient()` | Supabase anon key for browser client |
| `BACKEND_URL` | Edge Function | Flask surveillance endpoint base URL (Supabase secret) |
| `SUPABASE_URL` | Edge Function | Supabase project URL (Supabase secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function | Supabase service role key for direct DB writes (Supabase secret) |
| `DATABASE_URL` | Prisma | PostgreSQL connection string |

---

## Performance Considerations

- **Single cron run per interval**: One detection run every 15 minutes instead of N redundant runs per verification
- **Single Supabase channel**: All three consumers (`AlertsList`, `AlertsNavBadge`, `AlertsToastListener`) share one WebSocket channel via the Zustand store
- **Single fetch**: The store fetches all alerts once on `initialize()`. All consumers filter or derive what they need client-side via selectors — no duplicate Supabase queries
- **Selector optimization**: `useShallow` is used for multi-value selectors to prevent unnecessary re-renders when unrelated store fields change
- **`isInitialized` guard**: Prevents double-initialization in React Strict Mode (which mounts components twice in development)
- **Pagination**: TanStack Table handles large alert sets client-side; no server-side pagination needed at current scale
- **VERIFIED-only analysis**: The Flask surveillance endpoint only queries diagnoses with `status = 'VERIFIED'`, so alerts are only created for confirmed cases. This means newly PENDING diagnoses won't trigger alerts until a clinician verifies them
- **Idempotent cron**: Double-fires or retry runs are no-ops due to upsert logic + 24h dedup

---

## Testing Checklist

- [ ] Verify a diagnosis on the pending diagnoses page — alert appears in `/alerts` within 15 minutes
- [ ] Verify toast notification fires on any clinician page when alert is created
- [ ] Verify sidebar badge increments on new alert
- [ ] Acknowledge an alert — verify status changes to ACKNOWLEDGED on all open browser tabs
- [ ] Resolve an alert — verify status changes to RESOLVED and resolvedAt/resolvedBy are recorded
- [ ] Dismiss an alert — verify it moves to DISMISSED status in the table
- [ ] Add a note to an alert — verify the note appears immediately in the open modal without closing/reopening
- [ ] Edit a note — verify the updated content appears immediately in the open modal
- [ ] Attempt to edit another clinician's note — verify the action is rejected server-side
- [ ] Check browser console shows `[useAlertsStore] channel status: SUBSCRIBED`
- [ ] Verify only one channel is opened (no duplicate `"alerts-store"` entries in console)
- [ ] Verify `/alerts` page loads without `42501 permission denied` error
- [ ] Verify that a PENDING diagnosis does NOT trigger an alert (alert only fires after verification)
- [ ] Run `npx tsx scripts/trigger-outbreak.ts` — verify manual trigger works with new cron endpoint
- [ ] Apply clinical override on a PENDING diagnosis — verify alert appears on next cron run

---

## Future Enhancements

- [ ] **Filtering by date range**: Add a date picker to the alerts table
- [ ] **Bulk acknowledge/dismiss**: Checkbox selection + bulk action buttons
- [ ] **Alert export**: CSV/PDF export of filtered alerts
- [ ] **Per-clinician assignment**: Assign alerts to specific clinicians for follow-up
- [ ] **Configurable contamination**: Allow admins to tune the anomaly sensitivity per disease
- [ ] **Push notifications**: Browser push notifications for clinicians who are not on the dashboard
- [ ] **Cron dashboard**: Admin UI to view cron execution logs and last-run status

---

## Related Features

| Feature | Relationship |
|---------|-------------|
| **Anomaly Detection & Surveillance** | Source of anomaly classifications that trigger alerts. See `ANOMALY_DETECTION_SURVEILLANCE.md` |
| **Disease Map** | Visualizes the same anomalous diagnoses geographically |
| **Healthcare Reports** | Full table of all diagnoses, including those that generated alerts |
| **Diagnosis Verification** | Updates status to VERIFIED — cron picks up on next run |
| **Clinical Override** | Auto-verifies PENDING diagnoses — cron picks up on next run |

---

## Appendix

### External Resources

- [Supabase Realtime — Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron](https://supabase.com/docs/guides/functions/cron-jobs)
- [Zustand](https://zustand.docs.pmnd.rs/)
- [TanStack Table](https://tanstack.com/table/)
- [next-safe-action](https://next-safe-action.dev/)
- [Sonner](https://sonner.emilkowal.ski/)

---

**Version**: 6.0 (Supabase Cron Migration)
**Last Updated**: April 05, 2026
**Maintainer**: AI'll Be Sick Development Team

