# Disease Map & Heatmap Feature Documentation

## Overview

- **Purpose**: Enables clinicians to visualize disease spread and statistics across the Philippines using interactive map views—district-based choropleth and coordinate-based heatmap.
- **Target Users**: Clinicians, epidemiologists, public health officials.
- **Key Benefits**:
  - Rapid spatial analysis of disease cases.
  - Switchable views for granular (coordinates) or aggregate (district) insights.
  - Interactive stats and patient modals for deeper investigation.

## How It Works

- **Core Functionality**:
  - Map page offers tabs for disease, cluster, and anomaly views.
  - By-disease tab supports two modes:
    - **District View**: Choropleth map colored by case counts per district.
    - **Coordinates View**: Heatmap overlay showing density of cases with geolocation.
  - Stats cards summarize total cases, most affected area, affected districts, average cases, coverage, and breakdowns for pinned/unpinned cases.
  - Clicking map features or stats cards opens modals listing relevant patients.

- **User Flow**:
  1. User selects disease, date range, and view mode.
  2. Map and stats update based on filters.
  3. User interacts with map or stats to view patient details.

- **System Integration**:
  - Uses Leaflet and leaflet.heat for map rendering.
  - Data fetched via Prisma from diagnosis records.
  - State managed with Zustand stores.

## Implementation

- **Technical Requirements**:
  - Dependencies: `leaflet`, `leaflet.heat`, `react-leaflet`, `zustand`, Prisma client.
  - TypeScript and DaisyUI for UI consistency.
  - Requires diagnosis data with latitude/longitude for heatmap.

- **Configuration**:
  - Add `leaflet.heat` to `package.json` and `declaration.d.ts`.
  - Map views controlled via `ViewSelect` component.
  - Tabs managed by `useMapStore`.

- **Code Examples**:
  - See `heatmap-layer.tsx` for heatmap overlay logic.
  - See `by-disease-tab.tsx` for view switching and stats calculation.

## Reference

- **Parameters**:
  - `selectedDisease`: Disease filter.
  - `startDate`, `endDate`: Date range filter.
  - `view`: "coordinates" or "district".
  - `diagnoses`: Array of diagnosis records.

- **Error Handling**:
  - Loading skeletons shown while fetching data.
  - Errors logged to console; UI fallback is loading state.

- **Performance**:
  - Data fetching optimized with Promise.all and grouping.
  - Map overlays only render visible points for efficiency.

## Use Cases

### Scenario 1: Outbreak Investigation
- **Context**: Clinician wants to identify hotspots for dengue.
- **Steps**:
  1. Select "Dengue" and recent date range.
  2. Switch to "Coordinates view" for granular heatmap.
  3. Click "Pinned Cases" card to see all geolocated patients.
- **Expected Outcome**: Clinician quickly identifies areas with highest density and reviews patient details.

### Scenario 2: District-Level Resource Allocation
- **Context**: Public health official plans resource distribution.
- **Steps**:
  1. Select "District view".
  2. Review "Most Affected Area" and "Average Cases" stats.
  3. Click district on map to see patient list.
- **Expected Outcome**: Official allocates resources to districts with highest case counts.

---

For further details, see:
- `map-tabs.tsx`
- `heatmap-map.tsx`
- `diagnosis.ts`
- `package.json` for dependencies.

This documentation follows the feature-documentation skill's structure for clarity and completeness.
