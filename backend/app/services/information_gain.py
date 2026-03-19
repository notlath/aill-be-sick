from __future__ import annotations

"""
Expected Information Gain (EIG) – Active Learning for question selection.

Instead of a static question bank traversal ordered by weight, this module
computes the expected reduction in predictive entropy for each candidate
question and picks the one that maximises information gain across ALL diseases.

Theory:
    EIG(q) = H(current) - E_{a ∈ {yes,no}} [ H(current | answer=a, question=q) ]

    The question with the highest EIG is the one whose answer (yes or no) will,
    on average, reduce uncertainty the most.

Enhanced with semantic grouping to avoid redundant questions about the same
symptom concepts across different diseases.

Hybrid Strategy (Doctor's Bedside Manner):
    To improve user trust, questions belonging to the top predicted disease
    receive a small EIG boost (configurable via TOP_DISEASE_EIG_BOOST).
    This ensures the first few questions naturally relate to the user's
    most likely condition, while still allowing cross-disease questions
    when they provide significantly more information gain.
"""

# Configuration for hybrid strategy
TOP_DISEASE_EIG_BOOST = 1.2  # 20% boost for questions targeting the top disease

import numpy as np
from scipy.stats import entropy
from typing import TYPE_CHECKING

from app.question_groups import (
    expand_asked_questions,
    get_questions_to_skip_from_text,
    get_questions_blocked_by_prerequisites,
)

if TYPE_CHECKING:
    pass


def _shannon_entropy(probs: np.ndarray) -> float:
    """Compute Shannon entropy of a probability distribution (natural log)."""
    return float(entropy(np.clip(probs, 1e-12, 1.0)))


def _simulate_posterior(
    probs: np.ndarray,
    answer: str,
    question_weight: float,
    target_disease_idx: int,
) -> np.ndarray:
    """
    Simulate what the posterior distribution would look like if the user
    answered `answer` to a question targeting `target_disease_idx`.

    Uses the same likelihood model as the existing Bayesian update in
    scoring.py so that the actual update and the simulated update are
    consistent.
    """
    num_classes = len(probs)
    likelihood = np.ones(num_classes, dtype=np.float64)

    if answer == "yes":
        boost = 1.0 + question_weight
        penalty = max(1.0 - question_weight * 0.35, 0.1)
        likelihood[target_disease_idx] = boost
        for i in range(num_classes):
            if i != target_disease_idx:
                likelihood[i] = penalty
    else:  # "no"
        penalty = max(1.0 - question_weight * 0.35, 0.05)
        boost = 1.0 + question_weight * 0.1
        likelihood[target_disease_idx] = penalty
        for i in range(num_classes):
            if i != target_disease_idx:
                likelihood[i] = boost

    posterior = likelihood * probs
    total = posterior.sum()
    if total > 0:
        posterior /= total
    return posterior


def compute_eig(
    current_probs: np.ndarray,
    question_weight: float,
    target_disease_idx: int,
    p_yes: float | None = None,
) -> float:
    """
    Compute the Expected Information Gain for a single candidate question.

    If `p_yes` is not provided, we use the current probability of the
    target disease as the probability the user will answer "yes".
    This is a reasonable prior: if the model thinks disease X is likely,
    questions about X-specific symptoms are more likely to be answered yes.

    Returns:
        EIG in nats (≥ 0). Higher = more informative question.
    """
    probs = np.clip(np.array(current_probs, dtype=np.float64), 1e-12, 1.0)
    probs = probs / probs.sum()

    if p_yes is None:
        p_yes = float(probs[target_disease_idx])
    p_no = 1.0 - p_yes

    h_current = _shannon_entropy(probs)

    posterior_yes = _simulate_posterior(
        probs, "yes", question_weight, target_disease_idx
    )
    posterior_no = _simulate_posterior(probs, "no", question_weight, target_disease_idx)

    h_yes = _shannon_entropy(posterior_yes)
    h_no = _shannon_entropy(posterior_no)

    eig = h_current - (p_yes * h_yes + p_no * h_no)
    return max(eig, 0.0)  # Clamp to non-negative


def _generate_question_reasoning(
    question_disease: str,
    top_disease: str,
    second_disease: str | None,
    is_top_disease_question: bool,
) -> str:
    """
    Generate a user-friendly explanation for why this question is being asked.

    This provides the "bedside manner" context that helps users understand
    the diagnostic process.
    """
    if is_top_disease_question:
        return f"Gathering more information about {top_disease}"
    elif second_disease and question_disease == second_disease:
        return f"Checking for similar conditions like {question_disease}"
    else:
        return f"Ruling out similar conditions like {question_disease}"


