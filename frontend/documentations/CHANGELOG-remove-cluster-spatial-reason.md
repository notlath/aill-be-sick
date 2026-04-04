# Changelog: Remove CLUSTER:SPATIAL Reason Code

**Branch:** `update/anomaly-reasons`  
**Date:** April 05, 2026  
**Status:** Staged changes

---

## Summary

Removed the `CLUSTER:SPATIAL` reason code from the anomaly detection system and merged its behavior into `GEOGRAPHIC:RARE`. Both codes signaled the same clinical insight — "this disease isn't normally seen here" — so the distinction between lat/lng outlier vs. both-lat-and-lng outlier was redundant. Alert severity mapping updated so `GEOGRAPHIC:RARE` alone maps to `HIGH` (previously `CLUSTER:SPATIAL` was `HIGH`, `GEOGRAPHIC:RARE` was `LOW`).

---

## Problem Statement

1. `CLUSTER:SPATIAL` was a strict subset of `GEOGRAPHIC:RARE` — every case flagged as `CLUSTER:SPATIAL` also received `GEOGRAPHIC:RARE`, making the distinction meaningless for clinicians.
2. The name "Spatial group" misleadingly implied detection of multiple cases clustered together, when in reality it only meant "this single case is far from the mean in both coordinates."
3. No actual spatial density or nearest-neighbor clustering was being performed — the label set incorrect expectations.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `backend/app/services/surveillance_service.py` | Modified | Removed `REASON_CLUSTER_SPATIAL` constant, removed `lat_outlier and lng_outlier` block, updated `COMBINED:MULTI` exclusion set |
| `backend/app/api/surveillance.py` | Modified | Removed `CLUSTER:SPATIAL` from endpoint docstring |
| `frontend/utils/alert-severity.ts` | Modified | Replaced `CLUSTER:SPATIAL` with `GEOGRAPHIC:RARE` in severity mapping |
| `frontend/utils/anomaly-reasons.ts` | Modified | Removed `CLUSTER:SPATIAL` entry from `REASON_CODES` map |
| `frontend/utils/alert-pipeline.ts` | Modified | Removed `CLUSTER:SPATIAL` from alert message builder |
| `frontend/scripts/sync-anomalies-to-alerts.ts` | Modified | Removed `CLUSTER:SPATIAL` from sync script message builder |
| `frontend/documentations/ANOMALY_DETECTION_SURVEILLANCE.md` | Modified | Removed `CLUSTER:SPATIAL` from reason codes table |
| `frontend/documentations/ALERT_SYSTEM.md` | Modified | Updated severity tables, diagrams, and reason code docs |
| `backend/documentations/SURVEILLANCE_SERVICE.md` | Modified | Removed `CLUSTER:SPATIAL` from reason codes table and constants |

---

## Detailed Changes

### 1. Backend — Remove CLUSTER:SPATIAL from Reason Code Generation

**Location:** `backend/app/services/surveillance_service.py`

**Removed constant:**
```python
# Before
REASON_GEOGRAPHIC_RARE = "GEOGRAPHIC:RARE"
REASON_TEMPORAL_RARE = "TEMPORAL:RARE"
REASON_CLUSTER_SPATIAL = "CLUSTER:SPATIAL"   # ← removed
REASON_COMBINED_MULTI = "COMBINED:MULTI"
```

**Removed duplicate check (lines 290-292):**
```python
# Before — both blocks could fire for the same record
if lat_outlier or lng_outlier:
    reasons.add(REASON_GEOGRAPHIC_RARE)

# Spatial cluster: both lat AND lng are outliers simultaneously
if lat_outlier and lng_outlier:
    reasons.add(REASON_CLUSTER_SPATIAL)

# After — single check covers all geographic outliers
if lat_outlier or lng_outlier:
    reasons.add(REASON_GEOGRAPHIC_RARE)
```

**Updated COMBINED:MULTI exclusion set (line 335):**
```python
# Before — excluded CLUSTER:SPATIAL since it was a subset of GEOGRAPHIC:RARE
primary_reasons = reasons - {REASON_CLUSTER_SPATIAL, REASON_COMBINED_MULTI}

# After — only exclude COMBINED:MULTI itself
primary_reasons = reasons - {REASON_COMBINED_MULTI}
```

**Why:** `CLUSTER:SPATIAL` was always a subset of `GEOGRAPHIC:RARE`. A case with both lat and lng outliers would get both codes, inflating the reason count without adding clinical value. Removing it simplifies the reason output and fixes the `COMBINED:MULTI` count logic.

---

### 2. Frontend — Update Severity Mapping

**Location:** `frontend/utils/alert-severity.ts:16-18`

