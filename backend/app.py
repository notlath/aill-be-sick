from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from transformers import pipeline
from langdetect import detect
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

eng_model_path = "notlath/BioClinical-ModernBERT-base-Symptom2Disease_WITH-DROPOUT-42"
eng_classifier = pipeline(
    "text-classification",
    model=eng_model_path,
    tokenizer=eng_model_path,
    device=0,  # Use GPU if available; set to -1 for CPU
)

fil_model_path = "notlath/RoBERTa-Tagalog-base-Symptom2Disease_WITH-DROPOUT-42"
fil_classifier = pipeline(
    "text-classification",
    model=fil_model_path,
    tokenizer=fil_model_path,
    device=0,  # Use GPU if available; set to -1 for CPU
)

def classifier(text):
    lang = detect(text)

    if lang == "en": # English
        result = eng_classifier(text)[0]
        pred = result['label']
        probs = result['score']
        
        return pred, probs, "BioClinical-ModernBERT"

    elif lang in ["tl", "fil"]:  # Tagalog / Filipino
        result = fil_classifier(text)[0]
        pred = result['label']
        probs = result['score']
        return pred, probs, "RoBERTa-Tagalog"

@app.route("/diagnosis/", methods=["GET"])
def index():
    """Main index endpoint - equivalent to Django's index view"""
    return jsonify({"message": "Hello, world!"})


@app.route("/diagnosis/new", methods=["POST"])
def new_case():
    """Create new case endpoint - equivalent to Django's new_case view"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        symptoms = data.get("symptoms", "")

        disease, score, model_used = classifier(symptoms)

        return jsonify({"data": {"disease": disease, "score": score, "model_used": model_used}}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
