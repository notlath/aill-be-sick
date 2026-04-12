import re
from typing import Dict, Any, Tuple, List
from app.services.clinical_matrix import CLINICAL_MATRIX, get_mapped_symptoms


def apply_clinical_guardrails(
    raw_symptoms: str,
    top_diseases: list,
    mean_probs: dict,
    pred: str,
    confidence: float,
) -> Tuple[str, float, dict, list, str]:
    """
    Applies DOH/WHO clinical guardrails to raw NLP model outputs.

    1. Overlap Flattener: If only shared symptoms are present, balance probabilities.
    2. Contradiction Penalizer: Drop confidence if contradiction is found.
    3. WHO Criteria Checker: Check mandatory/major symptom counts, cap confidence if not met.

    Returns:
        (pred, confidence, mean_probs, top_diseases, guardrail_status)
    """
    symptoms_list = re.split(r"[.,;!_&\n]+| and | at ", raw_symptoms.lower())
    mapped_symptoms = get_mapped_symptoms(symptoms_list)

    # Defaults
    status = "OK"
    new_mean_probs = dict(mean_probs)
    new_confidence = confidence
    new_pred = pred
    new_top_diseases = list(top_diseases)

    # 1. Evaluate Contradictions and WHO Criteria for the predicted disease
    if pred.upper() in CLINICAL_MATRIX:
        matrix = CLINICAL_MATRIX[pred.upper()]

        # Check for contradictions
        has_contradiction = False
        for signal in matrix.get("contradictory_signals", []):
            if signal in mapped_symptoms:
                has_contradiction = True
                break

        if has_contradiction:
            # Massive penalty for contradiction
            print(f"[GUARDRAIL] Contradiction detected for {pred}! Penalizing score.")
            new_confidence = max(0.01, confidence * 0.2)
            new_mean_probs[pred] = new_confidence
            status = "CONTRADICTION_PENALTY"

        # Check WHO Criteria (Mandatory + Major/Minor threshold)
        mandatory_met = True
        for mandatory in matrix.get("mandatory_criteria", []):
            if mandatory not in mapped_symptoms:
                mandatory_met = False
                break

        # Count major/minor
        major_count = sum(
            1 for sym in matrix.get("major_symptoms", []) if sym in mapped_symptoms
        )
        minor_count = sum(
            1 for sym in matrix.get("minor_symptoms", []) if sym in mapped_symptoms
        )

        # Dengue Threshold: Fever + 2 minor/major
        # We can formalize the string evaluation in a future iteration, but for now we hardcode the intent
        who_met = True
        if pred.upper() == "DENGUE" and (
            not mandatory_met or (major_count + minor_count) < 2
        ):
            who_met = False
        elif pred.upper() == "TYPHOID" and (not mandatory_met or major_count < 1):
            who_met = False
        elif pred.upper() == "INFLUENZA" and (not mandatory_met or major_count < 1):
            who_met = False
        elif pred.upper() == "MEASLES" and (not mandatory_met or major_count < 1):
            who_met = False
        elif pred.upper() == "PNEUMONIA" and (not mandatory_met or major_count < 1):
            who_met = False
        elif pred.upper() == "DIARRHEA" and not mandatory_met:
            who_met = False

        if not who_met and status != "CONTRADICTION_PENALTY":
            print(f"[GUARDRAIL] WHO criteria not met for {pred}. Capping confidence.")
            new_confidence = min(0.40, new_confidence)  # Cap at 40%
            new_mean_probs[pred] = new_confidence
            status = "NEEDS_DIFFERENTIATION"

    # 2. Overlap Flattener (Shared Symptoms only)
    # Check if we ONLY have non-specific generic symptoms (fever, headache, fatigue)
    # and no distinguishing major symptoms for ANY disease
    generic_symptoms = {"fever", "headache", "fatigue", "nausea"}
    is_only_generic = len(mapped_symptoms) > 0 and all(
        sym in generic_symptoms for sym in mapped_symptoms
    )

    if is_only_generic:
        print("[GUARDRAIL] Only generic symptoms found. Flattening probabilities.")
        # Flatten the top 3 diseases to ~30-35%
        keys = list(new_mean_probs.keys())
        if len(keys) >= 3:
            total_generic = sum(new_mean_probs[k] for k in keys[:3])
            avg = total_generic / 3.0
            for k in keys[:3]:
                new_mean_probs[k] = max(0.25, avg)  # Soften to average
            # Re-sort
            sorted_probs = sorted(
                new_mean_probs.items(), key=lambda x: x[1], reverse=True
            )
            new_mean_probs = dict(sorted_probs)
            new_pred = sorted_probs[0][0]
            new_confidence = sorted_probs[0][1]
            status = "NEEDS_DIFFERENTIATION"

    # Recalculate top_diseases array based on new_mean_probs
    new_top_diseases = []
    for dis, prob in new_mean_probs.items():
        # Keep original format: {'disease': dis, 'probability': prob}
        new_top_diseases.append({"disease": dis, "probability": prob})

    return new_pred, new_confidence, new_mean_probs, new_top_diseases[:3], status
