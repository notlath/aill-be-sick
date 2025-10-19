from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from transformers import pipeline
from langdetect import detect
import numpy as np
import torch
import numpy as np
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from scipy.stats import entropy
import os

app = Flask(__name__)
CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://aill-be-sick.vercel.app/",
        os.getenv("FRONTEND_URL", "*"),
    ],
)

eng_model_path = "notlath/BioClinical-ModernBERT-base-Symptom2Disease_WITH-DROPOUT-42"
fil_model_path = "notlath/RoBERTa-Tagalog-base-Symptom2Disease_WITH-DROPOUT-42"


class MonteCarloDropoutClassifier:
    def __init__(
        self, model_path, n_iterations=50, inference_dropout_rate=0.05, device=None
    ):
        self.n_iterations = n_iterations
        self.inference_dropout_rate = inference_dropout_rate  # NEW PARAMETER
        self.device = device or torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model.to(self.device)
        self.model.eval()

    def enable_dropout_with_rate(self, dropout_rate=None):
        """
        Enable dropout layers with a specified rate (or use default).
        For MC Dropout, use LOWER rate than training (e.g., 0.05 instead of 0.1)
        """
        if dropout_rate is None:
            dropout_rate = self.inference_dropout_rate

        for module in self.model.modules():
            if module.__class__.__name__.startswith("Dropout"):
                # Set custom dropout rate for inference
                module.p = dropout_rate
                module.train()
            elif "Norm" in module.__class__.__name__:
                module.eval()

    def predict_with_uncertainty(self, text):
        inputs = self.tokenizer(
            text, return_tensors="pt", truncation=True, padding=True
        ).to(self.device)

        # Use LOWER dropout rate for inference
        self.enable_dropout_with_rate(dropout_rate=self.inference_dropout_rate)

        all_predictions = []

        with torch.no_grad():
            for _ in range(self.n_iterations):
                outputs = self.model(**inputs)
                probabilities = torch.softmax(outputs.logits, dim=-1)
                all_predictions.append(probabilities.cpu().numpy())

        # Stack predictions (shape: n_iterations, batch_size, n_classes)
        all_predictions = np.stack(all_predictions)

        # Calculate statistics
        mean_probs = all_predictions.mean(axis=0)  # Average probabilities
        std_probs = all_predictions.std(axis=0)  # Standard deviation

        # Predicted class (highest mean probability)
        predicted_class = mean_probs.argmax(axis=-1)
        confidence = mean_probs.max(axis=-1)

        # Uncertainty metrics
        predictive_entropy = entropy(mean_probs, axis=-1)
        mutual_information = self.compute_mutual_information(all_predictions)

        return {
            "predicted_class": predicted_class,
            "predicted_label": [
                self.model.config.id2label[idx] for idx in predicted_class
            ],
            "mean_probabilities": mean_probs,
            "std_probabilities": std_probs,
            "confidence": confidence,
            "predictive_entropy": predictive_entropy,
            "mutual_information": mutual_information,
            "all_predictions": all_predictions,  # For further analysis
        }

    def compute_mutual_information(self, predictions):
        """
        Compute mutual information as measure of epistemic uncertainty.
        MI = H(E[p]) - E[H(p)]
        """
        # Expected entropy: average of entropies
        expected_entropy = np.mean([entropy(p, axis=-1) for p in predictions], axis=0)

        # Entropy of expected probabilities
        mean_probs = predictions.mean(axis=0)
        entropy_of_expected = entropy(mean_probs, axis=-1)

        return entropy_of_expected - expected_entropy


eng_classifier = MonteCarloDropoutClassifier(
    eng_model_path, n_iterations=20, inference_dropout_rate=0.05
)
fil_classifier = MonteCarloDropoutClassifier(
    fil_model_path, n_iterations=20, inference_dropout_rate=0.05
)


def classifier(text):
    lang = detect(text)

    if lang == "en":  # English
        result = eng_classifier.predict_with_uncertainty(text)
        pred = result["predicted_label"][0]
        confidence = float(result["confidence"][0])  # Return as float, not string
        uncertainty = float(
            result["mutual_information"][0]
        )  # Return as float, not string
        sorted_idx = result["mean_probabilities"][0].argsort()[-5:][::-1]
        probs = []

        print("Result:")
        print(result)

        for idx in sorted_idx:
            label = eng_classifier.model.config.id2label[idx]
            prob = float(result["mean_probabilities"][0][idx])
            probs.append(f"{label}: {prob*100:.2f}%")  # Format here instead

        return pred, confidence, uncertainty, probs, "BioClinical ModernBERT"

    elif lang in ["tl", "fil"]:  # Tagalog / Filipino
        result = fil_classifier.predict_with_uncertainty(text)
        pred = result["predicted_label"][0]
        confidence = float(result["confidence"][0])  # Return as float, not string
        uncertainty = float(
            result["mutual_information"][0]
        )  # Return as float, not string
        sorted_idx = result["mean_probabilities"][0].argsort()[-5:][::-1]
        probs = []

        print("Result:")
        print(result)

        for idx in sorted_idx:
            label = fil_classifier.model.config.id2label[idx]
            prob = float(result["mean_probabilities"][0][idx])
            probs.append(f"{label}: {prob*100:.2f}%")  # Format here instead

        return pred, confidence, uncertainty, probs, "RoBERTa Tagalog"

    else:
        # Handle unsupported languages
        raise ValueError(f"Unsupported language: {lang}")


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

        pred, confidence, uncertainty, probs, model_used = classifier(symptoms)

        return (
            jsonify(
                {
                    "data": {
                        "pred": pred,
                        "confidence": confidence,
                        "uncertainty": uncertainty,
                        "probs": probs,
                        "model_used": model_used,
                    }
                }
            ),
            201,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405


if __name__ == "__main__":
    # Railway provides PORT via environment variable
    port = int(os.getenv("PORT", 8000))
    app.run(debug=False, host="0.0.0.0", port=port)
