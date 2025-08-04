from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration


@app.route("/classifications/", methods=["GET"])
def index():
    """Main index endpoint - equivalent to Django's index view"""
    return jsonify({"message": "Hello, world!"})


@app.route("/classifications/new", methods=["POST"])
def new_case():
    """Create new case endpoint - equivalent to Django's new_case view"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        symptoms = data.get("symptoms", [])

        print("Detecting disease for symptoms:", symptoms)

        # Insert machine learning stuff
        detected_disease = "Jabetis"  # Placeholder for actual disease detection logic

        return jsonify({"data": detected_disease}), 201

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
