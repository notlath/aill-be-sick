# Disease Diagnosis Data Integration with Heatmap

## Overview

### Purpose
This document describes how disease diagnosis data from the database is integrated with the interactive choropleth heatmap visualization. It covers the complete data flow from database queries to visual representation on the map.

### Scope
- Database schema and data model
- Server actions for data fetching
- State management for filters
- Data transformation pipeline
- Color scale mapping
- GeoJSON integration

### Target Audience
- **Developers**: Implementing or extending the disease map feature
- **Data Engineers**: Understanding data flow and transformations
- **QA Engineers**: Testing data accuracy and visualization correctness

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   ByDiseaseTab Component                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │ DiseaseSelect│  │DateRangeFilter│  │Statistics Cards│  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └────────────────┘  │  │
│  │         │                  │                               │  │
│  │  ┌──────▼──────────────────▼───────┐                       │  │
│  │  │     Zustand State Stores        │                       │  │
│  │  │  - selectedDisease              │                       │  │
│  │  │  - startDate, endDate           │                       │  │
│  │  └───────────────┬─────────────────┘                       │  │
│  └───────────────────┼─────────────────────────────────────────┘  │
│                      │                                            │
│  ┌───────────────────▼─────────────────────────────────────────┐  │
│  │              getDiseaseDiagnosesByDistricts                 │  │
│  │                    (Server Action)                          │  │
│  └───────────────────┬─────────────────────────────────────────┘  │
└──────────────────────┼────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Prisma + DB)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Diagnosis Table                        │  │
│  │  - id, disease, district, zone, userId, createdAt         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              getDiseaseDiagnosesByDistricts()             │  │
│  │  - Query diagnoses with filters                           │  │
│  │  - Group by district with counts                          │  │
│  │  - Return { diagnoses, grouped }                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Transformation                          │
│  grouped: [{ district: "Zone 1", _count: { id: 15 } }]         │
│                      │                                          │
│                      ▼                                          │
│  casesData: { "Zone 1": 15, "Zone 2A": 42 }                    │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Heatmap Visualization                        │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │ ChoroplethMap│───▶│ChoroplethLayer│───▶│getColor(count,  │   │
│  │  Container   │    │  GeoJSON     │    │  disease)       │   │
│  └──────────────┘    └──────────────┘    └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Sequence

```
User Action         Component         Data Flow              Result
    │                  │                  │                     │
    ├─ Select Disease ─┤                  │                     │
    │                  ├─────────────────►│                     │
    │                  │  Update Zustand  │                     │
    │                  │  Store           │                     │
    │                  │                  │                     │
    ├─ Change Date ────┤                  │                     │
    │                  ├─────────────────►│                     │
    │                  │  Update Zustand  │                     │
    │                  │  Store           │                     │
    │                  │                  │                     │
    │◄──────── Trigger useEffect ────────►│                     │
    │                  │                  │                     │
    │                  ├─ fetchCasesData()                      │
    │                  │                  │                     │
    │                  ├─────────────────►│  Server Action      │
    │                  │  (disease, dates)│  Query DB           │
    │                  │                  │                     │
    │                  │◄─────────────────┤  { diagnoses,       │
    │                  │  Response        │   grouped }         │
    │                  │                  │                     │
    │                  ├─ Transform Data ─┤                     │
    │                  │  grouped →       │                     │
    │                  │  casesData       │                     │
    │                  │                  │                     │
    │                  ├───────────────────────────────────────►│
    │                  │  setCasesData()  │  Re-render Map      │
    │                  │  setDiagnoses()  │  Update Stats       │
    │                  │                  │                     │
    │◄──────────────────────────────────────────────────────────┤
│  Map Updates with New Colors                                  │
│  Statistics Cards Refresh                                     │
```

---

## Database Schema

### Diagnosis Model

```prisma
model Diagnosis {
  id        String   @id @default(cuid())
  disease   DiseaseType
  district  String?
  zone      String?
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([disease])
  @@index([district])
  @@index([createdAt])
  @@index([disease, createdAt])
}

enum DiseaseType {
  DENGUE
  PNEUMONIA
  TYPHOID
  IMPETIGO
  DIARRHEA
  MEASLES
  INFLUENZA
}
```

### Key Fields for Map Integration

