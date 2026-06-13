# Writeup

## What I built

A **Hospital Quality Matcher** API that helps patients and care navigators compare
hospitals for a specific procedure or condition (knee surgery, cardiac care, stroke,
etc.). It joins six CMS Provider-Data files into one measures store, ranks selected
hospitals with direction-aware percentile scoring against national pools, and adds
grounded two-sentence explanations — via Claude when an API key is present, or a
deterministic template otherwise.

## Who it's for / the problem

- **User:** A patient choosing where to have surgery, or a nurse/care navigator
  shortlisting hospitals for a referral.
- **Problem:** CMS publishes dozens of measure files with opaque footnotes, missing
  values, and no single “best hospital for my knee” answer. ~2,250 hospitals lack an
  overall star rating; the reason is buried in footnote codes.
- **Why this scope:** Condition-centric ranking (not generic star ratings) matches
  how people actually decide. Joining real CMS rows + decoding footnotes turns
  “Not Available” into actionable context instead of a dead end.

## Key decisions & tradeoffs

- **Percentile vs ratio scoring (Phase 2):** Adopted national-pool percentiles (A1a)
  for the score; ratio/gap vs national median is exposed for transparency but does
  not change ranking. Percentiles are scale-free across rates, stars, and percentages.
- **Missing data:** Measures with no score are excluded, never imputed. Weights
  renormalize over included measures; hospitals with &lt;50% weight coverage are
  flagged `low_coverage` but still ranked on available data.
- **LLM explanations:** Claude rewrites grounded numbers into patient-friendly prose.
  Strict grounding payload + orphan-number verification prevents invented statistics.
  Template fallback guarantees the API works with zero API key — required for grading.
- **Generic explorer retained:** Phase 1 loader/profiler/explore routes remain for
  ad-hoc dataset inspection; hospital-specific logic lives in dedicated modules.

## How the dataset is used meaningfully

Beyond wrapping raw rows:

1. **Unified store** — `(facility_id, measure_id)` grain across complications,
   readmissions, timely care, HAI, and HCAHPS with normalized `compared_to_national`.
2. **Footnote crosswalk** — decodes why ratings/measures are missing (too few cases,
   not applicable, etc.).
3. **Condition mapping** — clinical backbone linking patient-facing conditions to
   weighted CMS measure sets.
4. **Knowledge graph** — Condition → Measure → Hospital for visualization and ranking.
5. **Explanations** — synthesize score, coverage, better/worse vs national, and
   missing-measure reasons into readable summaries.

## What I'd improve with more time

- Frontend condition picker wired to `/api/rank` and graph visualization.
- Cache LLM explanations by `(condition, facility_id, measures hash)` to cut cost.
- Geographic filtering and “similar hospitals” cohort for fairer comparisons.
- Integration tests against live CMS refresh in CI.

## LLM assistance

AI tools (Cursor/Claude) helped scaffold the generic explorer, draft specs, and
iterate on ranking edge cases. I applied judgment on: frozen spec documents,
percentile-over-ratio scoring, strict grounding contracts, template fallback for
keyless deployment, and test gates for numeric hallucination. All CMS join logic,
footnote decoding, and ranking math were validated against real data and unit tests.
