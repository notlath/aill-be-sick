# Changelog: Auto-Record All Diagnoses

**Branch:** `update/autorecord-all-diagnoses`  
**Date:** April 3, 2026  
**Status:** Uncommitted changes

---

## Summary

This changeset removes the confidence threshold from the auto-record diagnosis flow, ensuring **all diagnoses are automatically recorded** regardless of confidence or uncertainty levels. The manual "Record diagnosis" and "Discard result" buttons have been removed, simplifying the UX and eliminating the limbo state where a chat has a final AI diagnosis message but no permanent record.

---

## Problem Statement

1. **Confidence threshold blocking auto-record**: Diagnoses with confidence <95% required manual user confirmation, creating a limbo state where users received a diagnosis but had no permanent record unless they explicitly clicked "Record".
2. **Unnecessary UI complexity**: The Record/Discard button pair added visual clutter and decision friction to the diagnosis flow.
3. **Incomplete location tracking**: Location data was sourced from client-side GPS rather than the authenticated user's profile, leading to inconsistent or missing location snapshots.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/actions/auto-record-diagnosis.ts` | Modified | Removed confidence threshold, auto-record all diagnoses |
| `frontend/actions/create-diagnosis.ts` | Deleted | Replaced by auto-record flow |
| `frontend/actions/discard-diagnosis.ts` | Deleted | No longer needed |
| `frontend/schemas/CreateDiagnosisSchema.ts` | Deleted | Schema for removed action |
| `frontend/schemas/DiscardDiagnosisSchema.ts` | Deleted | Schema for removed action |
| `frontend/components/patient/diagnosis-page/chat-bubble.tsx` | Modified | Removed Record/Discard buttons |
| `frontend/components/patient/diagnosis-page/chat-container.tsx` | Modified | Updated props |
| `frontend/components/patient/diagnosis-page/chat-history-view.tsx` | Modified | Updated props |
| `frontend/components/patient/diagnosis-page/chat-window.tsx` | Modified | Updated auto-record flow |
| `frontend/components/patient/diagnosis-page/cdss-summary.tsx` | Modified | Minor updates |
| `frontend/components/patient/diagnosis-page/discard-diagnosis-btn.tsx` | Deleted | Component removed |
| `frontend/components/patient/diagnosis-page/record-diagnosis-btn.tsx` | Deleted | Component removed |
| `frontend/components/patient/diagnosis-page/record-diagnosis-btn.tsx` | Deleted | Component removed |
| `frontend/app/(app)/(patient)/diagnosis/[chatId]/page.tsx` | Modified | Updated diagnosis flow |
| `frontend/app/(app)/(patient)/history/page.tsx` | Modified | Updated reliability column logic |
| `frontend/utils/diagnosis.ts` | Modified | Added recovery state checker |
| `frontend/AGENTS.md` | Modified | Updated action reference |
| `frontend/README.md` | Modified | Updated action reference |
| `frontend/documentations/ALERT_SYSTEM.md` | Modified | Updated pipeline references |
| `frontend/documentations/LOCATION_TRACKING.md` | Modified | Updated location sourcing docs |
| `frontend/documentations/OUTBREAK_ALERT_SYSTEM.md` | Modified | Updated trigger reference |
| `frontend/documentations/PR_HISTORY_MESSAGE_QUERY_OPTIMIZATION.md` | Modified | Updated cache invalidation reference |
| `frontend/documentations/PR_HYBRID_DIAGNOSIS_RECORDING.md` | Modified | Updated button flow docs |

---

## Detailed Changes

### 1. Remove Confidence Threshold from Auto-Record

**Location:** `frontend/actions/auto-record-diagnosis.ts`

**Before:**
```typescript
/** Confidence threshold for auto-recording (95%) */
const AUTO_RECORD_CONFIDENCE_THRESHOLD = 0.95;

// Inside action:
if (tempDiagnosis.confidence < AUTO_RECORD_CONFIDENCE_THRESHOLD) {
  console.log(
    `[autoRecordDiagnosis] Skipping auto-record for low-confidence diagnosis: ${tempDiagnosis.confidence.toFixed(3)} < ${AUTO_RECORD_CONFIDENCE_THRESHOLD}`,
  );
  return {
    success: "Diagnosis requires manual confirmation (low confidence).",
    requiresManualRecord: true,
    confidence: tempDiagnosis.confidence,
  };
}
```

