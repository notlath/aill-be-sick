"""
DiagnosisSession model - Server-side session state for the follow-up questionnaire.

Instead of bouncing full probability arrays and question lists between
the frontend and backend via cookies, this model stores all diagnosis state
in the database. The frontend only holds a lightweight `session_id`.
"""

import uuid
import json
import time as _time

from sqlalchemy import text
from app.utils.database import get_db_engine


def _now():
    return _time.time()


def create_session(
    *,
    chat_id: str,
    initial_symptoms: str,
    base_probs: list,
    current_probs: list,
    disease: str,
    confidence: float,
    uncertainty: float,
    top_diseases: list,
    model_used: str,
    lang: str,
) -> str:
    """
    Create a new DiagnosisSession row and return its UUID.
    """
    session_id = str(uuid.uuid4())
    engine = get_db_engine()

    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO diagnosis_sessions
                    (session_id, chat_id, initial_symptoms, base_probs,
                     current_probs, disease, confidence, uncertainty,
                     top_diseases, model_used, lang, asked_questions,
                     evidence_texts, question_answers, created_at, updated_at)
                VALUES
                    (:session_id, :chat_id, :initial_symptoms, :base_probs,
                     :current_probs, :disease, :confidence, :uncertainty,
                     :top_diseases, :model_used, :lang, :asked_questions,
                     :evidence_texts, :question_answers, :created_at, :updated_at)
            """),
            {
                "session_id": session_id,
                "chat_id": chat_id,
                "initial_symptoms": initial_symptoms,
                "base_probs": json.dumps(base_probs),
                "current_probs": json.dumps(current_probs),
                "disease": disease,
                "confidence": confidence,
                "uncertainty": uncertainty,
                "top_diseases": json.dumps(top_diseases),
                "model_used": model_used,
                "lang": lang,
                "asked_questions": json.dumps([]),
                "evidence_texts": json.dumps([]),
                "question_answers": json.dumps({}),
                "created_at": _now(),
                "updated_at": _now(),
            },
        )
        conn.commit()

    return session_id


def get_session(session_id: str) -> dict | None:
    """
    Retrieve a DiagnosisSession by its UUID.
    Returns None if not found or expired (> 1 hour old).
    """
    engine = get_db_engine()

    with engine.connect() as conn:
        row = (
            conn.execute(
                text("SELECT * FROM diagnosis_sessions WHERE session_id = :sid"),
                {"sid": session_id},
            )
            .mappings()
            .first()
        )

    if not row:
        return None

    data = dict(row)

    # Check expiry (1 hour)
    if _now() - data.get("created_at", 0) > 3600:
        return None

    # Deserialize JSON fields
    for field in (
        "base_probs",
        "current_probs",
        "top_diseases",
        "asked_questions",
        "evidence_texts",
        "question_answers",
    ):
        val = data.get(field)
        if isinstance(val, str):
            data[field] = json.loads(val)
        elif val is None:
            # Handle missing field for backwards compatibility
            data[field] = {} if field == "question_answers" else []

    return data


def update_session(session_id: str, **kwargs) -> bool:
    """
    Update specific fields of a DiagnosisSession.
    JSON-serializable fields are automatically serialized.
    """
    json_fields = {
        "base_probs",
        "current_probs",
        "top_diseases",
        "asked_questions",
        "evidence_texts",
        "question_answers",
    }
    params = {"sid": session_id, "updated_at": _now()}
    set_clauses = ["updated_at = :updated_at"]

    for key, val in kwargs.items():
        if key in json_fields:
            params[key] = json.dumps(val)
        else:
            params[key] = val
        set_clauses.append(f"{key} = :{key}")

    engine = get_db_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text(
                f"UPDATE diagnosis_sessions SET {', '.join(set_clauses)} WHERE session_id = :sid"
            ),
            params,
        )
        conn.commit()
        return result.rowcount > 0
