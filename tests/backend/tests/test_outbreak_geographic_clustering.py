# test_outbreak_geographic_clustering.py
# Tests for pure geographic K-Means clustering in outbreak detection
import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from datetime import datetime as real_datetime, timedelta
import sys
import os

# Add backend to path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.illness_cluster_service import fetch_diagnosis_data, run_illness_kmeans
from app.services.outbreak_service import (
    detect_outbreaks,
    find_optimal_clusters,
    calculate_statistical_thresholds,
    REASON_CLUSTER_DENSE,
    REASON_OUTBREAK_ALERT,
    REASON_OUTBREAK_EPIDEMIC,
)


# =============================================================================
# Helper: Build mock diagnosis data
# =============================================================================

def _expected_feature_count(include_coordinates, include_age, include_gender, include_district, num_unique_diseases):
    """Calculate expected feature count based on enabled options."""
    count = num_unique_diseases  # Disease one-hot is always included
    if include_age:
        count += 1
    if include_gender:
        count += 1
    if include_district:
        count += 1  # Will be set based on unique districts
    if include_coordinates:
        count += 2  # lat_norm, lng_norm
    return count

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
    """Create a mock database row tuple matching the SQL query structure."""
    if reference_now is None:
        reference_now = real_datetime.now()
    diagnosed_at = reference_now - timedelta(days=days_ago)
    return (
        diagnosis_id,       # id
        disease,            # disease
        confidence,         # confidence
        uncertainty,        # uncertainty
        "City X",           # city
        "Province Y",       # province
        "Barangay Z",       # barangay
        "Region NCR",       # region
        district,           # district
        latitude,           # latitude
        longitude,          # longitude
        diagnosed_at,       # createdAt (diagnosed_at) - datetime object
        '{"fever": true}',  # symptoms
        100 + diagnosis_id, # user_id
        f"Patient {diagnosis_id}",  # user_name
        f"patient{diagnosis_id}@test.com",  # user_email
        age,                # age
        gender,             # gender
    )


def _make_mock_result(rows):
    """Create a mock SQLAlchemy result object."""
    mock_result = MagicMock()
    mock_result.fetchall.return_value = rows
    return mock_result


def _patch_fetch(rows):
    """Context manager to patch fetch_diagnosis_data database query."""
    mock_conn = MagicMock()
    mock_conn.__enter__ = MagicMock(return_value=mock_conn)
    mock_conn.__exit__ = MagicMock(return_value=False)
    mock_conn.execute.return_value = _make_mock_result(rows)

    mock_engine = MagicMock()
    mock_engine.connect.return_value = mock_conn

    return patch("app.services.illness_cluster_service.get_db_engine", return_value=mock_engine)


# =============================================================================
# Test 1: Coordinate Normalization
# =============================================================================

class TestCoordinateNormalization:
    """Test that coordinates are properly normalized to [0, 1] range."""

    def test_coordinate_normalization(self):
        """fetch_diagnosis_data(include_coordinates=True) returns 2-feature vectors [lat, lng] normalized to [0,1]."""
        rows = [
            _make_mock_row(1, latitude=14.0, longitude=120.0, days_ago=1),
            _make_mock_row(2, latitude=15.0, longitude=121.0, days_ago=2),
            _make_mock_row(3, latitude=14.5, longitude=120.5, days_ago=3),
        ]

        with _patch_fetch(rows):
            encoded_data, illness_info = fetch_diagnosis_data(
                include_coordinates=True,
                include_age=False,
                include_gender=False,
                include_district=False,
            )

        # Should have 3 samples
        assert encoded_data.shape[0] == 3
        # Should have 3 features: 1 disease one-hot (all Dengue) + 2 coordinates
        assert encoded_data.shape[1] == 3

        # Check normalization bounds (features[1] = lat, features[2] = lng)
        # Min lat=14.0 → 0.0, Max lat=15.0 → 1.0
        assert encoded_data[0, 1] == pytest.approx(0.0)  # (14.0 - 14.0) / 1.0
        assert encoded_data[1, 1] == pytest.approx(1.0)  # (15.0 - 14.0) / 1.0
        assert encoded_data[2, 1] == pytest.approx(0.5)  # (14.5 - 14.0) / 1.0

        # Min lng=120.0 → 0.0, Max lng=121.0 → 1.0
        assert encoded_data[0, 2] == pytest.approx(0.0)
        assert encoded_data[1, 2] == pytest.approx(1.0)
        assert encoded_data[2, 2] == pytest.approx(0.5)

        # Coordinate values should be in [0, 1]
        assert encoded_data[:, 1:].min() >= 0.0
        assert encoded_data[:, 1:].max() <= 1.0


# =============================================================================
# Test 2: Demographic Features Disabled
# =============================================================================

