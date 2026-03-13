# Map Dashboard Critical Anomaly Enhancements

## Overview

- **Purpose**: To provide clinicians and health officials with immediate, clear, and actionable visibility into the most critical health anomalies detected by the AI surveillance system directly on the map dashboard.
- **Target Users**: Clinicians, Epidemiologists, Public Health Officials.
- **Key Benefits**:
  - Highlights top critical cases requiring urgent review.
  - Improves spatial awareness of severe anomalies via map overlays.
  - Standardizes data presentation through a consistent, reusable data table component.

## How It Works

### Core Functionality

The enhancement introduces three main visual features:
1.  **Top Critical Cases Table**: A configurable data table prominently displayed below the anomaly timeline, listing the top 5 anomalies with the lowest (most critical) anomaly scores.
2.  **Heatmap Overlays**: Pulsating markers overlaid onto the `react-leaflet` Heatmap view, indicating the exact geographic coordinates of the top critical anomalies.
3.  **Choropleth Overlays**: District-level markers overlaid onto the Choropleth view, calculating the centroid of affected districts using `Turf.js` to pinpoint critical anomalies when exact coordinates are abstracted.

### User Flow

1.  **Data Ingestion**: The clinician navigates to the "By Anomaly" tab within the map dashboard.
2.  **Data Processing**: The client-side logic (`useMemo` in `by-anomaly-tab.tsx`) dynamically filters the dataset based on the selected disease and date range, then sorts the anomalies by their `anomaly_score` to extract the Top Critical Cases.
3.  **Interaction**:
    - Users can view the Top Critical Cases table below the timeline and interact with the pagination, sorting, and filtering capabilities.
    - Users can hover over pulsating pins on the Heatmap or Choropleth map to see tooltips displaying patient details (Name, ID, Diagnosis, Score) associated with that location.
    - Clicking on a district or viewing the "All Anomalies" modal opens the `AnomalyPatientsModal`, which now shares the same underlying `AnomalyDataTable` component as the Top Critical Cases view.

### System Integration

This feature integrates heavily with the existing anomaly detection pipeline. It relies strictly on the `SurveillanceAnomaly` data type returned from the Django/Flask backend (Isolation Forest predictions).

*   **Maps Integration**: Integrates with `react-leaflet` to render custom `DivIcon` markers.
*   **Geospatial Computation**: Uses `@turf/turf` to compute the `centerOfMass` for GeoJSON features in the district view.

## Implementation

### Technical Requirements

- React, Next.js App Router
- `@tanstack/react-table` for data table logic.
- `react-leaflet`, `leaflet` for map rendering.
- `@turf/turf` (specifically `centerOfMass` and `helpers`) for district centroid calculation.

### File Structure & Components

- `frontend/components/clinicians/map-page/by-anomaly/anomaly-data-table.tsx`: The core reusable table component. Extracted to ensure standard visualization of `SurveillanceAnomaly` records.
- `frontend/components/clinicians/map-page/by-anomaly/top-critical-anomalies.tsx`: Render wrapper for the critical cases table, positioned in `by-anomaly-tab.tsx`.
- `frontend/components/clinicians/map-page/map/heatmap-map.tsx`: Updated to accept `topAnomalies` props and map them as pulsating leaflet markers.
- `frontend/components/clinicians/map-page/map/choropleth-map.tsx`: Updated to calculate feature centroids via Turf.js and place markers for top critical cases within their respective districts.

### Code Examples

#### Extracting Top Anomalies (Client-Side)

```typescript
const topCriticalAnomalies: SurveillanceAnomaly[] = useMemo(() => {
  return [...anomalies]
    .sort((a, b) => a.anomaly_score - b.anomaly_score)
    .slice(0, 5); // Take the top 5 most critical (lowest score in Isolation Forest)
}, [anomalies]);
```

#### Turf.js Centroid Calculation in Choropleth Map

```typescript
import { centerOfMass, feature } from "@turf/turf";

// ... inside the ChoroplethMap component loop ...
const districtGeometry = feature(districtFeature.geometry);
const center = centerOfMass(districtGeometry);
const [lng, lat] = center.geometry.coordinates;

// Render a Leaflet Marker at [lat, lng]
```

## Reference

### Data Attributes (`SurveillanceAnomaly`)

*   `anomaly_score`: Float. Lower values indicate higher anomaly severity (standard Isolation Forest output).
*   `anomaly_reasons`: Array of strings (e.g., `["AGE:UNUSUAL", "TEMPORAL:SPIKE"]`). Parsed into visual `ReasonBadge` elements.
*   `district`: String. Used to group anomalies in the Choropleth map.
*   `latitude`, `longitude`: Floats. Used to plot precise pins on the Heatmap map.

### Design System (ui-ux-pro-max)

*   **Pulsating Pins**: Rendered using standard Tailwind CSS (`animate-ping`) combined with theme constants (`bg-error`).
*   **Tables**: Uses standard DaisyUI table classes (`table`, `table-sm`) bundled with custom custom tanstack implementations.

### Performance

*   **Memoization**: The sorting operation to slice the top anomalies is wrapped in a `useMemo` hook, ensuring it only recalculates when the underlying `anomalies` array changes.
*   **Turf.js Overhead**: `centerOfMass` calculation is generally fast, but occurs per district overlay. If the GeoJSON becomes exceptionally complex, this calculation should ideally be pre-computed and stored alongside the static GeoJSON file.
