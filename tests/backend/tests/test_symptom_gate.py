"""
Quick validation script for symptom narrative gating.
Tests the /diagnosis/new endpoint with various inputs to verify thresholds work.
"""

import requests
import json

BACKEND_URL = "http://127.0.0.1:10000"

test_cases = [
    {
        "name": "Off-topic: greeting",
        "symptoms": "hey",
        "expected_status": 422,
        "expected_error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
    },
    {
        "name": "Off-topic: short phrase",
        "symptoms": "what's up",
        "expected_status": 422,
        "expected_error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
    },
    {
        "name": "Off-topic: single word",
        "symptoms": "lol",
        "expected_status": 422,
        "expected_error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
    },
    {
        "name": "Valid: English symptom narrative",
        "symptoms": "I have had fever and cough for two days",
        "expected_status": 201,
        "expected_error": None,
    },
    {
        "name": "Valid: Tagalog symptom narrative",
        "symptoms": "May lagnat at inuubo ako simula kahapon",
        "expected_status": 201,
        "expected_error": None,
    },
    {
        "name": "Valid: Chest pain and breathing",
        "symptoms": "chills and chest pain when breathing",
        "expected_status": 201,
        "expected_error": None,
    },
]


def run_tests():
    print("🧪 Testing symptom narrative gating...")
    print("=" * 70)

    passed = 0
    failed = 0

    for test in test_cases:
        print(f"\n📝 Test: {test['name']}")
        print(f"   Input: '{test['symptoms']}'")

        try:
            response = requests.post(
                f"{BACKEND_URL}/diagnosis/new",
                json={"symptoms": test["symptoms"]},
                timeout=30,
            )

            status = response.status_code
            data = response.json()

            print(f"   Status: {status}")

            if status == test["expected_status"]:
                if test["expected_error"]:
                    # Should be an error
                    if data.get("error") == test["expected_error"]:
                        print(f"   ✅ PASS - Got expected error: {data.get('error')}")
                        print(f"   Message: {data.get('message')}")
                        passed += 1
                    else:
                        print(
                            f"   ❌ FAIL - Expected error '{test['expected_error']}', got '{data.get('error')}'"
                        )
                        failed += 1
                else:
                    # Should be success
                    if data.get("data"):
                        diagnosis = data["data"]
                        print(f"   ✅ PASS - Diagnosis: {diagnosis.get('disease')}")
                        print(
                            f"   Confidence: {diagnosis.get('confidence'):.4f}, MI: {diagnosis.get('uncertainty'):.4f}"
                        )
                        passed += 1
                    else:
                        print(f"   ❌ FAIL - Expected diagnosis data, got: {data}")
                        failed += 1
            else:
                print(
                    f"   ❌ FAIL - Expected status {test['expected_status']}, got {status}"
                )
                print(f"   Response: {data}")
                failed += 1

        except Exception as e:
            print(f"   ❌ ERROR - {e}")
            failed += 1

    print("\n" + "=" * 70)
    print(
        f"📊 Results: {passed} passed, {failed} failed out of {len(test_cases)} tests"
    )

    if failed == 0:
        print("✅ All tests passed!")
    else:
        print(f"⚠️  {failed} test(s) failed - review thresholds if needed")

    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
