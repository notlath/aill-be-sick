# Disease Map Feature

## Overview

### Purpose
The Disease Map feature provides clinicians with an interactive geographic visualization tool to monitor and analyze disease spread patterns across the Philippines. It transforms raw case data into actionable geographic insights through a choropleth map interface.

### Target Users
- **Clinicians**: Healthcare providers monitoring disease outbreaks in their service areas
- **Public Health Officials**: Officials tracking disease spread and allocating resources
- **Healthcare Administrators**: Decision-makers identifying high-risk zones for intervention

### Key Benefits
- **Visual Pattern Recognition**: Quickly identify disease hotspots and clusters at a glance
- **Data-Driven Decisions**: Support resource allocation and intervention planning with geographic data
- **Real-Time Monitoring**: Track case distribution across zones with interactive exploration
- **Multi-Dimensional Analysis**: View data by disease type, illness clusters, and anomalies

---

## How It Works

### Core Functionality

The Disease Map feature renders an interactive choropleth map using **Leaflet.js** and **React-Leaflet**. Geographic zones are color-coded based on case counts, with darker shades indicating higher case density.

#### Data Flow
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Cases Data     │────▶│  ChoroplethMap   │────▶│  ChoroplethLayer│
│  (Record<string,│     │  (Map Container) │     │  (GeoJSON Render│
│   number>)      │     │                  │     │   + Styling)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ ChoroplethLegend│
                                               │ (Color Scale)   │
                                               └─────────────────┘
```

### User Flow

1. **Page Load**: User navigates to the Disease Map page
2. **Tab Selection**: User selects a view mode (By Disease, By Illness Cluster, or By Anomaly)
3. **Map Rendering**: The choropleth map loads with zone-level case data
4. **Interaction**:
   - **Hover**: Zones highlight and display tooltips with case counts
   - **Click**: Map zooms to the selected zone for detailed view
   - **Pan/Zoom**: Standard map navigation controls
5. **Legend Reference**: Color-coded legend provides case count scale interpretation

### System Integration

| Component | Integration Point |
|-----------|------------------|
| **Backend API** | Fetches case data by zone (future integration) |
| **GeoJSON Source** | `/public/geojson/bagong_silangan.geojson` |
| **Map Tiles** | OpenStreetMap via Leaflet TileLayer |
| **UI Components** | DaisyUI tabs, shadcn/ui Tabs component |

---

## Implementation

### Technical Requirements

#### Dependencies
```json
{
  "react-leaflet": "^4.x",
  "leaflet": "^1.9.x",
  "geojson": "^0.5.x"
}
```

#### Browser Support
- Modern browsers with ES6+ support
- Requires JavaScript enabled
- Minimum viewport: 320px width (mobile-responsive)

### File Structure

```
frontend/
├── app/(app)/(clinician)/map/
│   └── page.tsx                    # Main map page entry point
├── components/clinicians/map-page/
│   ├── map/
│   │   ├── choropleth-map.tsx      # Map container component
│   │   ├── choropleth-map-tabs.tsx # Tab navigation wrapper
│   │   ├── choropleth-layer.tsx    # GeoJSON rendering layer
│   │   └── choropleth-legend.tsx   # Legend control component
│   └── by-disease/
│       └── by-disease-tab.tsx      # By-disease tab content (future)
└── utils/
    └── map-helpers.ts              # getColor() utility function
```

### Component Architecture

#### 1. `page.tsx` - Map Page Entry Point
**Location**: `frontend/app/(app)/(clinician)/map/page.tsx`

```typescript
export default async function MapPage() {
  return (
    <main className="container px-8 pt-12 pb-8 md:px-16 lg:px-24 space-y-8">
      <ChoroplethMapTabs />
    </main>
  );
}
```

**Responsibilities**:
- Renders page header with title and description
- Hosts the `ChoroplethMapTabs` component
- Server-side rendered async component

---

#### 2. `ChoroplethMapTabs` - Tab Navigation
**Location**: `frontend/components/clinicians/map-page/map/choropleth-map-tabs.tsx`

```typescript
const ChoroplethMapTabs = () => {
  return (
    <Tabs defaultValue="by-disease">
      <TabsList>
        <TabsTrigger value="by-disease">By disease</TabsTrigger>
        <TabsTrigger value="by-cluster">By illness cluster</TabsTrigger>
        <TabsTrigger value="by-anomaly">By anomaly</TabsTrigger>
      </TabsList>
      <TabsContent value="by-disease"><ByDiseaseTab /></TabsContent>
      <TabsContent value="by-cluster">{/* Future */}</TabsContent>
      <TabsContent value="by-anomaly">{/* Future */}</TabsContent>
    </Tabs>
  )
}
```

**Features**:
- Three view modes: By Disease, By Illness Cluster, By Anomaly
- Uses shadcn/ui Tabs component
- Default view: "By Disease"

---

#### 3. `ChoroplethMap` - Map Container
**Location**: `frontend/components/clinicians/map-page/map/choropleth-map.tsx`

```typescript
type ChoroplethMapProps = {
  casesData: Record<string, number>;
};

