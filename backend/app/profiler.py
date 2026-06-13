"""Dataset-agnostic profiler + data-quality inspector.

Drop any DataFrame in, get back JSON-safe structures describing schema,
per-column stats, quality issues, and chart-ready aggregations.
"""
from __future__ import annotations

import math
from typing import Any

import pandas as pd
from pandas.api import types as pdt


def _safe(v: Any) -> Any:
    """Coerce a value into something JSON-serializable."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, (pd.Timestamp,)):
        return v.isoformat()
    if pdt.is_integer(v):
        return int(v)
    if pdt.is_float(v):
        return float(v)
    return str(v)


def col_kind(s: pd.Series) -> str:
    if pdt.is_datetime64_any_dtype(s):
        return "datetime"
    if pdt.is_numeric_dtype(s):
        return "numeric"
    if pdt.is_bool_dtype(s):
        return "boolean"
    return "categorical"


def overview(df: pd.DataFrame) -> dict:
    mem = int(df.memory_usage(deep=True).sum())
    return {
        "rows": int(len(df)),
        "columns": int(df.shape[1]),
        "memory_bytes": mem,
        "duplicate_rows": int(df.duplicated().sum()),
        "column_names": list(map(str, df.columns)),
    }


def profile_column(s: pd.Series) -> dict:
    kind = col_kind(s)
    n = len(s)
    nulls = int(s.isna().sum())
    distinct = int(s.nunique(dropna=True))
    info: dict = {
        "name": str(s.name),
        "kind": kind,
        "dtype": str(s.dtype),
        "nulls": nulls,
        "null_pct": round(nulls / n * 100, 2) if n else 0.0,
        "distinct": distinct,
        "distinct_pct": round(distinct / n * 100, 2) if n else 0.0,
    }
    nonnull = s.dropna()
    if kind == "numeric" and len(nonnull):
        desc = nonnull.describe()
        info["stats"] = {k: _safe(desc[k]) for k in ("mean", "std", "min", "25%", "50%", "75%", "max")}
        info["histogram"] = _histogram(nonnull)
    elif kind == "datetime" and len(nonnull):
        info["stats"] = {"min": _safe(nonnull.min()), "max": _safe(nonnull.max())}
    elif kind in ("categorical", "boolean") and len(nonnull):
        vc = nonnull.value_counts().head(15)
        info["top_values"] = [{"value": _safe(k), "count": int(v)} for k, v in vc.items()]
    return info


def _histogram(s: pd.Series, bins: int = 20) -> list[dict]:
    try:
        binned = pd.cut(s, bins=bins, duplicates="drop")
        vc = binned.value_counts().sort_index()
        return [{"bin": str(iv), "count": int(c)} for iv, c in vc.items()]
    except Exception:
        return []


def quality_issues(df: pd.DataFrame) -> list[dict]:
    """Heuristic data-quality findings, ranked by severity."""
    issues: list[dict] = []
    n = len(df)
    dup = int(df.duplicated().sum())
    if dup:
        issues.append({"severity": "warn", "column": None,
                       "issue": f"{dup} duplicate rows ({round(dup/n*100,1)}%)"})
    for col in df.columns:
        s = df[col]
        nulls = int(s.isna().sum())
        null_pct = nulls / n * 100 if n else 0
        if null_pct >= 50:
            issues.append({"severity": "high", "column": str(col),
                           "issue": f"{round(null_pct,1)}% missing values"})
        elif null_pct >= 10:
            issues.append({"severity": "warn", "column": str(col),
                           "issue": f"{round(null_pct,1)}% missing values"})
        if s.nunique(dropna=True) <= 1 and n:
            issues.append({"severity": "warn", "column": str(col),
                           "issue": "constant / single-valued column"})
        if pdt.is_numeric_dtype(s):
            nonnull = s.dropna()
            if len(nonnull) > 10:
                q1, q3 = nonnull.quantile(0.25), nonnull.quantile(0.75)
                iqr = q3 - q1
                if iqr > 0:
                    out = ((nonnull < q1 - 3 * iqr) | (nonnull > q3 + 3 * iqr)).sum()
                    if out:
                        issues.append({"severity": "info", "column": str(col),
                                       "issue": f"{int(out)} extreme outliers (>3·IQR)"})
        # Mixed-type object columns often signal dirty parsing.
        if s.dtype == "object":
            kinds = nonnull_types(s)
            if len(kinds) > 1:
                issues.append({"severity": "info", "column": str(col),
                               "issue": f"mixed python types: {', '.join(sorted(kinds))}"})
    order = {"high": 0, "warn": 1, "info": 2}
    return sorted(issues, key=lambda x: order.get(x["severity"], 3))


def nonnull_types(s: pd.Series) -> set[str]:
    return {type(v).__name__ for v in s.dropna().head(1000)}


def full_profile(df: pd.DataFrame) -> dict:
    return {
        "overview": overview(df),
        "columns": [profile_column(df[c]) for c in df.columns],
        "issues": quality_issues(df),
    }
