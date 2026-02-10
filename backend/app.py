
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import json
import os
import secrets
import time
from dotenv import load_dotenv
import traceback

import config
from ml import classifier, explainer
from verification import OntologyBuilder, VerificationLayer
from utils import _count_words, _build_cdss_payload, detect_language_heuristic

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)  # Secure persistent sessions
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False  # Set to True in production with HTTPS

# Load question banks (English and Tagalog)
with open("question_bank.json", "r", encoding="utf-8") as f:
    QUESTION_BANK_EN = json.load(f)

with open("question_bank_tagalog.json", "r", encoding="utf-8") as f:
    QUESTION_BANK_TL = json.load(f)


# =============================================================================
# NEURO-SYMBOLIC VERIFICATION LAYER
# =============================================================================

# Initialize the Ontology and Verification Layer
ontology_builder = OntologyBuilder(QUESTION_BANK_EN, QUESTION_BANK_TL)
verification_layer = VerificationLayer(ontology_builder)


# Configure CORS for production - MUST support credentials for sessions
CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://aill-be-sick.vercel.app/",
        os.getenv("FRONTEND_URL", "*"),
    ],
    supports_credentials=True,  # CRITICAL: Enable cookie/session support
)


@app.route("/diagnosis/", methods=["GET"])
def index():
    """Main index endpoint"""
    return jsonify({"message": "Hello, world!"})


@app.route("/diagnosis/new", methods=["POST"])
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
        import traceback

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


