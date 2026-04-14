"""
Diagnosis blueprint: /diagnosis/new, /diagnosis/follow-up, /diagnosis/explain

Redesigned with:
  1. Session-Backed Database – all follow-up state persisted in diagnosis_sessions table
  2. Expected Information Gain – active learning picks the most informative question
  3. Unified Inference – structured evidence text re-fed into the NLP model
  4. First-Class Neuro-Symbolic Verification – inline clamping of impossible diseases
"""

import time
import traceback
import numpy as np
from typing import Any, cast
from flask import Blueprint, request, jsonify, session, current_app

import app.config as config
from app.services.ml_service import classifier, explainer, CORRECT_ID2LABEL
from app.services.verification import pre_screen_unrelated
from app.utils import _count_words, _build_cdss_payload, detect_language_heuristic
from app.utils.scoring import bayesian_evidence_update, lookup_question_metadata
from app.evidence_keywords import EVIDENCE_KEYWORDS
from app.models.diagnosis_session import create_session, get_session, update_session
from app.services.information_gain import select_best_question_across_diseases
from app.question_groups import (
    expand_asked_questions,
    get_questions_to_skip_from_text,
    get_questions_blocked_by_prerequisites,
)
from app.utils.scoring import apply_text_evidence_boosts

diagnosis_bp = Blueprint("diagnosis", __name__)

# Build reverse map once at module level
LABEL2IDX = {v: k for k, v in CORRECT_ID2LABEL.items()}


# ── Helpers ───────────────────────────────────────────────────────────────────


def _format_condition_name(condition):
    """Convert model label to readable lowercase condition name."""
    if not condition:
        return "the suggested condition"
    return str(condition).strip().lower()


def _build_conflicting_match_message(predicted_disease, lang="en"):
    """Message for partial match with verification conflict."""
    condition = _format_condition_name(predicted_disease)
    if lang == "tl":
        return (
            f"Kahit may ilang sintomas ka na kapareho ng {condition}, may nabanggit kang ibang palatandaan "
            "na posibleng ibang kondisyon. Para sa iyong kaligtasan at upang makasiguro, mangyaring kumonsulta "
            "sa isang doktor para masuri ang mga sintomas na ito nang maayos."
        )
    return (
        f"While some of your symptoms share similarities with {condition}, you mentioned other specific signs "
        "that point to something else. For your safety and to get an accurate assessment, please consult a "
        "healthcare professional. They can properly evaluate these unique symptoms."
    )


def _build_no_clear_match_message():
    """Message for out-of-scope cases without a trustworthy match."""
    return (
        "Your symptoms do not clearly match the diseases this system currently covers. "
        "Please consult a healthcare professional for a proper evaluation."
    )


def _stop_response(
    reason,
    pred,
    confidence,
    uncertainty,
    probs,
    model_used,
    top_diseases,
    mean_probs,
    symptoms_text,
    message=None,
    is_valid=True,
    extra_fields=None,
    question_answers=None,
):
    """Build a standard 'should_stop' response dict."""
    data = {
        "should_stop": True,
        "reason": reason,
        "diagnosis": {
            "pred": pred,
            "disease": pred,
            "confidence": confidence,
            "uncertainty": uncertainty,
            "probs": probs,
            "model_used": model_used,
            "top_diseases": top_diseases,
            "mean_probs": mean_probs,
            "is_valid": is_valid,
            "cdss": _build_cdss_payload(
                symptoms_text,
                pred,
                confidence,
                uncertainty,
                top_diseases,
                model_used,
                is_valid=is_valid,
                question_answers=question_answers,
            ),
        },
    }
    if message:
        data["message"] = message
        data["diagnosis"]["message"] = message
    if extra_fields:
        data["diagnosis"].update(extra_fields)
    return jsonify({"data": data}), 200


def _normalize_mean_probs(mean_probs):
    """Flatten nested probability lists to a simple float list."""
    flat = []
    for item in mean_probs or []:
        if isinstance(item, (list, tuple)):
            for sub in item:
                flat.append(float(sub))
        else:
            flat.append(float(item))
    return flat


def _serialize_top_diseases(top_diseases):
    """Ensure top_diseases is a list of serializable dicts."""
    return [
        {
            "disease": d.get("disease"),
            "probability": float(d.get("probability", 0.0)),
        }
        for d in (top_diseases or [])
        if isinstance(d, dict)
    ]


def _build_evidence_text(initial_symptoms: str, evidence_texts: list[str]) -> str:
    """
    Build the unified inference text by combining the initial symptom
    description with structured evidence sentences from follow-up answers.
    """
    parts = [initial_symptoms]
    parts.extend(evidence_texts)
    return ". ".join(parts)


def _clamp_impossible_diseases(
    current_probs: np.ndarray,
    symptoms_text: str,
    verification_layer,
    disease_labels: dict,
) -> np.ndarray:
    """
    Neuro-Symbolic Verification: for each disease, check if the symptoms
    are consistent with that disease. If verification fails, clamp that
    disease's probability to near-zero.

    This prevents the system from wasting follow-up questions on diseases
    the user cannot plausibly have.
    """
    probs = current_probs.copy()
    clamped_any = False

    for idx, label in disease_labels.items():
        if probs[idx] < 0.01:
            continue  # Already near-zero, skip verification overhead
        result = verification_layer.verify(symptoms_text, label)
        if not result["is_valid"]:
            print(
                f"[CLAMP] Clamping {label} to 0 (unexplained: {result['unexplained_concepts']})"
            )
            probs[idx] = 1e-10
            clamped_any = True

    if clamped_any:
        total = probs.sum()
        if total > 0:
            probs = probs / total

    return probs


