import sys
from pathlib import Path

# Allow imports from backend/ (e.g. verify_grounding.py).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
