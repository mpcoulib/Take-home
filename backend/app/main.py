"""FastAPI app: generic dataset explorer + data-quality inspector.

Endpoints are dataset-agnostic. Set the active source via DATASET env var
or pass ?source= on each call. Swap in dataset-specific routes after the
real dataset is known.
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from collections import Counter

from . import cms, cms_measures, directory, explain, explore, footnotes, graph, loader, measures, profiler, ranking, supabase_store

app = FastAPI(title="Dataset Explorer", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_SOURCE = os.environ.get("DATASET", "")
FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"


@app.on_event("startup")
def _warm_caches() -> None:
    """Pre-load the measures store + directory in a background thread so the
    first /api/rank request doesn't pay the one-time Supabase pull (~30s)."""
    import threading

    def _warm():
        try:
            cms_measures.load()
            directory.load()
        except Exception:  # noqa: BLE001 — warming is best-effort
            pass

    threading.Thread(target=_warm, daemon=True).start()


def get_df(source: str | None):
    src = source or DEFAULT_SOURCE
    if not src:
        raise HTTPException(400, "No dataset. Set DATASET env var or pass ?source=")
    try:
        return loader.load(src)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, f"Failed to load '{src}': {e}")


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "default_source": DEFAULT_SOURCE or None,
        "llm_available": explain.llm_available(),
        "data_backend": supabase_store.backend_name(),
    }


@app.get("/api/datasets")
def datasets():
    return {"local": loader.list_local(), "default": DEFAULT_SOURCE or None}


@app.get("/api/profile")
def profile(source: str | None = None):
    return profiler.full_profile(get_df(source))


@app.get("/api/sample")
def sample(source: str | None = None, n: int = Query(50, le=500), offset: int = 0):
    return {"rows": explore.sample(get_df(source), n=n, offset=offset)}


class AggReq(BaseModel):
    source: str | None = None
    filters: list[dict] = []
    group_by: str
    metric: str | None = None
    agg: str = "count"
    limit: int = 30


@app.post("/api/aggregate")
def aggregate(req: AggReq):
    df = explore.apply_filters(get_df(req.source), req.filters)
    return {"data": explore.aggregate(df, req.group_by, req.metric, req.agg, req.limit),
            "rows_after_filter": int(len(df))}


class TSReq(BaseModel):
    source: str | None = None
    filters: list[dict] = []
    date_col: str
    metric: str | None = None
    agg: str = "count"
    freq: str = "M"


@app.post("/api/timeseries")
def timeseries(req: TSReq):
    df = explore.apply_filters(get_df(req.source), req.filters)
    return {"data": explore.timeseries(df, req.date_col, req.metric, req.agg, req.freq)}


@app.post("/api/reload")
def reload():
    loader.clear_cache()
    return {"ok": True}


@app.get("/api/footnotes")
def footnote_crosswalk():
    """The CMS footnote crosswalk (code -> label + full text)."""
    return {"footnotes": [{"code": k, "label": v[0], "text": v[1]}
                          for k, v in sorted(footnotes.FOOTNOTES.items())]}


@app.get("/api/rating-breakdown")
def rating_breakdown(source: str | None = None,
                     rating_col: str = "Hospital overall rating",
                     footnote_col: str = "Hospital overall rating footnote"):
    """Decode *why* hospitals lack an overall star rating, via the footnote crosswalk.

    Dataset-specific to Hospital General Information: turns 2,250 opaque
    'Not Available' ratings into ranked, human-readable reasons.
    """
    df = get_df(source)
    if rating_col not in df.columns:
        raise HTTPException(400, f"Column '{rating_col}' not found")
    rated = df[rating_col].astype(str).str.fullmatch(r"[1-5]").fillna(False)
    dist = Counter()
    for v in df.loc[~rated, footnote_col] if footnote_col in df.columns else []:
        labels = [d["label"] for d in footnotes.decode(v)]
        dist[", ".join(labels) if labels else "(no footnote given)"] += 1
    star_dist = df.loc[rated, rating_col].value_counts().sort_index()
    return {
        "total": int(len(df)),
        "rated": int(rated.sum()),
        "unrated": int((~rated).sum()),
        "star_distribution": [{"stars": int(k), "count": int(v)} for k, v in star_dist.items()],
        "unrated_reasons": [{"reason": k, "count": v} for k, v in dist.most_common()],
    }


