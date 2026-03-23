from __future__ import annotations

"""
Expected Information Gain (EIG) – Active Learning for question selection.

This module implements the "Doctor's Bedside Manner" EIG system with six
key enhancements for optimal question selection:

1. Early Stopping Rule - Stop when EIG gain becomes negligible
2. Burden Penalty - Prefer easy-to-answer questions
3. Top-k Differential EIG - Focus on separating top disease contenders
4. Confidence-Aware Mode Switching - Adapt strategy to certainty level
5. Skip to Results Button - Allow users to end questioning early
6. Novelty Penalties - Discourage redundant symptom probing

Theory:
    EIG(q) = H(current) - E_{a ∈ {yes,no}} [ H(current | answer=a, question=q) ]

    The question with the highest adjusted EIG is the one whose answer (yes or no)
    will, on average, reduce uncertainty the most while respecting user burden
    and diagnosis mode constraints.
"""

from enum import Enum
import numpy as np
from scipy.stats import entropy
from typing import TYPE_CHECKING

from app.config import (
    # EIG Configuration
    MIN_EIG_THRESHOLD,
    EIG_DECAY_FACTOR,
    BURDEN_PENALTY_FACTOR,
    TOP_K_DISEASES,
    DIFFERENTIAL_EIG_WEIGHT,
    MODE_EXPLORATION_MAX_CONF,
    MODE_CONFIRMATION_MIN_CONF,
    MODE_RULE_OUT_SECOND_MIN,
    NOVELTY_PENALTY_WEIGHT,
)
from app.question_groups import (
    expand_asked_questions,
    get_questions_to_skip_from_text,
    get_questions_blocked_by_prerequisites,
    get_novelty_penalty,
)

if TYPE_CHECKING:
    pass


# ==================== DIAGNOSIS MODE ENUM ====================


class DiagnosisMode(Enum):
    """
    Operating modes for the EIG question selection based on confidence levels.

    EXPLORATION: Low confidence (<50%), explore widely across all diseases
    CONFIRMATION: High confidence (>=65%), confirm the top predicted disease
    RULE_OUT: Medium confidence with close second, differentiate top two diseases
    """

    EXPLORATION = "exploration"
    CONFIRMATION = "confirmation"
    RULE_OUT = "rule_out"


# ==================== MODE DETERMINATION ====================


def determine_diagnosis_mode(probs: np.ndarray) -> DiagnosisMode:
    """
    Determine the diagnosis mode based on current probability distribution.

    Args:
        probs: Current probability distribution over diseases

    Returns:
        DiagnosisMode indicating the strategy to use
    """
    sorted_probs = np.sort(probs)[::-1]  # Descending
    top_prob = sorted_probs[0]
    second_prob = sorted_probs[1] if len(sorted_probs) > 1 else 0.0

    # High confidence - confirm the top disease
    if top_prob >= MODE_CONFIRMATION_MIN_CONF:
        return DiagnosisMode.CONFIRMATION

    # Low confidence - explore widely
    if top_prob < MODE_EXPLORATION_MAX_CONF:
        return DiagnosisMode.EXPLORATION

    # Medium confidence with close second - rule out between top two
    if (
        top_prob >= MODE_EXPLORATION_MAX_CONF
        and second_prob >= MODE_RULE_OUT_SECOND_MIN
    ):
        return DiagnosisMode.RULE_OUT

    # Default to exploration if unclear
    return DiagnosisMode.EXPLORATION


# ==================== CORE EIG COMPUTATION ====================


def _shannon_entropy(probs: np.ndarray) -> float:
    """Compute Shannon entropy of a probability distribution (natural log)."""
    return float(entropy(np.clip(probs, 1e-12, 1.0)))


