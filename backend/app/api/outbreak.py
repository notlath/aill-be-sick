# outbreak.py
import traceback
from flask import Blueprint, jsonify, request, current_app
from app.services.outbreak_service import detect_outbreaks

outbreak_bp = Blueprint("outbreak", __name__)


@outbreak_bp.route("/detect", methods=["GET"])
def detect():
    """
    Endpoint to trigger outbreak detection based on recent diagnosis data.
    """
    try:
        outbreaks = detect_outbreaks()
        return jsonify(
            {"success": True, "outbreaks": outbreaks, "count": len(outbreaks)}
        )
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR in detect: {str(e)}")
        print(error_details)
        payload = {
            "success": False,
            "error": str(e),
        }
        if current_app.debug:
            payload["details"] = error_details
        return jsonify(payload), 500
