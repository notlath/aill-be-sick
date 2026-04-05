# test_per_disease_anomaly_detection.py
# Comprehensive tests for per-disease Isolation Forest anomaly detection.
# Verifies that anomaly scores and reason codes are meaningful within each
# disease's context, not a global mixed-disease distribution.
import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from datetime import datetime as real_datetime, timedelta
from types import SimpleNamespace
import sys
import os

# Add backend to path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.surveillance_service import (
    detect_anomalies,
    analyze_surveillance,
    fetch_diagnosis_data,
    _build_feature_matrix,
    _compute_reason_codes,
    REASON_GEOGRAPHIC_RARE,
    REASON_TEMPORAL_RARE,
    REASON_COMBINED_MULTI,
    REASON_AGE_RARE,
    REASON_GENDER_RARE,
)


# =============================================================================
# Helper: Build mock diagnosis data
# =============================================================================

def _make_mock_row(
    diagnosis_id,
    disease="Dengue",
    district="District A",
    latitude=14.5995,
    longitude=120.9842,
    days_ago=0,
    age=30,
    gender="MALE",
    confidence=0.85,
    uncertainty=0.10,
    reference_now=None,
):
    """Create a mock database row object matching the SQL query structure."""
    if reference_now is None:
        reference_now = real_datetime.now()
    created_at = reference_now - timedelta(days=days_ago)

    return SimpleNamespace(
        id=diagnosis_id,
        disease=disease,
        createdAt=created_at,
        latitude=latitude,
        longitude=longitude,
        city="City X",
        province="Province Y",
        barangay="Barangay Z",
        region="Region NCR",
        district=district,
        confidence=confidence,
        uncertainty=uncertainty,
        user_id=100 + diagnosis_id,
        user_name=f"Patient {diagnosis_id}",
        user_email=f"patient{diagnosis_id}@test.com",
        user_role="PATIENT",
        user_city="City X",
        user_region="Region NCR",
        user_province="Province Y",
        user_barangay="Barangay Z",
        user_district=district,
        user_latitude=latitude,
        user_longitude=longitude,
        user_age=age,
        user_gender=gender,
    )


def _patch_db_fetch(rows):
    """Context manager to patch fetch_diagnosis_data database query."""
    mock_conn = MagicMock()
    mock_conn.__enter__ = MagicMock(return_value=mock_conn)
    mock_conn.__exit__ = MagicMock(return_value=False)
    mock_conn.execute.return_value.fetchall.return_value = rows

    mock_engine = MagicMock()
    mock_engine.connect.return_value = mock_conn

    return patch("app.services.surveillance_service.get_db_engine", return_value=mock_engine)


# =============================================================================
# Test 1: Per-Disease Detection Strategy
# =============================================================================

class TestPerDiseaseDetectionStrategy:
    """Verify that each disease gets its own Isolation Forest model."""

    def test_each_disease_gets_separate_model(self):
        """Two diseases with 50 records each produce anomalies from both groups,
        not just the majority class. Each disease gets its own 5% budget."""
        rows = []
        # 50 Dengue cases — tight cluster, normal distribution
        for i in range(50):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=25 + (i % 20),
                gender="MALE" if i % 2 == 0 else "FEMALE",
            ))
        # 50 Typhoid cases — tight cluster at same location, normal distribution
        for i in range(50, 100):
            rows.append(_make_mock_row(
                i, disease="Typhoid", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i - 50, age=25 + (i % 20),
                gender="MALE" if i % 2 == 0 else "FEMALE",
            ))

        result = detect_anomalies(rows, contamination=0.05)

        # Both diseases should have anomalies detected (each gets 5% budget)
        dengue_anomalies = [a for a in result["anomalies"] if a["disease"] == "Dengue"]
        typhoid_anomalies = [a for a in result["anomalies"] if a["disease"] == "Typhoid"]

        # With 50 records per disease at 5% contamination, expect ~2-3 per disease
        # (Isolation Forest may flag slightly more or fewer)
        assert len(dengue_anomalies) >= 1, "Dengue should have anomalies detected"
        assert len(typhoid_anomalies) >= 1, "Typhoid should have anomalies detected"

    def test_disease_under_10_records_skipped(self):
        """Diseases with fewer than 10 records are skipped and marked normal."""
        rows = []
        # 50 Dengue cases
        for i in range(50):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=25 + (i % 20),
                gender="MALE" if i % 2 == 0 else "FEMALE",
            ))
        # 5 Measles cases — below threshold
        for i in range(5):
            rows.append(_make_mock_row(
                100 + i, disease="Measles", district="District B",
                latitude=14.6000, longitude=120.9900,
                days_ago=i, age=30, gender="MALE",
            ))

        result = detect_anomalies(rows, contamination=0.05)

        # All Measles should be normal with score 0.0
        measles_normal = [
            n for n in result["normal_diagnoses"] if n["disease"] == "Measles"
        ]
        assert len(measles_normal) == 5, "All 5 Measles records should be normal"
        for m in measles_normal:
            assert m["is_anomaly"] is False
            assert m["anomaly_score"] == 0.0


