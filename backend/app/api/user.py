"""
User blueprint: /api/user/data-export, /api/user/account, /api/user/withdraw-consent

Handles user data export, account deletion, and consent withdrawal for privacy compliance.
"""

import json
import csv
import io
import os
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app, g
from sqlalchemy import text
from app.utils.database import get_db_engine
import requests
from dotenv import load_dotenv

load_dotenv()

user_bp = Blueprint("user", __name__, url_prefix="/api/user")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://pncxsombhfdryzkqdmff.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_current_user():
    """Verify Supabase JWT token and return the corresponding Prisma user."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split("Bearer ")[1]

    try:
        supabase_user_resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {token}",
            },
            timeout=10,
        )
        if supabase_user_resp.status_code != 200:
            return None

        supabase_user = supabase_user_resp.json()
        email = supabase_user.get("email")
        if not email:
            return None

        engine = get_db_engine()
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, email FROM "User" WHERE email = :email
            """), {"email": email}).fetchone()

        if not result:
            return None

        return {"id": result[0], "email": result[1]}

    except Exception:
        return None


def log_audit_action(user_id, action, details=None):
    """Log audit action to database."""
    engine = get_db_engine()
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO "AuditLog" ("userId", "action", "details", "createdAt")
            VALUES (:user_id, :action, :details, NOW())
        """), {"user_id": user_id, "action": action, "details": json.dumps(details) if details else None})
        conn.commit()


@user_bp.route("/data-export", methods=["POST"])
def data_export():
    """Export user data as JSON or CSV."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    user_id = user["id"]
    format_type = request.json.get("format", "json") if request.is_json else request.form.get("format", "json")

    engine = get_db_engine()
    with engine.connect() as conn:
        # Get user profile
        user_result = conn.execute(text("""
            SELECT id, email, name, "createdAt", "updatedAt", role, city, latitude, longitude,
                   region, age, gender, province, barangay, birthday, district, address,
                   "privacyAcceptedAt", "privacyVersion", "termsAcceptedAt", "termsVersion"
            FROM "User" WHERE id = :user_id
        """), {"user_id": user_id}).fetchone()

        if not user_result:
            return jsonify({"error": "User not found"}), 404

        # Get chats
        chats_result = conn.execute(text("""
            SELECT id, "chatId", "createdAt", "updatedAt", "hasDiagnosis"
            FROM "Chat" WHERE "userId" = :user_id
        """), {"user_id": user_id}).fetchall()

        # Get messages (with chatId for correlation)
        messages_result = conn.execute(text("""
            SELECT m.content, m.role, m."createdAt", m.type, m."chatId"
            FROM "Message" m
            JOIN "Chat" c ON m."chatId" = c."chatId"
            WHERE c."userId" = :user_id
        """), {"user_id": user_id}).fetchall()

        # Get diagnoses
        diagnoses_result = conn.execute(text("""
            SELECT d.confidence, d.uncertainty, d.disease, d."createdAt", d."modelUsed",
                   d.symptoms, d.city, d.latitude, d.longitude, d.region, d.province,
                   d.barangay, d.district
            FROM "Diagnosis" d WHERE d."userId" = :user_id
        """), {"user_id": user_id}).fetchall()

        # Get consent history (audit logs)
        consent_history = conn.execute(text("""
            SELECT action, details, "createdAt"
            FROM "AuditLog" WHERE "userId" = :user_id AND action LIKE '%consent%'
        """), {"user_id": user_id}).fetchall()

    # Compile data
    export_data = {
        "export_date": datetime.utcnow().isoformat(),
        "data_categories": ["profile", "chats", "messages", "diagnoses", "consent_history"],
        "retention_period_days": 30,
        "user_profile": dict(user_result),
        "chats": [dict(chat) for chat in chats_result],
        "messages": [dict(msg) for msg in messages_result],
        "diagnoses": [dict(diag) for diag in diagnoses_result],
        "consent_history": [dict(history) for history in consent_history]
    }

    # Log the export
    log_audit_action(user_id, "data_export", {"format": format_type})

    if format_type == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        # Section 1: PROFILE
        writer.writerow(["SECTION", "PROFILE"])
        profile_keys = ["id", "email", "name", "createdAt", "updatedAt", "role", "city", "latitude", "longitude",
                        "region", "age", "gender", "province", "barangay", "birthday", "district", "address",
                        "privacyAcceptedAt", "privacyVersion", "termsAcceptedAt", "termsVersion"]
        writer.writerow(profile_keys)
        profile_row = []
        for key in profile_keys:
            val = export_data["user_profile"].get(key, "")
            if isinstance(val, datetime):
                val = val.isoformat()
            profile_row.append(val if val is not None else "")
        writer.writerow(profile_row)

        # Section 2: DIAGNOSES
        writer.writerow([])
        writer.writerow(["SECTION", "DIAGNOSES"])
        diag_keys = ["disease", "confidence", "uncertainty", "modelUsed", "createdAt"]
        writer.writerow(diag_keys)
        for diag in export_data["diagnoses"]:
            row = []
            for key in diag_keys:
                val = diag.get(key, "")
                if isinstance(val, datetime):
                    val = val.isoformat()
                row.append(val if val is not None else "")
            writer.writerow(row)

        # Section 3: CHATS
        writer.writerow([])
        writer.writerow(["SECTION", "CHATS"])
        chat_keys = ["chatId", "createdAt", "hasDiagnosis"]
        writer.writerow(chat_keys)
        for chat in export_data["chats"]:
            row = []
            for key in chat_keys:
                val = chat.get(key, "")
                if isinstance(val, datetime):
                    val = val.isoformat()
                row.append(val if val is not None else "")
            writer.writerow(row)

        # Section 4: MESSAGES
        writer.writerow([])
        writer.writerow(["SECTION", "MESSAGES"])
        msg_keys = ["chatId", "role", "type", "createdAt"]
        writer.writerow(msg_keys)
        for msg in export_data["messages"]:
            row = []
            for key in msg_keys:
                val = msg.get(key, "")
                if isinstance(val, datetime):
                    val = val.isoformat()
                row.append(val if val is not None else "")
            writer.writerow(row)

        # Section 5: CONSENT_HISTORY
        writer.writerow([])
        writer.writerow(["SECTION", "CONSENT_HISTORY"])
        consent_keys = ["action", "createdAt"]
        writer.writerow(consent_keys)
        for entry in export_data["consent_history"]:
            row = []
            for key in consent_keys:
                val = entry.get(key, "")
                if isinstance(val, datetime):
                    val = val.isoformat()
                row.append(val if val is not None else "")
            writer.writerow(row)

        return output.getvalue(), 200, {"Content-Type": "text/csv", "Content-Disposition": "attachment; filename=user_data.csv"}
    else:
        return jsonify(export_data)


