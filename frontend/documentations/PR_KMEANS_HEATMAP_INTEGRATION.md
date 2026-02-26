## What does this PR do?

- Integrates K-Means clustering into the Philippines heatmap with dashboard-consistent behavior and mapping.
- Aligns map clustering semantics with dashboard clustering by:
  - using the same clustering variable flags (`age=true`, `gender=true`, `disease=true`, `city=true`, `region=false`)
  - preserving dashboard-style cluster display ordering (dominant-disease-first, then patient count desc)
- Adds silhouette-based recommended `k` in map clustering and auto-applies it once on initial cluster tab load.
- Improves cluster hover tooltip semantics:
  - line 1: province-specific patient count for selected cluster
  - line 2: selected cluster total for that province’s region
- Keeps region-projected heatmap coloring behavior (visual intensity remains region-based).
- Extends backend clustering payload to include patient `province` for accurate province-level tooltip counts.
- Updates shared frontend types to support new clustering/map payload fields.
- Adds full technical documentation for K-Means-to-heatmap integration and replication.

## Files Changed

- `backend/app/services/cluster_service.py`
  - Added `u.province` to clustering query payload.
  - Updated tuple unpacking/index handling after adding `province`.
  - Included `province` in each `patient_info` item returned to API.

- `frontend/types/index.ts`
  - Extended `Patient` with `province?: string | null`.
  - Extended `MapHeatmapData` with:
    - `projectedProvinceCounts`
    - `regionTotals`
    - `provinceToRegion`
  - Retained existing fields (`provinceCounts`, `globalMax`, `legendBins`, `selectedClusterDisplay`).

- `frontend/components/clinicians/map-page/map-container.tsx`
  - Added fixed dashboard-aligned cluster variable flags for both cluster and silhouette fetches.
  - Added silhouette recommendation states and auto-apply-once logic:
    - `recommendedK`
    - `loadingRecommendation`
    - `hasAutoAppliedRecommendation`
  - Added recommendation text beside `Groups` input.
  - Preserved dashboard-equivalent cluster ordering via `getDashboardClusterOrder(...)`.
  - Refactored heatmap payload computation to produce:
    - raw province counts (tooltip line 1)
    - region totals (tooltip line 2)
    - projected province counts (heatmap fill)
    - province-to-region lookup map
  - Continued passing a single `heatmapData` payload to `PhilippinesMap`.

- `frontend/components/clinicians/map-page/philippines-map.tsx`
  - Switched cluster fill source to `projectedProvinceCounts`.
  - Added separate province count lookup for tooltip.
  - Updated cluster tooltip rendering to:
    - `ProvinceName: <province count>`
    - `<RegionName> total: <region total>`
  - Kept drilldown/search/zoom behavior unchanged.

- `frontend/documentations/KMEANS_HEATMAP_INTEGRATION_GUIDE.md`
  - Added full integration guide (architecture, contracts, data flow, edge cases).
  - Added in-depth code guide for study and replication.

## Testing Done

- Manual validation performed for behavior-level checks:
  - Cluster dropdown ordering now matches dashboard group ordering semantics.
  - Cluster fetch now uses dashboard-equivalent variable flags.
  - Recommended `k` appears in map cluster tab and auto-applies once.
  - Province hover in cluster mode now shows:
    - province-specific count
    - region total
  - Heatmap coloring remains region-projected and legend behavior remains intact.
  - Disease/anomaly tabs remain unaffected by cluster-specific changes.

- Notes:
  - No CLI typecheck/build command output is attached due local shell execution policy restrictions for `npx` in this environment.