# =============================================================================
# Test 2: Geographic Rarity
# =============================================================================

class TestGeographicRarity:
    """Verify that geographic outliers are flagged within disease context."""

    def test_geographic_outlier_flagged_within_disease(self):
        """One Dengue case far from the cluster is flagged with GEOGRAPHIC:RARE."""
        rows = []
        # 50 Dengue cases in tight cluster at District A
        for i in range(50):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=30, gender="MALE",
            ))
        # 1 Dengue case far away in District B
        rows.append(_make_mock_row(
            99, disease="Dengue", district="District B",
            latitude=16.0, longitude=122.0,  # Far from the cluster
            days_ago=0, age=30, gender="MALE",
        ))

        result = detect_anomalies(rows, contamination=0.05)

        # The outlier should be flagged
        outlier = next((a for a in result["anomalies"] if a["id"] == 99), None)
        assert outlier is not None, "Geographic outlier should be flagged as anomaly"
        assert outlier["reason"] is not None
        assert REASON_GEOGRAPHIC_RARE in outlier["reason"], \
            f"Expected GEOGRAPHIC:RARE in reason codes, got: {outlier['reason']}"

    def test_same_location_not_flagged_across_diseases(self):
        """Typhoid cases at the same location as Dengue are NOT flagged just
        because Dengue dominates the dataset. This was the old global model bug."""
        rows = []
        # 50 Dengue at location A
        for i in range(50):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=30, gender="MALE",
            ))
        # 50 Typhoid at the SAME location A
        for i in range(50, 100):
            rows.append(_make_mock_row(
                i, disease="Typhoid", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i - 50, age=30, gender="MALE",
            ))

        result = detect_anomalies(rows, contamination=0.05)

        # Typhoid cases should NOT be mass-flaged
        typhoid_anomalies = [a for a in result["anomalies"] if a["disease"] == "Typhoid"]
        # With 50 identical Typhoid cases, at most 1-2 might be flagged by chance
        # (Isolation Forest with 5% contamination on 50 records = ~2-3)
        # But they should NOT be flagged for being at the "wrong" location
        for a in typhoid_anomalies:
            if a["reason"]:
                assert REASON_GEOGRAPHIC_RARE not in a["reason"], \
                    f"Typhoid at normal location should not get GEOGRAPHIC:RARE: {a['reason']}"


# =============================================================================
# Test 3: Temporal Rarity
# =============================================================================

