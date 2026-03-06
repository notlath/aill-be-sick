# Illness Cluster — "View Patients" Modal Feature

## Overview

This document describes a feature added to the **Illness Clusters** tab of the map page (`map-container.tsx`). Clicking the **"View patients"** button on the Quick Profile card opens a DaisyUI modal containing a fully interactive patient table filtered to that cluster.

The table supports:
- **Searching** across all columns including the formatted location string
- **Filtering** by gender
- **Sorting** by name, age, gender, diagnosis, diagnosis date, or patient ID
- **Pagination** with configurable rows per page

---

## Files Created

### 1. `frontend/components/clinicians/map-page/patients-columns.tsx`

Defines the `@tanstack/react-table` column definitions for `IllnessRecord` rows.

**Columns defined:**
| Column | Key | Notes |
|---|---|---|
| Patient ID | `patient_id` | Sortable |
| Name | `patient_name` | Sortable |
| Age | `patient_age` | Sortable |
| Gender | `patient_gender` | Sortable + filterable (`equalsString`) |
| Location | `location` | Computed via `accessorFn` from `barangay + city + region`; custom `filterFn` for substring match |
| Diagnosis | `disease` | Sortable |
| Diagnosis Date | `diagnosed_at` | Sortable; formatted via `toLocaleDateString()` |

**Key patterns:**
- The `location` column uses `accessorFn` (not `accessorKey`) to combine multiple fields into one searchable string.
- A custom `filterFn` on the `location` column enables substring matching.

```tsx
{
  id: "location",
  accessorFn: (row) => [row.barangay, row.city, row.region].filter(Boolean).join(", "),
  filterFn: (row, columnId, filterValue) => {
    const value = row.getValue(columnId) as string;
    return value.toLowerCase().includes(filterValue.toLowerCase());
  },
  cell: ({ row }) => {
    const display = row.getValue("location") as string;
    return <div className="max-w-sm truncate" title={display || "—"}>{display || "—"}</div>;
  },
}
```

---

### 2. `frontend/components/clinicians/map-page/patients-data-table.tsx`

A self-contained client component wrapping `useReactTable` with search, sort, filter, and pagination UI.

**Key implementation details:**

- Uses a custom `globalFilterFn` to search across columns including the computed `location` column:

```tsx
globalFilterFn: (row, columnId, filterValue) => {
  const search = String(filterValue).toLowerCase();
  const value = row.getValue(columnId);
  if (value != null && String(value).toLowerCase().includes(search)) return true;

  if (columnId === "location") {
    const original = row.original as IllnessRecord;
    const locationString = [original.barangay, original.city, original.region]
      .filter(Boolean).join(", ").toLowerCase();
    if (locationString.includes(search)) return true;
  }
  return false;
},
```

> **Why this is needed:** TanStack Table's default `globalFilter` does not automatically reach into computed `accessorFn` columns. This custom function explicitly handles the `location` column case.

- Sort options are a static array driving the "Sort by..." dropdown:

```tsx
const sortOptions = [
  { value: "patient_name", label: "Name (A-Z)", desc: false },
  { value: "patient_name", label: "Name (Z-A)", desc: true },
  { value: "patient_age", label: "Age (Youngest)", desc: false },
  { value: "patient_age", label: "Age (Oldest)", desc: true },
  { value: "patient_gender", label: "Gender (A-Z)", desc: false },
  { value: "patient_gender", label: "Gender (Z-A)", desc: true },
  { value: "disease", label: "Diagnosis (A-Z)", desc: false },
  { value: "disease", label: "Diagnosis (Z-A)", desc: true },
  { value: "diagnosed_at", label: "Diagnosis Date (Oldest)", desc: false },
  { value: "diagnosed_at", label: "Diagnosis Date (Newest)", desc: true },
  { value: "patient_id", label: "ID (Low-High)", desc: false },
  { value: "patient_id", label: "ID (High-Low)", desc: true },
];
```

