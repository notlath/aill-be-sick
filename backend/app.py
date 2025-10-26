import json
import os
from flask import Flask
from flask_cors import CORS
import config

app = Flask(__name__)

# Load question banks (English and Tagalog)
BASEDIR = os.path.dirname(__file__)

with open(os.path.join(BASEDIR, "question_bank.json"), "r", encoding="utf-8") as f:
    QUESTION_BANK_EN = json.load(f)

with open(os.path.join(BASEDIR, "question_bank_tagalog.json"), "r", encoding="utf-8") as f:
    QUESTION_BANK_TL = json.load(f)

# Configure CORS
CORS(app, origins=config.CORS_ORIGINS)
# Expose question banks via app config so routes (blueprint) can access them
app.config["QUESTION_BANK_EN"] = QUESTION_BANK_EN
app.config["QUESTION_BANK_TL"] = QUESTION_BANK_TL

# Import routes and register the blueprint (avoids circular import when running app.py)
import routes  # noqa: E402,F401
app.register_blueprint(routes.bp)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    app.run(debug=False, host="0.0.0.0", port=port)