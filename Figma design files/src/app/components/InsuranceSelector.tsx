import { motion } from "motion/react";
import { CreditCard, Search } from "lucide-react";

export const INSURANCE_OPTIONS = [
  { id: "medicare", name: "Medicare", description: "Federal health insurance (65+ or disability)" },
  { id: "medicaid", name: "Medicaid", description: "State-based coverage for eligible individuals" },
  { id: "bcbs", name: "Blue Cross Blue Shield", description: "Nationwide PPO and HMO plans" },
  { id: "aetna", name: "Aetna", description: "Commercial and employer-sponsored plans" },
  { id: "united", name: "UnitedHealthcare", description: "Large national insurer network" },
  { id: "cigna", name: "Cigna", description: "Employer, individual, and Medicare plans" },
  { id: "kaiser", name: "Kaiser Permanente", description: "Integrated care HMO" },
  { id: "other", name: "Other / Not sure", description: "We'll show general quality rankings" },
];

interface InsuranceSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
  complaintsPreview: string;
}

export function InsuranceSelector({ selected, onSelect, complaintsPreview }: InsuranceSelectorProps) {
  return (
    <div>
      <div className="mb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 max-w-full"
          style={{
            backgroundColor: "#0ea5b018",
            color: "#0ea5b0",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          <span className="truncate">
            &ldquo;{complaintsPreview.slice(0, 60)}
            {complaintsPreview.length > 60 ? "…" : ""}&rdquo;
          </span>
        </div>
        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          className="text-2xl sm:text-3xl text-foreground mb-2"
        >
          What insurance do you have?
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-lg">
          We&apos;ll prioritize hospitals in your network and flag any coverage considerations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INSURANCE_OPTIONS.map((option, i) => {
          const isSelected = selected === option.id;
          return (
            <motion.button
              key={option.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              onClick={() => onSelect(option.id)}
              className={`text-left p-5 rounded-2xl border-2 transition-all duration-150 ${
                isSelected
                  ? "border-accent bg-accent/5 shadow-md"
                  : "border-border bg-card hover:border-accent/40 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isSelected ? "#0ea5b0" : "#0ea5b018",
                    color: isSelected ? "#fff" : "#0ea5b0",
                  }}
                >
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
                    className="text-foreground mb-0.5"
                  >
                    {option.name}
                  </p>
                  <p
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    className="text-sm text-muted-foreground"
                  >
                    {option.description}
                  </p>
                </div>
              </div>
              {isSelected && (
                <div
                  className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: "#0ea5b0",
                    color: "#fff",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  Selected
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
        <Search className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-muted-foreground">
          Not sure? Choose &ldquo;Other / Not sure&rdquo; — we&apos;ll still show quality-ranked
          hospitals near you.
        </p>
      </div>
    </div>
  );
}
