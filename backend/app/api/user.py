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
import logging
from dotenv import load_dotenv

# Load .env from the backend/ directory regardless of working directory
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_backend_dir, ".env"), override=True)

user_bp = Blueprint("user", __name__, url_prefix="/api/user")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://pncxsombhfdryzkqdmff.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

logger = logging.getLogger(__name__)

# Log config status at startup (mask key for security)
_key_preview = SUPABASE_SERVICE_ROLE_KEY[:20] + "..." if len(SUPABASE_SERVICE_ROLE_KEY) > 20 else "(empty)"
logger.info(f"[USER_BP] SUPABASE_URL: {SUPABASE_URL}")
logger.info(f"[USER_BP] SUPABASE_SERVICE_ROLE_KEY: {_key_preview}")


def _serialize_for_json(obj):
    """Recursively convert datetime objects to ISO format strings for JSON serialization."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: _serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_serialize_for_json(item) for item in obj]
    return obj


def get_current_user():
    """Verify Supabase JWT token and return the corresponding Prisma user."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("[get_current_user] No Authorization header or invalid format")
        return None

    token = auth_header.split("Bearer ")[1]

    try:
        logger.info(f"[get_current_user] Verifying token with Supabase: {SUPABASE_URL}/auth/v1/user")
        supabase_user_resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {token}",
            },
            timeout=10,
        )
        if supabase_user_resp.status_code != 200:
            logger.warning(
                f"[get_current_user] Supabase verification failed: {supabase_user_resp.status_code} - {supabase_user_resp.text[:200]}"
            )
            return None

        supabase_user = supabase_user_resp.json()
        email = supabase_user.get("email")
        if not email:
            logger.warning("[get_current_user] No email in Supabase user response")
            return None

        logger.info(f"[get_current_user] Supabase user email: {email}")

        engine = get_db_engine()
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, email FROM "User" WHERE email = :email
            """), {"email": email}).fetchone()

        if not result:
            logger.warning(f"[get_current_user] No database user found with email: {email}")
            return None

        logger.info(f"[get_current_user] Found database user: id={result[0]}")
        return {"id": result[0], "email": result[1]}

    except Exception as e:
        logger.error(f"[get_current_user] Unexpected error: {type(e).__name__}: {e}")
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
    body = request.get_json(silent=True) if request.is_json else None
    format_type = (body or {}).get("format", "json")

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
        "user_profile": dict(user_result._mapping),
        "chats": [dict(chat._mapping) for chat in chats_result],
        "messages": [dict(msg._mapping) for msg in messages_result],
        "diagnoses": [dict(diag._mapping) for diag in diagnoses_result],
        "consent_history": [dict(history._mapping) for history in consent_history]
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
        return jsonify(_serialize_for_json(export_data))


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


@user_bp.route("/schedule-deletion", methods=["POST"])
def schedule_deletion():
    """Schedule a patient account for deletion with grace period."""
    clinician = get_current_user()
    if not clinician:
        return jsonify({"error": "Authentication required"}), 401

    engine = get_db_engine()
    with engine.connect() as conn:
        clinician_result = conn.execute(text("""
            SELECT id, role FROM "User" WHERE id = :user_id
        """), {"user_id": clinician["id"]}).fetchone()

        if not clinician_result:
            return jsonify({"error": "Clinician not found"}), 404

        clinician_role = clinician_result[1]
        if clinician_role not in ("CLINICIAN", "ADMIN", "DEVELOPER"):
            return jsonify({"error": "Permission denied"}), 403

    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body required"}), 400

    patient_id = body.get("patientId")
    reason = body.get("reason", "")

    if not patient_id:
        return jsonify({"error": "patientId is required"}), 400

    grace_period_days = int(os.getenv("GRACE_PERIOD_DAYS", "30"))
    scheduled_deletion_at = datetime.utcnow() + timedelta(days=grace_period_days)

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            patient_result = conn.execute(text("""
                SELECT id, email, name FROM "User" WHERE id = :patient_id AND role = 'PATIENT'
            """), {"patient_id": patient_id}).fetchone()

            if not patient_result:
                trans.rollback()
                return jsonify({"error": "Patient not found"}), 404

            existing_schedule = conn.execute(text("""
                SELECT id, status FROM "DeletionSchedule"
                WHERE "userId" = :patient_id AND status = 'SCHEDULED'
            """), {"patient_id": patient_id}).fetchone()

            if existing_schedule:
                trans.rollback()
                return jsonify({"error": "Patient already has a scheduled deletion"}), 409

            conn.execute(text("""
                INSERT INTO "DeletionSchedule"
                ("userId", "scheduledBy", "scheduledAt", "scheduledDeletionAt", reason, status)
                VALUES (:user_id, :scheduled_by, NOW(), :scheduled_deletion_at, :reason, 'SCHEDULED')
            """), {
                "user_id": patient_id,
                "scheduled_by": clinician["id"],
                "scheduled_deletion_at": scheduled_deletion_at,
                "reason": reason,
            })

            log_audit_action(clinician["id"], "SCHEDULE_DELETION", {
                "patientId": patient_id,
                "patientEmail": patient_result[1],
                "reason": reason,
                "scheduledDeletionAt": scheduled_deletion_at.isoformat(),
            })

            trans.commit()

            return jsonify({
                "message": f"Patient scheduled for deletion on {scheduled_deletion_at.isoformat()}",
                "scheduledDeletionAt": scheduled_deletion_at.isoformat(),
            })

        except Exception as e:
            trans.rollback()
            current_app.logger.error(f"Schedule deletion failed: {e}")
            return jsonify({"error": "Failed to schedule deletion"}), 500


@user_bp.route("/restore-deletion", methods=["POST"])
def restore_deletion():
    """Restore a patient account from scheduled deletion."""
    clinician = get_current_user()
    if not clinician:
        return jsonify({"error": "Authentication required"}), 401

    engine = get_db_engine()
    with engine.connect() as conn:
        clinician_result = conn.execute(text("""
            SELECT id, role FROM "User" WHERE id = :user_id
        """), {"user_id": clinician["id"]}).fetchone()

        if not clinician_result:
            return jsonify({"error": "User not found"}), 404

        clinician_role = clinician_result[1]
        if clinician_role not in ("CLINICIAN", "ADMIN", "DEVELOPER"):
            return jsonify({"error": "Permission denied"}), 403

    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body required"}), 400

    patient_id = body.get("patientId")
    if not patient_id:
        return jsonify({"error": "patientId is required"}), 400

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            schedule_result = conn.execute(text("""
                SELECT id, "scheduledBy", status FROM "DeletionSchedule"
                WHERE "userId" = :patient_id AND status = 'SCHEDULED'
            """), {"patient_id": patient_id}).fetchone()

            if not schedule_result:
                trans.rollback()
                return jsonify({"error": "No active deletion schedule found for this patient"}), 404

            scheduled_by = schedule_result[1]
            if clinician_role not in ("ADMIN", "DEVELOPER") and scheduled_by != clinician["id"]:
                trans.rollback()
                return jsonify({"error": "Only the scheduling clinician or an admin can restore"}), 403

            conn.execute(text("""
                UPDATE "DeletionSchedule"
                SET status = 'RESTORED', "restoredAt" = NOW(), "restoredBy" = :restored_by
                WHERE "userId" = :patient_id AND status = 'SCHEDULED'
            """), {"restored_by": clinician["id"], "patient_id": patient_id})

            log_audit_action(clinician["id"], "RESTORE_DELETION", {
                "patientId": patient_id,
            })

            trans.commit()

            return jsonify({"message": "Patient account restored successfully"})

        except Exception as e:
            trans.rollback()
            current_app.logger.error(f"Restore deletion failed: {e}")
            return jsonify({"error": "Failed to restore patient account"}), 500


@user_bp.route("/anonymize-scheduled", methods=["POST"])
def anonymize_scheduled():
    """Anonymize all patients whose scheduled deletion date has passed."""
    auth_header = request.headers.get("Authorization")
    internal_call = auth_header and auth_header.startswith("Bearer internal-")

    if not internal_call:
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        engine = get_db_engine()
        with engine.connect() as conn:
            user_result = conn.execute(text("""
                SELECT role FROM "User" WHERE id = :user_id
            """), {"user_id": user["id"]}).fetchone()
            if not user_result or user_result[0] != "DEVELOPER":
                return jsonify({"error": "Developer access required"}), 403

    engine = get_db_engine()
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            expired_schedules = conn.execute(text("""
                SELECT ds.id, ds."userId", u.email, u.name
                FROM "DeletionSchedule" ds
                JOIN "User" u ON ds."userId" = u.id
                WHERE ds.status = 'SCHEDULED' AND ds."scheduledDeletionAt" <= NOW()
            """)).fetchall()

            anonymized_count = 0
            for schedule in expired_schedules:
                schedule_id, patient_id, patient_email, patient_name = schedule

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
                """), {"user_id": patient_id})

                conn.execute(text("""
                    UPDATE "Diagnosis"
                    SET city = NULL, latitude = NULL, longitude = NULL, region = NULL,
                        province = NULL, barangay = NULL, district = NULL
                    WHERE "userId" = :user_id
                """), {"user_id": patient_id})

                conn.execute(text("""
                    DELETE FROM "Chat" WHERE "userId" = :user_id
                """), {"user_id": patient_id})

                conn.execute(text("""
                    UPDATE "DeletionSchedule"
                    SET status = 'ANONYMIZED', "anonymizedAt" = NOW()
                    WHERE id = :schedule_id
                """), {"schedule_id": schedule_id})

                log_audit_action(None, "ANONYMIZE_ACCOUNT", {
                    "patientId": patient_id,
                    "scheduleId": schedule_id,
                    "originalEmail": patient_email,
                })

                anonymized_count += 1

            trans.commit()

            return jsonify({
                "message": f"Anonymized {anonymized_count} scheduled account(s)",
                "anonymizedCount": anonymized_count,
            })

        except Exception as e:
            trans.rollback()
            current_app.logger.error(f"Anonymize scheduled failed: {e}")
            return jsonify({"error": "Failed to anonymize scheduled accounts"}), 500


