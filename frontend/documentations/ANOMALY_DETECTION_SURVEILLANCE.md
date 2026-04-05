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

The system uses **scikit-learn's Isolation Forest** algorithm with a **per-disease detection strategy**: a separate model is trained for each disease using 6 features — latitude, longitude, district, month, age, and gender. Each flagged anomaly receives reason codes explaining the deviation. Disease groups are processed in parallel using `ThreadPoolExecutor`, and results are cached for 5 minutes to avoid redundant computation.

#### Data Flow
```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Diagnosis DB      │────▶│  Flask Backend       │────▶│  Next.js Frontend   │
│  (PostgreSQL)      │     │  surveillance_service│     │  useAnomalyData    │
│                    │     │  + IsolationForest   │     │  (React hook)      │
│                    │     │    (per-disease)     │     │                     │
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
│  fetch_diagnosis_   │
│  data()             │────▶  All VERIFIED diagnoses
│  (SQL query)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Group by disease   │
│  (per-disease loop) │
└──────────┬──────────┘
           │  For each disease group (PARALLEL):
           ▼
┌──────────────────────┐     ┌─────────────────────┐
│  _build_feature_    │────▶│  StandardScaler     │
│  matrix()           │     │  (normalization)    │
│  (6 features)       │     └─────────────────────┘
└──────────────────────┘               │
                                       ▼
                        ┌──────────────────────┐     ┌─────────────────────┐
                        │  IsolationForest     │────▶│  SHAP on anomalies  │
                        │  (per-disease model)│     │  (5% of records)    │
                        └──────────────────────┘     └─────────────────────┘
                                                              │
                                                              ▼
                        ┌──────────────────────┐     ┌─────────────────────┐
                        │  anomalies[]         │     │  normal_diagnoses[] │
                        │  + reason codes     │     │                     │
                        └──────────────────────┘     └─────────────────────┘
                                      │
                                      ▼
                        ┌──────────────────────┐
                        │  5-min TTL Cache     │
                        │  (force_refresh      │
                        │   bypasses cache)    │
                        └──────────────────────┘
```

### User Flow

1. **Page Load**: User navigates to Map page, selects "By Anomaly" tab
2. **Cache Check**: Backend checks 5-minute TTL cache — if hit, returns cached result instantly (~10ms)
3. **Initial Fetch** (cache miss): Frontend requests all diagnosis data (no disease filter)
4. **Anomaly Detection**: Backend groups VERIFIED diagnoses by disease, trains a separate Isolation Forest per disease in parallel (6 features each, `n_estimators=50`), computes SHAP values only for flagged anomalies (~5% of records), and merges results
5. **Reason Computation**: Each anomaly's reason codes are computed from SHAP feature contributions against its own disease's feature distribution
6. **Cache Set**: Result cached for 5 minutes
7. **Data Return**: Backend returns both anomalies and normal diagnoses with reason codes
8. **Client Filtering**: Frontend filters displayed data by selected disease
9. **Visualization**: Map shows filtered anomalies; timeline shows temporal distribution
10. **Drill-Down**: User clicks stats cards to open modal tables with full details
11. **Rescan**: User clicks "Rescan Anomalies" button to force fresh detection (cache cleared, full ML pipeline runs, new cache set)

> **Important:** Both the anomaly detection (`surveillance_service.py`) and outbreak detection (`outbreak_service.py`) only analyze diagnoses with `status = 'VERIFIED'`. This means newly created diagnoses (status: PENDING) will not appear in anomaly results until a clinician verifies them. Alerts are created by the Supabase Cron job (every 15 minutes), not at verification time.

### System Integration

| Component | Integration Point |
|-----------|------------------|
| **Backend API** | `GET /api/surveillance/outbreaks` — Flask endpoint (VERIFIED diagnoses only) |
| **Cron API** | `GET /api/surveillance/cron` — Unified endpoint for scheduled runs (anomaly + outbreak) |
| **Surveillance Service** | `analyze_surveillance()` — Main entry point (filters `status = 'VERIFIED'`) |
| **Isolation Forest** | `sklearn.ensemble.IsolationForest` — Anomaly detection |
| **State Management** | Zustand stores for disease/date selection |
| **UI Components** | TanStack Table, DaisyUI Cards/Modals |
| **Timeline Chart** | Recharts AreaChart for temporal view |
| **Alert Creation** | Supabase Edge Function (`/surveillance-cron`) — runs every 15 minutes |

