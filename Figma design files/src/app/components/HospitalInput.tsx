import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Search, Building2 } from "lucide-react";
import { Condition } from "./ConditionSelector";

const HOSPITAL_SUGGESTIONS = [
  "Mayo Clinic - Rochester, MN",
  "Cleveland Clinic - Cleveland, OH",
  "Johns Hopkins Hospital - Baltimore, MD",
  "Massachusetts General Hospital - Boston, MA",
  "UCSF Medical Center - San Francisco, CA",
  "NYU Langone Medical Center - New York, NY",
  "Northwestern Memorial Hospital - Chicago, IL",
  "Cedars-Sinai Medical Center - Los Angeles, CA",
  "Brigham and Women's Hospital - Boston, MA",
  "Houston Methodist Hospital - Houston, TX",
  "Stanford Health Care - Palo Alto, CA",
  "Mount Sinai Hospital - New York, NY",
];

interface HospitalInputProps {
  condition: Condition;
  hospitals: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}

export function HospitalInput({ condition, hospitals, onAdd, onRemove }: HospitalInputProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = HOSPITAL_SUGGESTIONS.filter(
    (h) =>
      h.toLowerCase().includes(query.toLowerCase()) &&
      !hospitals.includes(h) &&
      query.length > 0
  ).slice(0, 5);

  const handleAdd = (name: string) => {
    if (name.trim() && !hospitals.includes(name.trim())) {
      onAdd(name.trim());
      setQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      handleAdd(suggestions[0] || query);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{ backgroundColor: condition.color + "18", color: condition.color, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.875rem" }}
        >
          {condition.name}
        </div>
        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          className="text-3xl text-foreground mb-2"
        >
          Which hospitals are you considering?
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-lg">
          Add up to 5 hospitals. We'll compare their outcomes for {condition.name.toLowerCase()}.
        </p>
      </div>

      <div className="relative mb-6">
        <div
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 bg-card transition-all duration-200 ${
            focused ? "border-accent shadow-md shadow-accent/10" : "border-border"
          }`}
        >
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search hospital name or city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            onKeyDown={handleKeyDown}
            disabled={hospitals.length >= 5}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {suggestions.length > 0 && focused && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  onMouseDown={() => handleAdd(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
                >
                  <Building2 className="w-4 h-4 text-accent flex-shrink-0" />
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-foreground text-sm">
                    {s}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hospitals.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border-2 border-dashed border-border">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground">
            No hospitals added yet. Try searching above.
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-muted-foreground mt-1">
            No hospitals match yet. Try adding one from your insurance list.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }} className="text-sm text-muted-foreground uppercase tracking-wide">
            Added hospitals ({hospitals.length}/5)
          </p>
          <AnimatePresence>
            {hospitals.map((h, i) => (
              <motion.div
                key={h}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between px-4 py-3.5 bg-card border border-border rounded-2xl group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                    style={{ backgroundColor: "#0ea5b0", color: "#fff", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }} className="text-foreground">
                    {h}
                  </span>
                </div>
                <button
                  onClick={() => onRemove(h)}
                  className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {hospitals.length > 0 && hospitals.length < 5 && (
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add up to {5 - hospitals.length} more hospital{5 - hospitals.length !== 1 ? "s" : ""} for a richer comparison.
        </p>
      )}
    </div>
  );
}
