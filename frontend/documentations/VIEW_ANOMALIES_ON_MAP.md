# View Anomalies on Map Feature

## Overview

The "View on Map" feature for anomaly alerts provides clinicians with a direct, seamless transition from a text-based alert to its geographic context on the Disease Map. By bridging the gap between notifications and spatial analysis, this feature enables immediate investigation of flagged anomalies without manual re-configuration of filters.

### Purpose

- **Contextual Investigation**: Instantly see where an anomaly occurred relative to other historical and current cases.
- **Workflow Efficiency**: Reduce the time from alert receipt to spatial analysis through one-click navigation.
- **Explainability**: Provide visual evidence for why a specific diagnosis was flagged as anomalous.
- **Outbreak Monitoring**: Help clinicians identify if a single anomaly is an isolated incident or part of an emerging spatial cluster.

### Target Users

- **Clinicians**: Investigate flagged anomalous cases in their specific area or facility.
- **Public Health Officials**: Monitor for potential outbreak indicators across districts.
- **Surveillance Analysts**: Review system-wide anomaly patterns and spatial distributions.

### Key Benefits

- **Zero-Latency Navigation**: One-click transition from alert to map view.
- **Automated Filtering**: Map automatically applies the correct disease filter and tab selection.
- **Precise Location Tracking**: Map centers exactly on the coordinate of the anomalous diagnosis.
- **Rich Data Highlighting**: Targeted anomalies are visually distinguished with distinct markers and tooltips.

---

## How It Works

### Core Functionality

The feature works by passing the alert's metadata (disease name, latitude, and longitude) through URL query parameters. The map page component reads these parameters on mount and hydrates its internal state to focus on the specific anomaly.

### User Flow

```
┌─────────────────┐
│  Clinician sees │
│  anomaly alert  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Clicks "View   │
│  on map" button │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Map centers    │
│  & zooms into   │
│  coordinate     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Target marker  │
│  pulsates with  │
│  rich tooltip   │
└─────────────────┘
```

### User Interaction Steps

1.  **Discover Alert**: User views an alert card in the Alerts List or opens an Alert Detail Modal.
2.  **Initiate View**: User clicks the "View on map" button (only visible for `ANOMALY` alerts with coordinate metadata).
3.  **Automatic Redirection**: The application navigates to `/map?tab=by-anomaly&disease=...&lat=...&lng=...`.
4.  **Observation**: The map automatically selects the "By anomaly" tab, sets the disease filter, zooms to the coordinate, and highlights the target with a GPS Pin marker.
5.  **Investigation**: User hovers over the pin to see anomaly score, patient name, and reason codes.

### System Integration

- **Alert System**: Supplies the metadata and trigger mechanism.
- **Zustand Stores**: `useSelectedDiseaseStore` and `useMapStore` are updated based on URL parameters.
- **Leaflet/React-Leaflet**: Handles the camera movement (`flyTo`) and marker rendering.
- **Anomaly Detection Service**: Provides the underlying data that the map visualizes.

---

## Implementation

### Technical Requirements

**Dependencies:**
- `next/navigation`: For URL parameter parsing and routing.
- `react-leaflet`: For map rendering and marker control.
- `leaflet`: For custom icon (`L.divIcon`) definitions.
- `zustand`: For global state synchronization.

### Architecture

```
frontend/
├── components/
│   └── clinicians/
│       ├── alerts/
│       │   ├── alert-card.tsx          # Trigger button
│       │   └── alert-detail-modal.tsx  # Trigger button
│       └── map-page/
│           ├── map/
│           │   ├── map-tabs.tsx        # Tab & Disease URL hydration
│           │   └── heatmap-map.tsx     # Map centering & Target marker
│           └── by-anomaly/
│               └── by-anomaly-tab.tsx  # URL parameter clearing logic
```

### Core Components

#### 1. Map Navigation Logic

**Location**: `frontend/components/clinicians/alerts/alert-card.tsx`

The component extracts metadata and builds the search parameters:

```typescript
const handleViewOnMap = (e: React.MouseEvent) => {
  e.stopPropagation();
  const meta = alert.metadata as any;
  const params = new URLSearchParams({ tab: "by-anomaly" });
  if (meta?.disease) params.set("disease", meta.disease);
  if (meta?.latitude) params.set("lat", String(meta.latitude));
  if (meta?.longitude) params.set("lng", String(meta.longitude));
  router.push(`/map?${params.toString()}`);
};
```

#### 2. URL State Hydration

**Location**: `frontend/components/clinicians/map-page/map/map-tabs.tsx`

Synchronizes the `disease` URL parameter with the global store case-insensitively:

```typescript
useEffect(() => {
  const urlDisease = searchParams.get("disease");
  if (urlDisease) {
    const matchedDisease = allowedDiseases.find(
      (d) => d.toLowerCase() === urlDisease.toLowerCase()
    );
    if (matchedDisease) setSelectedDisease(matchedDisease);
  }
}, [searchParams]);
```

#### 3. Dynamic Map Centering

**Location**: `frontend/components/clinicians/map-page/map/heatmap-map.tsx`

Uses a sub-component inside `MapContainer` to access the Leaflet instance:

