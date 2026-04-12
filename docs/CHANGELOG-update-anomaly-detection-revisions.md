# Changelog — `update/anomaly-detection-revisions`

All notable changes in this branch relative to `main`.

**Branch:** `update/anomaly-detection-revisions`
**Date:** 2026-04-12
**Version target:** TBD (next minor release)

---

## Summary

This branch makes two categories of changes to the anomaly detection system:

1. **Removes the "top anomalies" feature** — eliminates the top 5 critical anomaly markers on maps and the "Top Critical Cases" table, which added visual clutter without actionable value.
2. **Improves interpretability for non-technical users** — replaces machine learning jargon ("anomaly", "anomaly score") with clinical language ("flagged cases"), adds explanatory context for how cases are flagged, and surfaces the reason codes in detail modals so clinicians understand *why* each case was surfaced.

These changes address feedback from the thesis defense panelists, who raised concerns that the anomaly detection UI was not interpretable for clinicians and public health workers.

---

## Problem Statement

1. **"Anomaly" is a machine learning term, not a clinical term.** Clinicians think in terms of "cases that need review" or "unusual patterns" — not statistical outliers from an Isolation Forest model.
2. **No explanation of why cases were flagged.** The detail modals (opened by clicking a case on the map or in the table) showed AI confidence, symptoms, and location but never explained the surveillance flagging reason.
3. **Top anomaly markers added visual noise.** The top 5 critical anomaly pulsating markers on maps and the "Top Critical Cases" table below the timeline were not providing actionable triage value.
4. **Reason codes were buried in table columns.** The `reason` field on each `SurveillanceAnomaly` object was shown in the data table's "Reason Flags" column but was discarded before reaching the detail modals.
5. **No clinical takeaway or context.** The summary card showed raw distributions (counts, percentages) but never translated them into guidance like "these cases are appearing in new areas" or "continued monitoring recommended."

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/components/clinicians/map-page/by-anomaly/by-anomaly-tab.tsx` | Modified | Removed top anomalies computation, props, and table section; added "How are cases flagged?" info card; updated button/modal labels |
| `frontend/components/clinicians/map-page/by-anomaly/top-critical-anomalies.tsx` | **Deleted** | Entire component removed |
| `frontend/components/clinicians/map-page/map/choropleth-map.tsx` | Modified | Removed `topAnomalies` prop, district anomaly grouping, and critical marker rendering |
| `frontend/components/clinicians/map-page/map/heatmap-map.tsx` | Modified | Removed `topAnomalies` prop, `excludedCoords` logic, and critical marker rendering |
| `frontend/components/clinicians/map-page/by-anomaly/anomaly-stats-cards.tsx` | Modified | Renamed "Total Anomalies" → "Total Flagged Cases", "Average Anomalies" → "Average Flagged Cases" |
| `frontend/components/clinicians/map-page/by-anomaly/anomaly-summary.tsx` | Modified | Renamed section headers, added reason descriptions, replaced percentages with "X of Y" counts, added clinical takeaway card |
| `frontend/components/clinicians/map-page/anomaly-timeline-chart.tsx` | Modified | Renamed "anomalies" → "flagged cases" in tooltip and empty state |
| `frontend/components/clinicians/map-page/map/map-tabs.tsx` | Modified | Renamed tab label from "By anomaly" to "Flagged cases" |
| `frontend/components/clinicians/map-page/by-anomaly/anomaly-detail-modal.tsx` | Modified | Passes `anomalyReason` through to `ReportDetailModal` |
| `frontend/components/clinicians/map-page/map/point-detail-modal.tsx` | Modified | Extracts `reason` from anomaly point data and passes through to `ReportDetailModal` |
| `frontend/components/clinicians/healthcare-reports-page/report-detail-modal.tsx` | Modified | Added "Why was this case flagged" section with reason code badges and descriptions; added Patient Age and Gender cards |
| `frontend/utils/anomaly-summary.ts` | Modified | Updated narrative language to "flagged cases"; added `generateClinicalTakeaway` function with disease-specific context |

---

## Detailed Changes

### 1. Removed "Top Anomalies" Feature

**Location:** `frontend/components/clinicians/map-page/by-anomaly/by-anomaly-tab.tsx`

**What was removed:**
- `topCriticalAnomalies` useMemo computation (top 5 sorted by lowest anomaly score)
- `topAnomalies` prop passed to both `<ChoroplethMap>` and `<HeatmapMap>`
- "Top Critical Cases Table" section below the timeline (including its skeleton loading state)
- The entire `top-critical-anomalies.tsx` component file

**Impact on `choropleth-map.tsx`:**
- Removed `topAnomalies` from `ChoroplethMapProps` type
- Removed `anomaliesByDistrict` grouping logic
- Removed `criticalIcon` definition and the `Object.entries(anomaliesByDistrict).map(...)` rendering block that placed pulsating error markers at district visual centers
- Kept the targeted outbreak GPS pin marker (from URL params) intact

**Impact on `heatmap-map.tsx`:**
- Removed `topAnomalies` from `HeatmapMapProps` type
- Removed `excludedCoords` useMemo (which excluded top anomaly coordinates from the interactive points layer)
- Removed `criticalIcon` definition and the `topAnomalies.map(...)` rendering block for pulsating markers
- Removed the target anomaly search logic that prioritized `topAnomalies` over diagnoses for URL-param lookups
- Kept the targeted anomaly GPS pin marker (from URL params) intact

**What is preserved:**
- Targeted outbreak GPS pin markers (from URL `?lat=&lng=` params)
- Heatmap visualization of all flagged cases
- Interactive points layer for all diagnoses (now without coordinate exclusions)
- Choropleth district coloring
- Anomaly summary, timeline chart, and stats cards
- Export functionality

---

### 2. Renamed "Anomaly" → "Flagged Cases" Everywhere

**User-facing text changes across multiple files:**

| Before | After | Location(s) |
|--------|-------|-------------|
| "Total Anomalies" | "Total Flagged Cases" | Stats cards, modal titles |
| "Average Anomalies" | "Average Flagged Cases" | Stats cards |
| "Anomaly Summary" | "Flagged Cases Summary" | Summary card header |
| "All Flagged Anomalies" | "All Flagged Cases" | Modal titles |
| "All Normal Diagnoses" | "All Typical Cases" | Modal titles |
| "Rescan Anomalies" | "Refresh Analysis" | Button label |
| "Error Loading Anomaly Data" | "Error Loading Flagged Cases Data" | Error card |
| "No Anomalies Detected" | "No Flagged Cases Detected" | Empty state |
| "appear within normal patterns" | "appear within typical patterns" | Empty state |
| "Reason Flags" → "Review Flags" | "Why Cases Were Flagged" | Summary section header |
| "Diseases" | "Most Common Conditions" | Summary section header |
| "Affected Districts" | "Where Cases Are Located" | Summary section header |
| "By anomaly" (tab label) | "Flagged cases" | Map tabs |
| "anomalies" (timeline tooltip) | "flagged cases" | Timeline chart |

Code-internal variable names (`anomalies`, `allAnomalies`, `pinnedAnomalies`) were intentionally **not changed** — only user-facing text was updated.

---

### 3. Added "How Are Cases Flagged?" Info Card

**Location:** `frontend/components/clinicians/map-page/by-anomaly/by-anomaly-tab.tsx`

A collapsible info card placed between the control bar and the map, using a dashed border to visually distinguish it from content cards.

```
? How are cases flagged?
───────────────────────────────────────────
This analysis automatically reviews all verified diagnosis
records and flags cases that show unusual patterns. A case
may be flagged for several reasons:

