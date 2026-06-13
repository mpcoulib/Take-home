"""Runtime environment detection for local dev vs serverless (Vercel/Lambda)."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from .loader import DATA_DIR


def is_serverless() -> bool:
    return bool(
        os.environ.get("VERCEL")
        or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
        or os.environ.get("AWS_EXECUTION_ENV")
    )


@lru_cache(maxsize=1)
def cache_dir() -> Path:
    """Writable directory for ephemeral CMS CSV downloads."""
    if is_serverless():
        p = Path("/tmp/hospitalmatch-data")
        p.mkdir(parents=True, exist_ok=True)
        return p
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        probe = DATA_DIR / ".write_probe"
        probe.write_text("")
        probe.unlink(missing_ok=True)
        return DATA_DIR
    except OSError:
        p = Path("/tmp/hospitalmatch-data")
        p.mkdir(parents=True, exist_ok=True)
        return p
