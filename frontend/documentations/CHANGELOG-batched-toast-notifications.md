# Changelog: Batched Summary Toast Notifications for Cron Surveillance

**Branch:** `update/surveillance-cron-job`
**Date:** April 5, 2026
**Status:** Staged changes

---

## Summary

Migrated the clinician alert toast system from per-alert notifications to a single batched summary toast per cron run. When the 15-minute surveillance cron detects multiple anomalies or outbreaks, clinicians now see exactly 1 toast (e.g., "13 new alerts detected: 3 anomalies, 10 outbreaks") instead of 13 consecutive toasts. Also fixed a React duplicate key error caused by missing dedup guards in the Zustand store's Realtime INSERT handler.

---

## Problem Statement

1. **Toast spam on cron runs** — Each `Alert` INSERT fired a separate Supabase Realtime event → `AlertsToastListener` showed 1 toast per alert. When cron detected 10+ anomalies at once, clinicians received 10+ consecutive toasts — a poor UX.
2. **React duplicate key errors** — The Zustand store's INSERT handler blindly `unshift`ed incoming alerts without checking if they already existed in state. When Realtime fired for alerts already loaded by the initial fetch, duplicate entries with the same `id` caused React's "Encountered two children with the same key" error.
3. **Broadcast channel mismatch** — The Edge Function broadcast to `surveillance-cron-run` but the frontend listener was attached to `alerts-store-{random}` (a different channel). The broadcast never reached the toast listener.
4. **Dead state and debug noise** — `latestAlert`/`clearLatestAlert` were no longer consumed after the toast redesign. Excessive `console.log` statements cluttered production console output.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `supabase/functions/surveillance-cron/index.ts` | Modified | Added broadcast channel subscribe + send after alert creation |
| `frontend/stores/use-alerts-store.ts` | Modified | Added `_broadcastChannel`, `latestCronRun` state, duplicate guard on INSERT, removed dead `latestAlert` |
| `frontend/components/clinicians/alerts/alerts-toast-listener.tsx` | Modified | Reads `latestCronRun` instead of `latestAlert`, shows batched summary toast |
| `frontend/documentations/ALERT_SYSTEM.md` | Modified | Updated to v7.0: architecture diagrams, two-channel design, batched toast docs |

---

## Detailed Changes

### 1. Edge Function — Broadcast Summary After Alert Creation

**Location:** `supabase/functions/surveillance-cron/index.ts`

**Added broadcast after processing all alerts:**

```typescript
// Subscribe to the channel first (required for .send() to work)
const broadcastChannel = supabase.channel("surveillance-cron-run");
await new Promise<void>((resolve) => {
  broadcastChannel
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`[surveillance-cron] Broadcast channel ${status}`);
        resolve(); // resolve anyway — don't block the response
      }
    });
});

broadcastChannel.send({
  type: "broadcast",
  event: "cron-run-complete",
  payload: {
    anomalyCount: results.anomalies,
    outbreakCount: results.outbreaks,
    timestamp: new Date().toISOString(),
  },
});
```

**Why:** The Supabase JS client's `.send()` method requires the channel to be subscribed first (otherwise it falls back to a REST endpoint that can return 401). By subscribing and then broadcasting, the message routes through the WebSocket to all active subscribers.

**Design decisions:**
- **No `setTimeout` delay** — `.send()` is synchronous over WebSocket; broadcast delivers instantly to subscribers.
- **No `removeChannel` cleanup** — The Edge Function process dies after the HTTP response; WebSocket cleanup is automatic.
- **Error-tolerant subscribe** — Resolves on `CHANNEL_ERROR`/`TIMED_OUT` too, so the cron response isn't blocked by transient Realtime issues.

---

### 2. Zustand Store — Two-Channel Architecture + Duplicate Guard

**Location:** `frontend/stores/use-alerts-store.ts`

**Added separate broadcast channel subscription:**

```typescript
// Separate channel for cron-run broadcast events from the Edge Function
_broadcastChannel = supabase.channel("surveillance-cron-run");
_broadcastChannel
  .on("broadcast", { event: "cron-run-complete" }, (payload) => {
    set((state) => {
      state.latestCronRun = payload.payload as CronRunSummary;
    });
  })
  .subscribe();
```

**Added duplicate guard on INSERT handler:**

```typescript
.on("postgres_changes", { event: "INSERT", schema: "public", table: "Alert" }, (payload) => {
  const incoming = { ...(payload.new as Alert), notes: [] };
  set((state) => {
    // Guard against duplicates — the alert may already be in state from
    // the initial fetch or a previous INSERT event (race condition).
    const exists = state.alerts.some((a) => a.id === incoming.id);
    if (!exists) {
      state.alerts.unshift(incoming);
    }
  });
})
```