**Before:**
```typescript
if (has("OUTBREAK:EPIDEMIC_THRESHOLD") || (has("CLUSTER:SPATIAL") && has("COMBINED:MULTI"))) return "CRITICAL";
if (has("OUTBREAK:ALERT_THRESHOLD") || has("CLUSTER:SPATIAL") || (has("COMBINED:MULTI") && reasonCodes.length >= 3))
  return "HIGH";
```

**After:**
```typescript
if (has("OUTBREAK:EPIDEMIC_THRESHOLD") || (has("GEOGRAPHIC:RARE") && has("COMBINED:MULTI"))) return "CRITICAL";
if (has("OUTBREAK:ALERT_THRESHOLD") || has("GEOGRAPHIC:RARE") || (has("COMBINED:MULTI") && reasonCodes.length >= 3))
  return "HIGH";
```

**Why:** Geographic anomalies are clinically significant and should be treated as high-priority. Previously only `CLUSTER:SPATIAL` (both coords outlier) was `HIGH`, while `GEOGRAPHIC:RARE` (one coord outlier) was `LOW`. Now all geographic anomalies are `HIGH` when standalone, and `CRITICAL` when combined with other factors.

---

### 3. Frontend — Remove CLUSTER:SPATIAL from Reason Code Definitions

**Location:** `frontend/utils/anomaly-reasons.ts:89-93`

**Removed:**
```typescript
"CLUSTER:SPATIAL": {
  label: "Spatial group",
  description:
    "There is an unusual concentration of cases in this specific location. Multiple cases are being reported from the same area.",
},
```

**Why:** The label "Spatial group" and description about "multiple cases" was misleading — the backend never detected actual spatial clustering, only individual coordinate outliers.

---

### 4. Frontend — Remove CLUSTER:SPATIAL from Alert Message Builder

**Location:** `frontend/utils/alert-pipeline.ts:35` and `frontend/scripts/sync-anomalies-to-alerts.ts:42`

**Removed from both message builders:**
```typescript
"CLUSTER:SPATIAL": "a sudden geographic group of similar cases",
```

**Why:** Consistency across all alert message generation paths. The same code label dictionary exists in both the live pipeline and the sync script.

---

## Severity Mapping After Change

| Condition | Severity | Rationale |
|-----------|----------|-----------|
| `GEOGRAPHIC:RARE` + `COMBINED:MULTI` | CRITICAL | Geographic anomaly with multiple factors — strongest signal |
| `GEOGRAPHIC:RARE` alone | HIGH | Any geographic anomaly is notable |
| `COMBINED:MULTI` with ≥3 codes | HIGH | Multiple independent anomaly factors |
| `OUTBREAK:EPIDEMIC_THRESHOLD` | CRITICAL | DOH PIDSR epidemic threshold exceeded |
| `OUTBREAK:ALERT_THRESHOLD` | HIGH | DOH PIDSR alert threshold exceeded |
| `CLUSTER:DENSE` or `OUTBREAK:VOL_SPIKE` | MEDIUM | Dense cluster or volume spike |
| Anything else | LOW | Single non-geographic reason |

---

## Technical Notes

- **No breaking changes for existing alerts**: Records already in the database with `CLUSTER:SPATIAL` in their `reasonCodes` array will still render — the frontend simply won't have a badge mapping for it (falls through to raw code display). This is acceptable since it's a cleanup change.
- **`COMBINED:MULTI` logic preserved**: The exclusion set change (`reasons - {REASON_COMBINED_MULTI}`) is correct — `CLUSTER:SPATIAL` was excluded because it was a subset of `GEOGRAPHIC:RARE`, and now that it's gone, only `COMBINED:MULTI` itself needs exclusion.
- **TypeScript check passes**: `npx tsc --noEmit` completes with no errors.

---

## Testing Checklist

- [ ] Verify anomaly detection returns `GEOGRAPHIC:RARE` (not `CLUSTER:SPATIAL`) for geographic outliers
- [ ] Verify `GEOGRAPHIC:RARE` alone maps to `HIGH` severity in alerts
- [ ] Verify `GEOGRAPHIC:RARE` + `COMBINED:MULTI` maps to `CRITICAL` severity
- [ ] Verify anomaly modal badges no longer show "Spatial group"
- [ ] Verify alert messages no longer reference "geographic group of similar cases"
- [ ] Verify existing alerts with `CLUSTER:SPATIAL` in database don't break the UI

---

## Related Changes

- Previous: `CHANGELOG-remove-confidence-uncertainty-alerts.md` — removed confidence/uncertainty reason codes from anomaly detection
- Future: Real spatial cluster detection (DBSCAN or spatial scan statistics) would be a separate feature, not a reason code rename
