# Illness Cluster Heatmap (Map Tab)

## Overview
- **Purpose**: Provide a district-level choropleth heatmap that visualizes illness clusters by group, with clustering controls and time filters.
- **Target Users**: Clinicians and public health staff monitoring patterns across districts.
- **Key Benefits**:
  - Quickly spot cluster concentrations by district.
  - Tune clustering variables and recommended `k`.
  - Drill into district-specific patient lists.

## How It Works

### Core Functionality
1. The map tab fetches illness clusters from the backend using `/api/illness-clusters`.
2. A single cluster (Group 1..k) is selected for display at a time.
3. Diagnoses are grouped by `district` and rendered as a choropleth.
4. Legend colors are derived per cluster using `chroma-js` and dynamic bins.
5. Clicking a district opens a patients modal filtered to that district + cluster.

### User Flow
1. Navigate to **Disease Map → By illness cluster**.
2. Choose clustering variables (age, gender, district, time).
3. Use the recommended `k` or enter a custom value, then click **Apply**.
4. Pick a **Group** from the dropdown.
5. Adjust start/end dates to re-run clustering on the filtered range.
6. Click a district to see patients in that district for the selected group.
7. Review the summary cards for cluster insights.

### System Integration
- **Frontend**: `ByClusterTab` uses client hooks to fetch clusters, recommendations, and GeoJSON.
- **Backend**: `/api/illness-clusters` and `/api/illness-clusters/silhouette`.
- **GeoJSON**: `/public/geojson/bagong_silangan.geojson` (district names must match feature `name`).
- **Map rendering**: Leaflet + React-Leaflet, dynamically imported to avoid SSR issues.

## Implementation

### Key Files
- Map tab UI: `frontend/components/clinicians/map-page/by-cluster/by-cluster-tab.tsx`
- Cluster map rendering:
  - `frontend/components/clinicians/map-page/map/cluster-choropleth-map.tsx`
  - `frontend/components/clinicians/map-page/map/cluster-choropleth-layer.tsx`
  - `frontend/components/clinicians/map-page/map/cluster-choropleth-legend.tsx`
- Cluster legend/color helpers: `frontend/utils/cluster-heatmap.ts`
- Cluster overview cards: `frontend/components/clinicians/dashboard-page/clustering/illness-cluster-overview-cards.tsx`
- Patient modal: `frontend/components/clinicians/map-page/patients-modal.tsx`

### Hooks (Refactor / Code Splitting)
- Cluster fetch: `frontend/hooks/illness-cluster-hooks/use-illness-cluster-data.ts`
- Recommendation fetch: `frontend/hooks/illness-cluster-hooks/use-illness-cluster-recommendation.ts`
- Cluster display mapping: `frontend/hooks/illness-cluster-hooks/use-cluster-display.ts`
- GeoJSON loader: `frontend/hooks/map-hooks/use-geojson-data.ts`

### Manual Changes Included
- **Hook locations** consolidated under `frontend/hooks/illness-cluster-hooks/`.
- **Shared GeoJSON hook** used from `frontend/hooks/map-hooks/use-geojson-data.ts`.
- **Location variables** reduced to **district only** in UI and API payloads.
- **Illness cluster stats** now include `top_districts` (displayed in overview cards).

## Configuration

### Backend Query Parameters
`GET /api/illness-clusters`
- `n_clusters` (number, default 4)
- `age` (boolean)
- `gender` (boolean)
- `district` (boolean)
- `time` (boolean)
- `start_date` (YYYY-MM-DD, optional)
- `end_date` (YYYY-MM-DD, optional)

`GET /api/illness-clusters/silhouette`
- Same variables as above (minus `n_clusters`), plus `range` (e.g. `2-25`).

### Date Filter Behavior
If `start_date` or `end_date` is provided, **month/week filters are ignored** on the backend.

## Reference

### Data Shapes
**Illness record (frontend)**:
```ts
type IllnessRecord = {
  id: number;
  disease: string;
  confidence: number;
  uncertainty: number;
  city: string | null;
  province: string | null;
  barangay: string | null;
  region: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  diagnosed_at: string | null;
  patient_id: number;
  patient_name: string | null;
  patient_email: string | null;
  patient_age: number;
  patient_gender: "MALE" | "FEMALE" | "OTHER";
  cluster: number;
};
```

**Cluster stats (frontend)**:
```ts
type IllnessClusterStatistics = {
  cluster_id: number;
  count: number;
  disease_distribution: Record<string, { count: number; percent: number }>;
  top_diseases: { disease: string; count: number }[];
  avg_patient_age: number;
  min_patient_age: number;
  max_patient_age: number;
  gender_distribution: GenderDistribution;
  top_districts?: { district: string; count: number }[];
  temporal_distribution?: Record<string, number>;
};
```

### Error Handling
- Cluster fetch failures show a red error card in the map tab.
- Silhouette failures fall back to manual group input with a warning.
- GeoJSON failures surface as map-loading errors.

### Performance Considerations
- Choropleth map is dynamically imported to avoid SSR hydration issues.
- Recommendation calls are debounced (300ms) to limit backend load.
- Cluster requests cancel inflight fetches using `AbortController`.

## Use Cases

### Scenario 1: Investigating a Cluster Spike
**Context**: A clinician suspects a new outbreak in specific districts.
1. Set a date range to last 14 days.
2. Apply clustering with `district` + `time`.
3. Select the largest group.
4. Click highlighted districts to review patient lists.

**Expected Outcome**: Identify which districts drive the spike and review the patients in that group.

### Scenario 2: Comparing Groups by Location
**Context**: A user wants to see how clusters differ across districts.
1. Keep a broad date range.
2. Apply clustering with `district` enabled.
3. Switch between group dropdown options.

**Expected Outcome**: Visual differences by district per group and supporting cluster summaries.

## Troubleshooting
- **Map appears blank**: Confirm `district` values in `Diagnosis` match GeoJSON feature `name`.
- **Recommendation unavailable**: Reduce date range or ensure enough diagnoses exist.
- **No data returned**: Validate `start_date`/`end_date` formats (`YYYY-MM-DD`).
