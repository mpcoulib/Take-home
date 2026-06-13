# Hospital Quality Matcher

A CMS hospital data API that ranks hospitals by patient condition, surfaces
per-measure national context, and generates grounded plain-language explanations.

Built on real CMS Provider-Data files (complications, readmissions, HCAHPS, etc.)
with a unified measures store, footnote decoding, and a knowledge graph for
visualization.

## Setup & run

Requires Python 3.10+.

```bash
# Start server (creates venv, installs deps, serves on :8000)
./run.sh
```

Open http://127.0.0.1:8000. (Port busy? `PORT=8077 ./run.sh`.)

### Manual run

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | No | Enables Claude explanations on `/api/rank`. Without it, deterministic template text is used. |
| `DATASET` | No | Default dataset for generic explorer routes |
| `PORT` | No | Server port (default 8000) |

**Running without an API key:** The grader and all tests pass with zero setup. Rank
responses include `explanation` and `explanation_source: "template"` using only
real joined CMS numbers.

**Running with LLM explanations:**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Check availability: `GET /api/health` → `"llm_available": true`.

### Refresh CMS data

```bash
curl -X POST http://127.0.0.1:8000/api/data/refresh
```

Downloads CMS sources and rebuilds `data/measures_store.parquet`.

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness, default source, `llm_available` |
| GET | `/api/conditions` | Patient conditions and mapped CMS measures |
| GET | `/api/hospitals/search?q=&state=` | Hospital directory search |
| GET | `/api/hospitals/{facility_id}` | Hospital detail + measures |
| POST | `/api/rank` | Rank hospitals for a condition (with explanations) |
| GET | `/api/graph/{condition}` | Knowledge-graph subgraph JSON |
| POST | `/api/data/refresh` | Re-fetch CMS and rebuild parquet store |
| GET | `/api/footnotes` | CMS footnote crosswalk |

### Rank example

```bash
curl -s -X POST http://127.0.0.1:8000/api/rank \
  -H 'Content-Type: application/json' \
  -d '{"condition":"knee_surgery","facility_ids":["010001","010005"]}' | jq .
```

Each hospital in `rankings[]` includes:

- `score`, `coverage`, `rank`, `measures[]` — Phase 2 ranking
- `explanation` — 2-sentence summary (LLM or template)
- `explanation_source` — `"llm"` or `"template"`

## Tests

```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend && python -m pytest tests/ -v
```

Grounding verification (GATE 3):

```bash
python backend/verify_grounding.py --text "..." --payload payload.json
```

## Layout

```
backend/app/
  cms_measures.py   # unified measures parquet store
  directory.py      # hospital directory
  graph.py          # knowledge graph
  ranking.py        # direction-aware weighted ranking
  explain.py        # grounded LLM + template fallback
  measures.py       # condition → measure mappings
  EXPLAIN_SPEC.md   # Phase 3 explanation contract
  RANKING_SPEC.md   # Phase 2 ranking contract
  SCHEMA.md         # Phase 1 data contract
backend/verify_grounding.py  # orphan-number judge
backend/tests/
frontend/
data/               # CMS CSVs + measures_store.parquet (local dev)
supabase/migrations/  # Postgres schema for production
scripts/sync_to_supabase.py
api/index.py        # Vercel serverless entry
vercel.json
requirements.txt    # Vercel Python deps
run.sh / pack.sh
README.md / WRITEUP.md
```

## Packaging for submission

```bash
./pack.sh   # writes submission.tar.gz (<100MB), excludes venv/full data blobs
```

Includes `data/sample.csv` only; full CMS files are fetched via `/api/data/refresh`.

## Production: Supabase + Vercel

Local dev still works with zero cloud setup (parquet + CSV in `data/`). For
production on Vercel, use Supabase Postgres as the data store — serverless
functions cannot rely on a large local parquet cache.

### 1. Supabase database

1. Create a project at [supabase.com](https://supabase.com).
2. Install the CLI (optional but recommended):

   ```bash
   brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   Or paste `supabase/migrations/20250612120000_initial_schema.sql` into the
   Supabase SQL editor and run it.

3. Copy connection details from **Project Settings → Database**:
   - **Project URL** → `SUPABASE_URL` (e.g. `https://YOUR_REF.supabase.co`)
   - **Connection string (URI)** → `DATABASE_URL` (use Transaction pooler, port 6543)

4. Populate from your local parquet cache:

   ```bash
   cp .env.example .env   # fill in DATABASE_URL
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   python scripts/sync_to_supabase.py
   ```

   Re-fetch CMS and sync: `python scripts/sync_to_supabase.py --refresh`

**Schema** (`supabase/migrations/`):

| Table | Grain | Purpose |
|-------|-------|---------|
| `facilities` | `facility_id` | Hospital directory |
| `facility_measures` | `(facility_id, measure_id)` | Unified measures store |
| `store_meta` | `key` | CMS `modified` timestamps |

RLS allows public read; writes use `DATABASE_URL` (service role / direct Postgres).

### 2. Vercel deployment

Vercel CLI is used to deploy the FastAPI app + static frontend (`api/index.py`
rewrites all routes to the backend; `frontend/` is served by FastAPI).

```bash
vercel link          # first time: link to a new or existing project
vercel env add DATABASE_URL production
vercel env add ANTHROPIC_API_KEY production   # optional, for LLM explanations
vercel deploy --prod
```

`.vercelignore` excludes large `data/*.csv` and parquet from deploy bundles — production
must use Supabase (`DATABASE_URL`).

Required Vercel environment variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes (prod) | Supabase Postgres connection string |
| `ANTHROPIC_API_KEY` | No | LLM explanations on `/api/rank` |
| `SUPABASE_URL` | No | Reference / future client use |

After deploy, check `GET /api/health` → `"data_backend": "supabase"`.

### Environment variables (full list)

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | No | Enables Claude explanations on `/api/rank`. Without it, deterministic template text is used. |
| `DATASET` | No | Default dataset for generic explorer routes |
| `PORT` | No | Server port (default 8000) |
| `DATABASE_URL` | No (prod yes) | Supabase Postgres URI; when set, API reads from Supabase instead of parquet |
| `SUPABASE_URL` | No | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | Anon key for future client-side reads |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-only admin key (prefer `DATABASE_URL` for sync) |

See `.env.example` for a template. Never commit `.env` or API keys.
