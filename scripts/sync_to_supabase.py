#!/usr/bin/env python3
"""Populate Supabase from local parquet + CMS directory data.

Requires DATABASE_URL (Supabase → Project Settings → Database → Connection string).
Run migrations first (supabase db push or SQL editor).

Usage:
  export DATABASE_URL='postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres'
  python scripts/sync_to_supabase.py

Optional: build from CMS instead of parquet:
  python scripts/sync_to_supabase.py --refresh
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app import cms_measures, directory, supabase_store  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync CMS hospital data to Supabase")
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Re-fetch CMS CSVs and rebuild store before sync",
    )
    args = parser.parse_args()

    if not supabase_store.is_configured():
        print("ERROR: Set DATABASE_URL to your Supabase Postgres connection string.")
        return 1

    print("Loading measures store...")
    if args.refresh:
        measures_df, modified = cms_measures.build(refresh=True)
        directory_df = directory._load_general_info(refresh=True)
        meta = modified
    else:
        import json

        import pandas as pd

        if not cms_measures.STORE_PATH.exists():
            print(f"ERROR: Missing {cms_measures.STORE_PATH}. Run with --refresh first.")
            return 1
        measures_df = pd.read_parquet(cms_measures.STORE_PATH)
        directory_df = directory._load_general_info(refresh=False)
        meta = {}
        if cms_measures.META_PATH.exists():
            meta = json.loads(cms_measures.META_PATH.read_text()).get("modified", {})

    print(f"  measures rows: {len(measures_df)}")
    print(f"  facilities rows: {len(directory_df)}")

    print("Upserting to Supabase...")
    counts = supabase_store.sync_from_frames(measures_df, directory_df, modified=meta)
    print(f"Done. facilities={counts['facilities']}, measures={counts['measures']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
