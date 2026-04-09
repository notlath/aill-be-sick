import os
import sys


BACKEND_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend")
)

if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)
