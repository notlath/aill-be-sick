"""
Application package for the Flask backend.

This module serves dual purposes:
1. Houses the `create_app()` factory for production use (via run.py).
2. Provides backward-compatible top-level exports so existing tests
   that do `from app import app, QUESTION_BANK_EN, ...` continue to work.
"""

import os
import json
import logging
import secrets
from flask import Flask
from flask_cors import CORS

from app.services.verification import (
    OntologyBuilder,
    VerificationLayer,
    extract_clinical_concepts,
)  # noqa: F401 — re-exported

# Re-export config at package level for `from app import config`
import app.config as config  # noqa: F401


# ── Question Banks ────────────────────────────────────────────────────────────


def _load_question_banks():
    """Load English and Tagalog question banks from JSON files."""
    app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    en_path = os.path.join(app_root, "question_bank.json")
    tl_path = os.path.join(app_root, "question_bank_tagalog.json")

    with open(en_path, "r", encoding="utf-8") as f:
        qb_en = json.load(f)

    with open(tl_path, "r", encoding="utf-8") as f:
        qb_tl = json.load(f)

    return qb_en, qb_tl


QUESTION_BANK_EN, QUESTION_BANK_TL = _load_question_banks()

# Legacy compat: QUESTION_BANK defaults to the English bank
QUESTION_BANK = QUESTION_BANK_EN


# ── App Factory ───────────────────────────────────────────────────────────────


def create_app():
    """
    Application factory.
    Returns a fully configured Flask app with all blueprints registered.
    """
    flask_app = Flask(__name__)

    # --- Session / Security Configuration ---
    flask_app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)
    if not os.environ.get("FLASK_SECRET_KEY"):
        logging.warning(
            "FLASK_SECRET_KEY is not set — using a random key. "
            "Sessions will not persist across restarts. "
            "Set FLASK_SECRET_KEY in your environment for production."
        )
    flask_app.config["SESSION_COOKIE_HTTPONLY"] = True
    flask_app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    flask_app.config["SESSION_COOKIE_SECURE"] = (
        os.environ.get(
            "SESSION_COOKIE_SECURE",
            "true" if os.environ.get("FLASK_ENV") != "development" else "false",
        ).lower()
        == "true"
    )

    # --- CORS ---
    allowed_origins = list(
        filter(
            None,
            [
                "http://localhost:3000",
                "https://aill-be-sick.vercel.app",
                os.getenv("FRONTEND_URL"),
            ],
        )
    )
    CORS(
        flask_app,
        origins=allowed_origins,
        supports_credentials=True,
    )

    # --- Store shared resources on app config ---
    flask_app.config["QUESTION_BANK_EN"] = QUESTION_BANK_EN
    flask_app.config["QUESTION_BANK_TL"] = QUESTION_BANK_TL

    # Neuro-Symbolic Verification Layer
    ontology_builder = OntologyBuilder(QUESTION_BANK_EN, QUESTION_BANK_TL)
    verification_layer = VerificationLayer(ontology_builder)
    flask_app.config["VERIFICATION_LAYER"] = verification_layer

    # --- Register Blueprints ---
    from app.api.main import main_bp
    from app.api.diagnosis import diagnosis_bp
    from app.api.cluster import cluster_bp
    from app.api.surveillance import surveillance_bp
    from app.api.outbreak import outbreak_bp
    from app.api.user import user_bp

    flask_app.register_blueprint(main_bp)
    flask_app.register_blueprint(diagnosis_bp)
    flask_app.register_blueprint(cluster_bp)
    flask_app.register_blueprint(surveillance_bp)
    flask_app.register_blueprint(outbreak_bp, url_prefix="/api/surveillance/outbreaks")
    flask_app.register_blueprint(user_bp)

    return flask_app


# ── Backward-Compatible Module-Level `app` Instance ──────────────────────────
# Tests do `from app import app` and use `app.test_client()`.
# Allow notebooks and utility imports to disable eager app bootstrapping so
# importing submodules does not trigger circular imports.
if os.getenv("APP_SKIP_AUTOCREATE", "false").lower() not in ("1", "true", "yes"):
    app = create_app()
else:
    app = None
