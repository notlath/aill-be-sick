# Anomaly Detection Service - Backend

## Overview

The surveillance service uses **Isolation Forest** (scikit-learn) to detect anomalous diagnosis records. Each record is analyzed against 9 features and tagged with reason codes explaining why it was flagged.

### Purpose
- Detect potential disease outbreak indicators
- Identify geographic anomalies per disease
- Flag unusual temporal patterns
- Flag unusual patient demographics (age, gender) relative to each disease's typical population
- Highlight low-confidence or high-uncertainty diagnoses

---

## Architecture

### Data Flow
```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  PostgreSQL     │────▶│  Flask API           │────▶│  JSON Response  │
│  Diagnosis DB  │     │  /api/surveillance/  │     │  + reason codes │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────────┐
                        │  surveillance_service │
                        │  + IsolationForest    │
                        │  + per-disease stats  │
                        └──────────────────────┘
```

### Core Modules

| Module | File | Purpose |
|--------|------|---------|
| **API Route** | `app/api/surveillance.py` | Flask endpoint, request parsing |
| **Service** | `app/services/surveillance_service.py` | Core detection logic |
| **Database** | `app/utils/database.py` | DB connection utilities |

---

## API Endpoint

### GET `/api/surveillance/outbreaks`

Returns anomaly detection results with reason codes.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `contamination` | float | 0.05 | Expected anomaly rate (0.01–0.49) |
| `n_estimators` | int | 100 | Number of Isolation Forest trees |
| `max_samples` | int/"auto" | "auto" | Samples per tree |
| `disease` | string | — | Filter by disease (optional) |
| `start_date` | ISO date | — | Records on/after this date |
| `end_date` | ISO date | — | Records on/before this date |

#### Response

```json
{
  "anomalies": [
    {
      "id": "uuid",
      "disease": "Dengue",
      "createdAt": "2026-01-15T10:30:00",
      "latitude": 14.71,
      "longitude": 121.113,
      "city": "Quezon City",
      "province": "Metro Manila",
      "barangay": "Bagong Silangan",
      "region": "NCR",
      "district": "Zone 3",
      "confidence": 0.85,
      "uncertainty": 0.12,
      "userId": "uuid",
      "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "PATIENT",
        "city": "Quezon City",
        "region": "NCR",
        "province": "Metro Manila",
        "barangay": "Bagong Silangan",
        "district": "Zone 3",
        "latitude": 14.71,
        "longitude": 121.113,
        "age": 28,
        "gender": "MALE"
      },
      "is_anomaly": true,
      "anomaly_score": -0.2345,
      "reason": "GEOGRAPHIC:RARE|COMBINED:MULTI"
    }
  ],
  "normal_diagnoses": [
    {
      "id": "uuid",
      "disease": "Dengue",
      "createdAt": "2026-01-15T10:30:00",
      "latitude": 14.71,
      "longitude": 121.113,
      "confidence": 0.85,
      "uncertainty": 0.12,
      "userId": "uuid",
      "user": { ... },
      "is_anomaly": false,
      "anomaly_score": 0.1234,
      "reason": null
    }
  ],
  "summary": {
    "total_records": 150,
    "anomaly_count": 8,
    "normal_count": 142,
    "contamination_used": 0.05
  },
  "total_analyzed": 150,
  "anomaly_count": 8,
  "normal_count": 142,
  "outbreak_alert": true
}
```

---

## Service Functions

### `fetch_diagnosis_data(db_url, start_date, end_date, disease)`

Fetches diagnosis records with user JOIN.

**Parameters:**
- `db_url`: Database connection string (optional)
- `start_date`: Include records on/after this date
- `end_date`: Include records on/before this date
- `disease`: Filter by disease name

**Returns:** List of SQLAlchemy Row objects

**SQL Query:**
```sql
SELECT d.*, u.* 
FROM "Diagnosis" d
JOIN "User" u ON d."userId" = u.id
WHERE COALESCE(d.latitude, u.latitude) IS NOT NULL
  AND COALESCE(d.longitude, u.longitude) IS NOT NULL
-- Optional: date and disease filters
ORDER BY d."createdAt" DESC
```

---

### `_build_feature_matrix(records)`

Converts DB rows to numeric feature matrix.

**Features (9):**

| Index | Feature | Encoding |
|-------|---------|----------|
| 0 | latitude | raw float |
| 1 | longitude | raw float |
| 2 | disease | LabelEncoder |
| 3 | district | LabelEncoder |
| 4 | month (from createdAt) | raw float (1-12) |
| 5 | confidence | raw float |
| 6 | uncertainty | raw float |
| 7 | age (from user) | raw float, median-imputed |
| 8 | gender (from user) | LabelEncoder |

**Returns:** `(X, disease_enc, district_enc, gender_enc, medians)`

- `X`: numpy array shape [n, 9]
- `disease_enc`: fitted LabelEncoder
- `district_enc`: fitted LabelEncoder
- `gender_enc`: fitted LabelEncoder
- `medians`: dict with confidence, uncertainty, and age medians for imputation

---

### `detect_anomalies(data, contamination, n_estimators, max_samples, random_state)`

Runs Isolation Forest and computes reason codes.

**Parameters:**
- `data`: List of DB rows from `fetch_diagnosis_data()`
- `contamination`: Expected outlier proportion (default 0.05)
- `n_estimators`: Tree count (default 100)
- `max_samples`: "auto" or int (default "auto")
- `random_state`: RNG seed (default 42)

