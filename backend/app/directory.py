"""Hospital directory — one row per facility from General Information."""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

import pandas as pd

from . import cms
from .cms_measures import GENERAL_INFO_ID, normalize_facility_id
from .loader import DATA_DIR

_DIR_COLS = {
    "facility_id": "Facility ID",
    "name": "Facility Name",
    "city": "City/Town",
    "state": "State",
    "type": "Hospital Type",
    "ownership": "Hospital Ownership",
}


def _load_general_info(refresh: bool = False) -> pd.DataFrame:
    path, _ref = cms.fetch(GENERAL_INFO_ID, DATA_DIR, refresh=refresh)
    raw = pd.read_csv(path, dtype=str, low_memory=False)
    out = pd.DataFrame(
        {
            "facility_id": raw[_DIR_COLS["facility_id"]].map(normalize_facility_id),
            "name": raw[_DIR_COLS["name"]].fillna("").str.strip(),
            "city": raw[_DIR_COLS["city"]].fillna("").str.strip(),
            "state": raw[_DIR_COLS["state"]].fillna("").str.strip(),
            "type": raw[_DIR_COLS["type"]].fillna("").str.strip(),
            "ownership": raw[_DIR_COLS["ownership"]].fillna("").str.strip(),
        }
    )
    return out.drop_duplicates(subset=["facility_id"], keep="first").reset_index(drop=True)


@lru_cache(maxsize=1)
def _cached_directory() -> pd.DataFrame:
    return _load_general_info(refresh=False)


def load(refresh: bool = False) -> pd.DataFrame:
    from . import supabase_store

    if refresh:
        _cached_directory.cache_clear()
        df = _load_general_info(refresh=True)
        if supabase_store.is_configured():
            supabase_store.upsert_facilities(df)
        return df

    if supabase_store.is_configured():
        return supabase_store.load_directory()

    return _cached_directory()


def get(facility_id: str) -> Optional[dict]:
    """Lookup one hospital by CMS Facility ID."""
    df = load()
    fid = normalize_facility_id(facility_id)
    rows = df.loc[df["facility_id"] == fid]
    if rows.empty:
        return None
    return rows.iloc[0].to_dict()


def search(q: str = "", state: str = "", limit: int = 50) -> list[dict]:
    """Substring match on name/city; optional exact state filter."""
    df = load()
    mask = pd.Series(True, index=df.index)
    if state:
        mask &= df["state"].str.upper() == state.strip().upper()
    if q:
        needle = q.strip().lower()
        mask &= (
            df["name"].str.lower().str.contains(needle, regex=False, na=False)
            | df["city"].str.lower().str.contains(needle, regex=False, na=False)
        )
    hits = df.loc[mask].head(limit)
    return hits.to_dict(orient="records")


def clear_cache() -> None:
    _cached_directory.cache_clear()
