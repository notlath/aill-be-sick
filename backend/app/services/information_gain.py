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
"""

from __future__ import annotations

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


def select_best_question(
    current_probs: list | np.ndarray,
    available_questions: list[dict],
    disease_labels: dict[int, str],
) -> dict | None:
    """
    Select the question that maximises Expected Information Gain.

    Args:
        current_probs:        Current probability distribution [num_diseases].
        available_questions:   List of candidate question dicts. Each must have
                               at least {"id", "question", "weight", "positive_symptom",
                               "negative_symptom", "category"} and an associated
                               disease name (via the question bank structure).
        disease_labels:        CORRECT_ID2LABEL mapping {idx: "Disease"}.

    Returns:
        The question dict with the highest EIG, or None if no candidates.
    """
    if not available_questions:
        return None

    probs = np.array(current_probs, dtype=np.float64).flatten()
    # Build reverse mapping from disease name to index
    label2idx: dict[str, int] = {}
    for idx, name in disease_labels.items():
        if name is not None:
            label2idx[name] = idx

    best_question = None
    best_eig = -1.0

    for q in available_questions:
        disease_name: str | None = q.get("_disease")  # injected by caller
        if disease_name is None:
            continue
        target_idx = label2idx.get(disease_name)
        if target_idx is None:
            continue

        eig = compute_eig(probs, q.get("weight", 0.85), target_idx)
        if eig > best_eig:
            best_eig = eig
            best_question = q

    if best_question:
        best_question["_eig"] = best_eig

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
