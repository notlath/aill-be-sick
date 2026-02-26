# kmeans_cluster.py
# Utility for k-means clustering on patient data
import os
import numpy as np
from sklearn.cluster import KMeans
from sqlalchemy import text
from app.utils.database import get_db_engine


def fetch_patient_data(
    db_url=None,
    include_age=True,
    include_gender=True,
    include_city=True,
    include_region=True,
    include_disease=True,
    include_latitude=False,
    include_longitude=False,
):
    """
    Fetch patient data from PostgreSQL database.
    Uses DATABASE_URL environment variable if db_url not provided.
    Returns: tuple of (encoded_data, patient_info)
        - encoded_data: numpy array for clustering
        - patient_info: list of dicts with patient details
    """
    # Get SQLAlchemy engine
    engine = get_db_engine(db_url)

    # Execute query using SQLAlchemy connection
    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
            SELECT u.id, u.name, u.email, u.latitude, u.longitude, u.city, u.province, u.region, u.gender, u.age,
                         (
                             SELECT d.disease
                             FROM "Diagnosis" d
                             WHERE d."userId" = u.id
                             ORDER BY d."createdAt" DESC
                             LIMIT 1
                         ) AS disease
            FROM "User" u
            WHERE u.role = 'PATIENT'
                AND u.latitude IS NOT NULL
                AND u.longitude IS NOT NULL
                AND u.age IS NOT NULL
                AND u.gender IS NOT NULL
            ORDER BY u.id ASC
        """
            )
        )
        data = result.fetchall()

    if not data:
        return np.array([]), []

    # Build deterministic one-hot vocabularies for categorical values
    city_values = []
    region_values = []
    if include_city:
        city_values = sorted({(row[5] or "UNKNOWN") for row in data})
    if include_region:
        region_values = sorted({(row[7] or "UNKNOWN") for row in data})

    # Encode data for clustering and store patient info
    encoded_data = []
    patient_info = []

    for row in data:
        # row includes an extra last column 'disease' (may be None)
        (
            user_id,
            name,
            email,
            latitude,
            longitude,
            city,
            province,
            region,
            gender,
            age,
            disease,
        ) = row

        # Encode gender: MALE=1, FEMALE=0, OTHER=0.5
        gender_encoded = 1 if gender == "MALE" else (0 if gender == "FEMALE" else 0.5)

        # Normalize age to 0-1 range (assuming age 18-100) and clamp to [0, 1]
        age_normalized_raw = (age - 18) / (100 - 18)
        age_normalized = max(0.0, min(1.0, age_normalized_raw))

        city_value = city or "UNKNOWN"
        region_value = region or "UNKNOWN"
        city_one_hot = [1 if city_value == v else 0 for v in city_values]
        region_one_hot = [1 if region_value == v else 0 for v in region_values]

        # Encode disease as one-hot over known diseases so k-means can consider it.
        # If disease is None or unknown, keep all zeros.
        disease_list = ["Dengue", "Pneumonia", "Typhoid", "Impetigo"]
        disease_one_hot = [1 if disease == d else 0 for d in disease_list]

        features = []

        if include_latitude:
            features.append(latitude)
        if include_longitude:
            features.append(longitude)
        if include_age:
            features.append(age_normalized)
        if include_gender:
            features.append(gender_encoded)
        if include_city:
            features.extend(city_one_hot)
        if include_region:
            features.extend(region_one_hot)
        if include_disease:
            features.extend(disease_one_hot)

        encoded_data.append(features)

        # Store patient info for later use
        patient_info.append(
            {
                "id": user_id,
                "name": name,
                "email": email,
                "latitude": latitude,
                "longitude": longitude,
                "city": city,
                "province": province,
                "region": region,
                "gender": gender,
                "age": age,
                "disease": disease,
            }
        )

    return np.array(encoded_data), patient_info


def run_kmeans(data, n_clusters=4):
    """
    Run K-means clustering on the data.
    Returns: tuple of (clusters, centers)
        - clusters: array of cluster assignments for each patient
        - centers: array of cluster centers
    """
    # Ensure requested clusters do not exceed number of samples
    # KMeans requires n_samples >= n_clusters
    if hasattr(data, "__len__"):
        safe_k = min(n_clusters, len(data)) if len(data) > 0 else n_clusters
    else:
        safe_k = n_clusters

    kmeans = KMeans(n_clusters=safe_k, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(data)
    return clusters, kmeans.cluster_centers_


def get_cluster_statistics(patient_info, clusters, n_clusters):
    """
    Calculate statistics for each cluster.
    Returns: list of cluster statistics
    """
    from collections import Counter

    cluster_stats = []

    for cluster_id in range(n_clusters):
        # Get patients in this cluster
        cluster_patients = [
            p for i, p in enumerate(patient_info) if clusters[i] == cluster_id
        ]

        if not cluster_patients:
            cluster_stats.append(
                {
                    "cluster_id": cluster_id,
                    "count": 0,
                    "avg_age": 0,
                    "min_age": 0,
                    "max_age": 0,
                    "gender_distribution": {"MALE": 0, "FEMALE": 0, "OTHER": 0},
                    "top_regions": [],
                    "top_cities": [],
                    "disease_distribution": {},
                    "top_diseases": [],
                    "disease_city_correlations": [],
                }
            )
            continue

        # Calculate statistics
        ages = [p["age"] for p in cluster_patients]
        avg_age = sum(ages) / len(ages)
        min_age = min(ages)
        max_age = max(ages)

        # Gender distribution
        gender_dist = {"MALE": 0, "FEMALE": 0, "OTHER": 0}
        for p in cluster_patients:
            gender_dist[p["gender"]] = gender_dist.get(p["gender"], 0) + 1

        # Top regions and cities
        regions = [p["region"] for p in cluster_patients if p["region"]]
        cities = [p["city"] for p in cluster_patients if p["city"]]
        diseases = [p.get("disease") for p in cluster_patients if p.get("disease")]

        top_regions = Counter(regions).most_common()
        top_cities = Counter(cities).most_common()
        disease_counts = Counter(diseases)

        # Compute percentages per disease
        total = max(1, len(cluster_patients))
        disease_distribution = {
            (k or "UNKNOWN"): {"count": v, "percent": round(100 * v / total, 1)}
            for k, v in disease_counts.items()
        }
        top_diseases = [
            {"disease": (k or "UNKNOWN"), "count": v}
            for k, v in disease_counts.most_common()
        ]

        cluster_stats.append(
            {
                "cluster_id": cluster_id,
                "count": len(cluster_patients),
                "avg_age": round(avg_age, 1),
                "min_age": min_age,
                "max_age": max_age,
                "gender_distribution": gender_dist,
                "top_regions": [{"region": r, "count": c} for r, c in top_regions],
                "top_cities": [{"city": c, "count": cnt} for c, cnt in top_cities],
                "disease_distribution": disease_distribution,
                "top_diseases": top_diseases,
            }
        )

    return cluster_stats


# Example usage:
# data, patient_info = fetch_patient_data()  # Uses DATABASE_URL env var
# clusters, centers = run_kmeans(data, n_clusters=3)
# stats = get_cluster_statistics(patient_info, clusters, 3)
# print(clusters)
# print(centers)
# print(stats)