class TestTemporalRarity:
    """Verify that off-season cases are flagged within disease context."""

    def test_off_season_case_flagged(self):
        """One Dengue case in dry season (month 1) when all others are in rainy
        season (months 6-8) is flagged with TEMPORAL:RARE."""
        reference_now = real_datetime(2026, 8, 15)
        rows = []
        # 50 Dengue cases in rainy season (months 6-8, days_ago 0-60)
        for i in range(50):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=30, gender="MALE",
                reference_now=reference_now,
            ))
        # 1 Dengue case in dry season (month 1, ~200 days ago)
        rows.append(_make_mock_row(
            99, disease="Dengue", district="District A",
            latitude=14.5995, longitude=120.9842,
            days_ago=200, age=30, gender="MALE",
            reference_now=reference_now,
        ))

        result = detect_anomalies(rows, contamination=0.05)

        # The off-season case should be flagged
        off_season = next((a for a in result["anomalies"] if a["id"] == 99), None)
        assert off_season is not None, "Off-season case should be flagged as anomaly"
        assert off_season["reason"] is not None
        assert REASON_TEMPORAL_RARE in off_season["reason"], \
            f"Expected TEMPORAL:RARE in reason codes, got: {off_season['reason']}"

    def test_normal_month_not_flagged(self):
        """Dengue cases spread uniformly across all months are not flagged for
        temporal rarity."""
        rows = []
        # 120 Dengue cases spread across 12 months (10 per month)
        for month in range(1, 13):
            for j in range(10):
                idx = (month - 1) * 10 + j
                days_ago = 365 - (month * 30) + j
                rows.append(_make_mock_row(
                    idx, disease="Dengue", district="District A",
                    latitude=14.5995, longitude=120.9842,
                    days_ago=days_ago, age=30, gender="MALE",
                ))

        result = detect_anomalies(rows, contamination=0.05)

        # No case should have TEMPORAL:RARE as the sole or primary reason
        temporal_only = [
            a for a in result["anomalies"]
            if a["reason"] and a["reason"] == REASON_TEMPORAL_RARE
        ]
        assert len(temporal_only) == 0, \
            "No cases should be flagged TEMPORAL:RARE with uniform month distribution"


# =============================================================================
# Test 4: Age Rarity
# =============================================================================

class TestAgeRarity:
    """Verify that unusual age cases are flagged within disease context."""

    def test_unusual_age_flagged(self):
        """One Dengue case at age 80 when all others are 20-40 is flagged
        with AGE:RARE."""
        rows = []
        # 50 Dengue cases with ages 20-40
        for i in range(50):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=20 + (i % 21), gender="MALE",
            ))
        # 1 Dengue case at age 80
        rows.append(_make_mock_row(
            99, disease="Dengue", district="District A",
            latitude=14.5995, longitude=120.9842,
            days_ago=0, age=80, gender="MALE",
        ))

        result = detect_anomalies(rows, contamination=0.05)

        # The elderly case should be flagged
        elderly = next((a for a in result["anomalies"] if a["id"] == 99), None)
        assert elderly is not None, "Elderly case should be flagged as anomaly"
        assert elderly["reason"] is not None
        assert REASON_AGE_RARE in elderly["reason"], \
            f"Expected AGE:RARE in reason codes, got: {elderly['reason']}"

    def test_typical_age_not_flagged(self):
        """Dengue cases with ages in the normal range (20-60) are not flagged
        for age rarity."""
        rows = []
        for i in range(100):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=20 + (i % 41), gender="MALE",
            ))

        result = detect_anomalies(rows, contamination=0.05)

        # No case should have AGE:RARE as the sole reason
        age_only = [
            a for a in result["anomalies"]
            if a["reason"] and a["reason"] == REASON_AGE_RARE
        ]
        assert len(age_only) == 0, \
            "No cases should be flagged AGE:RARE with normal age distribution"


# =============================================================================
# Test 5: Gender Rarity
# =============================================================================

