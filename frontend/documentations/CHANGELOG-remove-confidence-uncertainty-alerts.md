# Changelog: Remove Confidence/Uncertainty Anomaly Alerts

**Branch:** `main`  
**Date:** April 4, 2026  
**Status:** Uncommitted changes

---

## Summary

This changeset removes `CONFIDENCE:LOW` and `UNCERTAINTY:HIGH` reason codes from the anomaly detection pipeline, along with the `LOW_CONFIDENCE` and `HIGH_UNCERTAINTY` alert types. The surveillance system now only flags geographic, temporal, spatial, age, and gender anomalies — eliminating model certainty metrics from outbreak detection.

---

## Problem Statement

1. **Confidence/uncertainty are model reliability metrics, not epidemiological signals**: Low confidence or high uncertainty from the AI model doesn't indicate a disease outbreak or geographic anomaly — it reflects the model's internal certainty about its prediction.
2. **Alert fatigue**: Model certainty fluctuations were creating noise in the alert system, distracting clinicians from genuine spatial/temporal anomalies that require public health attention.
3. **Simplified alert taxonomy**: Reducing alert types to `ANOMALY` and `OUTBREAK` makes the system clearer for clinicians to understand and act upon.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `backend/app/services/surveillance_service.py` | Modified | Removed confidence/uncertainty reason code constants and detection logic |
| `backend/app/api/surveillance.py` | Modified | Updated route docstring to reflect remaining reason codes |
| `frontend/utils/alert-pipeline.ts` | Modified | Simplified `resolveAlertType()` to always return "ANOMALY", removed confidence/uncertainty labels |
| `frontend/utils/alert-severity.ts` | Modified | Removed confidence/uncertainty from MEDIUM severity mapping |
| `frontend/types/index.ts` | Modified | Updated `AlertType` to `"ANOMALY" | "OUTBREAK"` |
| `frontend/prisma/schema.prisma` | Modified | Removed `LOW_CONFIDENCE` and `HIGH_UNCERTAINTY` from AlertType enum |
| `frontend/schemas/CreateAlertSchema.ts` | Modified | Updated Zod enum to match new alert types |
| `frontend/components/clinicians/alerts/alerts-list.tsx` | Modified | Removed confidence/uncertainty from type labels and filter dropdown |
| `frontend/utils/anomaly-reasons.ts` | Modified | Removed confidence/uncertainty from reason codes dictionary |
| `frontend/scripts/sync-anomalies-to-alerts.ts` | Modified | Updated script to use simplified alert type resolution |
| `frontend/documentations/ALERT_SYSTEM.md` | Modified | Updated all references to alert types, severity mappings, and reason codes |
| `frontend/documentations/ANOMALY_DETECTION_SURVEILLANCE.md` | Modified | Removed confidence/uncertainty from reason codes table |

---

## Detailed Changes

### 1. Backend: Remove Confidence/Uncertainty Reason Codes

**Location:** `backend/app/services/surveillance_service.py:17-23`

**Before:**
```python
REASON_GEOGRAPHIC_RARE = "GEOGRAPHIC:RARE"
REASON_TEMPORAL_RARE = "TEMPORAL:RARE"
REASON_CLUSTER_SPATIAL = "CLUSTER:SPATIAL"
REASON_CONFIDENCE_LOW = "CONFIDENCE:LOW"
REASON_UNCERTAINTY_HIGH = "UNCERTAINTY:HIGH"
REASON_COMBINED_MULTI = "COMBINED:MULTI"
REASON_AGE_RARE = "AGE:RARE"
REASON_GENDER_RARE = "GENDER:RARE"
```

**After:**
```python
REASON_GEOGRAPHIC_RARE = "GEOGRAPHIC:RARE"
REASON_TEMPORAL_RARE = "TEMPORAL:RARE"
REASON_CLUSTER_SPATIAL = "CLUSTER:SPATIAL"
REASON_COMBINED_MULTI = "COMBINED:MULTI"
REASON_AGE_RARE = "AGE:RARE"
REASON_GENDER_RARE = "GENDER:RARE"
```

**Location:** `backend/app/services/surveillance_service.py:332-344` (removed)