const ChoroplethMap = ({ casesData }: ChoroplethMapProps) => {
  // Fetches GeoJSON, handles loading/error states
  // Renders MapContainer with TileLayer, ChoroplethLayer, ChoroplethLegend
}
```

**Key Features**:
- **Loading States**: Skeleton loader during GeoJSON fetch
- **Error Boundary**: Displays error message on fetch failure
- **Unique Map Keys**: Prevents Leaflet container reuse errors on navigation
- **Fixed Viewport**: Centered on Brgy. Bagong Silangan (14.71, 121.113), zoom level 14

**Map Configuration**:
```typescript
const MAP_CENTER: [number, number] = [14.71, 121.113]; // Brgy. Bagong Silangan
const MAP_ZOOM = 14;
const MAP_STYLE = { height: "600px", width: "100%" };
```

---

#### 4. `ChoroplethLayer` - GeoJSON Rendering Layer
**Location**: `frontend/components/clinicians/map-page/map/choropleth-layer.tsx`

```typescript
interface ChoroplethLayerProps {
  geoData: GeoJsonObject;
  casesData: Record<string, number>;
}
```

**Core Functions**:

| Function | Purpose |
|----------|---------|
| `style(feature)` | Returns Leaflet PathOptions based on case count |
| `highlightFeature(e)` | Increases border weight and fill opacity on hover |
| `resetHighlight(e)` | Restores original style on mouseout |
| `zoomToFeature(e)` | Fits map bounds to selected feature |
| `onEachFeature(feature, layer)` | Binds tooltips and event listeners |

**Styling Logic**:
```typescript
function style(feature?: Feature): PathOptions {
  const name = feature?.properties?.name as string | undefined;
  const count = name ? (casesData[name] ?? 0) : 0;
  const isBoundary = !name;

  return {
    fillColor: isBoundary ? "transparent" : getColor(count),
    weight: isBoundary ? 2 : 2,
    opacity: 1,
    color: isBoundary ? "#9CA3AF" : "white",
    dashArray: isBoundary ? "3" : "10",
    fillOpacity: isBoundary ? 0 : 0.5,
  };
}
```

**Interactive Features**:
- **Tooltips**: Sticky tooltips showing zone name and case count
- **Hover Effects**: Visual feedback with increased border and opacity
- **Click-to-Zoom**: Automatically zooms to selected zone

---

#### 5. `ChoroplethLegend` - Color Scale Legend
**Location**: `frontend/components/clinicians/map-page/map/choropleth-legend.tsx`

```typescript
const ChoroplethLegend = ({ label = "Legend" }: ChoroplethLegendProps) => {
  // Creates Leaflet control at bottom-right position
  // Renders color gradient with grade ranges
}
```

**Legend Configuration**:
```typescript
const grades = [0, 10, 20, 50, 100];
const colors = ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837'];
```

**Visual Output**:
```
┌─────────────────────────┐
│ Legend                  │
│ █ 0–10                  │
│ █ 10–20                 │
│ █ 20–50                 │
│ █ 50–100                │
│ █ 100+                  │
└─────────────────────────┘
```

**Styling**:
- Glassmorphism effect with backdrop blur
- Positioned at bottom-right of map
- Card-style container with rounded corners

---

### Configuration Options

#### Map Center & Zoom
Modify the default viewport in `choropleth-map.tsx`:
```typescript
const MAP_CENTER: [number, number] = [14.71, 121.113]; // [latitude, longitude]
const MAP_ZOOM = 14;
```

#### Color Scale
Adjust the color gradient in `choropleth-legend.tsx` and `utils/map-helpers.ts`:
```typescript
const grades = [0, 10, 20, 50, 100];
const colors = ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837'];
```

#### Map Height
Change the map container height:
```typescript
const MAP_STYLE = { height: "600px", width: "100%" }; // Modify height value
```

---

## Reference

### Props Specification

#### `ChoroplethMap`
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `casesData` | `Record<string, number>` | Yes | Zone name to case count mapping |

#### `ChoroplethLayer`
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `geoData` | `GeoJsonObject` | Yes | GeoJSON feature collection |
| `casesData` | `Record<string, number>` | Yes | Zone name to case count mapping |

#### `ChoroplethLegend`
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | `"Legend"` | Legend title text |

---

### Data Format

#### `casesData` Structure
```typescript
{
  "Zone 1": 15,
  "Zone 2A": 42,
  "Zone 3B": 8,
  // ...
}
```

- **Keys**: Zone names matching GeoJSON feature `properties.name`
- **Values**: Integer case counts

#### GeoJSON Requirements
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Zone 1"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

---

### Error Handling

| Error Scenario | Behavior | Resolution |
|----------------|----------|------------|
| GeoJSON fetch fails | Displays error message with status code | Check `/public/geojson/bagong_silangan.geojson` exists |
| Missing zone data | Displays 0 cases for unknown zones | Ensure `casesData` keys match GeoJSON properties |
| Map container reuse | Generates unique key per mount | Automatic via `useId()` and mount counter |
| Legend cleanup on navigation | Graceful removal with try-catch | Built-in error suppression |

---

### Performance Considerations

#### Optimization Strategies
1. **Static Primitives**: `MAP_CENTER`, `MAP_ZOOM`, `MAP_STYLE` hoisted outside component
2. **Unique Keys**: Prevents expensive Leaflet re-initialization
3. **Conditional Rendering**: `isMounted` guard prevents SSR mismatches
4. **Lazy GeoJSON Loading**: Fetches after initial render

#### Limitations
- **GeoJSON Size**: Large files may cause slow initial load (consider simplification)
- **Feature Count**: High feature counts may impact hover performance
- **Tile Loading**: Dependent on OpenStreetMap CDN availability

---

### Future Enhancements

#### Planned Features
- [ ] **By Illness Cluster Tab**: Aggregate view by disease categories
- [ ] **By Anomaly Tab**: Highlight statistical outliers and unusual patterns
- [ ] **DaisyUI Skeleton**: Replace loading state with skeleton screens
- [ ] **Backend Integration**: Fetch real-time case data from API
- [ ] **Filter Controls**: Date range, disease type, zone selectors
- [ ] **Export Functionality**: Download map as PNG/PDF
- [ ] **Cluster Markers**: Show individual case locations on zoom

#### Extensibility Points
```typescript
// Add new tab content in choropleth-map-tabs.tsx
<TabsContent value="by-cluster">
  <ByClusterTab /> {/* New component */}
