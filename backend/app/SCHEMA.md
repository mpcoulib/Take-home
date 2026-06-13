# Phase 1 data contract (frozen)

## Unified measures store

**Grain:** one row per `(facility_id, measure_id)`.

| Column | Type | Notes |
|--------|------|-------|
| `facility_id` | str | Zero-padded 6-digit CMS Facility ID |
| `measure_id` | str | CMS Measure ID; HCAHPS uses `HCAHPS Measure ID` |
| `score` | float \| null | Numeric score; `"Not Available"` and non-numeric → null |
| `compared_to_national` | enum \| null | Normalized benchmark comparison (see below) |
| `footnote` | str | Semicolon-joined decoded footnote labels; empty if none |
| `dataset_key` | str | Source file key from `measures.DATASETS` |

**HCAHPS special-case:** rows from the Patient Survey file use `HCAHPS Measure ID` as
`measure_id` and `Patient Survey Star Rating` as score (including `H_STAR_RATING`).

**Compared-to-national enum values:**

- `better` — better than national rate/value/benchmark, or fewer unplanned days
- `worse` — worse than national rate/value/benchmark, or more unplanned days
- `no_different` — same as national / average days
- `not_available` — CMS reports "Not Available"
- `too_few_cases` — denominator too small
- `null` — column absent (Timely & Effective Care) or unmapped text

## Cache

- Path: `data/measures_store.parquet`
- Sidecar: `data/measures_store.meta.json` with per-dataset CMS `modified` timestamps
- Refresh when any source dataset `modified` date changes

## Hospital directory

**Grain:** one row per `facility_id`.

| Column | Source (General Information) |
|--------|------------------------------|
| `facility_id` | Facility ID (zero-padded) |
| `name` | Facility Name |
| `city` | City/Town |
| `state` | State |
| `type` | Hospital Type |
| `ownership` | Hospital Ownership |

General Information dataset: `xubh-q36u`.
