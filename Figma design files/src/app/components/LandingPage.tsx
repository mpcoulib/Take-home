import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, HeartPulse, ShieldCheck } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

const TRUST_POINTS = [
  "Real CMS Hospital Compare outcomes data",
  "Personalized to your symptoms and insurance",
  "Plain-language explanations you can trust",
];

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #0ea5b0 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #0d1b2e 0%, transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative max-w-3xl mx-auto text-center pt-8 pb-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-accent/20 bg-accent/5"
        >
          <HeartPulse className="w-4 h-4 text-accent" />
          <span
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
            className="text-sm text-accent"
          >
            Patient-first hospital matching
          </span>
        </motion.div>

        <h1
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}
          className="text-2xl sm:text-3xl sm:text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight mb-6"
        >
          Find the right hospital{" "}
          <span style={{ color: "#0ea5b0" }}>for you</span>
        </h1>

        <p
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Tell us what you&apos;re experiencing. We&apos;ll match you with hospitals that have
          the best outcomes — filtered by your insurance and location.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-lg shadow-lg shadow-accent/25 transition-shadow hover:shadow-xl hover:shadow-accent/30"
          style={{
            backgroundColor: "#0ea5b0",
            color: "#ffffff",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
          }}
        >
          Get started
          <ArrowRight className="w-5 h-5" />
        </motion.button>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {TRUST_POINTS.map((point, i) => (
            <motion.div
              key={point}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.35 }}
              className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border"
            >
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <span
                style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-sm text-muted-foreground leading-snug"
              >
                {point}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <ShieldCheck className="w-4 h-4 text-accent" />
          For informational purposes only — not medical advice
        </motion.div>
      </motion.div>
    </div>
  );
}