**After:**
```typescript
// No threshold — all diagnoses auto-record
// Removed the conditional check entirely
```

**Why:**
- Prevents diagnoses from being left in a limbo state (final AI message exists but no permanent record)
- Ensures complete epidemiological data capture for public health surveillance
- Low-confidence diagnoses are still recorded with their confidence/uncertainty metadata intact for clinician review

---

### 2. Delete Manual Record/Discard Actions

**Location:** `frontend/actions/create-diagnosis.ts` (deleted)  
**Location:** `frontend/actions/discard-diagnosis.ts` (deleted)

**Why:**
- These actions are no longer needed since all diagnoses are auto-recorded
- Eliminates the manual decision point that caused user confusion
- Reduces codebase complexity and maintenance burden

---

### 3. Delete Record/Discard Button Components

**Location:** `frontend/components/patient/diagnosis-page/record-diagnosis-btn.tsx` (deleted)  
**Location:** `frontend/components/patient/diagnosis-page/discard-diagnosis-btn.tsx` (deleted)

**Why:**
- UI no longer requires manual confirmation buttons
- Simplifies the diagnosis bubble to only show "View Insights" button
- Reduces visual clutter and decision fatigue for patients

---

### 4. Update Chat Bubble to Remove Buttons

**Location:** `frontend/components/patient/diagnosis-page/chat-bubble.tsx`

**Before:**
```tsx
{type === "DIAGNOSIS" && (
  <>
    {isLowConfidenceFinal && (
      <div className="flex gap-2 mt-4">
        {location && <RecordDiagnosisBtn ... />}
        <DiscardDiagnosisBtn chatId={chatId} disabled={...} />
      </div>
    )}
    <ViewInsightsBtn disabled={isGettingExplanations || !explanation} />
  </>
)}
```

**After:**
```tsx
{type === "DIAGNOSIS" && (
  <ViewInsightsBtn disabled={isGettingExplanations || !explanation} />
)}
```

**Why:**
- All diagnoses now show only "View Insights" button
- Record/Discard buttons removed — diagnosis is auto-recorded after SHAP explanation
- Simplifies the component logic and removes conditional rendering

---

### 5. Location Data Sourced from User Profile

**Location:** `frontend/actions/auto-record-diagnosis.ts`

**Change:**
Location data is now sourced from the authenticated user's profile fields rather than client-side GPS:

```typescript
const diagnosis = await prisma.diagnosis.create({
  data: {
    confidence: tempDiagnosis.confidence,
    uncertainty: tempDiagnosis.uncertainty,
    modelUsed: tempDiagnosis.modelUsed,
    disease: tempDiagnosis.disease,
    chatId,
    symptoms: tempDiagnosis.symptoms,
    userId: dbUser.id,
    latitude: dbUser.latitude ?? null,
    longitude: dbUser.longitude ?? null,
    city: dbUser.city,
    province: dbUser.province,
    region: dbUser.region,
    barangay: dbUser.barangay,
    district: dbUser.district,
  },
});
```

**Why:**
- Ensures consistent location data across all diagnoses
- Removes dependency on client-side GPS permissions and browser APIs
- Profile-based location is more reliable for epidemiological tracking

---

### 6. Add Limbo Diagnosis Recovery Utility

**Location:** `frontend/utils/diagnosis.ts`

**Added:**
```typescript
export const getTempDiagnosisRecoveryState = async (chatId: string) => {
  try {
    const [tempDiagnosis, permanentDiagnosis] = await Promise.all([
      prisma.tempDiagnosis.findFirst({
        where: { chatId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.diagnosis.findUnique({
        where: { chatId },
        select: { id: true },
      }),
    ]);

    return {
      success: {
        needsRecovery: !!tempDiagnosis && !permanentDiagnosis,
        hasTempDiagnosis: !!tempDiagnosis,
        hasPermanentDiagnosis: !!permanentDiagnosis,
      },
    };
  } catch (error) {
    console.error(
      `Error checking temp diagnosis recovery state for chatId ${chatId}:`,
      error,
    );
    return { error: `Could not check recovery state for chatId ${chatId}` };
  }
};
```

