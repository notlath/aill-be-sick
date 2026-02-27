# Anomaly Heatmap Integration Guide

## Overview

This document covers the integration of **Isolation Forest anomaly detection** into the Philippines choropleth map as a heatmap visualization. Users can select a disease from a dropdown and see anomaly density per region/province, color-coded by severity.

The anomaly tab sits alongside the existing "By disease" and "By cluster" tabs on the Map page (`/map`).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Backend (Flask)                                                │
│  GET /api/surveillance/outbreaks?contamination=0.05             │
│  └── surveillance_service.py                                    │
│      ├── fetch_diagnosis_data() → SQL + feature encoding        │
│      ├── detect_outbreaks()     → Isolation Forest model        │
│      └── Returns: anomalies[] with lat/lng/province/region/     │
│          disease/anomaly_score                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │ JSON response
┌───────────────────────▼─────────────────────────────────────────┐
│  Frontend (Next.js)                                             │
│                                                                 │
│  map-container.tsx (Data Layer)                                  │
│  ├── Fetches anomaly data once when "anomaly" tab is active     │
│  ├── Filters by selected disease                                │
│  ├── Aggregates counts by region → projects to provinces        │
│  ├── Counts per-province directly (for tooltip)                 │
│  ├── Builds color ramp + legend bins                            │
│  └── Passes AnomalyHeatmapData to PhilippinesMap               │
│                                                                 │
│  philippines-map.tsx (Rendering Layer)                           │
│  ├── Fills provinces with disease-colored intensity              │
│  ├── Tooltip: province count + region total                     │
│  └── Legend panel (bottom-right)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow (Step by Step)

### 1. Backend — Anomaly Detection

**File:** `backend/app/services/surveillance_service.py`

#### `fetch_diagnosis_data(db_url, start_date, end_date, disease)`

Runs a SQL query joining `Diagnosis` and `User` tables:

```sql
SELECT
  d.id, d.disease, d."createdAt",
  COALESCE(d.latitude,  u.latitude)  as latitude,
  COALESCE(d.longitude, u.longitude) as longitude,
  COALESCE(d.city,      u.city)      as city,
  COALESCE(d.province,  u.province)  as province,
  COALESCE(d.region,    u.region)    as region,
  d.confidence, d.uncertainty,
  u.id as user_id, u.name as user_name
FROM "Diagnosis" d
JOIN "User" u ON d."userId" = u.id
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
```

Optional filters:
- `AND d.disease = :disease` — when `disease` param is provided
- `AND d."createdAt" >= :start_date` / `<= :end_date`

Each record is encoded into 4 features for the model:

| Feature | Type | Description |
|---|---|---|
| Latitude | Float | Geographic north-south |
| Longitude | Float | Geographic east-west |
| Timestamp | Normalized 0-1 | Relative to dataset time range |
| Disease | Encoded int | Index in disease list |

#### `detect_outbreaks(contamination, db_url, disease)`

1. Calls `fetch_diagnosis_data` to get encoded features + metadata
2. Trains `IsolationForest(n_estimators=100, contamination=0.05)`
3. Calls `fit_predict(data)` — returns `-1` for outliers, `1` for inliers
4. Calls `decision_function(data)` — returns anomaly scores (lower = more anomalous)
5. Separates anomalies from normal records, attaches `anomaly_score`
6. Sorts anomalies by score (most anomalous first)
7. Sets `outbreak_alert = True` if anomaly count exceeds 2× expected

**Return shape:**

```json
{
  "anomalies": [
    {
      "id": 42,
      "disease": "Dengue",
      "created_at": "2026-01-27T14:30:00",
      "latitude": 14.6542,
      "longitude": 121.0512,
      "city": "Quezon City",
      "province": "Metro Manila",
      "region": "NCR",
      "confidence": 0.85,
      "uncertainty": 0.03,
      "anomaly_score": -0.234
    }
  ],
  "normal": [...],
  "total_analyzed": 150,
  "anomaly_count": 7,
  "outbreak_alert": false,
  "contamination": 0.05
}
```

### 2. API Route

**File:** `backend/app/api/surveillance.py`

```
GET /api/surveillance/outbreaks?contamination=0.05&disease=Dengue
```

| Param | Type | Default | Description |
|---|---|---|---|
| `contamination` | float | 0.05 | Expected outlier proportion (0.0–0.5) |
| `summary` | bool | false | Return aggregated summary if true |
| `disease` | string | null | Filter by disease name |

### 3. Frontend Types

**File:** `frontend/types/index.ts`

```typescript
// Individual anomaly record from the API
export interface SurveillanceAnomaly {
  id: number;
  disease: string;
  created_at: string;
  latitude: number;
  longitude: number;
  city: string | null;
  province: string | null;   // ← Added for province-level counting
  region: string | null;
  confidence: number;
  uncertainty: number;
  anomaly_score: number;
}

// Processed data passed to PhilippinesMap
export type AnomalyHeatmapData = {
  diseaseBaseColor: string;
  provinceCounts: Record<string, number>;        // Region-projected (for fill color)
  provinceDirectCounts: Record<string, number>;  // Actual per-province (for tooltip)
  regionTotals: Record<string, number>;
  provinceToRegion: Record<string, string>;
  globalMax: number;
  legendBins: HeatmapLegendBin[];
  selectedDisease: string;
};
```

### 4. Map Container — Data Processing

**File:** `frontend/components/clinicians/map-page/map-container.tsx`

#### State

```typescript
const [anomalyDisease, setAnomalyDisease] = useState<string>(DISEASES[0]);
const [anomalyData, setAnomalyData] = useState<SurveillanceAnomaly[]>([]);
```

#### Fetching (useEffect)

