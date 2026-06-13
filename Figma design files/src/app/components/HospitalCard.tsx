import { motion } from "motion/react";
import { Award, Users, Star, TrendingDown } from "lucide-react";
import { MetricBar } from "./MetricBar";

export interface HospitalData {
  name: string;
  location: string;
  rank: number;
  overallScore: number;
  readmissionRate: number;
  mortalityRate: number;
  annualVolume: number;
  patientSatisfaction: number;
  aiReasoning: string;
  highlights: string[];
}

interface HospitalCardProps {
  hospital: HospitalData;
  condition: string;
  isTop: boolean;
  delay: number;
}

const RANK_COLORS = ["#0ea5b0", "#1e40af", "#5a6a82"];
const RANK_LABELS = ["Best match", "Strong option", "Consider"];

export function HospitalCard({ hospital, condition, isTop, delay }: HospitalCardProps) {
  const rankColor = RANK_COLORS[Math.min(hospital.rank - 1, 2)];
  const rankLabel = RANK_LABELS[Math.min(hospital.rank - 1, 2)];

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
        <div
          className="px-5 py-2 flex items-center gap-2"
          style={{ backgroundColor: "#0ea5b0" }}
        >
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
                {hospital.location}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div
              style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: rankColor }}
              className="text-2xl"
            >
              {hospital.overallScore}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif" }} className="text-xs text-muted-foreground">
              Quality score
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {hospital.highlights.map((h) => (
            <span
              key={h}
              className="text-xs px-2.5 py-1 rounded-full border border-border"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#5a6a82" }}
            >
              {h}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-muted/40">
          <div className="text-center">
            <TrendingDown className="w-4 h-4 text-accent mx-auto mb-1" />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }} className="text-foreground text-sm">
              {hospital.readmissionRate}%
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif" }} className="text-xs text-muted-foreground mt-0.5">
              Readmission
            </div>
          </div>
          <div className="text-center border-x border-border">
            <Users className="w-4 h-4 text-accent mx-auto mb-1" />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }} className="text-foreground text-sm">
              {hospital.annualVolume.toLocaleString()}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif" }} className="text-xs text-muted-foreground mt-0.5">
              Annual cases
            </div>
          </div>
          <div className="text-center">
            <Star className="w-4 h-4 text-accent mx-auto mb-1" />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }} className="text-foreground text-sm">
              {hospital.patientSatisfaction}%
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif" }} className="text-xs text-muted-foreground mt-0.5">
              Satisfied
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <MetricBar
            label="Readmission Rate"
            value={hospital.readmissionRate}
            benchmark={14.6}
            unit="%"
            lowerIsBetter
            tooltip="Lower readmission rates indicate better initial care and discharge planning"
          />
          <MetricBar
            label="Mortality Rate"
            value={hospital.mortalityRate}
            benchmark={12.4}
            unit="%"
            lowerIsBetter
            tooltip="Adjusted for patient risk factors"
          />
          <MetricBar
            label="Patient Satisfaction"
            value={hospital.patientSatisfaction}
            benchmark={71}
            unit="%"
          />
        </div>

        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#0d1b2e08", borderLeft: "3px solid #0ea5b0" }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
            AI Analysis · Powered by Claude
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-foreground leading-relaxed">
            {hospital.aiReasoning}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
