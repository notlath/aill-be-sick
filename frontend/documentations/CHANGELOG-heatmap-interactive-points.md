# Changelog: Heatmap Interactive Points & Detail Modals

**Branch:** `main`
**Date:** April 5, 2026
**Status:** Staged changes

---

## Summary

Added zoom-dependent interactive point markers to the heatmap view across all three map tabs (by disease, by illness group, by anomaly). Points are invisible at default zoom and gradually emerge as clinicians zoom in, enabling investigation of individual cases without cluttering the heatmap aesthetic. Clicking a point opens a detail modal that fetches the full diagnosis report — matching the existing table view behavior.

---

## Problem Statement

1. **No point interactivity in heatmap view** — The heatmap canvas (`leaflet.heat`) renders a density visualization with no way to hover or click individual data points. Clinicians could see density patterns but couldn't investigate specific cases.
2. **Inconsistent experience across tabs** — The "by anomaly" tab had hoverable pulsing markers for top critical cases, but the heatmap view had zero interactivity for regular points.
3. **No drill-down from map** — Clicking on the heatmap did nothing. To see case details, clinicians had to scroll down to the data table and click from there.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `frontend/components/clinicians/map-page/map/interactive-points-layer.tsx` | New | Leaflet layer with zoom-dependent circle markers, hover tooltips, click handlers |
| `frontend/components/clinicians/map-page/map/point-detail-modal.tsx` | New | Generic detail modal that auto-detects data type (anomaly, diagnosis, illness record) and renders appropriate view |
| `frontend/components/clinicians/map-page/map/heatmap-map.tsx` | Modified | Added `InteractivePointsLayer`, `PointDetailModal`, state management, and top-anomaly coordinate exclusion |

---

## Detailed Changes

### 1. New Component — Interactive Points Layer

**Location:** `frontend/components/clinicians/map-page/map/interactive-points-layer.tsx`

A Leaflet layer component that renders `L.circleMarker` elements for each data point with zoom-dependent visibility:

```tsx
const ZOOM_THRESHOLD = 15;

function getZoomOpacity(zoom: number): number {
  if (zoom < ZOOM_THRESHOLD) return 0;
  if (zoom === 15) return 0.15;
  if (zoom === 16) return 0.4;
  return 0.7;
}

function getZoomRadius(zoom: number): number {
  if (zoom < ZOOM_THRESHOLD) return 0;
  if (zoom === 15) return 2;
  if (zoom === 16) return 3;
  return 5;
}
```

**Key features:**
- Points are completely invisible (opacity 0, radius 0) at zoom levels below 15
- Gradually emerge at zoom 15-16 (opacity 0.15-0.4, radius 2-3px)
- Fully visible at zoom 17+ (opacity 0.7, radius 5px)
- Uniform subtle primary theme color via `hsl(var(--p))`
- Sticky tooltips on hover showing disease, district, and date
- Groups points at identical coordinates, showing count in tooltip (e.g., "Dengue (3 cases)")
- Excludes coordinates matching `topAnomalies` (they already have pulsing markers)
- Dynamically updates marker style on `zoomend` event

**Why:** Circle markers are lightweight SVG elements that scale cleanly with zoom. The zoom-dependent approach preserves the heatmap aesthetic at normal zoom while revealing individual points when clinicians intentionally zoom in to investigate.

---

### 2. New Component — Point Detail Modal

**Location:** `frontend/components/clinicians/map-page/map/point-detail-modal.tsx`

A generic detail modal that handles three data types by auto-detection:

```tsx
function isAnomalyPoint(point: PointData): boolean {
  return "anomaly_score" in point && point.anomaly_score != null;
}

function isDiagnosisPoint(point: PointData): boolean {
  return "userId" in point && typeof point.userId === "number";
}

function isIllnessRecord(point: PointData): boolean {
  return "patient_name" in point;
}
```

**Rendering by type:**

| Type | Behavior |
|------|----------|
| **SurveillanceAnomaly** | Inline detail card with anomaly level badge, reason flags, condition, patient, location, date |
| **Diagnosis** | Fetches full diagnosis via `getDiagnosisById()` → renders `ReportDetailModal` (same as table view) |
| **IllnessRecord** | Fetches full diagnosis via `getDiagnosisById()` → renders `ReportDetailModal` (same as table view) |

**Why:** Both Diagnosis and IllnessRecord points now fetch the full diagnosis report and use `ReportDetailModal`, matching the existing table view behavior. This gives clinicians the same rich detail view (SHAP tokens, override controls, notes) regardless of whether they clicked from the map or the table.

