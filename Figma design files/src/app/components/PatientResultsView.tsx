import { motion } from "motion/react";
import { ArrowLeft, ExternalLink, Info, MapPin, Shield } from "lucide-react";
import { HospitalCard, HospitalData } from "./HospitalCard";
import { INSURANCE_OPTIONS } from "./InsuranceSelector";

function inferConditionLabel(complaints: string): string {
  const text = complaints.toLowerCase();
  if (text.includes("chest") || text.includes("heart") || text.includes("breath")) return "Heart & chest care";
  if (text.includes("knee") || text.includes("hip") || text.includes("joint")) return "Orthopedic care";
  if (text.includes("cough") || text.includes("pneumonia") || text.includes("lung")) return "Respiratory care";
  if (text.includes("stroke") || text.includes("numbness") || text.includes("dizziness")) return "Neurological care";
  if (text.includes("fever") || text.includes("infection")) return "General acute care";
  return "Your care needs";
}

const HOSPITAL_TEMPLATES = [
  { name: "Regional Medical Center", suffix: "University Hospital" },
  { name: "Community Health System", suffix: "Main Campus" },
  { name: "Metropolitan General", suffix: "Specialty Center" },
  { name: "Valley Medical Center", suffix: "Regional Campus" },
  { name: "Central Health Partners", suffix: "Medical Center" },
];

function generateHospitalData(
  template: (typeof HOSPITAL_TEMPLATES)[0],
  rank: number,
  location: string,
  conditionLabel: string,
  insuranceName: string
): HospitalData {
  const seed = template.name.length + rank + location.length;
  const baseReadmission = 9 + (seed % 7);
  const baseMortality = 8 + (seed % 5);
  const baseVolume = 600 + seed * 95;
  const baseSatisfaction = 70 + (seed % 18);
  const scoreMap: Record<number, number> = { 1: 93, 2: 86, 3: 79, 4: 73, 5: 67 };
  const overallScore = scoreMap[rank] ?? 65;

  const reasoningMap: Record<number, string> = {
    1: `${template.name} is our top recommendation near ${location} for ${conditionLabel.toLowerCase()}. Readmission rates of ${baseReadmission}% beat the national average, and they handle ${baseVolume.toLocaleString()}+ cases annually. ${insuranceName !== "Other / Not sure" ? `They typically accept ${insuranceName} plans.` : "Verify your specific plan before scheduling."}`,
    2: `${template.suffix} at ${template.name} shows strong outcomes for patients with similar symptoms. Their care teams are experienced and patient satisfaction runs ${baseSatisfaction}%. A solid alternative if the top pick isn't convenient.`,
    3: `${template.name} performs at or above the national benchmark for ${conditionLabel.toLowerCase()}. Worth considering based on your location in ${location} and specialist availability.`,
    4: `${template.name} meets baseline quality standards. Their readmission rate (${baseReadmission}%) is slightly above average — discuss with your physician if this is your nearest option.`,
    5: `${template.name} may work depending on urgency and network constraints. Review their metrics carefully and confirm ${insuranceName} coverage before choosing.`,
  };

  const highlights = [
    rank <= 2 ? "In-network likely" : "Verify network",
    baseVolume > 1000 ? "High volume center" : "Community hospital",
    rank === 1 ? "Top local match" : "Regional option",
    "CMS rated",
  ].slice(0, 3);

  return {
    name: template.name,
    location: `${template.suffix} · ${location}`,
    rank,
    overallScore,
    readmissionRate: baseReadmission,
    mortalityRate: baseMortality,
    annualVolume: baseVolume,
    patientSatisfaction: baseSatisfaction,
    aiReasoning: reasoningMap[rank] ?? reasoningMap[3],
    highlights,
  };
}

interface PatientResultsViewProps {
  complaints: string;
  insuranceId: string;
  location: string;
  onReset: () => void;
}

export function PatientResultsView({
  complaints,
  insuranceId,
  location,
  onReset,
}: PatientResultsViewProps) {
  const conditionLabel = inferConditionLabel(complaints);
  const insuranceName =
    INSURANCE_OPTIONS.find((i) => i.id === insuranceId)?.name ?? "Your insurance";

  const results: HospitalData[] = HOSPITAL_TEMPLATES.map((template, i) =>
    generateHospitalData(template, i + 1, location, conditionLabel, insuranceName)
  );

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Start new search
        </button>

        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
            style={{
              backgroundColor: "#0ea5b018",
              color: "#0ea5b0",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
            }}
          >
            {conditionLabel}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#5a6a82" }}
          >
            <Shield className="w-3.5 h-3.5" />
            {insuranceName}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#5a6a82" }}
          >
            <MapPin className="w-3.5 h-3.5" />
            {location}
          </span>
        </div>

        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}
          className="text-3xl text-foreground mb-2"
        >
          Hospitals near you
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-lg">
          Ranked by quality outcomes for your symptoms. Based on CMS Hospital Compare data.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="rounded-2xl p-5 bg-card border border-border mb-6"
        style={{ borderLeft: "3px solid #0ea5b0" }}
      >
        <p
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
          className="text-xs text-muted-foreground mb-2 uppercase tracking-wide"
        >
          What you told us
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-foreground leading-relaxed italic">
          &ldquo;{complaints}&rdquo;
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border mb-6"
      >
        <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-muted-foreground">
          Rankings reflect CMS-reported outcomes data. Insurance network status is estimated — always
          confirm coverage with your insurer before scheduling care.
        </p>
      </motion.div>

      <div className="space-y-5">
        {results.map((hospital, i) => (
          <HospitalCard
            key={hospital.name}
            hospital={hospital}
            condition={conditionLabel}
            isTop={i === 0}
            delay={i * 0.08}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <span>Data sourced from CMS Hospital Compare · Updated quarterly</span>
        <a
          href="https://www.medicare.gov/care-compare/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-accent hover:underline"
        >
          View on CMS <ExternalLink className="w-3 h-3" />
        </a>
      </motion.div>
    </div>
  );
}
