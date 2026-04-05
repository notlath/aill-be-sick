# surveillance_service.py
# Isolation Forest for Outbreak Monitoring and Anomaly Detection
import os
import time
import threading
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sqlalchemy import text
from datetime import datetime
from app.utils.database import get_db_engine

# SHAP for explainable anomaly reason codes (optional — falls back to z-score heuristics)
try:
    import shap

    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False


# ---------------------------------------------------------------------------
# Reason Codes
# Each anomaly is tagged with one or more pipe-separated reason codes.
# The frontend can map these to human-readable, localised messages.
# ---------------------------------------------------------------------------
REASON_GEOGRAPHIC_RARE = "GEOGRAPHIC:RARE"
REASON_TEMPORAL_RARE = "TEMPORAL:RARE"
REASON_COMBINED_MULTI = "COMBINED:MULTI"
REASON_AGE_RARE = "AGE:RARE"
REASON_GENDER_RARE = "GENDER:RARE"

# Feature index → reason code mapping for SHAP-based explanations.
# Index 2 (district) is intentionally excluded — LabelEncoder distortion makes
# its SHAP values meaningless for epidemiological interpretation.
FEATURE_TO_REASON = {
    0: REASON_GEOGRAPHIC_RARE,  # latitude
    1: REASON_GEOGRAPHIC_RARE,  # longitude
    # 2 — district (skipped — LabelEncoder distortion)
    3: REASON_TEMPORAL_RARE,  # month
    4: REASON_AGE_RARE,  # age
    5: REASON_GENDER_RARE,  # gender
}

# Minimum fraction of total absolute SHAP magnitude for a feature to be
# reported as a contributing reason. Filters out noise contributors.
SHAP_MAGNITUDE_THRESHOLD = 0.10


# ---------------------------------------------------------------------------
# In-Memory Cache for Surveillance Results
# Caches full surveillance runs (disease=None) for 5 minutes to avoid
# re-running the expensive ML pipeline on repeated requests (cron + frontend).
# ---------------------------------------------------------------------------
_SURVEILLANCE_CACHE: dict[str, dict] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes
_CACHE_LOCK = threading.Lock()


def _cache_key(start_date, end_date, contamination):
    """Build a deterministic cache key from surveillance parameters."""
    return f"{start_date}|{end_date}|{contamination}"


def _get_cached(key: str):
    """Return cached result if present and not expired, else None."""
    with _CACHE_LOCK:
        if key in _SURVEILLANCE_CACHE:
            entry = _SURVEILLANCE_CACHE[key]
            if time.time() - entry["timestamp"] < _CACHE_TTL_SECONDS:
                return entry["data"]
            del _SURVEILLANCE_CACHE[key]
    return None


def _set_cache(key: str, data):
    """Store result in cache with current timestamp."""
    with _CACHE_LOCK:
        _SURVEILLANCE_CACHE[key] = {
            "data": data,
            "timestamp": time.time(),
        }


def clear_surveillance_cache():
    """Public utility for tests and manual cache invalidation."""
    with _CACHE_LOCK:
        _SURVEILLANCE_CACHE.clear()