• Unusual location — This disease is rarely reported in this area
• Unusual timing — This case occurred at an unusual time of year
• Unusual age — The patient's age is atypical for this diagnosis
• Unusual gender — The patient's gender is uncommon for this diagnosis
• Multiple factors — Two or more reasons applied simultaneously

Flagged cases do not mean the diagnosis is incorrect — they
indicate patterns worth reviewing for public health surveillance.
Approximately 5% of cases are expected to be flagged by design.
```

**Implementation:**
- Added `showInfo` state and `ChevronDown`/`ChevronUp` icons from `lucide-react`
- Toggleable expand/collapse with a `hover:bg-base-200` interactive feel

---

### 4. Enhanced Summary with Descriptions and "X of Y" Counts

**Location:** `frontend/components/clinicians/map-page/by-anomaly/anomaly-summary.tsx`

**Reason code rows** now show:
- The plain-language description below each label (imported `getReasonDescription` from `anomaly-reasons.ts`)
- "X of Y" counts instead of misleading percentages (since a case can have multiple flags, percentages don't sum to 100%)

Before: `📍 Unusual location — 8 (53%)`
After:
```
📍 Unusual location
   "This disease is rarely reported in this geographic area..."
   [8 of 15]
```

---

### 5. Added "What This Means" Clinical Takeaway

**Location:** `frontend/components/clinicians/map-page/by-anomaly/anomaly-summary.tsx` and `frontend/utils/anomaly-summary.ts`

A new amber-colored card at the bottom of the summary with a plain-language sentence that translates statistical patterns into clinical guidance.

**Examples:**
- *"Cases appearing in areas where Dengue is rarely reported — may indicate emerging spread."*
- *"Cases occurring at an unusual time of year for Dengue — may signal an off-cycle outbreak."*
- *"Dengue accounts for the majority of flagged cases. Cases concentrated in Poblacion."*
- *"Only 2 cases flagged — isolated incidents, no clear pattern emerging."*

**Logic (`generateClinicalTakeaway` in `anomaly-summary.ts`):**
- If `GEOGRAPHIC:RARE` is the top reason → "Cases appearing in areas where [disease] is rarely reported..."
- If `TEMPORAL:RARE` → "Cases occurring at an unusual time of year for [disease]..."
- If `COMBINED:MULTI` → "Multiple factors contributing to flags — these cases warrant comprehensive review"
- Adds disease context when one disease dominates (≥ 50%)
- Adds district concentration when one district dominates (≥ 50%)
- Falls back to softer language for low-activity scenarios (≤ 3 cases)

---

### 6. Showed Flagging Reasons in Detail Modals

**Locations:** `report-detail-modal.tsx`, `point-detail-modal.tsx`, `anomaly-detail-modal.tsx`

**The gap:** When clicking a flagged case on the heatmap or in the anomaly table, the detail modal (`ReportDetailModal`) showed AI confidence, symptoms, location, and SHAP word heatmap — but **never explained why the case was flagged for surveillance**. The `reason` field on `SurveillanceAnomaly` was available but discarded before reaching the detail modal.

**The fix:**
1. Added optional `anomalyReason` prop to `ReportDetailModal`
2. `PointDetailModal` now extracts `reason` from the clicked point data (if present) and passes it through
3. `AnomalyDetailModal` now passes `anomaly.reason` through to `ReportDetailModal`

**What the section looks like:**
```
WHY WAS THIS CASE FLAGGED
───────────────────────────────────────────
Unusual location
  "This disease is rarely reported in this geographic area..."

