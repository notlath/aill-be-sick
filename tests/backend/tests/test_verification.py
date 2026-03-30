"""
Test script for Neuro-Symbolic Verification Layer.
Verifies that the system properly flags OUT_OF_SCOPE when clinical concepts
don't match the predicted disease's ontology.
"""

import requests
import json

BASE_URL = "http://localhost:10000"

def test_leptospirosis_case():
    """
    User's actual case: Leptospirosis symptoms misclassified as Dengue.
    Should trigger OUT_OF_SCOPE due to RISK_FLOOD_EXPOSURE and SX_JAUNDICE.
    """
    print("🧪 Test 1: Leptospirosis Case (should be OUT_OF_SCOPE)")
    
    symptoms = """tatlong araw na po akong nilalagnat at sobrang sakit ng ulo ko, 
    pero ang pinaka-iniinda ko ay ang matinding kirot sa mga binti ko. 
    Hirap na hirap po akong maglakad dahil parang namamanhid at kumikirot ang kalamnan ng binti ko kapag humahakbang. 
    Naalala ko po kasing lumusong ako sa baha noong nakaraang linggo habang pauwi galing sa trabaho. 
    Napansin ko rin po ngayong umaga na parang kulay tsaa ang ihi ko at medyo naninilaw ang balat ko. 
    Bukod pa po roon, namumula ang mga mata ko pero wala namang lumalabas na muta o kati."""
    
    response = requests.post(
        f"{BASE_URL}/diagnosis/new",
        json={"symptoms": symptoms},
        headers={"Content-Type": "application/json"}
    )
    
    data = response.json()
    
    if "data" in data:
        skip_reason = data["data"].get("skip_reason", "")
        is_valid = data["data"].get("is_valid", True)
        verification_failure = data["data"].get("verification_failure", {})
        
        print(f"   Predicted: {data['data'].get('pred', 'N/A')}")
        print(f"   Confidence: {data['data'].get('confidence', 'N/A'):.4f}")
        print(f"   skip_reason: {skip_reason}")
        print(f"   is_valid: {is_valid}")
        print(f"   verification_failure: {verification_failure}")
        
        if skip_reason == "OUT_OF_SCOPE" and is_valid == False:
            print("   ✅ PASS - Correctly flagged as OUT_OF_SCOPE")
            return True
        else:
            print("   ❌ FAIL - Should have been OUT_OF_SCOPE")
            return False
    else:
        print(f"   ❌ FAIL - Unexpected response: {data}")
        return False


def test_covid_case():
    """
    COVID-19 symptoms (loss of taste/smell) should trigger OUT_OF_SCOPE.
    """
    print("\n🧪 Test 2: COVID-19 Case (should be OUT_OF_SCOPE)")
    
    symptoms = "I have fever and cough for 3 days. I also noticed I lost my sense of taste and smell."
    
    response = requests.post(
        f"{BASE_URL}/diagnosis/new",
        json={"symptoms": symptoms},
        headers={"Content-Type": "application/json"}
    )
    
    data = response.json()
    
    if "data" in data:
        skip_reason = data["data"].get("skip_reason", "")
        is_valid = data["data"].get("is_valid", True)
        
        print(f"   Predicted: {data['data'].get('pred', 'N/A')}")
        print(f"   skip_reason: {skip_reason}")
        print(f"   is_valid: {is_valid}")
        
        if skip_reason == "OUT_OF_SCOPE" and is_valid == False:
            print("   ✅ PASS - Correctly flagged as OUT_OF_SCOPE")
            return True
        else:
            print("   ❌ FAIL - Should have been OUT_OF_SCOPE")
            return False
    else:
        print(f"   ❌ FAIL - Unexpected response: {data}")
        return False


def test_valid_dengue_case():
    """
    Valid Dengue symptoms should NOT be flagged as OUT_OF_SCOPE.
    """
    print("\n🧪 Test 3: Valid Dengue Case (should be VALID)")
    
    symptoms = "I have high fever for 3 days with severe headache and joint pain. I also have a rash on my skin."
    
    response = requests.post(
        f"{BASE_URL}/diagnosis/new",
        json={"symptoms": symptoms},
        headers={"Content-Type": "application/json"}
    )
    
    data = response.json()
    
    if "data" in data:
        skip_reason = data["data"].get("skip_reason", "")
        is_valid = data["data"].get("is_valid", True)
        
        print(f"   Predicted: {data['data'].get('pred', 'N/A')}")
        print(f"   skip_reason: {skip_reason}")
        print(f"   is_valid: {is_valid}")
        
        # Valid case should either have skip_reason != OUT_OF_SCOPE or is_valid == True
        if skip_reason != "OUT_OF_SCOPE":
            print("   ✅ PASS - Not flagged as OUT_OF_SCOPE")
            return True
        else:
            print("   ❌ FAIL - Should NOT have been OUT_OF_SCOPE")
            return False
    else:
        print(f"   ❌ FAIL - Unexpected response: {data}")
        return False


def test_measles_case_false_positive():
    """
    Measles case that was previously flagged as OUT_OF_SCOPE due to partial word matching.
    'nanghihina' (weakness) matched 'ihi' (urine).
    Should now be VALID.
    """
    print("\n🧪 Test 4: Measles Case (False Positive Check) (should be VALID)")
    
    symptoms = "ilang araw na po akong nilalagnat nang mataas at sobrang sama ng pakiramdam ko. Napansin ko rin po na walang tigil ang ubo’t sipon ko, tapos namumula at nagluluha ang mga mata ko. Kahapon, nagulat na lang ako nang may lumabas na maliliit at mapupulang butlig sa likod ng tenga ko at sa aking mukha. Ngayon po ay parang kumakalat na yung pantal pababa sa leeg at katawan ko kaya nag-alala na ako. Hirap na hirap po ako kumain dahil parang may masakit din sa lalamunan ko at nanghihina ang buong katawan ko."
    
    response = requests.post(
        f"{BASE_URL}/diagnosis/new",
        json={"symptoms": symptoms},
        headers={"Content-Type": "application/json"}
    )
    
    data = response.json()
    
    if "data" in data:
        skip_reason = data["data"].get("skip_reason", "")
        is_valid = data["data"].get("is_valid", True)
        
        print(f"   Predicted: {data['data'].get('pred', 'N/A')}")
        print(f"   skip_reason: {skip_reason}")
        print(f"   is_valid: {is_valid}")
        
        if skip_reason != "OUT_OF_SCOPE":
            print("   ✅ PASS - Not flagged as OUT_OF_SCOPE")
            return True
        else:
            print(f"   ❌ FAIL - Still flagged as OUT_OF_SCOPE. Unexplained: {data['data'].get('verification_failure', {}).get('unexplained_concepts')}")
            return False
    else:
        print(f"   ❌ FAIL - Unexpected response: {data}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Neuro-Symbolic Verification Tests")
    print("=" * 60)
    print("NOTE: Backend server must be running at localhost:5000")
    print()
    
    results = []
    
    try:
        results.append(test_leptospirosis_case())
        results.append(test_covid_case())
        results.append(test_valid_dengue_case())
        results.append(test_measles_case_false_positive())
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to backend. Is it running?")
        exit(1)
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed")