def fetch_diagnosis_data(
    db_url=None, start_date=None, end_date=None, disease=None, limit=None, offset=None
):
    """
    Fetch diagnosis data joined with user information.

    Args:
        db_url:     Database connection string (optional; falls back to DATABASE_URL env var)
        start_date: Include records on or after this date (inclusive, optional)
        end_date:   Include records on or before this date (inclusive, optional)
        disease:    Filter by disease name (optional)
        limit:      Maximum number of records to return (optional)
        offset:     Number of records to skip (optional)

    Returns:
        List of SQLAlchemy Row objects (empty list when no data found)
    """
    engine = get_db_engine(db_url)

    # NOTE: The latitude/longitude columns represent the PATIENT'S RESIDENTIAL LOCATION,
    # not the healthcare facility where diagnosis occurred. This is critical for
    # accurate disease surveillance, clustering analysis, and outbreak detection.
    # Using healthcare facility coordinates would cause all patients to appear at the
    # same location, breaking spatial analysis entirely.
    #
    # COALESCE(d.latitude, u.latitude) uses diagnosis-time coordinates if available,
    # falling back to the patient's home location stored in the User record.
    query_str = """
        SELECT
            d.id,
            d.disease,
            d."createdAt",
            -- Patient's residential coordinates (from diagnosis or User record)
            COALESCE(d.latitude,  u.latitude)  AS latitude,
            COALESCE(d.longitude, u.longitude) AS longitude,
            COALESCE(d.city,      u.city)      AS city,
            COALESCE(d.province,  u.province)  AS province,
            COALESCE(d.barangay,  u.barangay)  AS barangay,
            COALESCE(d.region,    u.region)    AS region,
            d.district,
            d.confidence,
            d.uncertainty,
            u.id        AS user_id,
            u.name      AS user_name,
            u.email     AS user_email,
            u.role      AS user_role,
            u.city      AS user_city,
            u.region    AS user_region,
            u.province  AS user_province,
            u.barangay  AS user_barangay,
            u.district  AS user_district,
            u.latitude  AS user_latitude,
            u.longitude AS user_longitude,
            u.age       AS user_age,
            u.gender    AS user_gender
        FROM "Diagnosis" d
        JOIN "User" u ON d."userId" = u.id
        WHERE COALESCE(d.latitude, u.latitude)  IS NOT NULL
          AND COALESCE(d.longitude, u.longitude) IS NOT NULL
          AND u.age IS NOT NULL
          AND u.gender IS NOT NULL
          AND d.status = 'VERIFIED'
    """

    params = {}

    if start_date:
        query_str += ' AND d."createdAt" >= :start_date '
        params["start_date"] = start_date

    if end_date:
        query_str += ' AND d."createdAt" <= :end_date '
        params["end_date"] = end_date

    if disease:
        query_str += " AND d.disease = :disease "
        params["disease"] = disease

    query_str += ' ORDER BY d."createdAt" DESC'

    if limit:
        query_str += " LIMIT :limit"
        params["limit"] = limit

    if offset:
        query_str += " OFFSET :offset"
        params["offset"] = offset

    with engine.connect() as conn:
        result = conn.execute(text(query_str), params)
        data = result.fetchall()

    return data if data else []


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _build_feature_matrix(records):
    """
    Convert raw DB rows into a numeric feature matrix.

    Features (6):
        0 - latitude
        1 - longitude
        2 - district (label-encoded)
        3 - month (1-12)
        4 - age (raw float, median-imputed)
        5 - gender (label-encoded)

    Returns:
        X            (np.ndarray, shape [n, 6])
        district_enc (LabelEncoder fitted on district column)
        gender_enc   (LabelEncoder fitted on gender column)
        medians      (dict of per-feature median for imputation reference)
    """
    # Extract raw columns
    latitudes = np.array([r.latitude for r in records], dtype=float)
    longitudes = np.array([r.longitude for r in records], dtype=float)
    districts = np.array([r.district if r.district else "Unknown" for r in records])
    months = np.array(
        [
            (
                r.createdAt.month
                if hasattr(r.createdAt, "month")
                else datetime.fromisoformat(str(r.createdAt)).month
            )
            for r in records
        ],
        dtype=float,
    )
    ages = np.array(
        [r.user_age if r.user_age is not None else np.nan for r in records],
        dtype=float,
    )
    genders = np.array([r.user_gender if r.user_gender else "Unknown" for r in records])

    # Impute numeric NaNs with column median
    def _fill_median(arr):
        med = np.nanmedian(arr) if not np.all(np.isnan(arr)) else 0.0
        arr[np.isnan(arr)] = med
        return arr, float(med)

    ages, age_med = _fill_median(ages)

    # Label-encode categorical columns
    district_enc = LabelEncoder()
    gender_enc = LabelEncoder()
    district_nums = district_enc.fit_transform(districts).astype(float)
    gender_nums = gender_enc.fit_transform(genders).astype(float)

    X = np.column_stack(
        [
            latitudes,
            longitudes,
            district_nums,
            months,
            ages,
            gender_nums,
        ]
    )

    medians = {"age": age_med}
    return X, district_enc, gender_enc, medians