def _simulate_posterior(
    probs: np.ndarray,
    answer: str,
    question_weight: float,
    target_disease_idx: int,
    is_negative: bool = False,
) -> np.ndarray:
    """
    Simulate what the posterior distribution would look like if the user
    answered `answer` to a question targeting `target_disease_idx`.

    Uses the same likelihood model as the existing Bayesian update in
    scoring.py so that the actual update and the simulated update are
    consistent.

    Args:
        probs: Current probability distribution
        answer: "yes" or "no"
        question_weight: Weight of the question
        target_disease_idx: Index of target disease
        is_negative: If True, invert the effective answer (for questions where
                     "no" supports the target disease, like "do you have cough?"
                     for Dengue where no cough supports Dengue)
    """
    num_classes = len(probs)
    likelihood = np.ones(num_classes, dtype=np.float64)

    # For negative questions, invert the effective answer
    effective_answer = answer
    if is_negative:
        effective_answer = "no" if answer == "yes" else "yes"

    if effective_answer == "yes":
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
    is_negative: bool = False,
) -> float:
    """
    Compute the Expected Information Gain for a single candidate question.

    If `p_yes` is not provided, we use the current probability of the
    target disease as the probability the user will answer "yes".
    This is a reasonable prior: if the model thinks disease X is likely,
    questions about X-specific symptoms are more likely to be answered yes.

    For negative questions (is_negative=True), the p_yes logic is inverted:
    - High probability of target disease -> user likely answers "no"
      (e.g., Dengue likely -> user likely has no cough)

    Returns:
        EIG in nats (≥ 0). Higher = more informative question.
    """
    probs = np.clip(np.array(current_probs, dtype=np.float64), 1e-12, 1.0)
    probs = probs / probs.sum()

    if p_yes is None:
        # For standard questions: high disease prob -> likely yes
        # For negative questions: high disease prob -> likely no (invert)
        if is_negative:
            p_yes = 1.0 - float(probs[target_disease_idx])
        else:
            p_yes = float(probs[target_disease_idx])
    p_no = 1.0 - p_yes

    h_current = _shannon_entropy(probs)

    posterior_yes = _simulate_posterior(
        probs, "yes", question_weight, target_disease_idx, is_negative
    )
    posterior_no = _simulate_posterior(
        probs, "no", question_weight, target_disease_idx, is_negative
    )

    h_yes = _shannon_entropy(posterior_yes)
    h_no = _shannon_entropy(posterior_no)

    eig = h_current - (p_yes * h_yes + p_no * h_no)
    return max(eig, 0.0)  # Clamp to non-negative


# ==================== TOP-K DIFFERENTIAL EIG ====================


def compute_differential_eig(
    current_probs: np.ndarray,
    question_weight: float,
    target_disease_idx: int,
    top_k_indices: list[int],
    is_negative: bool = False,
) -> float:
    """
    Compute how well a question separates the top-k disease contenders.

    This measures the question's ability to differentiate between the most
    likely diseases, rather than reducing overall entropy.

    Args:
        current_probs: Current probability distribution
        question_weight: Weight of the question
        target_disease_idx: Which disease this question targets
        top_k_indices: Indices of the top-k most likely diseases
        is_negative: If True, the question has inverted semantics

    Returns:
        Differential EIG score (higher = better at separating top diseases)
    """
    probs = np.clip(np.array(current_probs, dtype=np.float64), 1e-12, 1.0)
    probs = probs / probs.sum()

    # Extract probabilities for top-k diseases only
    top_k_probs = np.array([probs[i] for i in top_k_indices])
    top_k_probs = top_k_probs / top_k_probs.sum()  # Renormalize

    # Find which index within top_k this question targets (if any)
    try:
        local_target_idx = top_k_indices.index(target_disease_idx)
    except ValueError:
        # Question doesn't target a top-k disease - low differential value
        return 0.0

    # Compute entropy reduction within the top-k subset
    h_current = _shannon_entropy(top_k_probs)

    # For negative questions, invert the p_yes logic
    if is_negative:
        p_yes = 1.0 - float(top_k_probs[local_target_idx])
    else:
        p_yes = float(top_k_probs[local_target_idx])
    p_no = 1.0 - p_yes

    # Simplified posterior simulation for top-k only
    posterior_yes = top_k_probs.copy()
    posterior_no = top_k_probs.copy()

    # Determine effective answers based on is_negative
    # Yes answer boosts target, penalizes others (or inverted for is_negative)
    boost = 1.0 + question_weight
    penalty = max(1.0 - question_weight * 0.35, 0.1)

    if is_negative:
        # "yes" to negative question -> penalize target
        posterior_yes[local_target_idx] *= penalty
        for i in range(len(top_k_indices)):
            if i != local_target_idx:
                posterior_yes[i] *= boost
    else:
        # "yes" to standard question -> boost target
        posterior_yes[local_target_idx] *= boost
        for i in range(len(top_k_indices)):
            if i != local_target_idx:
                posterior_yes[i] *= penalty
    posterior_yes = posterior_yes / posterior_yes.sum()

    # No answer penalizes target, slightly boosts others (or inverted)
    no_penalty = max(1.0 - question_weight * 0.35, 0.05)
    no_boost = 1.0 + question_weight * 0.1

    if is_negative:
        # "no" to negative question -> boost target
        posterior_no[local_target_idx] *= boost
        for i in range(len(top_k_indices)):
            if i != local_target_idx:
                posterior_no[i] *= penalty
    else:
        # "no" to standard question -> penalize target
        posterior_no[local_target_idx] *= no_penalty
        for i in range(len(top_k_indices)):
            if i != local_target_idx:
                posterior_no[i] *= no_boost
    posterior_no = posterior_no / posterior_no.sum()

    h_yes = _shannon_entropy(posterior_yes)
    h_no = _shannon_entropy(posterior_no)

    diff_eig = h_current - (p_yes * h_yes + p_no * h_no)
    return max(diff_eig, 0.0)


