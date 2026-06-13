# Phase 2 Ranking Spec (frozen — A1c synthesis)

This document merges two independent scoring proposals (A1a, A1b) into one
implementation contract for `ranking.py` and the knowledge graph in `graph.py`.

## A1a — Percentile-vs-national pool (Opus-style)

**Idea:** Treat each CMS measure as a national distribution. A hospital's
per-measure contribution is its **percentile rank** within that distribution,
flipped when `direction == "lower"`.

| Step | Rule |
|------|------|
| Reference pool | All rows in `measures_store.parquet` with a valid numeric `score` for the measure |
| Percentile | `pct = 100 × (count(< score) + 0.5 × count(== score)) / n` |
| Direction flip | `lower` → `measure_pts = 100 − pct`; `higher` → `measure_pts = pct` |
| Missing score | Exclude measure; never impute |
| Aggregate | Weighted mean of included `measure_pts` → hospital score 0–100 |

**Strengths:** Scale-free across measure types (rates vs stars vs %); no
divide-by-zero; naturally direction-aware.

**Weaknesses:** Ignores CMS's own `Compared to National` categorical signal;
timely-care measures with tight clusters compress mid-range scores.

## A1b — Ratio / signed-gap vs national median (GPT-style)

**Idea:** Compute a **national median** per measure and map each hospital score
to a 0–100 value via a bounded ratio or signed gap, using CMS comparison text
as a guardrail.

| Step | Rule |
|------|------|
| National median | `median(valid scores)` per `measure_id` |
| Ratio (median > 0) | `higher`: `ratio = score / median`; `lower`: `ratio = median / score` |
| Signed gap | `gap = (score − median) / median`; flip sign when `lower` |
| Map to 0–100 | `pts = clamp(50 + 25 × gap, 0, 100)` or `pts = clamp(50 × ratio, 0, 100)` |
| CMS enum tie-in | When `compared_to_national` present, anchor: `better→70`, `no_different→50`, `worse→30` and blend 50/50 with ratio score |
| Missing score | Exclude; surface `footnote` / enum reason |
| Aggregate | Weighted mean → 0–100 |

**Strengths:** Intuitive "vs national" framing; uses CMS comparison when available.

**Weaknesses:** Ratio blows up when `median → 0` or `score → 0`; blending with
enum is ad hoc; star ratings (1–5) and rates (%) need different ratio semantics.

## A1c — Frozen synthesis (implemented)

We adopt **A1a percentile** as the sole scoring function. A1b's ratio/gap and
CMS enum are **exposed for transparency** (`vs_national`, `national_median`,
`vs_national_ratio`) but do **not** change the score.

### Per-measure score (0–100)

```
ref = all valid numeric scores for measure_id in national pool
if hospital score is null/NaN → EXCLUDE (no imputation)
pct = percentile_rank(score, ref)          # 0..100, higher = larger raw value
measure_pts = (100 - pct) if direction=="lower" else pct
```

**Percentile edge cases**

- `n == 0` (no national data): exclude measure for all hospitals.
- `n == 1`: `pct = 50` (neutral).
- Ties: mid-rank formula above (standard "rank" percentile).

**Ratio / gap (display only, divide-by-zero safe)**

```
median = national median of ref
if median > 0 and score > 0:
    ratio = (score / median) if higher else (median / score)
else:
    ratio = null    # never divide by zero; score unaffected
gap = (score - median) / median if median > 0 else null
```

### Missing-data policy

A measure is **excluded** from aggregation when:

1. `score` is `null`, `NaN`, or non-numeric, OR
2. National reference pool has zero valid scores.

Excluded measures:

- Are **not** imputed.
- Do **not** contribute weight.
- Remaining weights are **renormalized** to sum to 1:
  `effective_weight_i = weight_i / Σ(weight_j for included j)`.
- Appear in API output with `included: false`, `footnote` (decoded label), and
  `exclusion_reason` (`no_score`, `no_national_data`, or `not_available`).

### Hospital aggregation

```
hospital_score = Σ(effective_weight_i × measure_pts_i)   # over included only
coverage       = Σ(weight_i for included) / Σ(all condition weights)
low_coverage   = coverage < 0.50
```

- Hospitals with **zero** included measures: `score = null`, `rank` last,
  `coverage = 0`, `low_coverage = true`.
- Hospitals with **<50% weight coverage**: still ranked on available measures,
  flagged `low_coverage: true`. Scores are **not** fabricated.

### Tie-break (descending sort)

1. Higher `hospital_score`
2. Higher `coverage` (data completeness)
3. Lower `facility_id` (stable lexical)

### Output guarantees

- Final `score` is `null` or a finite float in `[0, 100]`.
- No `NaN` / `None` leak into numeric score fields (use `null` in JSON).
- `vs_national` carries through the normalized `compared_to_national` enum from
  SCHEMA.md (may be `null` for timely/HCAHPS).

## Knowledge graph interface (`graph.py`)

NetworkX `DiGraph` with typed nodes and edge payloads.

### Node types

| type | id format | attributes |
|------|-----------|------------|
| `Condition` | `condition:{id}` | `display`, `description` |
| `Measure` | `measure:{id}` | `label`, `direction`, `dataset` |
| `Hospital` | `hospital:{id}` | `name`, `city`, `state` (from directory) |

### Edge types

| type | direction | attributes |
|------|-----------|------------|
| `needs` | Condition → Measure | `weight` (raw, pre-renorm) |
| `reported_by` | Measure → Hospital | `score`, `vs_national`, `footnote`, `measure_pts` (nullable) |

Build source: `measures_store.parquet` + `measures.CONDITIONS` mappings +
`directory` for hospital metadata. One graph builder; condition filter extracts
subgraph.

### API graph JSON

`GET /api/graph/{condition}` returns `{nodes: [...], edges: [...]}` for the
condition subgraph (condition + its measures + hospitals reporting ≥1 measure).

## Rank API

`POST /api/rank` body: `{condition, facility_ids: []}`

Response per hospital: `facility_id`, `name`, `score`, `coverage`,
`low_coverage`, `rank`, `measures[]` (per-measure breakdown), `excluded_reasons[]`.
