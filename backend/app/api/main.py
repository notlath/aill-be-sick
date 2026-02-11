"""
Main blueprint: health-check endpoint and global error handlers.
"""

from flask import Blueprint, jsonify

main_bp = Blueprint("main", __name__)


# ── Health Check ──────────────────────────────────────────────────────────────

@main_bp.route("/diagnosis/", methods=["GET"])
def index():
    """Main index endpoint"""
    return jsonify({"message": "Hello, world!"})


# ── Error Handlers ────────────────────────────────────────────────────────────

@main_bp.app_errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@main_bp.app_errorhandler(400)
def bad_request(error):
    return jsonify({
        "error": "BAD_REQUEST",
        "message": f"Bad Request: {error.description if hasattr(error, 'description') else str(error)}",
        "details": str(error)
    }), 400


@main_bp.app_errorhandler(415)
def unsupported_media_type(error):
    return jsonify({
        "error": "UNSUPPORTED_MEDIA_TYPE",
        "message": "Unsupported Media Type: Content-Type must be 'application/json'",
        "details": str(error)
    }), 415


@main_bp.app_errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405
