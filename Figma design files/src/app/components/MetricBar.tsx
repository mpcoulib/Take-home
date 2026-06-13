interface MetricBarProps {
  label: string;
  value: number;
  benchmark: number;
  unit: string;
  lowerIsBetter?: boolean;
  tooltip?: string;
}

type Status = "above" | "at" | "below";

function getStatus(value: number, benchmark: number, lowerIsBetter: boolean): Status {
  const diff = ((value - benchmark) / benchmark) * 100;
  if (Math.abs(diff) <= 3) return "at";
  if (lowerIsBetter) return diff < -3 ? "above" : "below";
  return diff > 3 ? "above" : "below";
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  above: { label: "Above avg", color: "#16a34a", bg: "#dcfce7" },
  at: { label: "At avg", color: "#5a6a82", bg: "#e8edf5" },
  below: { label: "Below avg", color: "#d97706", bg: "#fef3c7" },
};

export function MetricBar({ label, value, benchmark, unit, lowerIsBetter = false, tooltip }: MetricBarProps) {
  const status = getStatus(value, benchmark, lowerIsBetter);
  const config = STATUS_CONFIG[status];

  const maxVal = Math.max(value, benchmark) * 1.3;
  const valuePct = Math.min((value / maxVal) * 100, 100);
  const benchmarkPct = Math.min((benchmark / maxVal) * 100, 100);

  return (
    <div className="space-y-2" title={tooltip}>
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }} className="text-sm text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}
            className="text-sm text-foreground"
          >
            {value}
            {unit}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ color: config.color, backgroundColor: config.bg, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
          >
            {config.label}
          </span>
        </div>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${valuePct}%`, backgroundColor: config.color, opacity: 0.7 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px h-4 rounded-full"
          style={{ left: `${benchmarkPct}%`, backgroundColor: "#5a6a82", opacity: 0.5 }}
          title={`National benchmark: ${benchmark}${unit}`}
        />
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-xs text-muted-foreground">
        National avg: {benchmark}{unit}
      </p>
    </div>
  );
}
