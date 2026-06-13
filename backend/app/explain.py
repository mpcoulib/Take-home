"""Grounded hospital ranking explanations: Claude + deterministic template fallback."""
from __future__ import annotations

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Literal

Source = Literal["llm", "template"]

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 150

SYSTEM_PROMPT = (
    "You explain CMS hospital quality rankings to patients and care navigators. "
    "Use ONLY the numbers and facts in the user message JSON. "
    "Never invent rates, rankings, percentages, or clinical claims. "
    "Write exactly 2 direct sentences. Do not mention being an AI."
)


def _api_key() -> str | None:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    return key or None


def llm_available() -> bool:
    """True when an Anthropic API key is configured."""
    return _api_key() is not None


def _better_count(measures: list[dict]) -> int:
    return sum(1 for m in measures if m.get("included") and m.get("vs_national") == "better")


def _best_measure_label(measures: list[dict]) -> str:
    included = [m for m in measures if m.get("included")]
    if not included:
        return "no included measures"
    scored = [m for m in included if m.get("measure_score") is not None]
    if scored:
        best = max(scored, key=lambda m: float(m["measure_score"]))
        return str(best.get("label") or best.get("id") or "top measure")
    for pref in ("better", "no_different", "worse"):
        hit = next((m for m in included if m.get("vs_national") == pref), None)
        if hit:
            return str(hit.get("label") or hit.get("id") or "a measure")
    return str(included[0].get("label") or included[0].get("id") or "a measure")


def build_grounding_payload(hospital: dict, condition_display: str) -> dict[str, Any]:
    """Extract only real joined numbers for LLM grounding or template rendering."""
    measures = hospital.get("measures") or []
    included = [m for m in measures if m.get("included")]
    excluded = [m for m in measures if not m.get("included")]
    beats = _better_count(measures)

    measure_facts: list[dict[str, Any]] = []
    for m in included:
        measure_facts.append(
            {
                "label": m.get("label"),
                "raw_score": m.get("raw_score"),
                "national_median": m.get("national_median"),
                "measure_score": m.get("measure_score"),
                "vs_national": m.get("vs_national"),
                "vs_national_ratio": m.get("vs_national_ratio"),
                "vs_national_gap": m.get("vs_national_gap"),
            }
        )

    name = hospital.get("name") or hospital.get("facility_id") or "This hospital"
    return {
        "name": name,
        "facility_id": hospital.get("facility_id"),
        "condition": condition_display,
        "score": hospital.get("score"),
        "coverage": hospital.get("coverage"),
        "rank": hospital.get("rank"),
        "low_coverage": hospital.get("low_coverage"),
        "beats_national": beats,
        "total_measures": len(measures),
        "missing_measures": len(excluded),
        "best_measure": _best_measure_label(measures),
        "excluded_reasons": list(hospital.get("excluded_reasons") or []),
        "measures": measure_facts,
    }


def template_explanation(payload: dict[str, Any]) -> str:
    """Deterministic fallback; pure function of grounding payload."""
    name = payload["name"]
    k = int(payload["beats_national"])
    n = int(payload["total_measures"])
    condition = payload["condition"]
    best = payload["best_measure"]
    m = int(payload["missing_measures"])
    reasons_list = payload.get("excluded_reasons") or []
    reasons = "; ".join(reasons_list) if reasons_list else "none"

    if k == 0:
        first = (
            f"{name} does not beat the national rate on any of the {n} "
            f"{condition} measures with available data."
        )
    else:
        first = (
            f"{name} beats the national rate on {k} of {n} {condition} measures, "
            f"including {best}."
        )

    if m == 0:
        return first

    second = f"Data unavailable for {m} measure{'s' if m != 1 else ''} ({reasons})."
    return f"{first} {second}"


def _parse_text_blocks(response: Any) -> str:
    parts: list[str] = []
    for block in getattr(response, "content", []) or []:
        if getattr(block, "type", None) == "text":
            parts.append(getattr(block, "text", ""))
    return " ".join(p.strip() for p in parts if p.strip()).strip()


def explain_one(hospital: dict, condition_display: str) -> tuple[str, Source]:
    """Return (explanation_text, source) for one ranked hospital."""
    payload = build_grounding_payload(hospital, condition_display)
    key = _api_key()
    if not key:
        return template_explanation(payload), "template"

    try:
        import anthropic
        from anthropic import APIConnectionError, APIError, AuthenticationError

        client = anthropic.Anthropic(api_key=key)
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": json.dumps(payload, sort_keys=True),
                }
            ],
        )
        text = _parse_text_blocks(response)
        if text:
            return text, "llm"
    except Exception:  # noqa: BLE001 — spec: any failure → template
        pass

    return template_explanation(payload), "template"


def enrich_rankings(rank_result: dict, max_workers: int = 8) -> dict:
    """Add explanation + explanation_source to each hospital in rankings."""
    condition_display = rank_result.get("display") or rank_result.get("condition", "")
    rankings = rank_result.get("rankings") or []
    if not rankings:
        return rank_result

    workers = min(max_workers, len(rankings))
    results: dict[str, tuple[str, Source]] = {}

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(explain_one, hospital, condition_display): hospital["facility_id"]
            for hospital in rankings
        }
        for fut in as_completed(futures):
            fid = futures[fut]
            try:
                results[fid] = fut.result()
            except Exception:  # noqa: BLE001
                payload = build_grounding_payload(
                    next(h for h in rankings if h["facility_id"] == fid),
                    condition_display,
                )
                results[fid] = (template_explanation(payload), "template")

    for hospital in rankings:
        text, source = results.get(
            hospital["facility_id"],
            (template_explanation(build_grounding_payload(hospital, condition_display)), "template"),
        )
        hospital["explanation"] = text
        hospital["explanation_source"] = source

    return rank_result
