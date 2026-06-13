"""Direction-aware, weighted, missing-data-safe hospital ranking (A1c spec)."""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Optional

import networkx as nx
import pandas as pd

from . import cms_measures, directory, graph, measures

COVERAGE_THRESHOLD = 0.50


@dataclass(frozen=True)
class NationalStats:
    scores: tuple[float, ...]
    median: Optional[float]


def _is_finite_score(score: Any) -> bool:
    if score is None:
        return False
    try:
        v = float(score)
    except (TypeError, ValueError):
        return False
    return not (math.isnan(v) or math.isinf(v))


def percentile_rank(score: float, scores: list[float]) -> float:
    """0–100 percentile; higher means larger raw value in the pool."""
    n = len(scores)
    if n == 0:
        raise ValueError("empty score pool")
    if n == 1:
        return 50.0
    below = sum(1 for s in scores if s < score)
    equal = sum(1 for s in scores if s == score)
    return 100.0 * (below + 0.5 * equal) / n


def measure_points(score: float, ref: list[float], direction: str) -> float:
    pct = percentile_rank(score, ref)
    if direction == "lower":
        return 100.0 - pct
    return pct


def vs_national_ratio(score: float, median: Optional[float], direction: str) -> Optional[float]:
    """Display-only ratio; null when divide-by-zero would occur."""
    if median is None or median <= 0 or score <= 0:
        return None
    if direction == "higher":
        return score / median
    return median / score


def vs_national_gap(score: float, median: Optional[float]) -> Optional[float]:
    if median is None or median <= 0:
        return None
    return (score - median) / median


def build_national_stats(store: pd.DataFrame, measure_ids: set[str]) -> dict[str, NationalStats]:
    out: dict[str, NationalStats] = {}
    for mid in measure_ids:
        rows = store.loc[store["measure_id"] == mid, "score"]
        valid = [float(s) for s in rows if _is_finite_score(s)]
        med = float(pd.Series(valid).median()) if valid else None
        out[mid] = NationalStats(scores=tuple(valid), median=med)
    return out


def exclusion_reason(
    score: Any,
    vs_national: Optional[str],
    footnote: str,
    has_national_pool: bool,
) -> Optional[str]:
    if not has_national_pool:
        return "no_national_data"
    if not _is_finite_score(score):
        if vs_national in ("not_available", "too_few_cases"):
            return "not_available"
        if footnote:
            return "no_score"
        return "no_score"
    return None


def score_measure(
    raw_score: Any,
    direction: str,
    stats: NationalStats,
) -> Optional[float]:
    if not _is_finite_score(raw_score) or not stats.scores:
        return None
    return round(measure_points(float(raw_score), list(stats.scores), direction), 4)


def rank_facilities(
    condition: str,
    facility_ids: list[str],
    store: pd.DataFrame | None = None,
    g: nx.DiGraph | None = None,
) -> dict:
    """Rank hospitals for a condition; pure over graph + national stats."""
    if condition not in measures.CONDITIONS:
        raise KeyError(f"Unknown condition: {condition}")

    df = store if store is not None else cms_measures.load()
    cond_measures = measures.measures_for(condition)
    measure_ids = {m.id for m in cond_measures}
    total_weight = sum(m.weight for m in cond_measures)
    nat = build_national_stats(df, measure_ids)

    fids = [cms_measures.normalize_facility_id(f) for f in facility_ids]
    graph_obj = g if g is not None else graph.build_graph(condition, facility_ids=tuple(fids), store=df)
    dir_df = directory.load()

    results: list[dict] = []

    for fid in fids:
        name = ""
        hit = dir_df.loc[dir_df["facility_id"] == fid]
        if not hit.empty:
            name = hit.iloc[0]["name"]

        measure_rows: list[dict] = []
        included_pts: list[tuple[float, float]] = []  # (weight, measure_pts)
        excluded_reasons: list[str] = []

        for m in cond_measures:
            stats = nat[m.id]
            edge_data: dict = {}
            if graph_obj.has_edge(graph._measure_node(m.id), graph._hospital_node(fid)):
                edge_data = graph_obj[graph._measure_node(m.id)][graph._hospital_node(fid)]

            raw = edge_data.get("score")
            vs_nat = edge_data.get("vs_national")
            foot = edge_data.get("footnote") or ""
            reason = exclusion_reason(raw, vs_nat, foot, bool(stats.scores))
            pts = score_measure(raw, m.direction, stats) if reason is None else None

            row = {
                "id": m.id,
                "label": m.label,
                "direction": m.direction,
                "weight": m.weight,
                "raw_score": float(raw) if _is_finite_score(raw) else None,
                "measure_score": pts,
                "vs_national": vs_nat,
                "national_median": stats.median,
                "vs_national_ratio": (
                    round(vs_national_ratio(float(raw), stats.median, m.direction), 4)
                    if _is_finite_score(raw)
                    else None
                ),
                "vs_national_gap": (
                    round(vs_national_gap(float(raw), stats.median), 4)
                    if _is_finite_score(raw)
                    else None
                ),
                "footnote": foot,
                "included": reason is None,
                "exclusion_reason": reason,
            }
            measure_rows.append(row)

            if reason is None and pts is not None:
                included_pts.append((float(m.weight), pts))
            elif reason:
                label = foot or reason.replace("_", " ")
                if label not in excluded_reasons:
                    excluded_reasons.append(label)

        included_weight = sum(w for w, _ in included_pts)
        coverage = included_weight / total_weight if total_weight else 0.0
        low_coverage = coverage < COVERAGE_THRESHOLD

        if included_pts and included_weight > 0:
            hospital_score = sum(w * p for w, p in included_pts) / included_weight
            hospital_score = round(min(100.0, max(0.0, hospital_score)), 2)
        else:
            hospital_score = None

        for row in measure_rows:
            if row["included"]:
                row["effective_weight"] = round(row["weight"] / included_weight, 4) if included_weight else 0.0
            else:
                row["effective_weight"] = 0.0

        results.append(
            {
                "facility_id": fid,
                "name": name,
                "score": hospital_score,
                "coverage": round(coverage, 4),
                "low_coverage": low_coverage,
                "measures": measure_rows,
                "excluded_reasons": excluded_reasons,
            }
        )

    def sort_key(r: dict) -> tuple:
        score = r["score"]
        score_key = score if score is not None else -1.0
        return (-score_key, -r["coverage"], r["facility_id"])

    results.sort(key=sort_key)
    for i, r in enumerate(results, start=1):
        r["rank"] = i

    return {
        "condition": condition,
        "display": measures.CONDITIONS[condition]["display"],
        "total_weight": total_weight,
        "coverage_threshold": COVERAGE_THRESHOLD,
        "rankings": results,
    }
