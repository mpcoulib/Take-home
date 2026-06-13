#!/usr/bin/env python3
"""Quick Supabase/Postgres connectivity check (no data writes).

Usage:
  export DATABASE_URL='postgresql://...'
  python scripts/test_supabase_connection.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app import supabase_store  # noqa: E402


def main() -> int:
    if not supabase_store.is_configured():
        print("SKIP: DATABASE_URL not set (local parquet mode is fine for dev).")
        return 0

    try:
        with supabase_store._connection() as conn:  # noqa: SLF001
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM facilities")
                n_fac = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM facility_measures")
                n_meas = cur.fetchone()[0]
        print(f"OK: connected — facilities={n_fac}, measures={n_meas}")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}")
        print("Hint: run migrations first (supabase db push or SQL editor).")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
