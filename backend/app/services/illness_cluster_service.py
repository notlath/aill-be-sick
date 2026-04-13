# illness_cluster_service.py
# Utility for k-means clustering on illness/diagnosis data
from datetime import datetime, timedelta
import json
import re
from collections import Counter

import numpy as np
from sklearn.cluster import KMeans
from sqlalchemy import text

from app import config
from app.utils.database import get_db_engine


def _clamp(value, minimum=0.0, maximum=1.0):
    return max(minimum, min(maximum, value))


def _safe_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_with_cap(value, cap):
    cap_value = _safe_float(cap, 1.0)
    if cap_value <= 0:
        return 0.0
    return _clamp(_safe_float(value, 0.0) / cap_value)


def _symptoms_to_text(symptoms):
    if symptoms is None:
        return ""

    if isinstance(symptoms, dict):
        return " ".join(str(k) for k in symptoms.keys()).lower()

    if isinstance(symptoms, list):
        return " ".join(str(item) for item in symptoms).lower()

    raw = str(symptoms).strip()
    if not raw:
        return ""

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return " ".join(str(k) for k in parsed.keys()).lower()
        if isinstance(parsed, list):
            return " ".join(str(item) for item in parsed).lower()
    except (TypeError, ValueError, json.JSONDecodeError):
        pass

    return raw.lower()


def _tokenize_text(raw_text):
    if not raw_text:
        return []
    return re.findall(r"[a-zA-Z0-9_]+", raw_text.lower())


def _derive_comorbidities_count(symptoms):
    text_value = _symptoms_to_text(symptoms)
    if not text_value:
        return 0

    keywords = set(config.ILLNESS_CLUSTER_COMORBIDITY_KEYWORDS)
    matched = {keyword for keyword in keywords if keyword in text_value}
    capped_count = min(len(matched), config.ILLNESS_CLUSTER_COMORBIDITY_COUNT_CAP)
    return int(capped_count)


def _estimate_age_risk(age):
    age_value = _safe_float(age, 0.0)
    if age_value >= 65:
        return 1.0
    if age_value >= 50:
        return 0.7
    if age_value <= 12:
        return 0.6
    return 0.2


def _derive_risk_level(disease, confidence, uncertainty, age):
    disease_key = str(disease or "UNKNOWN").upper()
    disease_base = config.ILLNESS_CLUSTER_RISK_DISEASE_BASE.get(
        disease_key,
        config.ILLNESS_CLUSTER_RISK_DISEASE_BASE["UNKNOWN"],
    )

    confidence_value = _clamp(_safe_float(confidence, 0.0))
    low_confidence_component = 1.0 - confidence_value
    uncertainty_component = _normalize_with_cap(
        uncertainty,
        config.ILLNESS_CLUSTER_RISK_UNCERTAINTY_CAP,
    )
    age_component = _estimate_age_risk(age)

    weighted_sum = (
        config.ILLNESS_CLUSTER_RISK_LOW_CONFIDENCE_WEIGHT * low_confidence_component
        + config.ILLNESS_CLUSTER_RISK_UNCERTAINTY_WEIGHT * uncertainty_component
        + config.ILLNESS_CLUSTER_RISK_AGE_WEIGHT * age_component
        + config.ILLNESS_CLUSTER_RISK_DISEASE_WEIGHT * disease_base
    )

    risk_level = _normalize_with_cap(
        weighted_sum,
        config.ILLNESS_CLUSTER_RISK_NORMALIZATION_MAX,
    )
    return float(risk_level)


