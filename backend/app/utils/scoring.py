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

    if answer == "yes":
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

    elif answer == "no":
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
        top_diseases.append({
            "disease": label,
            "probability": float(posterior[idx]),
        })
    top_diseases.sort(key=lambda x: x["probability"], reverse=True)

    # Format probs strings for logging
    probs_formatted = [
        f"{d['disease']}: {(d['probability']*100):.2f}%" for d in top_diseases
    ]

    return {
        "probs": posterior.tolist(),
        "probs_formatted": probs_formatted,
        "confidence": confidence,
        "uncertainty": uncertainty,
        "predicted_class": predicted_class,
        "predicted_label": disease_labels.get(predicted_class, f"Disease_{predicted_class}"),
        "top_diseases": top_diseases,
    }


def lookup_question_metadata(question_id: str, question_bank: dict) -> dict | None:
    """
    Look up a question's weight and target disease from its ID.

    Args:
        question_id: e.g., "typhoid_q1"
        question_bank: The full question bank dict {disease: [questions]}

    Returns:
        dict with "weight", "disease", "disease_idx" or None if not found.
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
                }

    return None
