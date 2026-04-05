"""
Surveillance blueprint: Isolation Forest outbreak detection endpoint.
"""

import traceback
from flask import Blueprint, request, jsonify, current_app

from app.services.surveillance_service import analyze_surveillance
from app.services.outbreak_service import detect_outbreaks

surveillance_bp = Blueprint("surveillance", __name__)


@surveillance_bp.route("/api/surveillance/outbreaks", methods=["GET"])
def surveillance_outbreaks():
    """
    Detect anomalous disease patterns using Isolation Forest.

    Query parameters:
      - contamination  : Expected proportion of outliers (default: 0.05 = 5%).
                         Must be between 0.0 and 0.5 (exclusive).
      - disease        : Filter by disease name (optional).
      - start_date     : Include records on or after this date, e.g. 2025-01-01 (optional).
      - end_date       : Include records on or before this date, e.g. 2025-12-31 (optional).
      - n_estimators   : Number of trees in the Isolation Forest (default: 100).
      - max_samples    : Samples per tree; use 'auto' or an integer (default: 'auto').

    Returns JSON:
      {
        "anomalies":        [ { ...diagnosis + user + is_anomaly + anomaly_score + reason } ],
        "normal_diagnoses": [ { ...same structure, is_anomaly=false, reason=null } ],
        "summary": {
          "total_records":      <int>,
          "anomaly_count":      <int>,
          "normal_count":       <int>,
          "contamination_used": <float>
        },
        "total_analyzed":  <int>,   // backwards-compat alias for total_records
        "anomaly_count":   <int>,   // backwards-compat top-level alias
        "normal_count":    <int>,   // backwards-compat top-level alias
        "outbreak_alert":  <bool>   // true when anomaly_count > 0
      }

    Reason codes on anomalies (pipe-separated when multiple apply):
      GEOGRAPHIC:RARE       – disease is geographically uncommon in this location
      TEMPORAL:RARE         – disease is uncommon during this time of year
      AGE:RARE              – patient age is outside the typical demographic range
      GENDER:RARE           – patient gender is uncommon for this disease
      COMBINED:MULTI        – two or more independent factors contributed
    """
    try:
        # --- contamination ---
        contamination = float(request.args.get("contamination", 0.05))
        if not (0.0 < contamination < 0.5):
            return (
                jsonify(
                    {
                        "error": "Invalid contamination value",
                        "details": "contamination must be strictly between 0.0 and 0.5",
                    }
                ),
                400,
            )

        # --- n_estimators ---
        n_estimators = int(request.args.get("n_estimators", 100))
        if n_estimators < 1:
            return (
                jsonify(
                    {
                        "error": "Invalid n_estimators value",
                        "details": "n_estimators must be a positive integer",
                    }
                ),
                400,
            )

        # --- max_samples ---
        max_samples_raw = request.args.get("max_samples", "auto")
        if max_samples_raw == "auto":
            max_samples = "auto"
        else:
            try:
                max_samples = int(max_samples_raw)
                if max_samples < 1:
                    raise ValueError()
            except ValueError:
                return (
                    jsonify(
                        {
                            "error": "Invalid max_samples value",
                            "details": "max_samples must be 'auto' or a positive integer",
                        }
                    ),
                    400,
                )

        # --- optional filters ---
        disease = request.args.get("disease", None)
        start_date = request.args.get("start_date", None)
        end_date = request.args.get("end_date", None)

        # --- run analysis ---
        result = analyze_surveillance(
            start_date=start_date,
            end_date=end_date,
            disease=disease,
            contamination=contamination,
            n_estimators=n_estimators,
            max_samples=max_samples,
        )

        summary = result["summary"]
        print(
            f"[SURVEILLANCE] Analyzed {summary['total_records']} diagnoses, "
            f"found {summary['anomaly_count']} anomalies "
            f"(contamination={contamination})"
        )

        # Merge backwards-compatible top-level fields
        response = {
            **result,
            "total_analyzed": summary["total_records"],
            "anomaly_count": summary["anomaly_count"],
            "normal_count": summary["normal_count"],
            "outbreak_alert": summary["anomaly_count"] > 0,
        }

        return jsonify(response)

    except ValueError as e:
        error_msg = str(e)
        if "DATABASE_URL" in error_msg:
            return (
                jsonify(
                    {
                        "error": "Database configuration error",
                        "details": "DATABASE_URL environment variable is not set",
                    }
                ),
                500,
            )
        return jsonify({"error": "Invalid parameter", "details": error_msg}), 400

    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR in surveillance_outbreaks: {str(e)}")
        print(error_details)
        payload = {"error": str(e)}
        if current_app.debug:
            payload["details"] = error_details
        return jsonify(payload), 500


@surveillance_bp.route("/api/surveillance/cron", methods=["GET"])
def surveillance_cron():
    """
    Unified endpoint for scheduled surveillance runs (Supabase Cron / Edge Functions).

    Runs both anomaly detection (Isolation Forest) and outbreak detection
    (DOH PIDSR + K-Means) in a single call. Designed for cron execution —
    partial failures return results with an errors field so the caller
    can still process what succeeded.

    Returns JSON:
      {
        "anomalies": [ { "id": ..., "reason": "...", "disease": "..." } ],
        "outbreaks": [ { "disease": "...", "district": "...", "severity": "...", ... } ],
        "errors": [ "description of any failed detection engine" ]
      }
    """
    errors = []
    anomalies = []
    outbreaks = []

    # --- Anomaly Detection ---
    try:
        contamination = float(request.args.get("contamination", 0.05))
        if not (0.0 < contamination < 0.5):
            contamination = 0.05

        result = analyze_surveillance(
            start_date=None,
            end_date=None,
            disease=None,
            contamination=contamination,
            n_estimators=100,
            max_samples="auto",
        )

        anomalies = result.get("anomalies", [])
        print(
            f"[CRON] Anomaly detection: {result['summary']['total_records']} records, "
            f"{result['summary']['anomaly_count']} anomalies"
        )
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR in surveillance_cron (anomaly): {str(e)}")
        print(error_details)
        errors.append(f"Anomaly detection failed: {str(e)}")

    # --- Outbreak Detection ---
    try:
        outbreaks = detect_outbreaks()
        print(f"[CRON] Outbreak detection: {len(outbreaks)} outbreaks found")
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR in surveillance_cron (outbreak): {str(e)}")
        print(error_details)
        errors.append(f"Outbreak detection failed: {str(e)}")

    response = {
        "anomalies": anomalies,
        "outbreaks": outbreaks,
        "errors": errors,
    }

    status_code = 500 if len(errors) == 2 else 200
    return jsonify(response), status_code
