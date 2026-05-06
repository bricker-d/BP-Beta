"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical, Clock, TrendingUp } from "lucide-react";
import { HealthAction } from "@/lib/types";

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  Movement:   { color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)"  },
  Nutrition:  { color: "#C96A2B", bg: "rgba(201,106,43,0.08)",  border: "rgba(201,106,43,0.25)"  },
  Exercise:   { color: "#2563EB", bg: "rgba(37,99,235,0.08)",   border: "rgba(37,99,235,0.25)"   },
  Sleep:      { color: "#7C3AED", bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.25)"  },
  Supplement: { color: "#DB2777", bg: "rgba(219,39,119,0.08)",  border: "rgba(219,39,119,0.25)"  },
  Lifestyle:  { color: "#4F7942", bg: "rgba(79,121,66,0.08)",   border: "rgba(79,121,66,0.25)"   },
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

  const rawCite = typeof action.citations?.[0] === "string" ? action.citations[0] : null;
  const pmidMatch = rawCite?.match(/PMID\s*:?\s*(\d+)/i);
  const pmid = pmidMatch?.[1] ?? null;

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      overflow: "hidden",
      opacity: action.completed ? 0.5 : 1,
      transition: "opacity 0.2s",
    }}>

      {/* ── Collapsed row ── */}
      <div className="flex items-center gap-3 px-4 py-3.5">

        {/* Checkbox */}
        <button
          onClick={() => onToggle(action.id)}
          style={{
            width: 24, height: 24, borderRadius: "50%",
            border: action.completed ? "none" : "2px solid var(--border)",
            background: action.completed ? "var(--green)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {action.completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title + category */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium leading-snug"
            style={{ color: "var(--text1)", textDecoration: action.completed ? "line-through" : "none" }}>
            {action.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>{action.category}</span>
          </div>
        </div>

        {/* Expand */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-1 flex-shrink-0"
          style={{ color: "var(--text3)" }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>

          {/* What to do */}
          {action.description && (
            <p className="text-[13px] leading-relaxed mb-3" style={{ color: "var(--text2)" }}>
              {action.description}
            </p>
          )}

          {/* Biomarker target chip */}
          {action.biomarkerTarget && (
            <div className="inline-flex rounded-xl px-3 py-1.5 mb-3"
              style={{ background: cat.bg, border: `1px solid ${cat.border}` }}>
              <p className="text-[11px] font-medium" style={{ color: cat.color }}>
                {action.biomarkerTarget}
              </p>
            </div>
          )}

          {/* Why it works */}
          {action.why && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--text3)" }}>Why it works</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text2)" }}>
                {action.why}
              </p>
            </div>
          )}

          {/* Evidence row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: grade.bg, color: grade.color }}>
              {grade.label}
            </span>
            {action.effectSize && (
              <span className="flex items-center gap-1 text-[10px] font-medium"
                style={{ color: "var(--text2)" }}>
                <TrendingUp size={10} color={cat.color} />
                {action.effectSize}
              </span>
            )}
            {action.timeToEffect && (
              <span className="flex items-center gap-1 text-[10px]"
                style={{ color: "var(--text3)" }}>
                <Clock size={10} />
                {action.timeToEffect}
              </span>
            )}
          </div>

          {/* Citation */}
          {rawCite && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <FlaskConical size={12} color={cat.color} className="flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                  style={{ color: "var(--text3)" }}>Research</p>
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
