"""
Cluster blueprint: K-Means patient clustering and silhouette analysis endpoints.
"""

import traceback
from flask import Blueprint, request, jsonify

from app.services.cluster_service import fetch_patient_data, run_kmeans, get_cluster_statistics
from app.services.illness_cluster_service import (
    fetch_diagnosis_data,
    run_illness_kmeans,
    get_illness_cluster_statistics,
)

cluster_bp = Blueprint("cluster", __name__)


def _parse_bool(value, default=True):
    """Parse a query-string value to boolean."""
    if value is None:
        return default
    return str(value).lower() in {"1", "true", "yes", "on"}


@cluster_bp.route("/api/patient-clusters", methods=["GET"])
def patient_clusters():
    try:
        # Default to 4 clusters to align with 4 primary diseases
        n_clusters = int(request.args.get("n_clusters", 4))

        include_age = _parse_bool(request.args.get("age"), True)
        include_gender = _parse_bool(request.args.get("gender"), True)
        include_city = _parse_bool(request.args.get("city"), True)
        include_region = _parse_bool(request.args.get("region"), True)
        include_disease = _parse_bool(request.args.get("disease"), True)

        # Fetch data from PostgreSQL using DATABASE_URL
        data, patient_info = fetch_patient_data(
            include_age=include_age,
            include_gender=include_gender,
            include_city=include_city,
            include_region=include_region,
            include_disease=include_disease,
        )

        if data.size == 0:
            return jsonify({"error": "No patient data available"}), 404

        # Run K-means clustering
        clusters, centers = run_kmeans(data, n_clusters=n_clusters)

        # Get cluster statistics
        cluster_stats = get_cluster_statistics(patient_info, clusters, n_clusters)

        # Add cluster assignment to each patient
        for i, patient in enumerate(patient_info):
            patient["cluster"] = int(clusters[i])

        print(
            f"[KMEANS] Clustered {len(patient_info)} patients into {n_clusters} clusters"
        )
        for stat in cluster_stats:
            print(
                f"[KMEANS] Cluster {stat['cluster_id']}: {stat['count']} patients, avg age {stat['avg_age']}"
            )

        return jsonify(
            {
                "n_clusters": n_clusters,
                "total_patients": len(patient_info),
                "cluster_statistics": cluster_stats,
                "patients": patient_info,
                "centers": centers.tolist(),
            }
        )
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR in patient_clusters: {str(e)}")
        print(error_details)
        return jsonify({"error": str(e), "details": error_details}), 500


@cluster_bp.route("/api/patient-clusters/silhouette", methods=["GET"])
def patient_clusters_silhouette():
    """Evaluate KMeans clustering quality across a range of k using silhouette score.
    Query params:
      - range: e.g. "3-10" or "4" (defaults to 3-10)
      - age, gender, disease, region, city: boolean flags for variable selection
    Returns JSON with best k and per-k metrics (silhouette, inertia, cluster sizes).
    """
    try:
        # Parse k range
        range_param = request.args.get("range", "3-10")
        try:
            parts = [int(p) for p in range_param.split("-") if p.strip()]
            if len(parts) == 1:
                k_min = k_max = parts[0]
            else:
                k_min, k_max = parts[0], parts[1]
        except Exception:
            k_min, k_max = 3, 10

        # Parse variable selection parameters
        include_age = _parse_bool(request.args.get("age"), True)
        include_gender = _parse_bool(request.args.get("gender"), True)
        include_city = _parse_bool(request.args.get("city"), True)
        include_region = _parse_bool(request.args.get("region"), True)
        include_disease = _parse_bool(request.args.get("disease"), True)

        # Fetch encoded data with variable selection
        data, _ = fetch_patient_data(
            include_age=include_age,
            include_gender=include_gender,
            include_city=include_city,
            include_region=include_region,
            include_disease=include_disease,
        )
        n_samples = len(data)
        if n_samples < 3:
            return (
                jsonify(
                    {
                        "error": "Not enough samples for silhouette (need >= 3)",
                        "n_samples": n_samples,
                    }
                ),
                400,
            )

        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score
        from collections import Counter

        results = []
        for k in range(k_min, k_max + 1):
            # Valid k range for silhouette: 2 <= k < n_samples
            if k < 2 or k >= n_samples:
                continue
            try:
                model = KMeans(n_clusters=k, random_state=42, n_init=10)
                labels = model.fit_predict(data)
                score = float(silhouette_score(data, labels))
                counts = Counter(labels.tolist())
                results.append(
                    {
                        "k": k,
                        "silhouette": round(score, 4),
                        "inertia": float(model.inertia_),
                        "cluster_sizes": dict(counts),
                    }
                )
            except Exception as e:
                # Skip problematic k
                results.append({"k": k, "error": str(e)})

        # Sort by silhouette desc, filter only entries with silhouette
        scored = [r for r in results if "silhouette" in r]
        best = None
        if scored:
            best = sorted(scored, key=lambda x: x["silhouette"], reverse=True)[0]

        return jsonify(
            {
                "n_samples": n_samples,
                "range": [k_min, k_max],
                "best": best,
                "results": results,
            }
        )
    except Exception as e:
        error_details = traceback.format_exc()
        return jsonify({"error": str(e), "details": error_details}), 500


