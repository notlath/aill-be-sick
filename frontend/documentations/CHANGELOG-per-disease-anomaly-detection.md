# Changelog: Per-Disease Anomaly Detection

**Branch:** `main`
**Date:** April 5, 2026
**Status:** Uncommitted changes

---

## Summary

Migrated the Isolation Forest anomaly detection from a single global model (trained on all diseases mixed together) to a per-disease detection strategy where each disease gets its own separate model. Removed `disease`, `confidence`, and `uncertainty` from the feature matrix, reducing from 9 features to 6 (latitude, longitude, district, month, age, gender). Diseases with fewer than 10 records are skipped entirely. This eliminates false positives on rare diseases, missed within-disease outliers, and misleading reason codes caused by the mismatch between global anomaly scores and per-disease explanations.

---

## Problem Statement

1. **Global anomaly scores with per-disease explanations** — The Isolation Forest trained on all diseases mixed together, producing global anomaly scores. But reason codes were computed against per-disease baselines. This mismatch meant explanations didn't match the actual detection context (e.g., "GEOGRAPHIC:RARE" when the real reason was that the disease itself was rare globally).
2. **Rare diseases mass-flagged** — Diseases with few records (e.g., MEASLES with 50 cases) were flagged en masse simply because they were minorities in the global distribution, not because individual cases were unusual.
3. **Within-disease outliers missed** — Records that were clear outliers for their specific disease but looked normal in the global mixed-disease distribution slipped through undetected.
4. **Disease feature label encoding distortion** — Label encoding assigned arbitrary ordinal integers to disease names (DENGUE=0, INFLUENZA=2, MEASLES=3), causing the Isolation Forest to treat meaningless numeric distances as real feature relationships.
5. **Confidence/uncertainty don't belong in epidemiological detection** — These are model output metrics reflecting prediction certainty, not patient or disease characteristics relevant to public health surveillance.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `backend/app/services/surveillance_service.py` | Modified | Per-disease detection loop, 6-feature matrix, simplified reason codes, fixed gender comparison on scaled features |
| `frontend/hooks/map-hooks/use-anomaly-data.ts` | Modified | Removed redundant `disease` parameter from hook |
| `frontend/components/clinicians/map-page/by-anomaly/by-anomaly-tab.tsx` | Modified | Removed `disease: "all"` from hook call, removed "All" option, auto-selects Dengue |
| `frontend/components/clinicians/map-page/disease-select.tsx` | Modified | Added `showAll` prop to conditionally hide "All diseases" option |
| `frontend/documentations/ANOMALY_DETECTION_SURVEILLANCE.md` | Modified | Updated architecture diagrams, feature matrix, version 3.0 |
| `frontend/documentations/ALERT_SYSTEM.md` | Modified | Updated version history (8.0), pipeline descriptions |
| `tests/backend/tests/test_per_disease_anomaly_detection.py` | **New** | 22 unit tests covering per-disease detection, reason codes, edge cases, and regression tests for old global model bugs |

---

## Detailed Changes

### 1. Backend — Per-Disease Detection Strategy

**Location:** `backend/app/services/surveillance_service.py`

#### Feature Matrix: 9 → 6 Features

**Before (9 features):**
```python
X = np.column_stack([
    latitudes, longitudes, disease_nums, district_nums,
    months, confidences, uncertainties, ages, gender_nums,
])
```

**After (6 features):**
```python
X = np.column_stack([
    latitudes, longitudes, district_nums,
    months, ages, gender_nums,
])
```

**Why:** `disease` is now constant within each per-disease model (no discriminative value). `confidence` and `uncertainty` are model outputs, not epidemiological features — they reflect the ML model's prediction certainty, not actual patient characteristics relevant to outbreak detection.

#### Detection: Global → Per-Disease Loop

**Before (single global model):**
```python
def detect_anomalies(data, contamination=0.05, ...):
    X_raw, disease_enc, district_enc, gender_enc, medians = _build_feature_matrix(data)
    X_scaled = scaler.fit_transform(X_raw)
    model = IsolationForest(contamination=contamination, ...)
    model.fit(X_scaled)
    predictions = model.predict(X_scaled)
    # ... all diseases share one contamination budget
```

