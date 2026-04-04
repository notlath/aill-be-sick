# Changelog: Preserve `isValid` in Diagnosis Database Model

**Branch:** `main`
**Date:** April 5, 2026
**Status:** Uncommitted changes

---

## Summary

This changeset adds the `isValid` boolean field to the `Diagnosis` database model, ensuring the AI's confidence assessment state is preserved when temporary diagnoses are promoted to permanent records. This fixes a bug where the Clinical Support Summary component would switch from the "Unable to reach confident diagnosis" warning to the "Low model confidence" warning after page reload or history view.

---

## Problem Statement

1. **Data loss during auto-record**: The `TempDiagnosis` model had an `isValid` field, but the `Diagnosis` model did not. When `autoRecordDiagnosis` promoted a temp diagnosis to a permanent one, the `isValid` value was silently dropped.

2. **Inconsistent UI warnings**: After a diagnosis was recorded and the page reloaded, the `CDSSSummary` component received `isValid: undefined` instead of the original `false` value. This caused the warning to switch from the red "Unable to reach confident diagnosis" banner to the yellow "Low model confidence" banner, creating confusion about the AI's assessment state.

3. **Incomplete inconclusive tracking**: Inconclusive diagnoses (where `is_valid: false` from the backend) lost their assessment state in the permanent record, making it impossible for the history view to accurately reflect whether the AI reached a confident prediction.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/prisma/schema.prisma` | Modified | Added `isValid Boolean @default(true)` to `Diagnosis` model |
| `frontend/actions/auto-record-diagnosis.ts` | Modified | Copy `isValid` from `TempDiagnosis` when creating permanent `Diagnosis` |
| `frontend/components/patient/diagnosis-page/chat-history-view.tsx` | Modified | Added `dbIsValid` prop, pass to `CDSSSummary` |
| `frontend/app/(app)/(patient)/diagnosis/[chatId]/page.tsx` | Modified | Pass `dbIsValid` from database to `ChatHistoryView` |

---

## Detailed Changes

### 1. Add `isValid` Field to Diagnosis Model

**Location:** `frontend/prisma/schema.prisma:124`

**Change:**
```prisma
model Diagnosis {
  // ... existing fields ...
  cdss            Json?
  isValid         Boolean            @default(true)  // NEW
  bmiAdvice       String?
  // ... remaining fields ...
}
```

**Why:**
- Mirrors the `isValid` field that already exists in `TempDiagnosis` (line 100)
- Ensures the AI's confidence assessment state is preserved in the permanent record
- Default value of `true` maintains backward compatibility for existing diagnoses

---

### 2. Copy `isValid` During Auto-Record

**Location:** `frontend/actions/auto-record-diagnosis.ts:84`

**Before:**
```typescript
const diagnosis = await prisma.diagnosis.create({
  data: {
    confidence: tempDiagnosis.confidence,
    uncertainty: tempDiagnosis.uncertainty,
    modelUsed: tempDiagnosis.modelUsed,
    disease: tempDiagnosis.disease,
    chatId,
    symptoms: tempDiagnosis.symptoms,
    cdss: (tempDiagnosis as any).cdss ?? undefined,
    userId: dbUser.id,
    // ... location fields ...
  },
});
```

**After:**
```typescript
const diagnosis = await prisma.diagnosis.create({
  data: {
    confidence: tempDiagnosis.confidence,
    uncertainty: tempDiagnosis.uncertainty,
    modelUsed: tempDiagnosis.modelUsed,
    disease: tempDiagnosis.disease,
    chatId,
    symptoms: tempDiagnosis.symptoms,
    cdss: (tempDiagnosis as any).cdss ?? undefined,
    isValid: tempDiagnosis.isValid,  // NEW
    userId: dbUser.id,
    // ... location fields ...
  },
});
```

**Why:**
- Preserves the AI's `is_valid` assessment from the follow-up API response
- Prevents data loss when promoting `TempDiagnosis` → `Diagnosis`
- Ensures `CDSSSummary` receives the correct `isValid` value after page reload

---

### 3. Pass `isValid` to History View

**Location:** `frontend/components/patient/diagnosis-page/chat-history-view.tsx`

**Changes:**
- Added `dbIsValid?: boolean | null` to props type (line 17)
- Destructured `dbIsValid` from component props (line 47)
- Passed `isValid={dbIsValid ?? undefined}` to `CDSSSummary` (line 79)

**Before:**
```tsx
<CDSSSummary
  cdss={dbCdss}
  confidence={dbConfidence ?? undefined}
  uncertainty={dbUncertainty ?? undefined}
/>
```

**After:**
```tsx
<CDSSSummary
  cdss={dbCdss}
  confidence={dbConfidence ?? undefined}
  uncertainty={dbUncertainty ?? undefined}
  isValid={dbIsValid ?? undefined}
