# Real-Time Alert System

## Overview

### Purpose

The Real-Time Alert System automatically notifies clinicians when a newly submitted diagnosis is flagged as anomalous by the surveillance service. It bridges the anomaly detection pipeline (Isolation Forest on the Flask backend) with a live clinician-facing UI — without requiring a page refresh or manual polling.

### Target Users

- **Clinicians**: Receive instant notifications and review flagged cases from any page in the dashboard
- **Healthcare Administrators**: Monitor alert volume and response times
- **Developers**: Extend or maintain the alert pipeline and real-time subscription layer

### Key Benefits

- **Zero-latency notification**: Clinicians see new alerts within seconds of a diagnosis being created
- **Persistent record**: Every alert is stored in PostgreSQL and survives page refreshes
- **Actionable**: Each alert can be acknowledged or dismissed directly from the alerts page
- **Explainable**: Reason codes describe exactly why a diagnosis was flagged, in plain language
- **Single shared subscription**: All UI consumers share one Zustand store and one Supabase Realtime channel — no duplicate connections

---

## How It Works

### Core Functionality

When a patient submits symptoms and a diagnosis is confirmed:

1. The diagnosis is saved to PostgreSQL via Prisma
2. A non-blocking background function calls the Flask surveillance endpoint
3. The response is scanned to see if the new diagnosis appears in the anomalies list
4. If it does, an `Alert` record is created in PostgreSQL
5. Supabase Realtime broadcasts the INSERT event to all subscribed clinician browsers
6. Every connected clinician sees the alert appear in the table, the sidebar badge update, and a toast notification fire — all without refreshing

### End-to-End Data Flow

```
┌──────────────────────┐
│  Patient Browser     │
│  /diagnosis          │
│  createDiagnosis()   │
└──────────┬───────────┘
           │ next-safe-action (Server Action)
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Next.js Server      │────▶│  PostgreSQL           │
│  create-diagnosis.ts │     │  Diagnosis table      │
│                      │     │  (Prisma INSERT)      │
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
┌──────────────────────┐
│  Surveillance API    │     ┌──────────────────────┐
│  response.anomalies  │────▶│  find match by       │
│  [{id, reason, ...}] │     │  diagnosisId         │
└──────────────────────┘     └──────────┬───────────┘
                                        │ match found?
                                  Yes   │      No → return (no alert)
                                        ▼
                             ┌──────────────────────┐
                             │  parse reason codes  │
                             │  "A|B|C" → ["A","B"] │
                             └──────────┬───────────┘
                                        ▼
                    ┌───────────────────────────────┐
                    │  mapReasonCodesToSeverity()    │
                    │  CLUSTER:SPATIAL + COMBINED    │
                    │  → CRITICAL                   │
                    │  CLUSTER:SPATIAL alone → HIGH  │
                    │  CONFIDENCE:LOW → MEDIUM       │
                    │  other → LOW                  │
                    └──────────┬────────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │  resolveAlertType()  │
                    │  CONFIDENCE:LOW only │
                    │   → LOW_CONFIDENCE   │
                    │  UNCERTAINTY:HIGH    │
                    │   → HIGH_UNCERTAINTY │
                    │  all others          │
                    │   → ANOMALY          │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │  buildAlertMessage() │
                    │  human-readable text │
                    │  for clinicians      │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │  prisma.alert.create │
                    │  { type, severity,   │
                    │    reasonCodes,      │
                    │    message,          │
                    │    diagnosisId,      │
                    │    metadata }        │
                    └──────────────────────┘
```

### User Flow — Clinician

1. Clinician opens any page under `/dashboard`, `/alerts`, `/map`, etc.
2. `AlertsStoreProvider` mounts once in the clinician layout, calling `initialize()` on the Zustand store
3. The store opens a single Supabase Realtime channel (`"alerts-store"`) and fetches all existing alerts
4. `AlertsList`, `AlertsNavBadge`, and `AlertsToastListener` each read from the store via selectors — no separate subscriptions
5. A patient submits a symptom chat on the patient side
6. The diagnosis is saved; background anomaly check fires
7. If anomalous: an `Alert` row is inserted into PostgreSQL
8. Supabase Realtime broadcasts the INSERT via WebSocket to all connected clinician browsers
9. The store's single channel callback fires, updating `alerts` and `latestAlert` in one place
10. All consumers react via their selectors:
    - `AlertsList` inserts the new row at the top of the table
    - `AlertsNavBadge` increments the sidebar count badge
    - `AlertsToastListener` fires a severity-coloured toast notification
