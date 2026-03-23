"""
Bayesian Evidence Update for Follow-Up Question Scoring.

Instead of re-running the NLP classifier with appended boilerplate text
(which causes distributional shift and confidence drop), this module
adjusts the initial classification probabilities based on Yes/No follow-up
answers using question weights from the question bank.

Theory:
  P(disease | evidence) ∝ P(evidence | disease) * P(disease)

  Where:
  - P(disease) = prior from the initial NLP classification
  - P(evidence | disease) = likelihood derived from question weights
"""

import numpy as np
from scipy.stats import entropy


def bayesian_evidence_update(
    current_probs: list | np.ndarray,
    answer: str,
    question_weight: float,
    target_disease_idx: int,
    disease_labels: dict,
    is_negative: bool = False,
) -> dict:
    """
    Apply a Bayesian evidence update to the probability distribution.

    Args:
        current_probs: Current probability distribution over diseases.
                       Shape: [num_diseases] (flat array, one prob per disease).
        answer: "yes" or "no"
        question_weight: The question's weight from the question bank (0.85-0.95).
        target_disease_idx: Index of the disease this question targets.
        disease_labels: Dict mapping idx -> disease name (e.g., {0: "Dengue", ...}).
        is_negative: If True, this is a "negative" question where the expected
                     answer for the disease is "no" (e.g., "Do you have a cough?"
                     for Dengue, where absence of cough supports Dengue).
                     When is_negative=True, the boost/penalty logic is INVERTED:
                     - "yes" -> PENALIZE target disease
                     - "no" -> BOOST target disease

    Returns:
        dict with:
            - "probs": Updated probability distribution (list)
            - "confidence": Max probability after update
            - "uncertainty": Entropy-based uncertainty estimate
            - "predicted_class": Index of most likely disease
            - "predicted_label": Name of most likely disease
            - "top_diseases": Sorted list of {disease, probability}
    """
    probs = np.array(current_probs, dtype=np.float64).flatten()
    num_classes = len(probs)

    # Clamp to avoid log(0) issues
    probs = np.clip(probs, 1e-10, 1.0)
    probs = probs / probs.sum()  # Renormalize

    # Compute likelihood ratios based on answer
    likelihood = np.ones(num_classes, dtype=np.float64)

    # For negative questions, invert the effective answer
    # "Do you have a cough?" is_negative=True for Dengue
    # - User says "yes" (has cough) -> treat as "no" for Dengue support
    # - User says "no" (no cough) -> treat as "yes" for Dengue support
    effective_answer = answer
    if is_negative:
        effective_answer = "no" if answer == "yes" else "yes"

    if effective_answer == "yes":
        # "Yes" to a disease-specific question:
        # - BOOST the target disease by the question's weight
        # - PENALIZE competing diseases proportionally
        #
        # The boost factor is 1 + weight (e.g., weight=0.95 -> 1.95x)
        # The penalty factor scales with the weight gap between target and others
        boost_factor = 1.0 + question_weight
        penalty_factor = 1.0 - (question_weight * 0.35)  # 0.35 = penalty strength

        likelihood[target_disease_idx] = boost_factor
        for i in range(num_classes):
            if i != target_disease_idx:
                likelihood[i] = max(penalty_factor, 0.1)  # Floor at 0.1

    elif effective_answer == "no":
        # "No" to a disease-specific question:
        # - PENALIZE the target disease (moderately)
        # - Slightly boost all others (evidence against target)
        penalty_factor = 1.0 - (question_weight * 0.35)
        boost_factor = 1.0 + (question_weight * 0.1)

        likelihood[target_disease_idx] = max(penalty_factor, 0.05)
        for i in range(num_classes):
            if i != target_disease_idx:
                likelihood[i] = boost_factor

    # Apply Bayes rule: posterior ∝ likelihood * prior
    posterior = likelihood * probs
    posterior = posterior / posterior.sum()  # Renormalize

    # Compute updated metrics
    predicted_class = int(np.argmax(posterior))
    confidence = float(np.max(posterior))

    # Entropy-based uncertainty (normalized by log(num_classes) so it's in [0, 1])
    raw_entropy = float(entropy(posterior))
    max_entropy = float(np.log(num_classes))
    uncertainty = raw_entropy / max_entropy if max_entropy > 0 else 0.0

    # Build top_diseases list
    top_diseases = []
    for idx in range(num_classes):
        label = disease_labels.get(idx, f"Disease_{idx}")
        top_diseases.append(
            {
                "disease": label,
                "probability": float(posterior[idx]),
            }
        )
    top_diseases.sort(key=lambda x: x["probability"], reverse=True)

    # Format probs strings for logging
    probs_formatted = [
        f"{d['disease']}: {(d['probability'] * 100):.2f}%" for d in top_diseases
    ]

    return {
        "probs": posterior.tolist(),
        "probs_formatted": probs_formatted,
        "confidence": confidence,
        "uncertainty": uncertainty,
        "predicted_class": predicted_class,
        "predicted_label": disease_labels.get(
            predicted_class, f"Disease_{predicted_class}"
        ),
        "top_diseases": top_diseases,
    }


