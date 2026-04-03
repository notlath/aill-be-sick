# Changelog: Inconclusive Diagnosis Support

**Branch:** `main`  
**Date:** April 3, 2026  
**Status:** Uncommitted changes

---

## Summary

This changeset introduces support for **inconclusive diagnoses** — cases where the AI model cannot reach a confident prediction (`is_valid=false` from backend). These diagnoses are now recorded with `INCONCLUSIVE` status, displayed in a dedicated clinician tab, and excluded from anomaly/outbreak alert pipelines. The system maintains full clinician verification and override capabilities for these edge cases.

---

## Problem Statement

1. **Missing inconclusive case handling** — When the AI model returned `is_valid=false`, the system had no dedicated status or workflow for these uncertain predictions, potentially treating them the same as confident diagnoses.
2. **No clinician visibility** — Inconclusive cases had no dedicated UI for clinicians to review, verify, or override them separately from standard pending diagnoses.
3. **Unnecessary alert noise** — Anomaly and outbreak detection pipelines were running on inconclusive diagnoses, generating false alerts from uncertain predictions.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/prisma/schema.prisma` | Modified | Added `INCONCLUSIVE` to `DiagnosisStatus` enum, `isValid` field to `TempDiagnosis`, and `AuditLog` model |
| `frontend/schemas/AutoRecordDiagnosisSchema.ts` | Modified | Added `isInconclusive` boolean field (optional, defaults to `false`) |
| `frontend/actions/auto-record-diagnosis.ts` | Modified | Conditional status assignment and alert skipping for inconclusive cases |
| `frontend/actions/verify-diagnosis.ts` | Modified | Updated verify/reject/batch actions to handle both `PENDING` and `INCONCLUSIVE` statuses |
| `frontend/actions/create-message.ts` | Modified | Added `isValid` field to tempDiagnosis payload |
| `frontend/components/patient/diagnosis-page/chat-window.tsx` | Modified | Auto-records inconclusive diagnoses when `isValid=false` in INFO messages |
| `frontend/app/(app)/(clinician)/healthcare-reports/page.tsx` | Modified | Added "Inconclusive" tab with `InconclusiveContent` component |
| `frontend/components/clinicians/healthcare-reports-page/inconclusive-content.tsx` | New | Clinician UI for reviewing inconclusive diagnoses |
| `frontend/app/(app)/(patient)/history/page.tsx` | Modified | Displays "Inconclusive" badge and special handling for inconclusive diagnoses |
| `frontend/components/patient/diagnosis-page/cdss-summary.tsx` | Modified | Added clinician review messaging |
| `frontend/components/patient/diagnosis-page/chat-container.tsx` | Modified | Minor UI spacing adjustment for insight generation message |
| `frontend/app/(app)/(patient)/diagnosis/[chatId]/page.tsx` | Modified | Simplified rendering mode comment |
| `frontend/utils/diagnosis.ts` | New | Added `getInconclusiveDiagnoses()` and `getInconclusiveDiagnosesCount()` utilities |

---

## Detailed Changes

### 1. Database Schema Updates

**Location:** `frontend/prisma/schema.prisma`

**Before:**
```prisma
enum DiagnosisStatus {
  PENDING
  VERIFIED
  REJECTED
}

model TempDiagnosis {
  chatId      String
  symptoms    String
  cdss        Json?
  chat        Chat     @relation(...)
  message     Message  @relation(...)
}
```

**After:**
```prisma
enum DiagnosisStatus {
  PENDING
  VERIFIED
  REJECTED
  INCONCLUSIVE  // ← New status
}

model TempDiagnosis {
  chatId      String
  symptoms    String
  cdss        Json?
  isValid     Boolean  @default(true)  // ← New field
  chat        Chat     @relation(...)
  message     Message  @relation(...)
}

