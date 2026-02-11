"""
Diagnosis blueprint: /diagnosis/new, /diagnosis/follow-up, /diagnosis/explain
"""

import time
import traceback
from flask import Blueprint, request, jsonify, session, current_app

import app.config as config
from app.services.ml_service import classifier, explainer
from app.utils import _count_words, _build_cdss_payload, detect_language_heuristic
from app.evidence_keywords import EVIDENCE_KEYWORDS

diagnosis_bp = Blueprint("diagnosis", __name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _stop_response(reason, pred, confidence, uncertainty, probs,
                   model_used, top_diseases, mean_probs,
                   symptoms_text, message=None, is_valid=True,
                   extra_fields=None):
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
                symptoms_text, pred, confidence,
                uncertainty, top_diseases, model_used,
            ),
        },
    }
    if message:
        data["message"] = message
    if extra_fields:
        data["diagnosis"].update(extra_fields)
    return jsonify({"data": data}), 200


# ── /diagnosis/new ────────────────────────────────────────────────────────────

@diagnosis_bp.route("/diagnosis/new", methods=["POST"])
def new_case():
    """
    Start a new diagnosis case. Accepts a symptom description.
    """
    session.clear()  # Start fresh for every new case
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        symptoms = data.get("symptoms", "").strip()

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

        pred, confidence, uncertainty, probs, model_used, top_diseases, mean_probs = (
            classifier(symptoms)
        )

        # NEURO-SYMBOLIC VERIFICATION: Check for ontology mismatch
        verification_layer = current_app.config["VERIFICATION_LAYER"]
        verification_result = verification_layer.verify(symptoms, pred)
        if not verification_result["is_valid"]:
            unexplained = verification_result["unexplained_concepts"]
            print(
                f"[VERIFICATION] FAIL: Unexplained concepts {unexplained} for predicted disease {pred}"
            )
            print(
                f"[LOG_INSTANCE] ONTOLOGY_MISMATCH | predicted={pred} | unexplained={unexplained} | conf={confidence:.4f}"
            )
            cdss = _build_cdss_payload(
                symptoms,
                pred,
                confidence,
                uncertainty,
                top_diseases,
                model_used,
            )
            # Add verification failure to red flags
            cdss["red_flags"] = cdss.get("red_flags", []) + [
                f"Symptoms detected that are not typical of {pred}. Please consult a healthcare professional."
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
                            "is_valid": False,
                            "verification_failure": {
                                "unexplained_concepts": list(unexplained),
                                "message": "Your symptoms include indicators not typically associated with our supported conditions. Please consult a healthcare professional."
                            }
                        }
                    }
                ),
                200,
            )

        # EARLY STOP: If initial diagnosis is very confident, skip follow-up questions entirely
        if confidence >= config.HIGH_CONFIDENCE_THRESHOLD and uncertainty <= config.LOW_UNCERTAINTY_THRESHOLD:
            print(
                f"[NEW CASE] STOP: Very high confidence on initial diagnosis (conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            print(
                f"[LOG_INSTANCE] HIGH_CONFIDENCE_INITIAL | disease={pred} | conf={confidence:.4f} | MI={uncertainty:.4f} | will_skip_followup=True"
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
                            "skip_followup": True,  # Signal to frontend to skip follow-up questions
                            "skip_reason": "HIGH_CONFIDENCE_INITIAL",
                        }
                    }
                ),
                201,
            )

        # Gate low-confidence / high-uncertainty predictions
        if confidence < config.SYMPTOM_MIN_CONF or uncertainty > config.SYMPTOM_MAX_MI:
            # If it's within the soft band, proceed with a low-confidence advisory
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
                                "advisory": {
                                    "low_confidence": True,
                                    "message": "We couldn't confidently match your symptoms yet. We'll ask a few targeted questions to narrow it down.",
                                    "thresholds": {
                                        "hard_min_conf": config.SYMPTOM_MIN_CONF,
                                        "soft_min_conf": config.SYMPTOM_SOFT_MIN_CONF,
                                        "hard_max_mi": config.SYMPTOM_MAX_MI,
                                        "soft_max_mi": config.SYMPTOM_SOFT_MAX_MI,
                                    },
                                },
                            }
                        }
                    ),
                    201,
                )

            # Otherwise, ask user for more detail (hard rejection)
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
        # Determine language from model_used
        lang_detected = "tl" if "Tagalog" in str(model_used) or "TAGALOG" in str(model_used).upper() else "en"

        # SAVE TO SESSION (Server-Side State)
        # Verify serializable types
        session["diagnosis"] = {
            "disease": pred,
            "confidence": float(confidence),
            "uncertainty": float(uncertainty),
            "top_diseases": top_diseases,
            "mean_probs": mean_probs,
            "symptoms_text": symptoms,
            "lang": lang_detected,
            "start_time": time.time(),
        }

        return (
            jsonify(
                {
                    "data": {
                        "pred": pred,
                        "confidence": confidence,
                        "uncertainty": uncertainty,
                        "probs": probs,
                        "model_used": model_used,
                        "disease": pred,  # Add disease for follow-up
                        "top_diseases": top_diseases,  # Add top competing diseases
                        "mean_probs": mean_probs,
                        "cdss": cdss,
                        "session_valid": True,
                    }
                }
            ),
            201,
        )

    except Exception as e:
        error_msg = str(e)

        print(f"Exception caught in new_case: {error_msg}")
        print(f"Exception type: {type(e)}")

        if "INSUFFICIENT_SYMPTOM_EVIDENCE:" in error_msg:
            reason = error_msg.split("INSUFFICIENT_SYMPTOM_EVIDENCE:")[1].strip()

            print(f"Insufficient symptom evidence: {reason}")

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

            print(f"Detected unsupported language: {lang}")

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
        # gc.collect() - GC calls moved to ml.py internally
        return (
            jsonify(
                {
                    "error": "INTERNAL_ERROR",
                    "message": error_msg,
                    "details": error_details,
                }
            ),
            500,
        )


