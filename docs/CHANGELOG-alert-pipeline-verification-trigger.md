# Changelog: Alert Pipeline Verification Trigger

**Branch:** `fix/alert-pipeline-verification-trigger`  
**Date:** April 04, 2026  
**Status:** Staged changes

---

## Summary

Moves the anomaly and outbreak alert pipeline trigger from diagnosis creation time to diagnosis verification time. Extracts alert helper functions into a shared utility module (`alert-pipeline.ts`) and updates all verification actions (`approveDiagnosis`, `batchApproveDiagnoses`, `overrideDiagnosis`) to run the alert pipeline after a diagnosis transitions to VERIFIED.

---

## Problem Statement

1. **Race condition between trigger and data scope**: The alert pipeline was triggered at diagnosis creation (`autoRecordDiagnosis`), but the Flask backend only queries diagnoses with `status = 'VERIFIED'`. This meant newly created PENDING diagnoses were never detected as anomalies — they were invisible to the surveillance system until a clinician verified them.
2. **Duplicate alert helper code**: The `checkAndCreateAlert` and `checkAndCreateOutbreakAlert` functions were duplicated inside `auto-record-diagnosis.ts` instead of being reusable utilities.
3. **Missing patient demographics in alert metadata**: Alert metadata was sourced from the clinician's user record (`dbUser`) rather than the patient's, resulting in incorrect age/gender data in alert details.
4. **Duplicate outbreak detection in batch verification**: `batchApproveDiagnoses` called `checkAndCreateOutbreakAlert` once per diagnosis, but the backend scans the full VERIFIED dataset regardless — making per-diagnosis calls redundant.
5. **Batch duplicate anomaly alerts**: The batch verify action queried ALL VERIFIED diagnoses (including ones already verified before the call), causing duplicate ANOMALY alerts for diagnoses that were re-included in the batch.
6. **INCONCLUSIVE diagnoses excluded from override alert pipeline**: Clinical overrides on INCONCLUSIVE diagnoses didn't trigger auto-verification or the alert pipeline, even though the clinician's override effectively confirms the case.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/utils/alert-pipeline.ts` | New | Shared alert utility with `checkAndCreateAlert` and `checkAndCreateOutbreakAlert` |
| `frontend/actions/auto-record-diagnosis.ts` | Modified | Removed alert pipeline calls and helper functions (~180 lines removed) |
| `frontend/actions/verify-diagnosis.ts` | Modified | Added alert pipeline to `approveDiagnosis`, `batchApproveDiagnoses`; fixed duplicate alert bug |
| `frontend/actions/override-diagnosis.ts` | Modified | Added alert pipeline with patient demographics; extended to INCONCLUSIVE diagnoses |
| `frontend/documentations/ALERT_SYSTEM.md` | Modified | Updated flowcharts, trigger points, file structure, testing checklist (v4.0 → v5.0) |
| `frontend/documentations/OUTBREAK_ALERT_SYSTEM.md` | Modified | Updated trigger description, sequence diagram, trigger points table |
| `frontend/documentations/ANOMALY_DETECTION_SURVEILLANCE.md` | Modified | Added VERIFIED-only note, updated system integration table |
| `docs/DIAGNOSIS-VERIFICATION-FLOWCHART.md` | Modified | Added alert pipeline nodes to mermaid diagram, updated flow descriptions |

---

## Detailed Changes

### 1. Extract Shared Alert Pipeline Utility

**Location:** `frontend/utils/alert-pipeline.ts` (new file)

Extracted `checkAndCreateAlert()` and `checkAndCreateOutbreakAlert()` from `auto-record-diagnosis.ts` into a shared utility module. Both functions are now importable by any verification action.

**Key change — `checkAndCreateOutbreakAlert` takes no params:**

```typescript
// Before: unused params that were never passed to the backend
async function checkAndCreateOutbreakAlert(params: {
  disease: string;
  district?: string | null;
}): Promise<void>

// After: no params — backend scans full VERIFIED dataset
export async function checkAndCreateOutbreakAlert(): Promise<void>
```

The backend `/api/surveillance/outbreaks/detect` endpoint calls `detect_outbreaks()` with no arguments, analyzing the entire VERIFIED dataset. The `disease` and `district` params were never used.

---

### 2. Remove Alert Pipeline from `autoRecordDiagnosis`

**Location:** `frontend/actions/auto-record-diagnosis.ts`

Removed all alert pipeline calls and helper functions (~180 lines). The action now only creates the diagnosis record with PENDING or INCONCLUSIVE status.

**Before:**
```typescript
// After creating diagnosis, fire-and-forget alert checks
checkAndCreateAlert({ diagnosisId: diagnosis.id, ... }).catch(...);
checkAndCreateOutbreakAlert({ disease, district }).catch(...);
```

**After:**
```typescript
// No alert pipeline — alerts run at verification time instead
return { success: "Diagnosis automatically recorded." };
```

Updated JSDoc to clarify that alert checks are NOT triggered here.

---

### 3. Add Alert Pipeline to `approveDiagnosis`

**Location:** `frontend/actions/verify-diagnosis.ts:83-118`

Added `include: { user: true }` to the diagnosis query to fetch patient demographics, then runs both alert checks after verification:

```typescript
const diagnosis = await prisma.diagnosis.findUnique({
  where: { id: diagnosisId },
  include: { user: true },
});