**Removed dead state:**

| Removed | Reason |
|---------|--------|
| `latestAlert: Alert \| null` | No consumers — toast listener uses `latestCronRun` |
| `clearLatestAlert()` action | No consumers |
| `state.latestAlert = incoming` in INSERT handler | Was setting dead state |
| `console.log` × 5 | Debug noise in production |

**Updated teardown to clean up both channels:**

```typescript
teardown: () => {
  if (_channel && _supabase) {
    _supabase.removeChannel(_channel);
    _channel = null;
  }
  if (_broadcastChannel && _supabase) {
    _supabase.removeChannel(_broadcastChannel);
    _broadcastChannel = null;
  }
  _supabase = null;
  set((state) => { state.isInitialized = false; });
},
```

**Why two channels?** The Edge Function broadcasts to a fixed channel name (`surveillance-cron-run`) so all clinician browsers receive the same event. The `postgres_changes` channel uses a random suffix (`alerts-store-{random}`) to avoid React Strict Mode double-mount collisions — these can't be the same channel.

---

### 3. Toast Listener — Batched Summary Toast

**Location:** `frontend/components/clinicians/alerts/alerts-toast-listener.tsx`

**Before:**
```typescript
const { latestAlert, clearLatestAlert } = useAlertsStore(...);
// 1 toast per Alert INSERT
toastFn(`${severityLabel} alert: ${latestAlert.message}`, { ... });
```

**After:**
```typescript
const { latestCronRun, clearLatestCronRun } = useAlertsStore(...);
// 1 toast per cron run summarizing all alerts
const totalAlerts = anomalyCount + outbreakCount;
toastFn(`${totalAlerts} new alert${totalAlerts === 1 ? "" : "s"} detected`, {
  description: `${summary} · ${parseUtcDate(timestamp).toLocaleTimeString()}`,
  ...
});
```

**Toast severity mapping (batched):**

| Condition | Sonner Function | Visual |
|-----------|----------------|--------|
| Any anomalies detected | `toast.error` | Red |
| 3+ outbreaks detected | `toast.error` | Red |
| 1-2 outbreaks detected | `toast.warning` | Yellow |
| Only anomalies (low priority) | `toast.info` | Blue |

**Why:** Before this change, each `Alert` INSERT fired a separate toast. With cron runs detecting 10+ anomalies at once, clinicians would see 10+ consecutive toasts — a poor UX. The batched approach shows exactly 1 summary toast per 15-minute cycle.

---

## UI/UX Improvements

- **Single summary toast per cron run** — Clinicians see "5 new alerts detected: 3 anomalies, 2 outbreaks" instead of 5 separate toasts
- **No more React duplicate key errors** — INSERT handler checks for existing alerts before adding
- **Cleaner console output** — Removed 5+ debug `console.log` statements from production code
- **Faster cron response** — Removed unnecessary 500ms `setTimeout` delay and `removeChannel` cleanup in Edge Function

---

## Technical Notes

- **Supabase broadcast requires subscription** — The `.send()` method on a channel only works via WebSocket if the channel is subscribed first. Without subscription, it falls back to a REST endpoint that can fail with 401.
- **Broadcast payload nesting** — The Supabase broadcast callback receives `{ payload: { ...sent data... } }`, so the frontend reads `payload.payload` to get the `CronRunSummary`.
- **Two channels are necessary** — The `postgres_changes` channel uses a random suffix to prevent React Strict Mode double-mount collisions. The broadcast channel uses a fixed name (`surveillance-cron-run`) so the Edge Function knows where to send. They cannot be the same channel.
- **No cleanup needed in Edge Function** — When the Edge Function's HTTP response completes, the Deno process exits and the WebSocket is automatically closed by Supabase.

---

## Testing Checklist

- [ ] Deploy Edge Function: `supabase functions deploy surveillance-cron`
- [ ] Verify cron run triggers broadcast (check browser console for `latestCronRun` update)
- [ ] Confirm exactly 1 toast per cron run (not 1 per alert)
- [ ] Verify toast shows correct summary: "X anomalies, Y outbreaks"
- [ ] Verify no React duplicate key errors in console
- [ ] Verify alerts table still updates incrementally as each Alert INSERT fires
- [ ] Verify sidebar badge increments correctly
- [ ] TypeScript check passes: `npx tsc --noEmit`

---

## Related Changes

- **Version 6.0** (2026-04-05): Migrated from event-driven fire-and-forget to Supabase Cron-based surveillance
- **Version 5.0** (2026-03-22): Migrated from CDC EARS C1 to DOH PIDSR methodology
- **Version 4.0** (2026-03-14): Added K-Means spatial clustering + real-time toast notifications
