# Changelog: SHAP-Based Anomaly Reason Codes

**Branch:** `main`
**Date:** April 5, 2026
**Status:** Uncommitted changes

---

## Summary

Migrated anomaly reason code generation from handcrafted z-score heuristics to SHAP (SHapley Additive exPlanations) feature contributions computed by `shap.TreeExplainer` on the Isolation Forest model. Reason codes are now derived from the actual model's decision — each feature's contribution to the anomaly score — rather than a parallel statistical analysis disconnected from the model. Added `shap_contributions` field to the API response with structured contribution magnitudes. The old z-score heuristics are kept as a zero-downtime fallback.

---

## Problem Statement

1. **Reason codes were not derived from the algorithm's thinking** — The Isolation Forest decided *whether* a record was anomalous (black-box), but reason codes were computed by our own z-score threshold checks (`> 2σ from mean`). The explanations didn't always match why the model actually flagged the record.
2. **Fallback to `GEOGRAPHIC:RARE` was misleading** — When none of the z-score checks fired, the code defaulted to `GEOGRAPHIC:RARE`, telling clinicians "unusual location" when the real cause was a complex multi-feature interaction the heuristics couldn't capture.
3. **Threshold arbitrariness** — The 2σ and 20% thresholds were hardcoded constants not tuned against any ground truth. There was no way to rank features by actual contribution magnitude.
4. **No confidence in reason codes** — A record barely over 2σ got the same badge as one at 10σ. There was no way to distinguish primary from secondary contributors.

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `backend/requirements.txt` | Modified | Added `shap>=0.44` dependency |
| `backend/app/services/surveillance_service.py` | Modified | SHAP-based reason code engine, fallback path, `shap_contributions` response field |
| `tests/backend/tests/test_per_disease_anomaly_detection.py` | Modified | Fixed path resolution, added 10 SHAP-specific unit tests, updated imports |
| `frontend/documentations/ANOMALY_DETECTION_SURVEILLANCE.md` | Modified | Version 4.0, SHAP explanation section, updated reason codes table, changelog |

---

## Detailed Changes

### 1. Backend — SHAP Reason Code Engine

**Location:** `backend/app/services/surveillance_service.py`

#### SHAP Import (Optional Dependency)

```python
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
```

**Why:** Graceful degradation — if SHAP fails to install or import, the system falls back to z-score heuristics with zero downtime.

#### Feature-to-Reason Mapping

```python
FEATURE_TO_REASON = {
    0: REASON_GEOGRAPHIC_RARE,  # latitude
    1: REASON_GEOGRAPHIC_RARE,  # longitude
    # 2 — district (skipped — LabelEncoder distortion)
    3: REASON_TEMPORAL_RARE,    # month
    4: REASON_AGE_RARE,         # age
    5: REASON_GENDER_RARE,      # gender
}

SHAP_MAGNITUDE_THRESHOLD = 0.10  # 10% of total |SHAP| sum
```

**Why:** District (index 2) is excluded because LabelEncoder assigns arbitrary ordinal integers to categorical values, making SHAP values on that feature meaningless for epidemiological interpretation.

#### New `_compute_shap_reason_codes()` Function

**Replaces:** `_compute_reason_codes()` (renamed to `_compute_reason_codes_fallback()`)

```python
def _compute_shap_reason_codes(shap_values, feature_to_reason=None, magnitude_threshold=None):
    """
    Derive reason codes from SHAP feature contributions to the Isolation Forest
    anomaly score.

    For Isolation Forest, negative SHAP values push the prediction toward
    "anomalous" (score < 0), while positive values push toward "normal".
    We only report features that pushed toward anomaly.
    """
    # 1. Filter: only negative SHAP (toward anomaly), skip district
    candidates = []
    for feat_idx in range(len(shap_values)):
        if feat_idx in SKIP_INDICES:
            continue
        if shap_values[feat_idx] < 0:
            reason = feature_to_reason.get(feat_idx)
            if reason:
                candidates.append((reason, abs(shap_values[feat_idx])))

    # 2. Sort by magnitude, apply threshold
    candidates.sort(key=lambda x: x[1], reverse=True)
    total_abs = sum(abs(sv) for sv in shap_values) + 1e-8
    thresholded = [(r, m) for r, m in candidates if m >= threshold * total_abs]

    # 3. Option B: always include top contributor (guarantees at least one reason)
    if not thresholded and candidates:
        thresholded = [candidates[0]]

    # 4. Deduplicate (lat + lng → GEOGRAPHIC:RARE)
    # 5. Add COMBINED:MULTI if ≥2 distinct reasons
    # 6. Return (reason_str, contributions_list)
```

