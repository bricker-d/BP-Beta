"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Biomarker } from "@/lib/types";
import BiomarkerDetail from "./BiomarkerDetail";

interface BiomarkerListProps {
  biomarkers: Biomarker[];
}

const STATUS_CONFIG = {
  optimal:    { label: "Optimal",    color: "#059669", bg: "rgba(5,150,105,0.08)"   },
  elevated:   { label: "Elevated",   color: "#dc2626", bg: "rgba(220,38,38,0.08)"   },
  low:        { label: "Low",        color: "#dc2626", bg: "rgba(220,38,38,0.08)"   },
  borderline: { label: "Borderline", color: "#d97706", bg: "rgba(217,119,6,0.08)"   },
};

// Body system groupings — determines how biomarkers are organised
const SYSTEMS: { label: string; color: string; ids: string[] }[] = [
  { label: "Metabolic",            color: "#F59E0B", ids: ["glucose", "hba1c", "fastingInsulin", "uricAcid"] },
  { label: "Cardiovascular",       color: "#EF4444", ids: ["ldl", "hdl", "triglycerides", "totalCholesterol", "apoB", "lpa"] },
  { label: "Inflammation",         color: "#F97316", ids: ["hscrp", "homocysteine"] },
  { label: "Hormones",             color: "#8B5CF6", ids: ["testosterone", "freeTesto", "shbg", "estradiol", "progesterone", "dheas", "cortisol", "igf1"] },
  { label: "Thyroid",              color: "#06B6D4", ids: ["tsh", "freeT3", "reverseT3", "tpoAntibodies"] },
  { label: "Vitamins & Minerals",  color: "#10B981", ids: ["vitaminD", "vitaminB12", "folate", "vitaminB6", "ferritin", "magnesium", "zinc", "omega3Index"] },
  { label: "Liver & Kidney",       color: "#6366F1", ids: ["alt", "ast", "creatinine", "egfr"] },
  { label: "Blood",                color: "#EC4899", ids: ["hemoglobin"] },
];

function systemFor(id: string): { label: string; color: string } | null {
  for (const sys of SYSTEMS) {
    if (sys.ids.includes(id)) return sys;
  }
  return null;
}

function RangeBar({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const rangeMin = min * 0.5;
  const rangeMax = max * 1.5;
  const pct    = Math.min(100, Math.max(0, ((value - rangeMin) / (rangeMax - rangeMin)) * 100));
  const optMin = ((min - rangeMin) / (rangeMax - rangeMin)) * 100;
  const optMax = ((max - rangeMin) / (rangeMax - rangeMin)) * 100;

  return (
    <div className="relative w-full h-1.5 rounded-full mt-2 mb-1" style={{ background: "var(--border)" }}>
      <div className="absolute h-full rounded-full" style={{ left: `${optMin}%`, width: `${optMax - optMin}%`, background: "rgba(5,150,105,0.22)" }} />
      <div className="absolute w-3 h-3 rounded-full -top-[3px] -translate-x-1/2 border-2"
        style={{ left: `${pct}%`, background: color, borderColor: "var(--surface)" }} />
    </div>
  );
}

function BiomarkerCard({ b, onSelect }: { b: Biomarker; onSelect: () => void }) {
  const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.borderline;
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-2xl px-4 py-4 transition-all active:scale-[0.99]"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>{b.name}</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[16px] font-bold mono" style={{ color: cfg.color }}>{b.value}</span>
            <span className="text-[12px]" style={{ color: "var(--text3)" }}>{b.unit}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
          <ChevronRight size={14} color="var(--text3)" />
        </div>
      </div>
      <RangeBar value={b.value} min={b.optimalMin} max={b.optimalMax} color={cfg.color} />
      <div className="flex justify-between text-[11px]" style={{ color: "var(--text3)" }}>
        <span>Functional optimal: {b.optimalMin}–{b.optimalMax} {b.unit}</span>
        {b.status !== "optimal" && (
          <span style={{ color: "var(--accent)" }}>See protocol</span>
        )}
      </div>
    </button>
  );
}

export default function BiomarkerList({ biomarkers }: BiomarkerListProps) {
  const [selected, setSelected] = useState<Biomarker | null>(null);

  // Separate out-of-range markers to float them to a priority section
  const outOfRange = biomarkers.filter(b => b.status !== "optimal");
  const optimal    = biomarkers.filter(b => b.status === "optimal");

  // Group optimal markers by body system
  const grouped: { sys: { label: string; color: string }; markers: Biomarker[] }[] = [];
  for (const sys of SYSTEMS) {
    const sysMarkers = optimal.filter(b => sys.ids.includes(b.id));
    if (sysMarkers.length > 0) grouped.push({ sys, markers: sysMarkers });
  }
  // Catch any unrecognised IDs
  const ungrouped = optimal.filter(b => !systemFor(b.id));
  if (ungrouped.length > 0) grouped.push({ sys: { label: "Other", color: "var(--text3)" }, markers: ungrouped });

  return (
    <>
      {selected && (
        <BiomarkerDetail biomarker={selected} onClose={() => setSelected(null)} />
      )}

      <div className="space-y-6">
        {/* Functional medicine range explanation */}
        <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--accent)" }}>
            Ranges use <strong>functional medicine optimal thresholds</strong> — stricter than standard lab reference ranges. A marker flagged here may read "normal" on your lab report.
          </p>
        </div>

        {/* ── Priority: out-of-range ─────────────────────────────────── */}
        {outOfRange.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#dc2626" }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#dc2626" }}>
                {outOfRange.length} marker{outOfRange.length !== 1 ? "s" : ""} need attention
              </p>
            </div>
            <div className="space-y-2">
              {outOfRange.map(b => (
                <BiomarkerCard key={b.id} b={b} onSelect={() => setSelected(b)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Optimal markers grouped by body system ─────────────────── */}
        {grouped.map(({ sys, markers }) => (
          <div key={sys.label}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sys.color }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                {sys.label}
              </p>
            </div>
            <div className="space-y-2">
              {markers.map(b => (
                <BiomarkerCard key={b.id} b={b} onSelect={() => setSelected(b)} />
              ))}
            </div>
          </div>
        ))}

      </div>
    </>
  );
}
