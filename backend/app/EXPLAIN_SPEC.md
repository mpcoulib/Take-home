# Phase 3 Explanation Spec (frozen — A1)

This document defines the contract for `explain.py` and the `/api/rank` explanation
fields added in Phase 3.

## Grounding rule (LLM path)

The model receives **only** a JSON grounding payload built from the hospital's
real joined ranking numbers:

- Hospital: `name`, `condition`, `score`, `coverage`, `rank`, `low_coverage`
- Per included measure: `label`, `raw_score`, `national_median`, `measure_score`,
  `vs_national`, `vs_national_ratio`, `vs_national_gap`
- Summary counts: `beats_national`, `total_measures`, `missing_measures`,
  `excluded_reasons`

**Instruction (system prompt):** Explain the ranking using **ONLY** the figures in
the user payload. Never invent rates, rankings, percentages, or clinical facts.
Write exactly **2 sentences**, direct and patient-friendly. Do not mention being
an AI.

## Fallback contract (template path)

When the LLM is unavailable (missing key, API error, empty response), return a
**deterministic template** — a pure function of the grounding payload, no model:

```
{name} beats the national rate on {k} of {n} {condition} measures, including {best}; data unavailable for {m} ({reasons}).
```

Template rules:

| Variable | Source |
|----------|--------|
| `{name}` | hospital name or facility_id |
| `{k}` | count of included measures with `vs_national == "better"` |
| `{n}` | total condition measures |
| `{best}` | label of included measure with highest `measure_score`, or best `vs_national` |
| `{m}` | count of excluded measures |
| `{reasons}` | semicolon-joined `excluded_reasons`, or `"none"` when m=0 |

When `k == 0`, first clause becomes: `{name} does not beat the national rate on
any of the {n} {condition} measures with available data`.

When `m == 0`, omit the trailing clause (no "data unavailable" sentence).

## Model

- Provider: `anthropic.Anthropic()` with `ANTHROPIC_API_KEY` from environment
- Model: `claude-sonnet-4-6`
- Call: `client.messages.create(model=..., max_tokens=150, system=[cached prompt], messages=[user payload])`
- Parse: concatenate `block.text` for blocks where `block.type == "text"`

## Error handling

Wrap the LLM call in try/except for:

- `anthropic.APIError`
- `anthropic.APIConnectionError`
- `anthropic.AuthenticationError`
- `Exception` (catch-all)

Any failure → template fallback.

## Return shape

Each function returns `(text, source)` where `source ∈ {"llm", "template"}`.

Batch entry point `enrich_rankings(rank_result)` adds to each hospital in
`rankings[]`:

- `explanation`: str (non-empty)
- `explanation_source`: `"llm"` | `"template"`

## Concurrency

Generate N hospital explanations concurrently (`concurrent.futures` thread pool).
Shared system prompt uses Anthropic prompt caching.

## Health

`GET /api/health` adds `llm_available: bool` — `true` when `ANTHROPIC_API_KEY`
is set and non-empty (optionally verified reachable).

## Grounding verification (GATE 3)

For LLM-sourced explanations, every numeric token in the text must appear in the
grounding payload (see `verify_grounding.py`). Zero orphan numbers = pass.
