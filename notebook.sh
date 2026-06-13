#!/usr/bin/env bash
# Launch JupyterLab on the project venv with the explore notebook.
# Reuses .venv from run.sh; installs notebook extras on first run.
set -euo pipefail
cd "$(dirname "$0")"

pick_python() {
  for p in "${PYTHON:-}" python3.13 python3.12 python3.11 python3; do
    [ -z "$p" ] && continue
    command -v "$p" >/dev/null 2>&1 || continue
    "$p" -c 'import venv, ensurepip' >/dev/null 2>&1 && { echo "$p"; return; }
  done
  echo "python3"
}

if [ ! -d .venv ]; then
  PY="$(pick_python)"
  echo "Creating virtualenv with $PY..."
  "$PY" -m venv .venv
fi
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r backend/requirements.txt
pip install -q -r notebooks/requirements-notebook.txt

export DATASET="${1:-${DATASET:-sample.csv}}"
echo "Dataset: $DATASET  —  opening notebooks/explore.ipynb"
exec jupyter lab notebooks/explore.ipynb