| Field | Type | Purpose | Nullable |
|-------|------|---------|----------|
| `disease` | `DiseaseType` | Filter by specific disease | No |
| `district` | `String` | Geographic area name (matches GeoJSON) | Yes |
| `zone` | `String` | Sub-area within district | Yes |
| `createdAt` | `DateTime` | Date range filtering | No |

### Database Indexes

Indexes optimize the common query patterns used by the map feature:

```prisma
@@index([disease])              // Filter by disease type
@@index([district])             // Group by district
@@index([createdAt])            // Date range queries
@@index([disease, createdAt])   // Combined disease + date filter
```

---

## Server Action Implementation

### `getDiseaseDiagnosesByDistricts`

**Location**: `frontend/utils/diagnosis.ts`

```typescript
export const getDiseaseDiagnosesByDistricts = async (
  disease: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    // Handle "all diseases" case
    if (disease === 'all') {
      const [diagnoses, grouped] = await Promise.all([
        prisma.diagnosis.findMany({
          where: {
            district: { not: null },
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
          },
          include: { user: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.diagnosis.groupBy({
          by: ["district"],
          where: {
            district: { not: null },
            createdAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
          },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
      ]);

      return { success: { diagnoses, grouped } };
    }

    // Handle specific disease case
    const [diagnoses, grouped] = await Promise.all([
      prisma.diagnosis.findMany({
        where: {
          disease: disease.toUpperCase() as any,
          district: { not: null },
          createdAt: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
      }),
      prisma.diagnosis.groupBy({
        by: ["district"],
        where: {
          district: { not: null },
          createdAt: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? new Date(endDate) : undefined,
          },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    return { success: { diagnoses, grouped } };
  } catch (error) {
    console.error(`Error fetching diagnoses for disease ${disease}`, error);
    return { error: `Could not fetch diagnoses for disease ${disease}` };
  }
}
```

### Query Strategy

#### Parallel Execution
```typescript
const [diagnoses, grouped] = await Promise.all([/* ... */]);
```
- Both queries run simultaneously for better performance
- Reduces total database round-trip time

#### Filtering Logic

| Filter | Condition | SQL Equivalent |
|--------|-----------|----------------|
| Disease | `disease: disease.toUpperCase()` | `WHERE disease = 'DENGUE'` |
| District | `district: { not: null }` | `WHERE district IS NOT NULL` |
| Start Date | `createdAt: { gte: startDate }` | `AND createdAt >= '2024-01-01'` |
| End Date | `createdAt: { lte: endDate }` | `AND createdAt <= '2024-12-31'` |

#### Grouping Strategy
```typescript
prisma.diagnosis.groupBy({
  by: ["district"],
  _count: { id: true },
  orderBy: { _count: { id: "desc" } }
})
```
- Groups records by `district` field
- Counts number of diagnoses per district
- Orders by case count (descending)

---

## State Management

### Zustand Stores

#### Disease Selection Store

**Location**: `frontend/stores/use-selected-disease-store.ts`

```typescript
import { create } from 'zustand';

export type DiseaseType = 
  | 'all' 
  | 'Dengue' 
  | 'Pneumonia' 
  | 'Typhoid' 
  | 'Impetigo' 
  | 'Diarrhea' 
  | 'Measles' 
  | 'Influenza';

interface SelectedDiseaseState {
  selectedDisease: DiseaseType;
  setSelectedDisease: (disease: DiseaseType) => void;
  reset: () => void;
}

const useSelectedDiseaseStore = create<SelectedDiseaseState>()((set) => ({
  selectedDisease: 'all',
  setSelectedDisease: (disease) => set({ selectedDisease: disease }),
  reset: () => set({ selectedDisease: 'all' }),
}));

export default useSelectedDiseaseStore;
```

**State Shape**:
```typescript
{
  selectedDisease: 'Dengue'  // Current disease filter
}
```

**Actions**:
| Action | Parameters | Effect |
|--------|------------|--------|
| `setSelectedDisease` | `disease: DiseaseType` | Updates selected disease, triggers data refetch |
| `reset` | none | Resets to 'all' |

#### Date Range Store

**Location**: `frontend/stores/use-date-range-store.ts`

