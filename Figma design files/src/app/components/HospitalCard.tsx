import { motion } from "motion/react";
import { Award, AlertCircle } from "lucide-react";
import { MetricBar } from "./MetricBar";
import type { RankedHospital } from "../api";

interface HospitalCardProps {
  hospital: RankedHospital;
  condition: string;
  isTop: boolean;
  delay: number;
}

const RANK_COLORS = ["#0ea5b0", "#1e40af", "#5a6a82"];

// CMS comparison enum → human badge.
const VS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  better: { label: "Better than national", color: "#16a34a", bg: "#dcfce7" },
  worse: { label: "Worse than national", color: "#d97706", bg: "#fef3c7" },
  no_different: { label: "Same as national", color: "#5a6a82", bg: "#e8edf5" },
};

function exclusionLabel(reason: string | null, footnote: string): string {
  if (footnote) return footnote;
  switch (reason) {
    case "not_available":
      return "Not publicly reported";
    case "too_few_cases":
      return "Too few cases to report";
    case "no_national_data":
      return "No national benchmark";
    case "no_score":
    default:
      return "No data available";
  }
}

export function HospitalCard({ hospital, condition, isTop, delay }: HospitalCardProps) {
  const rankColor = RANK_COLORS[Math.min(hospital.rank - 1, 2)];
  const included = hospital.measures.filter((m) => m.included && m.raw_score !== null);
  const excluded = hospital.measures.filter((m) => !m.included);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className={`bg-card rounded-2xl overflow-hidden ${
        isTop ? "border-2 border-accent shadow-lg shadow-accent/10" : "border border-border shadow-sm"
      }`}
    >
      {isTop && (
        <div className="px-5 py-2 flex items-center gap-2" style={{ backgroundColor: "#0ea5b0" }}>
          <Award className="w-4 h-4 text-white" />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }} className="text-white text-sm">
            Top Recommendation for {condition}
          </span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: rankColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.25rem" }}
            >
              #{hospital.rank}
            </div>
            <div>
              <h3
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
                className="text-foreground text-lg leading-tight mb-0.5"
              >
                {hospital.name}
              </h3>
              <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-sm">
                Facility ID {hospital.facility_id}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div
              style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: rankColor }}
              className="text-2xl"
            >
              {hospital.score !== null ? hospital.score : "—"}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif" }} className="text-xs text-muted-foreground">
              {hospital.score !== null ? "Quality score" : "Not rated"}
            </div>
          </div>
        </div>

        {/* Coverage / data-completeness badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          <span
            className="text-xs px-2.5 py-1 rounded-full border border-border"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#5a6a82" }}
          >
            {included.length} of {hospital.measures.length} measures with data
          </span>
          {hospital.low_coverage && (
            <span
              className="text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: "#d97706", backgroundColor: "#fef3c7" }}
            >
              <AlertCircle className="w-3 h-3" /> Limited data
            </span>
          )}
        </div>

        {/* Real CMS measures for this condition */}
        {included.length > 0 ? (
          <div className="space-y-4 mb-6">
            {included.map((m) => {
              const vs = m.vs_national ? VS_LABEL[m.vs_national] : undefined;
              return (
                <div key={m.id}>
                  <MetricBar
                    label={m.label}
                    value={m.raw_score as number}
                    benchmark={m.national_median ?? (m.raw_score as number)}
                    unit=""
                    lowerIsBetter={m.direction === "lower"}
                    tooltip={`CMS measure ${m.id}`}
                  />
                  {vs && (
                    <span
                      className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ color: vs.color, backgroundColor: vs.bg, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
                    >
                      {vs.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-xl bg-muted/40 text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            No publicly reported {condition.toLowerCase()} measures for this hospital.
          </div>
        )}

        {/* Excluded measures — show WHY (decoded CMS footnote) */}
        {excluded.length > 0 && (
          <div className="mb-6">
            <p
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
              className="text-xs text-muted-foreground mb-2 uppercase tracking-wide"
            >
              Data unavailable
            </p>
            <div className="flex flex-wrap gap-2">
              {excluded.map((m) => (
                <span
                  key={m.id}
                  className="text-xs px-2.5 py-1 rounded-full border border-border"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#5a6a82" }}
                  title={exclusionLabel(m.exclusion_reason, m.footnote)}
                >
                  {m.label}: {exclusionLabel(m.exclusion_reason, m.footnote)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Grounded explanation */}
        <div className="rounded-xl p-4" style={{ backgroundColor: "#0d1b2e08", borderLeft: "3px solid #0ea5b0" }}>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
            {hospital.explanation_source === "llm" ? "AI Analysis · Powered by Claude" : "Summary"}
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-foreground leading-relaxed">
            {hospital.explanation}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
