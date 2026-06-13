"""GATE 2 + GATE 3 tests for explain.py and /api/rank wiring."""
from __future__ import annotations

import json
import os
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import explain
from app.main import app
from app.ranking import rank_facilities
from verify_grounding import find_orphan_numbers, verify_explanation


def _sample_store() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"facility_id": "000001", "measure_id": "COMP_HIP_KNEE", "score": 2.0,
             "compared_to_national": "better", "footnote": "", "dataset_key": "complications"},
            {"facility_id": "000001", "measure_id": "READM_30_HIP_KNEE", "score": None,
             "compared_to_national": "too_few_cases", "footnote": "Too few cases", "dataset_key": "unplanned"},
            {"facility_id": "000001", "measure_id": "H_STAR_RATING", "score": 5.0,
             "compared_to_national": None, "footnote": "", "dataset_key": "hcahps"},
            {"facility_id": "000002", "measure_id": "COMP_HIP_KNEE", "score": 4.0,
             "compared_to_national": "worse", "footnote": "", "dataset_key": "complications"},
            {"facility_id": "000002", "measure_id": "READM_30_HIP_KNEE", "score": 5.0,
             "compared_to_national": "worse", "footnote": "", "dataset_key": "unplanned"},
            {"facility_id": "000002", "measure_id": "H_STAR_RATING", "score": 1.0,
             "compared_to_national": None, "footnote": "", "dataset_key": "hcahps"},
        ]
    )


def _ranked() -> dict:
    return rank_facilities("knee_surgery", ["000001", "000002"], store=_sample_store())


class TestTemplateFallback:
    def test_no_api_key_uses_template(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        ranked = _ranked()
        out = explain.enrich_rankings(ranked)
        for h in out["rankings"]:
            assert h["explanation_source"] == "template"
            assert h["explanation"]
            assert len(h["explanation"]) > 20

    def test_template_is_deterministic(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        ranked = _ranked()
        a = explain.enrich_rankings(json.loads(json.dumps(ranked)))
        b = explain.enrich_rankings(json.loads(json.dumps(ranked)))
        for ha, hb in zip(a["rankings"], b["rankings"], strict=True):
            assert ha["explanation"] == hb["explanation"]

    def test_template_mentions_hospital_and_condition(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        out = explain.enrich_rankings(_ranked())
        h = out["rankings"][0]
        assert "000001" in h["explanation"] or h["name"] in h["explanation"] or "hospital" in h["explanation"].lower()
        assert "Knee" in h["explanation"] or "knee" in h["explanation"]


class TestRankEndpoint:
    def test_rank_without_key_returns_template(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        client = TestClient(app)
        with patch("app.ranking.cms_measures.load", return_value=_sample_store()), \
             patch("app.ranking.directory.load", return_value=pd.DataFrame(columns=["facility_id", "name"])):
            resp = client.post(
                "/api/rank",
                json={"condition": "knee_surgery", "facility_ids": ["000001", "000002"]},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert all(r["explanation_source"] == "template" for r in body["rankings"])
        assert all(r["explanation"] for r in body["rankings"])

    def test_health_llm_flag_without_key(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        client = TestClient(app)
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["llm_available"] is False


class TestLlmPath:
    def test_llm_success(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
        ranked = _ranked()
        hospital = ranked["rankings"][0]
        payload = explain.build_grounding_payload(hospital, "Knee Surgery")
        fake_text = (
            f"Hospital score is {payload['score']} with coverage {payload['coverage']}. "
            f"It beats national on {payload['beats_national']} of {payload['total_measures']} measures."
        )

        mock_block = MagicMock(type="text", text=fake_text)
        mock_response = MagicMock(content=[mock_block])
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response

        with patch("anthropic.Anthropic", return_value=mock_client):
            text, source = explain.explain_one(hospital, "Knee Surgery")

        assert source == "llm"
        assert text == fake_text
        ok, orphans = verify_explanation(text, payload)
        assert ok, orphans

    def test_api_error_falls_back_to_template(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
        hospital = _ranked()["rankings"][0]

        with patch("anthropic.Anthropic") as mock_cls:
            mock_cls.return_value.messages.create.side_effect = Exception("boom")
            text, source = explain.explain_one(hospital, "Knee Surgery")

        assert source == "template"
        assert text


class TestGroundingJudge:
    def test_orphan_detected(self):
        payload = {"score": 72.5, "coverage": 0.75, "beats_national": 1, "total_measures": 3}
        orphans = find_orphan_numbers("Score 72.5 with 99.9 percent coverage.", payload)
        assert "99.9" in orphans
        assert "72.5" not in orphans

    def test_grounded_text_passes(self):
        payload = explain.build_grounding_payload(_ranked()["rankings"][0], "Knee Surgery")
        text = explain.template_explanation(payload)
        ok, orphans = verify_explanation(text, payload)
        assert ok, orphans
