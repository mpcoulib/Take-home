"""CMS public-reporting footnote crosswalk (Hospital Downloadable DB Dictionary,
Appendix E, April 2026).

The Hospital General Information file uses these codes in its *_Footnote columns
(Hospital overall rating footnote, MORT/Safety/READM/Pt Exp/TE Group Footnote).
A blank footnote means the measure group was scored normally; a code explains
why a value is "Not Available" or should be read with caution.

`decode()` turns a raw footnote cell (e.g. "16, 23") into human reasons.
"""
from __future__ import annotations

from typing import Optional

# code -> (short label, full text)
FOOTNOTES: dict[int, tuple[str, str]] = {
    1: ("Too few cases", "The number of cases/patients is too few to report."),
    2: ("Sampled data", "Data submitted were based on a sample of cases/patients."),
    3: ("Shorter time period", "Results are based on a shorter time period than required."),
    4: ("Suppressed by CMS", "Data suppressed by CMS for one or more quarters."),
    5: ("Not available this period", "Results are not available for this reporting period."),
    6: ("<100 CAHPS surveys", "Fewer than 100 patients completed the CAHPS survey; use with caution."),
    7: ("No cases met criteria", "No cases met the criteria for this measure."),
    8: ("CI lower limit n/a", "Lower limit of the confidence interval cannot be calculated (observed infections = 0)."),
    9: ("No state/territory data", "No data are available from the state/territory for this reporting period."),
    10: ("<50 CAHPS surveys", "Very few patients were eligible for the CAHPS survey (<50 completed); use with caution."),
    11: ("Collection discrepancies", "There were discrepancies in the data collection process."),
    12: ("Measure N/A to hospital", "This measure does not apply to this hospital for this reporting period."),
    13: ("Cannot be calculated", "Results cannot be calculated for this reporting period."),
    14: ("State combined", "The results for this state are combined with nearby states to protect confidentiality."),
    15: ("Too few for star rating", "The number of cases/patients is too few to report a star rating."),
    16: ("Too few measures for rating", "Too few measures or measure groups reported to calculate a star rating or measure group score."),
    17: ("Inpatient-only rating", "This hospital's star rating only includes data reported on inpatient services."),
    18: ("No HAI data / no exemption", "Result not based on performance data; hospital did not submit data and did not submit an HAI exemption form."),
    19: ("Not in IQR/OQR", "Data shown only for hospitals that participate in the IQR and OQR programs."),
    20: ("VHA excluded from averages", "State and national averages do not include VHA hospital data. (No longer used.)"),
    21: ("VHA survey not in averages", "Patient survey results for VHA hospitals are not included in state and national averages. (No longer used.)"),
    22: ("No rating (DoD)", "Overall star ratings are not calculated for Department of Defense (DoD) hospitals."),
    23: ("Claims discrepancies", "Data based on claims the hospital reported discrepancies in."),
    24: ("VA combined with parent", "Results for this VA hospital are combined with its VA administrative parent."),
    25: ("VHA in averages", "State and national averages include VHA hospital data."),
    26: ("DoD in averages", "State and national averages include DoD hospital data."),
    27: ("DoD survey not in averages", "Patient survey results for DoD hospitals are not included in averages. (No longer used.)"),
    28: ("Extraordinary Circumstances Exception", "Results may be impacted; CMS approved an Extraordinary Circumstances Exception."),
    29: ("Partial performance period", "This measure was calculated using partial performance period data due to a CMS-approved exception."),
}


def decode(raw) -> list[dict]:
    """Decode a footnote cell into [{code, label, text}]. Accepts '16', '16, 23', 16, NaN."""
    if raw is None:
        return []
    s = str(raw).strip()
    if not s or s.lower() in ("nan", "none"):
        return []
    out = []
    for part in s.replace(";", ",").split(","):
        part = part.strip()
        if not part:
            continue
        try:
            code = int(float(part))
        except ValueError:
            continue
        label, text = FOOTNOTES.get(code, ("Unknown", f"Unrecognized footnote code {code}"))
        out.append({"code": code, "label": label, "text": text})
    return out


def label_for(raw) -> Optional[str]:
    """Single short label for a footnote cell (first code), or None."""
    d = decode(raw)
    return d[0]["label"] if d else None