/>
```

**Why:**
- `CDSSSummary` uses `isValid` to determine which warning banner to show
- Without this prop, `isValid` is `undefined`, causing the wrong warning to display
- Completes the data flow from database → page → component

---

### 4. Pass `isValid` from Page to History View

**Location:** `frontend/app/(app)/(patient)/diagnosis/[chatId]/page.tsx:116`

**Before:**
```tsx
<ChatHistoryView
  // ... other props ...
  dbCdss={(diagnosis as any)?.cdss ?? null}
  dbConfidence={diagnosis?.confidence ?? null}
  dbUncertainty={diagnosis?.uncertainty ?? null}
  diagnosisId={diagnosis?.id}
/>
```

**After:**
```tsx
<ChatHistoryView
  // ... other props ...
  dbCdss={(diagnosis as any)?.cdss ?? null}
  dbConfidence={diagnosis?.confidence ?? null}
  dbUncertainty={diagnosis?.uncertainty ?? null}
  dbIsValid={diagnosis?.isValid ?? null}
  diagnosisId={diagnosis?.id}
/>
```

**Why:**
- Extracts `isValid` from the database diagnosis record
- Passes it down to `ChatHistoryView` → `CDSSSummary`
- Completes the full data pipeline

---

## UI/UX Improvements

| Improvement | Description |
|-------------|-------------|
| **Consistent warnings** | The correct warning banner (red vs yellow) persists across page reloads |
| **Accurate inconclusive display** | Inconclusive diagnoses properly show "Unable to reach confident diagnosis" in history view |
| **Complete data preservation** | AI assessment state is no longer lost during auto-record |

---

## Technical Notes

### Root Cause

The `TempDiagnosis` model had `isValid Boolean @default(true)` but the `Diagnosis` model did not. This created a data loss gap:

```
Follow-up API → is_valid: false
  ↓
TempDiagnosis.isValid = false  ✓
  ↓
Auto-record → Diagnosis (no isValid field)  ✗ DATA LOST
  ↓
Page reload → isValid: undefined  ✗ WRONG WARNING SHOWN
```

### Warning Logic in CDSSSummary

The `CDSSSummary` component uses `isValid` to determine which warning to display:

```typescript
const isUnableToDiagnose = isValid === false;
const isUncertain =
  isUnableToDiagnose ||
  (typeof confidence === "number" && confidence < 0.95) ||
  (typeof uncertainty === "number" && uncertainty > 0.05);
```

- **Red warning** ("Unable to reach confident diagnosis"): Shown when `isValid === false`
- **Yellow warning** ("Low model confidence"): Shown when `isValid !== false` but confidence/uncertainty thresholds are not met

Without `isValid`, the component fell through to the yellow warning even for cases that should show the red warning.

### Migration Behavior

The Prisma migration (`add_is_valid_to_diagnosis`) will:
1. Add a new `isValid` column to the `Diagnosis` table
2. Set default value to `true` for all existing records
3. Create a migration file in `prisma/migrations/`

**Note:** Existing diagnoses that were originally recorded with `is_valid: false` will have `isValid: true` after migration (the default). This is acceptable because:
- The old records already lost this data — there's no way to recover the original value
- Going forward, new diagnoses will correctly preserve `isValid`
- If backfilling is needed, it can be calculated from `confidence >= 0.70 AND uncertainty <= 0.05`

### Database Schema Alignment

After this change, both diagnosis models have the `isValid` field:

| Model | Field | Purpose |
|-------|-------|---------|
| `TempDiagnosis` | `isValid Boolean @default(true)` | Stores AI assessment during active follow-up flow |
| `Diagnosis` | `isValid Boolean @default(true)` | Preserves AI assessment in permanent record |

---

## Testing Checklist

- [ ] Run `bunx prisma migrate dev --name add_is_valid_to_diagnosis` successfully
- [ ] Submit symptoms that result in `is_valid: false` (high confidence but high uncertainty)
- [ ] Verify red warning ("Unable to reach confident diagnosis") appears during follow-up
- [ ] Verify auto-record creates `Diagnosis` with `isValid: false` in database
- [ ] Reload page and confirm red warning persists (does not switch to yellow)
- [ ] Check history view shows correct warning for inconclusive diagnoses
- [ ] Verify `isValid: true` diagnoses show no warning (or yellow warning if below thresholds)
- [ ] Run `bunx tsc --noEmit` to verify no TypeScript errors
- [ ] Check clinician inconclusive tab displays diagnoses with correct assessment state

---

## Related Changes

- **Auto-record all diagnoses**: `CHANGELOG-auto-record-all-diagnoses.md` — established the auto-record flow that this fix builds upon
- **Inconclusive diagnosis support**: The inconclusive feature relies on `isValid` to distinguish between confident and uncertain AI predictions
- **CDSS triage UX improvements**: `CHANGELOG-cdss-triage-ux-improvements.md` — established the warning banner system that this fix preserves
