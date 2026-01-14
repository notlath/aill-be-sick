# kmeans_cluster.py
# Utility for k-means clustering on patient data
import os
import numpy as np
from sklearn.cluster import KMeans
import psycopg2
from urllib.parse import urlparse


def fetch_patient_data(db_url=None):
    """
    Fetch patient data from PostgreSQL database.
    Uses DATABASE_URL environment variable if db_url not provided.
    Returns: tuple of (encoded_data, patient_info)
        - encoded_data: numpy array for clustering
        - patient_info: list of dicts with patient details
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

    # Select user data from User table including age and gender
    # Also fetch the user's most recent diagnosis (if any) so we can include disease
    # as an additional feature for clustering.
    # We use a subquery to get the latest Diagnosis.createdAt per user.
    cursor.execute(
        """
        SELECT u.id, u.name, u.email, u.latitude, u.longitude, u.city, u.region, u.gender, u.age,
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
        """
    )
    data = cursor.fetchall()
    conn.close()

    if not data:
        return np.array([]), []

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
            region,
            gender,
            age,
            disease,
        ) = row

        # Encode gender: MALE=1, FEMALE=0, OTHER=0.5
        gender_encoded = 1 if gender == "MALE" else (0 if gender == "FEMALE" else 0.5)

        # Normalize age to 0-1 range (assuming age 18-100)
        age_normalized = (age - 18) / (100 - 18)

        # For region/city, use hash or simple numeric encoding
        city_encoded = hash(city or "") % 1000
        region_encoded = hash(region or "") % 1000

        # Encode disease as one-hot over known diseases so k-means can consider it.
        # If disease is None or unknown, keep all zeros.
        disease_list = ["Dengue", "Pneumonia", "Typhoid", "Impetigo"]
        disease_one_hot = [1 if disease == d else 0 for d in disease_list]

        # Features for clustering: [latitude, longitude, age_normalized, gender_encoded, city_encoded, region_encoded, *disease_one_hot]
        encoded_data.append(
            [
                latitude,
                longitude,
                age_normalized,
                gender_encoded,
                city_encoded,
                region_encoded,
                *disease_one_hot,
            ]
        )

        # Store patient info for later use
        patient_info.append(
            {
                "id": user_id,
                "name": name,
                "email": email,
                "latitude": latitude,
                "longitude": longitude,
                "city": city,
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
                    "gender_distribution": {"MALE": 0, "FEMALE": 0, "OTHER": 0},
                    "top_regions": [],
                    "top_cities": [],
                    "disease_distribution": {},
                    "top_diseases": [],
                }
            )
            continue

        # Calculate statistics
        ages = [p["age"] for p in cluster_patients]
        avg_age = sum(ages) / len(ages)

        # Gender distribution
        gender_dist = {"MALE": 0, "FEMALE": 0, "OTHER": 0}
        for p in cluster_patients:
            gender_dist[p["gender"]] = gender_dist.get(p["gender"], 0) + 1

        # Top regions and cities
        from collections import Counter

        regions = [p["region"] for p in cluster_patients if p["region"]]
        cities = [p["city"] for p in cluster_patients if p["city"]]
        diseases = [p.get("disease") for p in cluster_patients if p.get("disease")]

        top_regions = Counter(regions).most_common(3)
        top_cities = Counter(cities).most_common(3)
        disease_counts = Counter(diseases)
        # Compute percentages per disease
        total = max(1, len(cluster_patients))
        disease_distribution = {
            (k or "UNKNOWN"): {"count": v, "percent": round(100 * v / total, 1)}
            for k, v in disease_counts.items()
        }
        top_diseases = [
            {"disease": (k or "UNKNOWN"), "count": v}
            for k, v in disease_counts.most_common(3)
        ]

        cluster_stats.append(
            {
                "cluster_id": cluster_id,
                "count": len(cluster_patients),
                "avg_age": round(avg_age, 1),
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