**Returns:**
```python
{
    "anomalies": [...],
    "normal_diagnoses": [...],
    "summary": {
        "total_records": int,
        "anomaly_count": int,
        "normal_count": int,
        "contamination_used": float
    }
}
```

---

### `_compute_reason_codes(record, X_row, X_all, scaler, disease_enc, district_enc, gender_enc)`

Determines why a record was flagged as anomalous.

#### Algorithm

1. **Identify same-disease peers** — filter X_all to records with matching disease
2. **Compute per-disease stats** — mean/std for lat, lng, month, age; proportion for gender
3. **Compute global stats** — mean/std for confidence, uncertainty
4. **Check thresholds** — 2σ from mean for geographic, temporal, age; <20% proportion for gender; 2σ for confidence/uncertainty
5. **Build reason set** — add codes for triggered conditions
6. **Add COMBINED** — if ≥2 primary reasons, add COMBINED:MULTI
7. **Fallback** — if nothing triggered, add GEOGRAPHIC:RARE

#### Reason Codes

| Code | Condition | Baseline |
|------|-----------|----------|
| `GEOGRAPHIC:RARE` | lat > 2σ OR lng > 2σ | Per-disease |
| `TEMPORAL:RARE` | month > 2σ from disease mean | Per-disease |
| `CLUSTER:SPATIAL` | lat > 2σ AND lng > 2σ | Per-disease |
| `CONFIDENCE:LOW` | confidence < mean − 2σ | Global |
| `UNCERTAINTY:HIGH` | uncertainty > mean + 2σ | Global |
| `COMBINED:MULTI` | ≥2 primary reasons | — |
| `AGE:RARE` | patient age > 2σ from disease mean | Per-disease |
| `GENDER:RARE` | patient gender proportion <20% for this disease | Per-disease |

**Note on `GENDER:RARE`**: Because there are only 2–3 possible gender values, the standard 2σ threshold would fire too easily. Instead, the check is: if the patient's gender represents fewer than 20% of same-disease records, flag it as a minority gender for that disease.

#### Why Per-Disease?

Example: Dengue cases cluster in district A, Typhoid in district B. A Typhoid case in district B should NOT be flagged as "Unusual location" — it's normal for Typhoid. Using per-disease baselines prevents this false positive.

---

### `analyze_surveillance(db_url, start_date, end_date, disease, contamination, n_estimators, max_samples)`

End-to-end entry point.

1. Fetches data via `fetch_diagnosis_data()`
2. Runs detection via `detect_anomalies()`
3. Returns combined result

---

## Reason Code Constants

Defined at top of `surveillance_service.py`:

```python
REASON_GEOGRAPHIC_RARE = "GEOGRAPHIC:RARE"
REASON_TEMPORAL_RARE = "TEMPORAL:RARE"
REASON_CLUSTER_SPATIAL = "CLUSTER:SPATIAL"
REASON_CONFIDENCE_LOW = "CONFIDENCE:LOW"
REASON_UNCERTAINTY_HIGH = "UNCERTAINTY:HIGH"
REASON_COMBINED_MULTI = "COMBINED:MULTI"
REASON_AGE_RARE = "AGE:RARE"
REASON_GENDER_RARE = "GENDER:RARE"
```

---

## Serialization

### `_row_to_dict(record, is_anomaly, anomaly_score, reason)`

Converts DB row to JSON-serializable dict.

**Key points:**
- Handles datetime serialization via `isoformat()`
- Includes nested `user` object with all user fields
- Uses camelCase keys (`createdAt`, `userId`, `is_anomaly`)

---

## Legacy Compatibility

The old API exported `detect_outbreaks()` and `get_outbreak_summary()`. These are preserved as thin wrappers:

```python
def detect_outbreaks(...):
    result = analyze_surveillance(...)
    # Flatten summary fields to top level
    return {**result, "outbreak_alert": ...}

def get_outbreak_summary(...):
    return analyze_surveillance(...)["summary"]
```

---

## Testing

### Manual Test

```bash
cd backend
python test_flask.py
```

### Expected Output

- Returns JSON with `anomalies`, `normal_diagnoses`, `summary`
- Anomalies have non-null `reason` field
- Normal diagnoses have `reason: null`

---

## Dependencies

```
scikit-learn>=1.0
numpy>=1.20
sqlalchemy>=2.0
psycopg2-binary>=2.9
```

---

## Adding New Reason Codes

1. Add constant:
```python
REASON_NEW_CODE = "NEW:REASON"
```

2. In `_compute_reason_codes()`:
   - Decide: per-disease or global baseline?
   - Add threshold check
   - Add to `reasons` set

3. Update `COMBINED:MULTI` logic if needed

4. Return pipe-separated string:
```python
return "|".join(sorted(reasons))
```

---

## Performance Notes

- **NumPy vectorization**: All feature computations use vectorized ops
- **Label encoding**: Fitted once per request
- **Isolation Forest**: `n_jobs=-1` uses all CPU cores
- **Minimal DB queries**: Single JOIN query, no N+1

---

## Related Files

| File | Description |
|------|-------------|
| `app/api/surveillance.py` | Flask API route |
| `app/services/surveillance_service.py` | Core service logic |
| `app/utils/database.py` | DB connection |
| `frontend/documentations/ANOMALY_DETECTION_SURVEILLANCE.md` | Full system docs |

---

**Version**: 1.0
**Last Updated**: March 9, 2026
**Maintainer**: AI'll Be Sick Development Team
