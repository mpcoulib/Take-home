import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ExternalLink, Info, MapPin, Shield, Activity, AlertTriangle } from "lucide-react";
import { HospitalCard } from "./HospitalCard";
import { INSURANCE_OPTIONS } from "./InsuranceSelector";
import {
  inferCondition,
  extractState,
  searchHospitals,
  rankHospitals,
  type RankedHospital,
} from "../api";

// How many in-state hospitals to rank, and how many to show.
const RANK_POOL = 12;
const SHOW_TOP = 6;

interface PatientResultsViewProps {
  complaints: string;
  insuranceId: string;
  location: string;
  onReset: () => void;
  onSelectHospital: (hospital: RankedHospital, conditionDisplay: string) => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; conditionDisplay: string; hospitals: RankedHospital[] };

export function PatientResultsView({ complaints, insuranceId, location, onReset, onSelectHospital }: PatientResultsViewProps) {
  const condition = inferCondition(complaints);
  const insuranceName = INSURANCE_OPTIONS.find((i) => i.id === insuranceId)?.name ?? "Your insurance";
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stateCode = extractState(location);
        if (!stateCode) {
          throw new Error(
            `Couldn't read a US state from "${location}". Try "City, ST" (e.g. Boston, MA).`,
          );
        }
        // Acute-care hospitals in the state carry the outcome measures we rank on.
        const { results } = await searchHospitals(stateCode, 60);
        const acute = results.filter((h) => h.type === "Acute Care Hospitals");
        const pool = (acute.length ? acute : results).slice(0, RANK_POOL);
        if (pool.length === 0) {
          throw new Error(`No hospitals found in ${stateCode}.`);
        }
        const ranked = await rankHospitals(
          condition.id,
          pool.map((h) => h.facility_id),
        );
        if (cancelled) return;
        setState({
          status: "ready",
          conditionDisplay: ranked.display,
          hospitals: ranked.rankings.slice(0, SHOW_TOP),
        });
      } catch (e: any) {
        if (!cancelled) setState({ status: "error", message: e?.message ?? "Something went wrong." });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: "#0ea5b0" }}>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
            <Activity className="w-8 h-8 text-white" />
          </motion.div>
        </div>
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }} className="text-xl text-foreground mb-2">
          Ranking hospitals by CMS outcomes…
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-center max-w-sm">
          Matching {condition.label} quality measures for hospitals in {location}.
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-amber-600" />
        </div>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }} className="text-2xl text-foreground mb-2">
          Couldn't load rankings
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground mb-6">
          {state.message}
        </p>
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-xl text-white"
          style={{ backgroundColor: "#0ea5b0", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
        >
          Start over
        </button>
      </div>
    );
  }

  const { conditionDisplay, hospitals } = state;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-8">
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
            style={{ backgroundColor: "#0ea5b018", color: "#0ea5b0", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
          >
            {conditionDisplay}
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

        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }} className="text-3xl text-foreground mb-2">
          Hospitals ranked for {conditionDisplay.toLowerCase()}
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-lg">
          Scored on real CMS outcome measures vs. the national rate.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="rounded-2xl p-5 bg-card border border-border mb-6"
        style={{ borderLeft: "3px solid #0ea5b0" }}
      >
        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }} className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
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
          Rankings reflect CMS-reported outcomes for {conditionDisplay.toLowerCase()}. Insurance network
          status is not verified here — always confirm coverage with your insurer before scheduling.
        </p>
      </motion.div>

      <div className="space-y-5">
        {hospitals.map((hospital, i) => (
          <button
            key={hospital.facility_id}
            type="button"
            onClick={() => onSelectHospital(hospital, conditionDisplay)}
            className="group w-full text-left block rounded-2xl transition-transform hover:scale-[1.005] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <HospitalCard hospital={hospital} condition={conditionDisplay} isTop={i === 0} delay={i * 0.08} />
          </button>
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