```typescript
function MapCenterUpdater() {
  const map = useMap();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  useEffect(() => {
    if (lat && lng) {
      map.flyTo([parseFloat(lat), parseFloat(lng)], 16, { animate: true });
    }
  }, [lat, lng, map]);

  return null;
}
```

### Code Examples

#### Case-Insensitive Filtering in `by-anomaly-tab.tsx`

To ensure data is visible even if the URL uses "MEASLES" but the store uses "Measles":

```typescript
const anomalies = useMemo(
  () => selectedDisease === "all"
    ? allAnomalies
    : allAnomalies.filter(a => a.disease.toLowerCase() === selectedDisease.toLowerCase()),
  [allAnomalies, selectedDisease]
);
```

#### Rich Tooltip Data Lookup

Finding the full anomaly object to display detailed tooltips on the target marker:

```typescript
const targetAnomaly = topAnomalies.find(a => 
  Math.abs(a.latitude - targetLat) < 0.0001 && 
  Math.abs(a.longitude - targetLng) < 0.0001
);
```

---

## Configuration

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tab` | `string` | Yes | Must be `by-anomaly` to trigger this feature. |
| `disease` | `string` | No | Filters the map to a specific disease (case-insensitive). |
| `lat` | `float` | No | Latitude coordinate to center the map on. |
| `lng` | `float` | No | Longitude coordinate to center the map on. |

---

## Reference

### File Locations

| File | Purpose |
|------|---------|
| `frontend/components/clinicians/alerts/alert-card.tsx` | "View on map" button in alert cards |
| `frontend/components/clinicians/alerts/alert-detail-modal.tsx` | "View on map" button in details modal |
| `frontend/components/clinicians/map-page/map/map-tabs.tsx` | Tab/Disease URL synchronization |
| `frontend/components/clinicians/map-page/map/heatmap-map.tsx` | Map centering & Target marker rendering |
| `frontend/components/clinicians/map-page/by-anomaly/by-anomaly-tab.tsx` | Disease filtering & URL clearing logic |

### Marker Types

- **Critical Anomaly**: Red pulsating dot (`animate-ping`). Shows Top 5 critical cases.
- **Targeted Anomaly**: Blue/Primary GPS Pin (`animate-bounce`). Highlights the specific case from the alert.

---

## Error Handling

### Common Issues and Solutions

#### Issue: Map does not center
- **Symptoms**: URL contains `lat`/`lng` but map stays on default view.
- **Causes**: Coordinates are outside the valid range or improperly formatted.
- **Solutions**: Ensure coordinates are valid floats. Check browser console for Leaflet errors.

#### Issue: Target marker is missing
- **Symptoms**: Map centers but no marker is visible.
- **Causes**: The anomaly does not match the currently active disease filter (e.g., URL has `disease=Dengue` but alert was for `Measles`).
- **Solutions**: The system automatically clears the disease filter to match the alert, but manual changes to the dropdown will clear the target marker.

---

## Performance Considerations

### Client-Side Map Control
- **`flyTo` Animation**: Uses CSS transitions via Leaflet for smooth performance.
- **Coordinate Precision**: Uses a threshold of `0.0001` for matching markers to ensure reliability across floating-point representations.
- **URL Debouncing**: The system clears URL parameters on tab/disease changes to prevent expensive re-centering operations during general exploration.

---

## Testing Guidelines

### Manual Testing Checklist

- [ ] "View on map" button only appears for `ANOMALY` alerts.
- [ ] Clicking button from Card redirects correctly.
- [ ] Clicking button from Modal redirects correctly.
- [ ] Map smoothly animates (`flyTo`) to the target location.
- [ ] GPS Pin marker appears at the exact location.
- [ ] Tooltip on GPS Pin shows correct data (patient name, score, reasons).
- [ ] Changing disease dropdown clears `lat`/`lng` from URL.
- [ ] Switching tabs clears `lat`/`lng` from URL.
- [ ] Feature handles lowercase/uppercase disease names in URL.

### Test Scenarios

#### Scenario 1: Transition from Alert
**Steps:**
1. Navigate to `/alerts`.
2. Find an "Anomaly" alert.
3. Click "View on map".
**Expected**: Redirect to `/map`, tab "By anomaly" selected, map centered on patient, GPS pin visible.

#### Scenario 2: Context Exit
**Steps:**
1. While viewing an anomaly on the map, change the disease filter to "All diseases".
**Expected**: URL parameters `lat`, `lng`, and `disease` are removed from the browser address bar.

---

## Future Enhancements

- **Reverse Geocoding**: Show the human-readable address in the target marker tooltip.
- **Temporal Sync**: Automatically set the date range filter to match the anomaly's `createdAt` date.
- **Mobile Optimization**: Enhance the `flyTo` behavior for smaller screen viewports.

---

## Related Features

- **Real-Time Alert System**: Generates the anomaly data visualized here.
- **Anomaly Detection & Surveillance**: The ML engine that classifies diagnoses as anomalous.
- **Healthcare Reports**: Detailed tabular view of the same diagnosis records.

---

**Document Version**: 1.0  
**Last Updated**: March 14, 2026  
**Maintainer**: Development Team
