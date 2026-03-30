"""
Test script for OUT_OF_SCOPE safeguards.
Verifies that the system properly flags predictions when confidence/uncertainty
thresholds are not met (per thesis requirements: 70% conf, 5% uncertainty).
"""

import sys
sys.path.insert(0, "/home/notlath/Documents/Thesis/aill-be-sick/backend")

import config

def test_config_thresholds():
    """Verify thesis-aligned thresholds are configured."""
    print("🧪 Testing config thresholds...")
    print(f"   VALID_MIN_CONF: {config.VALID_MIN_CONF} (expected: 0.70)")
    print(f"   VALID_MAX_UNCERTAINTY: {config.VALID_MAX_UNCERTAINTY} (expected: 0.05)")
    
    assert config.VALID_MIN_CONF == 0.70, f"Expected 0.70, got {config.VALID_MIN_CONF}"
    assert config.VALID_MAX_UNCERTAINTY == 0.05, f"Expected 0.05, got {config.VALID_MAX_UNCERTAINTY}"
    print("   ✅ PASS - Thresholds match thesis requirements")
    return True


def test_validity_logic():
    """Test the validity check logic."""
    print("\n🧪 Testing validity logic...")
    
    # Simulate different confidence/uncertainty combinations
    test_cases = [
        # (confidence, uncertainty, expected_valid)
        (0.95, 0.01, True),   # Very high confidence, low uncertainty
        (0.70, 0.05, True),   # Exactly at threshold
        (0.69, 0.05, False),  # Just below confidence threshold
        (0.70, 0.06, False),  # Just above uncertainty threshold
        (0.50, 0.10, False),  # Both below thresholds
        (0.85, 0.03, True),   # Good confidence and uncertainty
    ]
    
    passed = 0
    failed = 0
    
    for conf, unc, expected in test_cases:
        is_valid = (conf >= config.VALID_MIN_CONF and unc <= config.VALID_MAX_UNCERTAINTY)
        status = "✅" if is_valid == expected else "❌"
        print(f"   {status} conf={conf:.2f}, unc={unc:.2f} -> valid={is_valid} (expected={expected})")
        if is_valid == expected:
            passed += 1
        else:
            failed += 1
    
    print(f"\n   Results: {passed} passed, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    print("=" * 60)
    print("OUT_OF_SCOPE Safeguard Tests")
    print("=" * 60)
    
    all_passed = True
    
    try:
        all_passed &= test_config_thresholds()
        all_passed &= test_validity_logic()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed")
        sys.exit(1)