def _compute_shap_reason_codes(shap_values, feature_to_reason=None, magnitude_threshold=None):
    """
    Derive reason codes from SHAP feature contributions to the Isolation Forest
    anomaly score.

    For Isolation Forest, negative SHAP values push the prediction toward
    "anomalous" (score < 0), while positive values push toward "normal".
    We only report features that pushed toward anomaly.

    Args:
        shap_values:        np.ndarray of shape (6,) — SHAP values for one record
        feature_to_reason:  dict mapping feature index → reason code constant
        magnitude_threshold: minimum fraction of total |SHAP| sum to report

    Returns:
        (reason_str, contributions) where:
            reason_str     — pipe-separated reason codes, e.g. "GEOGRAPHIC:RARE|AGE:RARE"
            contributions  — list of {"reason": str, "contribution": float} dicts
    """
    if feature_to_reason is None:
        feature_to_reason = FEATURE_TO_REASON
    if magnitude_threshold is None:
        magnitude_threshold = SHAP_MAGNITUDE_THRESHOLD

    # Feature indices to skip (LabelEncoder distortion)
    SKIP_INDICES = {2}  # district

    # Only features that pushed TOWARD anomaly (negative SHAP for IF)
    # and are not in the skip set
    candidates = []
    for feat_idx in range(len(shap_values)):
        if feat_idx in SKIP_INDICES:
            continue
        if shap_values[feat_idx] < 0:  # negative = toward anomaly
            reason = feature_to_reason.get(feat_idx)
            if reason:
                candidates.append((reason, abs(shap_values[feat_idx])))

    # Sort by contribution magnitude (largest first)
    candidates.sort(key=lambda x: x[1], reverse=True)

    # Apply magnitude threshold: only report features above the threshold
    total_abs = sum(abs(sv) for sv in shap_values) + 1e-8
    thresholded = [
        (reason, mag)
        for reason, mag in candidates
        if mag >= magnitude_threshold * total_abs
    ]

    # Option B: always include the top contributor regardless of threshold
    # This guarantees every anomaly gets at least one reason
    if not thresholded and candidates:
        thresholded = [candidates[0]]

    # Deduplicate (lat + lng both map to GEOGRAPHIC:RARE)
    seen = set()
    reasons = []
    contributions = []
    for reason, mag in thresholded:
        if reason not in seen:
            reasons.append(reason)
            contributions.append({"reason": reason, "contribution": round(float(mag), 6)})
            seen.add(reason)

    # COMBINED:MULTI if ≥2 distinct reasons
    if len(reasons) >= 2:
        reasons.append(REASON_COMBINED_MULTI)

    # Safety net: if SHAP found nothing at all (shouldn't happen with Option B),
    # fall back to the top contributor regardless of sign
    if not reasons and candidates:
        top_reason = candidates[0][0]
        reasons.append(top_reason)
        contributions.append(
            {"reason": top_reason, "contribution": round(float(candidates[0][1]), 6)}
        )

    reason_str = "|".join(reasons) if reasons else None
    return reason_str, contributions


