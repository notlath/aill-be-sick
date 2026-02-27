# K-Means Heatmap Integration Guide

## Overview
This document explains how K-Means patient clustering is integrated into the clinician map heatmap, including:
- cluster ordering consistency with dashboard groups
- recommended `k` auto-selection
- region-projected heatmap coloring
- province + region-total tooltip values

## Scope
The integration spans:
- Backend cluster payload expansion
- Shared frontend type updates
- Map container data fetching and aggregation
- Map rendering and tooltip behavior

---

## Architecture

### Backend Source of Truth
Cluster data comes from:
- `GET /api/patient-clusters`
- `GET /api/patient-clusters/silhouette`

Updated backend file:
- `backend/app/services/cluster_service.py`

### Frontend Flow
1. `map-container.tsx` fetches clustering data and silhouette recommendation.
2. `map-container.tsx` computes heatmap data payload for rendering.
3. `philippines-map.tsx` receives `heatmapData` and draws cluster colors + tooltips.

Primary frontend files:
- `frontend/components/clinicians/map-page/map-container.tsx`
- `frontend/components/clinicians/map-page/philippines-map.tsx`
- `frontend/types/index.ts`

---

## Data Contract Changes

### 1. Backend Cluster Payload
`cluster_service.py` now includes `u.province` in the SQL query and returns it inside each patient item:
- `patient.province`

### 2. Frontend Patient Type
`frontend/types/index.ts`
- `Patient` now includes:
  - `province?: string | null`

### 3. Heatmap Payload Type
`MapHeatmapData` now contains:
- `provinceCounts: Record<string, number>`
  - Raw province-specific count for selected cluster (tooltip line 1)
- `projectedProvinceCounts: Record<string, number>`
  - Region-projected province values used for map coloring
- `regionTotals: Record<string, number>`
  - Region totals for selected cluster (tooltip line 2)
- `provinceToRegion: Record<string, string>`
  - Normalized province name to region display name
- `globalMax: number`
- `legendBins: HeatmapLegendBin[]`
- `selectedClusterDisplay: string`

---

## Cluster Consistency with Dashboard

### Ordering
Map cluster dropdown follows dashboard group ordering, not raw backend `cluster_id` order.

Sorting logic is aligned with dashboard:
1. clusters with dominant disease first
2. then by descending patient count

Implementation:
- `getDashboardClusterOrder(...)` in `map-container.tsx`
- dropdown shows `Cluster 1..N` mapped to sorted cluster IDs

### Variable Flags
Map clustering uses the same fixed feature flags as dashboard defaults:
- `age=true`
- `gender=true`
- `disease=true`
- `city=true`
- `region=false`

Applied to both:
- `/api/patient-clusters`
- `/api/patient-clusters/silhouette`

---

## Recommended K (Auto-Apply)

In cluster tab, map container:
1. fetches silhouette recommendation (`range=2-25`)
2. auto-applies recommended `k` once per mount/session
3. still allows manual override afterward

UI behavior:
- Shows `Calculating recommendation...` while loading
- Shows `Recommended: X` when available
- Falls back to `Recommended: 2-25` on failure/no result

State used in `map-container.tsx`:
- `recommendedK`
- `loadingRecommendation`
- `hasAutoAppliedRecommendation`

---

## Heatmap Semantics

### Coloring
Color intensity is still region-projected:
- Each province is colored using its parent region's selected-cluster total.
- `0` remains gray.
- Positive counts use fixed red legend bins for current `k`.

### Tooltip
In cluster mode hover:
- Line 1: `ProvinceName: <province count>`
- Line 2: `<RegionName> total: <region total>`

Example:
- `Rizal: 3`
- `Region IV-A (CALABARZON) total: 10`

This gives province-level detail while preserving region-level heatmap shading.

---

## Key Aggregation Rules

In `map-container.tsx`:
1. Build `regionCountsByCluster` from `patient.region`.
2. Build `projectedProvinceCounts` by assigning region totals to all provinces in that region.
3. Build raw `provinceCounts` from `patient.province` for selected cluster.
4. Build `regionTotals` for selected cluster.
5. Build `provinceToRegion` for tooltip mapping.

Location normalization is applied to avoid casing/punctuation mismatches.

---

## Edge Cases
- Silhouette fetch fails: keep current `k`, no crash.
- Missing patient `province`: province count defaults to `0`.
- Missing patient `region`: region total defaults to `0`.
- Province not resolvable to region: tooltip shows fallback region label.
- Empty cluster: map stays gray with zero values.

---

## Validation Checklist
1. Open map cluster tab and verify `k` auto-updates from recommendation.
2. Manually change `k` and verify override still works.
3. Confirm map cluster options align with dashboard group order.
4. Hover provinces and verify two-line tooltip:
   - province count
   - region total
5. Verify colors remain region-projected.
6. Confirm disease/anomaly tabs still function unchanged.

---

