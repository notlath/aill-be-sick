# Changelog: Reliability Thresholds & Verification Dashboard

**Branch:** `refactor/centralize-thresholds-and-remove-impetigo`
**Date:** April 3, 2026
**Status:** Uncommitted changes

---

## Summary

This changeset centralizes reliability threshold constants, removes the Impetigo disease from the system, enhances the clinician verification dashboard with real-time statistics, and standardizes the disease filter dropdown across the application.

---

## Problem Statement

1. **Hardcoded threshold literals**: Confidence and uncertainty values (0.9, 0.03, 0.7, 0.08) were scattered across multiple files, making them difficult to tune and maintain consistently.
2. **Impetigo removal**: The Impetigo disease needed to be removed from the ontology across schema, constants, and metadata.
3. **Static dashboard statistics**: The verification dashboard showed placeholder values ("—") for "Verified Today" and "Requires Attention" cards instead of real data.
4. **Inconsistent disease filter**: Disease dropdowns were dynamically computed from data in some places, leading to inconsistency and unnecessary runtime computation.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/constants/reliability-thresholds.ts` | New | Centralized threshold constants |
| `frontend/constants/diseases.ts` | Modified | Removed Impetigo, added `DISEASE_SELECT_OPTIONS` |
| `frontend/actions/run-diagnosis.ts` | Modified | Use centralized thresholds |
| `frontend/utils/reliability.ts` | Modified | Use centralized thresholds |
| `frontend/utils/diagnosis.ts` | Modified | Added `getVerifiedTodayCount` and `getLowReliabilityPendingCount` |
| `frontend/components/clinicians/healthcare-reports-page/verifications-content.tsx` | Modified | Real stats cards with live data |
| `frontend/components/clinicians/healthcare-reports-page/data-table.tsx` | Modified | Use `DISEASE_SELECT_OPTIONS` |
| `frontend/components/clinicians/pending-diagnoses-page/data-table.tsx` | Modified | Use `DISEASE_SELECT_OPTIONS` |
| `frontend/prisma/schema.prisma` | Modified | Removed `IMPETIGO` enum value |
| `opencode.json` | Modified | Removed notebooklm MCP config |

---

## Detailed Changes

### 1. Centralized Reliability Thresholds

**Location:** `frontend/constants/reliability-thresholds.ts` (new file)

**Before:** Thresholds were hardcoded in multiple files:
```ts
// actions/run-diagnosis.ts
const isConfident = skip_followup || (confidence >= 0.9 && uncertainty <= 0.03);

// utils/reliability.ts
if (confidence >= 0.9 && uncertainty < 0.03) { ... }
if (confidence >= 0.7 && uncertainty <= 0.08) { ... }
```

**After:** Single source of truth:
```ts
export const RELIABILITY_THRESHOLDS = {
  reliable: {
    minConfidence: 0.9,
    maxUncertainty: 0.03,
  },
  reviewRecommended: {
    minConfidence: 0.7,
    maxUncertainty: 0.08,
  },
} as const;
```

**Why:**
- Eliminates duplication and risk of inconsistent values
- Makes it trivial to tune thresholds experimentally
- `as const` ensures compile-time immutability
- All consumers now import from one place

---

### 2. Updated Diagnosis Action to Use Thresholds

**Location:** `frontend/actions/run-diagnosis.ts`

**Changes:**
- Imported `RELIABILITY_THRESHOLDS` from new constants file
- Replaced all hardcoded `0.9`, `0.03` comparisons with threshold references
- All four reliability branches (Reliable, Review Recommended, Expert Review Needed, Ambiguous) now use centralized values

**Key change:**
```ts
const isConfident =
  skip_followup ||
  (confidence >= RELIABILITY_THRESHOLDS.reliable.minConfidence &&
   uncertainty <= RELIABILITY_THRESHOLDS.reliable.maxUncertainty);
```

---

### 3. Updated Reliability Utility

**Location:** `frontend/utils/reliability.ts`

**Changes:**
- Imported `RELIABILITY_THRESHOLDS`
- `getReliability()` function now uses centralized thresholds instead of literals

**Before:**
```ts
if (confidence >= 0.9 && uncertainty < 0.03) {
  return { label: "Reliable", badgeClass: "badge-success", rank: 3 };
}
if (confidence >= 0.7 && uncertainty <= 0.08) {
  return { label: "Review Recommended", badgeClass: "badge-warning", rank: 2 };
}
```

**After:**
```ts
if (
  confidence >= RELIABILITY_THRESHOLDS.reliable.minConfidence &&
  uncertainty < RELIABILITY_THRESHOLDS.reliable.maxUncertainty
) {
  return { label: "Reliable", badgeClass: "badge-success", rank: 3 };
}
if (
  confidence >= RELIABILITY_THRESHOLDS.reviewRecommended.minConfidence &&
  uncertainty <= RELIABILITY_THRESHOLDS.reviewRecommended.maxUncertainty
) {
  return { label: "Review Recommended", badgeClass: "badge-warning", rank: 2 };
}
```

---

### 4. Removed Impetigo Disease

**Locations:**
- `frontend/prisma/schema.prisma` — Removed `IMPETIGO` from `Disease` enum
- `frontend/constants/diseases.ts` — Removed from `DiseaseValue`, `DiseaseDisplayName`, and `DISEASES` metadata array

**Why:**
- Impetigo is no longer part of the supported disease ontology
- Ensures consistency across schema, types, and UI constants

---

### 5. Standardized Disease Filter Options

**Location:** `frontend/constants/diseases.ts`

**Added:** `DISEASE_SELECT_OPTIONS` constant providing a consistent list of `{ value, label }` pairs for select dropdowns.

**Why:**
- Replaces redundant `useMemo` computations that iterated over data to build unique disease lists
- Ensures all disease dropdowns show the same options in the same order
- Reduces runtime computation to static import

---

### 6. Updated Data Tables to Use Static Options

**Locations:**
- `frontend/components/clinicians/healthcare-reports-page/data-table.tsx`
- `frontend/components/clinicians/pending-diagnoses-page/data-table.tsx`

**Before:**
```tsx
const uniqueDiseases = useMemo(() => {
  const diseases = new Set<string>();
  (data as DiagnosisRow[]).forEach((item) => {
    if (item.disease) diseases.add(item.disease);
  });
  return Array.from(diseases).sort();
}, [data]);