Unusual timing
  "This case was recorded at an unusual time of year..."
```

Uses the same `bg-base-200/50 p-4 rounded-lg` layout as the "Why this alert" section in the alerts detail modal for visual consistency.

---

### 7. Added Patient Age and Gender to Detail Modal

**Location:** `frontend/components/clinicians/healthcare-reports-page/report-detail-modal.tsx`

Added two new cards in the detail grid:
- **Patient Age** — Shows `{age} years old` (conditionally rendered when `report.user?.age` exists)
- **Patient Gender** — Shows gender in lowercase with `capitalize` class (conditionally rendered when `report.user?.gender` exists)

The data was already available via `report.user` (fetched by `getDiagnosisById` with user relation included).

---

## Technical Notes

- **No backend changes.** The ML pipeline, anomaly detection algorithm, reason code generation, and API endpoints are all unchanged. The backend already returns `reason` (pipe-separated codes) and `anomaly_score` on each anomaly record.
- **`SurveillanceAnomaly` type unchanged.** The `reason` field was already present on the TypeScript interface — we just started consuming it in the detail modals.
- **Targeted outbreak markers preserved.** The GPS pin markers triggered by URL `?lat=&lng=` query params still work on both choropleth and heatmap maps. Only the top-5 pulsating error markers were removed.
- **All internal variable names preserved.** Code-internal names like `anomalies`, `allAnomalies`, `pinnedAnomalies`, `normalDiagnoses` were intentionally not renamed — only user-facing text was changed.

---

## Testing

- [ ] TypeScript compiles cleanly (`npx tsc --noEmit` in `frontend/`)
- [ ] "Flagged cases" tab label renders correctly on map page
- [ ] "How are cases flagged?" info card expands/collapses correctly
- [ ] Stats cards show "Total Flagged Cases" / "Average Flagged Cases"
- [ ] Summary card shows "Flagged Cases Summary" with renamed section headers
- [ ] Reason code rows show descriptions and "X of Y" counts
- [ ] "What this means" card shows contextually appropriate takeaway
- [ ] Clicking a flagged case on the heatmap shows "Why was this case flagged" section in the detail modal
- [ ] Clicking "View Details" in the anomaly table shows the same "Why was this case flagged" section
- [ ] No pulsating top anomaly markers appear on either map
- [ ] Targeted outbreak GPS pin markers (from URL params) still work
- [ ] Patient age and gender cards appear when user data is available

---

## Related Changes

- **`feat/geographic-clustering`** (2026-04-05): Migrated K-Means outbreak clustering from demographic-based to geographic coordinate-based clustering.
- **`feat/privacy-compliance`** (2026-04-05): Privacy compliance features including data export, consent withdrawal, and scheduled deletion.
