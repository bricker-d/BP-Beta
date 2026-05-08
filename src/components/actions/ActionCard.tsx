"use client";

import { useState } from "react";
import { FlaskConical, Clock, TrendingUp } from "lucide-react";
import { HealthAction } from "@/lib/types";

// Solid fill pills — white text on colored background
const CATEGORY_CONFIG: Record<string, { solid: string; light: string }> = {
  Movement:   { solid: "#F59E0B", light: "rgba(245,158,11,0.10)" },
  Nutrition:  { solid: "#16A34A", light: "rgba(22,163,74,0.10)"  },
  Exercise:   { solid: "#2563EB", light: "rgba(37,99,235,0.10)"  },
  Sleep:      { solid: "#7C3AED", light: "rgba(124,58,237,0.10)" },
  Supplement: { solid: "#DB2777", light: "rgba(219,39,119,0.10)" },
  Lifestyle:  { solid: "#0891B2", light: "rgba(8,145,178,0.10)"  },
};

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: "Grade A", color: "#16A34A", bg: "rgba(22,163,74,0.1)"   },
  B: { label: "Grade B", color: "#D97706", bg: "rgba(217,119,6,0.1)"   },
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
      opacity: action.completed ? 0.48 : 1,
      transition: "opacity 0.2s",
    }}>

      {/* ── Main row ── */}
      <div className="flex items-center gap-3 px-4 py-4">

        {/* Checkbox — larger circle */}
        <button
          onClick={() => onToggle(action.id)}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            border: action.completed ? "none" : "2px solid var(--border)",
            background: action.completed ? "#34C759" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.2s, border 0.2s",
          }}
        >
          {action.completed && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1.5 4.5l3 3 5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title + category pill */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-snug"
            style={{ color: "var(--text1)", textDecoration: action.completed ? "line-through" : "none" }}>
            {action.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {/* Solid colored category pill */}
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: cat.solid, color: "#fff", letterSpacing: "0.01em" }}
            >
              {action.category}
            </span>
            {action.biomarkerTarget && (
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                {action.biomarkerTarget}
              </span>
            )}
          </div>
        </div>

        {/* "Why this works" inline toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 text-[11px] font-medium"
          style={{ color: "var(--accent)", whiteSpace: "nowrap" }}
        >
          {expanded ? "Hide ▲" : "Why this works ▼"}
        </button>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>

          {/* Description */}
          {action.description && (
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text2)" }}>
              {action.description}
            </p>
          )}

          {/* Why it works */}
          {action.why && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--text3)" }}>Why it works</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text2)" }}>
                {action.why}
              </p>
            </div>
          )}

          {/* Evidence row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: grade.bg, color: grade.color }}>
              {grade.label}
            </span>
            {action.effectSize && (
              <span className="flex items-center gap-1 text-[10px] font-medium"
                style={{ color: "var(--text2)" }}>
                <TrendingUp size={10} color={cat.solid} />
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
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <FlaskConical size={12} color={cat.solid} className="flex-shrink-0 mt-0.5" />
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