def _has_evidence(q, symptoms_lower: str) -> bool:
    """Check if the question's symptoms are already mentioned in the input."""
    qid = q.get("id", "")
    keywords = EVIDENCE_KEYWORDS.get(qid, [])
    if not keywords:
        return False
    return any(kw in symptoms_lower for kw in keywords)


# ── /diagnosis/new ────────────────────────────────────────────────────────────


@diagnosis_bp.route("/diagnosis/new", methods=["POST"])
def new_case():
    """
    Start a new diagnosis case. Accepts a symptom description.
    Creates a DB-backed DiagnosisSession for stateful follow-ups.
    """
    session.clear()  # Clear any legacy Flask cookie session
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        symptoms = data.get("symptoms", "").strip()
        chat_id = data.get("chat_id", "")

        print(f"\n[NEW CASE] Symptoms: {symptoms}")

        if not symptoms:
            return jsonify({"error": "Symptoms cannot be empty"}), 400

        # Quick pre-filter for obviously non-symptom inputs
        if (
            _count_words(symptoms) < config.SYMPTOM_MIN_WORDS
            and len(symptoms) < config.SYMPTOM_MIN_CHARS
        ):
            return (
                jsonify(
                    {
                        "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                        "message": "Please describe your symptoms in a short sentence (e.g., 'I have had fever and cough for two days').",
                        "details": {
                            "min_words": config.SYMPTOM_MIN_WORDS,
                            "min_chars": config.SYMPTOM_MIN_CHARS,
                        },
                    }
                ),
                422,
            )

        # ── TIER 3 PRE-SCREENING: Check for unrelated medical categories ──
        # Must occur BEFORE ML classification to avoid wasting inference on
        # symptoms outside our infectious disease scope.
        lang_for_prescreening = detect_language_heuristic(symptoms)
        unrelated_result = pre_screen_unrelated(symptoms, lang=lang_for_prescreening)

        if unrelated_result["is_unrelated"]:
            print(
                f"[NEW CASE] TIER 3 REFERRAL: Category={unrelated_result['category']}, "
                f"Concepts={unrelated_result['detected_concepts']}"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "skip_followup": True,
                            "skip_reason": "UNRELATED_CATEGORY",
                            "out_of_scope_type": "UNRELATED_MEDICAL_CATEGORY",
                            "category": unrelated_result["category"],
                            "message": unrelated_result["referral_message"],
                            "detected_concepts": unrelated_result["detected_concepts"],
                            "is_valid": False,
                        }
                    }
                ),
                200,
            )

        pred, confidence, uncertainty, probs, model_used, top_diseases, mean_probs = (
            classifier(symptoms)
        )

        # NEURO-SYMBOLIC VERIFICATION: Check for ontology mismatch
        verification_layer = current_app.config["VERIFICATION_LAYER"]
        verification_result = verification_layer.verify(symptoms, pred)
        if not verification_result["is_valid"]:
            unexplained = verification_result["unexplained_concepts"]
            conflicting_match_message = _build_conflicting_match_message(
                pred, lang=lang_for_prescreening
            )
            print(
                f"[VERIFICATION] FAIL: Unexplained concepts {unexplained} for predicted disease {pred}"
            )
            cdss = _build_cdss_payload(
                symptoms,
                pred,
                confidence,
                uncertainty,
                top_diseases,
                model_used,
                question_answers=locals().get("question_answers"),
            )
            cdss["red_flags"] = cdss.get("red_flags", []) + [
                f"Some symptoms you described are not typical of {pred}. Please consult a healthcare professional."
            ]
            return (
                jsonify(
                    {
                        "data": {
                            "pred": pred,
                            "confidence": confidence,
                            "uncertainty": uncertainty,
                            "probs": probs,
                            "model_used": model_used,
                            "disease": pred,
                            "top_diseases": top_diseases,
                            "mean_probs": mean_probs,
                            "cdss": cdss,
                            "skip_followup": True,
                            "skip_reason": "OUT_OF_SCOPE",
                            "out_of_scope_type": "CONFLICTING_MATCH",
                            "message": conflicting_match_message,
                            "is_valid": False,
                            "verification_failure": {
                                "unexplained_concepts": list(unexplained),
                                "message": conflicting_match_message,
                            },
                        }
                    }
                ),
                200,
            )

        # ── Create DB-backed session ──────────────────────────────────────
        lang_detected = (
            "tl"
            if "Tagalog" in str(model_used) or "TAGALOG" in str(model_used).upper()
            else "en"
        )
        mean_probs_list = _normalize_mean_probs(mean_probs)
        top_diseases_serialized = _serialize_top_diseases(top_diseases)

        session_id = create_session(
            chat_id=chat_id,
            initial_symptoms=symptoms,
            base_probs=mean_probs_list,
            current_probs=mean_probs_list,
            disease=pred,
            confidence=float(confidence),
            uncertainty=float(uncertainty),
            top_diseases=top_diseases_serialized,
            model_used=str(model_used)
            if model_used is not None
            else "BioClinical ModernBERT",
            lang=lang_detected,
        )
        print(f"[NEW CASE] Created DB session: {session_id}")

        # Also set legacy Flask session for backward compat
        session["diagnosis"] = {
            "disease": pred,
            "confidence": float(confidence),
            "uncertainty": float(uncertainty),
            "top_diseases": top_diseases_serialized,
            "mean_probs": mean_probs_list,
            "base_probs": mean_probs_list,
            "current_probs": mean_probs_list,
            "symptoms_text": symptoms,
            "lang": lang_detected,
            "model_used": str(model_used)
            if model_used is not None
            else "BioClinical ModernBERT",
            "start_time": time.time(),
        }

        # EARLY STOP: Very high confidence -> skip follow-ups
        if (
            confidence >= config.HIGH_CONFIDENCE_THRESHOLD
            and uncertainty <= config.LOW_UNCERTAINTY_THRESHOLD
        ):
            print(
                f"[NEW CASE] STOP: Very high confidence (conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            cdss = _build_cdss_payload(
                symptoms,
                pred,
                confidence,
                uncertainty,
                top_diseases,
                model_used,
                question_answers=locals().get("question_answers"),
            )
            return (
                jsonify(
                    {
                        "data": {
                            "pred": pred,
                            "confidence": confidence,
                            "uncertainty": uncertainty,
                            "probs": probs,
                            "model_used": model_used,
                            "disease": pred,
                            "top_diseases": top_diseases,
                            "mean_probs": mean_probs,
                            "cdss": cdss,
                            "skip_followup": True,
                            "skip_reason": "HIGH_CONFIDENCE_INITIAL",
                            "session_id": session_id,
                        }
                    }
                ),
                201,
            )

        # Gate low-confidence / high-uncertainty predictions
        if confidence < config.SYMPTOM_MIN_CONF or uncertainty > config.SYMPTOM_MAX_MI:
            if (
                confidence >= config.SYMPTOM_SOFT_MIN_CONF
                and uncertainty <= config.SYMPTOM_SOFT_MAX_MI
            ):
                cdss = _build_cdss_payload(
                    symptoms,
                    pred,
                    confidence,
                    uncertainty,
                    top_diseases,
                    model_used,
                )
                return (
                    jsonify(
                        {
                            "data": {
                                "pred": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "disease": pred,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "cdss": cdss,
                                "session_id": session_id,
                                "advisory": {
                                    "low_confidence": True,
                                    "message": "We couldn't confidently match your symptoms yet. We'll ask a few targeted questions to narrow it down.",
                                },
                            }
                        }
                    ),
                    201,
                )

            # Detailed symptom narratives should continue
            detailed_enough = _count_words(symptoms) >= 12 or len(symptoms) >= 120
            if detailed_enough:
                cdss = _build_cdss_payload(
                    symptoms,
                    pred,
                    confidence,
                    uncertainty,
                    top_diseases,
                    model_used,
                )
                return (
                    jsonify(
                        {
                            "data": {
                                "pred": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "disease": pred,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "cdss": cdss,
                                "session_id": session_id,
                                "advisory": {
                                    "low_confidence": True,
                                    "message": "Your symptoms are detailed enough to continue. We'll ask a few targeted questions to narrow it down.",
                                },
                            }
                        }
                    ),
                    201,
                )

            # Hard rejection
            return (
                jsonify(
                    {
                        "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                        "message": "We couldn't confidently match your symptoms to a condition yet. Please add more details like duration, severity, and other symptoms.",
                        "details": {
                            "confidence": confidence,
                            "mutual_information": uncertainty,
                            "min_conf": config.SYMPTOM_MIN_CONF,
                            "max_mi": config.SYMPTOM_MAX_MI,
                        },
                    }
                ),
                422,
            )

        cdss = _build_cdss_payload(
            symptoms,
            pred,
            confidence,
            uncertainty,
            top_diseases,
            model_used,
        )
        return (
            jsonify(
                {
                    "data": {
                        "pred": pred,
                        "confidence": confidence,
                        "uncertainty": uncertainty,
                        "probs": probs,
                        "model_used": model_used,
                        "disease": pred,
                        "top_diseases": top_diseases,
                        "mean_probs": mean_probs,
                        "cdss": cdss,
                        "session_valid": True,
                        "session_id": session_id,
                    }
                }
            ),
            201,
        )

    except Exception as e:
        error_msg = str(e)
        print(f"Exception caught in new_case: {error_msg}")

        if "INSUFFICIENT_SYMPTOM_EVIDENCE:" in error_msg:
            reason = error_msg.split("INSUFFICIENT_SYMPTOM_EVIDENCE:")[1].strip()
            return (
                jsonify(
                    {
                        "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                        "message": "Please describe your symptoms in a short sentence (e.g., 'I have had fever and cough for two days').",
                        "details": {"reason": reason},
                    }
                ),
                422,
            )

        if "UNSUPPORTED_LANGUAGE:" in error_msg:
            lang = error_msg.split("UNSUPPORTED_LANGUAGE:")[1].strip()
            return (
                jsonify(
                    {
                        "error": "UNSUPPORTED_LANGUAGE",
                        "message": f"Sorry, the detected language '{lang}' is not supported. Please use English or Tagalog/Filipino.",
                        "detected_language": lang,
                    }
                ),
                400,
            )

        error_details = traceback.format_exc()
        print(f"ERROR in new_case:")
        print(error_details)
        payload = {
            "error": "INTERNAL_ERROR",
            "message": error_msg,
        }
        if current_app.debug:
            payload["details"] = error_details
        return jsonify(payload), 500


