import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Activity, Shield } from "lucide-react";
import { LandingPage } from "./components/LandingPage";
import { ComplaintsInput } from "./components/ComplaintsInput";
import { InsuranceSelector, INSURANCE_OPTIONS } from "./components/InsuranceSelector";
import { LocationSelector } from "./components/LocationSelector";
import { PatientResultsView } from "./components/PatientResultsView";
import { HospitalDetailView } from "./components/HospitalDetailView";
import type { RankedHospital } from "./api";

type Step = "landing" | "complaints" | "insurance" | "location" | "results" | "detail";

const FLOW_STEPS: Exclude<Step, "landing" | "results">[] = [
  "complaints",
  "insurance",
  "location",
];

const STEP_LABELS: Record<Exclude<Step, "landing" | "results">, string> = {
  complaints: "Your symptoms",
  insurance: "Insurance",
  location: "Location",
};

function LoadingState({ location }: { location: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-24"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: "#0ea5b0" }}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <Activity className="w-8 h-8 text-white" />
        </motion.div>
      </div>
      <p
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
        className="text-xl text-foreground mb-2"
      >
        Finding hospitals near you...
      </p>
      <p
        style={{ fontFamily: "'Inter', sans-serif" }}
        className="text-muted-foreground text-center max-w-sm"
      >
        Matching quality outcomes in {location} with your symptoms and insurance network.
      </p>
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "#0ea5b0" }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function App() {
  const [step, setStep] = useState<Step>("landing");
  const [isLoading, setIsLoading] = useState(false);
  const [complaints, setComplaints] = useState("");
  const [insuranceId, setInsuranceId] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<RankedHospital | null>(null);
  const [conditionDisplay, setConditionDisplay] = useState("");

  const flowStepIdx = FLOW_STEPS.indexOf(step as (typeof FLOW_STEPS)[number]);
  const showProgress = step !== "landing" && step !== "results" && step !== "detail";

  const canAdvance =
    (step === "complaints" && complaints.trim().length >= 10) ||
    (step === "insurance" && insuranceId !== null) ||
    (step === "location" && location.trim().length >= 2);

  const handleAdvance = () => {
    if (step === "landing") {
      setStep("complaints");
    } else if (step === "complaints") {
      setStep("insurance");
    } else if (step === "insurance") {
      setStep("location");
    } else if (step === "location") {
      // PatientResultsView fetches + ranks real CMS data and owns its loading UI.
      setStep("results");
    }
  };

  const handleBack = () => {
    if (step === "complaints") setStep("landing");
    else if (step === "insurance") setStep("complaints");
    else if (step === "location") setStep("insurance");
  };

  const handleReset = () => {
    setStep("landing");
    setComplaints("");
    setInsuranceId(null);
    setLocation("");
    setSelectedHospital(null);
    setConditionDisplay("");
  };

  const handleSelectHospital = (hospital: RankedHospital, condition: string) => {
    setSelectedHospital(hospital);
    setConditionDisplay(condition);
    setStep("detail");
  };

  const insuranceName =
    INSURANCE_OPTIONS.find((i) => i.id === insuranceId)?.name ?? "Your insurance";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#f4f6f9", fontFamily: "'Inter', sans-serif" }}
    >
      <header
        className="sticky top-0 z-40 border-b border-border/60"
        style={{ backgroundColor: "#0d1b2e" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#0ea5b0" }}
            >
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
                className="text-base block"
              >
                HospitalMatch
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  color: "#0ea5b0",
                }}
                className="text-xs"
              >
                Quality Intelligence
              </span>
            </div>
          </button>

          {showProgress && (
            <div className="hidden sm:flex items-center gap-3">
              {FLOW_STEPS.map((s, i) => {
                const active = s === step;
                const done = i < flowStepIdx;
                return (
                  <div key={s} className="flex items-center gap-2">
                    {i > 0 && <div className="w-6 h-px bg-white/20" />}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                        style={{
                          backgroundColor:
                            done || active ? "#0ea5b0" : "rgba(255,255,255,0.1)",
                          color: "#fff",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 600,
                        }}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: active ? 600 : 400,
                          color: active ? "#ffffff" : "rgba(255,255,255,0.5)",
                        }}
                        className="text-sm"
                      >
                        {STEP_LABELS[s]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="w-24 hidden sm:block" />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <LoadingState key="loading" location={location} />
          ) : step === "detail" && selectedHospital ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <HospitalDetailView
                hospital={selectedHospital}
                conditionDisplay={conditionDisplay}
                onBack={() => setStep("results")}
              />
            </motion.div>
          ) : step === "results" && insuranceId ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <PatientResultsView
                complaints={complaints}
                insuranceId={insuranceId}
                location={location}
                onReset={handleReset}
                onSelectHospital={handleSelectHospital}
              />
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="max-w-3xl mx-auto">
                {step === "landing" && <LandingPage onStart={handleAdvance} />}

                {step === "complaints" && (
                  <ComplaintsInput value={complaints} onChange={setComplaints} />
                )}

                {step === "insurance" && (
                  <InsuranceSelector
                    selected={insuranceId}
                    onSelect={setInsuranceId}
                    complaintsPreview={complaints}
                  />
                )}

                {step === "location" && (
                  <LocationSelector
                    value={location}
                    onChange={setLocation}
                    insuranceName={insuranceName}
                  />
                )}
              </div>

              {step !== "landing" && (
                <div className="mt-10 flex items-center justify-between max-w-3xl mx-auto">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    disabled={!canAdvance}
                    onClick={handleAdvance}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105"
                    style={{
                      backgroundColor: "#0ea5b0",
                      color: "#ffffff",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    {step === "location" ? "Find hospitals" : "Continue"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-border py-8">
        <div
          className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          HospitalMatch uses publicly available CMS Hospital Compare data. This tool is for
          informational purposes only and does not constitute medical advice. Always consult your
          physician.
        </div>
      </footer>
    </div>
  );
}