def lookup_question_metadata(question_id: str, question_bank: dict) -> dict | None:
    """
    Look up a question's weight and target disease from its ID.

    Args:
        question_id: e.g., "typhoid_q1"
        question_bank: The full question bank dict {disease: [questions]}

    Returns:
        dict with "weight", "disease", "disease_idx", "is_negative" or None if not found.
    """
    # Import here to avoid circular imports
    from app.services.ml_service import CORRECT_ID2LABEL

    # Build reverse map: label -> idx
    label2idx = {v: k for k, v in CORRECT_ID2LABEL.items()}

    for disease, questions in question_bank.items():
        for q in questions:
            if q.get("id") == question_id:
                disease_idx = label2idx.get(disease)
                if disease_idx is None:
                    return None
                return {
                    "weight": q.get("weight", 0.85),
                    "disease": disease,
                    "disease_idx": disease_idx,
                    "category": q.get("category", "secondary"),
                    "is_negative": q.get("is_negative", False),
                }

    return None


def apply_text_evidence_boosts(
    current_probs: list | np.ndarray,
    symptoms_text: str,
    question_bank: dict,
    disease_labels: dict,
    evidence_keywords: dict,
) -> dict:
    """
    Apply Bayesian boosts for symptoms detected in the initial text description.

    This is the CRITICAL FIX: when the user describes symptoms in their initial text,
    we must mathematically update the probability distribution to reflect that evidence,
    not just skip the corresponding follow-up questions.

    For example, if user says "I have high fever, muscle pain, and bleeding gums",
    this function will apply positive Bayesian updates for all those symptoms,
    boosting diseases like Dengue significantly BEFORE any follow-up questions.

    Args:
        current_probs: Current probability distribution over diseases.
        symptoms_text: The user's symptom description text.
        question_bank: Full question bank {disease: [questions]}.
        disease_labels: Dict mapping idx -> disease name.
        evidence_keywords: EVIDENCE_KEYWORDS mapping question_id -> [keywords].

    Returns:
        dict with:
            - "probs": Updated probability distribution
            - "confidence": Max probability after updates
            - "uncertainty": Entropy-based uncertainty
            - "predicted_class": Index of most likely disease
            - "predicted_label": Name of most likely disease
            - "top_diseases": Sorted list of {disease, probability}
            - "boosted_questions": List of question IDs that had evidence
            - "boost_count": Number of boosts applied
    """
    probs = np.array(current_probs, dtype=np.float64).flatten()
    probs = np.clip(probs, 1e-10, 1.0)
    probs = probs / probs.sum()

    symptoms_lower = symptoms_text.lower()
    boosted_questions = []

    # Build reverse map: label -> idx
    label2idx = {v: k for k, v in disease_labels.items()}

    for disease, questions in question_bank.items():
        disease_idx = label2idx.get(disease)
        if disease_idx is None:
            continue

        for q in questions:
            qid = q.get("id", "")
            keywords = evidence_keywords.get(qid, [])

            if not keywords:
                continue

            # Check if any keyword matches
            has_match = any(kw.lower() in symptoms_lower for kw in keywords)

            if has_match:
                weight = q.get("weight", 0.85)
                is_negative = q.get("is_negative", False)

                # For negative questions (e.g., "do you have cough?"),
                # if user mentions cough, we treat as "yes" to cough,
                # which should PENALIZE diseases that expect "no cough"
                if is_negative:
                    # User mentioned the symptom -> answer is effectively "yes"
                    # For negative questions, "yes" means PENALIZE target disease
                    answer = "yes"
                else:
                    # Standard question: mentioning symptom = "yes" = BOOST target
                    answer = "yes"

                # Apply Bayesian update
                num_classes = len(probs)
                likelihood = np.ones(num_classes, dtype=np.float64)

                if is_negative:
                    # Negative question + "yes" answer = PENALIZE target disease
                    # (e.g., "no cough?" user has cough -> penalize Dengue)
                    penalty_factor = 1.0 - (weight * 0.35)
                    boost_factor = 1.0 + (weight * 0.1)
                    likelihood[disease_idx] = max(penalty_factor, 0.05)
                    for i in range(num_classes):
                        if i != disease_idx:
                            likelihood[i] = boost_factor
                else:
                    # Standard question + "yes" answer = BOOST target disease
                    boost_factor = 1.0 + weight
                    penalty_factor = 1.0 - (weight * 0.35)
                    likelihood[disease_idx] = boost_factor
                    for i in range(num_classes):
                        if i != disease_idx:
                            likelihood[i] = max(penalty_factor, 0.1)

                probs = likelihood * probs
                probs = probs / probs.sum()
                boosted_questions.append(qid)

    # Compute updated metrics
    num_classes = len(probs)
    predicted_class = int(np.argmax(probs))
    confidence = float(np.max(probs))

    raw_entropy = float(entropy(probs))
    max_entropy = float(np.log(num_classes))
    uncertainty = raw_entropy / max_entropy if max_entropy > 0 else 0.0

    # Build top_diseases list
    top_diseases = []
    for idx in range(num_classes):
        label = disease_labels.get(idx, f"Disease_{idx}")
        top_diseases.append(
            {
                "disease": label,
                "probability": float(probs[idx]),
            }
        )
    top_diseases.sort(key=lambda x: x["probability"], reverse=True)

    return {
        "probs": probs.tolist(),
        "confidence": confidence,
        "uncertainty": uncertainty,
        "predicted_class": predicted_class,
        "predicted_label": disease_labels.get(
            predicted_class, f"Disease_{predicted_class}"
        ),
        "top_diseases": top_diseases,
        "boosted_questions": boosted_questions,
        "boost_count": len(boosted_questions),
    }
