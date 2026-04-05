# Changelog: Map Page Detail Modals & Dark Mode Support

**Branch:** `main`  
**Date:** April 5, 2026  
**Status:** Uncommitted changes

---

## Summary

This changeset adds "View Details" action buttons to all map page data tables (anomalies, patients, cluster patients, feature patients), enabling clinicians to view full diagnosis details via reusable detail modals. Introduces three new detail modal components that reuse the existing `ReportDetailModal` from healthcare reports. Adds dark mode support to choropleth legends and fixes the anomaly data loading state initialization.

---

## Problem Statement

1. **No drill-down from map tables** — Clinicians could see summary rows in anomaly/patient tables but had no way to view full diagnosis details (symptoms, notes, overrides, verification status) without navigating away from the map.
2. **Inconsistent modal naming** — Used `DiagnosisDetailModal` in some places but the component was actually `PatientDetailModal`, causing confusion and import errors.
3. **Legend readability in dark mode** — Choropleth legends used hardcoded light-theme colors (white backgrounds, black text), making them unreadable when the app switched to dark theme.
4. **Anomaly data loading state** — `useAnomalyData` hook initialized `loading` as `false`, causing a flash of empty state before data fetched on first render.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/components/clinicians/map-page/by-anomaly/anomaly-data-table.tsx` | Modified | Added actions column with ExternalLink button, integrated AnomalyDetailModal via portal |
| `frontend/components/clinicians/map-page/by-anomaly/anomaly-summary.tsx` | Modified | Removed unused imports (`TrendingDown`, `Gauge`, `getAnomalyLevelLabel`, `getAnomalyLevelBadgeClass`) |
| `frontend/components/clinicians/map-page/by-anomaly/anomaly-detail-modal.tsx` | **New** | Detail modal for surveillance anomalies, fetches diagnosis via `getDiagnosisById` |
| `frontend/components/clinicians/map-page/by-cluster/selected-cluster-details.tsx` | Modified | Renamed `DiagnosisDetailModal` → `PatientDetailModal` |
| `frontend/components/clinicians/map-page/map/choropleth-legend.tsx` | Modified | Added dark mode support via `useTheme()`, dynamic backgrounds/colors |
| `frontend/components/clinicians/map-page/map/cluster-choropleth-legend.tsx` | Modified | Added dark mode support via `useTheme()`, dynamic backgrounds/colors |
| `frontend/components/clinicians/map-page/map/feature-patients-columns.tsx` | Modified | Added actions column with ExternalLink button |
| `frontend/components/clinicians/map-page/map/feature-patients-data-table.tsx` | Modified | Added `onRowClick` prop, wired to table meta |
| `frontend/components/clinicians/map-page/map/feature-patients-modal.tsx` | Modified | Integrated FeaturePatientDetailModal, added portal rendering |
| `frontend/components/clinicians/map-page/map/feature-patient-detail-modal.tsx` | **New** | Detail modal for map feature patients, transforms Diagnosis to DiagnosisRow format |
| `frontend/components/clinicians/map-page/patients-columns.tsx` | Modified | Added actions column with ExternalLink button |
| `frontend/components/clinicians/map-page/patients-data-table.tsx` | Modified | Added `onRowClick` prop, wired to table meta |
| `frontend/components/clinicians/map-page/patients-modal.tsx` | Modified | Renamed `DiagnosisDetailModal` → `PatientDetailModal` |
| `frontend/components/clinicians/map-page/patient-detail-modal.tsx` | **New** | Detail modal for illness records, fetches diagnosis via `getDiagnosisById` |
| `frontend/hooks/map-hooks/use-anomaly-data.ts` | Modified | Changed initial `loading` state from `false` → `true` |
| `frontend/utils/diagnosis.ts` | Modified | Added `getDiagnosisById()` utility function |

---

## Detailed Changes

### 1. New Detail Modal Components

**Location:** Three new files created

#### AnomalyDetailModal
**File:** `frontend/components/clinicians/map-page/by-anomaly/anomaly-detail-modal.tsx`

```tsx
interface AnomalyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaly: SurveillanceAnomaly | null;
}