**Removed logic:**
```python
# ── Confidence / uncertainty (global baseline) ────────────────────────────
# These reflect model certainty and are not disease-specific.
global_mean = X_all.mean(axis=0)
global_std = X_all.std(axis=0) + 1e-8

if X_row[IDX_CONF] < global_mean[IDX_CONF] - THRESHOLD * global_std[IDX_CONF]:
    reasons.add(REASON_CONFIDENCE_LOW)

if X_row[IDX_UNC] > global_mean[IDX_UNC] + THRESHOLD * global_std[IDX_UNC]:
    reasons.add(REASON_UNCERTAINTY_HIGH)
```

**Why:** The Isolation Forest was flagging diagnoses as anomalous based on model confidence/uncertainty metrics, which are internal AI reliability signals — not actual disease pattern anomalies. A low-confidence diagnosis in a common location during typical season shouldn't trigger an outbreak alert.

---

### 2. Backend: Update API Documentation

**Location:** `backend/app/api/surveillance.py:43-49`

**Before:**
```
Reason codes on anomalies (pipe-separated when multiple apply):
  GEOGRAPHIC:RARE     – disease is geographically uncommon in this location
  TEMPORAL:RARE       – disease is uncommon during this time of year
  CLUSTER:SPATIAL     – unusual spatial concentration (lat & lng both outliers)
  CONFIDENCE:LOW      – model confidence is unusually low for this diagnosis
  UNCERTAINTY:HIGH    – model uncertainty is unusually high for this diagnosis
  COMBINED:MULTI      – two or more independent factors contributed
```

**After:**
```
Reason codes on anomalies (pipe-separated when multiple apply):
  GEOGRAPHIC:RARE     – disease is geographically uncommon in this location
  TEMPORAL:RARE       – disease is uncommon during this time of year
  CLUSTER:SPATIAL     – unusual spatial concentration (lat & lng both outliers)
  AGE:RARE            – patient age is outside the typical demographic range
  GENDER:RARE         – patient gender is uncommon for this disease
  COMBINED:MULTI      – two or more independent factors contributed
```

**Why:** Documentation now accurately reflects the actual reason codes produced by the surveillance service. Added AGE:RARE and GENDER:RARE which were previously missing from the docstring.

---

### 3. Frontend: Simplify Alert Type Resolution

**Location:** `frontend/utils/alert-pipeline.ts:27-35`

**Before:**
```typescript
function resolveAlertType(
  reasonCodes: string[],
): "ANOMALY" | "LOW_CONFIDENCE" | "HIGH_UNCERTAINTY" {
  if (reasonCodes.length === 1 && reasonCodes[0] === "CONFIDENCE:LOW")
    return "LOW_CONFIDENCE";
  if (reasonCodes.length === 1 && reasonCodes[0] === "UNCERTAINTY:HIGH")
    return "HIGH_UNCERTAINTY";
  return "ANOMALY";
}
```

**After:**
```typescript
function resolveAlertType(_reasonCodes: string[]): "ANOMALY" {
  return "ANOMALY";
}
```

**Why:** With confidence/uncertainty reason codes eliminated from the backend, all anomaly alerts are now of type "ANOMALY". The function is kept for future extensibility but currently returns a constant.

**Same change applied to:** `frontend/scripts/sync-anomalies-to-alerts.ts:34-45`

---

### 4. Frontend: Update Alert Message Builder

**Location:** `frontend/utils/alert-pipeline.ts:38-52`

**Before:**
```typescript
const codeLabels: Record<string, string> = {
  "GEOGRAPHIC:RARE": "an occurrence in an unusual location",
  "TEMPORAL:RARE": "a presentation during an off-season period",
  "CLUSTER:SPATIAL": "a sudden geographic group of similar cases",
  "CONFIDENCE:LOW": "low predictive confidence from the AI model",
  "UNCERTAINTY:HIGH": "high statistical uncertainty from the AI model",
  "COMBINED:MULTI": "multiple overlapping anomalies",
  "AGE:RARE": "a patient age outside the typical demographic range",
  "GENDER:RARE": "a patient demographic that is uncommon for this disease",
};
```