# ── /diagnosis/follow-up ─────────────────────────────────────────────────────

@diagnosis_bp.route("/diagnosis/follow-up", methods=["POST"])
def follow_up_question():
    """
    Updated: Accepts full symptoms string, re-runs classifier, returns new diagnosis and next question.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # SESSION VALIDATION (with request-body fallback for backward compat)
        session_data = session.get("diagnosis")
        if not session_data:
            # Fallback: construct session_data from request body fields
            # This supports tests and API consumers that don't use cookies
            client_disease = data.get("disease")
            if client_disease:
                session_data = {
                    "disease": client_disease,
                    "confidence": data.get("confidence"),
                    "uncertainty": data.get("uncertainty"),
                    "top_diseases": data.get("top_diseases", []),
                    "mean_probs": data.get("mean_probs", []),
                    "symptoms_text": data.get("symptoms", ""),
                    "lang": None,
                    "start_time": time.time(),
                }
                print("[FOLLOW-UP] Using request-body fallback (no server session)")
            else:
                # No session and no client-provided disease context
                print("[SECURITY] Session missing or expired in follow-up")
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
            
        # Validate session age (e.g., 1 hour expiry)
        if time.time() - session_data.get("start_time", 0) > 3600:
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

        # Use updated symptoms string (initial + positives)
        symptoms_text = data.get("symptoms", "").strip()
        if not symptoms_text:
             # Fallback to session symptoms if not provided
             symptoms_text = session_data.get("symptoms_text", "")
        
        # TRUST SERVER STATE for context, ignore client-provided context fields if they differ
        prior_disease = session_data.get("disease")
        prior_confidence = session_data.get("confidence")
        prior_uncertainty = session_data.get("uncertainty")
        prior_top_diseases = session_data.get("top_diseases", []) or []
        
        # These fields still come from client as they are interaction logic
        asked_questions = data.get("asked_questions", [])
        force_question = data.get("force", False)
        mode = data.get("mode", "adaptive")
        last_answer = data.get("last_answer")
        last_question_id = data.get("last_question_id")
        last_question_text = data.get("last_question_text")

        # Lightweight debug to verify dynamic reclassification input length and asked count
        try:
            print(
                f"[FOLLOW-UP] Reclassify on symptoms len={len(symptoms_text)} | asked={len(asked_questions)}"
            )
        except Exception:
            pass

        # Log last answer that led to this follow-up
        try:
            if last_answer is not None and last_question_id:
                ans = str(last_answer).lower()
                symbol = "✅" if ans == "yes" else ("❌" if ans == "no" else ans)
                print(f"[FOLLOW-UP] Answer: {symbol} to [{last_question_id}]")
                if last_question_text:
                    print(f"[FOLLOW-UP] Question text: {last_question_text}")
        except Exception:
            pass

        # Re-run classifier with updated symptoms whenever we have sufficient evidence.
        # If caller didn't provide enough text, fall back to prior diagnosis context to continue Q&A.
        try:
            too_short = (
                _count_words(symptoms_text) < config.SYMPTOM_MIN_WORDS
                and len(symptoms_text) < config.SYMPTOM_MIN_CHARS
            )

            if not too_short:
                (
                    pred,
                    confidence,
                    uncertainty,
                    probs,
                    model_used,
                    top_diseases,
                    mean_probs,
                ) = classifier(symptoms_text)
            else:
                # Fallback path: skip classifier if no new symptom text; use prior context
                print(
                    f"[FOLLOW-UP] Fallback: skipping reclassify (symptoms too short: words={_count_words(symptoms_text)}, chars={len(symptoms_text)})"
                )

                if not prior_disease or not isinstance(prior_top_diseases, list):
                    return (
                        jsonify(
                            {
                                "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                                "message": "No new symptom details provided and prior diagnosis context missing. Please resend the cumulative symptoms string or include prior diagnosis fields.",
                                "details": {
                                    "min_words": config.SYMPTOM_MIN_WORDS,
                                    "min_chars": config.SYMPTOM_MIN_CHARS,
                                },
                            }
                        ),
                        422,
                    )

                pred = prior_disease
                confidence = (
                    float(prior_confidence) if prior_confidence is not None else 0.0
                )
                uncertainty = (
                    float(prior_uncertainty) if prior_uncertainty is not None else 1.0
                )
                top_diseases = prior_top_diseases
                # Derive simple probs list from provided top_diseases
                try:
                    probs = [
                        f"{d.get('disease')}: {(float(d.get('probability', 0.0))*100):.2f}%"
                        for d in top_diseases
                    ]
                except Exception:
                    probs = []
                model_used = "(skipped reclassify)"
                mean_probs = []
        except Exception as e:
            err = str(e)
            # Map known classifier validation errors to user-friendly HTTP codes
            if "INSUFFICIENT_SYMPTOM_EVIDENCE:" in err:
                reason = err.split("INSUFFICIENT_SYMPTOM_EVIDENCE:")[-1].strip()
                return (
                    jsonify(
                        {
                            "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                            "message": "Please add a bit more detail to your symptoms (e.g., duration, severity, other symptoms).",
                            "details": {"reason": reason},
                        }
                    ),
                    422,
                )
            if "UNSUPPORTED_LANGUAGE:" in err:
                lang = err.split("UNSUPPORTED_LANGUAGE:")[-1].strip()
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
            print(f"ERROR in follow_up_question: {err}")
            return jsonify({
                "error": "Classifier error", 
                "message": f"An internal error occurred: {err}",
                "details": err
            }), 500

        # Neuro-Symbolic Verification (Catch Out-of-Scope even in follow-up)
        # This prevents confidence drift from accepting invalid diseases
        verification_layer = current_app.config["VERIFICATION_LAYER"]
        verification_result = verification_layer.verify(symptoms_text, pred)
        if not verification_result["is_valid"]:
            unexplained = verification_result["unexplained_concepts"]
            print(
                f"[VERIFICATION-FOLLOWUP] FAIL: Unexplained concepts {unexplained} for predicted disease {pred}"
            )
            print(
                f"[LOG_INSTANCE] ONTOLOGY_MISMATCH_FOLLOWUP | predicted={pred} | unexplained={unexplained} | conf={confidence:.4f}"
            )
            cdss = _build_cdss_payload(
                symptoms_text,
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
                            "should_stop": True,
                            "reason": "OUT_OF_SCOPE",
                            "message": "Your symptoms may not match the diseases this system covers (Dengue, Pneumonia, Typhoid, Diarrhea, Measles, Influenza). Please consult a healthcare professional for proper evaluation.",
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "is_valid": False,
                                "cdss": cdss,
                                "verification_failure": {
                                    "unexplained_concepts": list(unexplained),
                                    "message": "Your symptoms include indicators not typically associated with our supported conditions. Please consult a healthcare professional."
                                }
                            },
                        }
                    }
                ),
                200,
            )

        # Language detection for question bank using robust heuristic
        # Determine Language
        session_lang = session_data.get("lang")
        if (symptoms_text or "").strip():
             lang = detect_language_heuristic(symptoms_text)
        else:
             lang = session_lang if session_lang else "en"

        QUESTION_BANK_TL = current_app.config["QUESTION_BANK_TL"]
        QUESTION_BANK_EN = current_app.config["QUESTION_BANK_EN"]
        QUESTION_BANK = QUESTION_BANK_TL if lang in ["tl", "fil"] else QUESTION_BANK_EN

        # EARLY STOP: Check high confidence FIRST, before any other logic
        # This prevents asking questions when diagnosis is already very confident
        if not force_question and confidence >= config.HIGH_CONFIDENCE_THRESHOLD and uncertainty <= config.LOW_UNCERTAINTY_THRESHOLD:
            print(
                f"[FOLLOW-UP] STOP: Very high confidence reached (conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            return _stop_response(
                "HIGH_CONFIDENCE_FINAL", pred, confidence, uncertainty,
                probs, model_used, top_diseases, mean_probs, symptoms_text,
            )

        # Early stop logic: Check if prediction meets thesis validity thresholds
        # If not, flag as OUT_OF_SCOPE instead of forcing a potentially incorrect diagnosis
        is_valid_prediction = (
            confidence >= config.VALID_MIN_CONF 
            and uncertainty <= config.VALID_MAX_UNCERTAINTY
        )
        
        if (
            len(asked_questions) >= config.MAX_QUESTIONS_THRESHOLD
            and not is_valid_prediction
        ):
            print(
                f"[FOLLOW-UP] STOP: OUT_OF_SCOPE after {len(asked_questions)} questions (conf={confidence:.3f} < {config.VALID_MIN_CONF}, MI={uncertainty:.4f} > {config.VALID_MAX_UNCERTAINTY})"
            )
            print(
                f"[LOG_INSTANCE] OUT_OF_SCOPE | disease={pred} | conf={confidence:.4f} | MI={uncertainty:.4f} | asked_questions={len(asked_questions)} | threshold_conf={config.VALID_MIN_CONF} | threshold_mi={config.VALID_MAX_UNCERTAINTY}"
            )
            return _stop_response(
                "OUT_OF_SCOPE", pred, confidence, uncertainty,
                probs, model_used, top_diseases, mean_probs, symptoms_text,
                message="Your symptoms may not match the diseases this system covers (Dengue, Pneumonia, Typhoid, Diarrhea, Measles, Influenza). Please consult a healthcare professional for proper evaluation.",
                is_valid=False,
            )

        if len(asked_questions) >= config.EXHAUSTED_QUESTIONS_THRESHOLD:
            # Check validity before exhaustion response
            is_exhausted_valid = (
                confidence >= config.VALID_MIN_CONF 
                and uncertainty <= config.VALID_MAX_UNCERTAINTY
            )
            reason = "HIGH_CONFIDENCE_FINAL" if is_exhausted_valid else "OUT_OF_SCOPE"
            message = (
                f"Final assessment: {pred}" if is_exhausted_valid 
                else "Your symptoms may not match the diseases this system covers (Dengue, Pneumonia, Typhoid, Diarrhea, Measles, Influenza). Please consult a healthcare professional for proper evaluation."
            )
            print(
                f"[FOLLOW-UP] STOP: Exhausted questions for disease={pred} after {len(asked_questions)} asked | valid={is_exhausted_valid}"
            )
            return _stop_response(
                reason, pred, confidence, uncertainty,
                probs, model_used, top_diseases, mean_probs, symptoms_text,
                message=message, is_valid=is_exhausted_valid,
            )

        # If not forced, stop when confidence and uncertainty thresholds are met (secondary check)
        # This catches cases where confidence increased after first follow-up
        if not force_question and confidence >= config.HIGH_CONFIDENCE_THRESHOLD and uncertainty <= config.LOW_UNCERTAINTY_THRESHOLD:
            print("[FOLLOW-UP] STOP: High confidence and low uncertainty reached")
            return _stop_response(
                "HIGH_CONFIDENCE_FINAL", pred, confidence, uncertainty,
                probs, model_used, top_diseases, mean_probs, symptoms_text,
            )

        # Question selection logic with duplicate-evidence skipping and coverage
        current_disease = pred
        if current_disease not in QUESTION_BANK:
            print(
                f"[FOLLOW-UP] STOP: No questions available for disease: {current_disease}"
            )
            return _stop_response(
                "NO_QUESTIONS_AVAILABLE", pred, confidence, uncertainty,
                probs, model_used, top_diseases, mean_probs, symptoms_text,
                message=f"No follow-up questions available for {current_disease}. Diagnosis complete.",
            )

        primary_questions = QUESTION_BANK[current_disease]
        symptoms_lower = (symptoms_text or "").lower()

        # Improved evidence detection: check for key symptom keywords, not full phrases
        def has_evidence(q):
            """Check if the question's key symptoms are already mentioned in initial symptoms"""
            qid = q.get("id", "")
            keywords = EVIDENCE_KEYWORDS.get(qid, [])
            if not keywords:
                return False
            # Check if ANY of the keywords are present in symptoms
            return any(kw in symptoms_lower for kw in keywords)

        duplicate_ids = [q["id"] for q in primary_questions if has_evidence(q)]
        available_questions = [
            q
            for q in primary_questions
            if q["id"] not in asked_questions and q["id"] not in duplicate_ids
        ]

        if duplicate_ids:
            try:
                print(
                    f"[FOLLOW-UP] Skipping {len(duplicate_ids)} duplicate question(s) already evidenced in symptoms: {', '.join(duplicate_ids)}"
                )
            except Exception:
                pass

        if not available_questions:
            print(
                f"[FOLLOW-UP] STOP: All questions asked for disease: {current_disease}"
            )
            
            # Check validity before exhaustion response (Same logic as EXHAUSTED_QUESTIONS_THRESHOLD)
            is_exhausted_valid = (
                confidence >= config.VALID_MIN_CONF 
                and uncertainty <= config.VALID_MAX_UNCERTAINTY
            )
            reason = "HIGH_CONFIDENCE_FINAL" if is_exhausted_valid else "LOW_CONFIDENCE_FINAL"
            message = (
                f"Final assessment: {pred}" if is_exhausted_valid 
                else "You may not be experiencing a disease that this system can process or your inputs are invalid."
            )
            
            return _stop_response(
                reason, pred, confidence, uncertainty,
                probs, model_used, top_diseases, mean_probs, symptoms_text,
                message=message, is_valid=is_exhausted_valid,
            )

        # Compute primary coverage (how many primary questions are already evidenced)
        primary_only = [
            q
            for q in primary_questions
            if (q.get("category") or "").lower() == "primary"
        ]
        coverage_primary = sum(1 for q in primary_only if has_evidence(q))

        # Evidence-based early stop
        if coverage_primary >= 3 and (confidence >= 0.78 and uncertainty <= 0.04):
            print(
                f"[FOLLOW-UP] STOP: Sufficient evidence reached (coverage_primary={coverage_primary}, conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            print(
                f"[LOG_INSTANCE] SUFFICIENT_EVIDENCE | disease={pred} | conf={confidence:.4f} | MI={uncertainty:.4f} | coverage_primary={coverage_primary} | asked_questions={len(asked_questions)} | frontend_will_show_error=NO"
            )
            return _stop_response(
                "High confidence reached", pred, confidence, uncertainty,
                probs, model_used, top_diseases, mean_probs, symptoms_text,
            )

        # Discrimination logic (prefer when probs close OR coverage strong)
        selected_question = None
        if mode != "legacy" and len(top_diseases) >= 2:
            second_disease = top_diseases[1]["disease"]
            prob_diff = abs(
                top_diseases[0]["probability"] - top_diseases[1]["probability"]
            )
            if (
                prob_diff < 0.2 or coverage_primary >= 2
            ) and second_disease in QUESTION_BANK:
                secondary_questions = QUESTION_BANK[second_disease]
                secondary_question_texts = {q["question"] for q in secondary_questions}
                discriminating_questions = [
                    q
                    for q in available_questions
                    if q["question"] not in secondary_question_texts
                ]
                if discriminating_questions:
                    selected_question = max(
                        discriminating_questions, key=lambda q: q["weight"]
                    )
        if not selected_question:
            selected_question = max(
                available_questions,
                key=lambda q: (q["category"] == "primary", q["weight"]),
            )

        # Summary log for current decision state and the next question selected
        try:
            print(
                f"[FOLLOW-UP] {pred} | Lang: {lang} | Conf: {confidence:.3f} | MI: {uncertainty:.4f} | Asked: {len(asked_questions)}"
            )
            if len(top_diseases) >= 2:
                td0, td1 = top_diseases[0], top_diseases[1]
                print(
                    f"[FOLLOW-UP] Top 2: {td0['disease']} ({td0['probability']:.3f}), {td1['disease']} ({td1['probability']:.3f})"
                )
            print(
                f"[FOLLOW-UP] Next question -> {selected_question['id']}: {selected_question['question']} (cat: {selected_question.get('category', '')})"
            )
        except Exception:
            pass

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
                            "category": selected_question["category"],
                        },
                        "diagnosis": {
                            "pred": pred,
                            "disease": pred,
                            "confidence": confidence,
                            "uncertainty": uncertainty,
                            "probs": probs,
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
                            ),
                        },
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
        return (
            jsonify(
                {
                    "error": "INTERNAL_ERROR",
                    "message": error_msg,
                    "details": error_details,
                }
            ),
            500,
        )


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
        if mean_probs is None:
            return jsonify({"error": "mean_probs is required"}), 400

        # Get model explanations (explainer returns a plain serializable dict)
        result = explainer(text, mean_probs)

        # Return the real symptoms and tokens from the explainer result
        return (
            jsonify(
                {"symptoms": result.get("symptoms"), "tokens": result.get("tokens")}
            ),
            200,
        )

    except Exception as e:
        error_msg = str(e)
        error_details = traceback.format_exc()
        return (
            jsonify(
                {
                    "error": "EXPLANATION_ERROR",
                    "message": error_msg,
                    "details": error_details,
                }
            ),
            500,
        )