**Why:** SHAP values directly reflect what the Isolation Forest used to make its decision. Negative values push toward anomaly, positive values push toward normal. By only reporting negative contributors above a magnitude threshold, we get honest explanations grounded in the model's actual reasoning.

#### Updated `detect_anomalies()` Loop

**Before:**
```python
for i, (record, pred, score) in enumerate(...):
    if is_anomaly:
        reason = _compute_reason_codes(
            record, X_scaled[i], X_scaled, scaler, district_enc, gender_enc,
        )
    entry = _row_to_dict(record, is_anomaly, score, reason)
```

**After:**
```python
# Compute SHAP values once per disease group (batched, efficient)
shap_values = None
if SHAP_AVAILABLE:
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_scaled)
    except Exception:
        shap_values = None

for i, (record, pred, score) in enumerate(...):
    if is_anomaly:
        if shap_values is not None:
            reason, shap_contributions = _compute_shap_reason_codes(
                shap_values[i], FEATURE_TO_REASON, SHAP_MAGNITUDE_THRESHOLD,
            )
            # Fallback if SHAP returned nothing
            if not reason:
                reason = _compute_reason_codes_fallback(...)
        else:
            reason = _compute_reason_codes_fallback(...)
    entry = _row_to_dict(record, is_anomaly, score, reason, shap_contributions)
```

**Why:** SHAP is computed once per disease group (batched across all records), not per-record — minimal overhead. The fallback path ensures zero-downtime operation.

#### Updated `_row_to_dict()` Signature

```python
def _row_to_dict(record, is_anomaly, anomaly_score, reason=None, shap_contributions=None):
    return {
        # ... existing fields ...
        "reason": reason,
        "shap_contributions": shap_contributions,  # NEW
    }
```

#### Fallback Function (Renamed Old Heuristic)

```python
def _compute_reason_codes_fallback(record, X_row, X_all, scaler, district_enc, gender_enc):
    """
    Fallback reason code computation using z-score heuristics.
    Used when SHAP is unavailable or returns empty results.
    """
    # Same logic as the old _compute_reason_codes() — 2σ threshold checks
    # ...
```

**Why:** Kept as safety net. If SHAP import fails or throws an exception at runtime, the system continues producing reason codes using the old heuristics.

---

### 2. Backend — Dependency

**Location:** `backend/requirements.txt`

```diff
 scikit-learn==1.8.0
+shap>=0.44
 SQLAlchemy>=2.0.0
```

---

### 3. Tests — SHAP Reason Code Verification

**Location:** `tests/backend/tests/test_per_disease_anomaly_detection.py`

Added `TestShapReasonCodes` class with 10 new unit tests:

| Test | What It Verifies |
|------|-----------------|
| `test_shap_reason_codes_returns_reason_and_contributions` | Returns (str, list) tuple with valid data |
| `test_shap_reason_codes_skips_district` | District (index 2) never appears in reasons |
| `test_shap_reason_codes_only_negative_features` | Only negative SHAP features reported |
| `test_shap_reason_codes_combined_multi` | COMBINED:MULTI added when ≥2 reasons |
| `test_shap_reason_codes_deduplicates_geo` | Lat + lng deduplicated to single GEOGRAPHIC:RARE |
| `test_shap_reason_codes_magnitude_threshold` | Features below 10% threshold filtered out |
| `test_shap_reason_codes_option_b_always_top_contributor` | Top contributor always included (Option B) |
| `test_shap_contributions_structure` | Correct `{reason, contribution}` dict structure |
| `test_detect_anomalies_includes_shap_contributions` | End-to-end: anomalies have shap_contributions field |
| `test_feature_to_reason_mapping_complete` | All non-district features mapped |

