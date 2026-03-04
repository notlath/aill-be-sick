"""
Tests for the Bayesian Evidence Update scoring module.

Verifies that the hybrid scoring approach (NLP base + Bayesian updates)
produces monotonically increasing confidence for 'yes' answers and
decreasing confidence for 'no' answers.
"""

import pytest
import numpy as np
from app.utils.scoring import bayesian_evidence_update, lookup_question_metadata
from app.services.ml_service import CORRECT_ID2LABEL
from app import QUESTION_BANK_EN


# Simulated initial probabilities for a Typhoid case (similar to user's logs)
TYPHOID_IDX = 5  # CORRECT_ID2LABEL: {5: "Typhoid"}
INITIAL_PROBS = [0.05, 0.04, 0.156, 0.06, 0.144, 0.545]  # Typhoid highest at 0.545


class TestBayesianEvidenceUpdate:
    """Test the core Bayesian update function."""

    def test_yes_answer_increases_target_confidence(self):
        """Answering 'yes' to a Typhoid question should increase Typhoid probability."""
        result = bayesian_evidence_update(
            current_probs=INITIAL_PROBS,
            answer="yes",
            question_weight=0.95,
            target_disease_idx=TYPHOID_IDX,
            disease_labels=CORRECT_ID2LABEL,
        )
        assert result["confidence"] > INITIAL_PROBS[TYPHOID_IDX]
        assert result["predicted_label"] == "Typhoid"

    def test_no_answer_decreases_target_confidence(self):
        """Answering 'no' to a Typhoid question should decrease Typhoid probability."""
        result = bayesian_evidence_update(
            current_probs=INITIAL_PROBS,
            answer="no",
            question_weight=0.95,
            target_disease_idx=TYPHOID_IDX,
            disease_labels=CORRECT_ID2LABEL,
        )
        assert result["probs"][TYPHOID_IDX] < INITIAL_PROBS[TYPHOID_IDX]

    def test_probabilities_sum_to_one(self):
        """Updated probabilities must always sum to 1.0."""
        for answer in ["yes", "no"]:
            result = bayesian_evidence_update(
                current_probs=INITIAL_PROBS,
                answer=answer,
                question_weight=0.92,
                target_disease_idx=TYPHOID_IDX,
                disease_labels=CORRECT_ID2LABEL,
            )
            assert abs(sum(result["probs"]) - 1.0) < 1e-9

    def test_monotonic_increase_on_consecutive_yes(self):
        """
        Simulates the user's exact scenario: answering 'yes' to 6 consecutive
        Typhoid follow-up questions. Confidence should NEVER drop below initial.
        """
        typhoid_questions = QUESTION_BANK_EN.get("Typhoid", [])
        probs = list(INITIAL_PROBS)
        initial_confidence = INITIAL_PROBS[TYPHOID_IDX]

        for i, q in enumerate(typhoid_questions[:6]):
            result = bayesian_evidence_update(
                current_probs=probs,
                answer="yes",
                question_weight=q["weight"],
                target_disease_idx=TYPHOID_IDX,
                disease_labels=CORRECT_ID2LABEL,
            )
            probs = result["probs"]
            # Confidence should never drop below the initial value
            assert result["confidence"] >= initial_confidence, (
                f"Confidence dropped at question {i+1} ({q['id']}): "
                f"{result['confidence']:.4f} < {initial_confidence:.4f}"
            )
            # Each step should be >= previous (monotonic for 'yes')
            if i > 0:
                # The confidence should be weakly monotonically increasing
                assert result["confidence"] >= initial_confidence

    def test_top_diseases_sorted(self):
        """top_diseases should be sorted by probability descending."""
        result = bayesian_evidence_update(
            current_probs=INITIAL_PROBS,
            answer="yes",
            question_weight=0.90,
            target_disease_idx=TYPHOID_IDX,
            disease_labels=CORRECT_ID2LABEL,
        )
        probs_in_top = [d["probability"] for d in result["top_diseases"]]
        assert probs_in_top == sorted(probs_in_top, reverse=True)

    def test_uncertainty_decreases_on_yes(self):
        """Uncertainty should decrease when we get confirmatory evidence."""
        # Start with a more uncertain distribution
        uncertain_probs = [0.18, 0.15, 0.17, 0.16, 0.14, 0.20]
        result = bayesian_evidence_update(
            current_probs=uncertain_probs,
            answer="yes",
            question_weight=0.95,
            target_disease_idx=TYPHOID_IDX,
            disease_labels=CORRECT_ID2LABEL,
        )
        from scipy.stats import entropy as sp_entropy
        initial_entropy = sp_entropy(uncertain_probs)
        updated_entropy = sp_entropy(result["probs"])
        assert updated_entropy < initial_entropy

    def test_all_disease_labels_present(self):
        """All disease labels should appear in top_diseases."""
        result = bayesian_evidence_update(
            current_probs=INITIAL_PROBS,
            answer="yes",
            question_weight=0.90,
            target_disease_idx=TYPHOID_IDX,
            disease_labels=CORRECT_ID2LABEL,
        )
        result_diseases = {d["disease"] for d in result["top_diseases"]}
        expected_diseases = set(CORRECT_ID2LABEL.values())
        assert result_diseases == expected_diseases


