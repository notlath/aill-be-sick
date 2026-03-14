# outbreak.py
from flask import Blueprint, jsonify, request
from app.services.outbreak_service import detect_outbreaks

outbreak_bp = Blueprint("outbreak", __name__)

@outbreak_bp.route("/detect", methods=["GET"])
def detect():
    """
    Endpoint to trigger outbreak detection based on recent diagnosis data.
    """
    try:
        outbreaks = detect_outbreaks()
        return jsonify({
            "success": True,
            "outbreaks": outbreaks,
            "count": len(outbreaks)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