// ... status update to VERIFIED ...

const patient = diagnosis.user;
checkAndCreateAlert({
  diagnosisId,
  disease: diagnosis.disease,
  // ... location fields from diagnosis ...
  patientAge: patient?.age ?? undefined,
  patientGender: patient?.gender ?? undefined,
}).catch(...);

checkAndCreateOutbreakAlert().catch(...);
```

---

### 4. Add Alert Pipeline to `batchApproveDiagnoses`

**Location:** `frontend/actions/verify-diagnosis.ts:234-294`

**Bug fix — query eligible diagnoses BEFORE update:** Instead of querying all VERIFIED diagnoses after the update (which included already-verified IDs), the code now queries eligible diagnoses before the `updateMany`:

```typescript
// Query BEFORE updating — only diagnoses actually changed by this call
const eligibleDiagnoses = await prisma.diagnosis.findMany({
  where: {
    id: { in: diagnosisIds },
    status: { in: ["PENDING", "INCONCLUSIVE"] },
  },
  include: { user: true },
});

// Then update
const result = await prisma.diagnosis.updateMany({ ... });

// Run anomaly alerts for each newly verified diagnosis
for (const dx of eligibleDiagnoses) {
  checkAndCreateAlert({ ... }).catch(...);
}

// Run outbreak detection ONCE — it scans the full dataset
checkAndCreateOutbreakAlert().catch(...);
```

---

### 5. Add Alert Pipeline to `overrideDiagnosis`

**Location:** `frontend/actions/override-diagnosis.ts:114-145`

Extended the auto-verify check from `isPending` to `needsAutoVerify` (covers both PENDING and INCONCLUSIVE):

```typescript
const needsAutoVerify = ["PENDING", "INCONCLUSIVE"].includes(diagnosisData.status);

// ... in transaction: auto-verify if needsAutoVerify ...

// After transaction: run alerts if we auto-verified
if (needsAutoVerify) {
  const patient = diagnosis.user;
  checkAndCreateAlert({
    // ... with patient demographics ...
  }).catch(...);
  checkAndCreateOutbreakAlert().catch(...);
}
```

Also added `include: { user: true }` to the diagnosis query for patient demographics.

---

## UI/UX Improvements

- Alerts now only fire for clinician-confirmed diagnoses, reducing false positives from unverified AI predictions
- Alert metadata now correctly includes patient age and gender (not clinician data)
- Batch verification no longer creates duplicate anomaly alerts for already-verified diagnoses

---

## Technical Notes

- **VERIFIED-only data filter**: Both `surveillance_service.py` and `outbreak_service.py` have `WHERE d.status = 'VERIFIED'` in their SQL queries. This was the root cause of the original gap — alerts were triggered at creation but the backend couldn't see PENDING diagnoses.
- **Fire-and-forget pattern**: All alert calls use `.catch()` to prevent alert failures from blocking verification. This is intentional — verification must always succeed regardless of surveillance availability.
- **Outbreak detection runs once per batch**: Since the backend scans the full VERIFIED dataset, calling `checkAndCreateOutbreakAlert` once after batch verification is sufficient. The 24-hour duplicate prevention in the function handles redundant calls.
- **`as any` type assertions remain**: Prisma types haven't been regenerated to include the new `DiagnosisStatus` enum values. The `as any` casts on `updateMany` where clauses are temporary until `npx prisma generate` runs.

---

## Testing Checklist

- [ ] Verify a single PENDING diagnosis — alert appears in `/alerts` without page refresh
- [ ] Verify a single INCONCLUSIVE diagnosis — alert appears in `/alerts`
- [ ] Verify that a PENDING diagnosis (unverified) does NOT trigger an alert
- [ ] Batch verify multiple diagnoses — verify anomaly alert runs for each, outbreak runs once
- [ ] Batch verify with mix of PENDING and already-VERIFIED IDs — no duplicate alerts
- [ ] Apply clinical override on PENDING diagnosis — alert pipeline runs after auto-verify
- [ ] Apply clinical override on INCONCLUSIVE diagnosis — alert pipeline runs after auto-verify
- [ ] Apply clinical override on already-VERIFIED diagnosis — no alerts (override only, no status change)
- [ ] Verify patient age/gender appear correctly in alert metadata (not clinician data)
- [ ] Flask backend offline — verification succeeds, alert failure logged silently
- [ ] `npx tsc --noEmit` passes

---

## Related Changes

- `CHANGELOG-diagnosis-verification-types.md` — Original implementation of diagnosis verification tracking
- `CHANGELOG-inconclusive-diagnosis-support.md` — INCONCLUSIVE status support
- `CHANGELOG-link-override-to-verification.md` — Clinical override auto-verification
