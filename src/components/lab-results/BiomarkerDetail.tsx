"use client";

import { useEffect } from "react";
import { X, TrendingUp, Clock, BookOpen } from "lucide-react";
import { Biomarker } from "@/lib/types";
import { BIOMARKER_LIBRARY } from "@/lib/clinicalLibrary";

interface Props {
  biomarker: Biomarker;
  onClose: () => void;
}

const STATUS = {
  optimal:    { label: "Optimal",    color: "#059669", bg: "rgba(5,150,105,0.08)"  },
  elevated:   { label: "Elevated",   color: "#dc2626", bg: "rgba(220,38,38,0.08)"  },
  low:        { label: "Low",        color: "#dc2626", bg: "rgba(220,38,38,0.08)"  },
  borderline: { label: "Borderline", color: "#d97706", bg: "rgba(217,119,6,0.08)"  },
};

export default function BiomarkerDetail({ biomarker, onClose }: Props) {
  const meta   = BIOMARKER_LIBRARY[biomarker.id];
  const status = STATUS[biomarker.status] ?? STATUS.borderline;

  // Range bar geometry
  const lo   = biomarker.optimalMin * 0.5;
  const hi   = biomarker.optimalMax * 1.5;
  const pct  = Math.min(100, Math.max(0, ((biomarker.value - lo) / (hi - lo)) * 100));
  const oMin = ((biomarker.optimalMin - lo) / (hi - lo)) * 100;
  const oMax = ((biomarker.optimalMax - lo) / (hi - lo)) * 100;

  // Prevent body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed z-50 bottom-0 left-1/2"
        style={{
          width: "100%",
          maxWidth: 430,
          transform: "translateX(-50%)",
          maxHeight: "88dvh",
          background: "var(--surface)",
          borderRadius: "20px 20px 0 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: 32, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-[19px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
              {meta?.name ?? biomarker.name}
            </h2>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[26px] font-bold mono" style={{ color: status.color }}>
                {biomarker.value}
              </span>
              <span className="text-[13px]" style={{ color: "var(--text3)" }}>{biomarker.unit}</span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: status.bg, color: status.color }}>
                {status.label}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full mt-1"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <X size={14} color="var(--text2)" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">

          {/* Range bar */}
          <div>
            <div className="relative h-2 rounded-full" style={{ background: "var(--border)" }}>
              <div className="absolute h-full rounded-full"
                style={{ left: `${oMin}%`, width: `${oMax - oMin}%`, background: "rgba(5,150,105,0.25)" }} />
              <div className="absolute w-3.5 h-3.5 rounded-full border-2 -translate-x-1/2"
                style={{ top: -3, left: `${pct}%`, background: status.color, borderColor: "var(--surface)" }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>Low</span>
              <span className="text-[11px] font-semibold" style={{ color: "var(--green)" }}>
                Optimal {biomarker.optimalMin}–{biomarker.optimalMax} {biomarker.unit}
              </span>
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>High</span>
            </div>
          </div>

          {/* What this is */}
          {meta?.description && (
            <Section title="What this is">
              <p className="text-[14px]" style={{ color: "var(--text1)", lineHeight: 1.7 }}>
                {meta.description}
              </p>
            </Section>
          )}

          {/* Risks when out of range */}
          {meta && biomarker.status !== "optimal" && (
            <div className="rounded-2xl px-4 py-4"
              style={{ background: status.bg, border: `1px solid ${status.color}22` }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: status.color }}>
                Risks at this level
              </p>
              <p className="text-[13px]" style={{ color: "var(--text1)", lineHeight: 1.65 }}>
                {meta.clinicalSignificance}
              </p>
            </div>
          )}

          {/* Why it matters */}
          {meta?.mechanismSummary && (
            <Section title="What's happening in your body">
              <p className="text-[14px]" style={{ color: "var(--text1)", lineHeight: 1.7 }}>
                {meta.mechanismSummary}
              </p>
            </Section>
          )}

          {/* How to fix it naturally */}
          {meta && meta.interventions.length > 0 && (
            <Section title="How to get it in range naturally">
              <div className="space-y-3">
                {meta.interventions.slice(0, 3).map((iv, i) => (
                  <div key={i} className="rounded-2xl px-4 py-4"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-[14px] font-semibold" style={{ color: "var(--text1)", lineHeight: 1.3 }}>
                        {iv.title}
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: iv.evidenceGrade === "A" ? "rgba(5,150,105,0.1)" : "var(--accent-lo)",
                          color: iv.evidenceGrade === "A" ? "var(--green)" : "var(--accent)",
                        }}>
                        Grade {iv.evidenceGrade}
                      </span>
                    </div>
                    <p className="text-[13px]" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
                      {iv.mechanism}
                    </p>
                    <div className="flex items-center gap-4 mt-3 pt-3 flex-wrap"
                      style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={11} color="var(--accent)" />
                        <span className="text-[11px]" style={{ color: "var(--text2)" }}>{iv.effectSize}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} color="var(--text3)" />
                        <span className="text-[11px]" style={{ color: "var(--text3)" }}>{iv.timeToEffect}</span>
                      </div>
                    </div>
                    {iv.citations[0] && (
                      <div className="flex items-start gap-1.5 mt-2">
                        <BookOpen size={10} color="var(--text3)" className="flex-shrink-0 mt-0.5" />
                        <p className="text-[10px]" style={{ color: "var(--text3)", lineHeight: 1.45 }}>
                          {iv.citations[0].authors} ({iv.citations[0].year}) — &ldquo;{iv.citations[0].finding}&rdquo;
                        </p>
                      </div>
                    )}
                    {iv.contraindications && (
                      <p className="mt-2 text-[11px]" style={{ color: "var(--amber)" }}>
                        Note: {iv.contraindications}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Optimal — just acknowledge it */}
          {biomarker.status === "optimal" && (
            <div className="rounded-2xl px-4 py-4"
              style={{ background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.18)" }}>
              <p className="text-[13px] font-semibold" style={{ color: "var(--green)" }}>
                This marker is in optimal range
              </p>
              <p className="text-[13px] mt-1" style={{ color: "var(--text2)", lineHeight: 1.55 }}>
                Keep doing what you&apos;re doing. The goal is to maintain this at your next panel.
              </p>
            </div>
          )}

          <div style={{ height: 8 }} />
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--text3)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}
