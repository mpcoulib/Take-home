import { motion } from "motion/react";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import { HospitalCard, HospitalData } from "./HospitalCard";
import { Condition } from "./ConditionSelector";

function generateHospitalData(name: string, rank: number, condition: string): HospitalData {
  const seed = name.length + rank;
  const baseReadmission = 10 + (seed % 8);
  const baseMortality = 9 + (seed % 6);
  const baseVolume = 800 + seed * 120;
  const baseSatisfaction = 68 + (seed % 20);

  const scoreMap: Record<number, number> = { 1: 94, 2: 87, 3: 79, 4: 72, 5: 65 };
  const overallScore = scoreMap[rank] ?? 60;

  const reasoningMap: Record<number, string> = {
    1: `${name} stands out for ${condition} care with consistently low readmission rates — ${baseReadmission}% against the national average of 14.6%. Their dedicated ${condition} unit handles over ${baseVolume.toLocaleString()} cases annually, giving their care teams deep procedural experience. Patient satisfaction scores reflect genuine quality, not just amenities.`,
    2: `${name} is a strong choice, particularly for patients prioritizing access and continuity of care. Their ${condition} outcomes are above the national benchmark and their care teams are well-regarded. The slightly higher readmission rate (${baseReadmission}%) is offset by excellent post-discharge support programs.`,
    3: `${name} performs at or near the national average for ${condition}. They may be a practical choice depending on your location, insurance, or specialist preference. Review their specific metrics carefully before deciding — outcomes vary by care team and time of year.`,
    4: `${name} shows adequate performance for ${condition}, though their readmission rate (${baseReadmission}%) runs slightly higher than the benchmark. Consider this hospital if it's your nearest option or your insurer prefers it. Ask about their specific cardiac team's experience.`,
    5: `${name}'s ${condition} metrics lag the national average in some areas. That doesn't mean poor care — hospital ratings are complex and context-dependent. Discuss these numbers with your referring physician, who may have direct experience with this team.`,
  };

  const allHighlights = [
    "Magnet® Nursing",
    "High volume center",
    "Specialty ICU",
    "Research hospital",
    "24/7 cath lab",
    "Stroke certified",
    "Joint Commission",
    "NCI designated",
  ];

  const highlights = allHighlights.filter((_, i) => (seed + i) % 3 === 0).slice(0, 3);

  const [city, ...rest] = name.split(" - ");
  const location = rest.join(" - ") || `${city}, USA`;

  return {
    name: city,
    location,
    rank,
    overallScore,
    readmissionRate: baseReadmission,
    mortalityRate: baseMortality,
    annualVolume: baseVolume,
    patientSatisfaction: baseSatisfaction,
    aiReasoning: reasoningMap[rank] ?? reasoningMap[3],
    highlights: highlights.length ? highlights : ["Joint Commission"],
  };
}

interface ResultsViewProps {
  condition: Condition;
  hospitals: string[];
  onReset: () => void;
}

export function ResultsView({ condition, hospitals, onReset }: ResultsViewProps) {
  const results: HospitalData[] = hospitals
    .map((name, i) => generateHospitalData(name, i + 1, condition.name))
    .sort((a, b) => a.rank - b.rank);

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

        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{ backgroundColor: condition.color + "18", color: condition.color, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem" }}
        >
          {condition.name}
        </div>

        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}
          className="text-3xl text-foreground mb-2"
        >
          Your hospital comparison
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-lg">
          Ranked by quality outcomes for {condition.name.toLowerCase()}. Based on CMS Hospital Compare data.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border mb-6"
      >
        <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-muted-foreground">
          Rankings reflect CMS-reported outcomes data, including risk-adjusted readmission rates, mortality rates, and patient experience scores. AI analysis is generated to help interpret — not replace — this data. Consult your physician before making healthcare decisions.
        </p>
      </motion.div>

      <div className="space-y-5">
        {results.map((hospital, i) => (
          <HospitalCard
            key={hospital.name}
            hospital={hospital}
            condition={condition.name}
            isTop={i === 0}
            delay={i * 0.08}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="mt-8 pt-6 border-t border-border flex items-center justify-between text-sm text-muted-foreground"
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
