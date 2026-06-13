import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Award,
  AlertCircle,
  ExternalLink,
  Building2,
  Info,
} from "lucide-react";
import { MetricBar } from "./MetricBar";
import { fetchHospitalDetail, type RankedHospital, type HospitalDetail } from "../api";

interface HospitalDetailViewProps {
  hospital: RankedHospital;
  conditionDisplay: string;
  onBack: () => void;
}

const RANK_COLORS = ["#0ea5b0", "#1e40af", "#5a6a82"];

const VS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  better: { label: "Better than national", color: "#16a34a", bg: "#dcfce7" },
  worse: { label: "Worse than national", color: "#d97706", bg: "#fef3c7" },
  no_different: { label: "Same as national", color: "#5a6a82", bg: "#e8edf5" },
};

function exclusionLabel(reason: string | null, footnote: string): string {
  if (footnote) return footnote;
  switch (reason) {
    case "not_available": return "Not publicly reported";
    case "too_few_cases": return "Too few cases to report";
    case "no_national_data": return "No national benchmark";
    default: return "No data available";
  }
}

export function HospitalDetailView({ hospital, conditionDisplay, onBack }: HospitalDetailViewProps) {
  const [detail, setDetail] = useState<HospitalDetail | null>(null);
  const rankColor = RANK_COLORS[Math.min(hospital.rank - 1, 2)];
  const included = hospital.measures.filter((m) => m.included && m.raw_score !== null);
  const excluded = hospital.measures.filter((m) => !m.included);

  useEffect(() => {
    fetchHospitalDetail(hospital.facility_id)
      .then(setDetail)
      .catch(() => {});
  }, [hospital.facility_id]);

  const mapsQuery = detail
    ? encodeURIComponent(`${hospital.name} ${detail.city} ${detail.state}`)
    : encodeURIComponent(hospital.name);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const directionsUrl = detail
    ? `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`
    : mapsUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
        style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to results
      </button>

      {/* Header card */}
      <div
        className="bg-card rounded-2xl overflow-hidden border-2 shadow-lg mb-6"
        style={{ borderColor: rankColor }}
      >
        <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: rankColor }}>
          <Award className="w-5 h-5 text-white flex-shrink-0" />
          <span
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
            className="text-white"
          >
            Ranked #{hospital.rank} for {conditionDisplay}
          </span>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white flex-shrink-0 text-xl"
                style={{ backgroundColor: rankColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
              >
                #{hospital.rank}
              </div>
              <div>
                <h1
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}
                  className="text-foreground text-2xl leading-tight mb-1"
                >
                  {hospital.name}
                </h1>
                <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-sm">
                  Facility ID {hospital.facility_id}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: rankColor }}
                className="text-3xl"
              >
                {hospital.score !== null ? hospital.score : "—"}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif" }} className="text-xs text-muted-foreground">
                {hospital.score !== null ? "Quality score" : "Not rated"}
              </div>
            </div>
          </div>

          {/* Basic info from detail fetch */}
          {detail && (
            <div className="flex flex-wrap gap-3 mb-4">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#5a6a82" }}
              >
                <MapPin className="w-3.5 h-3.5" />
                {detail.city}, {detail.state}
              </span>
              {detail.type && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#5a6a82" }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {detail.type}
                </span>
              )}
              {detail.ownership && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#5a6a82" }}
                >
                  {detail.ownership}
                </span>
              )}
            </div>
          )}

          {/* Coverage badge */}
          <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      {/* Directions card */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-6">
        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          className="text-foreground text-base mb-3 flex items-center gap-2"
        >
          <Navigation className="w-4 h-4" style={{ color: "#0ea5b0" }} />
          Get Directions
        </h2>
        {detail ? (
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-sm mb-4">
            {hospital.name} · {detail.city}, {detail.state}
          </p>
        ) : (
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-sm mb-4 animate-pulse">
            Loading location…
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0ea5b0", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          >
            <Navigation className="w-4 h-4" />
            Directions in Google Maps
          </a>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-border hover:bg-muted/40 transition-colors"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#5a6a82" }}
          >
            <ExternalLink className="w-4 h-4" />
            View on Maps
          </a>
        </div>
      </div>

      {/* Quality measures */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          className="text-foreground text-base mb-4"
        >
          Quality Measures — {conditionDisplay}
        </h2>

        {included.length > 0 ? (
          <div className="space-y-4">
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
          <div className="p-4 rounded-xl bg-muted/40 text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
            No publicly reported {conditionDisplay.toLowerCase()} measures for this hospital.
          </div>
        )}

        {excluded.length > 0 && (
          <div className="mt-5">
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
      </div>

      {/* AI/template explanation */}
      <div className="rounded-2xl p-5 bg-card border border-border mb-6">
        <p
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
          className="text-xs text-muted-foreground mb-3 uppercase tracking-wide"
        >
          {hospital.explanation_source === "llm" ? "AI Analysis · Powered by Claude" : "Summary"}
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-foreground leading-relaxed">
          {hospital.explanation}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
        <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-muted-foreground">
          Rankings reflect CMS-reported outcomes for {conditionDisplay.toLowerCase()}. Always confirm
          insurance coverage and call the hospital directly to verify services and availability.
        </p>
      </div>
    </motion.div>
  );
}