def _compute_reason_codes_fallback(record, X_row, X_all, scaler, district_enc, gender_enc):
    """
    Fallback reason code computation using z-score heuristics.
    Used when SHAP is unavailable or returns empty results.

    Strategy (per-disease model — all rows in X_all share the same disease):
        - Geographic rarity: lat or lng is > 2σ from the disease's mean location.
        - Temporal rarity: month is > 2σ from the disease's mean month.
        - Age rarity: patient age is > 2σ from the disease's mean age.
        - Gender rarity: patient gender represents < 20% of cases for this disease.
        - COMBINED:MULTI when ≥ 2 distinct reason families triggered.

    Args:
        record:      Raw DB row for this anomaly
        X_row:       Scaled feature vector (shape [6])
        X_all:       All scaled feature vectors for this disease (shape [n, 6])
        scaler:      Fitted StandardScaler
        district_enc:Fitted LabelEncoder for district
        gender_enc:  Fitted LabelEncoder for gender

    Returns:
        Pipe-separated reason code string, e.g. "GEOGRAPHIC:RARE|TEMPORAL:RARE|COMBINED:MULTI"
    """
    reasons = set()

    # Feature indices (6 features)
    IDX_LAT = 0
    IDX_LNG = 1
    IDX_DIST = 2
    IDX_MONTH = 3
    IDX_AGE = 4
    IDX_GENDER = 5

    THRESHOLD = 2.0  # standard deviations
    GENDER_MINORITY_THRESHOLD = 0.20

    n_all = X_all.shape[0]

    if n_all > 1:
        dis_mean = X_all.mean(axis=0)
        dis_std = X_all.std(axis=0) + 1e-8
    else:
        # Only one record for this disease — use global stats as fallback
        dis_mean = X_all.mean(axis=0)
        dis_std = X_all.std(axis=0) + 1e-8

    # ── Geographic rarity ─────────────────────────────────────────────────────
    lat_outlier = abs(X_row[IDX_LAT] - dis_mean[IDX_LAT]) > THRESHOLD * dis_std[IDX_LAT]
    lng_outlier = abs(X_row[IDX_LNG] - dis_mean[IDX_LNG]) > THRESHOLD * dis_std[IDX_LNG]

    if lat_outlier or lng_outlier:
        reasons.add(REASON_GEOGRAPHIC_RARE)

    # ── Temporal rarity ───────────────────────────────────────────────────────
    if n_all > 1:
        month_mean = X_all[:, IDX_MONTH].mean()
        month_std = X_all[:, IDX_MONTH].std() + 1e-8
        if abs(X_row[IDX_MONTH] - month_mean) > THRESHOLD * month_std:
            reasons.add(REASON_TEMPORAL_RARE)
    else:
        # Only one record for this disease — inherently rare in time
        reasons.add(REASON_TEMPORAL_RARE)

    # ── Age rarity ────────────────────────────────────────────────────────────
    if n_all > 1:
        age_mean = X_all[:, IDX_AGE].mean()
        age_std = X_all[:, IDX_AGE].std() + 1e-8
        if abs(X_row[IDX_AGE] - age_mean) > THRESHOLD * age_std:
            reasons.add(REASON_AGE_RARE)
    # If only one same-disease record, skip — single-record age is not meaningful

    # ── Gender rarity (per-disease proportion check) ──────────────────────────
    # X_all is the SCALED feature matrix, so we compare the patient's scaled
    # gender value against all scaled gender values (not the raw 0/1 encoding).
    try:
        if n_all > 1:
            patient_gender_scaled = X_row[IDX_GENDER]
            gender_codes = X_all[:, IDX_GENDER]
            gender_proportion = (
                np.sum(np.isclose(gender_codes, patient_gender_scaled)) / n_all
            )
            if gender_proportion < GENDER_MINORITY_THRESHOLD:
                reasons.add(REASON_GENDER_RARE)
    except Exception:
        pass

    # ── COMBINED:MULTI ────────────────────────────────────────────────────────
    primary_reasons = reasons - {REASON_COMBINED_MULTI}
    if len(primary_reasons) >= 2:
        reasons.add(REASON_COMBINED_MULTI)

    # Fallback: if nothing matched, tag as geographic
    if not reasons:
        reasons.add(REASON_GEOGRAPHIC_RARE)

    return "|".join(sorted(reasons))


