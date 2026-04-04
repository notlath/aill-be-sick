# Changelog: Rejected Diagnosis Revert & Table Improvements

**Branch:** `update/rejection-table`  
**Date:** April 4, 2026  
**Status:** Staged changes

---

## Summary

This changeset introduces a complete rejection management workflow for clinicians, including the ability to revert rejected diagnoses back to their original status, enhanced filtering and sorting capabilities in the rejected diagnoses table, and improved UI feedback for rejected diagnoses in detail modals.

---

## Problem Statement

1. **No undo mechanism for rejections** — Clinicians had no way to revert accidentally or incorrectly rejected diagnoses back to their previous state
2. **Limited filtering in rejected diagnoses table** — The rejected diagnoses view lacked search, date range, and disease filtering capabilities
3. **Missing rejection context in modals** — Detail modals didn't display rejection reasons or provide undo functionality
4. **Schema missing original status tracking** — No way to track what status a diagnosis had before rejection

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/actions/revert-diagnosis.ts` | **New** | Server actions for reverting rejected diagnoses (single + batch) |
| `frontend/actions/verify-diagnosis.ts` | Modified | Added `originalStatus` tracking when rejecting diagnoses |
| `frontend/app/(app)/(clinician)/healthcare-reports/page.tsx` | Modified | Added "Rejected" tab with rejected diagnoses table |
| `frontend/components/clinicians/healthcare-reports-page/columns.tsx` | Modified | Updated column definitions for rejected diagnoses |
| `frontend/components/clinicians/healthcare-reports-page/rejected_columns.tsx` | Modified | Enhanced table columns with undo action |
| `frontend/components/clinicians/healthcare-reports-page/rejected-content.tsx` | Modified | Complete rewrite with filtering, sorting, and pagination |
| `frontend/components/clinicians/healthcare-reports-page/rejected-data-table.tsx` | Modified | Enhanced data table with processing states |
| `frontend/components/clinicians/healthcare-reports-page/report-detail-modal.tsx` | Modified | Added rejection reason display and undo button |
| `frontend/prisma/schema.prisma` | Modified | Added `originalStatus` field to Diagnosis model |
| `frontend/utils/diagnosis.ts` | Modified | Added `getRejectedDiagnoses` and `getRejectedDiagnosesCount` utilities |

---

## Detailed Changes

### 1. Revert Diagnosis Server Actions

**Location:** `frontend/actions/revert-diagnosis.ts` (new file)

**What was added:**
```typescript
export const revertDiagnosis = actionClient
  .inputSchema(RevertDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    // Reverts single rejected diagnosis to original status
  });

export const batchRevertDiagnoses = actionClient
  .inputSchema(BatchRevertDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    // Reverts multiple rejected diagnoses in a transaction
  });
```

**Why:** Clinicians need the ability to undo rejections. The system tracks the original status before rejection and restores it when reverting. Both single and batch operations are supported for workflow flexibility.

**Key features:**
- Role-based access control (CLINICIAN, ADMIN, DEVELOPER only)
- Validates diagnosis is in REJECTED status before allowing revert
- Restores to `originalStatus` (defaults to PENDING if not set)
- Clears `rejectedAt` and `rejectedBy` fields
- Revalidates relevant paths (`/healthcare-reports`, `/pending-diagnoses`, `/diagnosis/[chatId]`)
- Batch operation uses Prisma transactions for data consistency

---

### 2. Original Status Tracking in Schema

**Location:** `frontend/prisma/schema.prisma` (line ~131)

**Before:**
```prisma
model Diagnosis {
  rejectedAt      DateTime?
  rejectedBy      Int?
  status          DiagnosisStatus    @default(PENDING)
}
```

**After:**
```prisma
model Diagnosis {
  rejectedAt      DateTime?
  rejectedBy      Int?
  originalStatus  DiagnosisStatus?
  status          DiagnosisStatus    @default(PENDING)
}
```

**Why:** When a diagnosis is rejected, we need to remember what status it had before (PENDING, INCONCLUSIVE, etc.) so it can be restored correctly when reverted.

---

### 3. Updated Reject Action to Track Original Status

**Location:** `frontend/actions/verify-diagnosis.ts` (line ~143)

**What changed:**
```typescript
const updatedDiagnosis = await prisma.diagnosis.update({
  where: { id: diagnosisId },
  data: {
    status: "REJECTED",
    originalStatus: diagnosisData.status,  // ← NEW
    rejectedAt: new Date(),
    rejectedBy: dbUser.id,
  } as any,
});
```

**Why:** Captures the status at the time of rejection so the revert action can restore it accurately.

---

### 4. Rejected Diagnoses Table with Advanced Filtering

**Location:** `frontend/components/clinicians/healthcare-reports-page/rejected-content.tsx`

**What was added:** Complete rewrite of the rejected diagnoses content component with:

- **Search functionality** — Real-time text search across all diagnoses
- **Disease filter** — Dropdown to filter by specific disease
- **Date range filter** — Date pickers for "Date From" and "Date To"
- **Sort options** — Multiple sort criteria (date, confidence, etc.)
- **Pagination controls** — Configurable page sizes (10, 25, 50, 100)
- **Clear all filters button** — One-click reset of all filters
- **Processing state** — Visual feedback during revert operations

**Why:** Clinicians need efficient ways to find and manage rejected diagnoses, especially when reviewing large volumes of historical data.

**Key implementation:**
```typescript
const filteredData = useMemo(() => {
  let rows = data as RejectedDiagnosisRow[];
  
  if (selectedDisease) {
    rows = rows.filter((r) => r.disease === selectedDisease);
  }
  
  if (dateFrom) {
    const from = new Date(dateFrom);
    rows = rows.filter((r) => new Date(r.submittedAt) >= from);
  }
  
  // ... additional filters
  
  return rows as TData[];
}, [data, selectedDisease, dateFrom, dateTo]);
```

---

### 5. Rejection Reason Display in Detail Modal

**Location:** `frontend/components/clinicians/healthcare-reports-page/report-detail-modal.tsx` (lines ~106-117, ~163-177, ~232-245)

**What was added:**

**Rejection reason extraction:**
```typescript
const rejectionReason = report.rejectionReason || (() => {
  const note = report.notes?.find((n) => 
    n.content.startsWith("Rejection reason: ")
  );
  return note ? note.content.replace("Rejection reason: ", "") : null;
})();
```

**Visual indicator:**
```tsx
{isRejected && (
  <div className="bg-error/10 border border-error/30 p-4 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <XCircle className="size-5 text-error" />
      <p className="font-medium text-error">Diagnosis Rejected</p>
    </div>
    {rejectionReason && (
      <div className="text-sm">
        <p className="text-base-content/60 mb-1">Rejection Reason</p>
        <p>{rejectionReason}</p>
      </div>
    )}
  </div>
)}
```

**Undo button:**
```tsx
{isRejected && onUndoRejection && (
  <button
    type="button"
    onClick={() => {
      onUndoRejection();
      onClose();
    }}
    className="btn btn-outline btn-warning w-full gap-2"
  >
    <RotateCcw className="size-4" />
    Undo Rejection
  </button>
)}
```

**Why:** Provides clear visual feedback about rejection status and reason, plus a convenient one-click undo option directly in the detail view.

---

### 6. Rejected Diagnoses Utility Functions

**Location:** `frontend/utils/diagnosis.ts` (lines ~620-709)

**What was added:**
```typescript
export const getRejectedDiagnoses = async ({
  skip,
  take,
}: {
  skip?: number;
  take?: number;
} = {}) => {
  // Fetches all rejected diagnoses with full user and notes relations
};