---

## Implementation

### Technical Requirements

#### Dependencies (Backend)
```python
scikit-learn>=1.0
shap>=0.44
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
  // Backend returns all diseases (per-disease models run server-side).
  // Disease filtering is applied client-side via useMemo.
  const { anomalyData, loading, error } = useAnomalyData({
    contamination,
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
  startDate,
  endDate,
}: UseAnomalyDataParams) => {
  // No disease parameter — backend always returns all diseases
  // Query params: contamination, start_date, end_date
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
  "Confidence", "Uncertainty", "Reason Flags", "Age", "Gender", "District", "Date"
];

const normalColumns = [   // isAnomaly={false}
  "Patient ID", "Name", "Diagnosis",
  "Confidence", "Uncertainty", "Age", "Gender", "District", "Date"
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
  // AGE:* / GENDER:* → badge-accent (teal)
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
| `_build_feature_matrix()` | Converts DB rows to 6-feature numpy array |
| `detect_anomalies()` | Groups records by disease, trains per-disease Isolation Forest, merges results |
| `_compute_reason_codes()` | Reason code computation (all rows share same disease) |
| `_row_to_dict()` | Serializes DB rows to JSON-serializable dict |
| `analyze_surveillance()` | End-to-end entry point |

#### Feature Matrix (6 features)
| Index | Feature | Encoding |
|-------|---------|----------|
| 0 | latitude | raw float |
| 1 | longitude | raw float |
| 2 | district | LabelEncoder |
| 3 | month (from createdAt) | raw float (1-12) |
| 4 | age (from user) | raw float, median-imputed |
| 5 | gender (from user) | LabelEncoder |

> **Removed features:** `disease`, `confidence`, and `uncertainty` were removed. The disease feature was removed because per-disease models make it constant. Confidence and uncertainty are model outputs, not patient/disease characteristics, and don't belong in epidemiological anomaly detection.

#### Per-Disease Detection Strategy

The `detect_anomalies()` function groups records by disease and trains a separate Isolation Forest for each disease group. Diseases with fewer than 10 records are skipped (all marked normal) because the model cannot learn a meaningful distribution from too few samples.

**Why per-disease models?**
- Each disease gets its own 5% contamination budget — common diseases don't dominate rare ones
- Anomaly scores are computed within each disease's feature distribution, not a global mixed-disease distribution
- Reason codes and anomaly scores now share the same context — no more misleading explanations
- Label encoding distortion (arbitrary ordinal distances between disease labels) is eliminated

---

## Reason Codes

### All Reason Codes

| Code | Meaning | Derivation |
|------|---------|------------|
| `GEOGRAPHIC:RARE` | Patient location is unusual for this disease | SHAP feature contribution (latitude/longitude) |
| `TEMPORAL:RARE` | Case recorded at an unusual time of year for this disease | SHAP feature contribution (month) |
| `COMBINED:MULTI` | ≥2 primary reasons triggered | Derived (≥2 distinct reason families) |
| `AGE:RARE` | Patient age is outside the typical demographic range | SHAP feature contribution (age) |
| `GENDER:RARE` | Patient gender is uncommon for this disease | SHAP feature contribution (gender) |

### SHAP-Based Explanation Generation

Reason codes are derived from **SHAP (SHapley Additive exPlanations)** feature contributions computed by `shap.TreeExplainer` on the Isolation Forest model. This ensures explanations are grounded in the actual model's decision, not a parallel heuristic layer.

**How it works:**

1. After the Isolation Forest is fitted on a disease group, `TreeExplainer` computes SHAP values for all records (batched, efficient).
2. For each flagged anomaly, SHAP values indicate how much each feature pushed the prediction toward "anomalous" (negative values) or "normal" (positive values).
3. Only features with **negative SHAP values** (pushed toward anomaly) are considered.
4. A **magnitude threshold** (10% of total absolute SHAP sum) filters out noise contributors.
5. **Option B guarantee**: the top contributor is always included, even if it doesn't pass the threshold — ensuring every anomaly has at least one reason.
6. Features are mapped to reason codes (latitude → `GEOGRAPHIC:RARE`, month → `TEMPORAL:RARE`, etc.).
7. District (index 2) is **excluded** from explanations because LabelEncoder distortion makes its SHAP values meaningless.
8. If SHAP is unavailable or returns empty, the system falls back to z-score heuristics.

**Feature-to-reason mapping:**

| Feature Index | Feature | Reason Code | Notes |
|--------------|---------|-------------|-------|
| 0 | latitude | `GEOGRAPHIC:RARE` | |
| 1 | longitude | `GEOGRAPHIC:RARE` | Deduplicated with latitude |
| 2 | district | *(skipped)* | LabelEncoder distortion |
| 3 | month | `TEMPORAL:RARE` | |
| 4 | age | `AGE:RARE` | |
| 5 | gender | `GENDER:RARE` | |

**Response format:**

Each anomaly includes both the pipe-separated reason string and structured SHAP contributions:

```json
{
  "reason": "GEOGRAPHIC:RARE|AGE:RARE|COMBINED:MULTI",
  "shap_contributions": [
    {"reason": "GEOGRAPHIC:RARE", "contribution": 0.152},
    {"reason": "AGE:RARE", "contribution": 0.089}
  ]
}
```

### Per-Disease Detection

**Why per-disease models?**
- Prevents false positives where a record is normal for its disease but unusual globally
- Example: Dengue typically in district A, Typhoid in district B
- A Typhoid case in district B should NOT be flagged as "Unusual location"
- Each disease gets its own contamination budget (5% per disease, not 5% globally)
- Anomaly scores and reason codes share the same per-disease context

**Implementation** (`detect_anomalies`):
```python
# Group records by disease
disease_groups = {}
for record in data:
    disease = record.disease or "Unknown"
    disease_groups.setdefault(disease, []).append(record)