class TestGenderRarity:
    """Verify that minority gender cases are flagged within disease context."""

    def test_minority_gender_flagged(self):
        """FEMALE cases at 4% of Dengue population are flagged with GENDER:RARE."""
        rows = []
        # 48 MALE Dengue cases
        for i in range(48):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=30, gender="MALE",
            ))
        # 2 FEMALE Dengue cases (4% < 20% threshold)
        for i in range(48, 50):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=30, gender="FEMALE",
            ))

        result = detect_anomalies(rows, contamination=0.05)

        # FEMALE cases should be flagged with GENDER:RARE
        female_anomalies = [
            a for a in result["anomalies"]
            if a["user"]["gender"] == "FEMALE"
        ]
        assert len(female_anomalies) >= 1, \
            "Minority gender cases should be flagged"
        for a in female_anomalies:
            if a["reason"]:
                assert REASON_GENDER_RARE in a["reason"], \
                    f"Expected GENDER:RARE in reason codes, got: {a['reason']}"

    def test_balanced_gender_not_flagged(self):
        """50/50 MALE/FEMALE split does not trigger GENDER:RARE."""
        rows = []
        for i in range(100):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=30,
                gender="MALE" if i < 50 else "FEMALE",
            ))

        result = detect_anomalies(rows, contamination=0.05)

        # No case should have GENDER:RARE
        gender_anomalies = [
            a for a in result["anomalies"]
            if a["reason"] and REASON_GENDER_RARE in a["reason"]
        ]
        assert len(gender_anomalies) == 0, \
            "No cases should be flagged GENDER:RARE with balanced gender split"


# =============================================================================
# Test 6: Combined Multi Reason
# =============================================================================

class TestCombinedMulti:
    """Verify that cases with multiple anomaly factors get COMBINED:MULTI."""

    def test_multiple_reasons_triggers_combined(self):
        """A case that is geographically distant AND off-season AND unusual age
        gets COMBINED:MULTI in addition to individual reason codes."""
        reference_now = real_datetime(2026, 8, 15)
        rows = []
        # 50 Dengue cases: normal location, rainy season, ages 20-40
        for i in range(50):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=20 + (i % 21), gender="MALE",
                reference_now=reference_now,
            ))
        # 1 extreme outlier: wrong location, wrong season, wrong age
        rows.append(_make_mock_row(
            99, disease="Dengue", district="District B",
            latitude=16.0, longitude=122.0,  # Far away
            days_ago=200, age=80, gender="MALE",  # Off-season + elderly
            reference_now=reference_now,
        ))

        result = detect_anomalies(rows, contamination=0.05)

        outlier = next((a for a in result["anomalies"] if a["id"] == 99), None)
        assert outlier is not None, "Extreme outlier should be flagged"
        assert outlier["reason"] is not None

        reasons = outlier["reason"].split("|")
        assert REASON_GEOGRAPHIC_RARE in reasons, \
            f"Expected GEOGRAPHIC:RARE, got: {outlier['reason']}"
        assert REASON_TEMPORAL_RARE in reasons, \
            f"Expected TEMPORAL:RARE, got: {outlier['reason']}"
        assert REASON_AGE_RARE in reasons, \
            f"Expected AGE:RARE, got: {outlier['reason']}"
        assert REASON_COMBINED_MULTI in reasons, \
            f"Expected COMBINED:MULTI, got: {outlier['reason']}"


# =============================================================================
# Test 7: Old Global Model Bugs Fixed
# =============================================================================