11. Clinician clicks "View Alerts" on the toast or navigates to `/alerts`
12. Clinician reviews the alert detail modal (reason codes, metadata, diagnosis link)
13. Clinician acknowledges or dismisses the alert; status change propagates back via Realtime UPDATE event to all connected clinicians

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
│   ├── create-diagnosis.ts                   # Modified: fires checkAndCreateAlert()
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
  ANOMALY           // Geographic, temporal, spatial cluster, or combined anomaly
  LOW_CONFIDENCE    // Only reason is CONFIDENCE:LOW
  HIGH_UNCERTAINTY  // Only reason is UNCERTAINTY:HIGH
}

enum AlertSeverity {
  CRITICAL  // CLUSTER:SPATIAL + COMBINED:MULTI both present
  HIGH      // CLUSTER:SPATIAL alone, or COMBINED:MULTI with ≥3 codes
  MEDIUM    // CONFIDENCE:LOW or UNCERTAINTY:HIGH
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

### 1. `create-diagnosis.ts` — Diagnosis Action (Modified)

**Location**: `frontend/actions/create-diagnosis.ts`

The existing diagnosis creation action was extended to call `checkAndCreateAlert()` as a fire-and-forget operation after the diagnosis is successfully persisted:

```typescript
// Non-blocking — diagnosis success is never conditional on alert creation
checkAndCreateAlert({ diagnosisId: diagnosis.id, disease, confidence, ... })
  .catch((err) => console.error(`Alert creation failed:`, err));
```

#### `checkAndCreateAlert()`

This private async function performs the full anomaly-to-alert pipeline:

```typescript
async function checkAndCreateAlert(params: AlertCheckParams): Promise<void> {
  // 1. Call Flask surveillance endpoint (no-cache)
  const res = await fetch(`${BACKEND_URL}/api/surveillance/outbreaks?contamination=0.05`);

  // 2. Parse anomaly list from response
  const { anomalies } = await res.json();

  // 3. Find the new diagnosis in the anomaly list by ID
  const match = anomalies.find(a => String(a.id) === String(diagnosisId));

  if (!match || !match.reason) return; // Not anomalous — no alert needed

  // 4. Parse pipe-separated reason codes into array
  const reasonCodes = match.reason.split("|").filter(Boolean);

  // 5. Compute severity, type, and human-readable message
  const severity = mapReasonCodesToSeverity(reasonCodes);
  const type = resolveAlertType(reasonCodes);
  const message = buildAlertMessage(disease, reasonCodes, severity);

  // 6. Persist alert directly via Prisma (already in server context)
  await prisma.alert.create({ data: { type, severity, reasonCodes, message, ... } });
}
```

Key design decisions:
- **Fire-and-forget**: `checkAndCreateAlert` is called without `await`, so a slow or unavailable Flask service never blocks the patient from receiving their diagnosis
- **Direct Prisma**: Since we are already in a Next.js Server Action (server context), the alert is created via Prisma directly rather than calling `createAlert` as a nested server action
- **ID matching**: The Flask service may return IDs as strings or integers; the match uses `String(a.id) === String(diagnosisId)` to handle both

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
| `latestAlert` | `Alert \| null` | Most recent INSERT event (used to trigger toasts) |
| `isLoading` | `boolean` | True until initial fetch resolves |
| `error` | `string \| null` | Fetch error message if initial load fails |
| `isInitialized` | `boolean` | Guards against double-initialization |

#### Actions

| Action | Description |
|--------|-------------|
| `initialize()` | Fetches all alerts (with notes) + opens the single Realtime channel. Guarded by `isInitialized`. |
| `teardown()` | Removes the Realtime channel, resets `isInitialized`. |
| `clearLatestAlert()` | Sets `latestAlert` to null after a toast has been shown. |
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
  .channel("alerts-store")           // single channel, shared by all consumers
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "Alert" },
    (payload) => {
      const incoming = { ...(payload.new as Alert), notes: [] };
      set((state) => ({
        alerts: [incoming, ...state.alerts],
        latestAlert: incoming,         // triggers toast in AlertsToastListener
      }));
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
          // Preserve the notes array — the Realtime payload does not include it.
          return { alerts: state.alerts.map((a) => a.id === updated.id ? { ...updated, notes: a.notes ?? [] } : a) };
        }
        return { alerts: [{ ...updated, notes: [] }, ...state.alerts] };
      });
    },
  )
  .subscribe();