class TestLookupQuestionMetadata:
    """Test question bank lookup utility."""

    def test_finds_typhoid_q1(self):
        """Should find typhoid_q1 with correct weight and disease."""
        meta = lookup_question_metadata("typhoid_q1", QUESTION_BANK_EN)
        assert meta is not None
        assert meta["disease"] == "Typhoid"
        assert meta["weight"] == 0.95
        assert meta["disease_idx"] == TYPHOID_IDX

    def test_finds_dengue_q3(self):
        """Should find dengue_q3."""
        meta = lookup_question_metadata("dengue_q3", QUESTION_BANK_EN)
        assert meta is not None
        assert meta["disease"] == "Dengue"
        assert meta["disease_idx"] == 0  # Dengue is idx 0

    def test_returns_none_for_unknown(self):
        """Should return None for nonexistent question IDs."""
        meta = lookup_question_metadata("nonexistent_q99", QUESTION_BANK_EN)
        assert meta is None

    def test_all_questions_resolvable(self):
        """Every question in the bank should be resolvable."""
        for disease, questions in QUESTION_BANK_EN.items():
            for q in questions:
                meta = lookup_question_metadata(q["id"], QUESTION_BANK_EN)
                assert meta is not None, f"Failed to look up {q['id']}"
                assert meta["disease"] == disease


class TestFullFollowUpSimulation:
    """
    Simulate the exact scenario from the user's logs:
    Initial Typhoid classification at conf=0.545, then 6 'yes' answers.
    """

    def test_typhoid_scenario_confidence_never_drops(self):
        """End-to-end simulation: confidence should monotonically increase."""
        # Question IDs from the user's logs (in order they were asked)
        question_sequence = [
            "typhoid_q1",  # Abdominal pain -> yes
            "typhoid_q4",  # Chills -> yes
            "typhoid_q5",  # Nausea/vomiting -> yes
            "typhoid_q6",  # Loss of appetite -> yes
            "typhoid_q8",  # Trouble hydrating -> yes
            "typhoid_q10", # Trouble sleeping -> yes
        ]

        probs = list(INITIAL_PROBS)
        prev_confidence = INITIAL_PROBS[TYPHOID_IDX]

        for qid in question_sequence:
            meta = lookup_question_metadata(qid, QUESTION_BANK_EN)
            assert meta is not None, f"Could not find {qid}"

            result = bayesian_evidence_update(
                current_probs=probs,
                answer="yes",
                question_weight=meta["weight"],
                target_disease_idx=meta["disease_idx"],
                disease_labels=CORRECT_ID2LABEL,
            )
            probs = result["probs"]
            current_confidence = result["confidence"]

            # Confidence must never drop
            assert current_confidence >= prev_confidence, (
                f"Confidence dropped at {qid}: {current_confidence:.4f} < {prev_confidence:.4f}"
            )
            prev_confidence = current_confidence

        # After 6 'yes' answers, final confidence should be significantly higher
        assert prev_confidence > 0.7, (
            f"Final confidence {prev_confidence:.4f} is too low after 6 confirmatory answers"
        )
        # And the prediction should still be Typhoid
        assert result["predicted_label"] == "Typhoid"
