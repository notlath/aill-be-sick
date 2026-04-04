# Changelog — `feat/geographic-clustering`

All notable changes in this branch relative to `main`.

**Branch:** `feat/geographic-clustering`
**Date:** 2026-04-05
**Version target:** TBD (next minor release)

---

## Summary

Migrated the K-Means outbreak clustering pipeline from demographic-based grouping (age, gender, disease, district) to **pure geographic coordinate-based clustering** (latitude + longitude). The system now correctly detects **geographic hotspots** — cases physically close together on a map — rather than grouping patients by demographic similarity. Added 12 comprehensive pytest tests to verify the geographic clustering behavior.

---

## Problem Statement

1. **K-Means was clustering on demographics, not geography.** Despite documentation claiming "spatial clustering," the algorithm used disease one-hot encoding, normalized age, encoded gender, and district one-hot as features. Latitude and longitude were fetched but never used as clustering features.
2. **False positives from demographic grouping.** Cases miles apart could end up in the same cluster if they shared similar age/gender/disease profiles, while geographically concentrated cases with different demographics could be split across clusters.
3. **No test coverage for clustering logic.** The outbreak detection pipeline had no unit tests, making it impossible to verify correct behavior after changes.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `backend/app/services/illness_cluster_service.py` | Modified | Added `include_coordinates` parameter with min-max normalization |
| `backend/app/services/outbreak_service.py` | Modified | Switched to geographic features, added coordinate filtering, `reference_now` parameter |
| `tests/backend/tests/test_outbreak_geographic_clustering.py` | **New** | 12 pytest tests for geographic clustering |
| `frontend/documentations/OUTBREAK_ALERT_SYSTEM.md` | Modified | Updated documentation to accurately describe geographic clustering |

---

## Detailed Changes

### 1. Coordinate Feature Support in `illness_cluster_service.py`

**Location:** `backend/app/services/illness_cluster_service.py`

**Added `include_coordinates` parameter:**

```python
def fetch_diagnosis_data(
    db_url=None,
    include_age=True,
    include_gender=True,
    include_district=True,
    include_coordinates=False,  # NEW
    include_time=False,
    ...
):
```

**Pre-computes normalization bounds** (lines 172-186):

```python
coord_bounds = None
if include_coordinates:
    valid_coords = [(row[9], row[10]) for row in data if row[9] is not None and row[10] is not None]
    if valid_coords:
        lats = [c[0] for c in valid_coords]
        lngs = [c[1] for c in valid_coords]
        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)
        lat_range = max_lat - min_lat if max_lat != min_lat else 1.0
        lng_range = max_lng - min_lng if max_lng != min_lng else 1.0
        coord_bounds = {
            "min_lat": min_lat, "max_lat": max_lat, "lat_range": lat_range,
            "min_lng": min_lng, "max_lng": max_lng, "lng_range": lng_range,
        }
```

**Appends coordinate features** (lines 254-264):

```python
if include_coordinates:
    if latitude is not None and longitude is not None and coord_bounds is not None:
        lat_norm = (latitude - coord_bounds["min_lat"]) / coord_bounds["lat_range"]
        lng_norm = (longitude - coord_bounds["min_lng"]) / coord_bounds["lng_range"]
        features.append(lat_norm)
        features.append(lng_norm)
    else:
        # Fallback for missing coordinates: center point
        features.append(0.5)
        features.append(0.5)
```

**Why:** Min-max normalization ensures latitude and longitude are on the same [0, 1] scale, preventing one axis from dominating the K-Means distance calculation. The fallback to `[0.5, 0.5]` prevents crashes when coordinates are missing.

---

### 2. Outbreak Service Switched to Geographic Clustering

**Location:** `backend/app/services/outbreak_service.py`

**Changed `fetch_diagnosis_data()` call** (lines 98-106):

```python
# Before: used default parameters (age, gender, district enabled)
encoded_data, illness_info = fetch_diagnosis_data(
    db_url=db_url,
    start_date=start_date.strftime("%Y-%m-%d"),
    end_date=end_date.strftime("%Y-%m-%d"),
)

# After: coordinates only, demographics disabled
encoded_data, illness_info = fetch_diagnosis_data(
    db_url=db_url,
    start_date=start_date.strftime("%Y-%m-%d"),
    end_date=end_date.strftime("%Y-%m-%d"),
    include_coordinates=True,
    include_age=False,
    include_gender=False,
    include_district=False,
)
```

**Added coordinate filtering** (lines 190-195):

```python
recent_indices = [
    i for i, d in enumerate(illness_info)
    if _parse_diagnosed_at(d) >= analysis_cutoff
    and d['latitude'] is not None
    and d['longitude'] is not None
]
```

**Added `reference_now` parameter for testability** (lines 93-101):

```python
def detect_outbreaks(db_url=None, reference_now=None):
    if reference_now is None:
        reference_now = datetime.now()
    end_date = reference_now
    ...
```

**Fixed `diagnosed_at` parsing** to handle both ISO strings and datetime objects (lines 116-120):

