"""
Expected Information Gain (EIG) – Active Learning for question selection.

Instead of a static question bank traversal ordered by weight, this module
computes the expected reduction in predictive entropy for each candidate
question and picks the one that maximises information gain across ALL diseases.

Theory:
    EIG(q) = H(current) - E_{a ∈ {yes,no}} [ H(current | answer=a, question=q) ]

    The question with the highest EIG is the one whose answer (yes or no) will,
    on average, reduce uncertainty the most.
"""

from __future__ import annotations

import numpy as np
from scipy.stats import entropy
from typing import TYPE_CHECKING

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

    posterior_yes = _simulate_posterior(probs, "yes", question_weight, target_disease_idx)
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
    label2idx = {v: k for k, v in disease_labels.items()}

    best_question = None
    best_eig = -1.0

    for q in available_questions:
        disease_name = q.get("_disease")  # injected by caller
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
) -> dict | None:
    """
    Select the globally best question across ALL diseases using EIG.

    This is the primary entry-point for the Active Learning strategy.
    It iterates over every unanswered question in every disease and returns
    the single question whose EIG is highest.

    Args:
        current_probs:        Current probability distribution.
        question_bank:        Full question bank {disease: [questions]}.
        asked_question_ids:   Set of question IDs already asked.
        skip_question_ids:    Set of question IDs to skip (e.g., already-evidenced).
        disease_labels:       CORRECT_ID2LABEL mapping.

    Returns:
        The best question dict (with "_disease" and "_eig" injected), or None.
    """
    all_candidates = []

    for disease, questions in question_bank.items():
        for q in questions:
            qid = q.get("id", "")
            if qid in asked_question_ids or qid in skip_question_ids:
                continue
            # Inject disease name so select_best_question knows the target
            candidate = {**q, "_disease": disease}
            all_candidates.append(candidate)

    return select_best_question(current_probs, all_candidates, disease_labels)
