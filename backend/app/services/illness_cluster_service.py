# illness_cluster_service.py
# Utility for k-means clustering on illness/diagnosis data
import os
import numpy as np
from sklearn.cluster import KMeans
from sqlalchemy import text
from app.utils.database import get_db_engine


def fetch_diagnosis_data(
    db_url=None,
    include_age=True,
    include_gender=True,
    include_city=True,
    include_region=True,
    include_time=False,
):
    """
    Fetch diagnosis data from PostgreSQL database with linked patient demographics.
    Uses DATABASE_URL environment variable if db_url not provided.
    
    Returns: tuple of (encoded_data, illness_info)
        - encoded_data: numpy array for clustering
        - illness_info: list of dicts with diagnosis and patient details
    """
    engine = get_db_engine(db_url)

    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
            SELECT 
                d.id,
                d.disease,
                d.confidence,
                d.uncertainty,
                d.city,
                d.province,
                d.barangay,
                d.region,
                d.latitude,
                d.longitude,
                d."createdAt" AS diagnosed_at,
                u.id AS user_id,
                u.name AS user_name,
                u.email AS user_email,
                u.age,
                u.gender
            FROM "Diagnosis" d
            JOIN "User" u ON d."userId" = u.id
            WHERE u.role = 'PATIENT'
                AND u.age IS NOT NULL
                AND u.gender IS NOT NULL
            ORDER BY d."createdAt" DESC
            """
            )
        )
        data = result.fetchall()

    if not data:
        return np.array([]), []

    # Build deterministic one-hot vocabularies for categorical values
    disease_values = sorted({(row[1] or "UNKNOWN") for row in data})
    city_values = []
    region_values = []
    
    if include_city:
        city_values = sorted({(row[4] or "UNKNOWN") for row in data})
    if include_region:
        region_values = sorted({(row[7] or "UNKNOWN") for row in data})

    # Encode data for clustering and store illness info
    encoded_data = []
    illness_info = []

    for row in data:
        (
            diagnosis_id,
            disease,
            confidence,
            uncertainty,
            city,
            province,
            barangay,
            region,
            latitude,
            longitude,
            diagnosed_at,
            user_id,
            user_name,
            user_email,
            age,
            gender,
        ) = row

        # Encode gender: MALE=1, FEMALE=0, OTHER=0.5
        gender_encoded = 1 if gender == "MALE" else (0 if gender == "FEMALE" else 0.5)

        # Normalize age to 0-1 range (assuming age 18-100) and clamp to [0, 1]
        age_normalized_raw = (age - 18) / (100 - 18)
        age_normalized = max(0.0, min(1.0, age_normalized_raw))

        # One-hot encode disease
        disease_one_hot = [1 if disease == d else 0 for d in disease_values]

        # One-hot encode city and region
        city_value = city or "UNKNOWN"
        region_value = region or "UNKNOWN"
        city_one_hot = [1 if city_value == v else 0 for v in city_values]
        region_one_hot = [1 if region_value == v else 0 for v in region_values]

        # Time-based features (month of diagnosis for seasonal patterns)
        time_features = []
        if include_time and diagnosed_at:
            month = diagnosed_at.month  # 1-12
            # Encode month as cyclical features (sin/cos)
            month_rad = (month - 1) * (2 * np.pi / 12)
            time_features = [
                np.sin(month_rad),
                np.cos(month_rad),
            ]

        features = []

        # Add disease features (always included for illness clustering)
        features.extend(disease_one_hot)
        
        if include_age:
            features.append(age_normalized)
        if include_gender:
            features.append(gender_encoded)
        if include_city:
            features.extend(city_one_hot)
        if include_region:
            features.extend(region_one_hot)
        if include_time and time_features:
            features.extend(time_features)

        encoded_data.append(features)

        # Store diagnosis info for later use
        illness_info.append(
            {
                "id": diagnosis_id,
                "disease": disease,
                "confidence": confidence,
                "uncertainty": uncertainty,
                "city": city,
                "province": province,
                "barangay": barangay,
                "region": region,
                "latitude": latitude,
                "longitude": longitude,
                "diagnosed_at": diagnosed_at.isoformat() if diagnosed_at else None,
                "patient_id": user_id,
                "patient_name": user_name,
                "patient_email": user_email,
                "patient_age": age,
                "patient_gender": gender,
            }
        )

    return np.array(encoded_data), illness_info


def run_illness_kmeans(data, n_clusters=4):
    """
    Run K-means clustering on illness data.
    Returns: tuple of (clusters, centers)
        - clusters: array of cluster assignments for each diagnosis
        - centers: array of cluster centers
    """
    # Ensure requested clusters do not exceed number of samples
    if hasattr(data, "__len__"):
        safe_k = min(n_clusters, len(data)) if len(data) > 0 else n_clusters
    else:
        safe_k = n_clusters

    kmeans = KMeans(n_clusters=safe_k, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(data)
    return clusters, kmeans.cluster_centers_


def get_illness_cluster_statistics(illness_info, clusters, n_clusters):
    """
    Calculate statistics for each illness cluster.
    Returns: list of cluster statistics
    """
    from collections import Counter

    cluster_stats = []

    for cluster_id in range(n_clusters):
        # Get diagnoses in this cluster
        cluster_illnesses = [
            p for i, p in enumerate(illness_info) if clusters[i] == cluster_id
        ]

        if not cluster_illnesses:
            cluster_stats.append(
                {
                    "cluster_id": cluster_id,
                    "count": 0,
                    "disease_distribution": {},
                    "avg_patient_age": 0,
                    "min_patient_age": 0,
                    "max_patient_age": 0,
                    "gender_distribution": {"MALE": 0, "FEMALE": 0, "OTHER": 0},
                    "top_regions": [],
                    "top_cities": [],
                    "temporal_distribution": {},
                }
            )
            continue

        # Calculate disease distribution
        diseases = [p["disease"] for p in cluster_illnesses if p["disease"]]
        disease_counts = Counter(diseases)
        total = max(1, len(cluster_illnesses))
        
        disease_distribution = {
            (k or "UNKNOWN"): {"count": v, "percent": round(100 * v / total, 1)}
            for k, v in disease_counts.items()
        }
        
        top_diseases = [
            {"disease": (k or "UNKNOWN"), "count": v}
            for k, v in disease_counts.most_common()
        ]

        # Calculate patient age statistics
        ages = [p["patient_age"] for p in cluster_illnesses]
        avg_age = sum(ages) / len(ages)
        min_age = min(ages)
        max_age = max(ages)

        # Gender distribution
        gender_dist = {"MALE": 0, "FEMALE": 0, "OTHER": 0}
        for p in cluster_illnesses:
            gender_dist[p["patient_gender"]] = gender_dist.get(p["patient_gender"], 0) + 1

        # Top regions and cities
        regions = [p["region"] for p in cluster_illnesses if p["region"]]
        cities = [p["city"] for p in cluster_illnesses if p["city"]]

        top_regions = Counter(regions).most_common()
        top_cities = Counter(cities).most_common()

        # Temporal distribution (month-wise)
        temporal_dist = {}
        for p in cluster_illnesses:
            if p["diagnosed_at"]:
                try:
                    month_str = p["diagnosed_at"][:7]  # YYYY-MM
                    temporal_dist[month_str] = temporal_dist.get(month_str, 0) + 1
                except (IndexError, AttributeError):
                    pass

        cluster_stats.append(
            {
                "cluster_id": cluster_id,
                "count": len(cluster_illnesses),
                "disease_distribution": disease_distribution,
                "top_diseases": top_diseases,
                "avg_patient_age": round(avg_age, 1),
                "min_patient_age": min_age,
                "max_patient_age": max_age,
                "gender_distribution": gender_dist,
                "top_regions": [{"region": r, "count": c} for r, c in top_regions],
                "top_cities": [{"city": c, "count": cnt} for c, cnt in top_cities],
                "temporal_distribution": temporal_dist,
            }
        )

    return cluster_stats