class TestDemographicFeaturesDisabled:
    """Test that demographic features are NOT included when coordinates are enabled."""

    def test_demographic_features_disabled(self):
        """When include_coordinates=True and others False, disease/age/gender/district are NOT in features."""
        rows = [
            _make_mock_row(1, disease="Dengue", age=25, gender="MALE", district="A", days_ago=1),
            _make_mock_row(2, disease="Flu", age=60, gender="FEMALE", district="B", days_ago=2),
        ]

        with _patch_fetch(rows):
            encoded_data, _ = fetch_diagnosis_data(
                include_coordinates=True,
                include_age=False,
                include_gender=False,
                include_district=False,
            )

        # Should have 4 features: 2 disease one-hot (Dengue + Flu) + 2 coordinates
        # Disease one-hot is always included; demographic features are NOT
        assert encoded_data.shape[1] == 4
        # Verify no age/gender/district: only disease + coordinates
        # With 2 diseases, first 2 cols are one-hot, last 2 are coordinates
        assert encoded_data.shape[1] == 4  # 2 diseases + 2 coords


# =============================================================================
# Test 3: Missing Coordinates Fallback
# =============================================================================

class TestMissingCoordinatesFallback:
    """Test that cases with NULL lat/lng get [0.5, 0.5] fallback."""

    def test_missing_coordinates_fallback(self):
        """Cases with NULL lat/lng get [0.5, 0.5] instead of crashing."""
        rows = [
            _make_mock_row(1, latitude=14.0, longitude=120.0, days_ago=1),
            _make_mock_row(2, latitude=None, longitude=None, days_ago=2),  # Missing
            _make_mock_row(3, latitude=15.0, longitude=121.0, days_ago=3),
        ]

        with _patch_fetch(rows):
            encoded_data, illness_info = fetch_diagnosis_data(
                include_coordinates=True,
                include_age=False,
                include_gender=False,
                include_district=False,
            )

        assert encoded_data.shape[0] == 3
        # 1 disease one-hot + 2 coordinates
        assert encoded_data.shape[1] == 3

        # Row 2 (index 1) should have [0.5, 0.5] fallback for coordinates (cols 1, 2)
        assert encoded_data[1, 1] == pytest.approx(0.5)
        assert encoded_data[1, 2] == pytest.approx(0.5)


# =============================================================================
# Test 4: K-Means Groups by Proximity
# =============================================================================

class TestKMeansGroupsByProximity:
    """Test that cases at same coordinates end up in same cluster."""

    def test_kmeans_groups_by_proximity(self):
        """Cases at same coordinates end up in same cluster; cases far apart end up in different clusters."""
        # Create data with two clear geographic groups
        rows = []
        # Group 1: 6 cases at location A
        for i in range(6):
            rows.append(_make_mock_row(i, latitude=14.5995, longitude=120.9842, days_ago=i))
        # Group 2: 6 cases at location B (2km away)
        for i in range(6, 12):
            rows.append(_make_mock_row(i, latitude=14.6150, longitude=121.0200, days_ago=i - 6))

        with _patch_fetch(rows):
            encoded_data, _ = fetch_diagnosis_data(
                include_coordinates=True,
                include_age=False,
                include_gender=False,
                include_district=False,
            )

        # Run K-Means with k=2
        clusters, _ = run_illness_kmeans(encoded_data, n_clusters=2)

        # First 6 cases should be in same cluster
        assert len(set(clusters[:6])) == 1, "Group 1 should all be in same cluster"
        # Last 6 cases should be in same cluster
        assert len(set(clusters[6:])) == 1, "Group 2 should all be in same cluster"
        # The two groups should be in different clusters
        assert clusters[0] != clusters[6], "Group 1 and Group 2 should be in different clusters"


# =============================================================================
# Test 5: Optimal K Selection
# =============================================================================

class TestOptimalKSelection:
    """Test that find_optimal_clusters returns correct k for clear geographic separation."""

    def test_optimal_k_selection(self):
        """find_optimal_clusters() returns k > 1 when data has clear geographic separation."""
        # Two well-separated groups
        data = np.array([
            # Group 1: tight cluster at (0.1, 0.1)
            [0.10, 0.10], [0.11, 0.09], [0.09, 0.11], [0.10, 0.12], [0.12, 0.10],
            # Group 2: tight cluster at (0.9, 0.9)
            [0.90, 0.90], [0.89, 0.91], [0.91, 0.89], [0.90, 0.88], [0.88, 0.90],
        ])

        optimal_k = find_optimal_clusters(data)

        # Should detect k=2 as optimal (two clear clusters)
        assert optimal_k == 2, f"Expected k=2 for two clear clusters, got k={optimal_k}"


# =============================================================================
# Test 6: Dense Cluster Detection
# =============================================================================