## Notes for Future Changes
- If dashboard clustering variables change, update `DASHBOARD_CLUSTER_VARIABLES` in map container.
- If tooltip should become purely province-based shading, switch fill logic from `projectedProvinceCounts` to `provinceCounts`.
- Keep backend payload and frontend `Patient` type in sync when adding location fields.

---

## In-Depth Code Guide

This section is a deeper engineering walkthrough so you can replicate this pattern elsewhere.

## 1) Backend: Add Field to Cluster Payload

### File
- `backend/app/services/cluster_service.py`

### Why
Frontend tooltip needed province-level counts. City-to-province inference was ambiguous, so payload now carries province directly.

### Exact flow
1. SQL `SELECT` adds `u.province`
2. Tuple unpacking adds `province`
3. `patient_info` dict adds `"province": province`
4. Indexes for `row[...]` used by feature encoding are shifted accordingly

### Critical indexing detail
After adding `province`, `region` moved from index `6` to index `7`.
That is why this changed:
- `region_values = sorted({(row[7] or "UNKNOWN") for row in data})`

If this index is wrong, clustering still runs but region one-hot encoding becomes corrupted.

---

## 2) Types: Keep Contracts Explicit

### File
- `frontend/types/index.ts`

### Why
`map-container.tsx` computes multiple count layers for different UI purposes:
- color scale input
- tooltip input

### Updated contracts
- `Patient.province?: string | null`
- `MapHeatmapData` includes:
  - `provinceCounts`
  - `projectedProvinceCounts`
  - `regionTotals`
  - `provinceToRegion`

### Design principle
If a value is rendered in the map, put it in `MapHeatmapData` and compute it in container.
Keep `philippines-map.tsx` rendering-focused.

---

## 3) Map Container: Data Orchestration Layer

### File
- `frontend/components/clinicians/map-page/map-container.tsx`

### Responsibilities
1. Fetch cluster data
2. Fetch silhouette recommendation
3. Keep dashboard-equivalent cluster variable flags
4. Reconcile dashboard cluster order vs raw cluster IDs
5. Build all derived map counts
6. Pass a single render payload to map

### 3.1 Fixed variable flags (dashboard alignment)
```ts
const DASHBOARD_CLUSTER_VARIABLES = {
  age: "true",
  gender: "true",
  disease: "true",
  city: "true",
  region: "false",
} as const;
```

This is appended to:
- `/api/patient-clusters`
- `/api/patient-clusters/silhouette`

This prevents silent cluster drift between dashboard and map.

### 3.2 Recommended k (auto-apply once)
State:
- `recommendedK`
- `loadingRecommendation`
- `hasAutoAppliedRecommendation`

Logic:
1. On cluster tab, call silhouette endpoint (`range=2-25`).
2. If `best.k` exists, clamp to 2..25.
3. Apply `k` only once if `hasAutoAppliedRecommendation === false`.
4. User changes to `k` still work after.

Pseudo-flow:
```ts
if (selectedTab === "cluster") {
  bestK = fetchSilhouetteBestK()
  setRecommendedK(bestK)
  if (!hasAutoAppliedRecommendation) {
    setK(bestK)
    setHasAutoAppliedRecommendation(true)
  }
}
```

### 3.3 Cluster display order mapping
Dashboard label order is computed by:
1. dominant disease first
2. then count descending

Container keeps:
- display cluster index (`selectedCluster`: "1", "2", ...)
- resolved backend `cluster_id` (`selectedClusterId`)

Key mapping:
```ts
selectedClusterIndex = Number(selectedCluster) - 1
selectedClusterId = clusterOrder[selectedClusterIndex] ?? selectedClusterIndex
```

### 3.4 Derived count layers
For selected `cluster_id`, container computes:

1. `regionTotals`
- source: patient `region`
- key: human region label
- use: tooltip line 2

2. `provinceCounts`
- source: patient `province`
- key: canonical province name
- use: tooltip line 1

3. `projectedProvinceCounts`
- source: `regionTotals` projected to all provinces in that region
- use: map fill/color intensity

4. `provinceToRegion`
- source: static region/province datasets
- key: normalized province name
- value: region label
- use: resolve tooltip region line quickly

### Why two province count maps exist
- `projectedProvinceCounts`: visual heatmap intensity
- `provinceCounts`: factual province-specific tooltip value

This preserves both:
- regional distribution readability
- province-level informational detail

---

## 4) Map Component: Pure Rendering Layer

### File
- `frontend/components/clinicians/map-page/philippines-map.tsx`

### Responsibilities
1. Convert `heatmapData` into fast lookup maps (`useMemo`)
2. Pick fill color per feature
3. Render tooltip text/html

### 4.1 Fill color source
Color uses projected values:
```ts
projectedProvinceCounts.get(normalizeLoc(provinceName))
```

Not raw province counts.