class TestOldGlobalModelBugsFixed:
    """Verify that the bugs from the old global model are fixed."""

    def test_rare_disease_not_mass_flagged(self):
        """Measles cases (20 records) are NOT mass-flaged just because Dengue
        (500 records) dominates the dataset. This was the old global model bug."""
        rows = []
        # 500 Dengue cases — normal distribution
        for i in range(500):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995 + (i * 0.0001), longitude=120.9842 + (i * 0.0001),
                days_ago=i % 365, age=20 + (i % 41),
                gender="MALE" if i % 2 == 0 else "FEMALE",
            ))
        # 20 Measles cases — normal distribution within their group
        for i in range(20):
            rows.append(_make_mock_row(
                1000 + i, disease="Measles", district="District B",
                latitude=14.6000 + (i * 0.0001), longitude=120.9900 + (i * 0.0001),
                days_ago=i % 365, age=5 + (i % 10),  # Measles typically in children
                gender="MALE" if i % 2 == 0 else "FEMALE",
            ))

        result = detect_anomalies(rows, contamination=0.05)

        # Measles should NOT be mass-flaged
        measles_anomalies = [a for a in result["anomalies"] if a["disease"] == "Measles"]
        measles_normal = [n for n in result["normal_diagnoses"] if n["disease"] == "Measles"]

        # With 20 Measles at 5% contamination, expect ~1 anomaly max
        # (not mass-flaged like the old global model would do)
        assert len(measles_anomalies) <= 3, \
            f"Measles should not be mass-flaged: got {len(measles_anomalies)} anomalies out of 20"
        assert len(measles_normal) >= 17, \
            f"Most Measles should be normal: got {len(measles_normal)} normal out of 20"

    def test_within_disease_outlier_caught(self):
        """A Dengue case at a wrong location IS caught as anomalous, even when
        Dengue dominates the dataset. The old global model might miss this."""
        rows = []
        # 200 Dengue cases at location A
        for i in range(200):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=30, gender="MALE",
            ))
        # 1 Dengue case at location B (clearly wrong)
        rows.append(_make_mock_row(
            999, disease="Dengue", district="District B",
            latitude=16.0, longitude=122.0,
            days_ago=0, age=30, gender="MALE",
        ))

        result = detect_anomalies(rows, contamination=0.05)

        # The location B case MUST be flagged
        outlier = next((a for a in result["anomalies"] if a["id"] == 999), None)
        assert outlier is not None, \
            "Within-disease geographic outlier MUST be flagged"
        assert REASON_GEOGRAPHIC_RARE in (outlier["reason"] or ""), \
            f"Expected GEOGRAPHIC:RARE, got: {outlier.get('reason')}"


# =============================================================================
# Test 8: Response Format
# =============================================================================

class TestResponseFormat:
    """Verify the API response structure is correct."""

    def test_response_structure(self):
        """Return dict has anomalies, normal_diagnoses, and summary keys."""
        rows = [
            _make_mock_row(i, disease="Dengue", district="District A",
                           latitude=14.5995, longitude=120.9842,
                           days_ago=i, age=30, gender="MALE")
            for i in range(20)
        ]

        result = detect_anomalies(rows, contamination=0.05)

        assert "anomalies" in result
        assert "normal_diagnoses" in result
        assert "summary" in result
        assert isinstance(result["anomalies"], list)
        assert isinstance(result["normal_diagnoses"], list)
        assert isinstance(result["summary"], dict)

    def test_summary_counts(self):
        """total_records = anomaly_count + normal_count."""
        rows = [
            _make_mock_row(i, disease="Dengue", district="District A",
                           latitude=14.5995, longitude=120.9842,
                           days_ago=i, age=30, gender="MALE")
            for i in range(50)
        ]

        result = detect_anomalies(rows, contamination=0.05)
        summary = result["summary"]

        assert summary["total_records"] == 50
        assert summary["anomaly_count"] + summary["normal_count"] == 50
        assert summary["contamination_used"] == 0.05

    def test_anomaly_record_shape(self):
        """Each anomaly has required fields: id, disease, is_anomaly,
        anomaly_score, reason, user."""
        rows = []
        for i in range(50):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="District A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i, age=30, gender="MALE",
            ))
        # Add one outlier
        rows.append(_make_mock_row(
            99, disease="Dengue", district="District B",
            latitude=16.0, longitude=122.0,
            days_ago=0, age=30, gender="MALE",
        ))

        result = detect_anomalies(rows, contamination=0.05)

        for anomaly in result["anomalies"]:
            assert "id" in anomaly
            assert "disease" in anomaly
            assert anomaly["is_anomaly"] is True
            assert "anomaly_score" in anomaly
            assert "reason" in anomaly
            assert "user" in anomaly
            assert "age" in anomaly["user"]
            assert "gender" in anomaly["user"]