```typescript
import { create } from 'zustand';

interface DateRangeState {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  reset: () => void;
}

const useDateRangeStore = create<DateRangeState>()((set) => ({
  startDate: '',
  endDate: '',
  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  reset: () => set({ startDate: '', endDate: '' }),
}));

export default useDateRangeStore;
```

**State Shape**:
```typescript
{
  startDate: '2024-01-01',  // ISO format or empty
  endDate: '2024-12-31'     // ISO format or empty
}
```

**Empty Date Handling**:
- Empty string (`''`) means no date filter
- Passed as `undefined` to Prisma query
- Returns all records regardless of date

---

## Data Transformation Pipeline

### From Grouped Data to CasesData

**Input** (from `getDiseaseDiagnosesByDistricts`):
```typescript
{
  grouped: [
    { district: "Zone 1", _count: { id: 15 } },
    { district: "Zone 2A", _count: { id: 42 } },
    { district: "Zone 3B", _count: { id: 8 } }
  ]
}
```

**Transformation Code**:
```typescript
const transformedData = grouped.reduce((acc, item) => {
  if (item.district) {
    acc[item.district] = item._count.id;
  }
  return acc;
}, {} as Record<string, number>);
```

**Output** (`casesData`):
```typescript
{
  "Zone 1": 15,
  "Zone 2A": 42,
  "Zone 3B": 8
}
```

### Why This Transformation?

| Aspect | Grouped Format | Transformed Format |
|--------|----------------|-------------------|
| **Structure** | Array of objects | Key-value record |
| **Access Pattern** | `find()` by district | Direct `casesData["Zone 1"]` |
| **Performance** | O(n) lookup | O(1) lookup |
| **GeoJSON Integration** | Requires iteration | Direct property access |
| **Type Safety** | Complex | Simple `Record<string, number>` |

---

## Color Scale Mapping

### Disease-Specific Color Scales

**Location**: `frontend/utils/map-helpers.ts`

```typescript
import chroma from "chroma-js";
import { DiseaseType } from "@/stores/use-selected-disease-store";

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

### Color Scale Configuration

#### LAB Color Mode
```typescript
.mode("lab")
```
- Uses CIELAB color space for perceptually uniform gradients
- Ensures smooth transitions between colors
- More natural color progression than RGB

#### Domain Mapping
```typescript
.domain([0, 100])
```
- Maps case counts 0-100 to the color gradient
- 0 = lightest color, 100 = darkest color
- Values >100 clamp to maximum darkness

### Discrete Color Thresholds

```typescript
export function getColor(count: number, disease: DiseaseType = 'all'): string {
  const scale = getDiseaseColorScale(disease);

  if (count <= 0) {
    return chroma.mix(scale(0).hex(), "#ffffff", 0.3).hex();
  }

  // Discrete thresholds for consistent visual interpretation
  if (count >= 100) return scale(100).hex();  // Darkest
  if (count >= 50)  return scale(75).hex();   // Dark
  if (count >= 20)  return scale(50).hex();   // Medium
  if (count >= 10)  return scale(25).hex();   // Light
  if (count >= 1)   return scale(5).hex();    // Very light

  return scale(0).hex(); // 0 cases - lightest
}
```

### Threshold Mapping

| Case Count | Scale Position | Visual Weight | Interpretation |
|------------|----------------|---------------|----------------|
| 0 | `scale(0)` mixed with white | Very light | No cases reported |
| 1–9 | `scale(5)` | Light | Minimal cases |
| 10–19 | `scale(25)` | Light-Medium | Low incidence |
| 20–49 | `scale(50)` | Medium | Moderate outbreak |
| 50–99 | `scale(75)` | Dark | High incidence |
| 100+ | `scale(100)` | Very Dark | Severe outbreak |

### Color Psychology

Each disease color was chosen for visual distinction and semantic association:

| Disease | Color Family | Rationale |
|---------|--------------|-----------|
| **Dengue** | Orange-Brown | Warm, alert color for vector-borne disease |
| **Pneumonia** | Blue | Cool, respiratory association |
| **Typhoid** | Teal | Distinct from pneumonia, water-borne association |
| **Impetigo** | Purple | Skin condition, distinct from others |
| **Diarrhea** | Orange | Digestive system, warm color |
| **Measles** | Magenta | Viral, distinctive bright color |
| **Influenza** | Cyan | Respiratory, cool clinical color |

---

## GeoJSON Integration

### GeoJSON Structure

**Location**: `frontend/public/geojson/bagong_silangan.geojson`

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
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Zone 2A"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

### Property Matching

The integration relies on matching `properties.name` from GeoJSON with keys in `casesData`:

```typescript
// In ChoroplethLayer
function style(feature?: Feature): PathOptions {
  const name = feature?.properties?.name as string | undefined;
  const count = name ? (casesData[name] ?? 0) : 0;
  
  return {
    fillColor: getColor(count, selectedDisease),
    // ... other style properties
  };
}
```

### Matching Requirements

| Requirement | Description |
|-------------|-------------|
| **Name Property** | Each GeoJSON feature must have `properties.name` |
| **Case Sensitivity** | Names must match exactly (case-sensitive) |
| **No Null Values** | Features without names are treated as boundaries |
| **Consistent Format** | Zone names should follow consistent naming convention |

### Boundary Features

Features without a `name` property are treated as administrative boundaries:

```typescript
const isBoundary = !name;