</TabsContent>

// Customize tooltip content in choropleth-layer.tsx
layer.bindTooltip(`
  <strong>${name}</strong><br/>
  ${count} cases<br/>
  {/* Add more data fields here */}
`, { sticky: true });
```

---

## Related Features

| Feature | Description |
|---------|-------------|
| **Patient Management** | Source of case data for map visualization |
| **Disease Analytics** | Statistical analysis complementing geographic view |
| **Reporting Dashboard** | Aggregated reports using map-derived insights |

---

## Appendix

### Color Scale Reference

| Grade Range | Hex Color | Visual |
|-------------|-----------|--------|
| 0–10 | `#ffffcc` | Light yellow |
| 10–20 | `#c2e699` | Light green |
| 20–50 | `#78c679` | Medium green |
| 50–100 | `#31a354` | Dark green |
| 100+ | `#006837` | Darkest green |

### Leaflet Events Reference

| Event | Handler | Description |
|-------|---------|-------------|
| `mouseover` | `highlightFeature` | Triggered when cursor enters feature |
| `mouseout` | `resetHighlight` | Triggered when cursor leaves feature |
| `click` | `zoomToFeature` | Triggered on feature click |

### External Resources

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [GeoJSON Specification](https://geojson.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)

---

**Version**: 1.0  
**Last Updated**: March 6, 2026  
**Maintainer**: AI'll Be Sick Development Team
