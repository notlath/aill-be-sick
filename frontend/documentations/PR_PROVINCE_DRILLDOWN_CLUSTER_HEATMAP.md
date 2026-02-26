## What does this PR do?

- Adds province drilldown heatmap behavior for cluster mode.
- Keeps country view behavior unchanged (region-projected province heatmap).
- Enables barangay-level coloring in province view based on selected cluster counts.
- Updates cluster tooltip in province view to show:
  - barangay cluster count
  - city total cluster count
  - province total cluster count
- Extends cluster payload/types to include `barangay` for accurate barangay-level aggregation.
- Adds province-scoped legend bins so province view uses local barangay intensity ranges.
- Updates integration documentation with the new drilldown data flow and key contracts.

## Files Changed

- `backend/app/services/cluster_service.py`
  - Added `u.barangay` in cluster query.
  - Added `barangay` in patient payload.
  - Adjusted region feature index after query field insertion.
- `frontend/types/index.ts`
  - Added `Patient.barangay`.
  - Extended `MapHeatmapData` with:
    - `provinceTotals`
    - `cityTotals`
    - `barangayCounts`
    - `provinceLegendBinsByProvince`
- `frontend/components/clinicians/map-page/map-container.tsx`
  - Added selected-cluster aggregation for province/city/barangay counts.
  - Added province-specific legend bin generation.
  - Preserved existing country-level cluster heatmap logic.
- `frontend/components/clinicians/map-page/philippines-map.tsx`
  - Added province-view barangay heatmap rendering.
  - Added province-view tooltip with barangay/city/province totals.
  - Added view-aware legend switching (country vs province bins).
- `frontend/documentations/KMEANS_HEATMAP_INTEGRATION_GUIDE.md`
  - Added province drilldown section, key formats, legend behavior, and missing-barangay rule.

## Testing Done

- Manual validation done for implementation paths:
  - Country view still renders region-projected province heatmap in cluster mode.
  - Clicking a province enters province view and loads barangays/city boundaries.
  - Barangays color by selected-cluster counts when data exists.
  - Province-view tooltip shows three lines:
    - barangay count
    - city total
    - province total
  - Cluster selection changes update both country/province color states and tooltip values.
  - `k` changes/refetch still work with new drilldown aggregations.
- Type-check/build execution was intentionally skipped per request.