# ==================== BURDEN PENALTY ====================


def compute_burden_penalty(burden_score: int) -> float:
    """
    Compute penalty for question difficulty/burden.

    Lower burden scores (easier questions) get smaller penalties.
    Burden scores range from 1 (easy) to 5 (hard).

    Args:
        burden_score: Question burden level (1-5)

    Returns:
        Penalty to subtract from EIG score
    """
    # Normalize burden to 0-1 range (1->0, 5->1)
    normalized_burden = (burden_score - 1) / 4.0
    return normalized_burden * BURDEN_PENALTY_FACTOR


# ==================== EARLY STOPPING ====================


def should_stop_early(
    current_best_eig: float,
    initial_eig: float | None,
    question_count: int,
) -> bool:
    """
    Determine if questioning should stop due to diminishing returns.

    Early stopping triggers when:
    1. Best EIG is below MIN_EIG_THRESHOLD, OR
    2. Best EIG has decayed significantly from initial EIG

    Args:
        current_best_eig: The highest EIG among available questions
        initial_eig: The EIG of the first question asked (for comparison)
        question_count: Number of questions asked so far

    Returns:
        True if questioning should stop early
    """
    # Absolute threshold check
    if current_best_eig < MIN_EIG_THRESHOLD:
        return True

    # Decay check: if we have an initial reference and have asked at least 2 questions
    if initial_eig is not None and initial_eig > 0 and question_count >= 2:
        decay_threshold = initial_eig * EIG_DECAY_FACTOR
        if current_best_eig < decay_threshold:
            return True

    return False


# ==================== REASONING GENERATION ====================


def _generate_question_reasoning(
    question_disease: str,
    top_disease: str,
    second_disease: str | None,
    mode: DiagnosisMode,
    is_top_disease_question: bool,
) -> str:
    """
    Generate a user-friendly explanation for why this question is being asked.

    Provides context based on the current diagnosis mode and question target.
    """
    if mode == DiagnosisMode.CONFIRMATION:
        if is_top_disease_question:
            return f"Confirming symptoms consistent with {top_disease}"
        else:
            return f"Verifying against similar conditions"

    elif mode == DiagnosisMode.RULE_OUT:
        if is_top_disease_question:
            return f"Distinguishing {top_disease} from {second_disease or 'other conditions'}"
        elif second_disease and question_disease == second_disease:
            return f"Checking for {second_disease} symptoms"
        else:
            return f"Differentiating between possible conditions"

    else:  # EXPLORATION
        if is_top_disease_question:
            return f"Gathering information about {top_disease}"
        else:
            return f"Exploring symptoms for {question_disease}"


# ==================== MODE-SPECIFIC SCORING ====================


