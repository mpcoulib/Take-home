#!/usr/bin/env python3
"""GATE 3: verify LLM explanations contain no orphan numeric tokens."""
from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

_NUMERIC_RE = re.compile(
    r"(?<![A-Za-z0-9_])"  # not part of identifier
    r"-?"
    r"(?:"
    r"\d+\.\d+"  # float
    r"|\d+"  # int
    r")"
    r"(?![A-Za-z0-9_])"
)


def _payload_floats(payload: dict[str, Any]) -> list[float]:
    """All numeric values from payload as floats (recursive, all nesting levels)."""
    out: list[float] = []

    def walk(obj: Any) -> None:
        if obj is None:
            return
        if isinstance(obj, bool):
            return
        if isinstance(obj, (int, float)):
            out.append(float(obj))
            return
        if isinstance(obj, str):
            for m in _NUMERIC_RE.finditer(obj):
                try:
                    out.append(float(m.group(0)))
                except ValueError:
                    pass
            return
        if isinstance(obj, dict):
            for v in obj.values():
                walk(v)
        elif isinstance(obj, (list, tuple)):
            for v in obj:
                walk(v)

    walk(payload)
    return out


def _is_grounded(val: float, payload_floats: list[float]) -> bool:
    """True iff val is within tolerance of any float in payload_floats."""
    for pf in payload_floats:
        if abs(val - pf) <= 1e-6:
            return True
        if pf != 0 and abs(val - pf) / abs(pf) <= 1e-4:
            return True
    return False


def extract_numeric_tokens(text: str) -> list[str]:
    return [m.group(0) for m in _NUMERIC_RE.finditer(text)]


def find_orphan_numbers(text: str, payload: dict[str, Any]) -> list[str]:
    pf = _payload_floats(payload)
    orphans: list[str] = []
    for tok in extract_numeric_tokens(text):
        try:
            val = float(tok)
        except ValueError:
            continue
        if not _is_grounded(val, pf):
            orphans.append(tok)
    return orphans


def verify_explanation(text: str, payload: dict[str, Any]) -> tuple[bool, list[str]]:
    orphans = find_orphan_numbers(text, payload)
    return len(orphans) == 0, orphans


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify LLM explanation grounding")
    parser.add_argument("--text", help="Explanation text")
    parser.add_argument("--payload", help="Grounding payload JSON file")
    args = parser.parse_args(argv)

    if not args.text or not args.payload:
        parser.print_help()
        return 2

    payload = json.loads(open(args.payload, encoding="utf-8").read())
    ok, orphans = verify_explanation(args.text, payload)
    if ok:
        print("PASS: no orphan numbers")
        return 0
    print("FAIL: orphan numbers:", ", ".join(orphans))
    return 1


if __name__ == "__main__":
    sys.exit(main())
