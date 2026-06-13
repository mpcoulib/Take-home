"""Generic exploration: filtering + group-by aggregation for any DataFrame.

Powers the interactive frontend. All operations are column-name driven so
nothing here is tied to a specific dataset.
"""
from __future__ import annotations

from typing import Any, Optional

import pandas as pd
from pandas.api import types as pdt

from .profiler import _safe


def apply_filters(df: pd.DataFrame, filters: list[dict]) -> pd.DataFrame:
    """filters: [{column, op, value}]. op in eq, ne, gt, lt, ge, le, contains, in."""
    out = df
    for f in filters or []:
        col, op, val = f.get("column"), f.get("op", "eq"), f.get("value")
        if col not in out.columns:
            continue
        s = out[col]
        if op == "eq":
            out = out[s == val]
        elif op == "ne":
            out = out[s != val]
        elif op == "gt":
            out = out[s > val]
        elif op == "lt":
            out = out[s < val]
        elif op == "ge":
            out = out[s >= val]
        elif op == "le":
            out = out[s <= val]
        elif op == "contains":
            out = out[s.astype(str).str.contains(str(val), case=False, na=False)]
        elif op == "in" and isinstance(val, list):
            out = out[s.isin(val)]
    return out


def aggregate(df: pd.DataFrame, group_by: str, metric: Optional[str] = None,
              agg: str = "count", limit: int = 30) -> list[dict]:
    """Group rows by a column and aggregate. Returns chart-ready records."""
    if group_by not in df.columns:
        return []
    g = df.groupby(group_by, dropna=False)
    if agg == "count" or metric is None or metric not in df.columns:
        series = g.size()
    else:
        series = getattr(g[metric], agg)()
    series = series.sort_values(ascending=False).head(limit)
    return [{"key": _safe(k), "value": _safe(v)} for k, v in series.items()]


def timeseries(df: pd.DataFrame, date_col: str, metric: Optional[str] = None,
               agg: str = "count", freq: str = "M") -> list[dict]:
    if date_col not in df.columns:
        return []
    s = pd.to_datetime(df[date_col], errors="coerce")
    tmp = df.assign(_period=s.dt.to_period(freq).dt.to_timestamp())
    g = tmp.dropna(subset=["_period"]).groupby("_period")
    if agg == "count" or metric is None or metric not in df.columns:
        series = g.size()
    else:
        series = getattr(g[metric], agg)()
    series = series.sort_index()
    return [{"period": _safe(k), "value": _safe(v)} for k, v in series.items()]


def sample(df: pd.DataFrame, n: int = 50, offset: int = 0) -> list[dict]:
    chunk = df.iloc[offset:offset + n]
    return [{str(k): _safe(v) for k, v in row.items()} for _, row in chunk.iterrows()]