def select_best_question(
    current_probs: list | np.ndarray,
    available_questions: list[dict],
    disease_labels: dict[int, str],
) -> dict | None:
    """
    Select the question that maximises Expected Information Gain.

    Implements the "Doctor's Bedside Manner" hybrid strategy:
    - Questions for the top predicted disease receive a small EIG boost
    - This ensures early questions relate to the user's most likely condition
    - Cross-disease questions are still selected when they provide significantly
      more information (the boost is intentionally small)

    Args:
        current_probs:        Current probability distribution [num_diseases].
        available_questions:   List of candidate question dicts. Each must have
                               at least {"id", "question", "weight", "positive_symptom",
                               "negative_symptom", "category"} and an associated
                               disease name (via the question bank structure).
        disease_labels:        CORRECT_ID2LABEL mapping {idx: "Disease"}.

    Returns:
        The question dict with the highest EIG (boosted), or None if no candidates.
        Includes "_eig" (raw), "_eig_boosted", "_reasoning", and "_is_top_disease_q".
    """
    if not available_questions:
        return None

    probs = np.array(current_probs, dtype=np.float64).flatten()
    # Build reverse mapping from disease name to index
    label2idx: dict[str, int] = {}
    for idx, name in disease_labels.items():
        if name is not None:
            label2idx[name] = idx

    # Identify top disease and second disease for reasoning
    sorted_indices = np.argsort(probs)[::-1]  # Descending order
    top_disease_idx = sorted_indices[0]
    top_disease = disease_labels.get(int(top_disease_idx), "Unknown")
    second_disease = (
        disease_labels.get(int(sorted_indices[1]), None)
        if len(sorted_indices) > 1
        else None
    )

    best_question = None
    best_eig_boosted = -1.0
    best_eig_raw = -1.0

    for q in available_questions:
        disease_name: str | None = q.get("_disease")  # injected by caller
        if disease_name is None:
            continue
        target_idx = label2idx.get(disease_name)
        if target_idx is None:
            continue

        # Compute raw EIG
        eig_raw = compute_eig(probs, q.get("weight", 0.85), target_idx)

        # Apply boost if this question targets the top predicted disease
        is_top_disease_q = disease_name == top_disease
        eig_boosted = eig_raw * TOP_DISEASE_EIG_BOOST if is_top_disease_q else eig_raw

        if eig_boosted > best_eig_boosted:
            best_eig_boosted = eig_boosted
            best_eig_raw = eig_raw
            best_question = q
            best_question["_is_top_disease_q"] = is_top_disease_q

    if best_question:
        best_question["_eig"] = best_eig_raw
        best_question["_eig_boosted"] = best_eig_boosted
        best_question["_reasoning"] = _generate_question_reasoning(
            question_disease=best_question.get("_disease", "Unknown"),
            top_disease=top_disease,
            second_disease=second_disease,
            is_top_disease_question=best_question.get("_is_top_disease_q", False),
        )

    return best_question


def select_best_question_across_diseases(
    current_probs: list | np.ndarray,
    question_bank: dict[str, list[dict]],
    asked_question_ids: set[str],
    skip_question_ids: set[str],
    disease_labels: dict[int, str],
    symptoms_text: str = "",
    use_semantic_grouping: bool = True,
    answered_questions: dict[str, str] | None = None,
) -> dict | None:
    """
    Select the globally best question across ALL diseases using EIG.

    This is the primary entry-point for the Active Learning strategy.
    It iterates over every unanswered question in every disease and returns
    the single question whose EIG is highest.

    Enhanced with semantic grouping to avoid redundant questions:
    - Questions semantically equivalent to already-asked ones are skipped
    - Questions about symptoms already mentioned in text are skipped
    - Questions with unmet prerequisites are skipped (e.g., cough character
      questions are skipped until cough existence is confirmed)

    Args:
        current_probs:        Current probability distribution.
        question_bank:        Full question bank {disease: [questions]}.
        asked_question_ids:   Set of question IDs already asked.
        skip_question_ids:    Set of question IDs to skip (e.g., already-evidenced).
        disease_labels:       CORRECT_ID2LABEL mapping.
        symptoms_text:        Patient's symptom description text (for text-based skipping).
        use_semantic_grouping: Whether to use semantic grouping (default True).
        answered_questions:   Dict of {question_id: "yes"|"no"} for prerequisite checking.

    Returns:
        The best question dict (with "_disease" and "_eig" injected), or None.
    """
    # Expand the asked questions to include semantically equivalent ones
    if use_semantic_grouping:
        expanded_asked = expand_asked_questions(asked_question_ids)
        # Also skip questions about symptoms mentioned in the patient's text
        text_based_skips = get_questions_to_skip_from_text(symptoms_text)
        combined_skip = skip_question_ids | expanded_asked | text_based_skips
    else:
        combined_skip = skip_question_ids | asked_question_ids

    # Skip questions with unmet prerequisites (e.g., cough character before cough existence)
    # Note: Use "is not None" because empty dict {} should still trigger blocking
    # (no answers yet = prerequisites not satisfied)
    if answered_questions is not None:
        prerequisite_blocked = get_questions_blocked_by_prerequisites(
            answered_questions
        )
        combined_skip = combined_skip | prerequisite_blocked

    all_candidates = []

    for disease, questions in question_bank.items():
        for q in questions:
            qid = q.get("id", "")
            if qid in combined_skip:
                continue
            # Inject disease name so select_best_question knows the target
            candidate = {**q, "_disease": disease}
            all_candidates.append(candidate)

    return select_best_question(current_probs, all_candidates, disease_labels)
