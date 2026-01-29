# surveillance.py
# Isolation Forest for Outbreak Monitoring and Anomaly Detection
import os
import numpy as np
from sklearn.ensemble import IsolationForest
import psycopg2
from urllib.parse import urlparse
from datetime import datetime


def fetch_diagnosis_data(db_url=None):
    """
    Fetch diagnosis data with temporal and spatial information.
    Uses DATABASE_URL environment variable if db_url not provided.
    
    Returns: tuple of (encoded_data, diagnosis_info)
        - encoded_data: numpy array for anomaly detection [lat, lon, timestamp_numeric, disease_encoded]
        - diagnosis_info: list of dicts with diagnosis details
    """
    if db_url is None:
        db_url = os.getenv("DATABASE_URL")

    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    # Parse the database URL
    result = urlparse(db_url)
    username = result.username
    password = result.password
    database = result.path[1:]
    hostname = result.hostname
    port = result.port or 5432

    # Connect to PostgreSQL
    conn = psycopg2.connect(
        database=database, user=username, password=password, host=hostname, port=port
    )
    cursor = conn.cursor()

    # Fetch diagnosis data with location and timestamp
    # Join with User table to get user location if diagnosis location is missing
    cursor.execute(
        """
        SELECT 
            d.id,
            d.disease,
            d."createdAt",
            COALESCE(d.latitude, u.latitude) as latitude,
            COALESCE(d.longitude, u.longitude) as longitude,
            COALESCE(d.city, u.city) as city,
            COALESCE(d.region, u.region) as region,
            d.confidence,
            d.uncertainty,
            u.id as user_id,
            u.name as user_name
        FROM "Diagnosis" d
        JOIN "User" u ON d."userId" = u.id
        WHERE COALESCE(d.latitude, u.latitude) IS NOT NULL
          AND COALESCE(d.longitude, u.longitude) IS NOT NULL
        ORDER BY d."createdAt" DESC
        """
    )
    data = cursor.fetchall()
    conn.close()

    if not data:
        return np.array([]), []

    # Encode data for anomaly detection
    encoded_data = []
    diagnosis_info = []

    # Get earliest timestamp for normalization
    timestamps = [row[2] for row in data]
    min_timestamp = min(timestamps).timestamp()
    max_timestamp = max(timestamps).timestamp()
    timestamp_range = max_timestamp - min_timestamp if max_timestamp > min_timestamp else 1

    for row in data:
        (
            diagnosis_id,
            disease,
            created_at,
            latitude,
            longitude,
            city,
            region,
            confidence,
            uncertainty,
            user_id,
            user_name,
        ) = row

        # Normalize timestamp to 0-1 range (relative to dataset)
        timestamp_numeric = (created_at.timestamp() - min_timestamp) / timestamp_range

        # Encode disease as numeric (one-hot would create too many dimensions)
        disease_list = ["Dengue", "Pneumonia", "Typhoid", "Impetigo"]
        disease_encoded = disease_list.index(disease) if disease in disease_list else -1

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
                "disease": disease,
                "created_at": created_at.isoformat(),
                "latitude": latitude,
                "longitude": longitude,
                "city": city,
                "region": region,
                "confidence": confidence,
                "uncertainty": uncertainty,
                "user_id": user_id,
                "user_name": user_name,
            }
        )

    return np.array(encoded_data), diagnosis_info


def detect_outbreaks(contamination=0.05, db_url=None):
    """
    Run Isolation Forest to detect anomalous diagnosis patterns.
    
    Args:
        contamination: Expected proportion of outliers (default 0.05 = 5%)
        db_url: Database URL (optional, uses env var if not provided)
    
    Returns: dict with:
        - anomalies: List of anomalous diagnosis records
        - normal: List of normal diagnosis records
        - total_analyzed: Count of records
        - anomaly_count: Number of anomalies detected
        - outbreak_alert: Boolean (True if anomaly count exceeds threshold)
    """
    # Fetch data
    data, diagnosis_info = fetch_diagnosis_data(db_url)

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


def get_outbreak_summary(contamination=0.05, db_url=None):
    """
    Get a summary of outbreak detection suitable for dashboard display.
    
    Returns: dict with aggregated statistics
    """
    result = detect_outbreaks(contamination, db_url)

    if result["total_analyzed"] == 0:
        return result

    # Aggregate anomalies by disease
    disease_anomalies = {}
    for anomaly in result["anomalies"]:
        disease = anomaly["disease"]
        if disease not in disease_anomalies:
            disease_anomalies[disease] = []
        disease_anomalies[disease].append(anomaly)

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
        "disease_breakdown": {
            disease: len(cases) for disease, cases in disease_anomalies.items()
        },
        "region_breakdown": {
            region: len(cases) for region, cases in region_anomalies.items()
        },
        "top_anomalies": result["anomalies"][:10],  # Top 10 most anomalous
    }