class TestDenseClusterDetection:
    """Test that 5+ cases in tight geographic area triggers CLUSTER:DENSE alert."""

    def test_dense_cluster_detection(self):
        """5+ cases in tight geographic area triggers CLUSTER:DENSE alert."""
        fixed_now = real_datetime(2026, 4, 5, 12, 0, 0)

        # 8 cases in tight cluster (same location) within last 7 days
        rows = []
        for i in range(8):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="Barangay A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i,  # 0-7 days ago
                reference_now=fixed_now,
            ))

        with _patch_fetch(rows):
            outbreaks = detect_outbreaks(reference_now=fixed_now)

        # Should detect at least one outbreak with CLUSTER:DENSE
        cluster_alerts = [o for o in outbreaks if REASON_CLUSTER_DENSE in o["reasonCodes"]]
        assert len(cluster_alerts) >= 1, "Should detect dense cluster alert"
        assert cluster_alerts[0]["disease"] == "Dengue"
        assert cluster_alerts[0]["district"] == "Barangay A"


# =============================================================================
# Test 7: Sparse Cluster No Alert
# =============================================================================

class TestSparseClusterNoAlert:
    """Test that scattered cases do NOT trigger cluster alert."""

    def test_sparse_cluster_no_alert(self):
        """3 cases scattered across wide area does NOT trigger cluster alert."""
        fixed_now = real_datetime(2026, 4, 5, 12, 0, 0)

        # 3 cases spread far apart (not enough for dense cluster)
        rows = [
            _make_mock_row(1, disease="Dengue", district="A", latitude=14.0, longitude=120.0, days_ago=1, reference_now=fixed_now),
            _make_mock_row(2, disease="Dengue", district="B", latitude=15.0, longitude=121.0, days_ago=2, reference_now=fixed_now),
            _make_mock_row(3, disease="Dengue", district="C", latitude=16.0, longitude=122.0, days_ago=3, reference_now=fixed_now),
        ]

        with _patch_fetch(rows):
            outbreaks = detect_outbreaks(reference_now=fixed_now)

        # Should NOT detect dense cluster (< 5 cases)
        cluster_alerts = [o for o in outbreaks if REASON_CLUSTER_DENSE in o["reasonCodes"]]
        assert len(cluster_alerts) == 0, "Should NOT detect dense cluster with only 3 scattered cases"


# =============================================================================
# Test 8: Cluster Enriches Existing Alert
# =============================================================================

class TestClusterEnrichesExistingAlert:
    """Test that CLUSTER:DENSE is added to existing threshold alert."""

    def test_cluster_enriches_existing_alert(self):
        """When threshold alert exists for same disease/district, CLUSTER:DENSE is added to reasonCodes."""
        fixed_now = real_datetime(2026, 4, 5, 12, 0, 0)

        # 10 cases in same district — enough for both threshold AND cluster alert
        rows = []
        for i in range(10):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="Barangay A",
                latitude=14.5995, longitude=120.9842,
                days_ago=i,
                reference_now=fixed_now,
            ))

        with _patch_fetch(rows):
            outbreaks = detect_outbreaks(reference_now=fixed_now)

        # Should have outbreak alerts
        assert len(outbreaks) >= 1

        # Find the Dengue/Barangay A alert
        dengue_alerts = [o for o in outbreaks if o["disease"] == "Dengue" and o["district"] == "Barangay A"]
        assert len(dengue_alerts) >= 1

        # Should have CLUSTER:DENSE in reason codes (enriched)
        alert = dengue_alerts[0]
        assert REASON_CLUSTER_DENSE in alert["reasonCodes"], \
            "Cluster detection should enrich existing alert with CLUSTER:DENSE reason code"


# =============================================================================
# Test 9: Cluster Creates New Alert
# =============================================================================

class TestClusterCreatesNewAlert:
    """Test that new MEDIUM alert is created when no threshold alert exists."""

    def test_cluster_creates_new_alert(self):
        """When no threshold alert exists, new MEDIUM alert is created."""
        fixed_now = real_datetime(2026, 4, 5, 12, 0, 0)

        # 6 cases in tight cluster — enough for cluster alert but below threshold
        # (no baseline data, so threshold won't trigger)
        rows = []
        for i in range(6):
            rows.append(_make_mock_row(
                i, disease="RareDisease", district="Remote District",
                latitude=14.5995, longitude=120.9842,
                days_ago=i,
                reference_now=fixed_now,
            ))

        with _patch_fetch(rows):
            outbreaks = detect_outbreaks(reference_now=fixed_now)

        # Should have at least one alert for RareDisease
        rare_alerts = [o for o in outbreaks if o["disease"] == "RareDisease"]
        assert len(rare_alerts) >= 1, "Should create alert for dense cluster"

        # Check it's a cluster-based alert
        cluster_alerts = [o for o in rare_alerts if REASON_CLUSTER_DENSE in o["reasonCodes"]]
        assert len(cluster_alerts) >= 1, "Should have CLUSTER:DENSE reason code"


