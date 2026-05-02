"use client";

import { useHealthStore } from "@/store/useHealthStore";
import Header from "@/components/layout/Header";
import ActionCard from "@/components/actions/ActionCard";
import { Loader2, Flame } from "lucide-react";

export default function ActionsPage() {
  const { actions, toggleAction, isGeneratingActions, streak } = useHealthStore();
  const completed = actions.filter(a => a.completed).length;
  const total     = actions.length;
  const pct       = total ? (completed / total) * 100 : 0;
  const allDone   = total > 0 && completed === total;

  return (
    <div className="page-content page-enter min-h-screen" style={{ background: "var(--bg)" }}>
      <Header />

      <div className="px-5 pt-5 space-y-5">

        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
              Today&apos;s Protocol
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text2)" }}>
              Evidence-based actions for your biomarkers
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Flame size={14} color="#F59E0B" />
              <span className="text-[13px] font-bold" style={{ color: "#F59E0B" }}>{streak}d</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[12px] font-medium" style={{ color: "var(--text3)" }}>
                {completed} of {total} complete
              </span>
              <span className="text-[12px] font-semibold" style={{ color: allDone ? "var(--green)" : "var(--accent)" }}>
                {Math.round(pct)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: allDone ? "var(--green)" : "var(--accent)",
                }}
              />
            </div>
          </div>
        )}

        {/* All done state */}
        {allDone && (
          <div className="rounded-2xl px-4 py-4"
            style={{ background: "rgba(5,150,105,0.07)", border: "1px solid rgba(5,150,105,0.2)" }}>
            <p className="text-[14px] font-semibold" style={{ color: "var(--green)" }}>
              Protocol complete for today
            </p>
            <p className="text-[13px] mt-1" style={{ color: "var(--text2)" }}>
              Consistency compounds. Your next panel will show the difference.
            </p>
          </div>
        )}

        {/* Generating state */}
        {isGeneratingActions && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl px-4 py-4"
              style={{ background: "var(--accent-lo)", border: "1px solid var(--accent-mid)" }}>
              <Loader2 size={14} className="animate-spin" color="var(--accent)" />
              <p className="text-[13px] font-medium" style={{ color: "var(--accent)" }}>
                Building your protocol from your lab results...
              </p>
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: "var(--border)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded-lg w-3/4" style={{ background: "var(--border)" }} />
                    <div className="h-3 rounded-lg w-1/2" style={{ background: "var(--surface2)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action cards */}
        {!isGeneratingActions && total > 0 && (
          <div className="space-y-3">
            {actions.map(action => (
              <ActionCard key={action.id} action={action} onToggle={toggleAction} />
            ))}
          </div>
        )}

        {/* Empty — no labs */}
        {!isGeneratingActions && total === 0 && (
          <div className="text-center py-16">
            <p className="text-[15px] font-semibold" style={{ color: "var(--text1)" }}>
              No protocol yet
            </p>
            <p className="text-[13px] mt-1" style={{ color: "var(--text2)" }}>
              Upload your lab results to generate your 5 daily actions
            </p>
          </div>
        )}

        {/* Disclaimer */}
        {total > 0 && !isGeneratingActions && (
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text3)" }}>
            These are evidence-based behavioral suggestions, not medical advice. Consult your physician before making significant changes.
          </p>
        )}

      </div>
    </div>
  );
}