<SelectItem value="__all__">All Diseases</SelectItem>
{uniqueDiseases.map((disease) => (
  <SelectItem key={disease} value={disease}>{disease}</SelectItem>
))}
```

**After:**
```tsx
import { DISEASE_SELECT_OPTIONS } from "@/constants/diseases";

{DISEASE_SELECT_OPTIONS.map((disease) => (
  <SelectItem key={disease.value} value={disease.value}>
    {disease.label}
  </SelectItem>
))}
```

**Also fixed:** Changed `"__all__"` sentinel value to `"all"` for consistency.

---

### 7. Enhanced Verification Dashboard Statistics

**Location:** `frontend/components/clinicians/healthcare-reports-page/verifications-content.tsx`

**Before:** Dashboard cards showed placeholder values:
```tsx
<div className="stat-value text-success">—</div>
<div className="stat-desc">Since last session</div>
```

**After:** Real data from database:
```tsx
const [
  { success: diagnoses, error: diagnosesError },
  { success: count, error: countError },
  { success: verifiedTodayCount, error: verifiedTodayError },
  { success: lowReliabilityCount, error: lowReliabilityError },
] = await Promise.all([
  getPendingDiagnoses({}),
  getPendingDiagnosesCount(),
  getVerifiedTodayCount(startOfDay, endOfDay),
  getLowReliabilityPendingCount(),
]);
```

**UI changes:**
- Replaced DaisyUI `stats` components with `Card` components for consistency
- Added `CheckCircle` icon for "Verified Today" card with `text-emerald-500`
- Changed `text-error` to `text-destructive` for theming consistency
- Added `hover:shadow-md transition-shadow` for interactive feel

---

### 8. New Diagnosis Utility Functions

**Location:** `frontend/utils/diagnosis.ts`

**Added:**

#### `getVerifiedTodayCount(startOfDay, endOfDay)`
Queries the database for diagnoses with `status: "VERIFIED"` within the given date range. Returns `{ success: count }` or `{ error: string }`.

#### `getLowReliabilityPendingCount()`
Fetches all pending diagnoses and counts those that don't meet the "Reliable" threshold (confidence < 0.9 OR uncertainty >= 0.03). Returns `{ success: count }` or `{ error: string }`.

**Why:**
- Provides real data for the dashboard summary cards
- Uses the same `RELIABILITY_THRESHOLDS` constant for consistency with the rest of the system

---

### 9. Cleaned Up OpenCode Config

**Location:** `opencode.json`

**Removed:** `notebooklm` MCP configuration block.

**Why:**
- No longer needed for the current workflow
- Simplifies the configuration

---

## UI/UX Improvements

- **Verification dashboard cards** now display real counts instead of placeholders
- **Card styling** upgraded from `stats` to `Card` components with hover effects
- **Disease filter dropdowns** are now consistent across all tables
- **"All Diseases" option** uses cleaner `"all"` value instead of `"__all__"`

---

## Technical Notes

- The `RELIABILITY_THRESHOLDS` constant uses `as const` for readonly inference, enabling better type narrowing
- `getLowReliabilityPendingCount()` fetches all pending diagnoses and evaluates in-memory rather than using a database aggregation query. This is acceptable for current data volumes but could be optimized with a raw SQL query if needed
- The `verifiedAt` field query uses `as any` casting due to Prisma schema type limitations — ensure the field exists in the schema
- Disease filter change from `"__all__"` to `"all"` is a breaking change for any code that still references the old sentinel value

---

## Testing Checklist

- [ ] Run `npx tsc --noEmit` in `frontend/` to verify type correctness
- [ ] Verify diagnosis reliability badges display correctly for all threshold combinations
- [ ] Test disease filter dropdown in healthcare reports page
- [ ] Test disease filter dropdown in pending diagnoses page
- [ ] Confirm "Verified Today" count updates after verifying a diagnosis
- [ ] Confirm "Requires Attention" count reflects low reliability pending cases
- [ ] Verify Impetigo no longer appears in any disease-related UI
- [ ] Run `npx prisma generate` to ensure schema changes are reflected
- [ ] Test that symptom submission still produces correct reliability classifications

---

## Related Changes

- This changelog is related to the 3-tier triage system documented in `CHANGELOG-3-tier-triage-system.md` which originally introduced the confidence/uncertainty classification logic
- The reliability threshold values (0.9/0.03 for Reliable, 0.7/0.08 for Review Recommended) should remain consistent with backend classification logic
