"""Vercel serverless entry — re-exports the FastAPI app from backend."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
backend_str = str(BACKEND)
if backend_str not in sys.path:
    sys.path.insert(0, backend_str)

from app.main import app  # noqa: E402

__all__ = ["app"]