def _derive_symptom_severity(symptoms):
    text_value = _symptoms_to_text(symptoms)
    tokens = _tokenize_text(text_value)

    if not text_value:
        return 0.0

    symptom_count = len(tokens)
    burden_score = _normalize_with_cap(
        symptom_count,
        config.ILLNESS_CLUSTER_SEVERITY_COUNT_CAP,
    )

    high_impact_keywords = config.ILLNESS_CLUSTER_SEVERITY_KEYWORDS_HIGH_IMPACT
    high_impact_count = sum(1 for keyword in high_impact_keywords if keyword in text_value)
    high_impact_score = _normalize_with_cap(high_impact_count, 3)

    raw_severity = (
        config.ILLNESS_CLUSTER_SEVERITY_HIGH_IMPACT_WEIGHT * high_impact_score
        + config.ILLNESS_CLUSTER_SEVERITY_BURDEN_WEIGHT * burden_score
    )
    normalization_denom = (
        config.ILLNESS_CLUSTER_SEVERITY_HIGH_IMPACT_WEIGHT
        + config.ILLNESS_CLUSTER_SEVERITY_BURDEN_WEIGHT
    )
    if normalization_denom <= 0:
        return 0.0

    severity = _clamp(raw_severity / normalization_denom)
    return float(severity)


def _build_insight_tags(high_risk_percentage, avg_symptom_severity, avg_comorbidities_count):
    insight_tags = []

    if high_risk_percentage >= config.ILLNESS_CLUSTER_INSIGHT_HIGH_RISK_PERCENT:
        insight_tags.append("Prioritize high-risk follow-up")

    if (
        avg_symptom_severity * 100
        >= config.ILLNESS_CLUSTER_INSIGHT_SEVERITY_PERCENT
    ):
        insight_tags.append("Review severe symptoms first")

    if avg_comorbidities_count >= config.ILLNESS_CLUSTER_INSIGHT_COMORBIDITY_AVG:
        insight_tags.append("Check comorbidity history")

    if not insight_tags:
        insight_tags.append("Continue routine monitoring")

    return insight_tags[:2]


def _describe_age_group(min_age, max_age):
    """Convert age range to human-readable group."""
    if min_age is None or max_age is None:
        return "unknown ages"
    avg_age = (min_age + max_age) / 2
    if avg_age >= 65:
        return "elderly"
    if avg_age >= 50:
        return "older adults"
    if avg_age >= 36:
        return "middle-aged adults"
    if avg_age >= 18:
        return "young adults"
    if avg_age >= 13:
        return "adolescents"
    return "children"


def _generate_clinical_label(cluster_illnesses):
    """Generate human-readable clinical label for cluster."""
    if not cluster_illnesses:
        return {
            "label": "Empty group",
            "insight": "No cases in this group",
            "primary_disease": None,
            "primary_location": None,
            "age_range": None,
        }

    diseases = [p.get("disease") for p in cluster_illnesses if p.get("disease")]
    disease_counter = Counter(diseases)
    dominant_disease = (
        disease_counter.most_common(1)[0][0] if disease_counter else "Unknown"
    )

    ages = [p.get("patient_age") for p in cluster_illnesses if p.get("patient_age") is not None]
    if ages:
        min_age, max_age = min(ages), max(ages)
        age_summary = _describe_age_group(min_age, max_age)
    else:
        min_age, max_age = None, None
        age_summary = "unknown ages"

    districts = [p.get("district") for p in cluster_illnesses if p.get("district")]
    if districts:
        location_counter = Counter(districts)
        top_location = location_counter.most_common(1)[0][0]
    else:
        top_location = None

    label = f"{dominant_disease}"
    insight_parts = []
    if min_age is not None and max_age is not None:
        insight_parts.append(f"Ages {min_age}-{max_age} ({age_summary})")
    else:
        insight_parts.append(age_summary)
    if top_location:
        insight_parts.append(f"Concentrated in {top_location}")

    return {
        "label": label,
        "insight": ", ".join(insight_parts),
        "primary_disease": dominant_disease,
        "primary_location": top_location,
        "age_range": f"{min_age}-{max_age}" if min_age is not None and max_age is not None else None,
    }