@cluster_bp.route("/api/illness-clusters", methods=["GET"])
def illness_clusters():
    """
    Cluster diagnoses/illnesses based on disease type and patient demographics.
    Query params:
      - n_clusters: number of clusters (default: 4)
      - age, gender, city, region, time: boolean flags for variable selection
    """
    try:
        n_clusters = int(request.args.get("n_clusters", 4))

        include_age = _parse_bool(request.args.get("age"), True)
        include_gender = _parse_bool(request.args.get("gender"), True)
        include_barangay = _parse_bool(request.args.get("barangay"), False)
        include_city = _parse_bool(request.args.get("city"), True)
        include_province = _parse_bool(request.args.get("province"), False)
        include_region = _parse_bool(request.args.get("region"), True)
        include_time = _parse_bool(request.args.get("time"), False)

        # Fetch diagnosis data from PostgreSQL using DATABASE_URL
        data, illness_info = fetch_diagnosis_data(
            include_age=include_age,
            include_gender=include_gender,
            include_barangay=include_barangay,
            include_city=include_city,
            include_province=include_province,
            include_region=include_region,
            include_time=include_time,
        )

        if data.size == 0:
            return jsonify({"error": "No diagnosis data available"}), 404

        # Run K-means clustering
        clusters, centers = run_illness_kmeans(data, n_clusters=n_clusters)

        # Get cluster statistics
        cluster_stats = get_illness_cluster_statistics(illness_info, clusters, n_clusters)

        # Add cluster assignment to each diagnosis
        for i, illness in enumerate(illness_info):
            illness["cluster"] = int(clusters[i])

        print(
            f"[ILLNESS-KMEANS] Clustered {len(illness_info)} diagnoses into {n_clusters} clusters"
        )
        for stat in cluster_stats:
            print(
                f"[ILLNESS-KMEANS] Cluster {stat['cluster_id']}: {stat['count']} diagnoses, avg patient age {stat['avg_patient_age']}"
            )

        return jsonify(
            {
                "n_clusters": n_clusters,
                "total_illnesses": len(illness_info),
                "cluster_statistics": cluster_stats,
                "illnesses": illness_info,
                "centers": centers.tolist(),
            }
        )
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR in illness_clusters: {str(e)}")
        print(error_details)
        return jsonify({"error": str(e), "details": error_details}), 500


@cluster_bp.route("/api/illness-clusters/silhouette", methods=["GET"])
def illness_clusters_silhouette():
    """Evaluate KMeans clustering quality across a range of k using silhouette score.
    Query params:
      - range: e.g. "3-10" or "4" (defaults to 3-10)
      - age, gender, city, region, time: boolean flags for variable selection
    Returns JSON with best k and per-k metrics (silhouette, inertia, cluster sizes).
    """
    try:
        # Parse k range
        range_param = request.args.get("range", "3-10")
        try:
            parts = [int(p) for p in range_param.split("-") if p.strip()]
            if len(parts) == 1:
                k_min = k_max = parts[0]
            else:
                k_min, k_max = parts[0], parts[1]
        except Exception:
            k_min, k_max = 3, 10

        # Parse variable selection parameters
        include_age = _parse_bool(request.args.get("age"), True)
        include_gender = _parse_bool(request.args.get("gender"), True)
        include_barangay = _parse_bool(request.args.get("barangay"), False)
        include_city = _parse_bool(request.args.get("city"), True)
        include_province = _parse_bool(request.args.get("province"), False)
        include_region = _parse_bool(request.args.get("region"), True)
        include_time = _parse_bool(request.args.get("time"), False)

        # Fetch encoded data with variable selection
        data, _ = fetch_diagnosis_data(
            include_age=include_age,
            include_gender=include_gender,
            include_barangay=include_barangay,
            include_city=include_city,
            include_province=include_province,
            include_region=include_region,
            include_time=include_time,
        )
        n_samples = len(data)
        if n_samples < 3:
            return (
                jsonify(
                    {
                        "error": "Not enough samples for silhouette (need >= 3)",
                        "n_samples": n_samples,
                    }
                ),
                400,
            )

        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score
        from collections import Counter

        results = []
        for k in range(k_min, k_max + 1):
            # Valid k range for silhouette: 2 <= k < n_samples
            if k < 2 or k >= n_samples:
                continue
            try:
                model = KMeans(n_clusters=k, random_state=42, n_init=10)
                labels = model.fit_predict(data)
                score = float(silhouette_score(data, labels))
                counts = Counter(labels.tolist())
                results.append(
                    {
                        "k": k,
                        "silhouette": round(score, 4),
                        "inertia": float(model.inertia_),
                        "cluster_sizes": dict(counts),
                    }
                )
            except Exception as e:
                # Skip problematic k
                results.append({"k": k, "error": str(e)})

        # Sort by silhouette desc, filter only entries with silhouette
        scored = [r for r in results if "silhouette" in r]
        best = None
        if scored:
            best = sorted(scored, key=lambda x: x["silhouette"], reverse=True)[0]

        return jsonify(
            {
                "n_samples": n_samples,
                "range": [k_min, k_max],
                "best": best,
                "results": results,
            }
        )
    except Exception as e:
        error_details = traceback.format_exc()
        return jsonify({"error": str(e), "details": error_details}), 500