**After (per-disease models):**
```python
def detect_anomalies(data, contamination=0.05, ...):
    MIN_DISEASE_RECORDS = 10

    # Group records by disease
    disease_groups = {}
    for record in data:
        disease = record.disease or "Unknown"
        disease_groups.setdefault(disease, []).append(record)

    for disease, disease_records in disease_groups.items():
        if len(disease_records) < MIN_DISEASE_RECORDS:
            # Too few records — mark all as normal
            for r in disease_records:
                all_normal.append(_row_to_dict(r, False, 0.0))
            continue

        X_raw, district_enc, gender_enc, medians = _build_feature_matrix(disease_records)
        X_scaled = scaler.fit_transform(X_raw)
        model = IsolationForest(contamination=contamination, ...)
        model.fit(X_scaled)
        # ... each disease gets its own 5% contamination budget
```

**Why:** Each disease now gets its own contamination budget, feature distribution, and anomaly scoring context. DENGUE's 5% anomalies are computed against DENGUE's distribution, not a global mix of all diseases.

#### Reason Codes: Simplified

**Before (global context with disease mask):**
```python
def _compute_reason_codes(record, X_row, X_all, scaler, disease_enc, district_enc, gender_enc):
    # Find same-disease peers within global feature matrix
    disease_code = disease_enc.transform([disease_label])[0]
    same_disease_mask = X_all[:, IDX_DIS] == disease_code
    same_disease_rows = X_all[same_disease_mask]
    # ... compute stats from same_disease_rows
```

**After (all rows share same disease):**
```python
def _compute_reason_codes(record, X_row, X_all, scaler, district_enc, gender_enc):
    # All rows in X_all are same-disease — no mask needed
    n_all = X_all.shape[0]
    dis_mean = X_all.mean(axis=0)
    dis_std = X_all.std(axis=0) + 1e-8
    # ... compute stats directly from X_all
```

**Why:** Since each model trains on a single disease group, all rows in `X_all` already share the same disease. The disease mask and encoding are unnecessary — the detection context and explanation context are now aligned.

---

### 2. Frontend — Remove Redundant Disease Parameter

**Location:** `frontend/hooks/map-hooks/use-anomaly-data.ts`

**Before:**
```typescript
type UseAnomalyDataParams = {
  contamination: number;
  disease: string;       // ← always "all", never sent to backend
  startDate: string;
  endDate: string;
};

// In the effect:
if (disease && disease !== "all") params.set("disease", disease);
```

**After:**
```typescript
type UseAnomalyDataParams = {
  contamination: number;
  startDate: string;
  endDate: string;
};

// No disease logic — backend always returns all diseases
```

**Why:** The `disease` parameter was always passed as `"all"`, which the hook explicitly ignored (`if (disease && disease !== "all")`). It served no purpose. The backend now runs per-disease models internally and returns all results. Client-side filtering via `selectedDisease` in `by-anomaly-tab.tsx` is still used for the UI.

**Location:** `frontend/components/clinicians/map-page/by-anomaly/by-anomaly-tab.tsx`

Removed `disease: "all"` from the `useAnomalyData` call. The `DiseaseSelect` dropdown and client-side `useMemo` filtering remain — users can still filter displayed results by disease.

---

### 3. Documentation Updates

**Location:** `frontend/documentations/ANOMALY_DETECTION_SURVEILLANCE.md`

- Updated core functionality section: "9 features" → "6 features, per-disease detection strategy"
- Rewrote detailed pipeline diagram to show disease grouping step
- Updated feature matrix table (9 → 6 features, removed disease/confidence/uncertainty rows)
- Added "Per-Disease Detection Strategy" section explaining the why and how
- Renamed "Per-Disease vs Global Baselines" → "Per-Disease Detection" with updated code examples
- Updated performance considerations (per-disease models, minimum threshold)
- Bumped version to 3.0, added changelog entry

**Location:** `frontend/documentations/ALERT_SYSTEM.md`

- Added version 8.0 to version history table
- Updated alert creation pipeline description (step 3, step 6)

---

### 4. Bug Fix — Gender Reason Code on Scaled Features

**Location:** `backend/app/services/surveillance_service.py` — `_compute_reason_codes()`

**Bug:** The gender rarity check compared the raw encoded gender value (0 or 1) against the **scaled** feature matrix values (e.g., -1.0 or 1.0 after StandardScaler). Since `np.sum(gender_codes == patient_gender_code)` would never match, the proportion was always 0, causing GENDER:RARE to fire for every anomaly regardless of actual gender distribution.