def _row_to_dict(record, is_anomaly, anomaly_score, reason=None, shap_contributions=None):
    """
    Serialize a DB row to a plain dict suitable for JSON serialisation.
    """
    created_at = record.createdAt
    if hasattr(created_at, "isoformat"):
        created_at = created_at.isoformat()
    else:
        created_at = str(created_at)

    return {
        "id": record.id,
        "disease": record.disease,
        "createdAt": created_at,
        "latitude": record.latitude,
        "longitude": record.longitude,
        "city": record.city,
        "province": record.province,
        "barangay": record.barangay,
        "region": record.region,
        "district": record.district,
        "confidence": record.confidence,
        "uncertainty": record.uncertainty,
        "userId": record.user_id,
        "user": {
            "id": record.user_id,
            "name": record.user_name,
            "email": record.user_email,
            "role": record.user_role,
            "city": record.user_city,
            "region": record.user_region,
            "province": record.user_province,
            "barangay": record.user_barangay,
            "district": record.user_district,
            "latitude": record.user_latitude,
            "longitude": record.user_longitude,
            "age": record.user_age,
            "gender": record.user_gender,
        },
        "is_anomaly": is_anomaly,
        "anomaly_score": round(float(anomaly_score), 4),
        "reason": reason,
        "shap_contributions": shap_contributions,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def detect_anomalies(
    data, contamination=0.05, n_estimators=50, max_samples="auto", random_state=42
):
    """
    Detect anomalies in a list of diagnosis records using Isolation Forest.

    Runs a separate Isolation Forest per disease so that each disease gets its
    own contamination budget and feature distribution.  Diseases with fewer
    than MIN_DISEASE_RECORDS records are skipped (all marked normal) because
    the model cannot learn a meaningful distribution from too few samples.

    Disease groups are processed in parallel using ThreadPoolExecutor for
    performance.  Each disease already uses n_jobs=-1 internally, so the
    thread pool is capped at the number of disease groups to avoid oversubscription.

    Args:
        data:          List of DB rows from fetch_diagnosis_data()
        contamination: Expected proportion of outliers per disease (default 0.05)
        n_estimators:  Number of trees in the forest (default 50)
        max_samples:   Samples per tree; 'auto' = min(256, n_samples)
        random_state:  RNG seed for reproducibility (default 42)

    Returns:
        dict with keys:
            anomalies         – list of anomalous diagnosis dicts
            normal_diagnoses  – list of normal diagnosis dicts
            summary           – aggregate statistics
    """
    t0 = time.time()
    MIN_DISEASE_RECORDS = 10

    if len(data) < 2:
        return {
            "anomalies": [],
            "normal_diagnoses": [_row_to_dict(r, False, 0.0) for r in data],
            "summary": {
                "total_records": len(data),
                "anomaly_count": 0,
                "normal_count": len(data),
                "contamination_used": contamination,
            },
        }

    # Group records by disease
    disease_groups: dict[str, list] = {}
    for record in data:
        disease = record.disease if record.disease else "Unknown"
        if disease not in disease_groups:
            disease_groups[disease] = []
        disease_groups[disease].append(record)

    t_group = time.time()
    print(f"[PERF] Grouping: {t_group - t0:.3f}s ({len(data)} records, {len(disease_groups)} diseases)")

    all_anomalies = []
    all_normal = []

    # Process diseases with enough records in parallel
    eligible_diseases = {
        d: records
        for d, records in disease_groups.items()
        if len(records) >= MIN_DISEASE_RECORDS
    }

    if eligible_diseases:
        max_workers = min(len(eligible_diseases), 6)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(
                    _process_disease_group,
                    disease,
                    records,
                    contamination,
                    n_estimators,
                    max_samples,
                    random_state,
                ): disease
                for disease, records in eligible_diseases.items()
            }

            for future in as_completed(futures):
                disease = futures[future]
                try:
                    disease_anomalies, disease_normal_list = future.result()
                    all_anomalies.extend(disease_anomalies)
                    all_normal.extend(disease_normal_list)
                except Exception:
                    print(f"[ERROR] Failed to process disease: {disease}")
                    # Fall back: mark all records as normal
                    for r in disease_groups[disease]:
                        all_normal.append(_row_to_dict(r, False, 0.0))

    # Handle diseases with too few records (sequential, trivial)
    for disease, records in disease_groups.items():
        if len(records) < MIN_DISEASE_RECORDS:
            for r in records:
                all_normal.append(_row_to_dict(r, False, 0.0))

    t_total = time.time()
    print(f"[PERF] detect_anomalies total: {t_total - t0:.3f}s")

    return {
        "anomalies": all_anomalies,
        "normal_diagnoses": all_normal,
        "summary": {
            "total_records": len(data),
            "anomaly_count": len(all_anomalies),
            "normal_count": len(all_normal),
            "contamination_used": contamination,
        },
    }