export function AnomalyDetailModal({ isOpen, onClose, anomaly }) {
  const [diagnosis, setDiagnosis] = useState<DiagnosisRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!isOpen || !anomaly) return;
    getDiagnosisById(anomaly.id).then((result) => {
      // Handle success/error states
    });
  }, [isOpen, anomaly?.id]);
  
  // Renders ReportDetailModal with fetched diagnosis data
}
```

**Why:** Allows clinicians to click the ExternalLink button in anomaly tables and see full diagnosis details including symptoms, clinician notes, and override history without leaving the map view.

#### PatientDetailModal
**File:** `frontend/components/clinicians/map-page/patient-detail-modal.tsx`

Same pattern as `AnomalyDetailModal` but accepts `IllnessRecord` instead of `SurveillanceAnomaly`. Fetches full diagnosis data via `getDiagnosisById(diagnosis.id)`.

**Why:** Provides consistent detail view for patient records shown in cluster-based patient tables.

#### FeaturePatientDetailModal
**File:** `frontend/components/clinicians/map-page/map/feature-patient-detail-modal.tsx`

```tsx
export function FeaturePatientDetailModal({ isOpen, onClose, diagnosis }) {
  const [report, setReport] = useState<DiagnosisRow | null>(null);
  
  useEffect(() => {
    if (!isOpen || !diagnosis) {
      setReport(null);
      return;
    }
    // Transform Diagnosis → DiagnosisRow format
    setReport({
      id: diagnosis.id,
      disease: diagnosis.disease,
      confidence: diagnosis.confidence,
      // ... other fields
    });
  }, [isOpen, diagnosis]);
  
  return <ReportDetailModal isOpen={isOpen} onClose={onClose} report={report} />;
}
```

**Why:** Handles the case where the diagnosis object is already available (from map feature click) and doesn't need a separate fetch. Transforms the Prisma `Diagnosis` model to the `DiagnosisRow` format expected by `ReportDetailModal`.

---

### 2. Actions Column in Data Tables

**Location:** Multiple table column definition files

**Before (no actions column):**
```tsx
export const anomalyColumns: ColumnDef<SurveillanceAnomaly>[] = [
  { accessorKey: "user_name", header: "Patient Name", ... },
  { accessorKey: "disease", header: "Diagnosis", ... },
  { accessorKey: "reason", header: "Reason Flags", ... },
  // No way to view details
];
```

**After (actions column added):**
```tsx
import { ExternalLink } from "lucide-react";

export const anomalyColumns: ColumnDef<SurveillanceAnomaly>[] = [
  // ... existing columns
  {
    id: "actions",
    cell: ({ row, table }) => (
      <div className="flex items-center justify-end z-10 relative">
        <button
          onClick={() => (table.options.meta as any)?.openAnomalyModal?.(row.original)}
          className="btn btn-ghost btn-sm tooltip"
          data-tip="View Details"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    ),
  },
];
```

**Why:** Provides a consistent, accessible action button in every row. Uses `z-10 relative` to ensure the button renders above other table elements. The `tooltip` data-tip attribute leverages DaisyUI's built-in tooltip system.

**Tables updated:**
- `anomalyColumns` (anomaly data table)
- `normalColumns` (normal records table)
- `featurePatientsColumns` (map feature patients)
- `columns` (cluster patients)

---

### 3. Table Meta Integration for Row Clicks

**Location:** Data table components

**Before:**
```tsx
export function PatientsDataTable({ columns, data }) {
  const table = useReactTable({
    columns,
    data,
    // No meta
  });
}
```

**After:**
```tsx
export function PatientsDataTable({ columns, data, onRowClick }) {
  const table = useReactTable({
    columns,
    data,
    meta: {
      openPatientDetail: (row: any) => {
        onRowClick?.(row);
      },
    },
  });
}
```

**Why:** Bridges the gap between column definition cell actions and the parent component's state management. The column cell calls `table.options.meta?.openPatientDetail(row)`, which triggers the parent's `onRowClick` callback, which opens the detail modal.

---

### 4. Portal Rendering for Modals

**Location:** Modal components

**Before:**
```tsx
export default function PatientsModal({ isOpen, onClose, illnesses }) {
  if (!isOpen) return null;
  
  return (
    <dialog ref={dialogRef} className="modal" onClick={onClose}>
      {/* Modal content */}
    </dialog>
  );
}
```

**After:**
```tsx
import { createPortal } from "react-dom";

