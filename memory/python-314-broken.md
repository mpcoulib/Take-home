---
name: python-314-broken
description: Local python3 (Homebrew 3.14) is broken; use python.org 3.13 for venvs
metadata:
  type: project
---

On this machine `python3` → Homebrew Python 3.14.4, which is broken: `ensurepip`/`pyexpat` fail with `Symbol not found: _XML_SetAllocTrackerActivationThreshold` (libexpat mismatch). venv creation dies.

**Why:** Take-home exercise tooling needs a working venv + pip under 2hr time pressure — can't debug this live.

**How to apply:** Build venvs with `/Library/Frameworks/Python.framework/Versions/3.13/bin/python3.13` (python.org build, clean pip 24.3.1). The Take-home scaffold's `run.sh` already auto-picks a working interpreter (`PYTHON=` override + `import venv, ensurepip` probe). Also: port 8000 is held by a Docker app on IPv6 — bind `127.0.0.1` and use `PORT=8077`. See [[take-home-scaffold]].