# Train separate model per disease
for disease, disease_records in disease_groups.items():
    if len(disease_records) < 10:
        # Too few records — mark all as normal
        for r in disease_records:
            all_normal.append(_row_to_dict(r, False, 0.0))
        continue

    X_raw, district_enc, gender_enc, medians = _build_feature_matrix(disease_records)
    X_scaled = scaler.fit_transform(X_raw)
    model = IsolationForest(contamination=contamination, ...)
    model.fit(X_scaled)
    # ... predictions, scores, reason codes
```

**Reason code computation** (`_compute_shap_reason_codes`):
After the Isolation Forest is fitted, SHAP values are computed for all records in the disease group:
```python
# Compute SHAP values once per disease group (batched)
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_scaled)

# For each anomaly, derive reason codes from SHAP contributions
for i, (record, pred, score) in enumerate(...):
    if pred == -1:  # anomaly
        reason, contributions = _compute_shap_reason_codes(shap_values[i])
```

**Fallback** (`_compute_reason_codes_fallback`):
If SHAP is unavailable or returns empty, the system falls back to z-score heuristics (2σ threshold checks on each feature). This ensures zero-downtime operation even if the SHAP dependency fails.
```python
# Fallback: z-score checks (kept as safety net)
lat_outlier = abs(X_row[IDX_LAT] - dis_mean[IDX_LAT]) > 2.0 * dis_std[IDX_LAT]
if lat_outlier:
    reasons.add(REASON_GEOGRAPHIC_RARE)
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
| `force_refresh` | string | "0" | If "1", "true", or "yes", clears cache and re-runs detection |

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
- **Parallel disease processing**: Diseases are processed concurrently via `ThreadPoolExecutor(max_workers=min(n_diseases, 6))`, reducing wall time from sum of all diseases to the longest single disease
- **`n_jobs=1` per disease**: Isolation Forest uses single-threaded execution per disease to avoid thread contention when diseases run in parallel
- **SHAP on anomalies only**: SHAP values computed only for flagged anomaly records (~5% of data), not the full dataset — ~20× reduction in SHAP computation
- **Reduced n_estimators**: Default reduced from 100 to 50 trees — converges well with fewer trees, ~2× faster IF fit + SHAP
- **5-minute TTL cache**: Full surveillance runs cached for 5 minutes — subsequent requests return instantly (~10ms)
- **Force refresh**: `force_refresh=1` query param clears cache and forces fresh ML pipeline run
- **Vectorized ops**: NumPy for all feature computations within each disease group
- **Label encoding**: Fitted once per disease group (district, gender only — no disease encoding)
- **Minimum threshold**: Diseases with < 10 records skip detection entirely (no wasted compute)