**Why:**
- Provides a recovery mechanism for edge cases where auto-record fails (e.g., transient DB errors)
- Allows the chat window to detect and retry auto-recording on page load
- Prevents permanent data loss in failure scenarios

---

### 7. Update Alert System Documentation

**Location:** `frontend/documentations/ALERT_SYSTEM.md`

**Changes:**
- Updated all references from `create-diagnosis.ts` to `auto-record-diagnosis.ts`
- Updated architecture diagrams to reflect auto-record flow
- Clarified that `checkAndCreateAlert()` is fired as a fire-and-forget operation after auto-record

**Why:**
- Keeps documentation in sync with codebase changes
- Ensures future developers understand the alert trigger pipeline

---

### 8. Update History Page Reliability Column

**Location:** `frontend/components/patient/history-page/columns.tsx`

**Before:**
```tsx
const rank = row.getValue("reliabilityRank") as number | null;
if (rank === null) {
  return <span className="text-muted">—</span>;
}
```

**After:**
```tsx
const label = row.original.reliabilityLabel;
const badgeClass = row.original.reliabilityBadgeClass;

// No reliability info at all
if (!label || !badgeClass) {
  return <span className="text-muted">—</span>;
}
```

**Why:**
- Simplified the reliability column logic to use label/badge directly
- Removed unnecessary rank null check
- More consistent with the data transformation pipeline

---

## UI/UX Improvements

- **Simplified diagnosis flow**: No more Record/Discard buttons — diagnoses are automatically recorded after SHAP explanation
- **Reduced decision friction**: Patients no longer need to decide whether to "save" their diagnosis
- **Consistent location tracking**: All diagnoses now include profile-based location data for epidemiological accuracy
- **Cleaner chat bubble**: Diagnosis messages only show "View Insights" button, reducing visual clutter

---

## Technical Notes

- **Confidence threshold removed**: The `AUTO_RECORD_CONFIDENCE_THRESHOLD = 0.95` constant has been deleted. All diagnoses are now auto-recorded regardless of confidence level.
- **Actions deleted**: `create-diagnosis.ts` and `discard-diagnosis.ts` are no longer needed and have been removed from the codebase.
- **Schemas deleted**: `CreateDiagnosisSchema.ts` and `DiscardDiagnosisSchema.ts` have been removed alongside their actions.
- **Alert pipeline unchanged**: The `checkAndCreateAlert()` function is still called as a fire-and-forget operation after auto-record, ensuring outbreak detection continues to work.
- **Recovery utility added**: `getTempDiagnosisRecoveryState()` in `frontend/utils/diagnosis.ts` provides a mechanism to detect and recover from limbo diagnoses.

---

## Testing Checklist

- [ ] Submit symptoms and verify diagnosis is auto-recorded regardless of confidence level
- [ ] Check that low-confidence diagnoses (<95%) are recorded in the database
- [ ] Verify "View Insights" button appears for all diagnoses
- [ ] Confirm Record/Discard buttons no longer appear in chat bubbles
- [ ] Test that location data is sourced from user profile (check Diagnosis table in DB)
- [ ] Verify alert system still triggers after auto-record (check Alert table)
- [ ] Test limbo diagnosis recovery: simulate auto-record failure, then reload chat page
- [ ] Check history page displays reliability badges correctly
- [ ] Run `npx tsc --noEmit` to verify no TypeScript errors
- [ ] Verify no broken imports to deleted actions/schemas

---

## Related Changes

- **Original hybrid recording PR**: Documented in `frontend/documentations/PR_HYBRID_DIAGNOSIS_RECORDING.md` (updated in this changeset)
- **Alert system documentation**: Updated in `frontend/documentations/ALERT_SYSTEM.md`
- **Location tracking documentation**: Updated in `frontend/documentations/LOCATION_TRACKING.md`
- **Outbreak alert system**: Updated in `frontend/documentations/OUTBREAK_ALERT_SYSTEM.md`
