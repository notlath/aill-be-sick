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

The Disease Map feature renders an interactive choropleth map using **Leaflet.js** and **React-Leaflet**. Geographic zones are color-coded based on case counts, with darker shades indicating higher case density. Each disease has a unique color scale for visual differentiation.

#### Data Flow
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Diagnosis DB   │────▶│  ByDiseaseTab    │────▶│  ChoroplethMap  │
│  (Prisma)       │     │  (Filter & Stats)│     │  (Map Container)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ ChoroplethLayer │
                                               │ (GeoJSON Render │
                                               │  + Styling)     │
                                               └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ ChoroplethLegend│
                                               │ (Color Scale)   │
                                               └─────────────────┘
```

### User Flow

1. **Page Load**: User navigates to the Disease Map page
2. **Filter Selection**: User selects disease type and date range
3. **Data Fetching**: Cases data is fetched from the database based on filters
4. **Map Rendering**: The choropleth map loads with zone-level case data
5. **Interaction**:
   - **Hover**: Zones highlight and display tooltips with case counts
   - **Click**: Map zooms to the selected zone for detailed view
   - **Pan/Zoom**: Standard map navigation controls
6. **Statistics Review**: User views summary statistics (total cases, most affected area, etc.)
7. **Legend Reference**: Color-coded legend provides case count scale interpretation

### System Integration

| Component | Integration Point |
|-----------|------------------|
| **Backend API** | `getDiseaseDiagnosesByDistricts()` - Server action fetching from Prisma |
| **State Management** | Zustand stores for disease selection and date range |
| **GeoJSON Source** | `/public/geojson/bagong_silangan.geojson` |
| **Map Tiles** | OpenStreetMap via Leaflet TileLayer |
| **UI Components** | shadcn/ui Tabs, Select, Card, DatePicker |

---

## Implementation

### Technical Requirements

#### Dependencies
```json
{
  "react-leaflet": "^4.x",
  "leaflet": "^1.9.x",
  "geojson": "^0.5.x",
  "chroma-js": "^2.x",
  "zustand": "^5.x",
  "@prisma/client": "^5.x"
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
│   └── page.tsx                          # Main map page entry point
├── components/clinicians/map-page/
│   ├── map/
│   │   ├── choropleth-map.tsx            # Map container component
│   │   ├── choropleth-map-tabs.tsx       # Tab navigation wrapper
│   │   ├── choropleth-layer.tsx          # GeoJSON rendering layer
│   │   └── choropleth-legend.tsx         # Legend control component
│   ├── by-disease/
│   │   └── by-disease-tab.tsx            # By-disease tab content
│   ├── disease-select.tsx                # Disease filter dropdown
│   └── date-range-filter.tsx             # Date range picker
├── stores/
│   ├── use-selected-disease-store.ts     # Zustand store for disease selection
│   └── use-date-range-store.ts           # Zustand store for date range
├── utils/
│   ├── map-helpers.ts                    # getColor() and color scale utilities
│   └── diagnosis.ts                      # Server actions for diagnosis data
└── prisma/
    └── prisma.ts                         # Prisma client instance
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

#### 3. `ByDiseaseTab` - Disease Filter & Statistics
**Location**: `frontend/components/clinicians/map-page/by-disease/by-disease-tab.tsx`

```typescript
const ByDiseaseTab = () => {
  const { selectedDisease, setSelectedDisease } = useSelectedDiseaseStore();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();
  const [casesData, setCasesData] = useState<Record<string, number>>({});
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  
  // Fetches data based on disease and date filters
  // Computes statistics: totalCases, affectedDistrictsCount, highestCases, etc.
}
```

**Key Features**:
- **Disease Selection**: Dropdown to filter by specific disease or "All diseases"
- **Date Range Filter**: Start and end date pickers for temporal filtering
- **Statistics Cards**: Four summary cards showing key metrics
- **Loading States**: Skeleton loaders during data fetch and map rendering
- **Data Transformation**: Converts grouped diagnosis data to zone-case mapping

**Statistics Computed**:
| Metric | Description |
|--------|-------------|
| `totalCases` | Sum of all cases for selected filters |
| `affectedDistrictsCount` | Number of districts with at least 1 case |
| `highestCases` | Maximum cases in a single district |
| `highestDistrict` | Name of district with most cases |
| `averageCases` | Average cases per affected district |

---

#### 4. `ChoroplethMap` - Map Container
**Location**: `frontend/components/clinicians/map-page/map/choropleth-map.tsx`

```typescript
type ChoroplethMapProps = {
  casesData: Record<string, number>;
  geoData: GeoJsonObject;
  diagnoses: Diagnosis[];
};

const ChoroplethMap = ({ casesData, geoData, diagnoses }: ChoroplethMapProps) => {
  // Generates unique key to prevent Leaflet container reuse errors
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

#### 5. `ChoroplethLayer` - GeoJSON Rendering Layer
**Location**: `frontend/components/clinicians/map-page/map/choropleth-layer.tsx`

```typescript
interface ChoroplethLayerProps {
  geoData: GeoJsonObject;
  casesData: Record<string, number>;
  diagnoses: Diagnosis[];
}
```

**Core Functions**:

| Function | Purpose |
|----------|---------|
| `style(feature)` | Returns Leaflet PathOptions based on case count and disease |
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
    fillColor: isBoundary ? "transparent" : getColor(count, selectedDisease),
    weight: isBoundary ? 2 : 2,
    opacity: 1,
    color: isBoundary ? "#9CA3AF" : "white",
    dashArray: isBoundary ? "3" : "10",
    fillOpacity: isBoundary ? 0 : 0.7,
  };
}
```

**Interactive Features**:
- **Tooltips**: Sticky tooltips showing zone name and case count
- **Hover Effects**: Visual feedback with increased border and opacity
- **Click-to-Zoom**: Automatically zooms to selected zone
- **Disease-Specific Colors**: Each disease has unique color scale

---

#### 6. `ChoroplethLegend` - Color Scale Legend
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

#### Disease Color Scales
Adjust disease-specific color gradients in `utils/map-helpers.ts`:
```typescript
export const DISEASE_COLOR_SCALES: Record<DiseaseType, chroma.Scale> = {
  all: chroma.scale(["#EE9697", "#8C1719"]).mode("lab").domain([0, 100]),
  Dengue: chroma.scale(["#FCBA9C", "#8B2F04"]).mode("lab").domain([0, 100]),
  Pneumonia: chroma.scale(["#0088CC", "#004466"]).mode("lab").domain([0, 100]),
  Typhoid: chroma.scale(["#6CAFB2", "#234143"]).mode("lab").domain([0, 100]),
  Impetigo: chroma.scale(["#BD9FE5", "#421F70"]).mode("lab").domain([0, 100]),
  Diarrhea: chroma.scale(["#FC9E73", "#8C2E03"]).mode("lab").domain([0, 100]),
  Measles: chroma.scale(["#FE72FB", "#650163"]).mode("lab").domain([0, 100]),
  Influenza: chroma.scale(["#4AC3D3", "#185A63"]).mode("lab").domain([0, 100]),
};
```

#### Color Thresholds
Modify the discrete color thresholds in `getColor()`:
```typescript
// Current thresholds: 0, 1, 10, 20, 50, 100
if (count >= 100) return scale(100).hex();
if (count >= 50) return scale(75).hex();
if (count >= 20) return scale(50).hex();
if (count >= 10) return scale(25).hex();
if (count >= 1) return scale(5).hex();
```

#### Map Height
Change the map container height:
```typescript
const MAP_STYLE = { height: "600px", width: "100%" }; // Modify height value
```

---

## Reference

### Props Specification

#### `ByDiseaseTab`
No props - uses Zustand stores for state management.

#### `ChoroplethMap`
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `casesData` | `Record<string, number>` | Yes | Zone name to case count mapping |
| `geoData` | `GeoJsonObject` | Yes | GeoJSON feature collection |
| `diagnoses` | `Diagnosis[]` | Yes | Raw diagnosis data for future features |

#### `ChoroplethLayer`
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `geoData` | `GeoJsonObject` | Yes | GeoJSON feature collection |
| `casesData` | `Record<string, number>` | Yes | Zone name to case count mapping |
| `diagnoses` | `Diagnosis[]` | Yes | Raw diagnosis data for future features |

#### `ChoroplethLegend`
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | `"Legend"` | Legend title text |

#### `DiseaseSelect`
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `DiseaseType` | Yes | Currently selected disease |
| `onValueChange` | `(disease: DiseaseType) => void` | Yes | Callback on disease change |

#### `DateRangeFilter`
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `startDate` | `string` | Yes | Start date (ISO format) |
| `endDate` | `string` | Yes | End date (ISO format) |
| `onStartDateChange` | `(date: string) => void` | Yes | Callback on start date change |
| `onEndDateChange` | `(date: string) => void` | Yes | Callback on end date change |

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

- **Keys**: District/zone names matching GeoJSON feature `properties.name`
- **Values**: Integer case counts filtered by disease and date range

#### `Diagnosis` Object Structure
```typescript
{
  id: string;
  disease: "DENGUE" | "PNEUMONIA" | "TYPHOID" | "IMPETIGO" | "DIARRHEA" | "MEASLES" | "INFLUENZA";
  district: string | null;
  zone: string | null;
  userId: string;
  createdAt: Date;
  // ... other fields
}
```

#### Grouped Data Response (from `getDiseaseDiagnosesByDistricts`)
```typescript
{
  diagnoses: Diagnosis[];        // Raw diagnosis records
  grouped: Array<{
    district: string | null;
    _count: { id: number };      // Case count per district
  }>;
}
```

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

- **Root**: Must be a `FeatureCollection`
- **Features**: Array of `Feature` objects with `Polygon` or `MultiPolygon` geometry
- **Properties**: Each feature must have a `name` property for matching with `casesData` keys

---

### Error Handling

| Error Scenario | Behavior | Resolution |
|----------------|----------|------------|
| GeoJSON fetch fails | Displays error message with status code | Check `/public/geojson/bagong_silangan.geojson` exists |
| Database query fails | Returns error object, shows error message | Verify Prisma connection and database schema |
| Missing zone data | Displays 0 cases for unknown zones | Ensure `casesData` keys match GeoJSON properties |
| Map container reuse | Generates unique key per mount | Automatic via `useId()` and mount counter |
| Legend cleanup on navigation | Graceful removal with try-catch | Built-in error suppression |
| Invalid date range | Query returns empty results | Date validation handled by DatePicker component |

---

### Performance Considerations

#### Optimization Strategies
1. **Static Primitives**: `MAP_CENTER`, `MAP_ZOOM`, `MAP_STYLE` hoisted outside component
2. **Unique Keys**: Prevents expensive Leaflet re-initialization on tab switch
3. **Conditional Rendering**: `isMounted` guard prevents SSR mismatches
4. **Memoized Statistics**: `useMemo` for computing stats from `casesData`
5. **Server Actions with Caching**: `getDiseaseDiagnosesByDistricts` uses Next.js cache
6. **Parallel Queries**: Diagnoses and grouped data fetched with `Promise.all`

#### Limitations
- **GeoJSON Size**: Large files may cause slow initial load (consider simplification)
- **Feature Count**: High feature counts may impact hover performance
- **Tile Loading**: Dependent on OpenStreetMap CDN availability
- **Date Range Queries**: Large date ranges may return slow database queries

---

### Future Enhancements

#### Planned Features
- [ ] **By Illness Cluster Tab**: Aggregate view by disease categories (respiratory, vector-borne, etc.)
- [ ] **By Anomaly Tab**: Highlight statistical outliers and unusual patterns
- [ ] **Patient Details Panel**: Show individual patient records when clicking a zone
- [ ] **Filter Controls**: Additional filters for age group, gender, zone selectors
- [ ] **Export Functionality**: Download map as PNG/PDF, export data as CSV
- [ ] **Cluster Markers**: Show individual case locations on zoom
- [ ] **Time Series Animation**: Animate disease spread over time
- [ ] **Comparison Mode**: Compare two time periods or diseases side-by-side

#### Extensibility Points
```typescript
// Add new tab content in choropleth-map-tabs.tsx
<TabsContent value="by-cluster">
  <ByClusterTab /> {/* New component */}
</TabsContent>

// Customize tooltip content in choropleth-layer.tsx
(layer as L.Path).bindTooltip(`
  <strong>${name}</strong><br/>
  ${count} cases<br/>
  {/* Add more data fields here */}
`, { sticky: true });

// Add new disease color scale in utils/map-helpers.ts
export const DISEASE_COLOR_SCALES: Record<DiseaseType, chroma.Scale> = {
  // Add new disease here
};
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

Each disease has a unique color scale using chroma-js with LAB color mode for perceptually uniform gradients.

#### Disease Color Scales

| Disease | Color Range | Hex Start → End |
|---------|-------------|-----------------|
| **All Diseases** | Red gradient | `#EE9697` → `#8C1719` |
| **Dengue** | Orange → Brown | `#FCBA9C` → `#8B2F04` |
| **Pneumonia** | Light Blue → Dark Blue | `#0088CC` → `#004466` |
| **Typhoid** | Teal → Dark Teal | `#6CAFB2` → `#234143` |
| **Impetigo** | Light Purple → Dark Purple | `#BD9FE5` → `#421F70` |
| **Diarrhea** | Orange → Brown | `#FC9E73` → `#8C2E03` |
| **Measles** | Magenta → Dark Magenta | `#FE72FB` → `#650163` |
| **Influenza** | Cyan → Dark Cyan | `#4AC3D3` → `#185A63` |

#### Discrete Color Thresholds

Colors are applied at specific case count thresholds for consistent visual interpretation:

| Case Count | Scale Position | Description |
|------------|----------------|-------------|
| 0 | `scale(0)` | Lightest shade (near white) |
| 1–9 | `scale(5)` | Very light shade |
| 10–19 | `scale(25)` | Light shade |
| 20–49 | `scale(50)` | Medium shade |
| 50–99 | `scale(75)` | Dark shade |
| 100+ | `scale(100)` | Darkest shade |

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
- [chroma-js Documentation](https://gka.github.io/chroma.js/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

---

**Version**: 2.0
**Last Updated**: March 6, 2026
**Maintainer**: AI'll Be Sick Development Team
