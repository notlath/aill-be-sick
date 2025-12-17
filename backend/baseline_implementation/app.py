import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from classifier import classifier

load_dotenv()

app = Flask(__name__)

CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://aill-be-sick.vercel.app/",
        os.getenv("FRONTEND_URL", "*"),
    ],
)


@app.route("/health", methods=["GET"])
def health_check():
    return {"status": "ok"}, 200


@app.route("/diagnosis/new", methods=["POST"])
def new_case():
    data = request.get_json(force=True)

    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    symptoms = data.get("symptoms", "").strip()

    print(f"\n[NEW CASE] Symptoms: {symptoms}")

    if not symptoms:
        return jsonify({"error": "Symptoms cannot be empty"}), 400

    try:
        result = classifier(symptoms)

        return jsonify(result), 200
    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] {error_msg}")

        if "INSUFFICIENT_SYMPTOM_EVIDENCE" in error_msg:
            return jsonify({"error": "INSUFFICIENT_SYMPTOM_EVIDENCE", "message": "Not enough symptom evidence provided."}), 400
        elif "UNSUPPORTED_LANGUAGE" in error_msg:
            lang = error_msg.split(":")[1]
            return jsonify({"error": "UNSUPPORTED_LANGUAGE", "message": f"Language '{lang}' is not supported."}), 400
        else:
            return jsonify({"error": "INTERNAL_SERVER_ERROR", "message": "An internal server error occurred."}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    # Enable debug autoreload by default in local dev. Override via FLASK_DEBUG=0 to disable.
    debug_env = os.getenv("FLASK_DEBUG", "1").strip().lower()
    debug_mode = debug_env in ("1", "true", "yes", "on")
    app.run(debug=debug_mode, use_reloader=debug_mode,
            host="0.0.0.0", port=port)
