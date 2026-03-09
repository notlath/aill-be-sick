# surveillance_service.py
# Isolation Forest for Outbreak Monitoring and Anomaly Detection
import os
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sqlalchemy import text
from datetime import datetime
from app.utils.database import get_db_engine


# ---------------------------------------------------------------------------
# Reason Codes
# Each anomaly is tagged with one or more pipe-separated reason codes.
# The frontend can map these to human-readable, localised messages.
# ---------------------------------------------------------------------------
REASON_GEOGRAPHIC_RARE = "GEOGRAPHIC:RARE"
REASON_TEMPORAL_RARE = "TEMPORAL:RARE"
REASON_CLUSTER_SPATIAL = "CLUSTER:SPATIAL"
REASON_CONFIDENCE_LOW = "CONFIDENCE:LOW"
REASON_UNCERTAINTY_HIGH = "UNCERTAINTY:HIGH"
REASON_COMBINED_MULTI = "COMBINED:MULTI"


def fetch_diagnosis_data(db_url=None, start_date=None, end_date=None, disease=None):
    """
    Fetch diagnosis data joined with user information.

    Args:
        db_url:     Database connection string (optional; falls back to DATABASE_URL env var)
        start_date: Include records on or after this date (inclusive, optional)
        end_date:   Include records on or before this date (inclusive, optional)
        disease:    Filter by disease name (optional)

    Returns:
        List of SQLAlchemy Row objects (empty list when no data found)
    """
    engine = get_db_engine(db_url)

    query_str = """
        SELECT
            d.id,
            d.disease,
            d."createdAt",
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

    Features (7):
        0 - latitude
        1 - longitude
        2 - disease (label-encoded)
        3 - district (label-encoded)
        4 - month (1-12)
        5 - confidence
        6 - uncertainty

    Returns:
        X           (np.ndarray, shape [n, 7])
        disease_enc (LabelEncoder fitted on disease column)
        district_enc(LabelEncoder fitted on district column)
        medians     (dict of per-feature median for imputation reference)
    """
    # Extract raw columns
    latitudes = np.array([r.latitude for r in records], dtype=float)
    longitudes = np.array([r.longitude for r in records], dtype=float)
    diseases = np.array([r.disease if r.disease else "Unknown" for r in records])
    districts = np.array([r.district if r.district else "Unknown" for r in records])
    months = np.array(
        [
            r.createdAt.month
            if hasattr(r.createdAt, "month")
            else datetime.fromisoformat(str(r.createdAt)).month
            for r in records
        ],
        dtype=float,
    )
    confidences = np.array(
        [r.confidence if r.confidence is not None else np.nan for r in records],
        dtype=float,
    )
    uncertainties = np.array(
        [r.uncertainty if r.uncertainty is not None else np.nan for r in records],
        dtype=float,
    )

    # Impute numeric NaNs with column median
    def _fill_median(arr):
        med = np.nanmedian(arr) if not np.all(np.isnan(arr)) else 0.0
        arr[np.isnan(arr)] = med
        return arr, float(med)

    confidences, conf_med = _fill_median(confidences)
    uncertainties, unc_med = _fill_median(uncertainties)

    # Label-encode categorical columns
    disease_enc = LabelEncoder()
    district_enc = LabelEncoder()
    disease_nums = disease_enc.fit_transform(diseases).astype(float)
    district_nums = district_enc.fit_transform(districts).astype(float)

    X = np.column_stack(
        [
            latitudes,
            longitudes,
            disease_nums,
            district_nums,
            months,
            confidences,
            uncertainties,
        ]
    )

    medians = {"confidence": conf_med, "uncertainty": unc_med}
    return X, disease_enc, district_enc, medians


