import { useState } from "react";
import { motion } from "motion/react";
import { MessageSquareText, Sparkles } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "Chest tightness and shortness of breath for two days — I want the best heart outcomes and don't mind traveling.",
  "Sharp knee pain after running, swelling when I walk. I'd rather avoid long ER waits if possible.",
  "Dizziness and numbness on my left side since this morning — I need somewhere close, fast.",
  "Scheduling a hip replacement. Low complication rates matter most to me, comfort second.",
];

interface ComplaintsInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ComplaintsInput({ value, onChange }: ComplaintsInputProps) {
  const [focused, setFocused] = useState(false);
  const charCount = value.trim().length;
  const minChars = 10;

  return (
    <div>
      <div className="mb-8">
        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          className="text-3xl text-foreground mb-2"
        >
          What&apos;s going on?
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-lg">
          Describe your symptoms in your own words. There&apos;s no wrong way to explain it.
        </p>
      </div>

      <motion.div
        animate={{
          boxShadow: focused
            ? "0 0 0 3px rgba(14, 165, 176, 0.15), 0 8px 32px rgba(13, 27, 46, 0.08)"
            : "0 4px 24px rgba(13, 27, 46, 0.06)",
        }}
        transition={{ duration: 0.2 }}
        className={`relative rounded-3xl border-2 bg-card overflow-hidden transition-colors duration-200 ${
          focused ? "border-accent" : "border-border"
        }`}
      >
        <div className="flex items-center gap-2 px-6 pt-5 pb-2">
          <MessageSquareText className="w-5 h-5 text-accent" />
          <span
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
            className="text-sm text-muted-foreground"
          >
            Your symptoms
          </span>
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="For example: I've been feeling pressure in my chest when I walk upstairs, and it goes away when I rest. It started about 3 days ago..."
          rows={8}
          style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.125rem", lineHeight: 1.7 }}
          className="w-full px-6 pb-6 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 resize-none min-h-[220px]"
        />

        <div className="px-6 pb-5 flex items-center justify-between border-t border-border/60 pt-4">
          <span
            style={{ fontFamily: "'Inter', sans-serif" }}
            className={`text-sm ${charCount >= minChars ? "text-accent" : "text-muted-foreground"}`}
          >
            {charCount >= minChars
              ? "Got it — we'll use this to find the best match"
              : `${minChars - charCount} more characters to continue`}
          </span>
          <span
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            className="text-xs text-muted-foreground"
          >
            {charCount}
          </span>
        </div>
      </motion.div>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-accent" />
          <span
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
            className="text-sm text-muted-foreground"
          >
            Need inspiration? Tap an example
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onChange(prompt)}
              className="text-left px-4 py-2.5 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 transition-all duration-150 text-sm text-muted-foreground hover:text-foreground max-w-full sm:max-w-[calc(50%-4px)]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {prompt.slice(0, 55)}…
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
