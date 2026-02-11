"""
Entry point for the Flask application.

Usage:
    python run.py
"""

import os
from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() in ("1", "true", "yes")
    print(f"[STARTUP] Running on http://0.0.0.0:{port} (debug={debug})")
    app.run(host="0.0.0.0", port=port, debug=debug)
