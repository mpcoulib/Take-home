"""Condition -> CMS measure mapping for the Hospital Quality Matcher.

Each condition a patient can pick maps to the specific CMS measures that matter
for it, pulled from the sibling Provider-Data files (complications/deaths,
unplanned visits, timely & effective care, healthcare-associated infections,
HCAHPS). This is the clinical backbone of the ranking + the knowledge graph.

Every measure carries:
  - dataset_id : which CMS catalog file it lives in
  - direction  : 'lower' (lower score is better, e.g. death rate) or
                 'higher' (higher score is better, e.g. process compliance)
  - label      : human-readable name
  - weight     : relative importance within the condition (sums are normalized)
"""
from __future__ import annotations

from dataclasses import dataclass

# CMS Provider-Data dataset ids (discovered from the catalog metastore).
DATASETS = {
    "complications": "ynj2-r877",   # Complications and Deaths - Hospital
    "unplanned":     "632h-zaca",   # Unplanned Hospital Visits - Hospital
    "timely":        "yv7e-xc69",   # Timely and Effective Care - Hospital
    "hai":           "77hc-ibv8",   # Healthcare Associated Infections - Hospital
    "hcahps":        "dgck-syfz",   # Patient survey (HCAHPS) - Hospital
}


@dataclass(frozen=True)
class Measure:
    id: str            # CMS Measure ID (e.g. MORT_30_AMI), or HCAHPS sentinel
    dataset: str       # key into DATASETS
    label: str
    direction: str     # 'lower' | 'higher'
    weight: float


# Patient-experience star rating lives in the HCAHPS file under a different schema.
HCAHPS_STAR = "H_STAR_RATING"


CONDITIONS: dict[str, dict] = {
    "knee_surgery": {
        "display": "Knee Surgery",
        "description": "Total knee replacement (TKA) outcomes",
        "measures": [
            Measure("COMP_HIP_KNEE", "complications", "Complication rate, hip/knee replacement", "lower", 3),
            Measure("READM_30_HIP_KNEE", "unplanned", "30-day readmission, hip/knee replacement", "lower", 3),
            Measure(HCAHPS_STAR, "hcahps", "Patient experience (HCAHPS star)", "higher", 1),
        ],
    },
    "hip_replacement": {
        "display": "Hip Replacement",
        "description": "Total hip replacement (THA) outcomes",
        "measures": [
            Measure("COMP_HIP_KNEE", "complications", "Complication rate, hip/knee replacement", "lower", 3),
            Measure("READM_30_HIP_KNEE", "unplanned", "30-day readmission, hip/knee replacement", "lower", 3),
            Measure(HCAHPS_STAR, "hcahps", "Patient experience (HCAHPS star)", "higher", 1),
        ],
    },
    "cardiac_surgery": {
        "display": "Cardiac Care",
        "description": "Heart attack (AMI), heart failure & bypass (CABG) outcomes",
        "measures": [
            Measure("MORT_30_AMI", "complications", "30-day death rate, heart attack", "lower", 3),
            Measure("MORT_30_CABG", "complications", "30-day death rate, CABG surgery", "lower", 3),
            Measure("MORT_30_HF", "complications", "30-day death rate, heart failure", "lower", 2),
            Measure("READM_30_AMI", "unplanned", "30-day readmission, heart attack", "lower", 2),
            Measure("READM_30_HF", "unplanned", "30-day readmission, heart failure", "lower", 2),
            Measure(HCAHPS_STAR, "hcahps", "Patient experience (HCAHPS star)", "higher", 1),
        ],
    },
    "stroke": {
        "display": "Stroke",
        "description": "Stroke mortality and timely stroke care",
        "measures": [
            Measure("MORT_30_STK", "complications", "30-day death rate, stroke", "lower", 3),
            Measure("STK_02", "timely", "Discharged on antithrombotic therapy", "higher", 1),
            Measure("STK_05", "timely", "Antithrombotic therapy by hospital day 2", "higher", 1),
            Measure("OP_23", "timely", "Head CT results within 45 min (stroke)", "higher", 2),
            Measure(HCAHPS_STAR, "hcahps", "Patient experience (HCAHPS star)", "higher", 1),
        ],
    },
}


def measures_for(condition: str) -> list[Measure]:
    return CONDITIONS[condition]["measures"]


def all_measure_ids() -> set[str]:
    out: set[str] = set()
    for c in CONDITIONS.values():
        out.update(m.id for m in c["measures"])
    return out


def datasets_used() -> set[str]:
    return {m.dataset for c in CONDITIONS.values() for m in c["measures"]}
