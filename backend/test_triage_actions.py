import sys
import os

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.utils import _build_cdss_payload
from app.config import TRIAGE_HIGH_CONFIDENCE, TRIAGE_LOW_UNCERTAINTY


def test_cdss_payload_inconclusive():
    print("Testing Inconclusive Case...")
    payload = _build_cdss_payload(
        symptoms="I have a fever and body aches.",
        disease="Dengue",
        confidence=0.3,  # Low confidence -> Inconclusive
        uncertainty=0.5,
        top_diseases=[
            {"disease": "Dengue", "probability": 0.3},
            {"disease": "Flu", "probability": 0.2},
        ],
        model_used="BioClinical-ModernBERT",
        is_valid=True,
        question_answers={},
    )

    actions = payload["recommendation"]["actions"]
    print(f"Actions for inconclusive: {actions}")

    # Should NOT have Dengue specific actions
    assert not any("NSAIDs" in a for a in actions), (
        "NSAID warning should not be present!"
    )
    assert not any("CBC" in a for a in actions), "CBC warning should not be present!"
    print("Inconclusive test passed!\n")


def test_cdss_payload_conclusive():
    print("Testing Conclusive Case...")
    payload = _build_cdss_payload(
        symptoms="I have a fever, severe retroorbital pain, and a rash.",
        disease="Dengue",
        confidence=0.9,  # High confidence -> Conclusive
        uncertainty=0.05,
        top_diseases=[{"disease": "Dengue", "probability": 0.9}],
        model_used="BioClinical-ModernBERT",
        is_valid=True,
        question_answers={},
    )

    actions = payload["recommendation"]["actions"]
    print(f"Actions for conclusive: {actions}")

    # SHOULD have Dengue specific actions
    assert any("NSAIDs" in a for a in actions), "NSAID warning MUST be present!"
    assert any("CBC" in a for a in actions), "CBC warning MUST be present!"
    print("Conclusive test passed!\n")


if __name__ == "__main__":
    test_cdss_payload_inconclusive()
    test_cdss_payload_conclusive()
    print("All tests passed!")