def compute_mode_adjusted_score(
    eig_raw: float,
    diff_eig: float,
    is_top_disease_question: bool,
    is_top_k_disease_question: bool,
    mode: DiagnosisMode,
) -> float:
    """
    Compute the final score for a question based on diagnosis mode.

    Different modes weight raw EIG vs differential EIG differently:
    - EXPLORATION: Favor raw EIG (broad information gathering)
    - CONFIRMATION: Strong boost for top disease questions
    - RULE_OUT: Favor differential EIG (separating top diseases)

    Args:
        eig_raw: Raw expected information gain
        diff_eig: Differential EIG for top-k separation
        is_top_disease_question: True if question targets #1 disease
        is_top_k_disease_question: True if question targets top-k diseases
        mode: Current diagnosis mode

    Returns:
        Adjusted score combining EIG components based on mode
    """
    if mode == DiagnosisMode.CONFIRMATION:
        # Strong preference for top disease questions
        base_score = eig_raw
        if is_top_disease_question:
            base_score *= 1.5  # 50% boost for confirmation
        # Blend in differential for close races
        return base_score * (1 - DIFFERENTIAL_EIG_WEIGHT * 0.3) + diff_eig * (
            DIFFERENTIAL_EIG_WEIGHT * 0.3
        )

    elif mode == DiagnosisMode.RULE_OUT:
        # Strong emphasis on differential EIG
        base_score = (
            eig_raw * (1 - DIFFERENTIAL_EIG_WEIGHT) + diff_eig * DIFFERENTIAL_EIG_WEIGHT
        )
        # Slight boost for top-k questions
        if is_top_k_disease_question:
            base_score *= 1.1
        return base_score

    else:  # EXPLORATION
        # Balanced approach with slight preference for high EIG
        base_score = eig_raw * (1 - DIFFERENTIAL_EIG_WEIGHT * 0.5) + diff_eig * (
            DIFFERENTIAL_EIG_WEIGHT * 0.5
        )
        # Small boost for top disease to maintain some focus
        if is_top_disease_question:
            base_score *= 1.2
        return base_score


# ==================== MAIN SELECTION FUNCTIONS ====================