def _process_disease_group(
    disease: str,
    disease_records: list,
    contamination: float,
    n_estimators: int,
    max_samples,
    random_state: int,
) -> tuple[list, list]:
    """
    Process a single disease group: build features → train IF → SHAP → serialize.

    Returns:
        (anomalies, normal) — two lists of serialized record dicts
    """
    t_start = time.time()

    # Build 6-feature matrix (no disease column — constant within group)
    t_feat = time.time()
    X_raw, district_enc, gender_enc, medians = _build_feature_matrix(disease_records)
    t_feat_end = time.time()
    print(f"[PERF]   {disease}: feature matrix {t_feat_end - t_feat:.3f}s ({len(disease_records)} records)")

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)

    # Train Isolation Forest on this disease only
    t_fit_start = time.time()
    model = IsolationForest(
        n_estimators=n_estimators,
        max_samples=max_samples,
        contamination=contamination,
        random_state=random_state,
        n_jobs=1,  # Single thread — diseases are already parallelized externally
    )
    model.fit(X_scaled)
    t_fit_end = time.time()
    print(f"[PERF]   {disease}: IF fit {t_fit_end - t_fit_start:.3f}s")

    # Predictions: -1 = anomaly, +1 = normal
    t_pred_start = time.time()
    predictions = model.predict(X_scaled)
    # Anomaly scores: lower (more negative) = more anomalous
    scores = model.decision_function(X_scaled)
    t_pred_end = time.time()
    print(f"[PERF]   {disease}: predict+scores {t_pred_end - t_pred_start:.3f}s")

    # Compute SHAP values ONLY for anomaly records (typically ~5% of data).
    anomaly_indices = [i for i, p in enumerate(predictions) if p == -1]
    anomaly_shap_map: dict[int, np.ndarray] = {}

    t_shap_start = time.time()
    if SHAP_AVAILABLE and anomaly_indices:
        try:
            X_anomalies = X_scaled[anomaly_indices]
            explainer = shap.TreeExplainer(model)
            shap_values_subset = explainer.shap_values(X_anomalies)

            # Map SHAP values back to original indices
            for j, idx in enumerate(anomaly_indices):
                anomaly_shap_map[idx] = shap_values_subset[j]
        except Exception:
            pass  # Fall back to z-score heuristics for all anomalies
    t_shap_end = time.time()
    print(f"[PERF]   {disease}: SHAP on {len(anomaly_indices)} anomalies {t_shap_end - t_shap_start:.3f}s")

    t_serialize_start = time.time()
    disease_anomalies = []
    disease_normal = []

    for i, (record, pred, score) in enumerate(zip(disease_records, predictions, scores)):
        is_anomaly = bool(pred == -1)
        reason = None
        shap_contributions = None

        if is_anomaly:
            shap_vals = anomaly_shap_map.get(i)
            if shap_vals is not None:
                reason, shap_contributions = _compute_shap_reason_codes(
                    shap_vals,
                    FEATURE_TO_REASON,
                    SHAP_MAGNITUDE_THRESHOLD,
                )
                # Fallback to z-score heuristics if SHAP returned nothing
                if not reason:
                    reason = _compute_reason_codes_fallback(
                        record,
                        X_scaled[i],
                        X_scaled,
                        scaler,
                        district_enc,
                        gender_enc,
                    )
            else:
                reason = _compute_reason_codes_fallback(
                    record,
                    X_scaled[i],
                    X_scaled,
                    scaler,
                    district_enc,
                    gender_enc,
                )

        entry = _row_to_dict(record, is_anomaly, score, reason, shap_contributions)

        if is_anomaly:
            disease_anomalies.append(entry)
        else:
            disease_normal.append(entry)

    t_serialize_end = time.time()
    t_total = time.time()
    print(f"[PERF]   {disease}: serialize {t_serialize_end - t_serialize_start:.3f}s, total {t_total - t_start:.3f}s")

    return disease_anomalies, disease_normal


