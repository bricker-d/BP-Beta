"use client";

import { useState } from "react";
import { ChevronDown, FlaskConical, Clock, TrendingUp } from "lucide-react";
import { HealthAction } from "@/lib/types";

const CATEGORY_DOT: Record<string, string> = {
  Movement:   "#F59E0B",
  Nutrition:  "#16A34A",
  Exercise:   "#2563EB",
  Sleep:      "#7C3AED",
  Supplement: "#0891B2",
  Lifestyle:  "#6366F1",
};

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: "Grade A evidence", color: "#059669", bg: "rgba(5,150,105,0.08)"  },
  B: { label: "Grade B evidence", color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
  C: { label: "Grade C evidence", color: "#6B7280", bg: "rgba(107,114,128,0.08)" },
};

interface Props {
  action: HealthAction;
  onToggle: (id: string) => void;
}

export default function ActionCard({ action, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const dot   = CATEGORY_DOT[action.category] ?? "#6366F1";
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

      {/* ── Main content ── */}
      <div className="flex gap-3.5 px-4 pt-4 pb-3.5">

        {/* Checkbox */}
        <button
          onClick={() => onToggle(action.id)}
          style={{
            width: 22, height: 22, borderRadius: "50%",
            border: action.completed ? "none" : "1.5px solid var(--border)",
            background: action.completed ? "#34C759" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 2,
            transition: "all 0.18s",
          }}
        >
          {action.completed && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5l2.5 2.5L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold leading-snug"
            style={{ color: "var(--text1)", textDecoration: action.completed ? "line-through" : "none" }}>
            {action.title}
          </p>

          {/* Category + biomarker */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--text3)" }}>
                {action.category}
              </span>
            </div>
            {action.biomarkerTarget && (
              <>
                <span style={{ color: "var(--border)" }}>·</span>
                <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                  {action.biomarkerTarget}
                </span>
              </>
            )}
          </div>

          {/* Description preview — collapsed only */}
          {action.description && !expanded && (
            <p className="text-[12px] mt-2 leading-relaxed"
              style={{ color: "var(--text2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {action.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Expand bar ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2"
        style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}
      >
        <span className="text-[11px] font-semibold" style={{ color: "var(--text3)" }}>
          {expanded ? "Close" : "Mechanism & evidence"}
        </span>
        <ChevronDown size={13} color="var(--text3)"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="px-4 pb-5 pt-4 space-y-5" style={{ background: "var(--bg)" }}>

          {/* What to do */}
          {action.description && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text3)" }}>
                What to do
              </p>
              <p className="text-[13px] leading-[1.65]" style={{ color: "var(--text1)" }}>
                {action.description}
              </p>
            </div>
          )}

          {/* Mechanism */}
          {action.why && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text3)" }}>
                Mechanism
              </p>
              <p className="text-[13px] leading-[1.65]" style={{ color: "var(--text2)" }}>
                {action.why}
              </p>
            </div>
          )}

          {/* Evidence */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text3)" }}>
              Evidence
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: grade.bg, color: grade.color }}>
                {grade.label}
              </span>
              {action.effectSize && (
                <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text2)" }}>
                  <TrendingUp size={11} color="var(--text3)" strokeWidth={2} />
                  {action.effectSize}
                </span>
              )}
              {action.timeToEffect && (
                <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text3)" }}>
                  <Clock size={11} strokeWidth={2} />
                  {action.timeToEffect}
                </span>
              )}
            </div>
          </div>

          {/* Citation */}
          {rawCite && (
            <div className="rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <FlaskConical size={11} color="var(--text3)" />
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>
                  Research basis
                </p>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text2)" }}>
                {rawCite}
              </p>
              {pmid && (
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono mt-1.5 block"
                  style={{ color: "var(--accent)" }}
                >
                  PubMed {pmid} ↗
                </a>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--text3)" }}>
            AI-generated suggestion based on your lab values. Verify with your provider before changing medications or supplements.
          </p>
        </div>
      )}
    </div>
  );
}
