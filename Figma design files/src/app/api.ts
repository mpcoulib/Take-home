// API client for the Hospital Quality Matcher backend.
// Same-origin relative paths: the FastAPI backend serves this bundle and the
// /api/* routes. In dev, vite.config proxies /api to the backend.

const BASE = (import.meta as any).env?.VITE_API_BASE ?? "";

export interface HospitalSearchResult {
  facility_id: string;
  name: string;
  city: string;
  state: string;
  type: string;
  ownership: string;
}

export interface RankedMeasure {
  id: string;
  label: string;
  direction: "lower" | "higher";
  weight: number;
  raw_score: number | null;
  measure_score: number | null;
  vs_national: string | null;
  national_median: number | null;
  vs_national_ratio: number | null;
  vs_national_gap: number | null;
  footnote: string;
  included: boolean;
  exclusion_reason: string | null;
  effective_weight: number;
}

export interface RankedHospital {
  facility_id: string;
  name: string;
  score: number | null;
  coverage: number;
  low_coverage: boolean;
  rank: number;
  measures: RankedMeasure[];
  excluded_reasons: string[];
  explanation: string;
  explanation_source: "llm" | "template";
}

export interface RankResponse {
  condition: string;
  display: string;
  total_weight: number;
  coverage_threshold: number;
  rankings: RankedHospital[];
}

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(BASE + url, init);
  if (!resp.ok) {
    const detail = await resp.text().catch(() => resp.statusText);
    throw new Error(`API ${resp.status}: ${detail.slice(0, 200)}`);
  }
  return resp.json();
}

export function searchHospitals(
  state: string,
  limit = 40,
): Promise<{ results: HospitalSearchResult[] }> {
  const q = new URLSearchParams({ state, limit: String(limit) });
  return getJSON(`/api/hospitals/search?${q}`);
}

export function rankHospitals(
  condition: string,
  facilityIds: string[],
): Promise<RankResponse> {
  return getJSON(`/api/rank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ condition, facility_ids: facilityIds }),
  });
}

export interface HospitalDetail {
  facility_id: string;
  name: string;
  city: string;
  state: string;
  type: string;
  ownership: string;
}

export function fetchHospitalDetail(facilityId: string): Promise<HospitalDetail> {
  return getJSON(`/api/hospitals/${facilityId}`);
}

// ---- symptom → backend condition mapping ----
// Backend conditions: knee_surgery, hip_replacement, cardiac_surgery, stroke.

export interface InferredCondition {
  id: string;
  label: string;
}

const CONDITION_RULES: { id: string; label: string; keywords: string[] }[] = [
  { id: "knee_surgery", label: "Knee Surgery", keywords: ["knee", "acl", "meniscus"] },
  { id: "hip_replacement", label: "Hip Replacement", keywords: ["hip", "femur", "pelvis"] },
  {
    id: "cardiac_surgery",
    label: "Cardiac Care",
    keywords: ["chest", "heart", "cardiac", "breath", "palpitation", "angina", "bypass", "attack"],
  },
  {
    id: "stroke",
    label: "Stroke",
    keywords: ["stroke", "numbness", "dizziness", "slurred", "weakness", "face droop", "vision"],
  },
];

export function inferCondition(complaints: string): InferredCondition {
  const text = complaints.toLowerCase();
  for (const rule of CONDITION_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) {
      return { id: rule.id, label: rule.label };
    }
  }
  // No clear match → cardiac as the general acute-care proxy. The results view
  // surfaces the matched condition name so this stays transparent.
  return { id: "cardiac_surgery", label: "Cardiac Care" };
}

// "Los Angeles, CA" / "94305" / "Boston, MA 02115" → 2-letter state, or null.
export function extractState(location: string): string | null {
  const m = location.toUpperCase().match(/\b([A-Z]{2})\b/);
  return m ? m[1] : null;
}