---

### 3. Modified — Heatmap Map Component

**Location:** `frontend/components/clinicians/map-page/map/heatmap-map.tsx`

**Before:**
```tsx
<MapContainer ...>
  <TileLayer ... />
  <MapCenterUpdater />
  <HeatmapLayer diagnoses={diagnoses} />
  {/* Only top anomalies have markers */}
</MapContainer>
```

**After:**
```tsx
<MapContainer ...>
  <TileLayer ... />
  <MapCenterUpdater />
  <HeatmapLayer diagnoses={diagnoses} />
  <InteractivePointsLayer
    points={diagnoses}
    excludedCoords={excludedCoords}
    onPointClick={handlePointClick}
  />
  {/* Top anomalies still have pulsing markers */}
</MapContainer>
<PointDetailModal
  isOpen={isDetailModalOpen}
  onClose={handleCloseDetailModal}
  point={selectedPoint}
/>
```

**Type signature change:**
```tsx
// Before
type HeatmapMapProps = {
  diagnoses: GeoPoint[];
  topAnomalies?: SurveillanceAnomaly[];
};

// After — accepts Diagnosis, IllnessRecord, and SurveillanceAnomaly
type HeatmapMapProps = {
  diagnoses: (GeoPoint | SurveillanceAnomaly)[];
  topAnomalies?: SurveillanceAnomaly[];
};
```

**Excluded coordinates logic:**
```tsx
const excludedCoords = useMemo(() => {
  const coords = new Set<string>();
  for (const anomaly of topAnomalies) {
    if (anomaly.latitude != null && anomaly.longitude != null) {
      coords.add(`${anomaly.latitude.toFixed(6)},${anomaly.longitude.toFixed(6)}`);
    }
  }
  return coords;
}, [topAnomalies]);
```

**Why:** Prevents double-rendering markers at coordinates that already have pulsing critical anomaly markers. The `Set` lookup is O(1) for efficient filtering.

---

## UI/UX Improvements

- Heatmap points are invisible at default zoom — no visual clutter
- Points gradually emerge as clinicians zoom in (15-17+)
- Hover tooltips show disease, district, and date at a glance
- Multiple points at same location show count in tooltip (e.g., "Dengue (3 cases)")
- Click any point to open full case detail modal
- Anomaly points show reason flags and anomaly level in the detail modal
- Diagnosis and illness record points show the full `ReportDetailModal` with SHAP tokens, override controls, and notes
- Uniform subtle primary color that doesn't clash with the heatmap gradient

---

## Technical Notes

- **Marker type:** `L.circleMarker` (SVG-based) rather than `L.marker` (icon-based) — lighter weight, scales with zoom, easy dynamic styling
- **Zoom event:** Listens to `zoomend` on the map instance and updates all markers' opacity/radius in a single pass
- **Cleanup:** All markers are removed on unmount via the useEffect cleanup function
- **Coordinate deduplication:** Points at identical lat/lng are grouped together; the tooltip shows the count
- **Portal rendering:** Detail modals use `createPortal(..., document.body)` to avoid z-index issues within the Leaflet container
- **Type compatibility:** The `GeoPoint` type was extended with optional fields (`disease`, `district`, `barangay`, `createdAt`) to support tooltip content. The `HeatmapMapProps.diagnoses` union type accepts `SurveillanceAnomaly` for the by-anomaly tab.

---

## Testing Checklist

- [x] `npx tsc --noEmit` passes in frontend
- [ ] Points are invisible at default zoom (14)
- [ ] Points become faintly visible at zoom 15
- [ ] Points are clearly visible at zoom 16+
- [ ] Hover tooltip shows disease + district + date
- [ ] Multiple points at same location show count in tooltip
- [ ] Clicking a diagnosis point opens `ReportDetailModal`
- [ ] Clicking an illness record point opens `ReportDetailModal`
- [ ] Clicking an anomaly point shows detail card with reason flags
- [ ] Top anomaly coordinates don't have duplicate interactive markers
- [ ] Points update opacity/radius smoothly on zoom
- [ ] Modal closes on backdrop click and close button

---

## Related Changes

- **Surveillance Performance Optimization** (2026-04-05): Anomaly detection pipeline optimization with caching and rescan feature
- **SHAP Anomaly Reason Codes** (2026-04-05): Migrated reason code generation to SHAP TreeExplainer
- **Map Detail Modals Dark Mode** (prior): Dark mode support for map detail modals
