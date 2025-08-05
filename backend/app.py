from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Initialize ML model
predictor = None
model_loaded = False

# Try to load the trained model on startup
try:
    from train_naive_bayes import NaiveBayesDiseasePredictor

    predictor = NaiveBayesDiseasePredictor()

    if os.path.exists("models"):
        model_loaded = predictor.load_model("models")
        if model_loaded:
            print("✅ Naive Bayes model loaded successfully!")
        else:
            print(
                "❌ Failed to load model. Train the model first with: python quick_start.py"
            )
    else:
        print(
            "⚠️ No trained model found. Run 'python quick_start.py' to train the model."
        )

except ImportError as e:
    print(f"⚠️ Could not import training module: {e}")
except Exception as e:
    print(f"⚠️ Error during model loading: {e}")


@app.route("/classifications/", methods=["GET"])
def index():
    """Main index endpoint with model status"""
    return jsonify(
        {
            "message": "AI'll Be Sick - Disease Detection API",
            "status": "online",
            "model_loaded": model_loaded,
            "model_type": "Naive Bayes" if model_loaded else "None",
            "features": (
                [
                    "Disease prediction using Naive Bayes",
                    "Trained on symbipredict_2022.csv dataset",
                    "Probability-based symptom analysis",
                ]
                if model_loaded
                else ["Model not loaded - train first"]
            ),
        }
    )


@app.route("/classifications/new", methods=["POST"])
def new_case():
    """Enhanced disease detection using trained Naive Bayes model"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        symptoms = data.get("symptoms", [])

        if not symptoms:
            return jsonify({"error": "No symptoms provided"}), 400

        print("Detecting disease for symptoms:", symptoms)

        if model_loaded and predictor:
            # Convert symptom list to feature dictionary for the model
            symptoms_dict = {}

            # Map symptoms to model features
            # This will depend on your dataset column names
            for symptom in symptoms:
                symptom_clean = symptom.lower().strip().replace(" ", "_")
                # Try to match with model features
                for feature in predictor.feature_columns:
                    if (
                        symptom_clean in feature.lower()
                        or feature.lower() in symptom_clean
                    ):
                        symptoms_dict[feature] = 1
                        break

            # If no direct matches, try some common mappings
            if not symptoms_dict:
                # Create generic symptom features (you can customize these)
                common_mappings = {
                    "fever": ["fever", "high_temperature", "temperature"],
                    "cough": ["cough", "coughing"],
                    "headache": ["headache", "head_pain"],
                    "fatigue": ["fatigue", "tiredness", "weakness"],
                    "nausea": ["nausea", "vomiting"],
                    "diarrhea": ["diarrhea", "loose_stool"],
                    "sore throat": ["sore_throat", "throat_pain"],
                    "muscle pain": ["muscle_pain", "body_ache", "myalgia"],
                    "shortness of breath": ["shortness_breath", "dyspnea"],
                    "chest pain": ["chest_pain"],
                }

                for symptom in symptoms:
                    symptom_clean = symptom.lower().strip()
                    for mapped_symptom, variations in common_mappings.items():
                        if any(var in symptom_clean for var in variations):
                            # Find matching feature in model
                            for feature in predictor.feature_columns:
                                if any(var in feature.lower() for var in variations):
                                    symptoms_dict[feature] = 1
                                    break

            # Get ML prediction
            prediction = predictor.predict_disease(symptoms_dict)

            if "error" in prediction:
                # Fallback to simple prediction
                detected_disease = predict_disease_simple(symptoms)
                response_data = {
                    "data": detected_disease,
                    "confidence": 0.5,
                    "model_used": "Fallback (rule-based)",
                    "note": "Model prediction failed, using simple rules",
                    "error": prediction["error"],
                }
            else:
                response_data = {
                    "data": prediction["predicted_disease"],
                    "confidence": prediction["confidence"],
                    "all_probabilities": prediction["all_probabilities"],
                    "model_used": "Naive Bayes",
                    "features_matched": len(symptoms_dict),
                    "input_symptoms": symptoms,
                }

        else:
            # Fallback to simple rule-based prediction
            detected_disease = predict_disease_simple(symptoms)
            response_data = {
                "data": detected_disease,
                "confidence": 0.5,
                "model_used": "Rule-based (no ML model)",
                "note": "Train ML model with 'python quick_start.py'",
            }

        return jsonify(response_data), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def predict_disease_simple(symptoms):
    """Simple rule-based fallback prediction"""
    symptoms_lower = [s.lower() for s in symptoms]

    # Simple rule-based logic as fallback
    if any(s in symptoms_lower for s in ["fever", "headache", "joint pain", "rash"]):
        return "Dengue"
    elif any(
        s in symptoms_lower for s in ["cough", "fever", "weight loss", "night sweats"]
    ):
        return "Tuberculosis"
    elif any(s in symptoms_lower for s in ["fever", "cough", "fatigue", "muscle pain"]):
        return "Influenza"
    elif any(s in symptoms_lower for s in ["chest pain", "shortness of breath"]):
        return "Respiratory condition"
    elif any(s in symptoms_lower for s in ["diarrhea", "nausea", "vomiting"]):
        return "Gastroenteritis"
    else:
        return "General illness"


@app.route("/train", methods=["POST"])
def train_model():
    """Endpoint to trigger model training"""
    try:
        print("Starting model training...")

        # Import and run training
        from train_naive_bayes import main as train_main

        train_main()

        # Reload the model
        global model_loaded, predictor
        if predictor:
            model_loaded = predictor.load_model("models")

        return (
            jsonify(
                {
                    "message": "Model training completed successfully",
                    "model_loaded": model_loaded,
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"Training failed: {str(e)}"}), 500


@app.route("/model/status", methods=["GET"])
def model_status():
    """Get model status and metadata"""
    if model_loaded and predictor:
        return jsonify(
            {
                "model_loaded": True,
                "model_metadata": predictor.model_metadata,
                "features_count": len(predictor.feature_columns),
                "diseases_count": len(predictor.disease_mapping),
                "diseases": list(predictor.disease_mapping.values()),
            }
        )
    else:
        return jsonify(
            {
                "model_loaded": False,
                "message": "No model loaded. Train first with 'python quick_start.py'",
            }
        )


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
