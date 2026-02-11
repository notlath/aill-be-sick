# Backward-compatible proxy shim.
# Real module lives in app/services/ml_service.py
from app.services.ml_service import *  # noqa: F401,F403