def _compute_reason_codes(record, X_row, X_all, scaler, disease_enc, district_enc):
    """
    Determine which reason codes apply to an anomalous record.

    Strategy:
        - Geographic / spatial checks use same-disease peers so that a location
          that is normal for *that* disease is not wrongly flagged just because
          other diseases cluster elsewhere.
        - Temporal rarity: month is an outlier for that disease's distribution.
        - Confidence/uncertainty: compared against the global population because
          these metrics are disease-agnostic (they reflect model certainty, not
          disease geography).
        - COMBINED:MULTI when ≥2 distinct reason families triggered.

    Args:
        record:      Raw DB row for this anomaly
        X_row:       Scaled feature vector (shape [7])
        X_all:       All scaled feature vectors (shape [n, 7])
        scaler:      Fitted StandardScaler
        disease_enc: Fitted LabelEncoder for disease
        district_enc:Fitted LabelEncoder for district

    Returns:
        Pipe-separated reason code string, e.g. "GEOGRAPHIC:RARE|TEMPORAL:RARE|COMBINED:MULTI"
    """
    reasons = set()

    # Feature indices
    IDX_LAT = 0
    IDX_LNG = 1
    IDX_DIS = 2
    IDX_DIST = 3
    IDX_MONTH = 4
    IDX_CONF = 5
    IDX_UNC = 6

    THRESHOLD = 2.0  # standard deviations

    disease_label = record.disease if record.disease else "Unknown"

    # ── Per-disease population ────────────────────────────────────────────────
    # All geographic / temporal checks are relative to same-disease peers so
    # that records are only flagged when they deviate from *their own disease's*
    # normal distribution, not the global mix of all diseases.
    try:
        disease_code = disease_enc.transform([disease_label])[0]
        same_disease_mask = X_all[:, IDX_DIS] == disease_code
    except Exception:
        same_disease_mask = np.ones(len(X_all), dtype=bool)

    same_disease_rows = X_all[same_disease_mask]
    n_same = same_disease_rows.shape[0]

    if n_same > 1:
        dis_mean = same_disease_rows.mean(axis=0)
        dis_std = same_disease_rows.std(axis=0) + 1e-8
    else:
        # Only one record for this disease — use global stats as fallback
        dis_mean = X_all.mean(axis=0)
        dis_std = X_all.std(axis=0) + 1e-8

    # ── Geographic rarity (per-disease baseline) ──────────────────────────────
    lat_outlier = abs(X_row[IDX_LAT] - dis_mean[IDX_LAT]) > THRESHOLD * dis_std[IDX_LAT]
    lng_outlier = abs(X_row[IDX_LNG] - dis_mean[IDX_LNG]) > THRESHOLD * dis_std[IDX_LNG]

    if lat_outlier or lng_outlier:
        reasons.add(REASON_GEOGRAPHIC_RARE)

    # Spatial cluster: both lat AND lng are outliers simultaneously
    if lat_outlier and lng_outlier:
        reasons.add(REASON_CLUSTER_SPATIAL)

    # ── Temporal rarity (per-disease baseline) ────────────────────────────────
    if n_same > 1:
        disease_months = same_disease_rows[:, IDX_MONTH]
        month_mean = disease_months.mean()
        month_std = disease_months.std() + 1e-8
        if abs(X_row[IDX_MONTH] - month_mean) > THRESHOLD * month_std:
            reasons.add(REASON_TEMPORAL_RARE)
    else:
        # Only one record for this disease — inherently rare in time
        reasons.add(REASON_TEMPORAL_RARE)

    # ── Confidence / uncertainty (global baseline) ────────────────────────────
    # These reflect model certainty and are not disease-specific.
    global_mean = X_all.mean(axis=0)
    global_std = X_all.std(axis=0) + 1e-8

    if X_row[IDX_CONF] < global_mean[IDX_CONF] - THRESHOLD * global_std[IDX_CONF]:
        reasons.add(REASON_CONFIDENCE_LOW)

    if X_row[IDX_UNC] > global_mean[IDX_UNC] + THRESHOLD * global_std[IDX_UNC]:
        reasons.add(REASON_UNCERTAINTY_HIGH)

    # ── COMBINED:MULTI ────────────────────────────────────────────────────────
    # Exclude CLUSTER:SPATIAL from count since it is a subset of GEOGRAPHIC:RARE
    primary_reasons = reasons - {REASON_CLUSTER_SPATIAL, REASON_COMBINED_MULTI}
    if len(primary_reasons) >= 2:
        reasons.add(REASON_COMBINED_MULTI)

    # Fallback: if nothing matched, tag as geographic
    if not reasons:
        reasons.add(REASON_GEOGRAPHIC_RARE)

    return "|".join(sorted(reasons))


def _row_to_dict(record, is_anomaly, anomaly_score, reason=None):
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
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def detect_anomalies(
    data, contamination=0.05, n_estimators=100, max_samples="auto", random_state=42
):
    """
    Detect anomalies in a list of diagnosis records using Isolation Forest.

    Args:
        data:          List of DB rows from fetch_diagnosis_data()
        contamination: Expected proportion of outliers (default 0.05 = 5%)
        n_estimators:  Number of trees in the forest (default 100)
        max_samples:   Samples per tree; 'auto' = min(256, n_samples)
        random_state:  RNG seed for reproducibility (default 42)

    Returns:
        dict with keys:
            anomalies         – list of anomalous diagnosis dicts
            normal_diagnoses  – list of normal diagnosis dicts
            summary           – aggregate statistics
    """
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

    # Build feature matrix
    X_raw, disease_enc, district_enc, medians = _build_feature_matrix(data)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)

    # Train Isolation Forest
    model = IsolationForest(
        n_estimators=n_estimators,
        max_samples=max_samples,
        contamination=contamination,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    # Predictions: -1 = anomaly, +1 = normal
    predictions = model.predict(X_scaled)
    # Anomaly scores: lower (more negative) = more anomalous
    scores = model.decision_function(X_scaled)

    anomalies = []
    normal_diagnoses = []

    for i, (record, pred, score) in enumerate(zip(data, predictions, scores)):
        is_anomaly = bool(pred == -1)
        reason = None

        if is_anomaly:
            reason = _compute_reason_codes(
                record, X_scaled[i], X_scaled, scaler, disease_enc, district_enc
            )

        entry = _row_to_dict(record, is_anomaly, score, reason)

        if is_anomaly:
            anomalies.append(entry)
        else:
            normal_diagnoses.append(entry)

    return {
        "anomalies": anomalies,
        "normal_diagnoses": normal_diagnoses,
        "summary": {
            "total_records": len(data),
            "anomaly_count": len(anomalies),
            "normal_count": len(normal_diagnoses),
            "contamination_used": contamination,
        },
    }


def analyze_surveillance(
    db_url=None,
    start_date=None,
    end_date=None,
    disease=None,
    contamination=0.05,
    n_estimators=100,
    max_samples="auto",  # str | int
):
    """
    End-to-end surveillance analysis: fetch data and run anomaly detection.

    Args:
        db_url:        Optional database URL (falls back to DATABASE_URL)
        start_date:    Filter records on or after this date (optional)
        end_date:      Filter records on or before this date (optional)
        disease:       Filter by disease name (optional)
        contamination: Expected proportion of outliers (0 < x < 0.5; default 0.05)
        n_estimators:  Number of Isolation Forest trees (default 100)
        max_samples:   Samples per tree (default 'auto')

    Returns:
        dict with anomalies, normal_diagnoses, and summary (see detect_anomalies)
    """
    data = fetch_diagnosis_data(
        db_url=db_url,
        start_date=start_date,
        end_date=end_date,
        disease=disease,
    )

    return detect_anomalies(
        data,
        contamination=contamination,
        n_estimators=n_estimators,
        max_samples=max_samples,
    )


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
