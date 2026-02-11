# Backward-compatible proxy shim.
# Real config lives in app/config.py — this re-exports everything so
# existing `import config` / `from config import X` statements keep working.
from app.config import *  # noqa: F401,F403
