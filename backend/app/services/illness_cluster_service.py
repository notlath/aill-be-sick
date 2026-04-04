# illness_cluster_service.py
# Utility for k-means clustering on illness/diagnosis data
import os
from datetime import datetime, timedelta
import numpy as np
from sklearn.cluster import KMeans
from sqlalchemy import text
from app.utils.database import get_db_engine


def fetch_diagnosis_data(
    db_url=None,
    include_age=True,
    include_gender=True,
    include_district=True,
    include_coordinates=False,
    include_time=False,
    diagnosis_month=None,
    diagnosis_week=None,
    start_date=None,
    end_date=None,
):
    """
    Fetch diagnosis data from PostgreSQL database with linked patient demographics.
    Uses DATABASE_URL environment variable if db_url not provided.

    Args:
        db_url: Optional database URL
        include_age: Include age in clustering features
        include_gender: Include gender in clustering features
        include_district: Include district in clustering features
        include_coordinates: Include latitude/longitude in clustering features (for geographic clustering)
        include_time: Include time-based features
        diagnosis_month: Filter by single month (YYYY-MM format)
        diagnosis_week: Filter by ISO week (YYYY-Www format)
        start_date: Start of date range filter (YYYY-MM-DD format) - use with end_date
        end_date: End of date range filter (YYYY-MM-DD format) - use with start_date

    Returns: tuple of (encoded_data, illness_info)
        - encoded_data: numpy array for clustering
        - illness_info: list of dicts with diagnosis and patient details
    """
    engine = get_db_engine(db_url)

    month_start = None
    month_end = None
    week_start = None
    week_end = None
    start_datetime = None
    end_datetime = None

    if diagnosis_month:
        try:
            month_start = datetime.strptime(diagnosis_month, "%Y-%m")
            if month_start.month == 12:
                month_end = month_start.replace(
                    year=month_start.year + 1,
                    month=1,
                    day=1,
                )
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1)
        except ValueError as exc:
            raise ValueError(
                "Invalid month filter format. Expected YYYY-MM."
            ) from exc

    if diagnosis_week:
        try:
            year_str, week_str = diagnosis_week.split("-W")
            iso_year = int(year_str)
            iso_week = int(week_str)
            week_start = datetime.fromisocalendar(iso_year, iso_week, 1)
            week_end = week_start + timedelta(days=7)
        except (ValueError, TypeError) as exc:
            raise ValueError(
                "Invalid week filter format. Expected YYYY-Www."
            ) from exc

    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError(
                "Invalid start_date format. Expected YYYY-MM-DD."
            ) from exc

    if end_date:
        try:
            # End date is inclusive, so add 1 day for the upper bound
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(
                days=1
            )
        except ValueError as exc:
            raise ValueError(
                "Invalid end_date format. Expected YYYY-MM-DD."
            ) from exc

    # NOTE: The latitude/longitude columns represent the PATIENT'S RESIDENTIAL LOCATION,
    # not the healthcare facility. This ensures accurate spatial clustering analysis.
    query_str = """
        SELECT
            d.id,
            d.disease,
            d.confidence,
            d.uncertainty,
            d.city,
            d.province,
            d.barangay,
            d.region,
            d.district,
            -- Patient's residential coordinates (for clustering analysis)
            d.latitude,
            d.longitude,
            d."createdAt" AS diagnosed_at,
            d.symptoms,
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
            AND d.status = 'VERIFIED'
    """

    params = {}
    if month_start and month_end:
        query_str += (
            ' AND d."createdAt" >= :diagnosis_month_start '
            ' AND d."createdAt" < :diagnosis_month_end '
        )
        params["diagnosis_month_start"] = month_start
        params["diagnosis_month_end"] = month_end

    if week_start and week_end:
        query_str += (
            ' AND d."createdAt" >= :diagnosis_week_start '
            ' AND d."createdAt" < :diagnosis_week_end '
        )
        params["diagnosis_week_start"] = week_start
        params["diagnosis_week_end"] = week_end

    # Date range filter (takes precedence if both start and end are provided)
    if start_datetime:
        query_str += ' AND d."createdAt" >= :diagnosis_start_date '
        params["diagnosis_start_date"] = start_datetime

    if end_datetime:
        query_str += ' AND d."createdAt" < :diagnosis_end_date '
        params["diagnosis_end_date"] = end_datetime

    query_str += ' ORDER BY d."createdAt" DESC '

    with engine.connect() as conn:
        result = conn.execute(text(query_str), params)
        data = result.fetchall()

    if not data:
        return np.array([]), []

    # Build deterministic one-hot vocabularies for categorical values
    disease_values = sorted({(row[1] or "UNKNOWN") for row in data})
    district_values = []

    if include_district:
        district_values = sorted({(row[8] or "UNKNOWN") for row in data})

    # Pre-compute coordinate normalization bounds (for geographic clustering)
    coord_bounds = None
    if include_coordinates:
        valid_coords = [(row[9], row[10]) for row in data if row[9] is not None and row[10] is not None]
        if valid_coords:
            lats = [c[0] for c in valid_coords]
            lngs = [c[1] for c in valid_coords]
            min_lat, max_lat = min(lats), max(lats)
            min_lng, max_lng = min(lngs), max(lngs)
            # Avoid division by zero if all points are at same location
            lat_range = max_lat - min_lat if max_lat != min_lat else 1.0
            lng_range = max_lng - min_lng if max_lng != min_lng else 1.0
            coord_bounds = {
                "min_lat": min_lat, "max_lat": max_lat, "lat_range": lat_range,
                "min_lng": min_lng, "max_lng": max_lng, "lng_range": lng_range,
            }

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
            district,
            latitude,
            longitude,
            diagnosed_at,
            symptoms,
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

        # One-hot encode city, province, barangay, and region
        district_value = district or "UNKNOWN"
        district_one_hot = [1 if district_value == v else 0 for v in district_values]

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
        if include_district:
            features.extend(district_one_hot)
        if include_time and time_features:
            features.extend(time_features)

        # Add coordinate features (for geographic clustering)
        if include_coordinates:
            if latitude is not None and longitude is not None and coord_bounds is not None:
                lat_norm = (latitude - coord_bounds["min_lat"]) / coord_bounds["lat_range"]
                lng_norm = (longitude - coord_bounds["min_lng"]) / coord_bounds["lng_range"]
                features.append(lat_norm)
                features.append(lng_norm)
            else:
                # Fallback for missing coordinates: center point
                features.append(0.5)
                features.append(0.5)

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
                "district": district,
                "latitude": latitude,
                "longitude": longitude,
                "diagnosed_at": diagnosed_at.isoformat() if diagnosed_at else None,
                "symptoms": symptoms,
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
                    "top_provinces": [],
                    "top_cities": [],
                    "top_barangays": [],
                    "top_districts": [],
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

        # Top regions, provinces, cities, barangays, districts
        regions = [p["region"] for p in cluster_illnesses if p["region"]]
        provinces = [p["province"] for p in cluster_illnesses if p["province"]]
        cities = [p["city"] for p in cluster_illnesses if p["city"]]
        barangays = [p["barangay"] for p in cluster_illnesses if p["barangay"]]
        districts = [p["district"] for p in cluster_illnesses if p["district"]]

        top_regions = Counter(regions).most_common()
        top_provinces = Counter(provinces).most_common()
        top_cities = Counter(cities).most_common()
        top_barangays = Counter(barangays).most_common()
        top_districts = Counter(districts).most_common()

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
                "top_provinces": [{"province": p, "count": c} for p, c in top_provinces],
                "top_cities": [{"city": c, "count": cnt} for c, cnt in top_cities],
                "top_barangays": [{"barangay": b, "count": c} for b, c in top_barangays],
                "top_districts": [
                    {"district": d, "count": c} for d, c in top_districts
                ],
                "temporal_distribution": temporal_dist,
            }
        )

    return cluster_stats
