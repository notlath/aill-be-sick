# Anomaly Detection & Surveillance System

## Overview

### Purpose
The Anomaly Detection system identifies unusual diagnosis records using machine learning to flag potential disease outbreaks, geographic anomalies, temporal patterns, and model confidence issues. This helps clinicians and public health officials quickly identify and investigate unusual disease activity.

### Target Users
- **Clinicians**: Investigating flagged anomalous cases in their area
- **Public Health Officials**: Monitoring for potential outbreak indicators
- **Healthcare Administrators**: Reviewing system-wide anomaly patterns

### Key Benefits
- **Automated Outbreak Detection**: Machine learning identifies unusual patterns without manual thresholding
- **Explainable Flags**: Each anomaly includes reason codes explaining why it was flagged
- **Per-Disease Baselines**: Anomalies are relative to each disease's typical distribution
- **Dual-View**: Both anomalies and normal diagnoses accessible for comparison

---

## How It Works

### Core Functionality

The system uses **scikit-learn's Isolation Forest** algorithm to detect anomalies based on 7 features: latitude, longitude, disease, district, month, confidence, and uncertainty. Each flagged anomaly receives reason codes explaining the deviation.

#### Data Flow
```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Diagnosis DB      │────▶│  Flask Backend       │────▶│  Next.js Frontend   │
│  (PostgreSQL)      │     │  surveillance_service│     │  useAnomalyData    │
│                    │     │  + IsolationForest   │     │  (React hook)      │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
                                                                    │
                                                                    ▼
                                                         ┌─────────────────────┐
                                                         │  anomaly-patients-  │
                                                         │  modal.tsx          │
                                                         │  (TanStack Table)   │
                                                         └─────────────────────┘
```

#### Detailed Pipeline
```
┌─────────────────────┐
│  fetch_diagnosis_   │     ┌──────────────────────┐     ┌─────────────────────┐
│  data()             │────▶│  _build_feature_    │────▶│  StandardScaler     │
│  (SQL query)        │     │  matrix()           │     │  (normalization)    │
└─────────────────────┘     │  (7 features)       │     └─────────────────────┘
                            └──────────────────────┘               │
                                                                 ▼
                            ┌──────────────────────┐     ┌─────────────────────┐
                            │  IsolationForest     │────▶│  _compute_reason_   │
                            │  (anomaly detection)│     │  codes()            │
                            └──────────────────────┘     └─────────────────────┘
                                                                 │
                                                                 ▼
                            ┌──────────────────────┐     ┌─────────────────────┐
                            │  anomalies[]         │     │  normal_diagnoses[] │
                            │  + reason codes     │     │                     │
                            └──────────────────────┘     └─────────────────────┘
```

### User Flow

1. **Page Load**: User navigates to Map page, selects "By Anomaly" tab
2. **Initial Fetch**: Frontend requests all diagnosis data (no disease filter)
3. **Anomaly Detection**: Backend runs Isolation Forest on full dataset
4. **Reason Computation**: Per-disease baselines computed for geographic/temporal reasons
5. **Data Return**: Backend returns both anomalies and normal diagnoses with reason codes
6. **Client Filtering**: Frontend filters displayed data by selected disease
7. **Visualization**: Map shows filtered anomalies; timeline shows temporal distribution
8. **Drill-Down**: User clicks stats cards to open modal tables with full details

### System Integration

| Component | Integration Point |
|-----------|------------------|
| **Backend API** | `GET /api/surveillance/outbreaks` — Flask endpoint |
| **Surveillance Service** | `analyze_surveillance()` — Main entry point |
| **Isolation Forest** | `sklearn.ensemble.IsolationForest` — Anomaly detection |
| **State Management** | Zustand stores for disease/date selection |
| **UI Components** | TanStack Table, DaisyUI Cards/Modals |
| **Timeline Chart** | Recharts AreaChart for temporal view |

---

## Implementation

### Technical Requirements

#### Dependencies (Backend)
```python
scikit-learn>=1.0
numpy>=1.20
sqlalchemy>=2.0
psycopg2-binary>=2.9
```

