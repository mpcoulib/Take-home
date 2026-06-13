"""NetworkX knowledge graph: Condition → Measure → Hospital."""
from __future__ import annotations

from functools import lru_cache
from typing import Any, Optional

import networkx as nx
import pandas as pd

from . import cms_measures, directory, measures

NODE_CONDITION = "Condition"
NODE_MEASURE = "Measure"
NODE_HOSPITAL = "Hospital"
EDGE_NEEDS = "needs"
EDGE_REPORTED_BY = "reported_by"


def _condition_node(condition: str) -> str:
    return f"condition:{condition}"


def _measure_node(measure_id: str) -> str:
    return f"measure:{measure_id}"


def _hospital_node(facility_id: str) -> str:
    return f"hospital:{facility_id}"


def _valid_score(raw) -> Optional[float]:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    return float(raw)


@lru_cache(maxsize=4)
def _store_frame() -> pd.DataFrame:
    return cms_measures.load()


def build_graph(
    condition: str,
    facility_ids: tuple[str, ...] | None = None,
    store: pd.DataFrame | None = None,
) -> nx.DiGraph:
    """Build a DiGraph for one condition, optionally limited to facility_ids."""
    if condition not in measures.CONDITIONS:
        raise KeyError(f"Unknown condition: {condition}")

    df = store if store is not None else _store_frame()
    cond = measures.CONDITIONS[condition]
    cond_measures = measures.measures_for(condition)
    measure_ids = {m.id for m in cond_measures}

    g = nx.DiGraph()
    g.add_node(
        _condition_node(condition),
        type=NODE_CONDITION,
        id=condition,
        display=cond["display"],
        description=cond["description"],
    )

    for m in cond_measures:
        g.add_node(
            _measure_node(m.id),
            type=NODE_MEASURE,
            id=m.id,
            label=m.label,
            direction=m.direction,
            dataset=m.dataset,
        )
        g.add_edge(
            _condition_node(condition),
            _measure_node(m.id),
            type=EDGE_NEEDS,
            weight=m.weight,
        )

    subset = df[df["measure_id"].isin(measure_ids)]
    if facility_ids:
        fids = {cms_measures.normalize_facility_id(f) for f in facility_ids}
        subset = subset[subset["facility_id"].isin(fids)]

    dir_lookup = directory.load()
    hospitals_seen: set[str] = set()

    for _, row in subset.iterrows():
        fid = row["facility_id"]
        mid = row["measure_id"]
        hospitals_seen.add(fid)

        if not g.has_node(_hospital_node(fid)):
            info = dir_lookup.loc[dir_lookup["facility_id"] == fid]
            attrs: dict[str, Any] = {"type": NODE_HOSPITAL, "id": fid}
            if not info.empty:
                rec = info.iloc[0]
                attrs.update(name=rec["name"], city=rec["city"], state=rec["state"])
            else:
                attrs.update(name="", city="", state="")
            g.add_node(_hospital_node(fid), **attrs)

        score = _valid_score(row["score"])
        compared = row["compared_to_national"]
        if pd.isna(compared):
            compared = None
        footnote = row["footnote"] if isinstance(row["footnote"], str) else ""

        g.add_edge(
            _measure_node(mid),
            _hospital_node(fid),
            type=EDGE_REPORTED_BY,
            score=score,
            vs_national=compared,
            footnote=footnote,
        )

    return g


def subgraph_for_condition(
    condition: str,
    facility_ids: list[str] | None = None,
) -> nx.DiGraph:
    """Condition subgraph; all hospitals with data when facility_ids omitted."""
    fids = tuple(facility_ids) if facility_ids else None
    return build_graph(condition, facility_ids=fids)


def graph_to_json(g: nx.DiGraph) -> dict:
    """Serialize graph nodes/edges for visualization."""
    nodes = []
    for nid, data in g.nodes(data=True):
        nodes.append({"id": nid, **{k: v for k, v in data.items() if k != "type"}, "type": data.get("type")})
    edges = []
    for src, dst, data in g.edges(data=True):
        edges.append({"source": src, "target": dst, **data})
    return {"nodes": nodes, "edges": edges}


def clear_cache() -> None:
    _store_frame.cache_clear()