# ── /diagnosis/follow-up ─────────────────────────────────────────────────────


@diagnosis_bp.route("/diagnosis/follow-up", methods=["POST"])
def follow_up_question():
    """
    Redesigned follow-up endpoint:
      1. Loads state from DB session (falls back to legacy cookie/request body)
      2. Applies Bayesian evidence update from the last answer
      3. Clamps impossible diseases via Neuro-Symbolic verification
      4. Optionally re-runs unified inference with accumulated evidence text
      5. Selects next question via Expected Information Gain (EIG)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # ── 1. LOAD SESSION STATE ─────────────────────────────────────────
        session_id = data.get("session_id")
        sess: dict[str, Any] = {}

        if session_id:
            loaded_session = get_session(session_id)
            if loaded_session is not None:
                sess = cast(dict[str, Any], loaded_session)
                print(f"[FOLLOW-UP] Using DB session: {session_id}")

        # Fallback: legacy Flask cookie session or request body
        if not sess:
            legacy_session = session.get("diagnosis")
            legacy_chat_id = data.get("chat_id")
            if legacy_session and (
                not legacy_chat_id or legacy_session.get("chat_id") == legacy_chat_id
            ):
                sess = {
                    "initial_symptoms": legacy_session.get("symptoms_text", ""),
                    "base_probs": legacy_session.get(
                        "base_probs", legacy_session.get("mean_probs", [])
                    ),
                    "current_probs": legacy_session.get(
                        "current_probs", legacy_session.get("mean_probs", [])
                    ),
                    "disease": legacy_session.get("disease", ""),
                    "confidence": legacy_session.get("confidence", 0),
                    "uncertainty": legacy_session.get("uncertainty", 1),
                    "top_diseases": legacy_session.get("top_diseases", []),
                    "model_used": legacy_session.get(
                        "model_used", "BioClinical ModernBERT"
                    ),
                    "lang": legacy_session.get("lang", "en"),
                    "asked_questions": [],
                    "evidence_texts": [],
                    "created_at": legacy_session.get("start_time", time.time()),
                }
                print("[FOLLOW-UP] Using legacy Flask cookie session (fallback)")
            elif legacy_session and legacy_chat_id:
                print(
                    "[FOLLOW-UP] Ignoring legacy cookie session due to chat_id mismatch "
                    f"(cookie={legacy_session.get('chat_id')} request={legacy_chat_id})"
                )
            elif data.get("disease"):
                # Final fallback: construct from request payload
                sess = {
                    "initial_symptoms": data.get("symptoms", ""),
                    "base_probs": data.get("current_probs", data.get("mean_probs", [])),
                    "current_probs": data.get(
                        "current_probs", data.get("mean_probs", [])
                    ),
                    "disease": data.get("disease", ""),
                    "confidence": data.get("confidence", 0),
                    "uncertainty": data.get("uncertainty", 1),
                    "top_diseases": data.get("top_diseases", []),
                    "model_used": "(request fallback)",
                    "lang": "en",
                    "asked_questions": data.get("asked_questions", []),
                    "evidence_texts": [],
                    "created_at": time.time(),
                }
                print("[FOLLOW-UP] Using request-body fallback (no session found)")
            else:
                return (
                    jsonify(
                        {
                            "error": "SESSION_EXPIRED",
                            "message": "Your session has expired. Please start a new diagnosis.",
                            "code": "SESSION_EXPIRED",
                        }
                    ),
                    440,
                )

        # Check session age
        if time.time() - sess.get("created_at", 0) > 3600:
            if session_id:
                # Could delete the DB row here
                pass
            session.clear()
            return (
                jsonify(
                    {
                        "error": "SESSION_EXPIRED",
                        "message": "Your session has timed out. Please start over.",
                    }
                ),
                440,
            )

        # Extract state from session
        initial_symptoms = sess.get("initial_symptoms", "")
        current_probs = np.array(
            sess.get("current_probs", []), dtype=np.float64
        ).flatten()
        evidence_texts = list(sess.get("evidence_texts", []))
        asked_questions_from_session = set(sess.get("asked_questions", []))
        # Track question answers for prerequisite checking
        question_answers: dict[str, str] = dict(sess.get("question_answers", {}))

        # Merge client-provided asked_questions with session (union)
        client_asked = set(data.get("asked_questions", []))
        asked_questions = asked_questions_from_session | client_asked

        # Request fields
        force_question = data.get("force", False)
        force_complete = data.get(
            "force_complete", False
        )  # User wants to skip to results
        last_answer = data.get("last_answer")
        last_question_id = data.get("last_question_id")
        last_question_text = data.get("last_question_text")

        # Use symptoms from request or session
        symptoms_text = data.get("symptoms", "").strip() or initial_symptoms

        # ── 2. BAYESIAN EVIDENCE UPDATE ───────────────────────────────────
        QUESTION_BANK_EN = current_app.config["QUESTION_BANK_EN"]
        QUESTION_BANK_TL = current_app.config["QUESTION_BANK_TL"]

        pred = str(sess.get("disease", "") or "")
        confidence = float(sess.get("confidence", 0))
        uncertainty = float(sess.get("uncertainty", 1))
        top_diseases = sess.get("top_diseases", [])
        model_used = sess.get("model_used", "BioClinical ModernBERT")

        # ── TEXT EVIDENCE BOOSTS (first follow-up only) ───────────────────
        # CRITICAL FIX: Apply Bayesian boosts for symptoms detected in the
        # initial text BEFORE any follow-up questions are asked.
        # This ensures textbook descriptions (e.g., "high fever, muscle pain,
        # bleeding gums" for Dengue) get proper probability boosts.
        session_lang = sess.get("lang", "en")
        qb_for_boost = (
            QUESTION_BANK_TL if session_lang in ["tl", "fil"] else QUESTION_BANK_EN
        )

        if not asked_questions and initial_symptoms:
            boost_result = apply_text_evidence_boosts(
                current_probs=current_probs,
                symptoms_text=initial_symptoms,
                question_bank=qb_for_boost,
                disease_labels=CORRECT_ID2LABEL,
                evidence_keywords=EVIDENCE_KEYWORDS,
            )

            if boost_result["boost_count"] > 0:
                current_probs = np.array(boost_result["probs"])
                pred = str(boost_result["predicted_label"])
                confidence = boost_result["confidence"]
                uncertainty = boost_result["uncertainty"]
                top_diseases = boost_result["top_diseases"]

                print(
                    f"[FOLLOW-UP] Applied text evidence boosts for {boost_result['boost_count']} symptoms: "
                    f"{boost_result['boosted_questions']}"
                )
                print(
                    f"[FOLLOW-UP] Post-boost: {pred} conf={confidence:.3f} MI={uncertainty:.4f}"
                )

        if last_answer and last_question_id:
            # Track the answer for prerequisite checking
            question_answers[last_question_id] = str(last_answer).lower()

            session_lang = sess.get("lang", "en")
            qb = QUESTION_BANK_TL if session_lang in ["tl", "fil"] else QUESTION_BANK_EN
            q_meta = lookup_question_metadata(last_question_id, qb)

            if q_meta:
                update_result = bayesian_evidence_update(
                    current_probs=current_probs,
                    answer=str(last_answer).lower(),
                    question_weight=q_meta["weight"],
                    target_disease_idx=q_meta["disease_idx"],
                    disease_labels=CORRECT_ID2LABEL,
                    is_negative=q_meta.get("is_negative", False),
                )

                current_probs = np.array(update_result["probs"])
                pred = str(update_result["predicted_label"])
                confidence = update_result["confidence"]
                uncertainty = update_result["uncertainty"]
                top_diseases = update_result["top_diseases"]

                print(
                    f"[FOLLOW-UP] Bayesian update: {q_meta['disease']} "
                    f"q={last_question_id} ans={last_answer} -> "
                    f"conf={confidence:.3f}, MI={uncertainty:.4f}"
                )
            else:
                print(
                    f"[FOLLOW-UP] Question {last_question_id} not in bank, using prior state"
                )

            # ── 3. BUILD EVIDENCE TEXT FOR UNIFIED INFERENCE ──────────────
            if last_question_text:
                if str(last_answer).lower() == "yes":
                    # Find positive_symptom text from question bank
                    pos_text = None
                    for disease_qs in list(QUESTION_BANK_EN.values()) + list(
                        QUESTION_BANK_TL.values()
                    ):
                        for q in disease_qs:
                            if q.get("id") == last_question_id:
                                pos_text = q.get("positive_symptom", "")
                                break
                        if pos_text:
                            break
                    if pos_text:
                        evidence_texts.append(f"Patient confirms: {pos_text}")
                    else:
                        evidence_texts.append(
                            f"Patient confirms symptom from: {last_question_text}"
                        )
                else:
                    neg_text = None
                    for disease_qs in list(QUESTION_BANK_EN.values()) + list(
                        QUESTION_BANK_TL.values()
                    ):
                        for q in disease_qs:
                            if q.get("id") == last_question_id:
                                neg_text = q.get("negative_symptom", "")
                                break
                        if neg_text:
                            break
                    if neg_text:
                        evidence_texts.append(f"Patient denies: {neg_text}")
                    else:
                        evidence_texts.append(
                            f"Patient denies symptom from: {last_question_text}"
                        )

        # ── 4. NEURO-SYMBOLIC CLAMPING ────────────────────────────────────
        # Clamp impossible diseases DURING the loop, not just at the end.
        verification_layer = current_app.config["VERIFICATION_LAYER"]
        unified_text = _build_evidence_text(initial_symptoms, evidence_texts)

        clamped_probs = _clamp_impossible_diseases(
            current_probs,
            unified_text,
            verification_layer,
            CORRECT_ID2LABEL,
        )

        if not np.allclose(clamped_probs, current_probs, atol=1e-8):
            current_probs = clamped_probs
            pred_idx = int(np.argmax(current_probs))
            pred = str(CORRECT_ID2LABEL.get(pred_idx, pred) or pred)
            confidence = float(np.max(current_probs))
            from scipy.stats import entropy as _ent

            raw_h = float(_ent(current_probs))
            max_h = float(np.log(len(current_probs)))
            uncertainty = raw_h / max_h if max_h > 0 else 0.0
            top_diseases = [
                {
                    "disease": CORRECT_ID2LABEL.get(i, f"D{i}"),
                    "probability": float(current_probs[i]),
                }
                for i in range(len(current_probs))
            ]
            top_diseases.sort(key=lambda x: x["probability"], reverse=True)
            print(
                f"[FOLLOW-UP] Post-clamp: {pred} conf={confidence:.3f} MI={uncertainty:.4f}"
            )

        # Final verification on the top disease
        v_result = verification_layer.verify(unified_text, pred)
        if not v_result["is_valid"]:
            unexplained = v_result["unexplained_concepts"]
            conflicting_match_message = _build_conflicting_match_message(
                pred, lang=sess.get("lang", "en")
            )
            print(f"[VERIFICATION-FOLLOWUP] FAIL: {unexplained} for {pred}")
            probs_formatted = [
                f"{d['disease']}: {(d['probability'] * 100):.2f}%" for d in top_diseases
            ]
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "OUT_OF_SCOPE",
                            "message": conflicting_match_message,
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs_formatted,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": current_probs.tolist(),
                                "is_valid": False,
                                "out_of_scope_type": "CONFLICTING_MATCH",
                                "message": conflicting_match_message,
                                "cdss": _build_cdss_payload(
                                    symptoms_text,
                                    pred,
                                    confidence,
                                    uncertainty,
                                    top_diseases,
                                    model_used,
                                    question_answers=locals().get("question_answers"),
                                ),
                                "verification_failure": {
                                    "unexplained_concepts": list(unexplained),
                                    "message": conflicting_match_message,
                                },
                            },
                        }
                    }
                ),
                200,
            )

        # ── PERSIST UPDATED STATE ─────────────────────────────────────────
        mean_probs = current_probs.tolist()
        probs_formatted = [
            f"{d['disease']}: {(d['probability'] * 100):.2f}%" for d in top_diseases
        ]

        if session_id:
            update_session(
                session_id,
                current_probs=mean_probs,
                disease=pred,
                confidence=confidence,
                uncertainty=uncertainty,
                top_diseases=top_diseases,
                asked_questions=list(asked_questions),
                evidence_texts=evidence_texts,
                question_answers=question_answers,
            )

        # Also update legacy Flask session for backward compat
        diag = session.get("diagnosis", {})
        diag.update(
            {
                "current_probs": mean_probs,
                "confidence": confidence,
                "uncertainty": uncertainty,
                "disease": pred,
                "top_diseases": top_diseases,
            }
        )
        session["diagnosis"] = diag

        # ── FORCE COMPLETE (Skip to Results) ──────────────────────────────
        if force_complete:
            is_valid = (
                confidence >= config.VALID_MIN_CONF
                and uncertainty <= config.VALID_MAX_UNCERTAINTY
            )
            reason = "USER_SKIPPED" if is_valid else "USER_SKIPPED_LOW_CONFIDENCE"
            message = (
                f"Based on what you've told us, it could be **{pred}**. A healthcare provider can help confirm this."
                if is_valid
                else "We weren't able to gather enough information to identify a specific condition. For a clearer picture, please consult a healthcare provider."
            )
            print(
                f"[FOLLOW-UP] STOP: User skipped to results (conf={confidence:.3f}, valid={is_valid})"
            )
            return _stop_response(
                reason,
                pred,
                confidence,
                uncertainty,
                probs_formatted,
                model_used,
                top_diseases,
                mean_probs,
                symptoms_text,
                message=message,
                is_valid=is_valid,
                question_answers=locals().get("question_answers"),
            )

        # ── EARLY STOP CHECKS ────────────────────────────────────────────
        if (
            not force_question
            and confidence >= config.HIGH_CONFIDENCE_THRESHOLD
            and uncertainty <= config.LOW_UNCERTAINTY_THRESHOLD
        ):
            print(
                f"[FOLLOW-UP] STOP: High confidence (conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            return _stop_response(
                "HIGH_CONFIDENCE_FINAL",
                pred,
                confidence,
                uncertainty,
                probs_formatted,
                model_used,
                top_diseases,
                mean_probs,
                symptoms_text,
                question_answers=locals().get("question_answers"),
            )

        is_valid_prediction = (
            confidence >= config.VALID_MIN_CONF
            and uncertainty <= config.VALID_MAX_UNCERTAINTY
        )

        if (
            len(asked_questions) >= config.MAX_QUESTIONS_THRESHOLD
            and not is_valid_prediction
        ):
            print(
                f"[FOLLOW-UP] STOP: OUT_OF_SCOPE after {len(asked_questions)} questions"
            )
            out_of_scope_message = _build_no_clear_match_message()
            return _stop_response(
                "OUT_OF_SCOPE",
                pred,
                confidence,
                uncertainty,
                probs_formatted,
                model_used,
                top_diseases,
                mean_probs,
                symptoms_text,
                message=out_of_scope_message,
                is_valid=False,
                extra_fields={"out_of_scope_type": "NO_CLEAR_MATCH"},
                question_answers=locals().get("question_answers"),
            )

        if len(asked_questions) >= config.EXHAUSTED_QUESTIONS_THRESHOLD:
            is_valid = (
                confidence >= config.VALID_MIN_CONF
                and uncertainty <= config.VALID_MAX_UNCERTAINTY
            )
            reason = "HIGH_CONFIDENCE_FINAL" if is_valid else "OUT_OF_SCOPE"
            out_of_scope_message = _build_no_clear_match_message()
            message = (
                f"Based on what you've told us, it could be **{pred}**. A healthcare provider can help confirm this."
                if is_valid
                else out_of_scope_message
            )
            print(
                f"[FOLLOW-UP] STOP: Exhausted questions ({len(asked_questions)}) valid={is_valid}"
            )
            return _stop_response(
                reason,
                pred,
                confidence,
                uncertainty,
                probs_formatted,
                model_used,
                top_diseases,
                mean_probs,
                symptoms_text,
                message=message,
                is_valid=is_valid,
                extra_fields={"out_of_scope_type": "NO_CLEAR_MATCH"}
                if not is_valid
                else None,
                question_answers=locals().get("question_answers"),
            )

        # ── 5. EIG-BASED QUESTION SELECTION ──────────────────────────────
        # Detect language for question bank
        session_lang = sess.get("lang", "en")
        if symptoms_text.strip():
            lang = detect_language_heuristic(symptoms_text)
        else:
            lang = session_lang if session_lang else "en"

        QUESTION_BANK = QUESTION_BANK_TL if lang in ["tl", "fil"] else QUESTION_BANK_EN

        # Identify which questions to skip (already evidenced in initial symptoms)
        symptoms_lower = (symptoms_text or "").lower()
        skip_ids = set()
        for disease_name, questions in QUESTION_BANK.items():
            for q in questions:
                if _has_evidence(q, symptoms_lower):
                    skip_ids.add(q["id"])

        if skip_ids:
            print(f"[FOLLOW-UP] Skipping {len(skip_ids)} already-evidenced questions")

        # Log semantic grouping statistics
        expanded_by_groups = expand_asked_questions(asked_questions) - asked_questions
        skipped_by_text = get_questions_to_skip_from_text(symptoms_text)
        if expanded_by_groups:
            print(
                f"[FOLLOW-UP] Semantic grouping adds {len(expanded_by_groups)} related questions to skip list"
            )
        if skipped_by_text:
            print(
                f"[FOLLOW-UP] Text-based detection skips {len(skipped_by_text)} questions from symptom mentions"
            )

        # Log prerequisite blocking
        blocked_by_prereq = get_questions_blocked_by_prerequisites(question_answers)
        if blocked_by_prereq:
            print(
                f"[FOLLOW-UP] Prerequisite logic blocks {len(blocked_by_prereq)} questions: {blocked_by_prereq}"
            )

        # Get initial_eig from session for early stopping comparison
        initial_eig = sess.get("initial_eig")

        # Use EIG to find the best question across ALL diseases
        # Now with semantic grouping, burden penalty, novelty penalty, and early stopping
        selected_question, should_stop_eig, best_eig = (
            select_best_question_across_diseases(
                current_probs=current_probs,
                question_bank=QUESTION_BANK,
                asked_question_ids=asked_questions,
                skip_question_ids=skip_ids,
                disease_labels=CORRECT_ID2LABEL,
                symptoms_text=symptoms_text,  # Pass symptoms for text-based deduplication
                use_semantic_grouping=True,  # Enable semantic grouping
                answered_questions=question_answers,  # Pass answers for prerequisite checking
                initial_eig=initial_eig,  # Pass initial EIG for early stopping
            )
        )

        # Track initial_eig in session for the first question
        if best_eig is not None and initial_eig is None and session_id:
            update_session(session_id, initial_eig=best_eig)
            print(f"[FOLLOW-UP] Recorded initial EIG: {best_eig:.4f}")

        # EIG-based early stopping check
        if should_stop_eig and selected_question is not None:
            is_valid = (
                confidence >= config.VALID_MIN_CONF
                and uncertainty <= config.VALID_MAX_UNCERTAINTY
            )
            reason = "EIG_DIMINISHING_RETURNS" if is_valid else "EIG_LOW_CONFIDENCE"
            message = (
                f"Based on what you've told us, it could be **{pred}**. A healthcare provider can help confirm this."
                if is_valid
                else "Based on the information provided, we could not identify a specific condition with enough certainty. Please consult a healthcare provider for a proper evaluation."
            )
            print(
                f"[FOLLOW-UP] STOP: EIG early stopping triggered (best_eig={best_eig:.4f}, initial={initial_eig}, valid={is_valid})"
            )
            return _stop_response(
                reason,
                pred,
                confidence,
                uncertainty,
                probs_formatted,
                model_used,
                top_diseases,
                mean_probs,
                symptoms_text,
                message=message,
                is_valid=is_valid,
                question_answers=locals().get("question_answers"),
            )

        if not selected_question:
            # All questions exhausted
            is_valid = (
                confidence >= config.VALID_MIN_CONF
                and uncertainty <= config.VALID_MAX_UNCERTAINTY
            )
            reason = "HIGH_CONFIDENCE_FINAL" if is_valid else "LOW_CONFIDENCE_FINAL"
            out_of_scope_message = _build_no_clear_match_message()
            message = (
                f"Based on what you've told us, it could be **{pred}**. A healthcare provider can help confirm this."
                if is_valid
                else out_of_scope_message
            )
            print(f"[FOLLOW-UP] STOP: No more questions available, valid={is_valid}")
            return _stop_response(
                reason,
                pred,
                confidence,
                uncertainty,
                probs_formatted,
                model_used,
                top_diseases,
                mean_probs,
                symptoms_text,
                message=message,
                is_valid=is_valid,
                extra_fields={"out_of_scope_type": "NO_CLEAR_MATCH"}
                if not is_valid
                else None,
                question_answers=locals().get("question_answers"),
            )

        # Evidence-based early stop (from coverage)
        current_disease = pred
        if current_disease in QUESTION_BANK:
            primary_questions = QUESTION_BANK[current_disease]
            primary_only = [
                q
                for q in primary_questions
                if (q.get("category") or "").lower() == "primary"
            ]
            coverage_primary = sum(
                1 for q in primary_only if _has_evidence(q, symptoms_lower)
            )
            if (
                coverage_primary >= config.EVIDENCE_STOP_PRIMARY_COVERAGE
                and confidence >= config.EVIDENCE_STOP_CONF_THRESHOLD
                and uncertainty <= config.EVIDENCE_STOP_MAX_UNCERTAINTY
            ):
                print(
                    f"[FOLLOW-UP] STOP: Sufficient evidence (coverage={coverage_primary})"
                )
                return _stop_response(
                    "High confidence reached",
                    pred,
                    confidence,
                    uncertainty,
                    probs_formatted,
                    model_used,
                    top_diseases,
                    mean_probs,
                    symptoms_text,
                )

        # Log selection
        eig_val = selected_question.get("_eig", 0)
        eig_boosted = selected_question.get("_eig_boosted", eig_val)
        target_disease = selected_question.get("_disease", "?")
        is_top_q = selected_question.get("_is_top_disease_q", False)
        reasoning = selected_question.get("_reasoning", "")
        print(
            f"[FOLLOW-UP] {pred} | Lang: {lang} | Conf: {confidence:.3f} | MI: {uncertainty:.4f} | Asked: {len(asked_questions)}"
        )
        print(
            f"[FOLLOW-UP] EIG selected -> {selected_question['id']}: {selected_question['question']} "
            f"(EIG={eig_val:.4f}, boosted={eig_boosted:.4f}, target={target_disease}, "
            f"is_top_disease_q={is_top_q}, cat={selected_question.get('category', '')})"
        )
        if reasoning:
            print(f"[FOLLOW-UP] Reasoning: {reasoning}")

        return (
            jsonify(
                {
                    "data": {
                        "should_stop": False,
                        "question": {
                            "id": selected_question["id"],
                            "question": selected_question["question"],
                            "positive_symptom": selected_question["positive_symptom"],
                            "negative_symptom": selected_question["negative_symptom"],
                            "category": selected_question.get("category", "secondary"),
                            "reasoning": reasoning,
                        },
                        "diagnosis": {
                            "pred": pred,
                            "disease": pred,
                            "confidence": confidence,
                            "uncertainty": uncertainty,
                            "probs": probs_formatted,
                            "model_used": model_used,
                            "top_diseases": top_diseases,
                            "mean_probs": mean_probs,
                            "cdss": _build_cdss_payload(
                                symptoms_text,
                                pred,
                                confidence,
                                uncertainty,
                                top_diseases,
                                model_used,
                                question_answers=locals().get("question_answers"),
                            ),
                        },
                        "session_id": session_id,
                    }
                }
            ),
            200,
        )

    except Exception as e:
        error_msg = str(e)
        error_details = traceback.format_exc()
        print(f"ERROR in follow_up_question:")
        print(error_details)
        payload = {
            "error": "INTERNAL_ERROR",
            "message": error_msg,
        }
        if current_app.debug:
            payload["details"] = error_details
        return jsonify(payload), 500


# ── /diagnosis/explain ────────────────────────────────────────────────────────


@diagnosis_bp.route("/diagnosis/explain", methods=["POST"])
def explain_diagnosis():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        text = data.get("symptoms", "")
        if not text:
            return jsonify({"error": "Symptoms cannot be empty"}), 400

        mean_probs = data.get("mean_probs", None)
        with open("explain_debug.log", "a") as f:
            f.write(f"Received symptoms: {text}\n")
            f.write(f"Received mean_probs: {repr(mean_probs)}\n")
        if mean_probs is None:
            return jsonify({"error": "mean_probs is required"}), 400

        # Flatten nested mean_probs if needed (handle both [p1, p2, ...] and [[p1, p2, ...]])
        if isinstance(mean_probs, list) and len(mean_probs) > 0:
            if isinstance(mean_probs[0], list):
                # Nested list format [[p1, p2, ...]] - flatten to [p1, p2, ...]
                mean_probs = mean_probs[0]
                print(
                    f"[EXPLAIN] Flattened mean_probs from nested to {len(mean_probs)} classes"
                )

        result = explainer(text, mean_probs)

        return (
            jsonify(
                {"symptoms": result.get("symptoms"), "tokens": result.get("tokens")}
            ),
            200,
        )

    except Exception as e:
        error_msg = str(e)
        error_details = traceback.format_exc()
        print(f"ERROR in explain_diagnosis:")
        print(error_details)
        payload = {
            "error": "EXPLANATION_ERROR",
            "message": error_msg,
        }
        if current_app.debug:
            payload["details"] = error_details
        return jsonify(payload), 500