#### Dependencies (Frontend)
```json
{
  "@tanstack/react-table": "^8.x",
  "lucide-react": "^0.x",
  "recharts": "^2.x",
  "zustand": "^5.x"
}
```

#### Browser Support
- Modern browsers with ES6+ support
- Requires JavaScript enabled

### File Structure

#### Backend
```
backend/
├── app/
│   ├── services/
│   │   └── surveillance_service.py    # Core detection logic
│   ├── api/
│   │   └── surveillance.py           # Flask API route
│   └── utils/
│       └── database.py                # DB connection utilities
└── requirements.txt
```

#### Frontend
```
frontend/
├── types/
│   └── index.ts                       # TypeScript interfaces
├── utils/
│   └── anomaly-reasons.ts            # Reason code utilities
├── hooks/
│   └── map-hooks/
│       └── use-anomaly-data.ts       # Data fetching hook
├── components/clinicians/map-page/
│   ├── by-anomaly/
│   │   ├── by-anomaly-tab.tsx        # Main tab component
│   │   ├── anomaly-patients-modal.tsx # Data table modal
│   │   ├── anomaly-stats-cards.tsx   # Stats cards
│   │   └── skeleton-loaders.tsx      # Loading states
│   └── anomaly-timeline-chart.tsx     # Timeline visualization
└── stores/
    ├── use-selected-disease-store.ts  # Disease selection
    └── use-date-range-store.ts        # Date range
```

---

## Component Architecture

### 1. `by-anomaly-tab.tsx` - Main Tab Component
**Location**: `frontend/components/clinicians/map-page/by-anomaly/by-anomaly-tab.tsx`

```typescript
const ByAnomalyTab = () => {
  // Always fetch ALL data (disease: "all") so Isolation Forest
  // trains on full dataset for accurate per-disease baselines
  const { anomalyData, loading, error } = useAnomalyData({
    contamination,
    disease: "all",  // <-- Critical: always fetch full dataset
    startDate,
    endDate,
  });

  // Client-side filtering by selected disease
  const anomalies = useMemo(
    () => selectedDisease === "all"
      ? allAnomalies
      : allAnomalies.filter(a => a.disease === selectedDisease),
    [allAnomalies, selectedDisease]
  );
}
```

**Key Features**:
- Fetches full dataset regardless of disease filter
- Applies disease filtering client-side via `useMemo`
- Manages two modal states: coordinates modal + district modal
- Passes filtered counts to stats cards

---

### 2. `useAnomalyData` - Data Fetching Hook
**Location**: `frontend/hooks/map-hooks/use-anomaly-data.ts`

```typescript
export const useAnomalyData = ({
  contamination,
  disease,
  startDate,
  endDate,
}: UseAnomalyDataParams) => {
  // Always passes disease="all" from by-anomaly-tab
  // Query params: contamination, (optional) disease, start_date, end_date
}
```

**Key Features**:
- Returns `OutbreakFullResult` with `anomalies`, `normal_diagnoses`, `summary`
- Handles loading/error states
- Abort controller for cleanup on unmount

---

### 3. `anomaly-patients-modal.tsx` - Data Table Modal
**Location**: `frontend/components/clinicians/map-page/by-anomaly/anomaly-patients-modal.tsx`

```typescript
// Two column variants based on isAnomaly prop
const anomalyColumns = [  // isAnomaly={true}
  "Patient ID", "Name", "Diagnosis", "Anomaly Score",
  "Confidence", "Uncertainty", "Reason Flags", "District", "Date"
];

const normalColumns = [   // isAnomaly={false}
  "Patient ID", "Name", "Diagnosis",
  "Confidence", "Uncertainty", "District", "Date"
];
```

**Key Features**:
- `isAnomaly` prop switches between column sets
- Reason badges with tooltips and color coding
- Search, sort, filter, pagination
- Responsive table with overflow handling

---

### 4. `ReasonBadge` - Reason Code Display
**Location**: `frontend/components/clinicians/map-page/by-anomaly/anomaly-patients-modal.tsx`