export default function PatientsModal({ isOpen, onClose, illnesses }) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted || !isOpen) return null;
  
  const modalContent = (
    <>
      <dialog ref={dialogRef} className="modal" onClick={onClose}>
        {/* Modal content */}
      </dialog>
      {selectedDiagnosis && (
        <PatientDetailModal isOpen={isDetailModalOpen} onClose={...} diagnosis={selectedDiagnosis} />
      )}
    </>
  );
  
  return createPortal(modalContent, document.body);
}
```

**Why:** `createPortal` ensures modals render at the document body level, avoiding z-index stacking context issues with parent containers. The `isMounted` state prevents hydration mismatches in Next.js (SSR vs client rendering).

---

### 5. Dark Mode Support for Choropleth Legends

**Location:** `choropleth-legend.tsx`, `cluster-choropleth-legend.tsx`

**Before (light mode only):**
```tsx
div.style.background = "rgba(255, 255, 255, 0.75)";
div.innerHTML += `<h4 style="color: #000000;">${diseaseName} ${label}</h4>`;
// Border: rgba(0,0,0,0.2)
// Text: #1a1a1a
```

**After (theme-aware):**
```tsx
import { useTheme } from "next-themes";

const { resolvedTheme } = useTheme();
const isDark = resolvedTheme === "dark";

div.style.background = isDark 
  ? "rgba(30, 30, 30, 0.85)" 
  : "rgba(255, 255, 255, 0.75)";
