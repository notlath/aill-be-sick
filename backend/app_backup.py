from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Initialize ML model
predictor = None
model_loaded = False
available_symptoms = []

# Try to load the trained model on startup
try:
    from train_naive_bayes import NaiveBayesDiseasePredictor

    predictor = NaiveBayesDiseasePredictor()

    if os.path.exists("models"):
        model_loaded = predictor.load_model("models")
        if model_loaded:
            print("✅ Naive Bayes model loaded successfully!")
            # Load available symptoms for reference
            try:
                metadata_path = "models/model_metadata.json"
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                        available_symptoms = metadata.get('feature_columns', [])
                        print(f"📊 Loaded {len(available_symptoms)} symptoms")
            except Exception as e:
                print(f"⚠️ Could not load symptom list: {e}")
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
    response_data = {
        "message": "AI'll Be Sick - Disease Detection API",
        "status": "online",
        "model_loaded": model_loaded,
        "model_type": "Naive Bayes" if model_loaded else "None",
        "available_symptoms_count": len(available_symptoms),
        "features": [
            "Disease prediction using Naive Bayes",
            "Trained on symbipredict_2022.csv dataset",
            "41 disease classes supported",
            "132 symptom features"
        ] if model_loaded else ["No model loaded - train first"]
    }
    
    # Include sample symptoms for testing
    if model_loaded and available_symptoms:
        response_data["sample_symptoms"] = available_symptoms[:10]
    
    return jsonify(response_data)


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
            
            # Direct symptom matching with available features
            for symptom in symptoms:
                symptom_clean = symptom.lower().strip().replace(" ", "_")
                
                # Try exact match first
                if symptom_clean in available_symptoms:
                    symptoms_dict[symptom_clean] = 1
                else:
                    # Try partial matching
                    for feature in available_symptoms:
                        if symptom_clean in feature or feature in symptom_clean:
                            symptoms_dict[feature] = 1
                            break

            print(f"Mapped symptoms: {symptoms_dict}")
            
            if symptoms_dict:
                # Get ML prediction
                prediction = predictor.predict_disease(symptoms_dict)
                
                response_data = {
                    "data": prediction['predicted_disease'],
                    "confidence": prediction['confidence'],
                    "all_probabilities": prediction.get('all_probabilities', {}),
                    "model_used": "Naive Bayes",
                    "symptoms_mapped": list(symptoms_dict.keys()),
                    "input_symptoms": symptoms
                }
            else:
                # No symptoms could be mapped
                response_data = {
                    "data": "Unknown - symptoms not recognized",
                    "confidence": 0.0,
                    "error": "Could not map input symptoms to model features",
                    "available_symptoms": available_symptoms[:20],  # Show first 20 for reference
                    "input_symptoms": symptoms
                }
        else:
            # Fallback when model is not loaded
            response_data = {
                "data": "Model not available",
                "confidence": 0.0,
                "error": "ML model not loaded. Run 'python quick_start.py' to train.",
                "input_symptoms": symptoms
            }

        return jsonify(response_data), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

            return jsonify(response_data), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/symptoms", methods=["GET"])
def get_symptoms():
    """Get list of available symptoms for the model"""
    if model_loaded and available_symptoms:
        return jsonify({
            "available_symptoms": available_symptoms,
            "total_count": len(available_symptoms),
            "sample_usage": {
                "endpoint": "/classifications/new",
                "method": "POST",
                "body": {
                    "symptoms": ["itching", "skin_rash", "fatigue"]
                }
            }
        })
    else:
        return jsonify({
            "error": "Model not loaded",
            "message": "Train the model first with: python quick_start.py"
        }), 500


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
