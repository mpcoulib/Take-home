"""CMS Provider Data Catalog client.

Resolve a dataset by its catalog id (e.g. ``xubh-q36u``), download the CSV
distribution, and run server-side SQL via the datastore. Lets the loader pull
fresh data with just the id instead of a brittle hard-coded download URL.

API docs: https://data.cms.gov/provider-data/
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

BASE = "https://data.cms.gov/provider-data/api/1"
TIMEOUT = 90


@dataclass
class DatasetRef:
    dataset_id: str
    title: str
    modified: str
    download_url: str
    distribution_id: Optional[str]


def resolve(dataset_id: str) -> DatasetRef:
    """Look up a dataset's CSV download URL + distribution id from the metastore."""
    url = f"{BASE}/metastore/schemas/dataset/items/{dataset_id}?show-reference-ids"
    m = requests.get(url, timeout=TIMEOUT)
    m.raise_for_status()
    m = m.json()
    dist = (m.get("distribution") or [{}])[0]
    data = dist.get("data", dist)
    return DatasetRef(
        dataset_id=dataset_id,
        title=m.get("title", dataset_id),
        modified=m.get("modified", ""),
        download_url=data.get("downloadURL", ""),
        distribution_id=dist.get("identifier"),
    )


def _slug(title: str, dataset_id: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")
    return s or dataset_id


def fetch(dataset_id: str, data_dir: Path | None = None, refresh: bool = False) -> tuple[Path, DatasetRef]:
    """Download the dataset CSV into ``data_dir`` (cached) and return its path + ref."""
    from .runtime import cache_dir

    data_dir = data_dir or cache_dir()
    ref = resolve(dataset_id)
    if not ref.download_url:
        raise ValueError(f"No CSV distribution for dataset '{dataset_id}'")
    data_dir.mkdir(parents=True, exist_ok=True)
    dest = data_dir / f"{_slug(ref.title, dataset_id)}.csv"
    if refresh or not dest.exists():
        r = requests.get(ref.download_url, timeout=TIMEOUT)
        r.raise_for_status()
        dest.write_bytes(r.content)
    return dest, ref


def sql(query: str, limit: int = 5000) -> pd.DataFrame:
    """Run a Datastore SQL query. Caller supplies the ``[SELECT ... FROM <distId>]`` body.

    NOTE: WHERE/SELECT must use the datastore's *machine* column names (lower_snake,
    e.g. ``state``, ``hospital_overall_rating``) — not the human CSV headers.

    Example: ``sql("[SELECT * FROM b0a92ff7-...][WHERE state = 'NY'][LIMIT 100]")``
    """
    r = requests.get(f"{BASE}/datastore/sql", params={"query": query, "show_db_columns": True},
                     timeout=TIMEOUT)
    r.raise_for_status()
    return pd.DataFrame(r.json())


def query(distribution_id: str, conditions: Optional[list[dict]] = None,
          limit: int = 500, offset: int = 0) -> pd.DataFrame:
    """Structured datastore query (no SQL). conditions: [{property, value, operator}]."""
    body: dict = {"conditions": conditions or [], "limit": limit, "offset": offset}
    r = requests.post(f"{BASE}/datastore/query/{distribution_id}", json=body, timeout=TIMEOUT)
    r.raise_for_status()
    return pd.DataFrame(r.json().get("results", []))
