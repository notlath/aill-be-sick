"""
Test the trained Naive Bayes model with real dataset symptoms
"""

import requests
import json
import time


def test_with_real_symptoms():
    """Test with symptoms that exist in the symbipredict dataset"""

    # Wait for Flask app to start
    print("Waiting for Flask app to start...")
    time.sleep(3)

    base_url = "http://localhost:8000"

    # Test cases using exact symptoms from the dataset
    test_cases = [
        {
            "name": "Skin condition (Fungal Infection pattern)",
            "symptoms": ["itching", "skin_rash", "nodal_skin_eruptions"],
        },
        {
            "name": "Respiratory symptoms (possible Cold/Flu)",
            "symptoms": ["cough", "continuous_sneezing", "fatigue", "headache"],
        },
        {
            "name": "Digestive issues",
            "symptoms": ["stomach_pain", "acidity", "vomiting", "nausea"],
        },
        {
            "name": "Fever-related symptoms",
            "symptoms": ["chills", "shivering", "fatigue", "headache"],
        },
        {
            "name": "Joint/muscle pain",
            "symptoms": ["joint_pain", "muscle_wasting", "back_pain", "fatigue"],
        },
    ]

    print("🧪 Testing Disease Prediction with Real Dataset Symptoms")
    print("=" * 60)

    try:
        # Test the index endpoint first
        print("1. Testing API status...")
        response = requests.get(f"{base_url}/classifications/")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ API Status: {result['status']}")
            print(f"   🤖 Model loaded: {result['model_loaded']}")
            print(f"   📊 Available symptoms: {result['available_symptoms_count']}")
            print()
        else:
            print(f"   ❌ API Error: {response.status_code}")
            return

        # Test symptom predictions
        for i, test_case in enumerate(test_cases, 2):
            print(f"{i}. {test_case['name']}")
            print(f"   Input: {', '.join(test_case['symptoms'])}")

            response = requests.post(
                f"{base_url}/classifications/new",
                json={"symptoms": test_case["symptoms"]},
                headers={"Content-Type": "application/json"},
            )

            if response.status_code == 201:
                result = response.json()
                print(f"   🎯 Predicted: {result['data']}")
                print(f"   📊 Confidence: {result.get('confidence', 0):.3f}")
                print(
                    f"   🔗 Symptoms mapped: {len(result.get('symptoms_mapped', []))}"
                )

                # Show top 3 predictions if available
                if "all_probabilities" in result and result["all_probabilities"]:
                    probs = result["all_probabilities"]
                    top_3 = sorted(probs.items(), key=lambda x: x[1], reverse=True)[:3]
                    print(
                        f"   📈 Top 3: {', '.join([f'{disease}({prob:.2f})' for disease, prob in top_3])}"
                    )

                print(f"   🧠 Model used: {result.get('model_used', 'Unknown')}")
            else:
                print(f"   ❌ Error: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   📄 Details: {error_data}")
                except:
                    print(f"   📄 Response: {response.text}")

            print()

        # Test symptoms endpoint
        print(f"{len(test_cases) + 2}. Testing available symptoms endpoint...")
        response = requests.get(f"{base_url}/symptoms")
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Total symptoms available: {result['total_count']}")
            print(
                f"   📋 First 10 symptoms: {', '.join(result['available_symptoms'][:10])}"
            )
        else:
            print(f"   ❌ Symptoms endpoint error: {response.status_code}")

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask app.")
        print("🔧 Troubleshooting:")
        print("   1. Make sure Flask app is running: python app.py")
        print("   2. Check if port 8000 is available")
        print("   3. Try: curl http://localhost:8000/classifications/")
    except Exception as e:
        print(f"❌ Test failed: {e}")


if __name__ == "__main__":
    test_with_real_symptoms()
