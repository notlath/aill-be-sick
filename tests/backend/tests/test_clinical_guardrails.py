import pytest
from app.services.clinical_guardrails import apply_clinical_guardrails


def test_fever_only_flattener():
    raw_symptoms = "fever"
    top_diseases = [
        {"disease": "DENGUE", "probability": 0.8},
        {"disease": "TYPHOID", "probability": 0.1},
        {"disease": "INFLUENZA", "probability": 0.1},
    ]
    mean_probs = {"DENGUE": 0.8, "TYPHOID": 0.1, "INFLUENZA": 0.1}
    pred = "DENGUE"
    confidence = 0.8

    new_pred, new_confidence, new_mean_probs, new_top_diseases, status = (
        apply_clinical_guardrails(
            raw_symptoms, top_diseases, mean_probs, pred, confidence
        )
    )

    # Should flatten
    assert status == "NEEDS_DIFFERENTIATION"
    assert new_mean_probs["DENGUE"] < 0.8
    # After WHO capping to 0.40, sum is 0.6, avg is 0.2. max(0.25, 0.2) = 0.25
    assert abs(new_mean_probs["DENGUE"] - 0.25) < 0.01
    assert abs(new_mean_probs["TYPHOID"] - 0.25) < 0.01
    assert abs(new_mean_probs["INFLUENZA"] - 0.25) < 0.01


def test_contradiction_penalizer():
    # 'good appetite' maps to 'normal_appetite' which is a contradictory signal for Dengue
    raw_symptoms = "fever, severe headache, good appetite"
    top_diseases = [{"disease": "DENGUE", "probability": 0.9}]
    mean_probs = {"DENGUE": 0.9}
    pred = "DENGUE"
    confidence = 0.9

    new_pred, new_confidence, new_mean_probs, new_top_diseases, status = (
        apply_clinical_guardrails(
            raw_symptoms, top_diseases, mean_probs, pred, confidence
        )
    )

    assert status == "CONTRADICTION_PENALTY"
    assert new_confidence == max(0.01, 0.9 * 0.2)  # Should be 0.18
    assert new_mean_probs["DENGUE"] == new_confidence


def test_missing_who_criteria():
    # 'fever' + 'nausea' (1 minor symptom). Dengue needs fever + 2 minor/major.
    raw_symptoms = "fever, nausea"
    top_diseases = [{"disease": "DENGUE", "probability": 0.7}]
    mean_probs = {"DENGUE": 0.7}
    pred = "DENGUE"
    confidence = 0.7

    new_pred, new_confidence, new_mean_probs, new_top_diseases, status = (
        apply_clinical_guardrails(
            raw_symptoms, top_diseases, mean_probs, pred, confidence
        )
    )

    assert status == "NEEDS_DIFFERENTIATION"
    assert new_confidence <= 0.40  # Capped at 40%
    assert new_mean_probs["DENGUE"] == new_confidence


def test_meets_who_criteria():
    # fever + severe headache (major) + joint pain (major, mapped from sakit sa kasukasuan)
    raw_symptoms = "fever, severe headache, joint pain"
    top_diseases = [{"disease": "DENGUE", "probability": 0.85}]
    mean_probs = {"DENGUE": 0.85}
    pred = "DENGUE"
    confidence = 0.85

    new_pred, new_confidence, new_mean_probs, new_top_diseases, status = (
        apply_clinical_guardrails(
            raw_symptoms, top_diseases, mean_probs, pred, confidence
        )
    )

    assert status == "OK"
    assert new_confidence == 0.85
    assert new_mean_probs["DENGUE"] == 0.85
