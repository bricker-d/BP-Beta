"use client";

import { Biomarker } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/biomarkers";
import { cn } from "@/lib/utils";

interface BiomarkerListProps {
  biomarkers: Biomarker[];
}

function StatusBadge({ status }: { status: Biomarker["status"] }) {
  const { dot, label } = STATUS_COLORS[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
      <span className={cn(
        "text-[11px] font-semibold",
        status === "optimal" ? "text-green-500" :
        status === "elevated" || status === "low" ? "text-red-500" : "text-amber-500"
      )}>
        {label}
      </span>
    </div>
  );
}

function RangeBar({ value, min, max }: { value: number; min: number; max: number }) {
  // Position the value dot on the range bar
  // We show a range from 0.5× min to 1.5× max
  const rangeMin = min * 0.5;
  const rangeMax = max * 1.5;
  const pct = Math.min(100, Math.max(0, ((value - rangeMin) / (rangeMax - rangeMin)) * 100));
  const optMin = ((min - rangeMin) / (rangeMax - rangeMin)) * 100;
  const optMax = ((max - rangeMin) / (rangeMax - rangeMin)) * 100;

  return (
    <div className="relative w-full h-1.5 bg-gray-100 rounded-full mt-2 mb-1">
      {/* Optimal zone */}
      <div
        className="absolute h-full bg-green-200 rounded-full"
        style={{ left: `${optMin}%`, width: `${optMax - optMin}%` }}
      />
      {/* Value indicator */}
      <div
        className="absolute w-3 h-3 rounded-full bg-text-primary border-2 border-white shadow-sm -top-[3px] -translate-x-1/2"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

export default function BiomarkerList({ biomarkers }: BiomarkerListProps) {
  return (
    <div className="space-y-3">
      {biomarkers.map((b) => (
        <div key={b.id} className="bg-white rounded-2xl p-4 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[14px] font-semibold text-text-primary">{b.name}</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[22px] font-bold text-text-primary">{b.value}</span>
                <span className="text-[12px] text-text-muted">{b.unit}</span>
              </div>
            </div>
            <StatusBadge status={b.status} />
          </div>

          <RangeBar value={b.value} min={b.optimalMin} max={b.optimalMax} />

          <div className="flex justify-between text-[11px] text-text-muted">
            <span>Optimal: {b.optimalMin}–{b.optimalMax} {b.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