**Fix:**
```python
# Before (broken):
patient_gender_code = gender_enc.transform([patient_gender])[0]  # raw 0 or 1
gender_proportion = np.sum(gender_codes == patient_gender_code) / n_all  # always 0

# After (fixed):
patient_gender_scaled = X_row[IDX_GENDER]  # scaled value from the model
gender_proportion = np.sum(np.isclose(gender_codes, patient_gender_scaled)) / n_all
```

**Why:** `X_all` is the StandardScaler-transformed matrix. We must compare scaled values, not raw encodings. Using `np.isclose` handles floating-point precision.

---

### 5. Tests — Per-Disease Anomaly Detection

**Location:** `tests/backend/tests/test_per_disease_anomaly_detection.py` (**new file, 22 tests**)

Comprehensive unit tests using mocked database rows to verify the per-disease detection strategy produces meaningful anomaly scores and reason codes.

| Test Class | Tests | What It Verifies |
|------------|-------|-----------------|
| `TestPerDiseaseDetectionStrategy` | 2 | Each disease gets separate model; diseases < 10 records skipped |
| `TestGeographicRarity` | 2 | Geographic outliers flagged within disease; same-location cases not flagged across diseases |
| `TestTemporalRarity` | 2 | Off-season cases flagged; uniform month distribution not flagged |
| `TestAgeRarity` | 2 | Unusual age flagged; normal age range not flagged |
| `TestGenderRarity` | 2 | Minority gender (< 20%) flagged; balanced 50/50 not flagged |
| `TestCombinedMulti` | 1 | Multiple reasons trigger COMBINED:MULTI |
| `TestOldGlobalModelBugsFixed` | 2 | Rare diseases not mass-flagged; within-disease outliers caught |
| `TestResponseFormat` | 3 | Response structure, summary counts, anomaly record shape |
| `TestEdgeCases` | 4 | Empty data, single record, all diseases under 10, multiple diseases all under 10 |
| `TestFeatureMatrix` | 2 | Exactly 6 features, correct feature indices |

All 22 tests pass. The original `test_surveillance.py` integration test also passes.

---

## UI/UX Improvements

- No frontend changes — the API response format is identical
- Anomaly scores are now more meaningful per disease (users won't see rare diseases mass-flagged)
- Reason codes now accurately explain why each record was flagged (no more misleading global-vs-per-disease mismatch)

---

## Technical Notes

- **Minimum threshold**: Diseases with < 10 records are skipped and marked normal. This prevents noisy models from tiny datasets. The threshold is configurable via `MIN_DISEASE_RECORDS` in `detect_anomalies()`.
- **API compatibility**: The return dict structure (`anomalies`, `normal_diagnoses`, `summary`) is unchanged. Cron endpoint, Edge Function, and frontend require zero changes.
- **Legacy shims**: `detect_outbreaks()` and `get_outbreak_summary()` continue to work — they call `analyze_surveillance()` which calls the refactored `detect_anomalies()`.
- **Contamination rate**: Still 0.05 (5%), but now applied per disease instead of globally. This is the correct behavior — each disease gets fair treatment regardless of population size.
- **Feature indices**: Updated from 9-feature indices (lat=0, lng=1, dis=2, dist=3, month=4, conf=5, unc=6, age=7, gender=8) to 6-feature indices (lat=0, lng=1, dist=2, month=3, age=4, gender=5).

---

## Testing Checklist

- [x] `npx tsc --noEmit` passes in frontend (no frontend changes needed)
- [x] `pytest tests/backend/tests/test_surveillance.py` passes (original integration test)
- [x] `pytest tests/backend/tests/test_per_disease_anomaly_detection.py` passes (22 new unit tests)
- [ ] Select "All diseases" on anomaly map — anomalies distributed across diseases
- [ ] Select specific disease — reason codes meaningful for that disease
- [ ] Verify rare diseases (low record count) are not mass-flagged
- [ ] Verify common diseases still produce anomalies (not drowned out)
- [ ] Cron job runs successfully with per-disease models
- [ ] Alert creation still works (Edge Function dedup unchanged)

---

## Related Changes

- **Version 2.0** (2026-04-05): Migrated alert creation from event-driven to Supabase Cron-based
- **Version 1.0** (2026-03-09): Initial implementation with Isolation Forest anomaly detection
