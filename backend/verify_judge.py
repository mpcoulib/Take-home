#!/usr/bin/env python3
"""GATE 4 — independent recompute of one ranking from raw parquet scores."""
from __future__ import annotations

import json
import sys

from app import cms_measures, measures, ranking


def recompute(condition: str, facility_ids: list[str]) -> dict:
    store = cms_measures.load()
    cond_measures = measures.measures_for(condition)
    measure_ids = {m.id for m in cond_measures}
    nat = ranking.build_national_stats(store, measure_ids)
    total_weight = sum(m.weight for m in cond_measures)

    rows = []
    for fid in facility_ids:
        fid = cms_measures.normalize_facility_id(fid)
        sub = store[(store["facility_id"] == fid) & (store["measure_id"].isin(measure_ids))]
        included: list[tuple[float, float]] = []
        for m in cond_measures:
            hit = sub[sub["measure_id"] == m.id]
            raw = None
            if not hit.empty:
                raw = hit.iloc[0]["score"]
            stats = nat[m.id]
            reason = ranking.exclusion_reason(
                raw,
                hit.iloc[0]["compared_to_national"] if not hit.empty else None,
                hit.iloc[0]["footnote"] if not hit.empty else "",
                bool(stats.scores),
            )
            if reason is None:
                pts = ranking.score_measure(raw, m.direction, stats)
                if pts is not None:
                    included.append((m.weight, pts))
        inc_w = sum(w for w, _ in included)
        score = sum(w * p for w, p in included) / inc_w if inc_w else None
        if score is not None:
            score = round(min(100.0, max(0.0, score)), 2)
        rows.append(
            {
                "facility_id": fid,
                "score": score,
                "coverage": round(inc_w / total_weight, 4) if total_weight else 0,
            }
        )

    rows.sort(key=lambda r: (-(r["score"] or -1), -r["coverage"], r["facility_id"]))
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return {"condition": condition, "rankings": rows}


def main() -> int:
    condition = "knee_surgery"
    facility_ids = ["050441", "050283", "050076"]
    api = ranking.rank_facilities(condition, facility_ids)
    judge = recompute(condition, facility_ids)

    print("=== API ranking ===")
    for r in api["rankings"]:
        print(r["rank"], r["facility_id"], r["score"], r["coverage"], r.get("low_coverage"))

    print("\n=== Judge recompute ===")
    for r in judge["rankings"]:
        print(r["rank"], r["facility_id"], r["score"], r["coverage"])

    api_order = [r["facility_id"] for r in api["rankings"]]
    judge_order = [r["facility_id"] for r in judge["rankings"]]
    api_scores = {r["facility_id"]: r["score"] for r in api["rankings"]}
    judge_scores = {r["facility_id"]: r["score"] for r in judge["rankings"]}

    ok = api_order == judge_order
    for fid in facility_ids:
        fid = cms_measures.normalize_facility_id(fid)
        if api_scores[fid] != judge_scores[fid]:
            ok = False
            print(f"MISMATCH {fid}: api={api_scores[fid]} judge={judge_scores[fid]}")

    print("\nGATE 4:", "PASS" if ok else "FAIL")
    if not ok:
        print(json.dumps({"api": api_order, "judge": judge_order}, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
