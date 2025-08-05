"""
Quick test script for the trained Naive Bayes model
"""

import requests
import json


def test_disease_prediction():
    """Test the disease prediction API"""

    # Test cases with different symptom combinations
    test_cases = [
        {
            "name": "Diabetes Test",
            "symptoms": ["polyuria", "excessive_hunger", "weight_loss", "fatigue"],
        },
        {
            "name": "Common Cold Test",
            "symptoms": ["runny_nose", "congestion", "cough", "headache"],
        },
        {
            "name": "Malaria Test",
            "symptoms": ["high_fever", "chills", "sweating", "headache", "nausea"],
        },
        {
            "name": "Dengue Test",
            "symptoms": [
                "high_fever",
                "headache",
                "muscle_pain",
                "joint_pain",
                "redness_of_eyes",
            ],
        },
    ]

    base_url = "http://localhost:8000"

    print("🧪 Testing Disease Prediction API")
    print("=" * 50)

    try:
        # Test the index endpoint first
        response = requests.get(f"{base_url}/classifications/")
        print(f"✅ API Status: {response.json()}")
        print()

        # Test each disease prediction
        for i, test_case in enumerate(test_cases, 1):
            print(f"{i}. {test_case['name']}")
            print(f"   Symptoms: {', '.join(test_case['symptoms'])}")

            response = requests.post(
                f"{base_url}/classifications/new",
                json={"symptoms": test_case["symptoms"]},
                headers={"Content-Type": "application/json"},
            )

            if response.status_code == 201:
                result = response.json()
                print(f"   🎯 Predicted: {result['data']}")
                print(f"   📊 Confidence: {result.get('confidence', 'N/A'):.3f}")
                if "all_probabilities" in result:
                    # Show top 3 predictions
                    probs = result["all_probabilities"]
                    top_3 = sorted(probs.items(), key=lambda x: x[1], reverse=True)[:3]
                    print(
                        f"   📈 Top 3: {', '.join([f'{disease}({prob:.2f})' for disease, prob in top_3])}"
                    )
            else:
                print(f"   ❌ Error: {response.status_code} - {response.text}")

            print()

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask app.")
        print("Make sure the Flask app is running on localhost:8000")
        print("Run: python app.py")
    except Exception as e:
        print(f"❌ Test failed: {e}")


if __name__ == "__main__":
    test_disease_prediction()