def analyze_surveillance(
    db_url=None,
    start_date=None,
    end_date=None,
    disease=None,
    contamination=0.05,
    n_estimators=100,
    max_samples="auto",  # str | int
    force_refresh=False,
):
    """
    End-to-end surveillance analysis: fetch data and run anomaly detection.

    Results are cached for 5 minutes when disease=None (full surveillance run)
    to avoid re-running the expensive ML pipeline on repeated requests.

    Args:
        db_url:        Optional database URL (falls back to DATABASE_URL)
        start_date:    Filter records on or after this date (optional)
        end_date:      Filter records on or before this date (optional)
        disease:       Filter by disease name (optional)
        contamination: Expected proportion of outliers (0 < x < 0.5; default 0.05)
        n_estimators:  Number of Isolation Forest trees (default 100)
        max_samples:   Samples per tree (default 'auto')
        force_refresh: If True, clear cache before running (default False)

    Returns:
        dict with anomalies, normal_diagnoses, and summary (see detect_anomalies)
    """
    # Only cache full surveillance runs (disease=None).
    if disease is None:
        key = _cache_key(start_date, end_date, contamination)

        if force_refresh:
            clear_surveillance_cache()
            print("[SURVEILLANCE] Force refresh — cache cleared")
        else:
            cached = _get_cached(key)
            if cached:
                print("[SURVEILLANCE] Cache hit — returning cached result")
                return cached

    data = fetch_diagnosis_data(
        db_url=db_url,
        start_date=start_date,
        end_date=end_date,
        disease=disease,
        limit=10000,  # Limit to prevent loading entire database history
    )

    result = detect_anomalies(
        data,
        contamination=contamination,
        n_estimators=n_estimators,
        max_samples=max_samples,
    )

    # Cache the result
    if disease is None:
        _set_cache(key, result)
        print(
            f"[SURVEILLANCE] Cache set — {result['summary']['total_records']} records, "
            f"{result['summary']['anomaly_count']} anomalies"
        )

    return result


# ---------------------------------------------------------------------------
# Legacy compatibility shim
# The surveillance.py API blueprint previously imported detect_outbreaks
# and get_outbreak_summary. These thin wrappers preserve that interface.
# ---------------------------------------------------------------------------


def detect_outbreaks(
    db_url=None,
    contamination=0.05,
    disease=None,
    start_date=None,
    end_date=None,
):
    """
    Legacy wrapper around analyze_surveillance().
    Returns the full result dict (anomalies, normal_diagnoses, summary) plus
    flattened top-level fields the old API route expected.
    """
    result = analyze_surveillance(
        db_url=db_url,
        start_date=start_date,
        end_date=end_date,
        disease=disease,
        contamination=contamination,
    )

    summary = result["summary"]

    # Merge summary fields at top level for backwards compatibility
    return {
        **result,
        "total_analyzed": summary["total_records"],
        "anomaly_count": summary["anomaly_count"],
        "normal_count": summary["normal_count"],
        "outbreak_alert": summary["anomaly_count"] > 0,
    }


def get_outbreak_summary(db_url=None, contamination=0.05):
    """
    Legacy summary function: returns high-level statistics only.
    """
    result = analyze_surveillance(db_url=db_url, contamination=contamination)
    return result["summary"]