@app.get("/api/conditions")
def list_conditions():
    """Patient conditions and their mapped CMS measures."""
    out = []
    for key, cond in measures.CONDITIONS.items():
        out.append(
            {
                "id": key,
                "display": cond["display"],
                "description": cond["description"],
                "measures": [
                    {
                        "id": m.id,
                        "label": m.label,
                        "direction": m.direction,
                        "weight": m.weight,
                        "dataset": m.dataset,
                    }
                    for m in cond["measures"]
                ],
            }
        )
    return {"conditions": out}


@app.get("/api/hospitals/search")
def hospitals_search(
    q: str = "",
    state: str = "",
    limit: int = Query(50, le=200),
):
    return {"results": directory.search(q=q, state=state, limit=limit)}


@app.get("/api/hospitals/{facility_id}")
def hospital_detail(facility_id: str):
    info = directory.get(facility_id)
    if info is None:
        raise HTTPException(404, f"Hospital '{facility_id}' not found")
    store = cms_measures.load()
    return {
        **info,
        "measures": cms_measures.measures_for_facility(facility_id, store),
    }


@app.post("/api/data/refresh")
def data_refresh():
    """Re-fetch CMS sources and rebuild the measures parquet store."""
    directory.clear_cache()
    graph.clear_cache()
    df, _modified = cms_measures.build(refresh=True)
    dir_df = directory.load(refresh=True)
    info = cms_measures.store_info()
    sync_counts = None
    if supabase_store.is_configured():
        sync_counts = supabase_store.sync_from_frames(
            df, dir_df, modified=info.get("modified")
        )
    return {
        "ok": True,
        "rows": int(len(df)),
        "modified": info.get("modified"),
        "store": info.get("store"),
        "supabase_sync": sync_counts,
    }


class RankReq(BaseModel):
    condition: str
    facility_ids: list[str]


@app.post("/api/rank")
def rank_hospitals(req: RankReq):
    """Rank hospitals for a patient condition with per-measure national context."""
    if req.condition not in measures.CONDITIONS:
        raise HTTPException(400, f"Unknown condition '{req.condition}'")
    if not req.facility_ids:
        raise HTTPException(400, "facility_ids must not be empty")
    try:
        result = ranking.rank_facilities(req.condition, req.facility_ids)
        return explain.enrich_rankings(result)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"Ranking failed: {e}")


@app.get("/api/graph/{condition}")
def condition_graph(condition: str):
    """Knowledge-graph subgraph for visualization (Condition → Measure → Hospital)."""
    if condition not in measures.CONDITIONS:
        raise HTTPException(400, f"Unknown condition '{condition}'")
    g = graph.subgraph_for_condition(condition)
    payload = graph.graph_to_json(g)
    payload["condition"] = condition
    payload["display"] = measures.CONDITIONS[condition]["display"]
    return payload


@app.get("/api/cms/fetch")
def cms_fetch(dataset_id: str, refresh: bool = False):
    """Download a CMS Provider-Data dataset by catalog id and cache it locally.

    Returns the local filename to use as ?source= plus provenance.
    """
    try:
        path, ref = cms.fetch(dataset_id, loader.DATA_DIR, refresh=refresh)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, f"CMS fetch failed for '{dataset_id}': {e}")
    loader.clear_cache()
    return {"source": path.name, "title": ref.title, "modified": ref.modified,
            "distribution_id": ref.distribution_id, "download_url": ref.download_url}


# Serve the frontend (mounted last so /api/* wins).
if FRONTEND_DIR.exists():
    @app.get("/")
    def index():
        return FileResponse(FRONTEND_DIR / "index.html")

    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")
