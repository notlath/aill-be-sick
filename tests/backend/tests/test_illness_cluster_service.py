from datetime import datetime
from unittest.mock import MagicMock, patch

import numpy as np

from app.services.illness_cluster_service import (
    _derive_comorbidities_count,
    _derive_risk_level,
    _derive_symptom_severity,
    fetch_diagnosis_data,
    get_illness_cluster_statistics,
)


def _make_mock_row(
    diagnosis_id,
    disease="Dengue",
    confidence=0.85,
    uncertainty=0.05,
    symptoms='{"fever": true}',
    age=30,
    gender="MALE",
    district="District A",
):
    return (
        diagnosis_id,
        disease,
        confidence,
        uncertainty,
        "City X",
        "Province Y",
        "Barangay Z",
        "Region NCR",
        district,
        14.5995,
        120.9842,
        datetime(2026, 4, 1),
        symptoms,
        100 + diagnosis_id,
        f"Patient {diagnosis_id}",
        f"patient{diagnosis_id}@test.com",
        age,
        gender,
    )


def _patch_fetch(rows):
    mock_conn = MagicMock()
    mock_conn.__enter__ = MagicMock(return_value=mock_conn)
    mock_conn.__exit__ = MagicMock(return_value=False)

    mock_result = MagicMock()
    mock_result.fetchall.return_value = rows
    mock_conn.execute.return_value = mock_result

    mock_engine = MagicMock()
    mock_engine.connect.return_value = mock_conn

    return patch("app.services.illness_cluster_service.get_db_engine", return_value=mock_engine)


def _make_cluster_illness(patient_age, diagnosed_at="2026-04-01T00:00:00"):
    return {
        "disease": "Dengue",
        "patient_age": patient_age,
        "patient_gender": "MALE",
        "region": "Region NCR",
        "province": "Province Y",
        "city": "City X",
        "barangay": "Barangay Z",
        "district": "District A",
        "diagnosed_at": diagnosed_at,
        "risk_level": 0.6,
        "symptom_severity": 0.4,
        "comorbidities_count": 1,
    }


def test_derived_helpers_behavior():
    low_case = _derive_risk_level(
        disease="Influenza",
        confidence=0.95,
        uncertainty=0.01,
        age=25,
    )
    high_case = _derive_risk_level(
        disease="Dengue",
        confidence=0.45,
        uncertainty=0.20,
        age=72,
    )

    assert 0.0 <= low_case <= 1.0
    assert 0.0 <= high_case <= 1.0
    assert high_case > low_case

    mild_severity = _derive_symptom_severity('{"cough": true}')
    severe_severity = _derive_symptom_severity(
        '{"difficulty breathing": true, "chest pain": true, "bleeding": true}'
    )

    assert 0.0 <= mild_severity <= 1.0
    assert 0.0 <= severe_severity <= 1.0
    assert severe_severity > mild_severity

    comorb_count = _derive_comorbidities_count(
        "Known diabetes, hypertension, and asthma history"
    )
    assert comorb_count >= 3


def test_fetch_diagnosis_data_includes_derived_features_when_toggled():
    rows = [
        _make_mock_row(
            1,
            disease="Dengue",
            symptoms="Patient has diabetes and severe chest pain with bleeding",
        ),
        _make_mock_row(
            2,
            disease="Influenza",
            symptoms='{"cough": true, "fever": true}',
            district="District B",
        ),
    ]

    with _patch_fetch(rows):
        encoded_data, illness_info = fetch_diagnosis_data(
            include_age=False,
            include_gender=False,
            include_district=False,
            include_time=False,
            include_risk_level=True,
            include_symptom_severity=True,
            include_comorbidities_count=True,
        )

    assert encoded_data.shape == (2, 5)
    assert "risk_level" in illness_info[0]
    assert "symptom_severity" in illness_info[0]
    assert "comorbidities_count" in illness_info[0]

    with _patch_fetch(rows):
        encoded_without_derived, _ = fetch_diagnosis_data(
            include_age=False,
            include_gender=False,
            include_district=False,
            include_time=False,
            include_risk_level=False,
            include_symptom_severity=False,
            include_comorbidities_count=False,
        )

    assert encoded_without_derived.shape == (2, 2)


def test_cluster_statistics_include_triage_and_insights():
    illness_info = [
        {
            "disease": "Dengue",
            "patient_age": 68,
            "patient_gender": "MALE",
            "region": "Region NCR",
            "province": "Province Y",
            "city": "City X",
            "barangay": "Barangay Z",
            "district": "District A",
            "diagnosed_at": "2026-04-01T00:00:00",
            "risk_level": 0.9,
            "symptom_severity": 0.8,
            "comorbidities_count": 2,
        },
        {
            "disease": "Dengue",
            "patient_age": 55,
            "patient_gender": "FEMALE",
            "region": "Region NCR",
            "province": "Province Y",
            "city": "City X",
            "barangay": "Barangay Z",
            "district": "District A",
            "diagnosed_at": "2026-04-02T00:00:00",
            "risk_level": 0.8,
            "symptom_severity": 0.6,
            "comorbidities_count": 1,
        },
    ]

    clusters = np.array([0, 0])
    stats = get_illness_cluster_statistics(illness_info, clusters, n_clusters=1)

    assert len(stats) == 1
    cluster_stat = stats[0]

    assert "avg_risk_level" in cluster_stat
    assert "high_risk_percentage" in cluster_stat
    assert "avg_symptom_severity" in cluster_stat
    assert "avg_comorbidities_count" in cluster_stat
    assert "triage_score" in cluster_stat
    assert "insight_tags" in cluster_stat

    assert cluster_stat["avg_risk_level"] == 0.85
    assert cluster_stat["high_risk_percentage"] == 100.0
    assert 0.0 <= cluster_stat["triage_score"] <= 100.0
    assert 1 <= len(cluster_stat["insight_tags"]) <= 2


def test_cluster_statistics_uses_median_age_for_odd_samples():
    illness_info = [
        _make_cluster_illness(20),
        _make_cluster_illness(30),
        _make_cluster_illness(100),
    ]

    clusters = np.array([0, 0, 0])
    stats = get_illness_cluster_statistics(illness_info, clusters, n_clusters=1)

    assert stats[0]["avg_patient_age"] == 30.0


def test_cluster_statistics_uses_median_age_for_even_samples():
    illness_info = [
        _make_cluster_illness(20),
        _make_cluster_illness(30),
        _make_cluster_illness(40),
        _make_cluster_illness(100),
    ]

    clusters = np.array([0, 0, 0, 0])
    stats = get_illness_cluster_statistics(illness_info, clusters, n_clusters=1)

    assert stats[0]["avg_patient_age"] == 35.0
