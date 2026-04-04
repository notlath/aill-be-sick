# Changelog: Diagnosis Status Badge in History

**Branch:** `main`  
**Date:** April 4, 2026  
**Status:** Uncommitted changes

---

## Summary

This changeset adds a diagnosis status badge to the patient history page, displaying the review status (Pending Review, Verified, Reviewed) for each diagnosis entry. The status is now visible in both the data table and PDF export, with proper sorting and filtering support.

---

## Problem Statement

1. **Missing status visibility**: Patients couldn't see whether their AI-generated diagnoses had been reviewed or verified by clinicians.
2. **Incomplete history information**: The diagnosis status field existed in the database but wasn't displayed in the history UI.
3. **PDF export gaps**: The status information wasn't included in exported PDF reports.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/app/(app)/(patient)/history/page.tsx` | Modified | Extract diagnosis status from database, add to PDF export, update skeleton loading |
| `frontend/app/layout.tsx` | Modified | Commented out development-only react-grab script |
| `frontend/components/patient/history-page/columns.tsx` | Modified | Added status column with sortable header and badge rendering |
| `frontend/components/patient/history-page/data-table.tsx` | Modified | Added status badge to mobile card view and sort options |

---

## Detailed Changes

### 1. Extract Diagnosis Status (`history/page.tsx`)

**Location:** `frontend/app/(app)/(patient)/history/page.tsx:38-115`

**Changes:**
- Added `diagnosisStatus` variable extraction from `chat.diagnosis.status`
- Included status in `HistoryRow` type transformation
- Added status column to PDF export schema
- Updated skeleton loading to show additional badge placeholder

**Before:**
```tsx
const rows: HistoryRow[] = chats.map((chat) => {
  let diagnosis = "";
  let uncertainty: number | null = null;
  let confidence: number | null = null;
  // ... no status extraction
```

**After:**
```tsx
const rows: HistoryRow[] = chats.map((chat) => {
  let diagnosis = "";
  let diagnosisStatus: string | null = null;
  let uncertainty: number | null = null;
  let confidence: number | null = null;
  // ...
  diagnosisStatus = chat.diagnosis.status;
```

**PDF Export Update:**
```tsx
const pdfColumns: PdfColumn[] = [
  { header: "Suggested Condition", dataKey: "diagnosis" },
  { header: "Status", dataKey: "status" },  // NEW
  { header: "Reliability", dataKey: "reliability" },
  { header: "Date", dataKey: "createdAt" },
];

const exportData = rows.map((row) => ({
  diagnosis: row.diagnosis,
  status: row.diagnosisStatus || "N/A",  // NEW
  reliability: row.reliabilityLabel || "-",
  createdAt: new Date(row.createdAt),
}));
```

**Why:**
- Makes the diagnosis status available throughout the history page component
- Ensures PDF exports include status information for record-keeping
- Updates skeleton loading to match the new UI structure

---

### 2. Add Status Column to Table (`columns.tsx`)

**Location:** `frontend/components/patient/history-page/columns.tsx:8-180`

**Changes:**
- Added `diagnosisStatus` field to `HistoryRow` type definition
- Created new status column with sortable header
- Implemented badge rendering with status-specific colors
- Added `getStatusConfig` helper function for status-to-badge mapping

**Implementation:**
```tsx
export type HistoryRow = {
  id: string; // chatId
  diagnosis: string;
  diagnosisStatus: string | null;  // NEW
  reliabilityLabel: string | null;
  // ...
};

// New column definition:
{
  accessorKey: "diagnosisStatus",
  header: ({ column }) => {
    return (
      <button
        className="flex items-center gap-1 hover:text-primary"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ArrowUpDown className="w-4 h-4" />
      </button>
    );
  },
  cell: ({ row }) => {
    const status = row.getValue("diagnosisStatus") as string | null;

    if (!status) {
      return <span className="text-muted">—</span>;
    }

    const statusConfig = getStatusConfig(status);

    return (
      <span className={`badge ${statusConfig.badgeClass} badge-sm whitespace-nowrap`}>
        {statusConfig.label}
      </span>
    );
  },
}
```

**Status Badge Configuration:**
```tsx
function getStatusConfig(status: string) {
  switch (status) {
    case "PENDING":
      return { label: "Pending Review", badgeClass: "badge-warning" };
    case "VERIFIED":
      return { label: "Verified", badgeClass: "badge-success" };
    case "REJECTED":
      return { label: "Reviewed", badgeClass: "badge-error" };
    case "INCONCLUSIVE":
      return { label: "Pending Review", badgeClass: "badge-warning" };
    default:
      return { label: status, badgeClass: "badge-ghost" };
  }
}
```

**Why:**
- Provides visual indication of diagnosis review status
- Uses DaisyUI badge components with semantic colors (warning for pending, success for verified, error for reviewed/rejected)
- Enables sorting by status for easier navigation
- Maps INCONCLUSIVE to "Pending Review" to indicate it needs clinician attention

---

### 3. Mobile Card View Status Badge (`data-table.tsx`)

**Location:** `frontend/components/patient/history-page/data-table.tsx:41-395`