### Frontend
- **Client-side filtering**: `useMemo` prevents recalc on render
- **Pagination**: TanStack Table handles large datasets
- **Lazy loading**: Skeleton loaders during fetch
- **Refetch hook**: `useAnomalyData` exposes `refetch({ forceRefresh: true })` for manual cache invalidation

### Limitations
- Large date ranges return more records → slower detection (more diseases, more models)
- Per-disease filtering on client requires full dataset in memory
- Diseases with very few records (10-20) may produce noisy anomaly scores
- Cache is in-memory only — lost on Flask restart

---

## Adding New Reason Codes

### Backend (`surveillance_service.py`)

1. Add constant:
```python
REASON_NEW_CODE = "NEW:REASON"
```

2. Add to `FEATURE_TO_REASON` mapping (assign to the correct feature index):
```python
FEATURE_TO_REASON = {
    0: REASON_GEOGRAPHIC_RARE,
    1: REASON_GEOGRAPHIC_RARE,
    # 2 — district (skipped)
    3: REASON_TEMPORAL_RARE,
    4: REASON_AGE_RARE,
    5: REASON_GENDER_RARE,
    6: REASON_NEW_CODE,  # ← new feature index
}
```

3. If the new feature requires a new column in the feature matrix, update `_build_feature_matrix()` to include it.

4. Update the frontend `REASON_CODES` mapping (see below).

### Frontend (`utils/anomaly-reasons.ts`)

1. Add to `REASON_CODES`:
```typescript
"NEW:REASON": {
  label: "Human-Readable Label",
  description: "What this means for the user.",
},
```

2. Update badge colors in `anomaly-data-table.tsx` if needed (the `ReasonBadge` component maps code prefixes to DaisyUI color classes).

---

## Testing Checklist

- [ ] Select "All diseases" — reason codes vary (multiple types visible)
- [ ] Select specific disease — reason codes meaningful for that disease
- [ ] Normal Diagnoses modal: no anomaly score, no reason flags
- [ ] Anomalies modal: includes all columns
- [ ] Contamination slider changes detection results
- [ ] Date filters work correctly
- [ ] Location column NOT present in either table
- [ ] `shap_contributions` field present on anomaly records with valid structure
- [ ] District never appears in reason codes (LabelEncoder distortion)
- [ ] Every anomaly has at least one reason code (Option B guarantee)
- [ ] COMBINED:MULTI appears when ≥2 distinct reasons are present

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

**Version**: 5.0 (Performance Optimization & Caching)
**Last Updated**: April 5, 2026
**Maintainer**: AI'll Be Sick Development Team

---

## Changelog

### Version 5.0 - April 5, 2026
- **Parallel disease processing via ThreadPoolExecutor**
  - Diseases processed concurrently — wall time reduced from sum of all (~7.6s) to longest single disease (~1.3s)
  - `max_workers = min(n_diseases, 6)` caps thread count to avoid oversubscription
  - Extracted `_process_disease_group()` standalone function for parallel execution
  - Error handling: failed disease falls back to marking all records as normal
- **SHAP computation limited to anomaly records only**
  - SHAP values computed only for flagged anomalies (~5% of data) instead of 100%
  - ~20× reduction in SHAP computation time per disease
  - Anomaly indices mapped back to original positions for correct serialization
- **Reduced n_estimators from 100 to 50**
  - Isolation Forest converges well with fewer trees
  - ~2× faster IF fit + SHAP with equivalent detection quality
- **Fixed thread contention: n_jobs=1 per disease**
  - Initial parallelization used `n_jobs=-1` causing all diseases to fight over same CPU cores
  - Each disease's IF fit went from 0.26s → 2.0s (7.6× slower) with contention
  - Fixed by setting `n_jobs=1` — diseases already parallelized externally