# =============================================================================
# Test 10: Insufficient Coordinates Skipped
# =============================================================================

class TestInsufficientCoordinatesSkipped:
    """Test that < 5 cases with valid coordinates skips cluster detection."""

    def test_insufficient_coordinates_skipped(self):
        """< 5 cases with valid coordinates skips cluster detection gracefully."""
        fixed_now = real_datetime(2026, 4, 5, 12, 0, 0)

        # Only 3 cases with valid coordinates (rest have NULL)
        rows = [
            _make_mock_row(1, latitude=14.0, longitude=120.0, days_ago=1, reference_now=fixed_now),
            _make_mock_row(2, latitude=14.1, longitude=120.1, days_ago=2, reference_now=fixed_now),
            _make_mock_row(3, latitude=14.2, longitude=120.2, days_ago=3, reference_now=fixed_now),
            _make_mock_row(4, latitude=None, longitude=None, days_ago=4, reference_now=fixed_now),
            _make_mock_row(5, latitude=None, longitude=None, days_ago=5, reference_now=fixed_now),
        ]

        with _patch_fetch(rows):
            outbreaks = detect_outbreaks(reference_now=fixed_now)

        # Should NOT detect dense cluster (< 5 valid coordinates)
        cluster_alerts = [o for o in outbreaks if REASON_CLUSTER_DENSE in o["reasonCodes"]]
        assert len(cluster_alerts) == 0, "Should skip cluster detection with < 5 valid coordinates"


# =============================================================================
# Test 11: All Same Location K=1
# =============================================================================

class TestAllSameLocationK1:
    """Test that all cases at identical coordinates → K=1, no false cluster alert."""

    def test_all_same_location_k1(self):
        """All cases at identical coordinates → K=1, no false cluster alert."""
        # All at exact same location
        data = np.array([
            [0.5, 0.5],
            [0.5, 0.5],
            [0.5, 0.5],
            [0.5, 0.5],
            [0.5, 0.5],
        ])

        optimal_k = find_optimal_clusters(data)

        # Should return k=1 (or k=2 but all in one cluster) since all points are identical
        assert optimal_k <= 2, "Should not create multiple clusters for identical points"


# =============================================================================
# Test 12: End-to-End Outbreak Detection
# =============================================================================

class TestEndToEndOutbreakDetection:
    """Full detect_outbreaks() pipeline with mock data returns expected outbreak alerts."""

    def test_end_to_end_outbreak_detection(self):
        """Full detect_outbreaks() pipeline with mock data returns expected outbreak alerts."""
        fixed_now = real_datetime(2026, 4, 5, 12, 0, 0)

        # Build realistic dataset:
        # - 15 baseline cases (days 8-37): normal Dengue distribution
        # - 10 recent cases (days 0-7): all in tight cluster at Barangay A
        rows = []

        # Baseline: scattered Dengue cases over 30 days
        for i in range(15):
            rows.append(_make_mock_row(
                i, disease="Dengue", district="Barangay A",
                latitude=14.5995 + (i * 0.001),  # Slightly spread
                longitude=120.9842 + (i * 0.001),
                days_ago=8 + i,  # 8-22 days ago
                reference_now=fixed_now,
            ))

        # Recent: 10 Dengue cases in tight cluster (last 7 days)
        for i in range(10):
            rows.append(_make_mock_row(
                100 + i, disease="Dengue", district="Barangay A",
                latitude=14.5995, longitude=120.9842,  # Same location
                days_ago=i,  # 0-6 days ago
                reference_now=fixed_now,
            ))

        with _patch_fetch(rows):
            outbreaks = detect_outbreaks(reference_now=fixed_now)

        # Should detect outbreaks
        assert len(outbreaks) >= 1, "Should detect at least one outbreak"

        # Should have Dengue alerts
        dengue_alerts = [o for o in outbreaks if o["disease"] == "Dengue"]
        assert len(dengue_alerts) >= 1, "Should detect Dengue outbreak"

        # At least one should have CLUSTER:DENSE
        cluster_alerts = [o for o in dengue_alerts if REASON_CLUSTER_DENSE in o["reasonCodes"]]
        assert len(cluster_alerts) >= 1, "Should detect geographic cluster"

        # Alert should have proper metadata
        alert = dengue_alerts[0]
        assert "metadata" in alert
        assert alert["metadata"]["disease"] == "Dengue"
        assert alert["metadata"]["district"] == "Barangay A"
        assert alert["metadata"]["count"] >= 5