### 4.2 Tooltip source
Tooltip uses both maps:
1. `provinceCounts[province]`
2. `regionTotals[provinceToRegion[province]]`

Rendered as:
```html
ProvinceName: 3
<br/>
Region Name total: 10
```

### 4.3 Why `.html(...)` instead of `.text(...)`
Two-line tooltip required line break; D3 tooltip uses a plain `div`.
Using `.html(...)` is safe here because values are app-derived location labels/counts.

---

## 5) Normalization Strategy (Replication Critical)

Both container and map normalize location strings before lookup:
- lowercase
- remove punctuation
- collapse spaces
- strip `"province of"` and `"province"` suffix
- strip parenthetical text where needed

If replication target has different naming conventions, update normalization first before debugging counts.

---

## 6) Replication Blueprint

Use this exact sequence to replicate for another geography/data dimension:

1. Add missing raw field(s) to backend cluster payload.
2. Update frontend type contract.
3. In container:
   - fetch + align variable flags with source module
   - compute recommended `k`
   - compute label-order mapping if presentation order differs from IDs
   - build render payload with separate maps for visual vs informational counts
4. In renderer:
   - use visual map for color
   - informational maps for tooltip/details
   - keep component stateless regarding business logic
5. Add regression checks:
   - order consistency
   - color consistency
   - tooltip semantic correctness

---

## 7) Common Failure Modes and Fixes

1. Tooltip zeros everywhere
- Cause: province names not normalized the same way
- Fix: compare normalized keys between `provinceCounts` and hovered feature `adm2_en`

2. Map and dashboard cluster mismatch
- Cause: different variable flags or different ordering logic
- Fix: enforce `DASHBOARD_CLUSTER_VARIABLES` and `getDashboardClusterOrder`

3. Wrong region totals
- Cause: region alias mapping miss
- Fix: extend `regionPsgcByAlias` rules for alternate naming

4. Recommendation keeps overriding user input
- Cause: missing one-time guard
- Fix: preserve `hasAutoAppliedRecommendation` gate

---

## 8) Minimal Verification Script (Manual)

After running the app:
1. Open dashboard clustering and note `Group 1` top region/city profile.
2. Open map clustering with same `k`.
3. Select `Cluster 1`.
4. Confirm:
   - region-heavy areas in heatmap match expected group spread
   - province hover shows province count and region total
   - recommendation label appears and does not repeatedly override manual changes.

---

## 9) Cluster Color System (Dashboard-Aligned)

### Goal
Use the same cluster color family ordering as dashboard groups, while still showing intensity ranges in the map.

### Source of truth
- `frontend/utils/cluster-colors.ts`

Exports:
- `CLUSTER_BASE_COLORS`
- `getClusterBaseColor(displayIndex)`
- `buildClusterRamp(baseColor, steps)` using `chroma.js`

### Base color order
By display group index (same ordering intent as dashboard themes):
1. blue
2. emerald
3. purple
4. orange
5. pink
6. indigo
7. cyan
8. rose

### How map colors are derived
1. Resolve selected display cluster index (`Cluster 1..N` -> `0..N-1`).
2. Resolve base color using `getClusterBaseColor(index)`.
3. Build 5-shade ramp with `buildClusterRamp(...)` (light -> dark).
4. Assign bin colors from that ramp.
5. Keep zero bucket gray (`#d1d5db`).

### Why `chroma.js`
- consistent perceptual scaling for shades
- avoids manually maintaining many static shade arrays
- deterministic ramp generation from one base color

### Fallback behavior
If chroma processing fails, the utility falls back to a neutral grayscale ramp and logs a warning.

---

## 10) Province Drilldown (Barangay-Level Cluster Heatmap)

### Goal
When user drills from country to province, heatmap granularity shifts from province to barangay.

### Contract additions
- Backend patient payload includes `barangay`.
- Frontend `Patient` type includes `barangay`.
- `MapHeatmapData` adds:
  - `provinceTotals`
  - `cityTotals` (key: `normalize(province)||normalize(city)`)
  - `barangayCounts` (key: `normalize(province)||normalize(city)||normalize(barangay)`)
  - `provinceLegendBinsByProvince`

### Data flow
1. `map-container.tsx` keeps country-view region-projected counts unchanged.
2. For selected cluster, it additionally aggregates:
   - `provinceTotals`
   - `cityTotals`
   - `barangayCounts`
3. It builds province-specific legend bins from max barangay count per province.
4. `philippines-map.tsx` renders:
   - country view: `projectedProvinceCounts` + `legendBins`
   - province view: `barangayCounts` + `provinceLegendBinsByProvince[currentProvince]`

### Tooltip semantics in province view
- line 1: `<Barangay>: <barangayCount>`
- line 2: `<City> total: <cityTotal>`
- line 3: `<Province> total: <provinceTotal>`

### Missing-barangay rule
- Patients with missing `barangay` are excluded from barangay fill counts.
- They still contribute to city/province totals when those fields exist.
