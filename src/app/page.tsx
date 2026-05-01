"use client";

import { useEffect } from "react";
import { useHealthStore } from "@/store/useHealthStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, FlaskConical, MessageCircle,
  Watch, ChevronRight, Loader2, AlertTriangle, TrendingUp, Zap,
} from "lucide-react";

function getGreeting(name?: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${time}, ${name.split(" ")[0]}` : time;
}

function computeScore(biomarkers: { status: string }[]): number {
  if (!biomarkers.length) return 0;
  const w: Record<string, number> = { optimal: 100, borderline: 55, elevated: 20, low: 20 };
  return Math.round(biomarkers.reduce((s, b) => s + (w[b.status] ?? 50), 0) / biomarkers.length);
}

function ScoreRing({ score }: { score: number }) {
  const r = 52, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Optimal" : score >= 60 ? "Needs work" : "Action needed";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="text-center">
          <span className="mono text-3xl font-bold" style={{ color: "var(--text1)" }}>{score}</span>
          <span className="block text-[10px]" style={{ color: "var(--text2)" }}>/ 100</span>
        </div>
      </div>
      <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function CompletionRings({ done, total }: { done: number; total: number }) {
  if (!total) return null;
  const pct = done / total;
  const r = 18, circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10 flex items-center justify-center">
        <svg className="-rotate-90" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="4" />
          <circle cx="20" cy="20" r={r} fill="none" stroke="#a855f7" strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(168,85,247,0.6))" }}
          />
        </svg>
        <span className="absolute mono text-[10px] font-bold" style={{ color: "var(--text1)" }}>{done}</span>
      </div>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>{done}/{total} done</p>
        <p className="text-[11px]" style={{ color: "var(--text2)" }}>Today&apos;s protocol</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { intakeProfile, labPanel, actions, isGeneratingActions } = useHealthStore();

  // Redirect to onboarding if no name set
  useEffect(() => {
    if (!intakeProfile?.name) {
      router.replace("/onboarding");
    }
  }, [intakeProfile, router]);

  if (!intakeProfile?.name) return null;

  const name = intakeProfile.name;
  const done = actions.filter(a => a.completed).length;
  const total = actions.length;
  const score = labPanel ? computeScore(labPanel.biomarkers) : null;
  const outOfRange = labPanel ? labPanel.biomarkers.filter(b => b.status !== "optimal") : [];
  const topAction = actions.find(a => !a.completed);

  return (
    <div className="page-content page-enter min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-12 pb-6 space-y-5">

        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px]" style={{ color: "var(--text2)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <h1 className="text-[24px] font-bold mt-0.5" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
              {getGreeting(name)}
            </h1>
          </div>
          {score !== null && <ScoreRing score={score} />}
        </div>

        {/* Alert strip */}
        {outOfRange.length > 0 && (
          <div
            className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            <AlertTriangle size={14} color="#f59e0b" />
            <p className="text-[13px] font-medium" style={{ color: "#f59e0b" }}>
              {outOfRange.length} marker{outOfRange.length !== 1 ? "s" : ""} need attention
            </p>
            <Link href="/lab-results" className="ml-auto text-[12px] font-semibold" style={{ color: "#f59e0b" }}>
              View →
            </Link>
          </div>
        )}

        {/* No labs CTA */}
        {!labPanel && !isGeneratingActions && (
          <Link href="/lab-results">
            <div
              className="rounded-2xl px-4 py-5 flex items-center gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(168,85,247,0.15)" }}
              >
                <FlaskConical size={22} color="var(--accent)" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>Upload your labs</p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>
                  Unlock your personalized daily protocol
                </p>
              </div>
              <ChevronRight size={16} color="var(--text3)" />
            </div>
          </Link>
        )}

        {/* Today's #1 action — hero card */}
        {(topAction || isGeneratingActions) && (
          <div
            className="rounded-2xl px-4 py-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={14} color="var(--accent)" />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                  Your #1 right now
                </span>
              </div>
              <CompletionRings done={done} total={total} />
            </div>

            {isGeneratingActions ? (
              <div className="flex items-center gap-2" style={{ color: "var(--text2)" }}>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[13px]">Building your protocol from your labs...</span>
              </div>
            ) : topAction ? (
              <div>
                <p className="text-[16px] font-semibold" style={{ color: "var(--text1)", lineHeight: 1.4 }}>
                  {topAction.title}
                </p>
                {topAction.biomarkerTarget && (
                  <p className="text-[11px] mt-1 font-medium" style={{ color: "var(--accent)" }}>
                    {topAction.biomarkerTarget}
                  </p>
                )}
                <p className="text-[13px] mt-2" style={{ color: "var(--text2)", lineHeight: 1.5 }}>
                  {topAction.description}
                </p>
                <Link href="/actions" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
                  See full protocol <ChevronRight size={13} />
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {/* Protocol preview */}
        {actions.length > 1 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>Today&apos;s protocol</p>
              <Link href="/actions" className="text-[12px] font-medium" style={{ color: "var(--accent)" }}>
                View all →
              </Link>
            </div>
            {actions.slice(0, 4).map((a, i) => (
              <ActionRow key={a.id} action={a} showDivider={i < Math.min(actions.length, 4) - 1} />
            ))}
          </div>
        )}

        {/* Coach CTA */}
        <Link href="/coach">
          <div
            className="rounded-2xl px-4 py-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, rgba(147,51,234,0.25), rgba(99,102,241,0.25))", border: "1px solid rgba(168,85,247,0.3)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(168,85,247,0.2)" }}
            >
              <MessageCircle size={18} color="var(--accent)" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>
                Ask your health coach
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>
                {labPanel ? `${outOfRange.length} markers analyzed — ask me anything` : "Get guidance based on your goals"}
              </p>
            </div>
            <ChevronRight size={15} color="var(--text3)" />
          </div>
        </Link>

        {/* Bottom row: Wearable + Labs */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/connect">
            <div
              className="rounded-2xl px-3 py-4 flex flex-col gap-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Watch size={18} color="var(--text3)" />
              <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>Wearable</p>
              <p className="text-[11px]" style={{ color: "var(--text3)" }}>Oura · WHOOP · Apple</p>
            </div>
          </Link>
          <Link href="/lab-results">
            <div
              className="rounded-2xl px-3 py-4 flex flex-col gap-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <TrendingUp size={18} color="var(--text3)" />
              <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>Lab results</p>
              <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                {labPanel ? `${labPanel.biomarkers.length} biomarkers` : "Not uploaded"}
              </p>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}

function ActionRow({ action, showDivider }: {
  action: { id: string; title: string; completed: boolean; biomarkerTarget?: string };
  showDivider: boolean;
}) {
  const { toggleAction } = useHealthStore();
  return (
    <>
      <button
        onClick={() => toggleAction(action.id)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity"
        style={{ opacity: action.completed ? 0.45 : 1 }}
      >
        {action.completed
          ? <CheckCircle2 size={18} color="var(--green)" />
          : <Circle size={18} color="var(--text3)" />
        }
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-medium truncate"
            style={{ color: "var(--text1)", textDecoration: action.completed ? "line-through" : "none" }}
          >
            {action.title}
          </p>
          {action.biomarkerTarget && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--accent)" }}>{action.biomarkerTarget}</p>
          )}
        </div>
      </button>
      {showDivider && <div style={{ height: 1, background: "var(--border)", marginLeft: 52 }} />}
    </>
  );
}
