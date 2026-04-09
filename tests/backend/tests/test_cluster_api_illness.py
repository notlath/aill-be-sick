from unittest.mock import patch

import numpy as np

from app import app


def _build_mock_illnesses():
    return [
        {
            "id": 1,
            "disease": "Dengue",
            "confidence": 0.9,
            "uncertainty": 0.04,
            "city": "City X",
            "province": "Province Y",
            "barangay": "Barangay Z",
            "region": "Region NCR",
            "district": "District A",
            "latitude": 14.5995,
            "longitude": 120.9842,
            "diagnosed_at": "2026-04-01T00:00:00",
            "symptoms": '{"fever": true}',
            "patient_id": 101,
            "patient_name": "Patient 1",
            "patient_email": "patient1@test.com",
            "patient_age": 30,
            "patient_gender": "MALE",
            "risk_level": 0.82,
            "symptom_severity": 0.7,
            "comorbidities_count": 2,
        },
        {
            "id": 2,
            "disease": "Dengue",
            "confidence": 0.8,
            "uncertainty": 0.06,
            "city": "City X",
            "province": "Province Y",
            "barangay": "Barangay Z",
            "region": "Region NCR",
            "district": "District A",
            "latitude": 14.601,
            "longitude": 120.985,
            "diagnosed_at": "2026-04-02T00:00:00",
            "symptoms": '{"fever": true, "cough": true}',
            "patient_id": 102,
            "patient_name": "Patient 2",
            "patient_email": "patient2@test.com",
            "patient_age": 40,
            "patient_gender": "FEMALE",
            "risk_level": 0.74,
            "symptom_severity": 0.6,
            "comorbidities_count": 1,
        },
    ]


def test_illness_clusters_accepts_new_toggles_and_returns_new_stats_fields():
    client = app.test_client()

    mock_data = np.array([[1.0, 0.7, 0.4], [1.0, 0.5, 0.2]])
    mock_illnesses = _build_mock_illnesses()
    mock_clusters = np.array([0, 0])
    mock_centers = np.array([[1.0, 0.6, 0.3]])
    mock_stats = [
        {
            "cluster_id": 0,
            "count": 2,
            "disease_distribution": {"Dengue": {"count": 2, "percent": 100.0}},
            "top_diseases": [{"disease": "Dengue", "count": 2}],
            "avg_patient_age": 35.0,
            "min_patient_age": 30,
            "max_patient_age": 40,
            "gender_distribution": {"MALE": 1, "FEMALE": 1, "OTHER": 0},
            "top_regions": [{"region": "Region NCR", "count": 2}],
            "top_provinces": [{"province": "Province Y", "count": 2}],
            "top_cities": [{"city": "City X", "count": 2}],
            "top_barangays": [{"barangay": "Barangay Z", "count": 2}],
            "top_districts": [{"district": "District A", "count": 2}],
            "temporal_distribution": {"2026-04": 2},
            "avg_risk_level": 0.78,
            "high_risk_percentage": 100.0,
            "avg_symptom_severity": 0.65,
            "avg_comorbidities_count": 1.5,
            "triage_score": 72.1,
            "insight_tags": ["Prioritize high-risk follow-up"],
        }
    ]

    with patch("app.api.cluster.fetch_diagnosis_data", return_value=(mock_data, mock_illnesses)) as fetch_mock, patch(
        "app.api.cluster.run_illness_kmeans", return_value=(mock_clusters, mock_centers)
    ), patch("app.api.cluster.get_illness_cluster_statistics", return_value=mock_stats):
        response = client.get(
            "/api/illness-clusters?riskLevel=true&symptomSeverity=true&comorbiditiesCount=true"
        )

    assert response.status_code == 200
    kwargs = fetch_mock.call_args.kwargs
    assert kwargs["include_risk_level"] is True
    assert kwargs["include_symptom_severity"] is True
    assert kwargs["include_comorbidities_count"] is True

    payload = response.get_json()
    cluster_stat = payload["cluster_statistics"][0]
    assert "avg_risk_level" in cluster_stat
    assert "high_risk_percentage" in cluster_stat
    assert "avg_symptom_severity" in cluster_stat
    assert "avg_comorbidities_count" in cluster_stat
    assert "triage_score" in cluster_stat
    assert "insight_tags" in cluster_stat


def test_illness_clusters_backwards_compatible_when_new_toggles_absent():
    client = app.test_client()

    mock_data = np.array([[1.0], [1.0]])
    mock_illnesses = _build_mock_illnesses()
    mock_clusters = np.array([0, 0])
    mock_centers = np.array([[1.0]])

    with patch("app.api.cluster.fetch_diagnosis_data", return_value=(mock_data, mock_illnesses)) as fetch_mock, patch(
        "app.api.cluster.run_illness_kmeans", return_value=(mock_clusters, mock_centers)
    ), patch("app.api.cluster.get_illness_cluster_statistics", return_value=[]):
        response = client.get("/api/illness-clusters")

    assert response.status_code == 200
    kwargs = fetch_mock.call_args.kwargs
    assert kwargs["include_risk_level"] is False
    assert kwargs["include_symptom_severity"] is False
    assert kwargs["include_comorbidities_count"] is False


def test_illness_clusters_rejects_invalid_new_toggle_values():
    client = app.test_client()

    response = client.get("/api/illness-clusters?riskLevel=maybe")

    assert response.status_code == 400
    payload = response.get_json()
    assert "riskLevel" in payload["error"]
