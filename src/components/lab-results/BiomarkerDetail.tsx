"use client";

import { useEffect } from "react";
import { X, TrendingUp, Clock, BookOpen, AlertCircle } from "lucide-react";
import { Biomarker } from "@/lib/types";
import { BIOMARKER_LIBRARY } from "@/lib/clinicalLibrary";

interface BiomarkerDetailProps {
  biomarker: Biomarker;
  onClose: () => void;
}

const STATUS_CONFIG = {
  optimal:    { label: "Optimal",    color: "#059669", bg: "rgba(5,150,105,0.08)"  },
  elevated:   { label: "Elevated",   color: "#dc2626", bg: "rgba(220,38,38,0.08)"  },
  low:        { label: "Low",        color: "#dc2626", bg: "rgba(220,38,38,0.08)"  },
  borderline: { label: "Borderline", color: "#d97706", bg: "rgba(217,119,6,0.08)"  },
};

const GRADE_LABEL: Record<string, string> = {
  A: "Strong — multiple clinical trials",
  B: "Moderate — clinical trial evidence",
  C: "Emerging — expert consensus",
};

export default function BiomarkerDetail({ biomarker, onClose }: BiomarkerDetailProps) {
  const meta = BIOMARKER_LIBRARY[biomarker.id];
  const status = STATUS_CONFIG[biomarker.status] ?? STATUS_CONFIG.borderline;

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Range bar geometry
  const rangeMin = biomarker.optimalMin * 0.5;
  const rangeMax = biomarker.optimalMax * 1.5;
  const pct    = Math.min(100, Math.max(0, ((biomarker.value - rangeMin) / (rangeMax - rangeMin)) * 100));
  const optMin = ((biomarker.optimalMin - rangeMin) / (rangeMax - rangeMin)) * 100;
  const optMax = ((biomarker.optimalMax - rangeMin) / (rangeMax - rangeMin)) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full overflow-y-auto"
        style={{
          transform: "translateX(-50%)",
          maxWidth: 430,
          maxHeight: "90dvh",
          background: "var(--surface)",
          borderRadius: "24px 24px 0 0",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-[20px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
              {meta?.name ?? biomarker.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[22px] font-bold mono"
                style={{ color: status.color }}
              >
                {biomarker.value}
              </span>
              <span className="text-[13px]" style={{ color: "var(--text2)" }}>{biomarker.unit}</span>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: status.bg, color: status.color }}
              >
                {status.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          >
            <X size={15} color="var(--text2)" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">

          {/* Range bar */}
          <div>
            <div className="relative w-full h-2 rounded-full" style={{ background: "var(--border)" }}>
              <div
                className="absolute h-full rounded-full"
                style={{ left: `${optMin}%`, width: `${optMax - optMin}%`, background: "rgba(5,150,105,0.25)" }}
              />
              <div
                className="absolute w-3.5 h-3.5 rounded-full -top-[3px] -translate-x-1/2 border-2"
                style={{ left: `${pct}%`, background: status.color, borderColor: "var(--surface)", boxShadow: `0 0 0 2px ${status.color}33` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>Low</span>
              <span className="text-[11px] font-semibold" style={{ color: "var(--green)" }}>
                Optimal: {biomarker.optimalMin}–{biomarker.optimalMax} {biomarker.unit}
              </span>
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>High</span>
            </div>
          </div>

          {/* What this is */}
          {meta && (
            <Section title="What this is">
              <p className="text-[14px]" style={{ color: "var(--text1)", lineHeight: 1.65 }}>
                {meta.description}
              </p>
            </Section>
          )}

          {/* What it means for you */}
          {meta && biomarker.status !== "optimal" && (
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: status.bg, border: `1px solid ${status.color}33` }}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle size={15} color={status.color} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: status.color }}>
                    What this means for you
                  </p>
                  <p className="text-[13px]" style={{ color: "var(--text1)", lineHeight: 1.6 }}>
                    {meta.clinicalSignificance}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Why it matters */}
          {meta && (
            <Section title="Why it matters">
              <p className="text-[14px]" style={{ color: "var(--text1)", lineHeight: 1.65 }}>
                {meta.mechanismSummary}
              </p>
            </Section>
          )}

          {/* How to optimize */}
          {meta && meta.interventions.length > 0 && (
            <Section title="How to optimize it">
              <div className="space-y-3">
                {meta.interventions.slice(0, 3).map((intervention, i) => (
                  <div
                    key={i}
                    className="rounded-2xl px-4 py-4"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[14px] font-semibold" style={{ color: "var(--text1)", lineHeight: 1.3 }}>
                        {intervention.title}
                      </p>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: intervention.evidenceGrade === "A" ? "rgba(5,150,105,0.12)" : "rgba(124,58,237,0.1)",
                          color: intervention.evidenceGrade === "A" ? "var(--green)" : "var(--accent)",
                        }}
                      >
                        Grade {intervention.evidenceGrade}
                      </span>
                    </div>
                    <p className="text-[13px]" style={{ color: "var(--text2)", lineHeight: 1.55 }}>
                      {intervention.mechanism}
                    </p>
                    <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={12} color="var(--accent)" />
                        <span className="text-[11px] font-medium" style={{ color: "var(--text2)" }}>
                          {intervention.effectSize}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} color="var(--text3)" />
                        <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                          {intervention.timeToEffect}
                        </span>
                      </div>
                    </div>
                    {intervention.citations[0] && (
                      <div className="mt-2">
                        <div className="flex items-start gap-1.5">
                          <BookOpen size={11} color="var(--text3)" className="flex-shrink-0 mt-0.5" />
                          <p className="text-[11px]" style={{ color: "var(--text3)", lineHeight: 1.4 }}>
                            {GRADE_LABEL[intervention.evidenceGrade]} — {intervention.citations[0].authors} ({intervention.citations[0].year}): &ldquo;{intervention.citations[0].finding}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}
                    {intervention.contraindications && (
                      <p className="mt-2 text-[11px]" style={{ color: "var(--amber)" }}>
                        Note: {intervention.contraindications}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* If optimal */}
          {biomarker.status === "optimal" && (
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.2)" }}
            >
              <p className="text-[13px] font-semibold" style={{ color: "var(--green)" }}>This marker is in optimal range</p>
              <p className="text-[13px] mt-1" style={{ color: "var(--text2)", lineHeight: 1.55 }}>
                Keep doing what you&apos;re doing. The goal is to maintain this at your next panel.
              </p>
            </div>
          )}

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
