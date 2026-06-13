# HospitalMatch

A patient facing tool that ranks hospitals by real CMS quality outcomes for a chosen condition. Describe symptoms, give insurance and location, get hospitals ranked on actual Medicare outcome measures with a plain explanation of why.

Dataset: CMS Provider Data Catalog, Hospital General Information (xubh-q36u) plus five sibling measure files (Complications and Deaths, Unplanned Hospital Visits, Timely and Effective Care, Healthcare Associated Infections, HCAHPS), joined on Facility ID into one store of about 800k measure rows across 5,432 hospitals.

## Stack

Backend: FastAPI plus pandas. Condition to measure mapping, percentile based scoring, a NetworkX knowledge graph (Condition to Measure to Hospital), Claude explanations with a deterministic template fallback.
Frontend: React plus Vite plus Tailwind, built into frontend/ and served by the backend.
Data: pulled live from the CMS API and cached. Optional Supabase backend if env vars are set, otherwise a local parquet cache.

## Run

Requires Python 3.11+ and Node 18+.

    ./run.sh

Opens http://127.0.0.1:8000. Port busy: PORT=8077 ./run.sh

First boot pulls the CMS files and builds the store (about 30s, warmed in the background on startup). After that ranking is sub second. In the app: enter symptoms, pick insurance, enter location as City, ST (for example Boston, MA), see ranked hospitals.

### LLM explanations (optional)

Without a key the app uses deterministic template explanations, so it runs with zero setup. For Claude generated explanations:

    export ANTHROPIC_API_KEY=sk-ant-...
    ./run.sh

### Frontend dev

    cd "Figma design files" && npm install && npm run dev

## API

GET  /api/health                       liveness, llm_available, data backend
GET  /api/conditions                   conditions and their mapped measures
GET  /api/hospitals/search?q=&state=   hospital lookup
GET  /api/hospitals/{facility_id}      one hospital plus its measures
POST /api/rank                         body {condition, facility_ids[]}, ranked hospitals with national comparison and explanation
GET  /api/graph/{condition}            the knowledge graph for a condition

## Layout

    backend/app/         FastAPI app, scoring, graph, CMS join, explanations
    backend/tests/       ranking and grounding tests (pytest)
    frontend/            built React app (served by backend)
    Figma design files/  React source
    run.sh               setup and run

## Tests

    source .venv/bin/activate && python -m pytest backend/tests -q