Also fixed the backend path resolution (`..` × 3 instead of × 2) and updated imports to reference `_compute_reason_codes_fallback` and `_compute_shap_reason_codes`.

All 32 tests pass.

---

### 4. Documentation — Version 4.0

**Location:** `frontend/documentations/ANOMALY_DETECTION_SURVEILLANCE.md`

- Updated reason codes table: "Baseline" → "Derivation" column (now "SHAP feature contribution")
- Added "SHAP-Based Explanation Generation" section with step-by-step pipeline
- Added feature-to-reason mapping table with district exclusion note
- Added response format example with `shap_contributions` field
- Updated "Adding New Reason Codes" section for SHAP workflow
- Updated testing checklist with SHAP-specific verification items
- Bumped version to 4.0, added changelog entry

---

## API Response Changes

### Before
```json
{
  "reason": "GEOGRAPHIC:RARE|TEMPORAL:RARE|COMBINED:MULTI"
}
```

### After
```json
{
  "reason": "GEOGRAPHIC:RARE|AGE:RARE|COMBINED:MULTI",
  "shap_contributions": [
    {"reason": "GEOGRAPHIC:RARE", "contribution": 0.152},
    {"reason": "AGE:RARE", "contribution": 0.089}
  ]
}
```

The `reason` field remains backward-compatible (pipe-separated string). The new `shap_contributions` field provides structured contribution magnitudes for future UI enhancements (e.g., primary vs. secondary reason badges).

---

## UI/UX Improvements

- No frontend changes required — the `reason` field format is unchanged
- Reason badges, tooltips, and color mappings work identically
- `shap_contributions` field is available for future UI enhancements (contribution magnitude display, primary/secondary reason distinction)

---

## Technical Notes

- **SHAP computation is batched** — `TreeExplainer.shap_values(X_scaled)` runs once per disease group, not per-record. Overhead is negligible for typical dataset sizes.
- **District excluded from explanations** — LabelEncoder assigns arbitrary ordinal integers (District A=0, District B=1, etc.), making SHAP values on that feature meaningless. Skipping it avoids misleading explanations.
- **Option B guarantee** — The top contributor is always included even if it doesn't pass the 10% magnitude threshold. This eliminates the old "fallback to GEOGRAPHIC:RARE" dead code path.
- **Cron job uses SHAP** — The `/api/surveillance/cron` endpoint calls `analyze_surveillance()` → `detect_anomalies()`, the same function. All cron-generated alerts will have SHAP-derived reason codes.
- **Edge Function unchanged** — The Supabase Edge Function (`surveillance-cron/index.ts`) reads the `reason` field and splits on `|`. The format is backward-compatible.
- **Fallback path** — If SHAP import fails or throws at runtime, `_compute_reason_codes_fallback()` (the old z-score heuristics) takes over. Zero downtime.

---

## Testing Checklist

- [x] `pytest tests/backend/tests/test_per_disease_anomaly_detection.py` — all 32 tests pass
- [ ] Deploy with `shap>=0.44` installed — SHAP path active
- [ ] Verify `shap_contributions` field present on anomaly API responses
- [ ] Verify district never appears in reason codes
- [ ] Verify every anomaly has at least one reason code (Option B)
- [ ] Verify COMBINED:MULTI appears when ≥2 distinct reasons present
- [ ] Verify cron job produces SHAP-based reason codes (check Alert records)
- [ ] Test fallback path: temporarily uninstall shap, verify z-score heuristics activate

---

## Related Changes

- **Version 3.0** (2026-04-05): Migrated from global to per-disease Isolation Forest models
- **Version 2.0** (2026-04-05): Migrated alert creation from event-driven to Supabase Cron-based
- **Version 1.0** (2026-03-09): Initial implementation with Isolation Forest anomaly detection