```

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

### 4. `AlertsToastListener` — Background Toast Notifier

**Location**: `frontend/components/clinicians/alerts/alerts-toast-listener.tsx`

Mounted once in `app/(app)/(clinician)/layout.tsx` so it runs on every clinician page. It reads `latestAlert` from the store and fires a `sonner` toast whenever a new INSERT arrives:

```typescript
const AlertsToastListener = () => {
  const { latestAlert, clearLatestAlert } = useAlertsStore(
    useShallow((s) => ({ latestAlert: s.latestAlert, clearLatestAlert: s.clearLatestAlert }))
  );

  useEffect(() => {
    if (!latestAlert) return;

    const toastFn =
      latestAlert.severity === "CRITICAL" || latestAlert.severity === "HIGH"
        ? toast.error
        : latestAlert.severity === "MEDIUM"
        ? toast.warning
        : toast.info;

    toastFn(`${severityLabel}: ${latestAlert.message}`, {
      duration: 8000,
      action: { label: "View Alerts", onClick: () => window.location.href = "/alerts" },
    });

    clearLatestAlert(); // prevent re-firing on re-render
  }, [latestAlert, clearLatestAlert]);

  return null; // renders nothing
};
```

Toast severity mapping:

| Alert Severity | Sonner Function | Visual |
|----------------|----------------|--------|
| CRITICAL | `toast.error` | Red |
| HIGH | `toast.error` | Red |
| MEDIUM | `toast.warning` | Yellow |
| LOW | `toast.info` | Blue |

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

A `next-safe-action` action for manually creating alerts (e.g. from tests or future admin tools). In the automated pipeline, `checkAndCreateAlert()` in `create-diagnosis.ts` writes directly via Prisma to avoid a nested server-action round-trip.

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
| `CLUSTER:SPATIAL` AND `COMBINED:MULTI` both present | `CRITICAL` |
| `CLUSTER:SPATIAL` alone | `HIGH` |
| `COMBINED:MULTI` with ≥ 3 codes | `HIGH` |
| `CONFIDENCE:LOW` or `UNCERTAINTY:HIGH` | `MEDIUM` |
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
export type AlertType = "ANOMALY" | "LOW_CONFIDENCE" | "HIGH_UNCERTAINTY";
export type AlertMetadata = { ... };
export type Alert = { ... };
```

Import from `@/types` in any component or store that needs these types.

---

## Zod Schemas

### `CreateAlertSchema`