@user_bp.route("/deletion-schedule/<int:patient_id>", methods=["GET"])
def get_deletion_schedule(patient_id):
    """Get the deletion schedule for a specific patient."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    engine = get_db_engine()
    with engine.connect() as conn:
        requesting_user = conn.execute(text("""
            SELECT id, role FROM "User" WHERE id = :user_id
        """), {"user_id": user["id"]}).fetchone()

        if not requesting_user:
            return jsonify({"error": "User not found"}), 404

        requesting_role = requesting_user[1]
        if requesting_role not in ("CLINICIAN", "ADMIN", "DEVELOPER"):
            return jsonify({"error": "Permission denied"}), 403

        schedule_result = conn.execute(text("""
            SELECT ds.id, ds."scheduledBy", ds."scheduledAt", ds."scheduledDeletionAt",
                   ds.reason, ds.status, ds."restoredAt", ds."restoredBy", ds."anonymizedAt",
                   sb.name as scheduledByName, sb.email as scheduledByEmail
            FROM "DeletionSchedule" ds
            JOIN "User" sb ON ds."scheduledBy" = sb.id
            WHERE ds."userId" = :patient_id
            ORDER BY ds."scheduledAt" DESC
            LIMIT 1
        """), {"patient_id": patient_id}).fetchone()

        if not schedule_result:
            return jsonify({"schedule": None})

        schedule = {
            "id": schedule_result[0],
            "scheduledBy": schedule_result[1],
            "scheduledAt": schedule_result[2].isoformat() if schedule_result[2] else None,
            "scheduledDeletionAt": schedule_result[3].isoformat() if schedule_result[3] else None,
            "reason": schedule_result[4],
            "status": schedule_result[5],
            "restoredAt": schedule_result[6].isoformat() if schedule_result[6] else None,
            "restoredBy": schedule_result[7],
            "anonymizedAt": schedule_result[8].isoformat() if schedule_result[8] else None,
            "scheduledByName": schedule_result[9],
            "scheduledByEmail": schedule_result[10],
        }

        return jsonify({"schedule": schedule})


@user_bp.route("/deletion-schedules/pending", methods=["GET"])
def get_pending_deletion_schedules():
    """Get all pending deletion schedules (for clinician admin view)."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    engine = get_db_engine()
    with engine.connect() as conn:
        requesting_user = conn.execute(text("""
            SELECT id, role FROM "User" WHERE id = :user_id
        """), {"user_id": user["id"]}).fetchone()

        if not requesting_user:
            return jsonify({"error": "User not found"}), 404

        requesting_role = requesting_user[1]
        if requesting_role not in ("CLINICIAN", "ADMIN", "DEVELOPER"):
            return jsonify({"error": "Permission denied"}), 403

        schedules_result = conn.execute(text("""
            SELECT ds.id, ds."userId", u.email, u.name, ds."scheduledBy",
                   ds."scheduledAt", ds."scheduledDeletionAt", ds.reason,
                   sb.name as scheduledByName, sb.email as scheduledByEmail
            FROM "DeletionSchedule" ds
            JOIN "User" u ON ds."userId" = u.id
            JOIN "User" sb ON ds."scheduledBy" = sb.id
            WHERE ds.status = 'SCHEDULED'
            ORDER BY ds."scheduledDeletionAt" ASC
        """)).fetchall()

        schedules = []
        for row in schedules_result:
            schedules.append({
                "id": row[0],
                "userId": row[1],
                "email": row[2],
                "name": row[3],
                "scheduledBy": row[4],
                "scheduledAt": row[5].isoformat() if row[5] else None,
                "scheduledDeletionAt": row[6].isoformat() if row[6] else None,
                "reason": row[7],
                "scheduledByName": row[8],
                "scheduledByEmail": row[9],
            })

        return jsonify({"schedules": schedules})