export const getRejectedDiagnosesCount = async () => {
  // Returns count of rejected diagnoses
};
```

**Why:** Centralized data fetching utilities for rejected diagnoses, following the existing pattern used for other diagnosis status queries.

---

### 7. Healthcare Reports Page Integration

**Location:** `frontend/app/(app)/(clinician)/healthcare-reports/page.tsx`

**What changed:** Added "Rejected" tab to the healthcare reports page that displays the rejected diagnoses table with all filtering and sorting capabilities.

**Why:** Provides clinicians a dedicated workspace for managing rejected diagnoses separately from verified and pending cases.

---

## UI/UX Improvements

- ✅ **Search bar with clear button** — Quick text search across rejected diagnoses
- ✅ **Multi-filter support** — Disease, date range, and sort options work together
- ✅ **Processing state feedback** — Spinner and "Processing..." text during revert operations
- ✅ **Rejection reason badge** — Prominent display of why a diagnosis was rejected
- ✅ **Undo Rejection button** — Warning-styled button in detail modal for quick reverts
- ✅ **Pagination controls** — First, Previous, Next, Last buttons with configurable page sizes
- ✅ **Empty state messaging** — Context-aware messages ("No rejected diagnoses match your filters" vs "No rejected diagnoses")
- ✅ **Clear all filters button** — One-click reset when filters are active

---

## Technical Notes

- **Role hierarchy enforcement** — Revert actions use the standard `["CLINICIAN", "ADMIN", "DEVELOPER"]` check, respecting the permission inheritance model
- **Transaction safety** — Batch revert uses `prisma.$transaction()` to ensure all-or-nothing updates
- **Path revalidation** — Both single and batch revert actions call `revalidatePath` on affected routes
- **Original status fallback** — If `originalStatus` is null, revert defaults to "PENDING" for safety
- **Processing state timeout** — UI shows processing indicator for 5 seconds after revert to prevent duplicate actions
- **Disease filter options** — Uses `DISEASE_SELECT_OPTIONS` constant for consistency across the app

---

## Database Migration Required

⚠️ **Before deploying:** Run `npx prisma generate && npx prisma db push` to apply the `originalStatus` field addition to the Diagnosis model.

---

## Testing Checklist

- [ ] Verify rejected diagnoses display in the "Rejected" tab
- [ ] Test search functionality with various text inputs
- [ ] Test disease filter dropdown filters correctly
- [ ] Test date range filters (from/to) work independently and together
- [ ] Test sort options change table order correctly
- [ ] Test "Clear all filters" button resets all filters
- [ ] Test single revert action restores diagnosis to original status
- [ ] Test batch revert action reverts multiple diagnoses in one transaction
- [ ] Verify rejection reason displays in detail modal
- [ ] Test "Undo Rejection" button in detail modal works
- [ ] Verify processing state shows during revert operations
- [ ] Test pagination controls (page size, navigation buttons)
- [ ] Verify role-based access (patients cannot see/use revert features)
- [ ] Test empty state messages display correctly
- [ ] Run `npx tsc --noEmit` to verify no TypeScript errors
- [ ] Run relevant pytest tests for backend diagnosis endpoints

---

## Related Changes

- Builds on rejection workflow from `fix/diagnosis-verification-types` branch
- Complements diagnosis verification and approval workflow
- Uses existing `next-safe-action` pattern established for all mutations
