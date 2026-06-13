"""Optional Supabase/Postgres backend for production (DATABASE_URL).

When DATABASE_URL is set, cms_measures and directory read from Postgres instead
of local parquet/CSV. Local dev without env vars keeps using parquet unchanged.
"""
from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any, Iterator, Optional

import pandas as pd

_CONN: Any = None


def is_configured() -> bool:
    return bool(os.environ.get("DATABASE_URL", "").strip())


def backend_name() -> str:
    return "supabase" if is_configured() else "parquet"


@contextmanager
def _connection() -> Iterator[Any]:
    global _CONN
    import psycopg

    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL is not set")

    if _CONN is None or _CONN.closed:
        _CONN = psycopg.connect(url, autocommit=False)
    try:
        yield _CONN
    except Exception:
        _CONN.rollback()
        raise


def load_measures() -> pd.DataFrame:
    with _connection() as conn:
        df = pd.read_sql(
            """
            SELECT facility_id, measure_id, score, compared_to_national,
                   footnote, dataset_key
            FROM facility_measures
            """,
            conn,
        )
    return df


def load_directory() -> pd.DataFrame:
    with _connection() as conn:
        df = pd.read_sql(
            """
            SELECT facility_id, name, city, state, type, ownership
            FROM facilities
            """,
            conn,
        )
    return df.drop_duplicates(subset=["facility_id"], keep="first").reset_index(drop=True)


def load_meta() -> dict:
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT value FROM store_meta WHERE key = 'modified'")
            row = cur.fetchone()
    if not row:
        return {}
    value = row[0]
    if isinstance(value, dict):
        return {"modified": value}
    if isinstance(value, str):
        return json.loads(value)
    return {"modified": value}


def _batched_executemany(cur: Any, sql: str, rows: list[tuple], page_size: int = 2000) -> None:
    for i in range(0, len(rows), page_size):
        cur.executemany(sql, rows[i : i + page_size])


def upsert_facilities(df: pd.DataFrame) -> int:
    rows = [
        (
            str(r.facility_id),
            str(r.name or ""),
            str(r.city or ""),
            str(r.state or ""),
            str(r.type or ""),
            str(r.ownership or ""),
        )
        for r in df.itertuples(index=False)
    ]
    if not rows:
        return 0

    sql = """
        INSERT INTO facilities (facility_id, name, city, state, type, ownership)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (facility_id) DO UPDATE SET
          name = EXCLUDED.name,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          type = EXCLUDED.type,
          ownership = EXCLUDED.ownership,
          updated_at = now()
    """
    with _connection() as conn:
        with conn.cursor() as cur:
            _batched_executemany(cur, sql, rows)
        conn.commit()
    return len(rows)


def upsert_measures(df: pd.DataFrame) -> int:
    rows = []
    for r in df.itertuples(index=False):
        score = r.score
        if score is not None and pd.isna(score):
            score = None
        compared = r.compared_to_national
        if compared is not None and (isinstance(compared, float) and pd.isna(compared)):
            compared = None
        rows.append(
            (
                str(r.facility_id),
                str(r.measure_id),
                float(score) if score is not None else None,
                str(compared) if compared is not None else None,
                str(r.footnote or ""),
                str(r.dataset_key or ""),
            )
        )
    if not rows:
        return 0

    sql = """
        INSERT INTO facility_measures (
          facility_id, measure_id, score, compared_to_national,
          footnote, dataset_key
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (facility_id, measure_id) DO UPDATE SET
          score = EXCLUDED.score,
          compared_to_national = EXCLUDED.compared_to_national,
          footnote = EXCLUDED.footnote,
          dataset_key = EXCLUDED.dataset_key
    """
    with _connection() as conn:
        with conn.cursor() as cur:
            _batched_executemany(cur, sql, rows)
        conn.commit()
    return len(rows)


def upsert_modified(modified: dict[str, str]) -> None:
    payload = json.dumps(modified)
    with _connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO store_meta (key, value, updated_at)
                VALUES ('modified', %s::jsonb, now())
                ON CONFLICT (key) DO UPDATE SET
                  value = EXCLUDED.value,
                  updated_at = now()
                """,
                (payload,),
            )
        conn.commit()


def sync_from_frames(
    measures_df: pd.DataFrame,
    directory_df: pd.DataFrame,
    modified: Optional[dict[str, str]] = None,
) -> dict[str, int]:
    """Push in-memory CMS frames to Supabase (used by refresh + sync script)."""
    n_fac = upsert_facilities(directory_df)
    n_meas = upsert_measures(measures_df)
    if modified is not None:
        upsert_modified(modified)
    return {"facilities": n_fac, "measures": n_meas}