- **5-minute TTL in-memory cache**
  - Full surveillance runs (`disease=None`) cached for 5 minutes
  - Thread-safe via `threading.Lock()`
  - Cache key: `{start_date}|{end_date}|{contamination}`
  - `clear_surveillance_cache()` utility for manual invalidation
- **Force refresh API parameter**
  - `force_refresh=1` query param clears cache and forces fresh ML run
  - Powers the "Rescan Anomalies" button in the frontend
- **Performance timing logs**
  - Granular `[PERF]` logs per disease: feature matrix, IF fit, predict, SHAP, serialize
  - Enables ongoing monitoring as dataset grows
- **Frontend: Rescan Anomalies button**
  - `btn btn-outline btn-primary` with `RefreshCw` icon
  - Shows spinner + "Rescanning..." during processing
  - Calls `refetch({ forceRefresh: true })` to bypass cache
- **Frontend: refetch() hook**
  - `useAnomalyData` now exposes `refetch(options?)` function
  - Supports `forceRefresh` option for cache-busting
- **Rationale**: 16-second initial load was unacceptable for a dashboard. Combined optimizations bring first load to ~1-2s and cached loads to ~10ms.
- **Impact**: 8-16× faster first load, 1600× faster cached loads, instant tab navigation after first visit.

### Version 4.0 - April 5, 2026
- **Migrated reason code generation from z-score heuristics to SHAP (TreeExplainer)**
  - Reason codes are now derived from actual Isolation Forest feature contributions, not parallel heuristic checks
  - Added `shap>=0.44` to backend dependencies
  - New `_compute_shap_reason_codes()` function replaces `_compute_reason_codes()` as primary explanation engine
  - Old z-score heuristics kept as `_compute_reason_codes_fallback()` for zero-downtime fallback
  - District feature (index 2) excluded from explanations — LabelEncoder distortion makes SHAP values meaningless
  - Magnitude threshold (10% of total |SHAP|) filters out noise contributors
  - Top contributor always included (Option B) — guarantees every anomaly has at least one reason
  - Added `shap_contributions` field to anomaly response: `[{"reason": "...", "contribution": 0.12}, ...]`
- **Rationale**: Z-score heuristics were disconnected from the model's actual decision — explanations didn't always match why the Isolation Forest flagged the record. SHAP provides mathematically grounded feature attributions that sum to the anomaly score.
- **Impact**: Explanations are now honest — they reflect what the model actually used. No more "GEOGRAPHIC:RARE" fallback when the real cause was a multi-feature interaction.

### Version 3.0 - April 5, 2026
- **Migrated from global to per-disease Isolation Forest models**
  - Each disease now gets its own separate Isolation Forest model
  - Removed `disease`, `confidence`, and `uncertainty` from feature matrix (6 features → lat, lng, district, month, age, gender)
  - Diseases with fewer than 10 records are skipped (marked normal) — too few samples for meaningful detection
  - Each disease gets its own 5% contamination budget instead of competing globally
  - Reason codes and anomaly scores now share the same per-disease context
- **Rationale**: Global model caused rare diseases to be mass-flagged, within-disease outliers to be missed, and misleading reason codes (scores computed globally but explanations computed per-disease)
- **Impact**: More accurate anomaly detection per disease; no false positives from cross-disease feature contamination; confidence/uncertainty no longer influence anomaly scores

### Version 2.0 - April 5, 2026
- **Migrated alert creation from event-driven to Supabase Cron-based**
  - Alerts are now created by the Supabase Edge Function (`/surveillance-cron`) running every 15 minutes
  - Added unified `/api/surveillance/cron` endpoint in Flask backend
  - Removed fire-and-forget alert calls from `verify-diagnosis.ts` and `override-diagnosis.ts`
  - Deleted `frontend/utils/alert-pipeline.ts`
- **Rationale**: Eliminate silent alert losses from serverless cold starts and non-recoverable failures
- **Impact**: All VERIFIED diagnoses are analyzed within 15 minutes; transient failures self-heal

### Version 1.0 - March 9, 2026
- Initial implementation with Isolation Forest anomaly detection
- Per-disease baseline reason codes
- Real-time Supabase notifications
