import traceback
from flask import Blueprint, request, jsonify, current_app

from classifier import classifier, explainer
import config
from utils import _count_words, normalize_symptoms

# Use a Blueprint so routes can be registered from the main app without circular imports
bp = Blueprint("diagnosis", __name__)


@bp.route("/diagnosis/", methods=["GET"])
def index():
    return jsonify({"message": "Hello, world!"})


@bp.route("/diagnosis/new", methods=["POST"])
def new_case():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        symptoms = (data.get("symptoms") or "").strip()
        if not symptoms:
            return jsonify({"error": "Symptoms cannot be empty"}), 400

        # Quick pre-filter
        if _count_words(symptoms) < config.SYMPTOM_MIN_WORDS and len(symptoms) < config.SYMPTOM_MIN_CHARS:
            return jsonify({"error": "INSUFFICIENT_SYMPTOM_EVIDENCE"}), 422

        pred, confidence, uncertainty, probs, model_used, top_diseases, mean_probs = classifier(symptoms)

        # Gate low-confidence / high-uncertainty predictions
        if confidence < config.SYMPTOM_MIN_CONF or uncertainty > config.SYMPTOM_MAX_MI:
            return jsonify({
                "error": "INSUFFICIENT_SYMPTOM_EVIDENCE",
                "details": {"confidence": confidence, "mutual_information": uncertainty},
            }), 422

        return jsonify({"data": {"pred": pred, "confidence": confidence, "uncertainty": uncertainty, "probs": probs, "model_used": model_used, "disease": pred, "top_diseases": top_diseases, "mean_probs": mean_probs.tolist()}}), 201

    except Exception as e:
        msg = str(e)
        if "INSUFFICIENT_SYMPTOM_EVIDENCE:" in msg:
            reason = msg.split("INSUFFICIENT_SYMPTOM_EVIDENCE:")[-1]
            return jsonify({"error": "INSUFFICIENT_SYMPTOM_EVIDENCE", "details": {"reason": reason}}), 422
        return jsonify({"error": "INTERNAL_ERROR", "message": msg}), 500


@bp.route("/diagnosis/follow-up", methods=["POST"])
def follow_up_question():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        current_disease = data.get("disease", "")
        confidence = data.get("confidence", 0)
        uncertainty = data.get("uncertainty", 1)
        mode = data.get("mode", "adaptive")
        asked_questions = data.get("asked_questions", [])
        top_diseases = data.get("top_diseases", [])
        symptoms = data.get("symptoms", "")

        # detect language simply based on keywords in symptoms
        lang = "tl" if any(k in (symptoms or "").lower() for k in ["lagnat", "ubo", "pagod"]) else "en"
        QUESTION_BANK_EN = current_app.config.get("QUESTION_BANK_EN", {})
        QUESTION_BANK_TL = current_app.config.get("QUESTION_BANK_TL", {})
        QUESTION_BANK = QUESTION_BANK_TL if lang in ["tl", "fil"] else QUESTION_BANK_EN

        if current_disease not in QUESTION_BANK:
            return jsonify({"error": f"No questions available for disease: {current_disease}"}), 400

        primary_questions = QUESTION_BANK[current_disease]
        available_questions = [q for q in primary_questions if q["id"] not in asked_questions]
        if not available_questions:
            return jsonify({"data": {"should_stop": True, "reason": "No more questions available"}}), 200

        # simple priority selection: primary category & weight
        selected = max(available_questions, key=lambda q: (q.get("category") == "primary", q.get("weight", 0)))
        return jsonify({"data": {"should_stop": False, "question": {"id": selected["id"], "question": selected["question"], "positive_symptom": selected.get("positive_symptom"), "negative_symptom": selected.get("negative_symptom"), "category": selected.get("category")}}}), 200

    except Exception as e:
        error_msg = str(e)
        error_details = traceback.format_exc()
        return jsonify({"error": "INTERNAL_ERROR", "message": error_msg, "details": error_details}), 500


@bp.route("/diagnosis/explain", methods=["POST"])
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
        return jsonify({"symptoms": result.get("symptoms"), "tokens": result.get("tokens")}), 200

    except Exception as e:
        error_msg = str(e)
        error_details = traceback.format_exc()
        return jsonify({"error": "INTERNAL_ERROR", "message": error_msg, "details": error_details}), 500


@bp.app_errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@bp.app_errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405