@user_bp.route("/account", methods=["DELETE"])
def delete_account():
    """Delete user account with anonymization."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    user_id = user["id"]

    engine = get_db_engine()
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()

        try:
            # Anonymize user data
            conn.execute(text("""
                UPDATE "User"
                SET email = CONCAT('deleted_', id, '@anonymous.com'),
                    name = 'Anonymous User',
                    city = NULL, latitude = NULL, longitude = NULL, region = NULL,
                    age = NULL, gender = NULL, province = NULL, barangay = NULL,
                    birthday = NULL, district = NULL, address = NULL,
                    "privacyAcceptedAt" = NULL, "privacyVersion" = NULL,
                    "termsAcceptedAt" = NULL, "termsVersion" = NULL
                WHERE id = :user_id
            """), {"user_id": user_id})

            # Anonymize diagnoses (remove location data)
            conn.execute(text("""
                UPDATE "Diagnosis"
                SET city = NULL, latitude = NULL, longitude = NULL, region = NULL,
                    province = NULL, barangay = NULL, district = NULL
                WHERE "userId" = :user_id
            """), {"user_id": user_id})

            # Delete chats and related data (cascade)
            conn.execute(text("""
                DELETE FROM "Chat" WHERE "userId" = :user_id
            """), {"user_id": user_id})

            # Log the deletion
            log_audit_action(user_id, "account_deletion", {"anonymized": True})

            trans.commit()

            return jsonify({"message": "Account deleted successfully. Data has been anonymized."})

        except Exception as e:
            trans.rollback()
            current_app.logger.error(f"Account deletion failed: {e}")
            return jsonify({"error": "Account deletion failed"}), 500


@user_bp.route("/withdraw-consent", methods=["POST"])
def withdraw_consent():
    """Withdraw user consent and anonymize data."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    user_id = user["id"]

    engine = get_db_engine()
    with engine.connect() as conn:
        # Clear consent flags
        conn.execute(text("""
            UPDATE "User"
            SET "privacyAcceptedAt" = NULL, "privacyVersion" = NULL,
                "termsAcceptedAt" = NULL, "termsVersion" = NULL
            WHERE id = :user_id
        """), {"user_id": user_id})

        # Anonymize data (similar to deletion but keep account)
        conn.execute(text("""
            UPDATE "User"
            SET name = CONCAT('Anonymous_', id),
                city = NULL, latitude = NULL, longitude = NULL, region = NULL,
                age = NULL, gender = NULL, province = NULL, barangay = NULL,
                birthday = NULL, district = NULL, address = NULL
            WHERE id = :user_id
        """), {"user_id": user_id})

        # Anonymize diagnoses
        conn.execute(text("""
            UPDATE "Diagnosis"
            SET city = NULL, latitude = NULL, longitude = NULL, region = NULL,
                province = NULL, barangay = NULL, district = NULL
            WHERE "userId" = :user_id
        """), {"user_id": user_id})

        # Log the withdrawal
        log_audit_action(user_id, "consent_withdrawal", {"anonymized": True})

        conn.commit()

    return jsonify({"message": "Consent withdrawn. Data has been anonymized and processing restricted."})