// New model for audit trail
model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int?
  action    String
  details   Json?
  createdAt DateTime @default(now())
  User      User?    @relation(...)

  @@index([action])
  @@index([createdAt])
  @@index([userId])
}
```

**Why:** The `INCONCLUSIVE` status creates a distinct lifecycle for uncertain AI predictions, separating them from standard pending diagnoses. The `isValid` field on `TempDiagnosis` allows the backend to signal uncertainty to the frontend. The `AuditLog` model provides infrastructure for tracking all diagnosis-related actions.

---

### 2. Auto-Record Diagnosis Action

**Location:** `frontend/actions/auto-record-diagnosis.ts:21-109`

**Before:**
```typescript
export const autoRecordDiagnosis = actionClient
  .inputSchema(AutoRecordDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { messageId, chatId } = parsedInput;
    
    // ... user validation ...
    
    const diagnosis = await prisma.diagnosis.create({
      data: {
        // ... fields ...
        status: DiagnosisStatus.PENDING,  // Always PENDING
      },
    });

    // Always run anomaly/outbreak checks
    checkAndCreateAlert({ ... });
    checkAndCreateOutbreakAlert({ ... });

    return { success: "Diagnosis automatically recorded." };
  });
```

**After:**
```typescript
export const autoRecordDiagnosis = actionClient
  .inputSchema(AutoRecordDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { messageId, chatId, isInconclusive } = parsedInput;  // ← New field
    
    // ... user validation ...
    
    const diagnosis = await prisma.diagnosis.create({
      data: {
        // ... fields ...
        // Conditional status based on isInconclusive flag
        status: isInconclusive
          ? DiagnosisStatus.INCONCLUSIVE
          : DiagnosisStatus.PENDING,
      },
    });

    // Skip anomaly/outbreak checks for inconclusive diagnoses
    if (!isInconclusive) {
      checkAndCreateAlert({ ... });
      checkAndCreateOutbreakAlert({ ... });
    }

    return {
      success: isInconclusive
        ? "Inconclusive diagnosis recorded."
        : "Diagnosis automatically recorded.",
    };
  });
```

**Why:** Inconclusive diagnoses shouldn't trigger epidemiological alerts since they represent uncertain predictions. This prevents false anomaly detections and outbreak alerts from low-confidence AI outputs.

---

### 3. Verify/Reject Diagnosis Actions

**Location:** `frontend/actions/verify-diagnosis.ts:60-66, 130-136, 198-205, 253-260`

**Before:**
```typescript
// approveDiagnosis
if (diagnosisData.status !== "PENDING") {
  return { error: "Diagnosis cannot be verified in its current state" };
}

// batchApproveDiagnoses
const result = await prisma.diagnosis.updateMany({
  where: {
    id: { in: diagnosisIds },
    status: "PENDING",  // Only PENDING
  },
  data: { status: "VERIFIED", ... },
});
```

**After:**
```typescript
// approveDiagnosis
// Allow verifying both PENDING and INCONCLUSIVE diagnoses
if (!["PENDING", "INCONCLUSIVE"].includes(diagnosisData.status)) {
  return { error: "Diagnosis cannot be verified in its current state" };
}

// batchApproveDiagnoses
const result = await prisma.diagnosis.updateMany({
  where: {
    id: { in: diagnosisIds },
    status: { in: ["PENDING", "INCONCLUSIVE"] },  // ← Both statuses
  },
  data: { status: "VERIFIED", ... },
});
```

**Why:** Clinicians need to verify or override inconclusive diagnoses just like pending ones. The AI couldn't reach a confident prediction, so human expertise is required to make a final determination.

---

### 4. Chat Window Auto-Recording

**Location:** `frontend/components/patient/diagnosis-page/chat-window.tsx:669-694`

**New logic:**
```typescript
// Handle INFO messages with tempDiagnosis (inconclusive cases)
if (
  created.type === "INFO" &&
  created.tempDiagnosis &&
  created.tempDiagnosis.isValid === false  // ← Backend signals uncertainty
) {
  finalDiagnosisCreatedRef.current = true;

  // Auto-record inconclusive diagnosis if not already recorded
  if (!chat.hasDiagnosis) {
    console.log(
      "[ChatWindow] Auto-recording inconclusive diagnosis for message",
      created.id,
    );
    autoRecordExecute({
      messageId: created.id,
      chatId,
      isInconclusive: true,  // ← Triggers INCONCLUSIVE status
    });
  }
}
```

**Why:** When the backend returns `isValid=false`, the frontend immediately records it as an inconclusive diagnosis without waiting for SHAP explanations or additional processing. This ensures uncertain cases are tracked from the moment they're identified.

---

### 5. Clinician Inconclusive Tab

**Location:** `frontend/app/(app)/(clinician)/healthcare-reports/page.tsx:27-40`

**Before:**
```tsx
<TabsList>
  <TabsTrigger value="reports">Reports</TabsTrigger>
  <TabsTrigger value="verifications">Verifications</TabsTrigger>