@app.route("/diagnosis/follow-up", methods=["POST"])
def follow_up_question():
    """
    Updated: Accepts full symptoms string, re-runs classifier, returns new diagnosis and next question.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # SESSION VALIDATION (Prevent Tampering)
        session_data = session.get("diagnosis")
        if not session_data:
            # Session expired or not found
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

        # Language detection for question bank
        # Language detection for question bank using robust heuristic
        # Determine Language
        session_lang = session_data.get("lang")
        if (symptoms_text or "").strip():
             lang = detect_language_heuristic(symptoms_text)
        else:
             lang = session_lang if session_lang else "en"

        QUESTION_BANK = QUESTION_BANK_TL if lang in ["tl", "fil"] else QUESTION_BANK_EN

        # EARLY STOP: Check high confidence FIRST, before any other logic
        # This prevents asking questions when diagnosis is already very confident
        if not force_question and confidence >= config.HIGH_CONFIDENCE_THRESHOLD and uncertainty <= config.LOW_UNCERTAINTY_THRESHOLD:
            print(
                f"[FOLLOW-UP] STOP: Very high confidence reached (conf={confidence:.3f}, MI={uncertainty:.4f})"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "HIGH_CONFIDENCE_FINAL",
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
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": reason,
                            "message": message,
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "is_valid": is_exhausted_valid,
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

        # If not forced, stop when confidence and uncertainty thresholds are met (secondary check)
        # This catches cases where confidence increased after first follow-up
        if not force_question and confidence >= config.HIGH_CONFIDENCE_THRESHOLD and uncertainty <= config.LOW_UNCERTAINTY_THRESHOLD:
            print("[FOLLOW-UP] STOP: High confidence and low uncertainty reached")
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "HIGH_CONFIDENCE_FINAL",
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

        # Question selection logic with duplicate-evidence skipping and coverage
        current_disease = pred
        if current_disease not in QUESTION_BANK:
            print(
                f"[FOLLOW-UP] STOP: No questions available for disease: {current_disease}"
            )
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "NO_QUESTIONS_AVAILABLE",
                            "message": f"No follow-up questions available for {current_disease}. Diagnosis complete.",
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
        primary_questions = QUESTION_BANK[current_disease]
        symptoms_lower = (symptoms_text or "").lower()

        # Improved evidence detection: check for key symptom keywords, not full phrases
        def has_evidence(q):
            """Check if the question's key symptoms are already mentioned in initial symptoms"""
            qid = q.get("id", "")

            # Map question IDs to key symptom keywords that indicate evidence
            evidence_keywords = config.EVIDENCE_KEYWORDS # MOVED TO CONFIG to keep app.py clean?
            # Or just keep it here if it's too large for config? 
            # Or define it in utils? 
            # Actually, let's keep it here for now as I didn't see it in config.py in the snippets.
            # But wait, I'm refactoring. I should probably move these large dicts out.
            # However, I don't want to break things by assuming they are in config if they aren't.
            # I will include the dictionary here for safety as I didn't verify moving it to config.
            
            # Use local definition if not in config
            local_evidence_keywords = {
                # Typhoid (English + Tagalog)
                "typhoid_q1": [
                    "belly pain",
                    "stomach pain",
                    "abdominal pain",
                    "abdomen pain",
                    "stomach ache",
                    "belly ache",
                    "sakit ng tiyan",
                    "pananakit ng tiyan",
                    "masakit ang tiyan",
                    "tiyan",
                    "puson",
                    "sikmura",
                ],
                "typhoid_q2": [
                    "constipation",
                    "diarrhea",
                    "diarrhoea",
                    "loose stool",
                    "watery stool",
                    "alternating",
                    "pagtatae",
                    "pagtitibi",
                    "tibi",
                    "dumi",
                    "tae",
                ],
                "typhoid_q3": [
                    "fever",
                    "high fever",
                    "night fever",
                    "evening fever",
                    "lagnat",
                    "mataas na lagnat",
                    "nilalagnat",
                    "temperatura",
                ],
                "typhoid_q4": [
                    "chills",
                    "shivering",
                    "cold",
                    "shaking",
                    "panginginig",
                    "ginaw",
                    "giniginaw",
                    "nanginginig",
                ],
                "typhoid_q5": [
                    "nausea",
                    "vomit",
                    "vomiting",
                    "feel like vomiting",
                    "urge to vomit",
                    "throwing up",
                    "suka",
                    "nagsusuka",
                    "pagsusuka",
                    "nasusuka",
                    "pagduduwal",
                ],
                "typhoid_q6": [
                    "loss of appetite",
                    "lost appetite",
                    "no appetite",
                    "don't want to eat",
                    "weight loss",
                    "losing weight",
                    "nawalan ng gana",
                    "walang gana",
                    "ayaw kumain",
                ],
                "typhoid_q7": [
                    "fatigue",
                    "tired",
                    "weak",
                    "exhausted",
                    "weakness",
                    "pagod",
                    "napapagod",
                    "mahina",
                    "panghihina",
                    "pagkapagod",
                ],
                "typhoid_q8": [
                    "dehydrated",
                    "dehydration",
                    "trouble staying hydrated",
                    "hard to stay hydrated",
                    "thirsty",
                    "uhaw",
                    "tuyo",
                ],
                "typhoid_q9": [
                    "headache",
                    "head ache",
                    "head pain",
                    "sakit ng ulo",
                    "pananakit ng ulo",
                    "masakit ang ulo",
                ],
                "typhoid_q10": [
                    "trouble sleeping",
                    "can't sleep",
                    "difficulty sleeping",
                    "hard to sleep",
                    "insomnia",
                    "nahihirapan matulog",
                    "hindi makatulog",
                ],
                # Dengue (English + Tagalog)
                "dengue_q1": [
                    "pain",
                    "painful",
                    "discomfort",
                    "ache",
                    "aching",
                    "hurt",
                    "sore",
                    "masakit",
                    "pananakit",
                    "sakit",
                    "kirot",
                ],
                "dengue_q2": [
                    "joint pain",
                    "muscle pain",
                    "body pain",
                    "body ache",
                    "muscle ache",
                    "joint ache",
                    "joints",
                    "muscles",
                    "kalamnan",
                    "buto",
                    "katawan",
                ],
                "dengue_q3": [
                    "fever",
                    "high fever",
                    "temperature",
                    "feverish",
                    "lagnat",
                    "mataas na lagnat",
                    "nilalagnat",
                    "temperatura",
                ],
                "dengue_q4": [
                    "rash",
                    "red spots",
                    "skin rash",
                    "spots",
                    "skin eruption",
                    "pantal",
                    "pula",
                    "pulang spot",
                ],
                "dengue_q5": [
                    "redness",
                    "red skin",
                    "inflamed",
                    "inflammation",
                    "swelling",
                    "pula",
                    "namumula",
                    "pamumula",
                    "pamamaga",
                ],
                "dengue_q6": [
                    "eye pain",
                    "pain behind eyes",
                    "retro-orbital",
                    "eyes hurt",
                    "mata",
                    "pananakit ng mata",
                    "likod ng mata",
                    "masakit ang mata",
                ],
                "dengue_q7": [
                    "chills",
                    "shivering",
                    "cold",
                    "freezing",
                    "shaking",
                    "panginginig",
                    "ginaw",
                    "giniginaw",
                    "nanginginig",
                ],
                "dengue_q8": [
                    "nausea",
                    "vomit",
                    "vomiting",
                    "feel like vomiting",
                    "urge to vomit",
                    "throwing up",
                    "suka",
                    "nagsusuka",
                    "pagsusuka",
                    "nasusuka",
                    "pagduduwal",
                ],
                "dengue_q9": [
                    "fatigue",
                    "tired",
                    "weak",
                    "exhausted",
                    "weakness",
                    "pagod",
                    "napapagod",
                    "mahina",
                    "panghihina",
                ],
                "dengue_q10": [
                    "headache",
                    "head ache",
                    "head pain",
                    "sakit ng ulo",
                    "pananakit ng ulo",
                    "masakit ang ulo",
                ],
                # Pneumonia (English + Tagalog)
                "pneumonia_q1": [
                    "mucus",
                    "phlegm",
                    "sputum",
                    "thick",
                    "coughing up",
                    "plema",
                    "sipon",
                ],
                "pneumonia_q2": [
                    "sweat",
                    "sweating",
                    "perspiration",
                    "heavy sweating",
                    "pawis",
                    "pinagpapawisan",
                    "pagpapawis",
                ],
                "pneumonia_q3": [
                    "chest pain",
                    "pain when breathing",
                    "pain when coughing",
                    "chest hurt",
                    "chest discomfort",
                    "dibdib",
                    "pananakit ng dibdib",
                    "masakit ang dibdib",
                    "sakit ng dibdib",
                ],
                "pneumonia_q4": [
                    "pain",
                    "painful",
                    "body pain",
                    "ache",
                    "masakit",
                    "pananakit",
                    "sakit",
                ],
                "pneumonia_q5": [
                    "fatigue",
                    "tired",
                    "weak",
                    "exhausted",
                    "weakness",
                    "pagod",
                    "napapagod",
                    "mahina",
                    "panghihina",
                ],
                "pneumonia_q6": [
                    "chills",
                    "cold",
                    "shivering",
                    "shaking",
                    "panginginig",
                    "ginaw",
                    "giniginaw",
                    "nanginginig",
                ],
                "pneumonia_q7": [
                    "cough",
                    "coughing",
                    "persistent cough",
                    "ubo",
                    "umuubo",
                    "inuubo",
                ],
                "pneumonia_q8": [
                    "fever",
                    "high fever",
                    "temperature",
                    "lagnat",
                    "mataas na lagnat",
                    "nilalagnat",
                ],
                "pneumonia_q9": [
                    "shortness of breath",
                    "difficulty breathing",
                    "rapid breathing",
                    "hard to breathe",
                    "breathless",
                    "breathing",
                    "breath",
                    "hininga",
                    "hinga",
                    "paghinga",
                    "hirap huminga",
                    "nahihirapan huminga",
                ],
                "pneumonia_q10": [
                    "joint pain",
                    "muscle pain",
                    "joints",
                    "muscles",
                    "kalamnan",
                    "buto",
                ],

                # Diarrhea (English + Tagalog)
                "diarrhea_q1": [
                    "watery",
                    "loose",
                    "liquid",
                    "stool",
                    "poop",
                    "bowel",
                    "dumi",
                    "tae",
                    "matubig",
                    "malabnaw",
                ],
                "diarrhea_q2": [
                    "blood",
                    "bloody",
                    "stools",
                    "dugo",
                    "madugo",
                    "may dugo",
                ],
                "diarrhea_q3": [
                    "stomach pain",
                    "abdominal pain",
                    "cramps",
                    "stomach ache",
                    "belly pain",
                    "tiyan",
                    "sakit ng tiyan",
                    "pulikat",
                    "kabag",
                ],
                "diarrhea_q4": [
                    "thirsty",
                    "dry mouth",
                    "dehydrated",
                    "dehydration",
                    "uhaw",
                    "tuyo ang bibig",
                    "tuyot",
                ],
                "diarrhea_q5": [
                    "fever",
                    "high fever",
                    "temperature",
                    "lagnat",
                    "sinat",
                    "mainit",
                ],
                "diarrhea_q6": [
                    "nausea",
                    "vomit",
                    "vomiting",
                    "suka",
                    "nagsusuka",
                    "nasusuka",
                    "duwal",
                ],
                "diarrhea_q7": [
                    "mucus",
                    "slime",
                    "slimy",
                    "uhog",
                    "madulas",
                ],
                "diarrhea_q8": [
                    "urgent",
                    "urgency",
                    "bathroom",
                    "cr",
                    "toilet",
                    "banyo",
                ],
                "diarrhea_q9": [
                    "weak",
                    "weakness",
                    "tired",
                    "fatigue",
                    "hina",
                    "nanghihina",
                    "pagod",
                ],
                "diarrhea_q10": [
                    "appetite",
                    "eat",
                    "food",
                    "gana",
                    "kain",
                ],
                # Measles (English + Tagalog)
                "measles_q1": [
                    "rash",
                    "spots",
                    "face",
                    "pantal",
                    "pula",
                    "mukha",
                ],
                "measles_q2": [
                    "fever",
                    "high fever",
                    "lagnat",
                    "mataas na lagnat",
                ],
                "measles_q3": [
                    "cough",
                    "coughing",
                    "dry cough",
                    "ubo",
                    "umuubo",
                    "inuubo",
                ],
                "measles_q4": [
                    "runny nose",
                    "coryza",
                    "sipon",
                    "tumutulo ang sipon",
                ],
                "measles_q5": [
                    "red eyes",
                    "watery eyes",
                    "conjunctivitis",
                    "pula ang mata",
                    "mata",
                ],
                "measles_q6": [
                    "white spots",
                    "mouth",
                    "spots in mouth",
                    "koplik",
                    "puti",
                    "bibig",
                ],
                "measles_q7": [
                    "light",
                    "sensitive",
                    "eyes",
                    "ilaw",
                    "silaw",
                    "liwanag",
                ],
                "measles_q8": [
                    "muscle pain",
                    "body pain",
                    "ache",
                    "sakit ng katawan",
                    "kalamnan",
                ],
                "measles_q9": [
                    "sore throat",
                    "throat",
                    "lalamunan",
                    "masakit ang lalamunan",
                ],
                "measles_q10": [
                    "tired",
                    "fatigue",
                    "pagod",
                    "hina",
                ],
                # Influenza (English + Tagalog)
                "influenza_q1": [
                    "sudden",
                    "abrupt",
                    "suddenly",
                    "fever",
                    "bigla",
                    "lagnat",
                ],
                "influenza_q2": [
                    "muscle ache",
                    "body ache",
                    "severe pain",
                    "sakit ng katawan",
                    "kalamnan",
                    "ngalay",
                ],
                "influenza_q3": [
                    "chills",
                    "sweat",
                    "shivering",
                    "ginaw",
                    "nanginginig",
                    "pawis",
                ],
                "influenza_q4": [
                    "dry cough",
                    "cough",
                    "ubo",
                ],
                "influenza_q5": [
                    "fatigue",
                    "exhausted",
                    "tired",
                    "pagod",
                    "hapo",
                    "hina",
                ],
                "influenza_q6": [
                    "headache",
                    "head pain",
                    "sakit ng ulo",
                ],
                "influenza_q7": [
                    "sore throat",
                    "lalamunan",
                ],
                "influenza_q8": [
                    "runny nose",
                    "stuffy nose",
                    "blocked nose",
                    "sipon",
                    "barado",
                ],
                "influenza_q9": [
                    "eye pain",
                    "behind eyes",
                    "sakit ng mata",
                ],
                "influenza_q10": [
                    "vomit",
                    "diarrhea",
                    "suka",
                    "tae",
                    "dudumi",
                ],
            }

            keywords = local_evidence_keywords.get(qid, [])
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
            
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": reason,
                            "message": message,
                            "diagnosis": {
                                "pred": pred,
                                "disease": pred,
                                "confidence": confidence,
                                "uncertainty": uncertainty,
                                "probs": probs,
                                "model_used": model_used,
                                "top_diseases": top_diseases,
                                "mean_probs": mean_probs,
                                "is_valid": is_exhausted_valid,
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
            return (
                jsonify(
                    {
                        "data": {
                            "should_stop": True,
                            "reason": "High confidence reached",
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
        import traceback

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


@app.route("/diagnosis/explain", methods=["POST"])
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


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        "error": "BAD_REQUEST",
        "message": f"Bad Request: {error.description if hasattr(error, 'description') else str(error)}",
        "details": str(error)
    }), 400


@app.errorhandler(415)
def unsupported_media_type(error):
    return jsonify({
        "error": "UNSUPPORTED_MEDIA_TYPE",
        "message": "Unsupported Media Type: Content-Type must be 'application/json'",
        "details": str(error)
    }), 415


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405


# --- K-means clustering endpoint ---
from kmeans_cluster import fetch_patient_data, run_kmeans, get_cluster_statistics

# --- Surveillance / Outbreak Monitoring endpoint ---
from surveillance import detect_outbreaks, get_outbreak_summary


@app.route("/api/patient-clusters", methods=["GET"])
def patient_clusters():
    try:
        # You may want to allow n_clusters as a query param
        # Default to 4 clusters to align with 4 primary diseases
        n_clusters = int(request.args.get("n_clusters", 4))

        def parse_bool(value, default=True):
            if value is None:
                return default
            return str(value).lower() in {"1", "true", "yes", "on"}

        include_age = parse_bool(request.args.get("age"), True)
        include_gender = parse_bool(request.args.get("gender"), True)
        include_city = parse_bool(request.args.get("city"), True)
        include_region = parse_bool(request.args.get("region"), True)
        include_disease = parse_bool(request.args.get("disease"), True)

        # Fetch data from PostgreSQL using DATABASE_URL
        data, patient_info = fetch_patient_data(
            include_age=include_age,
            include_gender=include_gender,
            include_city=include_city,
            include_region=include_region,
            include_disease=include_disease,
        )

        if data.size == 0:
            return jsonify({"error": "No patient data available"}), 404

        # Run K-means clustering
        clusters, centers = run_kmeans(data, n_clusters=n_clusters)

        # Get cluster statistics
        cluster_stats = get_cluster_statistics(patient_info, clusters, n_clusters)

        # Add cluster assignment to each patient
        for i, patient in enumerate(patient_info):
            patient["cluster"] = int(clusters[i])

        print(
            f"[KMEANS] Clustered {len(patient_info)} patients into {n_clusters} clusters"
        )
        for stat in cluster_stats:
            print(
                f"[KMEANS] Cluster {stat['cluster_id']}: {stat['count']} patients, avg age {stat['avg_age']}"
            )

        return jsonify(
            {
                "n_clusters": n_clusters,
                "total_patients": len(patient_info),
                "cluster_statistics": cluster_stats,
                "patients": patient_info,
                "centers": centers.tolist(),
            }
        )
    except Exception as e:
        import traceback

        error_details = traceback.format_exc()
        print(f"ERROR in patient_clusters: {str(e)}")
        print(error_details)
        return jsonify({"error": str(e), "details": error_details}), 500


@app.route("/api/surveillance/outbreaks", methods=["GET"])
def surveillance_outbreaks():
    """
    Detect anomalous disease patterns using Isolation Forest.
    Query params:
      - contamination: Expected proportion of outliers (default: 0.05 = 5%)
      - summary: If 'true', return aggregated summary instead of full details
    Returns JSON with anomalies, statistics, and outbreak alert status.
    """
    try:
        # Get contamination parameter (expected proportion of outliers)
        contamination = float(request.args.get("contamination", 0.05))

        # Validate contamination range
        if not (0.0 < contamination < 0.5):
            return (
                jsonify(
                    {
                        "error": "Invalid contamination value",
                        "details": "Contamination must be between 0.0 and 0.5",
                    }
                ),
                400,
            )

        # Check if summary mode is requested
        summary_mode = request.args.get("summary", "false").lower() == "true"

        if summary_mode:
            # Return aggregated summary for dashboard
            result = get_outbreak_summary(contamination=contamination)
        else:
            # Return full details
            result = detect_outbreaks(contamination=contamination)

        print(
            f"[SURVEILLANCE] Analyzed {result['total_analyzed']} diagnoses, found {result['anomaly_count']} anomalies (contamination={contamination})"
        )

        if result["outbreak_alert"]:
            print(
                f"[SURVEILLANCE] ⚠️ OUTBREAK ALERT: Anomaly count ({result['anomaly_count']}) exceeds threshold"
            )

        return jsonify(result)

    except ValueError as e:
        error_msg = str(e)
        if "DATABASE_URL" in error_msg:
            return (
                jsonify(
                    {
                        "error": "Database configuration error",
                        "details": "DATABASE_URL environment variable is not set",
                    }
                ),
                500,
            )
        return jsonify({"error": "Invalid parameter", "details": error_msg}), 400

    except Exception as e:
        import traceback

        error_details = traceback.format_exc()
        print(f"ERROR in surveillance_outbreaks: {str(e)}")
        print(error_details)
        return jsonify({"error": str(e), "details": error_details}), 500


@app.route("/api/patient-clusters/silhouette", methods=["GET"])
def patient_clusters_silhouette():
    """Evaluate KMeans clustering quality across a range of k using silhouette score.
    Query params:
      - range: e.g. "3-10" or "4" (defaults to 3-10)
      - age, gender, disease, region, city: boolean flags for variable selection
    Returns JSON with best k and per-k metrics (silhouette, inertia, cluster sizes).
    """
    try:
        # Parse k range
        range_param = request.args.get("range", "3-10")
        try:
            parts = [int(p) for p in range_param.split("-") if p.strip()]
            if len(parts) == 1:
                k_min = k_max = parts[0]
            else:
                k_min, k_max = parts[0], parts[1]
        except Exception:
            k_min, k_max = 3, 10

        # Parse variable selection parameters
        def parse_bool(value, default=True):
            if value is None:
                return default
            return str(value).lower() in {"1", "true", "yes", "on"}

        include_age = parse_bool(request.args.get("age"), True)
        include_gender = parse_bool(request.args.get("gender"), True)
        include_city = parse_bool(request.args.get("city"), True)
        include_region = parse_bool(request.args.get("region"), True)
        include_disease = parse_bool(request.args.get("disease"), True)

        # Fetch encoded data with variable selection
        data, _ = fetch_patient_data(
            include_age=include_age,
            include_gender=include_gender,
            include_city=include_city,
            include_region=include_region,
            include_disease=include_disease,
        )
        n_samples = len(data)
        if n_samples < 3:
            return (
                jsonify(
                    {
                        "error": "Not enough samples for silhouette (need >= 3)",
                        "n_samples": n_samples,
                    }
                ),
                400,
            )

        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score
        from collections import Counter

        results = []
        for k in range(k_min, k_max + 1):
            # Valid k range for silhouette: 2 <= k < n_samples
            if k < 2 or k >= n_samples:
                continue
            try:
                model = KMeans(n_clusters=k, random_state=42, n_init=10)
                labels = model.fit_predict(data)
                score = float(silhouette_score(data, labels))
                counts = Counter(labels.tolist())
                results.append(
                    {
                        "k": k,
                        "silhouette": round(score, 4),
                        "inertia": float(model.inertia_),
                        "cluster_sizes": dict(counts),
                    }
                )
            except Exception as e:
                # Skip problematic k
                results.append({"k": k, "error": str(e)})

        # Sort by silhouette desc, filter only entries with silhouette
        scored = [r for r in results if "silhouette" in r]
        best = None
        if scored:
            best = sorted(scored, key=lambda x: x["silhouette"], reverse=True)[0]

        return jsonify(
            {
                "n_samples": n_samples,
                "range": [k_min, k_max],
                "best": best,
                "results": results,
            }
        )
    except Exception as e:
        import traceback

        error_details = traceback.format_exc()
        return jsonify({"error": str(e), "details": error_details}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    # Enable debug autoreload by default in local dev. Override via FLASK_DEBUG=0 to disable.
    debug_env = os.getenv("FLASK_DEBUG", "1").strip().lower()
    debug_mode = debug_env in ("1", "true", "yes", "on")
    app.run(debug=debug_mode, use_reloader=debug_mode, host="0.0.0.0", port=port)