# =============================================================================
# Test 9: Edge Cases
# =============================================================================

class TestEdgeCases:
    """Verify edge cases are handled gracefully."""

    def test_empty_data(self):
        """Empty input returns empty anomalies and normal lists."""
        result = detect_anomalies([], contamination=0.05)

        assert result["anomalies"] == []
        assert result["normal_diagnoses"] == []
        assert result["summary"]["total_records"] == 0
        assert result["summary"]["anomaly_count"] == 0

    def test_single_record(self):
        """Single record returns no anomalies."""
        rows = [_make_mock_row(1, disease="Dengue", district="District A",
                               latitude=14.5995, longitude=120.9842,
                               days_ago=0, age=30, gender="MALE")]

        result = detect_anomalies(rows, contamination=0.05)

        assert result["anomalies"] == []
        assert len(result["normal_diagnoses"]) == 1
        assert result["normal_diagnoses"][0]["is_anomaly"] is False

    def test_all_same_disease_under_10(self):
        """9 records of one disease — all marked normal, no model trained."""
        rows = [
            _make_mock_row(i, disease="Dengue", district="District A",
                           latitude=14.5995, longitude=120.9842,
                           days_ago=i, age=30, gender="MALE")
            for i in range(9)
        ]

        result = detect_anomalies(rows, contamination=0.05)

        assert result["anomalies"] == []
        assert len(result["normal_diagnoses"]) == 9
        assert result["summary"]["anomaly_count"] == 0

    def test_multiple_diseases_all_under_10(self):
        """Multiple diseases, all under 10 records — all marked normal."""
        rows = []
        for i, disease in enumerate(["Dengue", "Typhoid", "Measles"]):
            for j in range(5):
                rows.append(_make_mock_row(
                    i * 10 + j, disease=disease, district="District A",
                    latitude=14.5995, longitude=120.9842,
                    days_ago=j, age=30, gender="MALE",
                ))

        result = detect_anomalies(rows, contamination=0.05)

        assert result["anomalies"] == []
        assert len(result["normal_diagnoses"]) == 15
        assert result["summary"]["anomaly_count"] == 0


# =============================================================================
# Test 10: Feature Matrix (6 features)
# =============================================================================

class TestFeatureMatrix:
    """Verify the feature matrix has exactly 6 features."""

    def test_feature_count(self):
        """_build_feature_matrix returns 6 features: lat, lng, district,
        month, age, gender."""
        rows = [
            _make_mock_row(i, disease="Dengue", district="District A",
                           latitude=14.5995, longitude=120.9842,
                           days_ago=i, age=30, gender="MALE")
            for i in range(10)
        ]

        X, district_enc, gender_enc, medians = _build_feature_matrix(rows)

        assert X.shape[1] == 6, f"Expected 6 features, got {X.shape[1]}"
        assert "age" in medians
        assert "confidence" not in medians
        assert "uncertainty" not in medians

    def test_feature_indices(self):
        """Feature indices: lat=0, lng=1, district=2, month=3, age=4, gender=5."""
        rows = [
            _make_mock_row(i, disease="Dengue", district="District A",
                           latitude=14.0 + i, longitude=120.0 + i,
                           days_ago=i, age=20 + i, gender="MALE")
            for i in range(10)
        ]

        X, district_enc, gender_enc, medians = _build_feature_matrix(rows)

        # lat should vary (14.0, 15.0, ...)
        assert X[0, 0] == pytest.approx(14.0)
        assert X[1, 0] == pytest.approx(15.0)
        # lng should vary (120.0, 121.0, ...)
        assert X[0, 1] == pytest.approx(120.0)
        # age should vary (20, 21, ...)
        assert X[0, 4] == pytest.approx(20.0)
        assert X[1, 4] == pytest.approx(21.0)
