"use client";

import { useMemo } from "react";
import { LabPanel } from "@/lib/types";
import { BIOMARKER_LIBRARY } from "@/lib/clinicalLibrary";

interface BiomarkerTrendsProps {
  labHistory: LabPanel[];
}

interface TrendPoint {
  date: string;
  value: number;
  status: string;
}

interface BiomarkerTrend {
  id: string;
  name: string;
  unit: string;
  optimalMin: number;
  optimalMax: number;
  points: TrendPoint[];
  latestStatus: string;
  direction: "improving" | "worsening" | "stable" | "unknown";
  change: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  optimal:    "#16a34a",
  borderline: "#d97706",
  elevated:   "#dc2626",
  low:        "#2563eb",
};

function SparkLine({
  points,
  optimalMin,
  optimalMax,
  width = 120,
  height = 40,
}: {
  points: TrendPoint[];
  optimalMin: number;
  optimalMax: number;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;

  const values = points.map(p => p.value);
  const allValues = [...values, optimalMin, optimalMax];
  const min = Math.min(...allValues) * 0.85;
  const max = Math.max(...allValues) * 1.15;
  const range = max - min || 1;

  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  function x(i: number) { return pad + (i / (points.length - 1)) * w; }
  function y(v: number) { return pad + (1 - (v - min) / range) * h; }

  // Optimal zone band
  const optY1 = y(optimalMax);
  const optY2 = y(optimalMin);

  // Polyline path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      {/* Optimal zone */}
      <rect
        x={pad}
        y={Math.min(optY1, optY2)}
        width={w}
        height={Math.abs(optY2 - optY1)}
        fill="#dcfce7"
        opacity={0.6}
      />
      {/* Trend line */}
      <path d={linePath} stroke="#9333ea" strokeWidth={2} fill="none" strokeLinejoin="round" />
      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r={3}
          fill={STATUS_COLORS[p.status] ?? "#9333ea"}
          stroke="white"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}

export default function BiomarkerTrends({ labHistory }: BiomarkerTrendsProps) {
  const trends = useMemo<BiomarkerTrend[]>(() => {
    if (labHistory.length < 2) return [];

    // Collect all unique biomarker IDs across all panels
    const biomarkerIds = new Set<string>();
    labHistory.forEach(panel => panel.biomarkers.forEach(b => biomarkerIds.add(b.id)));

    const result: BiomarkerTrend[] = [];

    for (const id of biomarkerIds) {
      const points: TrendPoint[] = [];

      for (const panel of labHistory) {
        const b = panel.biomarkers.find(b => b.id === id);
        if (!b) continue;
        points.push({
          date: panel.date ?? "",
          value: b.value,
          status: b.status,
        });
      }

      if (points.length < 2) continue;

      const meta = BIOMARKER_LIBRARY[id];
      const optimalMin = meta?.optimalMin ?? 0;
      const optimalMax = meta?.optimalMax ?? 0;
      const name = meta?.name ?? id;
      const unit = points[0] ? labHistory[0]?.biomarkers.find(b => b.id === id)?.unit ?? "" : "";

      const first = points[0].value;
      const last = points[points.length - 1].value;
      const change = parseFloat((last - first).toFixed(2));

      // Direction: is the latest value closer to optimal than the first?
      const optMid = (optimalMin + optimalMax) / 2;
      const firstDist = Math.abs(first - optMid);
      const lastDist = Math.abs(last - optMid);
      const direction: BiomarkerTrend["direction"] =
        Math.abs(change) < 0.5 ? "stable" :
        lastDist < firstDist ? "improving" : "worsening";

      result.push({
        id,
        name,
        unit,
        optimalMin,
        optimalMax,
        points,
        latestStatus: points[points.length - 1].status,
        direction,
        change,
      });
    }

    // Sort: worsening first, then improving, then stable
    return result.sort((a, b) => {
      const order = { worsening: 0, stable: 1, improving: 2, unknown: 3 };
      return order[a.direction] - order[b.direction];
    });
  }, [labHistory]);

  if (labHistory.length < 2) return null;

  const worsening = trends.filter(t => t.direction === "worsening");
  const improving = trends.filter(t => t.direction === "improving");
  const stable    = trends.filter(t => t.direction === "stable");

  function TrendCard({ trend }: { trend: BiomarkerTrend }) {
    const latest = trend.points[trend.points.length - 1];
    const changeStr = trend.change === null ? "" :
      (trend.change > 0 ? "+" : "") + trend.change + " " + trend.unit;
    const dirIcon = trend.direction === "improving" ? "↑ Improving" :
      trend.direction === "worsening" ? "↓ Needs attention" : "→ Stable";
    const dirColor = trend.direction === "improving" ? "#16a34a" :
      trend.direction === "worsening" ? "#dc2626" : "#6b7280";

    return (
      <div className="bg-white rounded-2xl p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[14px] font-bold text-text-primary">{trend.name}</p>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: STATUS_COLORS[trend.latestStatus] + "20",
                  color: STATUS_COLORS[trend.latestStatus],
                }}
              >
                {trend.latestStatus}
              </span>
            </div>
            <p className="text-[22px] font-extrabold text-text-primary mt-0.5">
              {latest.value}
              <span className="text-[13px] font-normal text-text-muted ml-1">{trend.unit}</span>
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[12px] font-semibold" style={{ color: dirColor }}>
                {dirIcon}
              </span>
              {changeStr && (
                <span className="text-[12px] text-text-muted">{changeStr} from first panel</span>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Optimal: {trend.optimalMin}–{trend.optimalMax} {trend.unit}
            </p>
          </div>
          <SparkLine
            points={trend.points}
            optimalMin={trend.optimalMin}
            optimalMax={trend.optimalMax}
          />
        </div>
        {trend.points.length >= 2 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {trend.points.map((p, i) => (
              <div key={i} className="flex-shrink-0 text-center">
                <div
                  className="text-[11px] font-semibold"
                  style={{ color: STATUS_COLORS[p.status] }}
                >
                  {p.value}
                </div>
                <div className="text-[10px] text-text-muted">
                  {p.date ? new Date(p.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : `Panel ${i + 1}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-extrabold text-text-primary mb-1">Biomarker Trends</h2>
        <p className="text-[13px] text-text-secondary">
          Tracking {trends.length} biomarkers across {labHistory.length} panels
        </p>
      </div>

      {worsening.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-red-600 mb-3">
            ⚠️ Trending the wrong way ({worsening.length})
          </p>
          <div className="space-y-3">
            {worsening.map(t => <TrendCard key={t.id} trend={t} />)}
          </div>
        </div>
      )}

      {improving.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-green-600 mb-3">
            ✓ Improving ({improving.length})
          </p>
          <div className="space-y-3">
            {improving.map(t => <TrendCard key={t.id} trend={t} />)}
          </div>
        </div>
      )}

      {stable.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-text-muted mb-3">
            Stable ({stable.length})
          </p>
          <div className="space-y-3">
            {stable.map(t => <TrendCard key={t.id} trend={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}
