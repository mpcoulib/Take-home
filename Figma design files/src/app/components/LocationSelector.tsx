import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Navigation } from "lucide-react";

const LOCATION_SUGGESTIONS = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "Boston, MA",
  "Seattle, WA",
  "Denver, CO",
  "Atlanta, GA",
  "Miami, FL",
  "Minneapolis, MN",
];

interface LocationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  insuranceName: string;
}

export function LocationSelector({ value, onChange, insuranceName }: LocationSelectorProps) {
  const [focused, setFocused] = useState(false);

  const suggestions = LOCATION_SUGGESTIONS.filter(
    (loc) =>
      loc.toLowerCase().includes(value.toLowerCase()) &&
      loc.toLowerCase() !== value.toLowerCase() &&
      value.length > 0
  ).slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{
            backgroundColor: "#0d1b2e12",
            color: "#0d1b2e",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          <MapPin className="w-3.5 h-3.5" />
          {insuranceName}
        </div>
        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          className="text-3xl text-foreground mb-2"
        >
          Where are you located?
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-lg">
          Enter your city or ZIP code so we can find hospitals near you.
        </p>
      </div>

      <div className="relative mb-8">
        <motion.div
          animate={{
            boxShadow: focused
              ? "0 0 0 3px rgba(14, 165, 176, 0.15), 0 8px 32px rgba(13, 27, 46, 0.08)"
              : "0 4px 24px rgba(13, 27, 46, 0.06)",
          }}
          transition={{ duration: 0.2 }}
          className={`flex items-center gap-4 px-6 py-5 rounded-2xl border-2 bg-card transition-colors duration-200 ${
            focused ? "border-accent" : "border-border"
          }`}
        >
          <MapPin className="w-6 h-6 text-accent flex-shrink-0" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="City, State or ZIP code"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.25rem" }}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60"
          />
        </motion.div>

        <AnimatePresence>
          {suggestions.length > 0 && focused && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              {suggestions.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onMouseDown={() => onChange(loc)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted transition-colors"
                >
                  <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-foreground">
                    {loc}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <p
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
          className="text-sm text-muted-foreground uppercase tracking-wide mb-3"
        >
          Popular locations
        </p>
        <div className="flex flex-wrap gap-2">
          {LOCATION_SUGGESTIONS.slice(0, 8).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => onChange(loc)}
              className={`px-4 py-2 rounded-full border text-sm transition-all duration-150 ${
                value === loc
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
              }`}
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
        <Navigation className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-muted-foreground">
          We&apos;ll search within ~50 miles of your location and rank hospitals by quality outcomes
          for your symptoms.
        </p>
      </div>
    </div>
  );
}
