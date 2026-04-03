"""
Standalone K-Means Clustering Script
Connects to the actual database and performs K-means clustering.
Uses the same data fetching and encoding logic as the web application.
Results should be identical to web app clustering.

Usage:
    python standalone_kmeans.py

Requires:
    - .env file with DATABASE_URL, or environment variable set
    - numpy and sklearn installed
"""

import os
import numpy as np
from sklearn.cluster import KMeans
from collections import Counter
from sqlalchemy import create_engine, text
from pathlib import Path


# Load environment variables from .env file if available
def load_env_file():
    """Load DATABASE_URL from .env file if it exists."""
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key not in os.environ:
                        os.environ[key] = value
    elif Path(__file__).parent.parent / "frontend" / ".env.local":
        # Also check frontend/.env.local as fallback
        env_path = Path(__file__).parent.parent / "frontend" / ".env.local"
        if env_path.exists():
            with open(env_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key == "DATABASE_URL" and key not in os.environ:
                            os.environ[key] = value


load_env_file()


def fetch_patient_data(
    db_url=None,
    include_age=True,
    include_gender=True,
    include_city=True,
    include_region=False,
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
    # Get database URL
    if not db_url:
        db_url = os.environ.get("DATABASE_URL")

    if not db_url:
        raise ValueError(
            "DATABASE_URL environment variable not set. "
            "Please set it to connect to the database."
        )

    # Remove pgbouncer parameter if present (psycopg2 doesn't support it)
    db_url = db_url.replace("?pgbouncer=true", "")

    # Create SQLAlchemy engine
    engine = create_engine(db_url)

    # Execute query using SQLAlchemy connection
    with engine.connect() as conn:
        result = conn.execute(
            text(
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
            ORDER BY u.id ASC
        """
            )
        )
        data = result.fetchall()

    engine.dispose()

    if not data:
        return np.array([]), []

    # Build deterministic one-hot vocabularies for categorical values
    city_values = []
    region_values = []
    if include_city:
        city_values = sorted({(row[5] or "UNKNOWN") for row in data})
    if include_region:
        region_values = sorted({(row[6] or "UNKNOWN") for row in data})

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

        # Normalize age to 0-1 range (assuming age 18-100) and clamp to [0, 1]
        age_normalized_raw = (age - 18) / (100 - 18)
        age_normalized = max(0.0, min(1.0, age_normalized_raw))

        city_value = city or "UNKNOWN"
        region_value = region or "UNKNOWN"
        city_one_hot = [1 if city_value == v else 0 for v in city_values]
        region_one_hot = [1 if region_value == v else 0 for v in region_values]

        # Encode disease as one-hot over known diseases so k-means can consider it.
        # If disease is None or unknown, keep all zeros.
        disease_list = ["Dengue", "Pneumonia", "Typhoid", "Diarrhea", "Measles", "Influenza"]
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

    Args:
        data: numpy array of shape (n_samples, n_features)
        n_clusters: number of clusters

    Returns:
        tuple of (clusters, centers)
            - clusters: array of cluster assignments for each patient
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


def get_cluster_statistics(patient_info, clusters, n_clusters):
    """
    Calculate statistics for each cluster.

    Args:
        patient_info: list of dicts with patient information
        clusters: array of cluster assignments
        n_clusters: number of clusters

    Returns:
        list of cluster statistics dicts
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
                    "min_age": 0,
                    "max_age": 0,
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


def print_results(patient_info, clusters, centers, stats, n_clusters):
    """Pretty print clustering results."""
    print("\n" + "=" * 70)
    print("K-MEANS CLUSTERING RESULTS")
    print("=" * 70)

    print(f"\n[OVERVIEW]:")
    print(f"   Total patients: {len(patient_info)}")
    print(f"   Number of clusters: {n_clusters}")
    print(f"   Cluster centers shape: {centers.shape}")

    print(f"\n[CLUSTER ASSIGNMENTS]:")
    for i, cluster_id in enumerate(clusters[:10]):  # Show first 10
        patient = patient_info[i]
        print(f"   {patient['name']:15} => Cluster {cluster_id}")
    if len(clusters) > 10:
        print(f"   ... and {len(clusters) - 10} more patients")

    print(f"\n[CLUSTER STATISTICS]:")
    for stat in stats:
        cluster_id = stat["cluster_id"]
        count = stat["count"]
        avg_age = stat["avg_age"]

        if count == 0:
            print(f"   Cluster {cluster_id}: EMPTY")
            continue

        gender_dist = stat["gender_distribution"]
        top_disease = (
            stat["top_diseases"][0]
            if stat["top_diseases"]
            else {"disease": "N/A", "count": 0}
        )

        print(f"\n   Cluster {cluster_id}:")
        print(f"      Patients: {count}")
        print(f"      Avg Age: {avg_age}")
        print(f"      Age Range: {stat['min_age']}-{stat['max_age']}")
        print(
            f"      Gender: M={gender_dist['MALE']}, F={gender_dist['FEMALE']}, O={gender_dist['OTHER']}"
        )
        print(
            f"      Top Disease: {top_disease['disease']} ({top_disease['count']} cases)"
        )

        if stat["top_regions"]:
            top_region = stat["top_regions"][0]
            print(f"      Top Region: {top_region['region']} ({top_region['count']})")

        if stat["top_cities"]:
            top_city = stat["top_cities"][0]
            print(f"      Top City: {top_city['city']} ({top_city['count']})")

    print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    # Fetch data from database
    print("[*] Fetching patient data from database...")
    try:
        include_age = True
        include_gender = True
        include_city = True
        include_region = False
        include_disease = True
        include_latitude = False
        include_longitude = False

        data, patient_info = fetch_patient_data(
            include_age=include_age,
            include_gender=include_gender,
            include_city=include_city,
            include_region=include_region,
            include_disease=include_disease,
            include_latitude=include_latitude,
            include_longitude=include_longitude,
        )
        print(
            f"[OK] Fetched {len(patient_info)} patients with {data.shape[1]} features from database"
        )
    except ValueError as e:
        print(f"[ERROR] Error: {e}")
        print("\nPlease set the DATABASE_URL environment variable:")
        print(
            "  $env:DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public'"
        )
        exit(1)
    except Exception as e:
        print(f"[ERROR] Database connection error: {e}")
        print(
            "\nMake sure your DATABASE_URL is correct and the database is accessible."
        )
        exit(1)

    # Run K-means clustering
    n_clusters = 4
    print(f"\n[*] Running K-means with {n_clusters} clusters...")
    print(f"    Data shape: {data.shape} (patients x features)")
    features_used = []
    if include_age:
        features_used.append("age")
    if include_gender:
        features_used.append("gender")
    if include_city:
        features_used.append("city")
    if include_region:
        features_used.append("region")
    if include_disease:
        features_used.append("disease(4)")
    if include_latitude:
        features_used.append("latitude")
    if include_longitude:
        features_used.append("longitude")
    print(f"    Features used: {', '.join(features_used)}")
    clusters, centers = run_kmeans(data, n_clusters=n_clusters)
    print("[OK] K-means clustering complete")
    print(f"    Cluster centers shape: {centers.shape}")

    # Calculate statistics
    print("\n[*] Calculating cluster statistics...")
    stats = get_cluster_statistics(patient_info, clusters, n_clusters)
    print("[OK] Statistics calculated")

    # Print results
    print_results(patient_info, clusters, centers, stats, n_clusters)

    # Test with different cluster counts
    print("\n" + "=" * 70)
    print("[TEST] DIFFERENT CLUSTER COUNTS")
    print("=" * 70)

    for k in [2, 3, 4, 5]:
        clusters_k, _ = run_kmeans(data, n_clusters=k)
        print(f"\nK={k}: Distribution = {Counter(clusters_k)}")