div.style.color = isDark ? "#e5e5e5" : "#1a1a1a";
div.innerHTML += `<h4 style="color: ${isDark ? '#ffffff' : '#000000'};">${title}</h4>`;
// Border: isDark ? rgba(255,255,255,0.2) : rgba(0,0,0,0.2)
```

**Why:** Legends were unreadable in dark mode (white text on white background). Now adapts to theme changes with appropriate contrast ratios. Added `isDark` to the `useEffect` dependency array to rebuild the legend when theme changes.

---

### 6. New `getDiagnosisById` Utility

**Location:** `frontend/utils/diagnosis.ts`

```typescript
export const getDiagnosisById = async (diagnosisId: number) => {
  try {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { id: diagnosisId },
      include: {
        user: true,
        override: {
          select: {
            clinicianDisease: true,
            clinicianNotes: true,
            createdAt: true,
          },
        },
        notes: {
          include: {
            clinician: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return { success: diagnosis };
  } catch (error) {
    console.error(`Error fetching diagnosis ${diagnosisId}:`, error);
    return { error: `Could not fetch diagnosis ${diagnosisId}` };
  }
};
```

**Why:** Centralizes diagnosis fetching logic with all necessary relations (user, override, notes with clinician info). Used by both `AnomalyDetailModal` and `PatientDetailModal` to fetch complete diagnosis data for the detail view.

---

### 7. Removed Anomaly Score Column

**Location:** `anomaly-data-table.tsx`

**Before:**
```tsx
{
  accessorKey: "anomaly_score",
  header: ({ column }) => (
    <button onClick={() => column.toggleSorting(...)}>
      Anomaly Level <ArrowUpDown />
    </button>
  ),
  cell: ({ row }) => {
    const score = row.getValue("anomaly_score") as number;
    const label = getAnomalyLevelLabel(score);
    const badgeClass = getAnomalyLevelBadgeClass(score);
    return <span className={`badge ${badgeClass}`}>{label}</span>;
  },
}
```

**After:** Column removed entirely. Sort options for anomaly score also removed from `sortOptions` array.

**Why:** The anomaly score column was redundant with the anomaly level badge already shown elsewhere. Removing it simplifies the table and makes room for the new actions column.

---

### 8. Fixed Loading State Initialization

**Location:** `frontend/hooks/map-hooks/use-anomaly-data.ts`

**Before:**
```tsx
const [loading, setLoading] = useState(false);
```

**After:**
```tsx
const [loading, setLoading] = useState(true);
```

**Why:** The hook fetches data on mount, so the initial state should reflect that loading is in progress. Starting with `false` caused a brief flash of the "no data" state before the fetch completed.

---

## UI/UX Improvements

- **View Details buttons** — Every row in anomaly/patient tables now has an ExternalLink button to view full diagnosis details
- **Consistent modal experience** — All detail modals reuse `ReportDetailModal` from healthcare reports for a uniform look and feel
- **Dark mode legends** — Map choropleth legends now adapt to light/dark themes with proper contrast
- **Loading state fix** — No more flash of empty state when anomaly data is loading
- **Portal rendering** — Modals render at body level to avoid z-index issues
- **Skeleton loading states** — Detail modals show skeleton placeholders while fetching data

---

## Technical Notes

- **Modal naming consistency** — Renamed all references from `DiagnosisDetailModal` to `PatientDetailModal` to match the actual component name and avoid confusion
- **React Portal usage** — All parent modals (`PatientsModal`, `FeaturePatientsModal`, `AnomalyDataTable`) now use `createPortal(modalContent, document.body)` to ensure proper z-index stacking
- **Hydration safety** — Added `isMounted` state checks before rendering portals to prevent Next.js hydration mismatches
- **Table meta pattern** — Uses TanStack Table's `meta` option to pass callbacks from column definitions to parent components, avoiding prop drilling through the table component
- **Dependency arrays** — Added `isDark` to legend `useEffect` dependencies so legends rebuild when theme changes
- **Unused import cleanup** — Removed `TrendingDown`, `Gauge`, `getAnomalyLevelLabel`, `getAnomalyLevelBadgeClass` from `anomaly-summary.tsx` after the anomaly score column was removed

---

## Testing Checklist

- [ ] Click "View Details" button on anomaly table row → detail modal opens with correct diagnosis data
- [ ] Click "View Details" button on patient table row → detail modal opens with correct diagnosis data
- [ ] Click "View Details" on cluster patients table → PatientDetailModal opens (not DiagnosisDetailModal)
- [ ] Click "View Details" on map feature patients → FeaturePatientDetailModal opens with correct data
- [ ] Switch theme to dark mode → choropleth legend background becomes dark, text becomes light
- [ ] Switch theme back to light mode → legend reverts to light styling
- [ ] Load map page → no flash of empty anomaly table (loading state should be true initially)
- [ ] Close detail modal → modal closes cleanly, no z-index issues
- [ ] Verify detail modal shows skeleton while loading diagnosis data
- [ ] Verify detail modal shows error alert if diagnosis fetch fails
- [ ] Run `npx tsc --noEmit` in `frontend/` → no type errors
- [ ] Verify no console errors related to portal rendering or hydration mismatches

---

## Related Changes

- Reuses `ReportDetailModal` from `frontend/components/clinicians/healthcare-reports-page/report-detail-modal.tsx`
- Depends on `getDiagnosisById()` utility added in this changeset
- Follows the same modal portal pattern established in previous diagnosis UI improvements (see `CHANGELOG-diagnosis-ui-improvements.md`)
- Part of ongoing map page enhancements for clinician surveillance dashboard