def _generate_recommendations(cluster_illnesses, clinical_label, high_risk_percentage):
    """Generate actionable recommendations based on cluster characteristics."""
    recommendations = []

    dominant_disease = clinical_label.get("primary_disease", "")
    high_risk_pct = high_risk_percentage or 0

    if dominant_disease == "Dengue":
        recommendations.append("Coordinate mosquito control with barangay health workers")
        recommendations.append("Door-to-door screening in affected areas")
    elif dominant_disease == "Typhoid":
        recommendations.append("Investigate water sanitation in affected barangays")
        recommendations.append("Provide water purification guidance")
    elif dominant_disease == "Pneumonia":
        if high_risk_pct > 40:
            recommendations.append("Prioritize elderly patients for follow-up")
            recommendations.append("Check vaccination status")
    elif dominant_disease == "Influenza":
        recommendations.append("Seasonal flu awareness campaign")
    elif dominant_disease == "Measles":
        recommendations.append("Verify vaccination status of affected patients")
        recommendations.append("Check for additional cases in household/network")
    elif dominant_disease == "Diarrhea":
        recommendations.append("Investigate potential food/water source contamination")
        recommendations.append("Provide oral rehydration guidance")

    if high_risk_pct > 50:
        recommendations.append("URGENT: High-risk patients require immediate follow-up")
    elif high_risk_pct > 30:
        recommendations.append("Schedule follow-up for high-risk patients")

    if not recommendations:
        recommendations.append("Continue routine monitoring")

    return recommendations[:3]