**After:**
```typescript
const codeLabels: Record<string, string> = {
  "GEOGRAPHIC:RARE": "an occurrence in an unusual location",
  "TEMPORAL:RARE": "a presentation during an off-season period",
  "CLUSTER:SPATIAL": "a sudden geographic group of similar cases",
  "COMBINED:MULTI": "multiple overlapping anomalies",
  "AGE:RARE": "a patient age outside the typical demographic range",
  "GENDER:RARE": "a patient demographic that is uncommon for this disease",
};
```

**Why:** Alert messages should no longer reference model confidence/uncertainty as reasons for investigation.

---

### 5. Frontend: Update Severity Mapping

**Location:** `frontend/utils/alert-severity.ts:14-22`

**Before:**
```typescript
export function mapReasonCodesToSeverity(reasonCodes: string[]): AlertSeverity {
  const has = (code: string) => reasonCodes.includes(code);

  if (has("OUTBREAK:EPIDEMIC_THRESHOLD") || (has("CLUSTER:SPATIAL") && has("COMBINED:MULTI"))) return "CRITICAL";
  if (has("OUTBREAK:ALERT_THRESHOLD") || has("CLUSTER:SPATIAL") || (has("COMBINED:MULTI") && reasonCodes.length >= 3))
    return "HIGH";
  if (has("CLUSTER:DENSE") || has("OUTBREAK:VOL_SPIKE") || has("CONFIDENCE:LOW") || has("UNCERTAINTY:HIGH")) return "MEDIUM";

  return "LOW";
}
```

**After:**
```typescript
export function mapReasonCodesToSeverity(reasonCodes: string[]): AlertSeverity {
  const has = (code: string) => reasonCodes.includes(code);

  if (has("OUTBREAK:EPIDEMIC_THRESHOLD") || (has("CLUSTER:SPATIAL") && has("COMBINED:MULTI"))) return "CRITICAL";
  if (has("OUTBREAK:ALERT_THRESHOLD") || has("CLUSTER:SPATIAL") || (has("COMBINED:MULTI") && reasonCodes.length >= 3))
    return "HIGH";
  if (has("CLUSTER:DENSE") || has("OUTBREAK:VOL_SPIKE")) return "MEDIUM";

  return "LOW";
}
```

**Why:** MEDIUM severity was previously triggered by model reliability issues (CONFIDENCE:LOW, UNCERTAINTY:HIGH). Now MEDIUM is reserved for genuine epidemiological signals: dense clusters and volume spikes.

---

### 6. Frontend: Update Type Definitions

**Location:** `frontend/types/index.ts:252`

**Before:**
```typescript
export type AlertType = "ANOMALY" | "OUTBREAK" | "LOW_CONFIDENCE" | "HIGH_UNCERTAINTY";
```

**After:**
```typescript
export type AlertType = "ANOMALY" | "OUTBREAK";
```

**Location:** `frontend/prisma/schema.prisma:328-332`

**Before:**
```prisma
enum AlertType {
  ANOMALY
  LOW_CONFIDENCE
  HIGH_UNCERTAINTY
  OUTBREAK
}
```

**After:**
```prisma
enum AlertType {
  ANOMALY
  OUTBREAK
}
```

**Why:** TypeScript types and database schema must stay in sync. The AlertType enum now only includes the two active alert categories.

---

### 7. Frontend: Update Zod Schema

**Location:** `frontend/schemas/CreateAlertSchema.ts:4`

**Before:**
```typescript
type: z.enum(["ANOMALY", "LOW_CONFIDENCE", "HIGH_UNCERTAINTY"]),
```

**After:**
```typescript
type: z.enum(["ANOMALY", "OUTBREAK"]),
```

**Why:** Validation schema must match the updated AlertType enum. Note: "OUTBREAK" was missing from the original schema but is now included for completeness.

---

### 8. Frontend: Remove Type Filter Options

**Location:** `frontend/components/clinicians/alerts/alerts-list.tsx:48-91`

