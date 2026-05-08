"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHealthStore } from "@/store/useHealthStore";
import { Biomarker } from "@/lib/types";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, MessageCircle, CheckSquare } from "lucide-react";

// ── Delta logic ───────────────────────────────────────────────────────────────

type DeltaResult = {
  id: string;
  name: string;
  direction: "improved" | "worsened" | "stable";
  previousStatus: string;
  currentStatus: string;
};

const STATUS_RANK: Record<string, number> = { optimal: 3, borderline: 2, low: 1, elevated: 1 };

function computeDeltas(prev: Biomarker[], curr: Biomarker[]): DeltaResult[] {
  const prevMap = new Map(prev.map(b => [b.id, b]));
  return curr
    .filter(b => prevMap.has(b.id))
    .map(b => {
      const p = prevMap.get(b.id)!;
      const prevRank = STATUS_RANK[p.status] ?? 1;
      const currRank = STATUS_RANK[b.status] ?? 1;
      const direction: DeltaResult["direction"] =
        currRank > prevRank ? "improved" :
        currRank < prevRank ? "worsened" : "stable";
      return { id: b.id, name: b.name, direction, previousStatus: p.status, currentStatus: b.status };
    });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DeltaPage() {
  const router = useRouter();
  const { labPanel, previousLabPanel } = useHealthStore();

  useEffect(() => {
    if (!labPanel || !previousLabPanel) router.replace("/lab-results");
  }, [labPanel, previousLabPanel, router]);

  if (!labPanel || !previousLabPanel) return null;

  const deltas = computeDeltas(previousLabPanel.biomarkers, labPanel.biomarkers);
  const improved = deltas.filter(d => d.direction === "improved");
  const worsened = deltas.filter(d => d.direction === "worsened");
  const stable   = deltas.filter(d => d.direction === "stable");

  const headline =
    improved.length > 0
      ? `${improved.length} marker${improved.length !== 1 ? "s" : ""} moved in the right direction.`
      : worsened.length > 0
      ? `${worsened.length} marker${worsened.length !== 1 ? "s" : ""} need attention.`
      : "Your markers are holding steady.";

  return (
    <div className="page-content page-enter min-h-screen pb-28" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 mb-6 text-[13px]"
          style={{ color: "var(--text3)" }}
        >
          <ArrowLeft size={15} /> Back to labs
        </button>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
          Panel comparison · {previousLabPanel.date} → {labPanel.date}
        </p>
        <h1 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
          Your new results are in.
        </h1>
        <p className="text-[15px] mt-2" style={{ color: "var(--text2)", lineHeight: 1.5 }}>
          {headline}
        </p>
      </div>

      <div className="px-5 space-y-5">

        {/* Hero stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { count: improved.length, label: "Improved", Icon: TrendingUp,  color: "var(--green)", bg: "rgba(5,150,105,0.08)" },
            { count: stable.length,   label: "Stable",   Icon: Minus,        color: "var(--text3)", bg: "var(--surface)"       },
            { count: worsened.length, label: "Watch",    Icon: TrendingDown, color: "#B83232",      bg: "rgba(184,50,50,0.07)" },
          ].map(({ count, label, Icon, color, bg }) => (
            <div key={label}
              className="rounded-2xl py-4 flex flex-col items-center gap-1.5"
              style={{ background: bg, border: `1px solid ${bg === "var(--surface)" ? "var(--border)" : "transparent"}` }}>
              <Icon size={16} color={color} />
              <span className="text-[26px] font-bold" style={{ color }}>{count}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Improved */}
        {improved.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "var(--green)" }}>
              Moving in the right direction
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {improved.map((d, i) => (
                <div key={d.id}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: i < improved.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(5,150,105,0.1)" }}>
                    <TrendingUp size={13} color="var(--green)" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>{d.name}</p>
                    <p className="text-[11px] mt-0.5 capitalize" style={{ color: "var(--text3)" }}>
                      {d.previousStatus} → {d.currentStatus}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: "rgba(5,150,105,0.1)", color: "var(--green)" }}>
                    {d.currentStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Worsened */}
        {worsened.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "#B83232" }}>
              Still working on these
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {worsened.map((d, i) => (
                <div key={d.id}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: i < worsened.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(184,50,50,0.08)" }}>
                    <TrendingDown size={13} color="#B83232" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>{d.name}</p>
                    <p className="text-[11px] mt-0.5 capitalize" style={{ color: "var(--text3)" }}>
                      {d.previousStatus} → {d.currentStatus}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: "rgba(184,50,50,0.08)", color: "#B83232" }}>
                    {d.currentStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stable */}
        {stable.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "var(--text3)" }}>
              Holding steady
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {stable.slice(0, 8).map((d, i) => (
                <div key={d.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < Math.min(stable.length, 8) - 1 ? "1px solid var(--border)" : "none" }}>
                  <Minus size={13} color="var(--text3)" className="flex-shrink-0 ml-1" />
                  <p className="text-[13px] flex-1" style={{ color: "var(--text2)" }}>{d.name}</p>
                  <span className="text-[11px] capitalize" style={{ color: "var(--text3)" }}>{d.currentStatus}</span>
                </div>
              ))}
              {stable.length > 8 && (
                <div className="px-4 py-2.5">
                  <p className="text-[12px]" style={{ color: "var(--text3)" }}>+{stable.length - 8} more holding steady</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coach CTA */}
        <Link href="/coach">
          <div className="rounded-2xl px-4 py-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(37,99,235,0.05))", border: "1px solid rgba(37,99,235,0.18)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-lo)" }}>
              <MessageCircle size={18} color="var(--accent)" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>
                Ask your coach about these results
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>
                I've reviewed both panels — ask me what drove the changes.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/actions">
          <div className="rounded-2xl px-4 py-4 flex items-center gap-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-lo)" }}>
              <CheckSquare size={18} color="var(--accent)" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>
                See your updated protocol
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>
                Actions recalculated based on your new results.
              </p>
            </div>
          </div>
        </Link>

        <p className="text-[11px] text-center pb-4" style={{ color: "var(--text3)" }}>
          Status changes are directional only. Consult your physician for clinical interpretation.
        </p>

      </div>
    </div>
  );
}
