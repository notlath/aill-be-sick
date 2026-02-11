"""
Surveillance blueprint: Isolation Forest outbreak detection endpoint.
"""

import traceback
from flask import Blueprint, request, jsonify

from app.services.surveillance_service import detect_outbreaks, get_outbreak_summary

surveillance_bp = Blueprint("surveillance", __name__)


@surveillance_bp.route("/api/surveillance/outbreaks", methods=["GET"])
def surveillance_outbreaks():
    """
    Detect anomalous disease patterns using Isolation Forest.
    Query params:
      - contamination: Expected proportion of outliers (default: 0.05 = 5%)
      - summary: If 'true', return aggregated summary instead of full details
    Returns JSON with anomalies, statistics, and outbreak alert status.
    """
    try:
        # Get contamination parameter (expected proportion of outliers)
        contamination = float(request.args.get("contamination", 0.05))

        # Validate contamination range
        if not (0.0 < contamination < 0.5):
            return (
                jsonify(
                    {
                        "error": "Invalid contamination value",
                        "details": "Contamination must be between 0.0 and 0.5",
                    }
                ),
                400,
            )

        # Check if summary mode is requested
        summary_mode = request.args.get("summary", "false").lower() == "true"

        if summary_mode:
            # Return aggregated summary for dashboard
            result = get_outbreak_summary(contamination=contamination)
        else:
            # Return full details
            result = detect_outbreaks(contamination=contamination)

        print(
            f"[SURVEILLANCE] Analyzed {result['total_analyzed']} diagnoses, found {result['anomaly_count']} anomalies (contamination={contamination})"
        )

        if result["outbreak_alert"]:
            print(
                f"[SURVEILLANCE] ⚠️ OUTBREAK ALERT: Anomaly count ({result['anomaly_count']}) exceeds threshold"
            )

        return jsonify(result)

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
        return jsonify({"error": str(e), "details": error_details}), 500
