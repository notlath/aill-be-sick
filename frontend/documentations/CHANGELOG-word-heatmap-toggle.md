# Changelog: Word Heatmap Toggle Component

**Branch:** `main`  
**Date:** March 28, 2026  
**Status:** Uncommitted changes

---

## Summary

This changeset introduces a reusable `WordHeatmapToggle` component that displays AI model word importance heatmaps. The component was extracted from `insights-modal.tsx` and added to clinician-facing modals (`report-detail-modal.tsx` and `diagnosis-detail-modal.tsx`) to provide consistency across the application. Additionally, skeleton loaders in the anomaly map view were updated to use consistent DaisyUI styling.

---

## Problem Statement

1. **Inconsistent heatmap implementation**: The word importance heatmap toggle logic was duplicated across multiple modal components.
2. **Missing heatmap in clinician views**: Clinicians could not view the AI's word importance analysis when reviewing patient diagnoses in the healthcare reports or map detail modals.
3. **Inconsistent skeleton loader styling**: The anomaly summary and top critical anomalies skeleton loaders used different styling approaches compared to other skeleton loaders in the application.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/components/shared/word-heatmap-toggle.tsx` | New | Reusable WordHeatmapToggle component |
| `frontend/components/patient/diagnosis-page/insights-modal.tsx` | Modified | Refactored to use WordHeatmapToggle |
| `frontend/components/clinicians/healthcare-reports-page/report-detail-modal.tsx` | Modified | Added WordHeatmapToggle |
| `frontend/components/clinicians/map-page/diagnosis-detail-modal.tsx` | Modified | Added WordHeatmapToggle |
| `frontend/components/clinicians/map-page/by-anomaly/skeleton-loaders.tsx` | Modified | Fixed AnomalySummarySkeleton styling |
| `frontend/components/clinicians/map-page/by-anomaly/by-anomaly-tab.tsx` | Modified | Fixed TopCriticalAnomalies skeleton |

---

## Detailed Changes

### 1. New WordHeatmapToggle Component

**Location:** `frontend/components/shared/word-heatmap-toggle.tsx`

**Description:**
Created a new reusable component that displays:
- A collapsible toggle button ("View/Hide Technical AI Data")
- Word importance heat map with tokens highlighted by importance level
- Importance scale legend (Low → Medium → High)
- Loading and empty states

**Key implementation:**
```tsx
type WordHeatmapToggleProps = {
  processedTokens: TokenWithImportance[];
  isDark: boolean;
  isLoading?: boolean;
};

export function WordHeatmapToggle({ processedTokens, isDark, isLoading = false }) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  // ... renders toggle, heat map, and legend
}
```

**Why:** Eliminates code duplication and provides consistent UX across all diagnosis detail views.

---

### 2. Insights Modal Refactoring

**Location:** `frontend/components/patient/diagnosis-page/insights-modal.tsx`

**Changes:**
- Removed inline technical details toggle logic (~80 lines)
- Now imports and uses `WordHeatmapToggle` component
- Fixed indentation issues in the file

**Before:**
```tsx
const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
// ... ~80 lines of toggle logic
```

**After:**
```tsx
import { WordHeatmapToggle } from "@/components/shared/word-heatmap-toggle";
// ...
<WordHeatmapToggle processedTokens={processedTokens} isDark={isDark} />
```

---

### 3. Healthcare Reports Modal

**Location:** `frontend/components/clinicians/healthcare-reports-page/report-detail-modal.tsx`

**Changes:**
- Added imports: `useMemo`, `useTheme`, `processTokensForDisplay`, `TokenWithImportance`, `getExplanationByDiagnosisId`, `WordHeatmapToggle`
- Added state: `explanation`, `isLoadingExplanation`, `isDark`
- Added `useEffect` to fetch explanation by diagnosis ID
- Added `processedTokens` memo using `processTokensForDisplay`
- Added `<WordHeatmapToggle />` component after symptoms section

**Why:** Allows clinicians to view AI word importance analysis when reviewing patient reports.

---

### 4. Map Diagnosis Detail Modal

**Location:** `frontend/components/clinicians/map-page/diagnosis-detail-modal.tsx`

**Changes:**
- Same additions as healthcare reports modal
- Added `<WordHeatmapToggle />` component after symptoms section

**Why:** Allows clinicians to view AI word importance analysis when reviewing individual cases on the map.

---

### 5. Skeleton Loader Fixes

**Location:** `frontend/components/clinicians/map-page/by-anomaly/skeleton-loaders.tsx`

**Changes:**
- Removed background overlay `<div className="absolute inset-0 bg-base-100 opacity-90" />` from `AnomalySummarySkeleton`

**Before:**
```tsx
<Card className="relative overflow-hidden border">
  <div className="absolute inset-0 bg-base-100 opacity-90" />
  <CardHeader ...>
```

**After:**
```tsx
<Card className="relative overflow-hidden border">
  <CardHeader ...>
```

**Why:** The overlay made the skeleton loader appear different from other skeleton loaders in the application.

---

**Location:** `frontend/components/clinicians/map-page/by-anomaly/by-anomaly-tab.tsx`

**Changes:**
- Changed Top Critical Anomalies skeleton from `animate-pulse bg-base-200` to DaisyUI `skeleton` class

**Before:**
```tsx
<div className="animate-pulse bg-base-200 rounded-xl h-[400px]"></div>
```

**After:**
```tsx
<div className="skeleton h-[400px] w-full rounded-xl" />
```

**Why:** Uses consistent DaisyUI skeleton styling like other skeleton loaders in the application.

---

## UI/UX Improvements

- Added word importance heat map to clinician-facing diagnosis modals
- Consistent skeleton loader styling across anomaly dashboard
- Reusable component reduces code duplication

---

## Technical Notes

- The `WordHeatmapToggle` component accepts `processedTokens` (already processed via `processTokensForDisplay`), `isDark` (from `next-themes`), and optional `isLoading` prop
- Explanation data is fetched client-side using `getExplanationByDiagnosisId` from `@/utils/explanation`
- The component handles three states: loading, populated (with tokens), and empty

---

## Testing Checklist

- [ ] Test WordHeatmapToggle in healthcare reports modal
- [ ] Test WordHeatmapToggle in map diagnosis detail modal
- [ ] Test WordHeatmapToggle in patient insights modal
- [ ] Verify heat map displays correctly in light/dark mode
- [ ] Verify skeleton loaders display correctly in anomaly dashboard
- [ ] Verify loading state works for explanation fetching

---

## Related Changes

- Previous: CHANGELOG-diagnosis-ui-improvements.md
