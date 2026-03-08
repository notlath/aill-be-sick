# surveillance.py
# Isolation Forest for Outbreak Monitoring and Anomaly Detection
import os
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy import text
from datetime import datetime
from app.utils.database import get_db_engine


def fetch_diagnosis_data(db_url=None, start_date=None, end_date=None, disease=None):
    """
    Fetch diagnosis data with temporal and spatial information.
    Uses DATABASE_URL environment variable if db_url not provided.

    Args:
        db_url: Database connection string (optional)
        start_date: Filter records after this date (inclusive, optional)
        end_date: Filter records before this date (inclusive, optional)
        disease: Filter by disease name (optional)

    Returns: tuple of (encoded_data, diagnosis_info)
    """
    # Get SQLAlchemy engine
    engine = get_db_engine(db_url)

    # Build query with parameters for safety
    query_str = """
        SELECT 
            d.id,
            d.disease,
            d."createdAt",
            COALESCE(d.latitude, u.latitude) as latitude,
            COALESCE(d.longitude, u.longitude) as longitude,
            COALESCE(d.city, u.city) as city,
            COALESCE(d.province, u.province) as province,
            COALESCE(d.barangay, u.barangay) as barangay,
            COALESCE(d.region, u.region) as region,
            d.district,
            d.confidence,
            d.uncertainty,
            u.id as user_id,
            u.name as user_name
        FROM "Diagnosis" d
        JOIN "User" u ON d."userId" = u.id
        WHERE COALESCE(d.latitude, u.latitude) IS NOT NULL
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

    # Execute query using SQLAlchemy connection with SAFE parameter binding
    with engine.connect() as conn:
        result = conn.execute(text(query_str), params)
        data = result.fetchall()

    if not data:
        return np.array([]), []

    # Encode data for anomaly detection
    encoded_data = []
    diagnosis_info = []

    # Get earliest timestamp for normalization
    timestamps = [row[2] for row in data]
    min_timestamp = min(timestamps).timestamp()
    max_timestamp = max(timestamps).timestamp()
    timestamp_range = (
        max_timestamp - min_timestamp if max_timestamp > min_timestamp else 1
    )

    for row in data:
        (
            diagnosis_id,
            disease_name,
            created_at,
            latitude,
            longitude,
            city,
            province,
            barangay,
            region,
            district,
            confidence,
            uncertainty,
            user_id,
            user_name,
        ) = row

        # Normalize timestamp to 0-1 range (relative to dataset)
        timestamp_numeric = (created_at.timestamp() - min_timestamp) / timestamp_range

        # Encode disease as numeric (one-hot would create too many dimensions)
        disease_list = ["Dengue", "Pneumonia", "Typhoid", "Impetigo"]
        disease_encoded = (
            disease_list.index(disease_name) if disease_name in disease_list else -1
        )

        # Features for anomaly detection: [latitude, longitude, timestamp_normalized, disease_encoded]
        encoded_data.append(
            [
                latitude,
                longitude,
                timestamp_numeric,
                disease_encoded,
            ]
        )

        # Store diagnosis info for later use
        diagnosis_info.append(
            {
                "id": diagnosis_id,
                "disease": disease_name,
                "created_at": created_at.isoformat(),
                "latitude": latitude,
                "longitude": longitude,
                "city": city,
                "province": province,
                "barangay": barangay,
                "region": region,
                "district": district,
                "confidence": confidence,
                "uncertainty": uncertainty,
                "user_id": user_id,
                "user_name": user_name,
            }
        )

    return np.array(encoded_data), diagnosis_info


def detect_outbreaks(
    contamination=0.05, db_url=None, disease=None, start_date=None, end_date=None
):
    """
    Run Isolation Forest to detect anomalous diagnosis patterns.

    Args:
        contamination: Expected proportion of outliers (default 0.05 = 5%)
        db_url: Database URL (optional, uses env var if not provided)
        disease: Filter by disease name (optional)
        start_date: Filter records after this date (inclusive, optional)
        end_date: Filter records before this date (inclusive, optional)

    Returns: dict with:
        - anomalies: List of anomalous diagnosis records
        - normal: List of normal diagnosis records
        - total_analyzed: Count of records
        - anomaly_count: Number of anomalies detected
        - outbreak_alert: Boolean (True if anomaly count exceeds threshold)
    """
    # Fetch data
    data, diagnosis_info = fetch_diagnosis_data(
        db_url, start_date=start_date, end_date=end_date, disease=disease
    )

    if data.size == 0:
        return {
            "anomalies": [],
            "normal": [],
            "total_analyzed": 0,
            "anomaly_count": 0,
            "outbreak_alert": False,
            "message": "No diagnosis data available",
        }

    # Train Isolation Forest
    # n_estimators: number of trees (higher = more accurate but slower)
    # contamination: proportion of outliers expected
    # random_state: for reproducibility
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        n_jobs=-1,  # Use all CPU cores
    )

    # Fit and predict (-1 for outliers, 1 for inliers)
    predictions = iso_forest.fit_predict(data)

    # Get anomaly scores (lower = more anomalous)
    # decision_function returns the anomaly score (negative = outlier)
    anomaly_scores = iso_forest.decision_function(data)

    # Separate anomalies from normal records
    anomalies = []
    normal = []

    for i, (prediction, score) in enumerate(zip(predictions, anomaly_scores)):
        diagnosis_record = diagnosis_info[i].copy()
        diagnosis_record["anomaly_score"] = float(score)

        if prediction == -1:
            anomalies.append(diagnosis_record)
        else:
            normal.append(diagnosis_record)

    # Sort anomalies by score (most anomalous first)
    anomalies.sort(key=lambda x: x["anomaly_score"])

    # Determine if outbreak alert should be triggered
    # Simple heuristic: if more than 2x expected anomalies, trigger alert
    expected_anomalies = len(diagnosis_info) * contamination
    outbreak_alert = len(anomalies) > (expected_anomalies * 2)

    return {
        "anomalies": anomalies,
        "normal": normal,
        "total_analyzed": len(diagnosis_info),
        "anomaly_count": len(anomalies),
        "outbreak_alert": outbreak_alert,
        "contamination": contamination,
    }


def get_outbreak_summary(
    contamination=0.05, db_url=None, disease=None, start_date=None, end_date=None
):
    """
    Get a summary of outbreak detection suitable for dashboard display.

    Returns: dict with aggregated statistics
    """
    result = detect_outbreaks(
        contamination, db_url, disease=disease, start_date=start_date, end_date=end_date
    )

    if result["total_analyzed"] == 0:
        return result

    # Aggregate anomalies by disease
    disease_anomalies = {}
    for anomaly in result["anomalies"]:
        d = anomaly["disease"]
        if d not in disease_anomalies:
            disease_anomalies[d] = []
        disease_anomalies[d].append(anomaly)

    # Aggregate anomalies by region
    region_anomalies = {}
    for anomaly in result["anomalies"]:
        region = anomaly.get("region") or "Unknown"
        if region not in region_anomalies:
            region_anomalies[region] = []
        region_anomalies[region].append(anomaly)

    # Create summary statistics
    return {
        "outbreak_alert": result["outbreak_alert"],
        "total_analyzed": result["total_analyzed"],
        "anomaly_count": result["anomaly_count"],
        "contamination": contamination,
        "disease_breakdown": {d: len(cases) for d, cases in disease_anomalies.items()},
        "region_breakdown": {
            region: len(cases) for region, cases in region_anomalies.items()
        },
        "top_anomalies": result["anomalies"][:10],  # Top 10 most anomalous
    }
