"use client";

import { useMemo } from "react";
import { LabPanel } from "@/lib/types";
import { BIOMARKER_LIBRARY } from "@/lib/clinicalLibrary";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BiomarkerTrendsProps {
  labHistory: LabPanel[];
}

interface TrendPoint { date: string; value: number; status: string; }
interface BiomarkerTrend {
  id: string; name: string; unit: string;
  optimalMin: number; optimalMax: number;
  points: TrendPoint[];
  latestStatus: string;
  direction: "improving" | "worsening" | "stable";
  change: number | null;
}

const STATUS_COLOR: Record<string, string> = {
  optimal: "#059669", borderline: "#D97706", elevated: "#DC2626", low: "#DC2626",
};

function GradientSparkline({
  points, optimalMin, optimalMax, lineColor, id,
}: {
  points: TrendPoint[]; optimalMin: number; optimalMax: number; lineColor: string; id: string;
}) {
  if (points.length < 2) return null;

  const W = 130, H = 52, PAD = 6;
  const values  = points.map(p => p.value);
  const allVals = [...values, optimalMin, optimalMax];
  const lo  = Math.min(...allVals) * 0.88;
  const hi  = Math.max(...allVals) * 1.12;
  const rng = hi - lo || 1;
  const w   = W - PAD * 2;
  const h   = H - PAD * 2;

  const px = (i: number) => PAD + (i / (points.length - 1)) * w;
  const py = (v: number) => PAD + (1 - (v - lo) / rng) * h;

  const optY1 = py(optimalMax);
  const optY2 = py(optimalMin);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(p.value).toFixed(1)}`).join(" ");
  // Area fill: close path to bottom
  const areaPath = linePath + ` L${px(points.length - 1).toFixed(1)},${H} L${PAD},${H} Z`;

  const gradId = `grad-${id}`;

  return (
    <svg width={W} height={H} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Optimal zone */}
      <rect
        x={PAD} y={Math.min(optY1, optY2)}
        width={w} height={Math.abs(optY2 - optY1)}
        fill="rgba(5,150,105,0.1)" rx="2"
      />

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <path d={linePath} stroke={lineColor} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i} cx={px(i)} cy={py(p.value)} r={3.5}
          fill={STATUS_COLOR[p.status] ?? lineColor}
          stroke="var(--surface)" strokeWidth="2"
        />
      ))}
    </svg>
  );
}

function TrendCard({ t }: { t: BiomarkerTrend }) {
  const latest = t.points[t.points.length - 1];
  const statusColor = STATUS_COLOR[t.latestStatus] ?? "var(--text3)";
  const lineColor = t.direction === "improving" ? "#059669" : t.direction === "worsening" ? "#DC2626" : "var(--accent)";

  const DirIcon = t.direction === "improving" ? TrendingUp : t.direction === "worsening" ? TrendingDown : Minus;
  const dirColor = t.direction === "improving" ? "#059669" : t.direction === "worsening" ? "#DC2626" : "var(--text3)";
  const dirLabel = t.direction === "improving" ? "Improving" : t.direction === "worsening" ? "Needs attention" : "Stable";

  const changeStr = t.change !== null
    ? `${t.change > 0 ? "+" : ""}${t.change} ${t.unit} from first panel`
    : "";

  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>{t.name}</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: statusColor + "18", color: statusColor }}>
              {t.latestStatus}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="mono text-[22px] font-bold" style={{ color: statusColor }}>{latest.value}</span>
            <span className="text-[12px]" style={{ color: "var(--text3)" }}>{t.unit}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <DirIcon size={12} color={dirColor} />
            <span className="text-[12px] font-semibold" style={{ color: dirColor }}>{dirLabel}</span>
          </div>
          {changeStr && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text3)" }}>{changeStr}</p>
          )}
          <p className="text-[11px] mt-1" style={{ color: "var(--text3)" }}>
            Optimal: {t.optimalMin}–{t.optimalMax} {t.unit}
          </p>
        </div>

        <GradientSparkline
          points={t.points} optimalMin={t.optimalMin} optimalMax={t.optimalMax}
          lineColor={lineColor} id={t.id}
        />
      </div>

      {/* Date labels */}
      <div className="flex justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        {t.points.map((p, i) => (
          <div key={i} className="text-center">
            <p className="mono text-[11px] font-semibold" style={{ color: STATUS_COLOR[p.status] ?? "var(--text2)" }}>
              {p.value}
            </p>
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              {p.date ? new Date(p.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : `#${i + 1}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BiomarkerTrends({ labHistory }: BiomarkerTrendsProps) {
  const trends = useMemo<BiomarkerTrend[]>(() => {
    if (labHistory.length < 2) return [];

    const ids = new Set<string>();
    labHistory.forEach(p => p.biomarkers.forEach(b => ids.add(b.id)));

    const result: BiomarkerTrend[] = [];

    for (const id of ids) {
      const points: TrendPoint[] = [];
      for (const panel of labHistory) {
        const b = panel.biomarkers.find(b => b.id === id);
        if (b) points.push({ date: panel.date ?? "", value: b.value, status: b.status });
      }
      if (points.length < 2) continue;

      const meta = BIOMARKER_LIBRARY[id];
      const optimalMin = meta?.optimalMin ?? 0;
      const optimalMax = meta?.optimalMax ?? 0;
      const name = meta?.name ?? id;
      const unit = labHistory[0]?.biomarkers.find(b => b.id === id)?.unit ?? "";

      const first = points[0].value;
      const last  = points[points.length - 1].value;
      const change = parseFloat((last - first).toFixed(2));
      const optMid = (optimalMin + optimalMax) / 2;
      const direction: BiomarkerTrend["direction"] =
        Math.abs(change) < 0.5 ? "stable"
        : Math.abs(last - optMid) < Math.abs(first - optMid) ? "improving"
        : "worsening";

      result.push({ id, name, unit, optimalMin, optimalMax, points, latestStatus: points[points.length - 1].status, direction, change });
    }

    return result.sort((a, b) => {
      const o = { worsening: 0, stable: 1, improving: 2 };
      return o[a.direction] - o[b.direction];
    });
  }, [labHistory]);

  if (labHistory.length < 2) return null;

  const worsening = trends.filter(t => t.direction === "worsening");
  const improving = trends.filter(t => t.direction === "improving");
  const stable    = trends.filter(t => t.direction === "stable");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
          Biomarker Trends
        </h2>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--text2)" }}>
          {trends.length} markers tracked across {labHistory.length} panels
        </p>
      </div>

      {worsening.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ background: "#DC2626" }} />
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#DC2626" }}>
              Trending wrong way ({worsening.length})
            </p>
          </div>
          <div className="space-y-3">
            {worsening.map(t => <TrendCard key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {improving.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#059669" }}>
              Improving ({improving.length})
            </p>
          </div>
          <div className="space-y-3">
            {improving.map(t => <TrendCard key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {stable.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--text3)" }} />
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
              Stable ({stable.length})
            </p>
          </div>
          <div className="space-y-3">
            {stable.map(t => <TrendCard key={t.id} t={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}
