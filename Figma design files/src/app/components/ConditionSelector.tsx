import { motion } from "motion/react";
import { Heart, Wind, Brain, Bone, Activity, Stethoscope } from "lucide-react";

export interface Condition {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const CONDITIONS: Condition[] = [
  {
    id: "heart-attack",
    name: "Heart Attack",
    description: "Acute myocardial infarction care & recovery",
    icon: <Heart className="w-5 h-5" />,
    color: "#ef4444",
  },
  {
    id: "heart-failure",
    name: "Heart Failure",
    description: "Chronic heart failure management",
    icon: <Activity className="w-5 h-5" />,
    color: "#f97316",
  },
  {
    id: "pneumonia",
    name: "Pneumonia",
    description: "Respiratory infection treatment & care",
    icon: <Wind className="w-5 h-5" />,
    color: "#0ea5e9",
  },
  {
    id: "hip-knee",
    name: "Hip & Knee Replacement",
    description: "Elective joint replacement surgery",
    icon: <Bone className="w-5 h-5" />,
    color: "#8b5cf6",
  },
  {
    id: "copd",
    name: "COPD",
    description: "Chronic obstructive pulmonary disease",
    icon: <Stethoscope className="w-5 h-5" />,
    color: "#14b8a6",
  },
  {
    id: "stroke",
    name: "Stroke",
    description: "Stroke treatment, rehab & outcomes",
    icon: <Brain className="w-5 h-5" />,
    color: "#a855f7",
  },
];

interface ConditionSelectorProps {
  selected: Condition | null;
  onSelect: (condition: Condition) => void;
}

export function ConditionSelector({ selected, onSelect }: ConditionSelectorProps) {
  return (
    <div>
      <div className="mb-8">
        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
          className="text-3xl text-foreground mb-2"
        >
          What condition are you researching?
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-muted-foreground text-lg">
          We'll find hospitals with the best outcomes for your specific needs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONDITIONS.map((condition, i) => {
          const isSelected = selected?.id === condition.id;
          return (
            <motion.button
              key={condition.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              onClick={() => onSelect(condition)}
              className={`text-left p-5 rounded-2xl border-2 transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "border-accent bg-accent/5 shadow-md"
                  : "border-border bg-card hover:border-accent/40 hover:shadow-sm"
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: condition.color + "18", color: condition.color }}
              >
                {condition.icon}
              </div>
              <p
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
                className="text-foreground mb-1"
              >
                {condition.name}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-sm text-muted-foreground">
                {condition.description}
              </p>
              {isSelected && (
                <div
                  className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#0ea5b0", color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  Selected
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
