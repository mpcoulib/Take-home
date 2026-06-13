#!/usr/bin/env bash
# Setup + run the Dataset Explorer. Idempotent: reuses the venv if present.
set -euo pipefail
cd "$(dirname "$0")"

# Pick a Python whose venv/pip actually works (override with PYTHON=...).
pick_python() {
  for p in "${PYTHON:-}" python3.13 python3.12 python3.11 python3; do
    [ -z "$p" ] && continue
    command -v "$p" >/dev/null 2>&1 || continue
    "$p" -c 'import venv, ensurepip' >/dev/null 2>&1 && { echo "$p"; return; }
  done
  echo "python3"  # fall back; will surface a clear error if broken
}

if [ ! -d .venv ]; then
  PY="$(pick_python)"
  echo "Creating virtualenv with $PY..."
  "$PY" -m venv .venv
fi
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r backend/requirements.txt

# Active dataset: first arg, or DATASET env, or first file in ./data
export DATASET="${1:-${DATASET:-cms:xubh-q36u}}"
PORT="${PORT:-8000}"
echo "Starting on http://127.0.0.1:${PORT}  (dataset: ${DATASET:-auto})"
exec uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port "$PORT"
