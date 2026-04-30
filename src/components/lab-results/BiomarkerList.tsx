"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Biomarker } from "@/lib/types";
import { cn } from "@/lib/utils";
import BiomarkerDetail from "./BiomarkerDetail";

interface BiomarkerListProps {
  biomarkers: Biomarker[];
}

const STATUS_CONFIG = {
  optimal:    { dot: "bg-green-500",  label: "Optimal",    color: "#059669" },
  elevated:   { dot: "bg-red-500",    label: "Elevated",   color: "#dc2626" },
  low:        { dot: "bg-red-500",    label: "Low",        color: "#dc2626" },
  borderline: { dot: "bg-amber-500",  label: "Borderline", color: "#d97706" },
};

function RangeBar({ value, min, max }: { value: number; min: number; max: number }) {
  const rangeMin = min * 0.5;
  const rangeMax = max * 1.5;
  const pct    = Math.min(100, Math.max(0, ((value - rangeMin) / (rangeMax - rangeMin)) * 100));
  const optMin = ((min - rangeMin) / (rangeMax - rangeMin)) * 100;
  const optMax = ((max - rangeMin) / (rangeMax - rangeMin)) * 100;

  return (
    <div className="relative w-full h-1.5 rounded-full mt-2 mb-1" style={{ background: "var(--border)" }}>
      <div
        className="absolute h-full rounded-full"
        style={{ left: `${optMin}%`, width: `${optMax - optMin}%`, background: "rgba(5,150,105,0.25)" }}
      />
      <div
        className="absolute w-3 h-3 rounded-full -top-[3px] -translate-x-1/2 border-2"
        style={{ left: `${pct}%`, background: "var(--text1)", borderColor: "var(--surface)" }}
      />
    </div>
  );
}

export default function BiomarkerList({ biomarkers }: BiomarkerListProps) {
  const [selected, setSelected] = useState<Biomarker | null>(null);

  // Group: out-of-range first, then optimal
  const outOfRange = biomarkers.filter(b => b.status !== "optimal");
  const optimal    = biomarkers.filter(b => b.status === "optimal");
  const ordered    = [...outOfRange, ...optimal];

  return (
    <>
      {selected && (
        <BiomarkerDetail biomarker={selected} onClose={() => setSelected(null)} />
      )}

      <div className="space-y-2">
        {outOfRange.length > 0 && (
          <p className="text-[11px] font-semibold uppercase tracking-wider px-1 pb-1" style={{ color: "var(--red)" }}>
            {outOfRange.length} marker{outOfRange.length !== 1 ? "s" : ""} need attention
          </p>
        )}

        {ordered.map((b) => {
          const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.borderline;
          return (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className="w-full text-left rounded-2xl p-4 transition-opacity active:opacity-70"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>{b.name}</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-[22px] font-bold mono" style={{ color: cfg.color }}>{b.value}</span>
                    <span className="text-[12px]" style={{ color: "var(--text3)" }}>{b.unit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />
                    <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <ChevronRight size={14} color="var(--text3)" />
                </div>
              </div>

              <RangeBar value={b.value} min={b.optimalMin} max={b.optimalMax} />

              <div className="flex justify-between text-[11px]" style={{ color: "var(--text3)" }}>
                <span>Optimal: {b.optimalMin}–{b.optimalMax} {b.unit}</span>
                {b.status !== "optimal" && (
                  <span style={{ color: "var(--accent)" }}>Tap to see how to fix this</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