- The `SelectContent` dropdowns use `className="right-0 left-auto"` to right-align inside the modal without modifying the shared `select.tsx` component.

---

### 3. `frontend/components/clinicians/map-page/patients-modal.tsx`

A DaisyUI `<dialog>` modal wrapper around `PatientsDataTable`.

Props:
| Prop | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Called when modal is dismissed |
| `patients` | `IllnessRecord[]` | The pre-filtered list of patients for the cluster |
| `clusterDisplay` | `string` | Displayed in the modal title |

Key pattern — clicking the backdrop closes the modal, clicking inside does not:

```tsx
<dialog className="modal modal-open bg-black/50" onClick={onClose}>
  <div className="modal-box ..." onClick={(e) => e.stopPropagation()}>
    ...
  </div>
</dialog>
```

---

## Changes to `map-container.tsx`

### Dynamic import (Next.js best practice)

`PatientsModal` is dynamically imported with `{ ssr: false }` to avoid including `@tanstack/react-table` and DaisyUI modal code in the server bundle:

```tsx
import dynamic from "next/dynamic";
const PatientsModal = dynamic(() => import("./patients-modal"), { ssr: false });
```

### New state variable

```tsx
const [isPatientsModalOpen, setIsPatientsModalOpen] = useState(false);
```

### Filtered patients memo

Derives the patient list for the currently selected illness cluster. Note: the display index (1-based) maps to `illnessClusterOrder` to get the actual cluster ID used in the data:

```tsx
const selectedIllnessClusterPatients = useMemo(() => {
  if (!illnessClusterData || selectedTab !== "illness-cluster") return [];
  const selectedClusterIndex = Math.max(0, Number(selectedIllnessCluster) - 1);
  const selectedClusterId = illnessClusterOrder[selectedClusterIndex] ?? selectedClusterIndex;
  return illnessClusterData.illnesses.filter(
    (illness) => illness.cluster === selectedClusterId
  );
}, [illnessClusterData, selectedIllnessCluster, illnessClusterOrder, selectedTab]);
```

### "View patients" button

The Quick Profile header was changed from `flex items-center gap-2` to `flex items-center justify-between` to accommodate the new button on the right:

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: ... }} />
    <h3 className="card-title text-base">Cluster {n} Quick Profile</h3>
  </div>
  <button
    type="button"
    className="btn btn-sm btn-outline btn-primary"
    onClick={() => setIsPatientsModalOpen(true)}
  >
    View patients
  </button>
</div>
```

### Modal rendering

The modal is rendered outside the card at the bottom of the component's JSX, guarded by `selectedTab === "illness-cluster"`:

```tsx
{selectedTab === "illness-cluster" && (
  <PatientsModal
    isOpen={isPatientsModalOpen}
    onClose={() => setIsPatientsModalOpen(false)}
    patients={selectedIllnessClusterPatients}
    clusterDisplay={selectedIllnessClusterSummary?.displayCluster || selectedIllnessCluster}
  />
)}
```

---

## Dependencies

All dependencies were already present in the project:
- `@tanstack/react-table` — table state and rendering
- `lucide-react` — `Search`, `X`, `ArrowUpDown` icons
- DaisyUI — `modal`, `btn`, `table` classes
- `next/dynamic` — dynamic import for bundle optimization

---

## Checklist for Recreation

- [ ] Create `patients-columns.tsx` with `ColumnDef<IllnessRecord>[]` using `accessorFn` for location
- [ ] Create `patients-data-table.tsx` with custom `globalFilterFn` and sort options array
- [ ] Create `patients-modal.tsx` as a DaisyUI dialog wrapping the data table
- [ ] In `map-container.tsx`:
  - [ ] Dynamic import `PatientsModal` with `{ ssr: false }`
  - [ ] Add `isPatientsModalOpen` state
  - [ ] Add `selectedIllnessClusterPatients` memo
  - [ ] Add "View patients" button in the illness cluster Quick Profile header
  - [ ] Render `<PatientsModal>` at the bottom, guarded by `selectedTab === "illness-cluster"`