When `selectedTab === "anomaly"`, fetches all anomaly records once:

```typescript
useEffect(() => {
  if (selectedTab !== "anomaly") return;
  // Fetch from GET /api/surveillance/outbreaks?contamination=0.05
  // Store data.anomalies into anomalyData state
}, [selectedTab]);
```

Key design decision: we fetch **all** anomalies in one call (not filtered by disease), then filter client-side. This avoids re-running the Isolation Forest model on every disease switch.

#### Processing (useMemo)

The `anomalyHeatmapData` memo does the following:

```
1. Filter anomalyData by anomalyDisease
2. Aggregate by region (using regionPsgcByAlias lookup)
3. Project region counts → all provinces in that region (for fill)
4. Count per-province directly using anomaly.province field (for tooltip)
5. Pick disease color from CLUSTER_BASE_COLORS[diseaseIndex]
6. Build 5-step legend bins using buildClusterRamp()
```

**Region → Province projection:**

Since patient data often has `region` but not always `province`, we project region-level counts to all provinces within that region. This ensures every province shows *some* color on the map. The tooltip then shows the more precise per-province count.

**Disease color mapping:**

Each disease gets a deterministic color from the palette:

| Disease | Color |
|---|---|
| Dengue | Blue (#2563eb) |
| Pneumonia | Emerald (#059669) |
| Typhoid | Purple (#9333ea) |
| Diarrhea | Orange (#ea580c) |
| Measles | Pink (#db2777) |
| Impetigo | Indigo (#4f46e5) |
| Influenza | Cyan (#0891b2) |

#### Disease Selector UI

A Shadcn `<Select>` dropdown rendered when `selectedTab === "anomaly"`:

```tsx
<Select value={anomalyDisease} onValueChange={setAnomalyDisease}>
  <SelectTrigger className="w-40 bg-white shadow-sm">
    <SelectValue placeholder="Select disease" />
  </SelectTrigger>
  <SelectContent>
    {DISEASES.map((d) => (
      <SelectItem key={d} value={d}>{d}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 5. Philippines Map — Rendering

**File:** `frontend/components/clinicians/map-page/philippines-map.tsx`

#### Props

```typescript
type PhilippinesMapProps = {
  selectedTab?: "disease" | "cluster" | "anomaly";
  heatmapData?: MapHeatmapData;
  anomalyHeatmapData?: AnomalyHeatmapData;  // ← New
}
```

#### Fill Color Logic

Inside the D3 render `useEffect`, a new branch handles anomaly mode:

```typescript
// getAnomalyFillColor: grey for 0, disease color ramp for density
const getAnomalyFillColor = (feature: MapFeature): string => {
  const count = anomalyHeatmapData.provinceCounts[normalizeLoc(provinceName)] ?? 0;
  if (count <= 0) return "#d1d5db"; // Grey
  // Match to legend bin for color
  const matchedBin = anomalyHeatmapData.legendBins.find(
    (bin) => count >= bin.min && count <= bin.max,
  );
  return matchedBin?.color ?? ZERO_COLOR;
};

// Applied in the D3 .attr("fill") call:
.attr("fill", (d) => {
  if (selectedTab === "anomaly" && anomalyHeatmapData) {
    return getAnomalyFillColor(d);
  }
  return getFeatureFillColor(d); // Existing cluster/disease logic
})
```

#### Tooltip

On `mousemove`, shows province-specific count + region total:

```
"Rizal: 3 Dengue anomalies"
"CALABARZON total: 10"
```

Uses `provinceDirectCounts` (actual per-province) for the first line, `regionTotals` for the second.

#### Legend

A bottom-right panel (same style as cluster legend) showing:
- Disease color dot + "Disease Anomaly Legend"
- Grey swatch → 0
- Color ramp swatches → min-max ranges

---

## Key Design Decisions

### Why region-projected fill + province-level tooltip?

Patient records often have a `region` value but the `province` field may be null/missing. Projecting region counts ensures the map always shows *something* for every province. The tooltip uses direct province counts for precision when available.

### Why fetch all anomalies then filter client-side?

Running Isolation Forest is computationally expensive. Fetching once and filtering by disease in the browser avoids re-training the model on every disease switch, making the UI feel instant.

### Why reuse `buildClusterRamp` and `getClusterBaseColor`?

These utilities in `utils/cluster-colors.ts` use `chroma.js` to generate perceptually uniform color ramps. Reusing them ensures visual consistency between the cluster and anomaly heatmaps.

---

## Files Modified

| File | Changes |
|---|---|
| `backend/app/services/surveillance_service.py` | Added `province` to SQL + records, `disease` filter param |
| `backend/app/api/surveillance.py` | Added `disease` query param forwarding |
| `frontend/types/index.ts` | Added `province` to `SurveillanceAnomaly`, new `AnomalyHeatmapData` |
| `frontend/components/clinicians/map-page/map-container.tsx` | Anomaly fetch, disease selector, heatmap data computation |
| `frontend/components/clinicians/map-page/philippines-map.tsx` | Anomaly fill color, tooltip, legend, useEffect deps |

---

## How to Extend

### Adding date range filtering
Add `startDate`/`endDate` state in the anomaly tab section of `map-container.tsx`, pass them as query params to the API (`&start_date=...&end_date=...`). The backend already supports these params.

### Province-level drill-down for anomalies
Currently anomaly view is country-level only. To add drill-down, you'd need to:
1. Add barangay/city-level anomaly counting in `anomalyHeatmapData`
2. Add `viewState.level === "province"` branch in `getAnomalyFillColor`
3. Update tooltip for the province drill-down view

### Adjustable contamination threshold
Add a slider (like on the Alerts page) and pass the value as `contamination` query param. Note: this will re-run the model on the backend.