**Changes:**
- Added status sort options to the sort dropdown
- Extracted `diagnosisStatus` in mobile card view
- Added status badge rendering before reliability badge
- Duplicated `getStatusBadge` helper for mobile view (same logic as `getStatusConfig`)

**Sort Options Update:**
```tsx
const sortOptions: SortOption[] = [
  { value: "createdAt", label: "Date (Oldest)", desc: false },
  { value: "diagnosis", label: "Condition (A-Z)", desc: false },
  { value: "diagnosis", label: "Condition (Z-A)", desc: true },
  { value: "diagnosisStatus", label: "Status (A-Z)", desc: false },  // NEW
  { value: "diagnosisStatus", label: "Status (Z-A)", desc: true },   // NEW
  { value: "reliabilityRank", label: "Reliability (High-Low)", desc: true },
  { value: "reliabilityRank", label: "Reliability (Low-High)", desc: false },
];
```

**Mobile Card Badge Rendering:**
```tsx
const statusBadge = diagnosisStatus ? getStatusBadge(diagnosisStatus) : null;

// In the card view:
<div className="flex items-center flex-wrap gap-2">
  {statusBadge && (
    <span className={`badge badge-sm shrink-0 w-fit ${statusBadge.badgeClass}`}>
      {statusBadge.label}
    </span>
  )}
  {reliabilityLabel && reliabilityBadgeClass && (
    <span className={`badge badge-sm shrink-0 w-fit ${reliabilityBadgeClass}`}>
      {reliabilityLabel}
    </span>
  )}
  // ...
</div>
```

**Why:**
- Ensures status is visible in mobile-responsive card view
- Maintains consistency between desktop table and mobile card layouts
- Allows users to sort by status on both desktop and mobile

---

### 4. Development Script Commented Out (`layout.tsx`)

**Location:** `frontend/app/layout.tsx:1-50`

**Changes:**
- Commented out the development-only `react-grab` script injection

**Before:**
```tsx
<head>
  {process.env.NODE_ENV === "development" && (
    <Script
      src="//unpkg.com/react-grab/dist/index.global.js"
      // ...
    />
  )}
</head>
```

**After:**
```tsx
{/* <head>
  {process.env.NODE_ENV === "development" && (
    <Script
      src="//unpkg.com/react-grab/dist/index.global.js"
      // ...
    />
  )}
</head> */}
```

**Why:**
- Likely disabled for debugging or performance testing purposes
- Non-functional change, just commented out for potential re-enablement later

---

## UI/UX Improvements

| Improvement | Description |
|-------------|-------------|
| **Status badges** | Color-coded badges show diagnosis review status at a glance |
| **Sortable status column** | Users can sort history by PENDING, VERIFIED, or REJECTED status |
| **Mobile status display** | Status badges visible in responsive card view |
| **PDF status inclusion** | Exported PDFs now include diagnosis status |
| **Skeleton loading update** | Loading state reflects new status column structure |

---

## Technical Notes

### Status Badge Color Mapping

The status badges use DaisyUI's semantic color tokens:
- **PENDING** → `badge-warning` (amber/yellow) - indicates awaiting review
- **VERIFIED** → `badge-success` (green) - clinician confirmed the AI diagnosis
- **REJECTED** → `badge-error` (red) - clinician reviewed and marked as "Reviewed"
- **INCONCLUSIVE** → `badge-warning` (amber/yellow) - treated as pending since AI couldn't reach confident prediction

### Duplicate Helper Functions

Both `columns.tsx` and `data-table.tsx` have their own status config helper (`getStatusConfig` and `getStatusBadge` respectively). These could be consolidated into a shared utility in the future to reduce duplication, but keeping them separate allows each component to evolve independently if needed.

### Skeleton Loading Changes

The skeleton loading state was updated to show two badges instead of one:
- Status badge skeleton (`w-20`)
- Reliability badge skeleton (`w-14`)

This matches the new UI structure where both badges are displayed side-by-side.

---

## Testing Checklist

- [ ] Verify status badges display correctly for PENDING, VERIFIED, REJECTED, and INCONCLUSIVE diagnoses
- [ ] Test sorting by status (A-Z and Z-A) in desktop table view
- [ ] Test sorting by status in mobile card view
- [ ] Verify PDF export includes status column with correct values
- [ ] Check skeleton loading shows proper badge placeholders
- [ ] Confirm status badges use correct DaisyUI color tokens
- [ ] Test with null/undefined status values (should show "—")
- [ ] Mobile viewport testing for badge wrapping and layout
- [ ] Verify INCONCLUSIVE diagnoses show "Pending Review" badge

---

## Related Changes

This changeset extends the diagnosis system infrastructure:
- Builds on the 3-tier triage system (`CHANGELOG-3-tier-triage-system.md`)
- Complements the inconclusive diagnosis support (`CHANGELOG-inconclusive-diagnosis-support.md`)
- Works with the diagnosis verification types system (`CHANGELOG-diagnosis-verification-types.md`)

See also the clinician approval workflow documentation for how statuses are set: `CHANGELOG-clinician-approval-workflow.md`