```typescript
z.object({
  type: z.enum(["ANOMALY", "LOW_CONFIDENCE", "HIGH_UNCERTAINTY"]),
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

Reason codes are sourced from the Flask surveillance service's `reason` field (pipe-separated string, e.g. `"GEOGRAPHIC:RARE|CLUSTER:SPATIAL|COMBINED:MULTI"`). They are split into a `String[]` array when the `Alert` is created.

| Code | Label | Description |
|------|-------|-------------|
| `GEOGRAPHIC:RARE` | Unusual location | Disease rarely reported in this area |
| `TEMPORAL:RARE` | Unusual timing | Case recorded at an atypical time of year |
| `CLUSTER:SPATIAL` | Spatial cluster | Unusual concentration of cases in this location |
| `CONFIDENCE:LOW` | Low confidence | System had low confidence making this diagnosis |
| `UNCERTAINTY:HIGH` | High uncertainty | System reported high uncertainty for this diagnosis |
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
│ MEDIUM   │ ACK'd  │ Low Conf │ ...  │ 👁        │
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
| Flask surveillance unavailable | `checkAndCreateAlert` catches the error, logs a warning, returns early — diagnosis is always saved |
| Flask responds non-200 | Warning logged, no alert created |
| Diagnosis not in anomaly list | No alert created (diagnosis is normal) |
| Prisma alert creation fails | Error logged; does not affect diagnosis record |
| Supabase initial fetch fails | `error` state set in store; `AlertsList` renders an error alert banner |
| RLS permission denied (42501) | Caused by missing `GRANT USAGE ON SCHEMA public` — fixed by migration `20260309143938_alert_rls_realtime.sql` |
| Realtime events not firing | Caused by `Alert` table missing from `supabase_realtime` publication — fixed by `ALTER PUBLICATION supabase_realtime ADD TABLE public."Alert"` |

---

## Configuration

### Surveillance Contamination Rate

The anomaly check in `checkAndCreateAlert` uses a fixed contamination rate of `0.05` (5%):

```typescript
fetch(`${BACKEND_URL}/api/surveillance/outbreaks?contamination=0.05`)
```

This can be made configurable via an environment variable if different sensitivity is needed.

### Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `createClient()` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `createClient()` | Supabase anon key for browser client |
| `NEXT_PUBLIC_BACKEND_URL` | `checkAndCreateAlert()` | Flask surveillance endpoint base URL |
| `DATABASE_URL` | Prisma | PostgreSQL connection string |

---

## Performance Considerations

- **Non-blocking alert creation**: The anomaly check never delays the patient's diagnosis response. The `checkAndCreateAlert` call is fire-and-forget
- **Single Supabase channel**: All three consumers (`AlertsList`, `AlertsNavBadge`, `AlertsToastListener`) share one WebSocket channel via the Zustand store. Previously, each opened its own channel
- **Single fetch**: The store fetches all alerts once on `initialize()`. All consumers filter or derive what they need client-side via selectors — no duplicate Supabase queries
- **Selector optimization**: `useShallow` is used for multi-value selectors to prevent unnecessary re-renders when unrelated store fields change
- **`isInitialized` guard**: Prevents double-initialization in React Strict Mode (which mounts components twice in development)
- **Pagination**: TanStack Table handles large alert sets client-side; no server-side pagination needed at current scale

---

## Testing Checklist

- [ ] Create a diagnosis on the patient side — verify alert appears in `/alerts` without page refresh
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

---

## Future Enhancements

- [ ] **Filtering by date range**: Add a date picker to the alerts table
- [ ] **Bulk acknowledge/dismiss**: Checkbox selection + bulk action buttons
- [ ] **Alert export**: CSV/PDF export of filtered alerts
- [ ] **Per-clinician assignment**: Assign alerts to specific clinicians for follow-up
- [ ] **Configurable contamination**: Allow admins to tune the anomaly sensitivity per disease
- [ ] **Push notifications**: Browser push notifications for clinicians who are not on the dashboard

---

## Related Features

| Feature | Relationship |
|---------|-------------|
| **Anomaly Detection & Surveillance** | Source of anomaly classifications that trigger alerts. See `ANOMALY_DETECTION_SURVEILLANCE.md` |
| **Disease Map** | Visualizes the same anomalous diagnoses geographically |
| **Healthcare Reports** | Full table of all diagnoses, including those that generated alerts |
| **Diagnosis Creation** | The entry point that triggers `checkAndCreateAlert()` |

---

## Appendix

### External Resources

- [Supabase Realtime — Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Zustand](https://zustand.docs.pmnd.rs/)
- [TanStack Table](https://tanstack.com/table/)
- [next-safe-action](https://next-safe-action.dev/)
- [Sonner](https://sonner.emilkowal.ski/)

---

**Version**: 4.0
**Last Updated**: March 10, 2026
**Maintainer**: AI'll Be Sick Development Team