def select_best_question(
    current_probs: list | np.ndarray,
    available_questions: list[dict],
    disease_labels: dict[int, str],
    asked_question_ids: list[str] | None = None,
) -> dict | None:
    """
    Select the question that maximizes adjusted Expected Information Gain.

    Implements the full "Doctor's Bedside Manner" strategy with:
    - Mode-aware scoring (exploration/confirmation/rule-out)
    - Top-k differential EIG for disease separation
    - Burden penalties for question difficulty
    - Novelty penalties for redundant questions

    Args:
        current_probs: Current probability distribution [num_diseases].
        available_questions: List of candidate question dicts with disease info.
        disease_labels: CORRECT_ID2LABEL mapping {idx: "Disease"}.
        asked_question_ids: List of already-asked question IDs for novelty penalty.

    Returns:
        The question dict with highest adjusted score, or None if no candidates.
    """
    if not available_questions:
        return None

    probs = np.array(current_probs, dtype=np.float64).flatten()
    probs = probs / probs.sum()

    # Build reverse mapping from disease name to index
    label2idx: dict[str, int] = {}
    for idx, name in disease_labels.items():
        if name is not None:
            label2idx[name] = idx

    # Identify top diseases for mode determination and differential EIG
    sorted_indices = list(np.argsort(probs)[::-1])  # Descending order
    top_k_indices = sorted_indices[: min(TOP_K_DISEASES, len(sorted_indices))]

    top_disease_idx = sorted_indices[0]
    top_disease = disease_labels.get(int(top_disease_idx), "Unknown")
    second_disease = (
        disease_labels.get(int(sorted_indices[1]), None)
        if len(sorted_indices) > 1
        else None
    )

    # Determine operating mode
    mode = determine_diagnosis_mode(probs)

    # Convert asked_question_ids to list for novelty calculation
    asked_list = list(asked_question_ids) if asked_question_ids else []

    best_question = None
    best_adjusted_score = -1.0

    for q in available_questions:
        disease_name: str | None = q.get("_disease")
        if disease_name is None:
            continue
        target_idx = label2idx.get(disease_name)
        if target_idx is None:
            continue

        question_id = q.get("id", "")
        weight = q.get("weight", 0.85)
        burden = q.get("burden", 3)  # Default to average burden if not specified
        is_negative = q.get("is_negative", False)  # Handle negative questions

        # Compute raw EIG (with is_negative handling)
        eig_raw = compute_eig(probs, weight, target_idx, is_negative=is_negative)

        # Compute differential EIG for top-k separation (with is_negative handling)
        diff_eig = compute_differential_eig(
            probs, weight, target_idx, top_k_indices, is_negative=is_negative
        )

        # Determine question classification
        is_top_disease_q = disease_name == top_disease
        is_top_k_disease_q = target_idx in top_k_indices

        # Compute mode-adjusted base score
        base_score = compute_mode_adjusted_score(
            eig_raw, diff_eig, is_top_disease_q, is_top_k_disease_q, mode
        )

        # Apply burden penalty
        burden_penalty = compute_burden_penalty(burden)
        score_after_burden = base_score - burden_penalty

        # Apply novelty penalty
        novelty_penalty = get_novelty_penalty(
            question_id, asked_list, NOVELTY_PENALTY_WEIGHT
        )
        adjusted_score = score_after_burden - novelty_penalty

        if adjusted_score > best_adjusted_score:
            best_adjusted_score = adjusted_score
            best_question = q.copy()
            best_question["_eig"] = eig_raw
            best_question["_diff_eig"] = diff_eig
            best_question["_adjusted_score"] = adjusted_score
            best_question["_burden_penalty"] = burden_penalty
            best_question["_novelty_penalty"] = novelty_penalty
            best_question["_is_top_disease_q"] = is_top_disease_q
            best_question["_is_top_k_disease_q"] = is_top_k_disease_q
            best_question["_mode"] = mode.value

    if best_question:
        best_question["_reasoning"] = _generate_question_reasoning(
            question_disease=best_question.get("_disease", "Unknown"),
            top_disease=top_disease,
            second_disease=second_disease,
            mode=mode,
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
    initial_eig: float | None = None,
) -> tuple[dict | None, bool, float | None]:
    """
    Select the globally best question across ALL diseases using EIG.

    This is the primary entry-point for the Active Learning strategy.
    Returns both the best question and early stopping information.

    Args:
        current_probs: Current probability distribution.
        question_bank: Full question bank {disease: [questions]}.
        asked_question_ids: Set of question IDs already asked.
        skip_question_ids: Set of question IDs to skip.
        disease_labels: CORRECT_ID2LABEL mapping.
        symptoms_text: Patient's symptom description text.
        use_semantic_grouping: Whether to use semantic grouping.
        answered_questions: Dict of {question_id: "yes"|"no"}.
        initial_eig: EIG of the first question (for early stopping comparison).

    Returns:
        Tuple of:
        - Best question dict (or None)
        - Boolean indicating if early stopping should trigger
        - The EIG of the best question (for initial_eig tracking)
    """
    # Expand the asked questions to include semantically equivalent ones
    if use_semantic_grouping:
        expanded_asked = expand_asked_questions(asked_question_ids)
        text_based_skips = get_questions_to_skip_from_text(symptoms_text)
        combined_skip = skip_question_ids | expanded_asked | text_based_skips
    else:
        combined_skip = skip_question_ids | asked_question_ids

    # Skip questions with unmet prerequisites
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
            candidate = {**q, "_disease": disease}
            all_candidates.append(candidate)

    # Select best question with full scoring
    best_question = select_best_question(
        current_probs,
        all_candidates,
        disease_labels,
        asked_question_ids=list(asked_question_ids),
    )

    # Check for early stopping
    if best_question is None:
        return None, False, None

    best_eig = best_question.get("_eig", 0.0)
    question_count = len(asked_question_ids)

    should_stop = should_stop_early(best_eig, initial_eig, question_count)

    return best_question, should_stop, best_eig


# ==================== LEGACY COMPATIBILITY ====================
# Keep the old constant for any external code that might reference it
TOP_DISEASE_EIG_BOOST = 1.2
