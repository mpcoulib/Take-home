"""GATE 2 numeric edge-case verification for ranking.py."""
from __future__ import annotations

import math

import pytest

from app.ranking import (
    COVERAGE_THRESHOLD,
    exclusion_reason,
    measure_points,
    percentile_rank,
    rank_facilities,
    score_measure,
    vs_national_gap,
    vs_national_ratio,
)
from app.ranking import NationalStats


class TestPercentileAndDirection:
    def test_higher_better_percentile(self):
        ref = [10.0, 20.0, 30.0, 40.0, 50.0]
        assert percentile_rank(50.0, ref) == 90.0
        assert measure_points(50.0, ref, "higher") == 90.0

    def test_lower_better_flip(self):
        ref = [1.0, 2.0, 3.0, 4.0, 5.0]
        assert measure_points(1.0, ref, "lower") == 90.0
        assert measure_points(5.0, ref, "lower") == 10.0

    def test_single_value_pool_neutral(self):
        assert percentile_rank(3.0, [3.0]) == 50.0


class TestDivideByZero:
    def test_ratio_when_national_zero(self):
        assert vs_national_ratio(5.0, 0.0, "higher") is None
        assert vs_national_ratio(5.0, None, "lower") is None

    def test_ratio_when_score_zero(self):
        assert vs_national_ratio(0.0, 3.0, "lower") is None

    def test_gap_when_median_zero(self):
        assert vs_national_gap(5.0, 0.0) is None

    def test_score_uses_percentile_not_ratio(self):
        stats = NationalStats(scores=(0.0, 0.0, 5.0), median=0.0)
        pts = score_measure(5.0, "higher", stats)
        assert pts is not None
        assert 0 <= pts <= 100


class TestMissingData:
    def test_exclusion_no_score(self):
        assert exclusion_reason(None, None, "Too few cases", True) == "no_score"

    def test_exclusion_not_available_enum(self):
        assert exclusion_reason(None, "not_available", "", True) == "not_available"

    def test_exclusion_no_national_pool(self):
        assert exclusion_reason(3.0, None, "", False) == "no_national_data"

    def test_weight_renormalization(self):
        import pandas as pd

        store = pd.DataFrame(
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
        out = rank_facilities("knee_surgery", ["000001", "000002"], store=store)
        h1 = next(r for r in out["rankings"] if r["facility_id"] == "000001")
        included = [m for m in h1["measures"] if m["included"]]
        assert len(included) == 2
        assert abs(sum(m["effective_weight"] for m in included) - 1.0) < 1e-6
        excluded = [m for m in h1["measures"] if not m["included"]]
        assert excluded[0]["exclusion_reason"] == "not_available"

    def test_low_coverage_flag(self):
        import pandas as pd

        store = pd.DataFrame(
            [
                {"facility_id": "000003", "measure_id": "COMP_HIP_KNEE", "score": 3.0,
                 "compared_to_national": "no_different", "footnote": "", "dataset_key": "complications"},
                {"facility_id": "000003", "measure_id": "READM_30_HIP_KNEE", "score": None,
                 "compared_to_national": "not_available", "footnote": "", "dataset_key": "unplanned"},
                {"facility_id": "000003", "measure_id": "H_STAR_RATING", "score": None,
                 "compared_to_national": None, "footnote": "Too few cases", "dataset_key": "hcahps"},
            ]
        )
        out = rank_facilities("knee_surgery", ["000003"], store=store)
        r = out["rankings"][0]
        assert r["low_coverage"] is True
        assert r["coverage"] < COVERAGE_THRESHOLD
        assert r["score"] is not None


class TestNoNanLeak:
    def test_final_scores_finite_or_null(self):
        import pandas as pd

        store = pd.DataFrame(
            [
                {"facility_id": "000004", "measure_id": "COMP_HIP_KNEE", "score": float("nan"),
                 "compared_to_national": "not_available", "footnote": "", "dataset_key": "complications"},
                {"facility_id": "000004", "measure_id": "READM_30_HIP_KNEE", "score": float("nan"),
                 "compared_to_national": "not_available", "footnote": "", "dataset_key": "unplanned"},
                {"facility_id": "000004", "measure_id": "H_STAR_RATING", "score": float("nan"),
                 "compared_to_national": None, "footnote": "", "dataset_key": "hcahps"},
            ]
        )
        out = rank_facilities("knee_surgery", ["000004"], store=store)
        r = out["rankings"][0]
        assert r["score"] is None
        for m in r["measures"]:
            if m["measure_score"] is not None:
                assert math.isfinite(m["measure_score"])
            if m["raw_score"] is not None:
                assert math.isfinite(m["raw_score"])
