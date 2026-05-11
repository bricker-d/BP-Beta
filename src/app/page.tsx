"use client";

import { useEffect } from "react";
import { useHealthStore } from "@/store/useHealthStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, FlaskConical, MessageCircle,
  Watch, ChevronRight, Loader2, AlertTriangle, TrendingUp, Zap, X, BookOpen,
} from "lucide-react";
import { Biomarker } from "@/lib/types";
import NotificationBanner from "@/components/notifications/NotificationBanner";

// ── Category definitions ──────────────────────────────────────────────────────

const HEALTH_CATEGORIES = [
  { label: "Metabolic",      color: "#F59E0B", ids: ["glucose","hba1c","fastingInsulin","uricAcid"] },
  { label: "Cardiovascular", color: "#EF4444", ids: ["ldl","hdl","triglycerides","totalCholesterol","apoB","lpa","hscrp","homocysteine"] },
  { label: "Hormonal",       color: "#8B5CF6", ids: ["testosterone","freeTesto","shbg","estradiol","dheas","cortisol","igf1","progesterone"] },
  { label: "Vitality",       color: "#10B981", ids: ["vitaminD","vitaminB12","ferritin","magnesium","zinc","omega3Index","hemoglobin","folate"] },
];

function categoryScore(ids: string[], biomarkers: Biomarker[]): number | null {
  const w: Record<string, number> = { optimal: 100, borderline: 55, elevated: 20, low: 20 };
  const relevant = biomarkers.filter(b => ids.includes(b.id));
  if (!relevant.length) return null;
  return Math.round(relevant.reduce((s, b) => s + (w[b.status] ?? 50), 0) / relevant.length);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

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

function CategoryScores({ biomarkers }: { biomarkers: Biomarker[] }) {
  const scores = HEALTH_CATEGORIES.map(cat => ({
    ...cat,
    score: categoryScore(cat.ids, biomarkers),
  })).filter(c => c.score !== null);

  if (!scores.length) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text3)" }}>
        Health breakdown
      </p>
      <div className="grid grid-cols-2 gap-2">
        {scores.map(cat => {
          const s = cat.score!;
          const statusColor = s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ef4444";
          const r = 20, circ = 2 * Math.PI * r;
          const offset = circ - (s / 100) * circ;
          return (
            <Link key={cat.label} href="/lab-results">
              <div className="rounded-2xl px-3 py-3 flex items-center gap-3"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="relative flex-shrink-0" style={{ width: 48, height: 48 }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
                    <circle cx="24" cy="24" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
                    <circle cx="24" cy="24" r={r} fill="none"
                      stroke={cat.color} strokeWidth="4"
                      strokeDasharray={circ} strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="mono text-[12px] font-bold" style={{ color: "var(--text1)" }}>{s}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text1)" }}>{cat.label}</p>
                  <p className="text-[10px] font-medium" style={{ color: statusColor }}>
                    {s >= 80 ? "Optimal" : s >= 60 ? "Needs work" : "Action needed"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
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
          <circle cx="20" cy="20" r={r} fill="none" stroke="var(--accent-mid)" strokeWidth="4" />
          <circle cx="20" cy="20" r={r} fill="none" stroke="var(--accent)" strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(37,99,235,0.4))" }}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { intakeProfile, labPanel, actions, isGeneratingActions, tutorialDismissed, dismissTutorial, loadFromSupabase } = useHealthStore();

  // Only load from Supabase if there's no local profile already.
  // Calling it unconditionally overwrites the full intake with only the
  // subset of fields stored in DB, wiping medications, habits, etc.
  // Returning users on a fresh device hit login first, which calls
  // loadFromSupabase there — so the dashboard never needs to re-run it.
  useEffect(() => {
    if (!intakeProfile?.name) {
      loadFromSupabase();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!intakeProfile?.name) {
      // Check if there's a Supabase session before deciding where to send them
      import("@/lib/supabase-browser").then(({ createClient }) => {
        createClient().auth.getUser().then(({ data: { user } }) => {
          if (!user) {
            router.replace("/auth/login");
          } else {
            router.replace("/onboarding");
          }
        });
      });
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

        {/* Category health scores */}
        {labPanel && labPanel.biomarkers.length > 0 && (
          <CategoryScores biomarkers={labPanel.biomarkers} />
        )}

        {/* Notification banner — shown after first protocol is generated */}
        {actions.length > 0 && <NotificationBanner />}

        {/* Tutorial card */}
        {!tutorialDismissed && (
          <div className="rounded-2xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={14} color="var(--accent)" />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Get started</span>
              </div>
              <button onClick={dismissTutorial} className="w-6 h-6 flex items-center justify-center rounded-full" style={{ background: "var(--surface2)" }}>
                <X size={12} color="var(--text3)" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { n: "1", t: "Upload your labs",         s: "Tap Lab Results → Upload New. We parse every biomarker in seconds.", href: "/lab-results?upload=1" },
                { n: "2", t: "Review your protocol",     s: "5 daily actions ranked by clinical impact — tap each to see the evidence.", href: "/actions" },
                { n: "3", t: "Ask your coach anything",  s: "It knows your exact numbers. Ask why a marker is off or how to fix it.", href: "/coach" },
              ].map(item => (
                <Link key={item.n} href={item.href} onClick={dismissTutorial} className="flex items-start gap-3 active:opacity-60 transition-opacity">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold" style={{ background: "var(--accent-lo)", color: "var(--accent)" }}>{item.n}</span>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>{item.t}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)", lineHeight: 1.45 }}>{item.s}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="px-5 pt-5 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 1</p>
              <p className="text-[17px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
                Connect your labs to get your protocol
              </p>
              <p className="text-[13px] mt-1.5" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
                BioPrecision parses every biomarker and generates 3–4 daily actions tied to your specific out-of-range values.
              </p>
            </div>
            <div className="px-4 pb-4 space-y-2">
              <Link href="/lab-results?upload=1">
                <div className="btn-primary flex items-center gap-2">
                  <FlaskConical size={15} /> Upload labs (PDF, Quest, LabCorp)
                </div>
              </Link>
              <Link href="/lab-results">
                <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                  See a demo with 14 sample biomarkers
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Today's #1 action */}
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
            style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(37,99,235,0.05))", border: "1px solid rgba(37,99,235,0.18)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-lo)" }}
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

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl px-3 py-4 flex flex-col gap-2"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", opacity: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <Watch size={18} color="var(--text3)" />
              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--surface2)", color: "var(--text3)" }}>
                Coming soon
              </span>
            </div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>Wearable</p>
            <p className="text-[11px]" style={{ color: "var(--text3)" }}>Oura · WHOOP · Apple</p>
          </div>
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