```python
def _parse_diagnosed_at(d):
    val = d['diagnosed_at']
    if isinstance(val, str):
        return datetime.fromisoformat(val)
    return val  # Already a datetime object
```

**Why:** Cases without GPS data should not participate in geographic clustering (they'd all map to the same point). The `reference_now` parameter enables deterministic testing without mocking `datetime`.

---

### 3. New Test Suite: 12 Pytest Tests

**Location:** `tests/backend/tests/test_outbreak_geographic_clustering.py` (502 lines, **new file**)

| Test Class | Test Method | What It Verifies |
|-----------|-------------|-----------------|
| `TestCoordinateNormalization` | `test_coordinate_normalization` | Coordinates normalized to [0,1], correct feature count |
| `TestDemographicFeaturesDisabled` | `test_demographic_features_disabled` | Age/gender/district NOT included when coordinates enabled |
| `TestMissingCoordinatesFallback` | `test_missing_coordinates_fallback` | NULL lat/lng → `[0.5, 0.5]` fallback |
| `TestKMeansGroupsByProximity` | `test_kmeans_groups_by_proximity` | Same-location cases → same cluster; far-apart → different clusters |
| `TestOptimalKSelection` | `test_optimal_k_selection` | Calinski-Harabasz selects k=2 for two clear clusters |
| `TestDenseClusterDetection` | `test_dense_cluster_detection` | 5+ cases in tight area → `CLUSTER:DENSE` alert |
| `TestSparseClusterNoAlert` | `test_sparse_cluster_no_alert` | 3 scattered cases → no cluster alert |
| `TestClusterEnrichesExistingAlert` | `test_cluster_enriches_existing_alert` | `CLUSTER:DENSE` added to existing threshold alert |
| `TestClusterCreatesNewAlert` | `test_cluster_creates_new_alert` | New MEDIUM alert when no threshold alert exists |
| `TestInsufficientCoordinatesSkipped` | `test_insufficient_coordinates_skipped` | < 5 valid coords → skip clustering gracefully |
| `TestAllSameLocationK1` | `test_all_same_location_k1` | Identical coordinates → k=1, no false alert |
| `TestEndToEndOutbreakDetection` | `test_end_to_end_outbreak_detection` | Full pipeline: baseline + recent cluster → correct alerts |

**Why:** Full test coverage ensures the geographic clustering behavior is verified and prevents regression. Tests use mocked database queries — no real database required.

---

### 4. Documentation Updates

**Location:** `frontend/documentations/OUTBREAK_ALERT_SYSTEM.md`

**Updated sections:**

- **K-Means Clustering section** — Added explicit feature table showing only latitude/longitude are used
- **Cluster Density Detection section** — Clarified that clustering is geographic, not demographic
- **Detection Pipeline Flow diagram** — Updated to show coordinate filtering and normalization steps
- **Technical Mermaid Flow** — Added `FilterCoords` → `Normalize` → `Run K-Means on lat/lng` steps
- **Threshold Configuration Summary** — Added rows for cluster features, normalization, and missing coordinate handling
- **Error Handling** — Added entries for missing coordinates and all-same-location edge cases
- **Version 3.0 Changelog** — Documented the migration from demographic to geographic clustering

---

## Technical Notes

- **Disease one-hot encoding is still included** in the feature vector (it's always added in `illness_cluster_service.py`). However, since the outbreak service sets `include_age=False`, `include_gender=False`, `include_district=False`, the only features present are disease one-hot + coordinates. The disease feature doesn't affect geographic grouping — it's just carried along. K-Means will still group by proximity because coordinates dominate the distance calculation when disease is a single binary column.
- **The `_parse_diagnosed_at()` helper** was added to handle both ISO strings (production path via `.isoformat()`) and datetime objects (test path). In practice, both paths produce ISO strings because `fetch_diagnosis_data()` always calls `.isoformat()` on line 282.
- **Backward compatibility:** The `include_coordinates=False` default means existing callers of `fetch_diagnosis_data()` are unaffected. Only `outbreak_service.py` explicitly enables it.

---

## Testing Checklist

- [x] `pytest tests/backend/tests/test_outbreak_geographic_clustering.py -v` — 12/12 tests passing
- [x] Coordinate normalization produces values in [0, 1] range
- [x] Missing coordinates fall back to [0.5, 0.5]
- [x] K-Means groups same-location cases together
- [x] Dense clusters (≥ 5 cases) trigger `CLUSTER:DENSE` alerts
- [x] Sparse cases (< 5) do not trigger false cluster alerts
- [x] Cluster detection enriches existing threshold alerts
- [x] Cases without GPS are excluded from clustering but still counted in threshold detection
- [x] All-same-location data returns k=1 (no false clusters)
- [x] End-to-end pipeline produces correct outbreak alerts

---

## Related Changes

- **Version 2.0** (2026-03-22): Migrated from CDC EARS C1 to DOH PIDSR methodology for threshold-based outbreak detection.
- **Version 1.0** (2026-03-14): Initial K-Means spatial clustering implementation (was demographic, not geographic).