```typescript
const ReasonBadge = ({ code }: { code: string }) => {
  // Color mapping:
  // GEOGRAPHIC:* / CLUSTER:* → badge-warning (yellow)
  // TEMPORAL:* → badge-info (blue)
  // CONFIDENCE:* / UNCERTAINTY:* → badge-error (red)
  // COMBINED:* → badge-secondary (purple)
};
```

---

### 5. `anomaly-stats-cards.tsx` - Statistics Display
**Location**: `frontend/components/clinicians/map-page/by-anomaly/anomaly-stats-cards.tsx`

```
┌──────────────────────┐  ┌──────────────────────┐
│  Total Anomalies     │  │  Normal Diagnoses    │
│  [count]             │  │  [count]             │
│  (clickable)         │  │  (clickable)         │
└──────────────────────┘  └──────────────────────┘
┌──────────────────────┐  ┌──────────────────────┐
│  Contamination Rate  │  │  Unique Locations    │
│  [percentage]        │  │  [count]             │
└──────────────────────┘  └──────────────────────┘
```

---

### 6. Backend - `surveillance_service.py`
**Location**: `backend/app/services/surveillance_service.py`

#### Main Functions

| Function | Purpose |
|----------|---------|
| `fetch_diagnosis_data()` | SQL query fetching diagnosis + user JOIN |
| `_build_feature_matrix()` | Converts DB rows to 7-feature numpy array |
| `detect_anomalies()` | Runs Isolation Forest, computes reason codes |
| `_compute_reason_codes()` | Per-disease baseline comparisons |
| `_row_to_dict()` | Serializes DB rows to JSON-serializable dict |
| `analyze_surveillance()` | End-to-end entry point |

#### Feature Matrix (7 features)
| Index | Feature | Encoding |
|-------|---------|----------|
| 0 | latitude | raw float |
| 1 | longitude | raw float |
| 2 | disease | LabelEncoder |
| 3 | district | LabelEncoder |
| 4 | month (from createdAt) | raw float (1-12) |
| 5 | confidence | raw float |
| 6 | uncertainty | raw float |

---

## Reason Codes

### All Reason Codes

| Code | Meaning | Baseline |
|------|---------|----------|
| `GEOGRAPHIC:RARE` | Lat/lng > 2σ from disease mean | Per-disease |
| `TEMPORAL:RARE` | Month > 2σ from disease mean | Per-disease |
| `CLUSTER:SPATIAL` | Both lat AND lng > 2σ | Per-disease |
| `CONFIDENCE:LOW` | Confidence < mean − 2σ | Global |
| `UNCERTAINTY:HIGH` | Uncertainty > mean + 2σ | Global |
| `COMBINED:MULTI` | ≥2 primary reasons triggered | — |

### Per-Disease vs Global Baselines

**Why per-disease?**
- Prevents false positives where a record is normal for its disease but unusual globally
- Example: Dengue typically in district A, Typhoid in district B
- A Typhoid case in district B should NOT be flagged as "Unusual location"

**Implementation** (`_compute_reason_codes`):
```python
# Filter to same-disease peers
same_disease_mask = X_all[:, IDX_DIS] == disease_code
same_disease_rows = X_all[same_disease_mask]

# Compute per-disease stats
dis_mean = same_disease_rows.mean(axis=0)
dis_std = same_disease_rows.std(axis=0) + 1e-8

# Compare against per-disease baseline
lat_outlier = abs(X_row[IDX_LAT] - dis_mean[IDX_LAT]) > THRESHOLD * dis_std[IDX_LAT]
```

---

## Configuration Options

### Contamination Rate
Controls expected proportion of anomalies (passed to Isolation Forest).

```typescript
// Frontend slider: 0.01 to 0.49, default 0.05
<Input type="number" min={0.01} max={0.49} step={0.01} />
```

### API Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `contamination` | float | 0.05 | Expected anomaly rate |
| `n_estimators` | int | 100 | Forest tree count |
| `max_samples` | int/"auto" | "auto" | Samples per tree |
| `disease` | string | — | Filter (not used — always "all") |
| `start_date` | ISO date | — | Start of date range |
| `end_date` | ISO date | — | End of date range |