**Before:**
```typescript
const TYPE_LABELS: Record<AlertType, string> = {
  ANOMALY: "Anomaly",
  OUTBREAK: "Outbreak",
  LOW_CONFIDENCE: "Low Confidence",
  HIGH_UNCERTAINTY: "High Uncertainty",
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "ANOMALY", label: "Anomaly" },
  { value: "OUTBREAK", label: "Outbreak" },
  { value: "LOW_CONFIDENCE", label: "Low Confidence" },
  { value: "HIGH_UNCERTAINTY", label: "High Uncertainty" },
];
```

**After:**
```typescript
const TYPE_LABELS: Record<AlertType, string> = {
  ANOMALY: "Anomaly",
  OUTBREAK: "Outbreak",
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "ANOMALY", label: "Anomaly" },
  { value: "OUTBREAK", label: "Outbreak" },
];
```

**Why:** The alerts page type filter dropdown should only show active alert types. Clinicians can no longer filter by "Low Confidence" or "High Uncertainty" since those alert types no longer exist.

---

### 9. Frontend: Remove Reason Code Definitions

**Location:** `frontend/utils/anomaly-reasons.ts:94-105`

**Removed:**
```typescript
"CONFIDENCE:LOW": {
  label: "Low confidence",
  description:
    "The system had low confidence when making this diagnosis. The result may be less reliable and warrants further review.",
},
"UNCERTAINTY:HIGH": {
  label: "High uncertainty",
  description:
    "The system reported high uncertainty for this diagnosis. The findings should be interpreted with caution.",
},
```

**Why:** Reason badges in the anomaly patients modal should no longer display confidence/uncertainty flags. The remaining reason codes (GEOGRAPHIC:RARE, TEMPORAL:RARE, CLUSTER:SPATIAL, AGE:RARE, GENDER:RARE, COMBINED:MULTI) are sufficient for explaining epidemiological anomalies.

---

## UI/UX Improvements

- **Simplified alert type filter**: The alerts page dropdown now only shows "Anomaly" and "Outbreak" options, reducing cognitive load for clinicians
- **Clearer alert messages**: Alert text no longer references "low predictive confidence" or "high statistical uncertainty" — only genuine anomaly reasons
- **More meaningful severity levels**: MEDIUM severity now indicates actual epidemiological signals (dense clusters, volume spikes) rather than model reliability issues

---

## Technical Notes

- **Database migration required**: After deploying these changes, run `npx prisma generate && npx prisma db push` to update the database schema. Existing `LOW_CONFIDENCE` and `HIGH_UNCERTAINTY` alerts in the database will need to be handled (either migrated to "ANOMALY" or deleted).
- **Backwards compatibility**: The `resolveAlertType()` function is preserved (though simplified) to maintain the call site structure in `alert-pipeline.ts` and `sync-anomalies-to-alerts.ts`.
- **Severity mapping impact**: Removing CONFIDENCE:LOW and UNCERTAINTY:HIGH from the MEDIUM severity check means fewer alerts will be classified as MEDIUM. Only `CLUSTER:DENSE` and `OUTBREAK:VOL_SPIKE` now trigger MEDIUM severity.
- **TypeScript validation**: All changes pass `npx tsc --noEmit` with no errors.

---

## Testing Checklist

- [ ] Run `npx prisma generate && npx prisma db push` to apply schema changes
- [ ] Verify anomaly detection still works for geographic/temporal/spatial/age/gender reasons
- [ ] Confirm alerts page type filter dropdown only shows "Anomaly" and "Outbreak"
- [ ] Test that existing alerts with removed types are handled gracefully (migration or cleanup)
- [ ] Verify reason badges in anomaly patients modal no longer show confidence/uncertainty
- [ ] Check that severity mapping correctly assigns MEDIUM only to CLUSTER:DENSE and OUTBREAK:VOL_SPIKE
- [ ] Run `npx tsc --noEmit` to confirm no TypeScript errors
- [ ] Test alert creation flow after verifying a diagnosis

---

## Related Changes

- Original alert system implementation: `frontend/documentations/ALERT_SYSTEM.md`
- Anomaly detection documentation: `frontend/documentations/ANOMALY_DETECTION_SURVEILLANCE.md`
- Surveillance service backend: `backend/app/services/surveillance_service.py`
