"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, Clock } from "lucide-react";
import { HealthAction } from "@/lib/types";

interface ActionCardProps {
  action: HealthAction;
  onToggle: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  Movement:    { color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  Nutrition:   { color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  Exercise:    { color: "#3B82F6", bg: "rgba(59,130,246,0.1)"  },
  Sleep:       { color: "#8B5CF6", bg: "rgba(139,92,246,0.1)"  },
  Supplement:  { color: "#EC4899", bg: "rgba(236,72,153,0.1)"  },
  Lifestyle:   { color: "#6366F1", bg: "rgba(99,102,241,0.1)"  },
};

const GRADE_CONFIG: Record<string, { color: string; bg: string }> = {
  A: { color: "#059669", bg: "rgba(5,150,105,0.1)"  },
  B: { color: "#D97706", bg: "rgba(217,119,6,0.1)"  },
  C: { color: "#6B6872", bg: "rgba(107,104,114,0.1)" },
};

export default function ActionCard({ action, onToggle }: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cat   = CATEGORY_COLORS[action.category] ?? { color: "var(--accent)", bg: "var(--accent-lo)" };
  const grade = GRADE_CONFIG[action.evidenceGrade ?? "B"] ?? GRADE_CONFIG.B;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        overflow: "hidden",
        opacity: action.completed ? 0.55 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(action.id)}
          className="flex-shrink-0 mt-0.5 transition-all"
          style={{
            width: 24, height: 24, borderRadius: "50%",
            border: action.completed ? "none" : "2px solid var(--border)",
            background: action.completed ? "var(--green)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {action.completed && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4.5l3 3 6-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold leading-snug"
            style={{ color: "var(--text1)", textDecoration: action.completed ? "line-through" : "none" }}>
            {action.title}
          </p>

          {action.biomarkerTarget && (
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--accent)" }}>
              {action.biomarkerTarget}
            </p>
          )}

          <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: "var(--text2)" }}>
            {action.description}
          </p>

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: cat.bg, color: cat.color }}>
              {action.category}
            </span>
            {action.evidenceGrade && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: grade.bg, color: grade.color }}>
                Grade {action.evidenceGrade}
              </span>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[12px] font-medium ml-auto"
              style={{ color: "var(--accent)" }}
            >
              Why this works
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Expanded: mechanism + stats */}
          {expanded && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text2)" }}>
                {action.why}
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {action.effectSize && (
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={11} color="var(--accent)" />
                    <span className="text-[11px]" style={{ color: "var(--text2)" }}>{action.effectSize}</span>
                  </div>
                )}
                {action.timeToEffect && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} color="var(--text3)" />
                    <span className="text-[11px]" style={{ color: "var(--text3)" }}>{action.timeToEffect}</span>
                  </div>
                )}
              </div>
              {action.citations && action.citations.length > 0 && (
                <p className="text-[11px] mt-2" style={{ color: "var(--text3)", lineHeight: 1.5 }}>
                  {typeof action.citations[0] === "string" ? action.citations[0] : ""}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
