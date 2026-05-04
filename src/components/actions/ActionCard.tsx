"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical, Clock, TrendingUp } from "lucide-react";
import { HealthAction } from "@/lib/types";

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  Movement:   { color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.3)"  },
  Nutrition:  { color: "#10B981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.3)"  },
  Exercise:   { color: "#3B82F6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.3)"  },
  Sleep:      { color: "#8B5CF6", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.3)"  },
  Supplement: { color: "#EC4899", bg: "rgba(236,72,153,0.08)",  border: "rgba(236,72,153,0.3)"  },
  Lifestyle:  { color: "#6366F1", bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.3)"  },
};

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: "Grade A", color: "#059669", bg: "rgba(5,150,105,0.1)" },
  B: { label: "Grade B", color: "#D97706", bg: "rgba(217,119,6,0.1)" },
  C: { label: "Grade C", color: "#6B7280", bg: "rgba(107,114,128,0.1)" },
};

interface Props {
  action: HealthAction;
  onToggle: (id: string) => void;
}

export default function ActionCard({ action, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cat   = CATEGORY_CONFIG[action.category] ?? CATEGORY_CONFIG.Lifestyle;
  const grade = GRADE_CONFIG[action.evidenceGrade ?? "B"] ?? GRADE_CONFIG.B;

  // Parse first citation string for display
  const rawCite = typeof action.citations?.[0] === "string" ? action.citations[0] : null;
  const pmidMatch = rawCite?.match(/PMID\s*:?\s*(\d+)/i);
  const pmid = pmidMatch?.[1] ?? null;

  return (
    <div style={{
      background: "var(--surface)",
      border: `1px solid var(--border)`,
      borderLeft: `3px solid ${cat.color}`,
      borderRadius: 16,
      overflow: "hidden",
      opacity: action.completed ? 0.55 : 1,
      transition: "opacity 0.2s",
    }}>

      {/* ── Main row ── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">

        {/* Checkbox */}
        <button
          onClick={() => onToggle(action.id)}
          className="flex-shrink-0 mt-0.5"
          style={{
            width: 22, height: 22, borderRadius: "50%",
            border: action.completed ? "none" : `2px solid var(--border)`,
            background: action.completed ? "var(--green)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {action.completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-snug"
            style={{ color: "var(--text1)", textDecoration: action.completed ? "line-through" : "none" }}>
            {action.title}
          </p>

          {/* Biomarker target */}
          {action.biomarkerTarget && (
            <p className="text-[12px] mt-1 font-medium" style={{ color: cat.color }}>
              {action.biomarkerTarget}
            </p>
          )}

          {/* Stat row — always visible */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Evidence grade */}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: grade.bg, color: grade.color }}>
              {grade.label}
            </span>

            {/* Effect size */}
            {action.effectSize && (
              <span className="flex items-center gap-1 text-[10px] font-medium"
                style={{ color: "var(--text2)" }}>
                <TrendingUp size={10} color={cat.color} />
                {action.effectSize}
              </span>
            )}

            {/* Time to effect */}
            {action.timeToEffect && (
              <span className="flex items-center gap-1 text-[10px]"
                style={{ color: "var(--text3)" }}>
                <Clock size={10} />
                {action.timeToEffect}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 mt-1"
          style={{ color: "var(--text3)" }}
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)" }}>

          {/* Category tag */}
          <div className="flex items-center gap-1.5 pt-3 mb-3">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>
              {action.category}
            </span>
          </div>

          {/* Why it works */}
          {action.why && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--text3)" }}>Why it works</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text2)" }}>
                {action.why}
              </p>
            </div>
          )}

          {/* Citation */}
          {rawCite && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <FlaskConical size={12} color={cat.color} className="flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                  style={{ color: "var(--text3)" }}>Peer-reviewed source</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text2)" }}>
                  {rawCite}
                </p>
                {pmid && (
                  <p className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--text3)" }}>
                    PMID {pmid}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
