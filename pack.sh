#!/usr/bin/env bash
# Build the submission archive. Excludes venv, caches, git, large data blobs.
set -euo pipefail
cd "$(dirname "$0")"
OUT="submission.tar.gz"
rm -f "$OUT"
# Strip executed outputs from notebooks so the archive stays small + clean.
if [ -d .venv ] && [ -d notebooks ]; then
  source .venv/bin/activate 2>/dev/null || true
  for nb in notebooks/*.ipynb; do
    [ -e "$nb" ] || continue
    jupyter nbconvert --clear-output --inplace "$nb" >/dev/null 2>&1 || true
  done
fi

# Explicit file list: only the small sample ships, never the full dataset.
EXTRA=""
[ -f data/sample.csv ] && EXTRA="data/sample.csv"
tar --exclude='.venv' --exclude='__pycache__' --exclude='.git' \
    --exclude='*.pyc' --exclude='submission.tar.gz' --exclude='.DS_Store' \
    --exclude='.ipynb_checkpoints' \
    -czf "$OUT" \
    backend frontend notebooks run.sh notebook.sh pack.sh README.md WRITEUP.md .gitignore $EXTRA
SIZE=$(du -h "$OUT" | cut -f1)
echo "Wrote $OUT ($SIZE)"
echo "Contents:"; tar -tzf "$OUT" | head -40
