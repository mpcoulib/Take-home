"""Generic dataset loader. Handles CSV / JSON / Parquet / NDJSON / URL.

Dataset-agnostic: point it at a path or URL, get back a pandas DataFrame.
Caches loaded frames in-process so repeated requests are cheap.
"""
from __future__ import annotations

import io
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parents[2] / "data"))


def _read_bytes(source: str) -> tuple[bytes, str]:
    """Return (raw_bytes, suffix). Source may be a URL or a local path."""
    if source.startswith(("http://", "https://")):
        resp = requests.get(source, timeout=60)
        resp.raise_for_status()
        suffix = Path(source.split("?")[0]).suffix.lower()
        return resp.content, suffix
    path = (DATA_DIR / source) if not os.path.isabs(source) else Path(source)
    return path.read_bytes(), path.suffix.lower()


def _parse(raw: bytes, suffix: str) -> pd.DataFrame:
    buf = io.BytesIO(raw)
    if suffix in (".csv", ".tsv", ".txt"):
        sep = "\t" if suffix == ".tsv" else None
        return pd.read_csv(buf, sep=sep, engine="python", on_bad_lines="skip")
    if suffix in (".json",):
        try:
            return pd.read_json(buf)
        except ValueError:
            buf.seek(0)
            return pd.read_json(buf, lines=True)
    if suffix in (".ndjson", ".jsonl"):
        return pd.read_json(buf, lines=True)
    if suffix in (".parquet", ".pq"):
        return pd.read_parquet(buf)
    # Last resort: try CSV.
    buf.seek(0)
    return pd.read_csv(buf, engine="python", on_bad_lines="skip")


@lru_cache(maxsize=16)
def load(source: str) -> pd.DataFrame:
    """Load a dataset. Source may be:
      - ``cms:<dataset_id>``  → resolve + download from the CMS catalog (cached to DATA_DIR)
      - an http(s) URL
      - a filename under DATA_DIR, or an absolute path
    """
    if source.startswith("cms:"):
        from . import cms
        path, _ref = cms.fetch(source[4:], DATA_DIR)
        raw, suffix = path.read_bytes(), path.suffix.lower()
    else:
        raw, suffix = _read_bytes(source)
    df = _parse(raw, suffix)
    # Best-effort: parse obvious datetime columns for downstream time-series.
    for col in df.columns:
        if df[col].dtype == "object" and _looks_like_date(col):
            parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().mean() > 0.8:
                df[col] = parsed
    return df


def _looks_like_date(col: str) -> bool:
    c = col.lower()
    return any(k in c for k in ("date", "time", "year", "month", "day", "timestamp", "dt"))


def list_local() -> list[str]:
    """Names of dataset files sitting in DATA_DIR."""
    if not DATA_DIR.exists():
        return []
    exts = {".csv", ".tsv", ".json", ".ndjson", ".jsonl", ".parquet", ".pq", ".txt"}
    return sorted(p.name for p in DATA_DIR.iterdir() if p.suffix.lower() in exts)


def clear_cache() -> None:
    load.cache_clear()