---

## Reference

### TypeScript Types

#### `SurveillanceAnomaly`
```typescript
interface SurveillanceAnomaly {
  id: string;
  disease: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  province: string | null;
  barangay: string | null;
  region: string | null;
  district: string | null;
  confidence: number | null;
  uncertainty: number | null;
  userId: string;
  user: SurveillanceUser | null;
  is_anomaly: boolean;
  anomaly_score: number;
  reason: string | null;  // pipe-separated, e.g., "GEOGRAPHIC:RARE|TEMPORAL:RARE"
}
```

#### `OutbreakFullResult`
```typescript
interface OutbreakFullResult {
  anomalies: SurveillanceAnomaly[];
  normal_diagnoses: SurveillanceAnomaly[];
  summary: {
    total_records: number;
    anomaly_count: number;
    normal_count: number;
    contamination_used: number;
  };
  // Legacy flat fields
  total_analyzed: number;
  anomaly_count: number;
  normal_count: number;
  outbreak_alert: boolean;
}
```

---

## Error Handling

| Error Scenario | Behavior | Resolution |
|----------------|----------|------------|
| No diagnosis data | Returns empty arrays | Check database has records |
| < 2 records | Returns early with empty anomalies | Need minimum dataset size |
| DB connection fail | Flask returns 500 | Check DATABASE_URL |
| Invalid contamination | Clamped to 0.01–0.49 | Frontend validates |
| Missing coordinates | Record excluded from analysis | Check lat/lng fields |

---

## Performance Considerations

### Backend
- **Vectorized ops**: NumPy for all feature computations
- **Label encoding**: Fitted once per request
- **Isolation Forest**: `n_jobs=-1` for parallel tree building

### Frontend
- **Client-side filtering**: `useMemo` prevents recalc on render
- **Pagination**: TanStack Table handles large datasets
- **Lazy loading**: Skeleton loaders during fetch

### Limitations
- Large date ranges return more records → slower detection
- Per-disease filtering on client requires full dataset in memory

---

## Adding New Reason Codes

### Backend (`surveillance_service.py`)

1. Add constant:
```python
REASON_NEW_CODE = "NEW:REASON"
```

2. Update `_compute_reason_codes()`:
```python
# Decide: per-disease or global baseline?
# Add threshold check
if condition:
    reasons.add(REASON_NEW_CODE)
```

3. Return pipe-separated string:
```python
return "|".join(sorted(reasons))
```

### Frontend (`utils/anomaly-reasons.ts`)

1. Add to `REASON_CODES`:
```typescript
"NEW:REASON": {
  label: "Human-Readable Label",
  description: "What this means for the user.",
},
```

2. Update badge colors in `anomaly-patients-modal.tsx` if needed.

---

## Testing Checklist

- [ ] Select "All diseases" — reason codes vary (multiple types visible)
- [ ] Select specific disease — reason codes meaningful for that disease
- [ ] Normal Diagnoses modal: no anomaly score, no reason flags
- [ ] Anomalies modal: includes all columns
- [ ] Contamination slider changes detection results
- [ ] Date filters work correctly
- [ ] Location column NOT present in either table

---

## Future Enhancements

- [ ] **Real-time detection**: WebSocket push of new anomalies
- [ ] **Historical comparison**: Compare current vs past periods
- [ ] **Export**: CSV export of anomaly reports
- [ ] **Dismiss/acknowledge**: Mark anomalies as reviewed
- [ ] **Alert thresholds**: Notify on spike detection

---

## Related Features

| Feature | Description |
|---------|-------------|
| **Disease Map** | Choropleth visualization of case distribution |
| **Illness Clusters** | K-means clustering of similar cases |
| **Alerts Page** | List view of all anomalies |

---

## Appendix

### External Resources
- [scikit-learn Isolation Forest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html)
- [TanStack Table](https://tanstack.com/table/)
- [Recharts](https://recharts.org/)

---

**Version**: 1.0
**Last Updated**: March 9, 2026
**Maintainer**: AI'll Be Sick Development Team
