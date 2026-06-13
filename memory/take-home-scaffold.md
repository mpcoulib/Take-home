---
name: take-home-scaffold
description: Pre-built dataset-agnostic explorer scaffold for the 2hr take-home exercise
metadata:
  type: project
---

Take-home: 2hr timed exercise — build a runnable tool on an assigned public dataset (revealed only at start). Prep done BEFORE opening: a dataset-agnostic FastAPI + pandas + vanilla-JS explorer in `/Users/massacoulibaly/IdeaProjects/Take home`.

**Why:** Save the 2hr clock for product judgment on the real dataset, not boilerplate.

**How to apply (once dataset known):**
- Drop dataset in `./data`, run `PORT=8077 ./run.sh data/<file>` → http://127.0.0.1:8077.
- Generic core already works: `loader.py` (CSV/JSON/NDJSON/Parquet/URL + cache), `profiler.py` (schema + data-quality inspector), `explore.py` (filter/aggregate/timeseries/sample), `main.py` (FastAPI), `frontend/` (Overview/Quality/Explore/Data tabs, Chart.js).
- Notebook path: `./notebook.sh data/<file>` opens `notebooks/explore.ipynb` (JupyterLab), which imports the SAME `loader`/`profiler`/`explore` modules — analysis lifts straight into `backend/app/`. Notebook extras in `notebooks/requirements-notebook.txt` (jupyterlab/matplotlib/seaborn). `pack.sh` strips notebook outputs before archiving.
- Then ADD a dataset-specific angle (derived metric / scoring / focused view) so it's not just a wrapper — that's what reviewers reward.
- Fill `WRITEUP.md` (user, problem, tradeoffs, LLM use). Package with `./pack.sh` → `submission.tar.gz` (ships sample.csv, excludes venv/blobs). Upload window: 2hr countdown, 3hr hard cutoff.

**Assigned dataset = CMS `xubh-q36u` "Hospital General Information"** (5,432 hospitals × 38 cols, modified 2026-04-28). `backend/app/cms.py` resolves catalog id → CSV, caches to `./data`, + Datastore SQL/structured-query helpers (SQL uses lower_snake machine col names, not human headers). Load anywhere via `cms:xubh-q36u` (loader prefix) or `GET /api/cms/fetch?dataset_id=`. Headline metric: "Hospital overall rating" 1-5 but 2,250/5,432 (41%) are "Not Available"; footnote cols 57-81% null. Ownership/type/state/emergency-services + mortality/safety/readmission/patient-exp measure-group counts are the rich dims. Tool idea space: hospital-quality explorer/scorer/finder by geography + measure group.

**Data dictionary** (`HOSPITAL_Data_Dictionary.pdf`, CMS Apr 2026, 105pp) decoded. Our file's 38 cols defined p20-21 (Char/Num types). Footnote crosswalk (Appendix E, p97-100) → `backend/app/footnotes.py` (codes 1-29 + `decode()`/`label_for()`). KEY INSIGHT: the 2,250 "Not Available" ratings decode to concrete reasons — 1341 "too few measures for rating" (code 16, mostly small/critical-access), 810 "not in IQR/OQR" (19), 63 not-available-this-period (5), 32 DoD no-rating (22). NOT random missingness. Endpoints: `GET /api/rating-breakdown` (rated 3182 / unrated 2250 + ranked reasons + star dist 1-5: 199/662/987/950/384), `GET /api/footnotes` (crosswalk). This footnote-decode is the dataset-specific differentiator — turns opaque nulls into explained nulls.

Verified end-to-end (clean venv build + all endpoints + notebook on live CMS data + footnote decode) on 2026-06-12. Env gotchas in [[python-314-broken]].