</TabsList>

<TabsContent value="reports">
  <ReportsContent />
</TabsContent>
<TabsContent value="verifications">
  <VerificationsContent />
</TabsContent>
```

**After:**
```tsx
<TabsList>
  <TabsTrigger value="reports">Reports</TabsTrigger>
  <TabsTrigger value="verifications">Verifications</TabsTrigger>
  <TabsTrigger value="inconclusive">Inconclusive</TabsTrigger>  {/* ← New tab */}
</TabsList>

<TabsContent value="reports">
  <ReportsContent />
</TabsContent>
<TabsContent value="verifications">
  <VerificationsContent />
</TabsContent>
<TabsContent value="inconclusive">
  <InconclusiveContent />  {/* ← New component */}
</TabsContent>
```

**Why:** Clinicians need a dedicated workspace to review inconclusive diagnoses separately from standard pending cases. This tab provides focused UI for uncertain AI predictions requiring human judgment.

---

### 6. Patient History Display

**Location:** `frontend/app/(app)/(patient)/history/page.tsx:53-65`

**Before:**
```typescript
if (confidence !== null && uncertainty !== null) {
  const reliability = getReliability(confidence, uncertainty);
  reliabilityLabel = reliability.label;
  reliabilityBadgeClass = reliability.badgeClass;
  reliabilityRank = reliability.rank;
}
```

**After:**
```typescript
// Handle INCONCLUSIVE diagnoses — AI could not reach confident prediction
if (chat.diagnosis.status === "INCONCLUSIVE") {
  reliabilityLabel = "Inconclusive";
  reliabilityBadgeClass = "badge-soft";
  reliabilityRank = null;
} else if (confidence !== null && uncertainty !== null) {
  // Only compute reliability for conclusive diagnoses
  const reliability = getReliability(confidence, uncertainty);
  reliabilityLabel = reliability.label;
  reliabilityBadgeClass = reliability.badgeClass;
  reliabilityRank = reliability.rank;
}
```

**Why:** Patients need clear visual indication that their diagnosis was inconclusive — meaning the AI couldn't determine a confident prediction. This manages expectations and encourages clinician follow-up.

---

### 7. Utility Functions

**Location:** `frontend/utils/diagnosis.ts:534-618`

**New functions:**
```typescript
/**
 * Get all inconclusive diagnoses.
 * These are cases where the AI model could not reach a confident prediction
 * (is_valid=false from backend). Clinicians can verify or override them.
 */
export const getInconclusiveDiagnoses = async ({
  skip,
  take,
}: { skip?: number; take?: number } = {}) => {
  try {
    const includeRelations = {
      user: { select: { id, name, age, gender, email, city, province, district, barangay } },
      notes: {
        include: { clinician: { select: { id, name } } },
        orderBy: { createdAt: "desc" },
      },
    };

    const whereClause = { status: "INCONCLUSIVE" } as any;

    if (skip !== undefined || take !== undefined) {
      const diagnoses = await prisma.diagnosis.findMany({
        skip, take, where: whereClause, include: includeRelations,
        orderBy: { createdAt: "desc" },
      });
      return { success: diagnoses };
    }

    const diagnoses = await prisma.diagnosis.findMany({
      where: whereClause, include: includeRelations,
      orderBy: { createdAt: "desc" },
    });
    return { success: diagnoses };
  } catch (error) {
    console.error(`Error fetching inconclusive diagnoses:`, error);
    return { error: `Could not fetch inconclusive diagnoses` };
  }
};