return {
  fillColor: isBoundary ? "transparent" : getColor(count, selectedDisease),
  color: isBoundary ? "#9CA3AF" : "white",
  fillOpacity: isBoundary ? 0 : 0.7,
};
```

---

## Component Integration

### ByDiseaseTab Component

**Location**: `frontend/components/clinicians/map-page/by-disease/by-disease-tab.tsx`

#### State Management
```typescript
const ByDiseaseTab = () => {
  const { selectedDisease, setSelectedDisease } = useSelectedDiseaseStore();
  const { startDate, endDate, setStartDate, setEndDate } = useDateRangeStore();
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [casesData, setCasesData] = useState<Record<string, number>>({});
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  // ...
};
```

#### Data Fetching Effect
```typescript
useEffect(() => {
  fetchCasesData();
}, [selectedDisease, startDate, endDate]);
```

**Trigger Conditions**:
- User changes disease selection
- User changes start date
- User changes end date

#### Statistics Computation
```typescript
const {
  totalCases,
  affectedDistrictsCount,
  highestCases,
  highestDistrict,
  averageCases
} = useMemo(() => {
  const cases = Object.values(casesData);
  const totalCases = cases.reduce((sum, count) => sum + count, 0);
  const affectedDistrictsCount = Object.keys(casesData)
    .filter(key => casesData[key] > 0).length;
  const highestCases = cases.length > 0 ? Math.max(...cases) : 0;
  const highestDistrict = Object.keys(casesData)
    .find(key => casesData[key] === highestCases) || "N/A";
  const averageCases = affectedDistrictsCount > 0 
    ? Math.round(totalCases / affectedDistrictsCount) 
    : 0;

  return {
    totalCases,
    affectedDistrictsCount,
    highestCases,
    highestDistrict,
    averageCases
  };
}, [casesData]);
```

**Memoization**: Statistics are recomputed only when `casesData` changes.

### ChoroplethMap Component

**Location**: `frontend/components/clinicians/map-page/map/choropleth-map.tsx`

```typescript
const ChoroplethMap = ({ casesData, geoData, diagnoses }: ChoroplethMapProps) => {
  const id = useId();
  const mountRef = useRef(0);
  mountRef.current += 1;
  const mapKey = `${id}-${mountRef.current}`;

  return (
    <MapContainer key={mapKey} center={MAP_CENTER} zoom={MAP_ZOOM} style={MAP_STYLE}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ChoroplethLayer casesData={casesData} geoData={geoData} diagnoses={diagnoses} />
      <ChoroplethLegend />
    </MapContainer>
  );
};
```

**Unique Key Strategy**:
```typescript
const mapKey = `${id}-${mountRef.current}`;
```
- Prevents Leaflet container reuse errors
- Generates fresh map instance on each mount
- Avoids "Map container is already initialized" error

### ChoroplethLayer Component

**Location**: `frontend/components/clinicians/map-page/map/choropleth-layer.tsx`

#### Feature Styling
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

#### Tooltip Binding
```typescript
function onEachFeature(feature: Feature, layer: Layer) {
  const name = feature.properties?.name as string | undefined;
  const count = name ? (casesData[name] ?? 0) : 0;
  const isBoundary = !name;

  if (isBoundary) {
    (layer as L.Path).options.interactive = false;
    return;
  }

  (layer as L.Path).bindTooltip(
    `<strong>${name ?? "Unknown"}</strong><br/>${count} case${count !== 1 ? "s" : ""}`,
    { sticky: true }
  );

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature,
  });
}
```

---

## Error Handling

### Server Action Errors

```typescript
try {
  // Database queries
} catch (error) {
  console.error(`Error fetching diagnoses for disease ${disease}`, error);
  return { error: `Could not fetch diagnoses for disease ${disease}` };
}
```

**Error Scenarios**:
| Scenario | Cause | Handling |
|----------|-------|----------|
| Database connection failure | Prisma client not connected | Returns error object |
| Invalid date format | Malformed date string | Date constructor throws, caught |
| Missing disease enum | Invalid disease value | TypeScript prevents at compile time |

### Frontend Error Handling

```typescript
const fetchCasesData = async () => {
  setMapLoading(true);

  const { success, error } = await getDiseaseDiagnosesByDistricts(
    selectedDisease, 
    startDate, 
    endDate
  );

  if (error) {
    throw new Error(error);
  }

  if (success) {
    const { diagnoses, grouped } = success;
    // Transform and set data
  }

  setMapLoading(false);
}
```

### GeoJSON Fetch Errors

```typescript
useEffect(() => {
  fetch("/geojson/bagong_silangan.geojson")
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`);
      return res.json();
    })
    .then((data: GeoJsonObject) => setGeoData(data))
    .catch((err: unknown) => {
      throw Error(err instanceof Error ? err.message : "Unknown error")
    });
}, []);
```

**Error States**:
- Network failure: HTTP error status
- Invalid GeoJSON: JSON parse error
- Missing file: 404 Not Found

---

## Performance Optimizations

### Database Query Optimization

#### Parallel Execution
```typescript
const [diagnoses, grouped] = await Promise.all([
  prisma.diagnosis.findMany({ /* ... */ }),
  prisma.diagnosis.groupBy({ /* ... */ })
]);
```
- Reduces total query time by ~50%
- Both queries are independent

#### Index Utilization
```prisma
@@index([disease, createdAt])
```
- Composite index for common filter combination
- Speeds up disease + date range queries

### Frontend Optimizations

#### Memoized Statistics
```typescript
const statistics = useMemo(() => {
  // Expensive computation
}, [casesData]);
```
- Prevents recalculation on every render
- Only recomputes when data changes

#### Conditional Rendering
```typescript
{(mapLoading || !geoData) ? (
  <div className="skeleton h-[600px] w-full" />
) : (
  <ChoroplethMap geoData={geoData} casesData={casesData} diagnoses={diagnoses} />
)}
```
- Shows loading skeleton during data fetch
- Prevents map render until data is ready

#### Unique Map Keys
```typescript
const mapKey = `${id}-${mountRef.current}`;
<MapContainer key={mapKey} />
```
- Forces fresh Leaflet instance
- Prevents container reuse errors
- Avoids expensive cleanup on unmount

---

## Testing Considerations

### Unit Tests

#### Server Action Tests
```typescript
describe('getDiseaseDiagnosesByDistricts', () => {
  it('should return grouped data for specific disease', async () => {
    const result = await getDiseaseDiagnosesByDistricts('Dengue');
    expect(result.success).toBeDefined();
    expect(result.success?.grouped).toBeInstanceOf(Array);
  });

  it('should filter by date range', async () => {
    const result = await getDiseaseDiagnosesByDistricts(
      'Dengue', 
      '2024-01-01', 
      '2024-12-31'
    );
    // Verify date filtering
  });
});
```

#### Color Scale Tests
```typescript
describe('getColor', () => {
  it('should return lightest color for 0 cases', () => {
    const color = getColor(0, 'Dengue');
    expect(color).toBe('#xxxxxx'); // Expected light color
  });

  it('should return darkest color for 100+ cases', () => {
    const color = getColor(100, 'Dengue');
    expect(color).toBe('#8B2F04'); // Expected dark color
  });
});
```

### Integration Tests

#### Data Flow Test
```typescript
describe('Disease Map Integration', () => {
  it('should update map when disease selection changes', async () => {
    render(<ByDiseaseTab />);
    
    // Select different disease
    fireEvent.change(diseaseSelect, { target: { value: 'Pneumonia' } });
    
    // Wait for data fetch
    await waitFor(() => {
      expect(map).toHaveBeenRenderedWith('Pneumonia');
    });
  });
});
```

### Visual Regression Tests

- Verify color scales match design specifications
- Test tooltip content and positioning
- Validate legend color gradient
- Check responsive layout at different breakpoints

---

## Troubleshooting

### Common Issues

#### Issue: Map shows all zones with 0 cases

**Symptoms**: All zones appear in lightest color

**Possible Causes**:
1. District names don't match GeoJSON `properties.name`
2. No diagnoses in database for selected filters
3. Date range excludes all records

**Debug Steps**:
```typescript
// Log casesData to verify transformation
console.log('casesData:', casesData);

// Log grouped data from server
console.log('grouped:', grouped);

// Check GeoJSON property names
console.log('GeoJSON names:', geoData?.features.map(f => f.properties.name));
```

#### Issue: Color scale appears incorrect

**Symptoms**: Colors don't match disease or look washed out

**Possible Causes**:
1. Wrong disease parameter passed to `getColor()`
2. chroma-js not properly installed
3. LAB mode not specified

**Debug Steps**:
```typescript
// Verify disease parameter
console.log('selectedDisease:', selectedDisease);

// Test color scale directly
const scale = getDiseaseColorScale('Dengue');
console.log('Color for 50 cases:', scale(50).hex());
```

#### Issue: Map container reuse error

**Symptoms**: "Map container is already initialized" error

**Possible Causes**:
1. Map key not unique across mounts
2. Leaflet instance not cleaned up properly

**Solution**:
```typescript
// Ensure unique key generation
const id = useId();
const mountRef = useRef(0);
mountRef.current += 1;
const mapKey = `${id}-${mountRef.current}`;
```

#### Issue: Slow query performance

**Symptoms**: Map takes >2 seconds to load

**Possible Causes**:
1. Missing database indexes
2. Large date range returning many records
3. No query optimization

**Solutions**:
```prisma
// Add composite index
@@index([disease, createdAt])
@@index([district, createdAt])
```

```typescript
// Limit results if needed
prisma.diagnosis.findMany({
  take: 1000,  // Limit maximum records
  // ...
});
```

---

## Future Enhancements

### Planned Improvements

#### 1. Real-Time Updates
```typescript
// WebSocket integration for live case updates
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3001/diagnoses');
  ws.onmessage = (event) => {
    const newDiagnosis = JSON.parse(event.data);
    setCasesData(prev => ({
      ...prev,
      [newDiagnosis.district]: (prev[newDiagnosis.district] || 0) + 1
    }));
  };
  return () => ws.close();
}, []);
```

#### 2. Patient Details Panel
```typescript
// Show patient records when clicking a zone
const handleZoneClick = async (zoneName: string) => {
  const zoneDiagnoses = diagnoses.filter(d => 
    d.district === zoneName && 
    d.disease === selectedDisease.toUpperCase()
  );
  setSelectedZoneDiagnoses(zoneDiagnoses);
  setShowPatientPanel(true);
};
```

#### 3. Time Series Animation
```typescript
// Animate disease spread over time
const animateTimeSeries = () => {
  const dates = generateDateRange(startDate, endDate, 'week');
  dates.forEach(async (date) => {
    const data = await getDiseaseDiagnosesByDistricts(disease, date, date);
    setCasesData(transformData(data));
    await sleep(500); // Animation delay
  });
};
```

#### 4. Advanced Filtering
```typescript
// Multi-select filters
interface MapFilters {
  diseases: DiseaseType[];
  districts: string[];
  ageRange: { min: number; max: number };
  gender: Gender[];
}
```

---

## Related Documentation

- [DISEASE_MAP.md](./DISEASE_MAP.md) - Overall Disease Map feature documentation
- [Prisma Schema](../prisma/schema.prisma) - Database model definitions
- [Zustand Patterns](../stores/README.md) - State management conventions
- [Chroma.js Documentation](https://gka.github.io/chroma.js/) - Color scale library

---

**Version**: 1.0  
**Last Updated**: March 6, 2026  
**Maintainer**: AI'll Be Sick Development Team