def fetch_diagnosis_data(
    db_url=None,
    include_age=True,
    include_gender=True,
    include_district=True,
    include_coordinates=False,
    include_time=False,
    include_risk_level=False,
    include_symptom_severity=False,
    include_comorbidities_count=False,
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
        include_risk_level: Include derived risk level feature
        include_symptom_severity: Include derived symptom severity feature
        include_comorbidities_count: Include derived comorbidities count feature
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
        valid_coords = [
            (row[9], row[10])
            for row in data
            if row[9] is not None and row[10] is not None
        ]
        if valid_coords:
            lats = [c[0] for c in valid_coords]
            lngs = [c[1] for c in valid_coords]
            min_lat, max_lat = min(lats), max(lats)
            min_lng, max_lng = min(lngs), max(lngs)
            # Avoid division by zero if all points are at same location
            lat_range = max_lat - min_lat if max_lat != min_lat else 1.0
            lng_range = max_lng - min_lng if max_lng != min_lng else 1.0
            coord_bounds = {
                "min_lat": min_lat,
                "max_lat": max_lat,
                "lat_range": lat_range,
                "min_lng": min_lng,
                "max_lng": max_lng,
                "lng_range": lng_range,
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

        risk_level = _derive_risk_level(disease, confidence, uncertainty, age)
        symptom_severity = _derive_symptom_severity(symptoms)
        comorbidities_count = _derive_comorbidities_count(symptoms)
        comorbidities_count_normalized = _normalize_with_cap(
            comorbidities_count,
            config.ILLNESS_CLUSTER_COMORBIDITY_COUNT_CAP,
        )

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

        if include_risk_level:
            features.append(risk_level)
        if include_symptom_severity:
            features.append(symptom_severity)
        if include_comorbidities_count:
            features.append(comorbidities_count_normalized)

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
                "risk_level": risk_level,
                "symptom_severity": symptom_severity,
                "comorbidities_count": comorbidities_count,
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
    cluster_stats = []

    for cluster_id in range(n_clusters):
        # Get diagnoses in this cluster
        cluster_illnesses = [
            p for i, p in enumerate(illness_info) if clusters[i] == cluster_id
        ]

        if not cluster_illnesses:
            clinical_label = _generate_clinical_label([])
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
                    "avg_risk_level": 0.0,
                    "high_risk_percentage": 0.0,
                    "avg_symptom_severity": 0.0,
                    "avg_comorbidities_count": 0.0,
                    "triage_score": 0.0,
                    "insight_tags": ["Continue routine monitoring"],
                    "clinical_label": clinical_label["label"],
                    "clinical_insight": clinical_label["insight"],
                    "primary_disease": clinical_label["primary_disease"],
                    "primary_location": clinical_label["primary_location"],
                    "age_range": clinical_label["age_range"],
                    "risk_assessment": "LOW",
                    "recommendations": ["Continue routine monitoring"],
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
        # NOTE: Keep response key name `avg_patient_age` for API compatibility,
        # but populate it with the cluster median age.
        ages = [p["patient_age"] for p in cluster_illnesses]
        median_age = float(np.median(ages))
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

        risk_levels = [_safe_float(p.get("risk_level"), 0.0) for p in cluster_illnesses]
        symptom_severities = [
            _safe_float(p.get("symptom_severity"), 0.0) for p in cluster_illnesses
        ]
        comorbidity_counts = [
            _safe_float(p.get("comorbidities_count"), 0.0) for p in cluster_illnesses
        ]

        avg_risk_level = sum(risk_levels) / total
        high_risk_percentage = (
            100
            * sum(
                1
                for level in risk_levels
                if level >= config.ILLNESS_CLUSTER_RISK_HIGH_THRESHOLD
            )
            / total
        )
        avg_symptom_severity = sum(symptom_severities) / total
        avg_comorbidities_count = sum(comorbidity_counts) / total

        normalized_comorbidity = _normalize_with_cap(
            avg_comorbidities_count,
            config.ILLNESS_CLUSTER_COMORBIDITY_COUNT_CAP,
        )

        triage_base = (
            config.ILLNESS_CLUSTER_TRIAGE_RISK_WEIGHT * avg_risk_level
            + config.ILLNESS_CLUSTER_TRIAGE_SEVERITY_WEIGHT * avg_symptom_severity
            + config.ILLNESS_CLUSTER_TRIAGE_COMORBIDITY_WEIGHT * normalized_comorbidity
        )
        triage_weight_sum = (
            config.ILLNESS_CLUSTER_TRIAGE_RISK_WEIGHT
            + config.ILLNESS_CLUSTER_TRIAGE_SEVERITY_WEIGHT
            + config.ILLNESS_CLUSTER_TRIAGE_COMORBIDITY_WEIGHT
        )
        if triage_weight_sum <= 0:
            triage_score = 0.0
        else:
            triage_score = round(100 * _clamp(triage_base / triage_weight_sum), 1)

        insight_tags = _build_insight_tags(
            high_risk_percentage=high_risk_percentage,
            avg_symptom_severity=avg_symptom_severity,
            avg_comorbidities_count=avg_comorbidities_count,
        )

        clinical_label = _generate_clinical_label(cluster_illnesses)
        recommendations = _generate_recommendations(
            cluster_illnesses, clinical_label, high_risk_percentage
        )

        risk_assessment = (
            "HIGH" if high_risk_percentage >= 50 else "MEDIUM" if high_risk_percentage >= 30 else "LOW"
        )

        cluster_stats.append(
            {
                "cluster_id": cluster_id,
                "count": len(cluster_illnesses),
                "disease_distribution": disease_distribution,
                "top_diseases": top_diseases,
                "avg_patient_age": round(median_age, 1),
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
                "avg_risk_level": round(avg_risk_level, 3),
                "high_risk_percentage": round(high_risk_percentage, 1),
                "avg_symptom_severity": round(avg_symptom_severity, 3),
                "avg_comorbidities_count": round(avg_comorbidities_count, 2),
                "triage_score": triage_score,
                "insight_tags": insight_tags,
                "clinical_label": clinical_label["label"],
                "clinical_insight": clinical_label["insight"],
                "primary_disease": clinical_label["primary_disease"],
                "primary_location": clinical_label["primary_location"],
                "age_range": clinical_label["age_range"],
                "risk_assessment": risk_assessment,
                "recommendations": recommendations,
            }
        )

    return cluster_stats
