"""Fetch, tidy, and join CMS measure files into a unified parquet store.

Schema contract: see SCHEMA.md — grain (facility_id, measure_id).
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

import pandas as pd

from . import cms, footnotes
from .loader import DATA_DIR
from .measures import DATASETS

STORE_PATH = DATA_DIR / "measures_store.parquet"
META_PATH = DATA_DIR / "measures_store.meta.json"

GENERAL_INFO_ID = "xubh-q36u"

# Standard measure files share this column layout (subset used here).
_STD_COLS = {
    "facility_id": "Facility ID",
    "measure_id": "Measure ID",
    "score": "Score",
    "compared": "Compared to National",
    "footnote": "Footnote",
}

# Map raw CMS comparison text → normalized enum (SCHEMA.md).
_COMPARED_MAP: list[tuple[str, str]] = [
    (r"better", "better"),
    (r"worse", "worse"),
    (r"no different", "no_different"),
    (r"not available", "not_available"),
    (r"number of cases too small", "too_few_cases"),
    (r"fewer days", "better"),
    (r"more days", "worse"),
    (r"average days", "no_different"),
]


def normalize_facility_id(raw) -> str:
    """CMS Facility ID as zero-padded 6-digit string."""
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return ""
    s = str(raw).strip()
    if not s or s.lower() in ("nan", "none"):
        return ""
    digits = re.sub(r"\D", "", s.split(".")[0])
    return digits.zfill(6) if digits else ""


def coerce_score(raw) -> Optional[float]:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = str(raw).strip()
    if not s or s.lower() in ("nan", "none", "not available", "not applicable"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def normalize_compared(raw) -> Optional[str]:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = str(raw).strip()
    if not s or s.lower() in ("nan", "none"):
        return None
    lower = s.lower()
    for pattern, value in _COMPARED_MAP:
        if re.search(pattern, lower):
            return value
    return None


def footnote_str(raw) -> str:
    decoded = footnotes.decode(raw)
    if not decoded:
        return ""
    return "; ".join(d["label"] for d in decoded)


def _tidy_standard(df: pd.DataFrame, dataset_key: str) -> pd.DataFrame:
    """Long-format measure rows from a standard CMS outcome file."""
    rows = []
    for _, r in df.iterrows():
        fid = normalize_facility_id(r.get(_STD_COLS["facility_id"]))
        mid = str(r.get(_STD_COLS["measure_id"], "")).strip()
        if not fid or not mid or mid.lower() == "nan":
            continue
        compared_col = _STD_COLS["compared"]
        rows.append(
            {
                "facility_id": fid,
                "measure_id": mid,
                "score": coerce_score(r.get(_STD_COLS["score"])),
                "compared_to_national": normalize_compared(r.get(compared_col)) if compared_col in df.columns else None,
                "footnote": footnote_str(r.get(_STD_COLS["footnote"])),
                "dataset_key": dataset_key,
            }
        )
    return pd.DataFrame(rows)


def _tidy_timely(df: pd.DataFrame) -> pd.DataFrame:
    """Timely & Effective Care — no Compared to National column."""
    rows = []
    for _, r in df.iterrows():
        fid = normalize_facility_id(r.get("Facility ID"))
        mid = str(r.get("Measure ID", "")).strip()
        if not fid or not mid or mid.lower() == "nan":
            continue
        rows.append(
            {
                "facility_id": fid,
                "measure_id": mid,
                "score": coerce_score(r.get("Score")),
                "compared_to_national": None,
                "footnote": footnote_str(r.get("Footnote")),
                "dataset_key": "timely",
            }
        )
    return pd.DataFrame(rows)


def _tidy_hcahps(df: pd.DataFrame) -> pd.DataFrame:
    """HCAHPS — different column names; star rating is the primary score."""
    rows = []
    for _, r in df.iterrows():
        fid = normalize_facility_id(r.get("Facility ID"))
        mid = str(r.get("HCAHPS Measure ID", "")).strip()
        if not fid or not mid or mid.lower() == "nan":
            continue
        footnote_raw = r.get("Patient Survey Star Rating Footnote")
        if pd.isna(footnote_raw) or not str(footnote_raw).strip():
            footnote_raw = r.get("HCAHPS Answer Percent Footnote")
        rows.append(
            {
                "facility_id": fid,
                "measure_id": mid,
                "score": coerce_score(r.get("Patient Survey Star Rating")),
                "compared_to_national": None,
                "footnote": footnote_str(footnote_raw),
                "dataset_key": "hcahps",
            }
        )
    return pd.DataFrame(rows)


def _read_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, low_memory=False)


def _fetch_all(refresh: bool = False) -> tuple[dict[str, Path], dict[str, str]]:
    """Download all measure CSVs; return paths + modified timestamps."""
    from .runtime import cache_dir

    paths: dict[str, Path] = {}
    modified: dict[str, str] = {}
    cdir = cache_dir()
    for key, dataset_id in DATASETS.items():
        path, ref = cms.fetch(dataset_id, cdir, refresh=refresh)
        paths[key] = path
        modified[key] = ref.modified
    return paths, modified


def _build_frame(paths: dict[str, Path]) -> pd.DataFrame:
    parts = [
        _tidy_standard(_read_csv(paths["complications"]), "complications"),
        _tidy_standard(_read_csv(paths["unplanned"]), "unplanned"),
        _tidy_timely(_read_csv(paths["timely"])),
        _tidy_standard(_read_csv(paths["hai"]), "hai"),
        _tidy_hcahps(_read_csv(paths["hcahps"])),
    ]
    df = pd.concat(parts, ignore_index=True)
    df = df.drop_duplicates(subset=["facility_id", "measure_id"], keep="first")
    return df[
        ["facility_id", "measure_id", "score", "compared_to_national", "footnote", "dataset_key"]
    ]


def _load_meta() -> dict:
    from . import supabase_store

    if supabase_store.is_configured():
        return supabase_store.load_meta()
    if not META_PATH.exists():
        return {}
    return json.loads(META_PATH.read_text())


def is_stale() -> bool:
    """True when any CMS source modified date differs from cached meta."""
    from . import supabase_store

    meta = _load_meta()
    has_cache = STORE_PATH.exists() if not supabase_store.is_configured() else bool(meta.get("modified"))
    if not meta.get("modified") or not has_cache:
        return True
    try:
        if supabase_store.is_configured():
            current = {key: cms.resolve(dataset_id).modified for key, dataset_id in DATASETS.items()}
        else:
            _, current = _fetch_all(refresh=False)
    except Exception:
        return True
    return current != meta["modified"]


def build(refresh: bool = False) -> tuple[pd.DataFrame, dict[str, str]]:
    """Fetch CMS files, join to unified grain; write parquet locally when not on Supabase."""
    from . import supabase_store

    paths, modified = _fetch_all(refresh=refresh)
    df = _build_frame(paths)
    if not supabase_store.is_configured():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        df.to_parquet(STORE_PATH, index=False)
        META_PATH.write_text(json.dumps({"modified": modified}, indent=2))
    return df, modified


def store_info() -> dict:
    """Store path + cached CMS modified timestamps."""
    from . import supabase_store

    meta = _load_meta()
    if supabase_store.is_configured():
        return {"store": "supabase", "modified": meta.get("modified"), "exists": bool(meta.get("modified"))}
    return {"store": str(STORE_PATH.name), "modified": meta.get("modified"), "exists": STORE_PATH.exists()}


# In-process cache: the measures store is large (≈800k rows) and immutable
# between refreshes. Without this, every /api/rank call re-pulled the full table
# from Supabase (and ran a 5-call CMS stale-check) — ~25s per request. Cached,
# the first request warms it and the rest are instant.
_MEASURES_CACHE: pd.DataFrame | None = None


def clear_cache() -> None:
    global _MEASURES_CACHE
    _MEASURES_CACHE = None


def load(force_refresh: bool = False) -> pd.DataFrame:
    """Return the measures store, building/refreshing when stale. Cached in-process."""
    global _MEASURES_CACHE
    from . import supabase_store

    if not force_refresh and _MEASURES_CACHE is not None:
        return _MEASURES_CACHE

    if supabase_store.is_configured():
        if force_refresh:
            from . import directory

            df, modified = build(refresh=True)
            dir_df = directory.load(refresh=True)
            supabase_store.sync_from_frames(df, dir_df, modified=modified)
            _MEASURES_CACHE = df
            return df
        _MEASURES_CACHE = supabase_store.load_measures()
        return _MEASURES_CACHE

    if force_refresh or (_MEASURES_CACHE is None and is_stale()):
        df, modified = build(refresh=force_refresh)
        _MEASURES_CACHE = df
        return df

    _MEASURES_CACHE = pd.read_parquet(STORE_PATH)
    return _MEASURES_CACHE


def measures_for_facility(facility_id: str, df: pd.DataFrame | None = None) -> list[dict]:
    """All measure rows for one hospital."""
    store = df if df is not None else load()
    fid = normalize_facility_id(facility_id)
    rows = store.loc[store["facility_id"] == fid]
    out = []
    for _, r in rows.iterrows():
        out.append(
            {
                "measure_id": r["measure_id"],
                "score": None if pd.isna(r["score"]) else float(r["score"]),
                "compared_to_national": r["compared_to_national"],
                "footnote": r["footnote"],
                "dataset_key": r["dataset_key"],
            }
        )
    return out