export const getInconclusiveDiagnosesCount = async () => {
  try {
    const count = await prisma.diagnosis.count({
      where: { status: "INCONCLUSIVE" } as any,
    });
    return { success: count };
  } catch (error) {
    console.error(`Error fetching inconclusive diagnoses count: ${error}`);
    return { error: `Error fetching inconclusive diagnoses count: ${error}` };
  }
};
```

**Why:** These utilities provide standardized data access for inconclusive diagnoses across the clinician dashboard and patient history views. They follow the existing pattern of `getLowReliabilityPendingCount()` and similar utilities.

---

## UI/UX Improvements

- ✅ **Inconclusive badge** — Patients see "Inconclusive" badge in history instead of reliability scores
- ✅ **Dedicated clinician tab** — Separate workspace for reviewing uncertain AI predictions
- ✅ **Clear messaging** — CDSS summary now states "This will undergo clinician review and verification before any final decisions are made"
- ✅ **No false alerts** — Inconclusive diagnoses don't trigger anomaly or outbreak detection pipelines
- ✅ **Auto-recording** — Inconclusive cases are immediately tracked without requiring SHAP explanations
- ✅ **Chat UI spacing** — Added `mt-4` to insight generation message for better visual separation

---

## Technical Notes

- **`is_valid` field propagation**: The backend's `is_valid` boolean is now passed through `create-message.ts` → `tempDiagnosis.isValid` → used by `chat-window.tsx` to trigger inconclusive recording
- **Status lifecycle**: `INCONCLUSIVE` diagnoses can transition to `VERIFIED` or `REJECTED` via clinician actions, same as `PENDING` diagnoses
- **Alert pipeline optimization**: The conditional check `if (!isInconclusive)` prevents unnecessary background API calls for anomaly/outbreak detection
- **AuditLog model**: Infrastructure added for future audit trail features; not yet wired into actions
- **Schema field ordering**: Minor reorganization of `Diagnosis` model fields (moved `rejectedAt`, `rejectedBy` before `status`; moved relation declarations for consistency)
- **Type safety**: All status checks use array inclusion (`["PENDING", "INCONCLUSIVE"].includes(...)`) rather than equality to support multiple statuses
- **No breaking changes**: Existing `PENDING` → `VERIFIED`/`REJECTED` workflows remain unchanged

---

## Testing Checklist

- [ ] Submit symptoms that trigger `is_valid=false` from backend → verify "Inconclusive" diagnosis recorded
- [ ] Check patient history → verify inconclusive diagnosis shows "Inconclusive" badge
- [ ] Clinician views "Inconclusive" tab → verify inconclusive diagnoses appear
- [ ] Clinician verifies inconclusive diagnosis → verify status changes to `VERIFIED`
- [ ] Clinician rejects inconclusive diagnosis → verify status changes to `REJECTED`
- [ ] Batch approve/reject inconclusive diagnoses → verify all statuses update correctly
- [ ] Check anomaly alerts → verify inconclusive diagnoses don't trigger alerts
- [ ] Check outbreak alerts → verify inconclusive diagnoses don't trigger alerts
- [ ] Run `npx prisma generate` → verify no schema errors
- [ ] Run `npx tsc --noEmit` in `frontend/` → verify no TypeScript errors
- [ ] Verify existing `PENDING` diagnosis workflows still work (regression test)
- [ ] Check browser console → verify no React warnings or errors

---

## Related Changes

- Previous: `docs/CHANGELOG-link-override-to-verification.md` — Clinical override workflow improvements
- Previous: `docs/CHANGELOG-clinician-approval-workflow.md` — Diagnosis verification system
- Related: `frontend/actions/verify-diagnosis.ts` — Updated to handle `INCONCLUSIVE` status in verify/reject flows
- Related: `frontend/utils/diagnosis.ts` — New utilities for inconclusive diagnosis queries
