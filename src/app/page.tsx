"use client";

import { useHealthStore } from "@/store/useHealthStore";
import Header from "@/components/layout/Header";
import Link from "next/link";
import { CheckCircle2, Circle, FlaskConical, MessageCircle, Watch, ChevronRight, Loader2, AlertTriangle, TrendingUp } from "lucide-react";

function getGreeting(name?: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${time}, ${name.split(" ")[0]}` : time;
}

function HealthScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="text-center">
        <span className="text-3xl font-extrabold text-gray-900">{score}</span>
        <span className="text-xs text-gray-400 block mt-0.5">Health Score</span>
      </div>
    </div>
  );
}

function computeScore(biomarkers: { status: string }[]): number {
  if (!biomarkers.length) return 0;
  const weights: Record<string, number> = { optimal: 100, borderline: 55, elevated: 20, low: 20 };
  const total = biomarkers.reduce((sum, b) => sum + (weights[b.status] ?? 50), 0);
  return Math.round(total / biomarkers.length);
}

export default function DashboardPage() {
  const { user, intakeProfile, labPanel, actions, isGeneratingActions } = useHealthStore();

  const name = intakeProfile?.name || user.name;
  const completed = actions.filter(a => a.completed).length;
  const total = actions.length;
  const score = labPanel ? computeScore(labPanel.biomarkers) : null;
  const outOfRange = labPanel ? labPanel.biomarkers.filter(b => b.status !== "optimal") : [];

  // ── No labs state ──────────────────────────────────────────────────────────
  if (!labPanel) {
    return (
      <div className="page-content bg-background min-h-screen">
        <Header />
        <div className="px-5 pt-8 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center">
            <FlaskConical size={36} className="text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Welcome to BioPrecision</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
              Upload your lab results to get evidence-based daily actions personalized to your biomarkers.
            </p>
          </div>
          <Link
            href="/lab-results"
            className="w-full gradient-btn text-white font-semibold text-[15px] py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            <FlaskConical size={17} />
            Upload Lab Results
          </Link>
          <Link href="/coach" className="text-purple-500 font-semibold text-sm">
            Or ask the AI coach a question →
          </Link>
        </div>
      </div>
    );
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="page-content bg-background min-h-screen">
      <Header />

      <div className="px-5 pt-5 pb-24 space-y-5">

        {/* Greeting + score */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900 leading-tight">
              {getGreeting(name)}
            </h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          {score !== null && <HealthScoreRing score={score} />}
        </div>

        {/* Alert strip if markers need attention */}
        {outOfRange.length > 0 && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
            <p className="text-[13px] text-amber-800 font-medium">
              {outOfRange.length} biomarker{outOfRange.length !== 1 ? "s" : ""} need attention —{" "}
              <Link href="/lab-results" className="underline font-semibold">view results</Link>
            </p>
          </div>
        )}

        {/* Today's Protocol */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-50">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">Today&apos;s Protocol</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">Evidence-based actions from your labs</p>
            </div>
            {total > 0 && (
              <span className="text-[13px] font-semibold text-purple-600">
                {completed}/{total} done
              </span>
            )}
          </div>

          {isGeneratingActions ? (
            <div className="flex items-center gap-3 px-4 py-6 text-gray-400">
              <Loader2 size={16} className="animate-spin text-purple-400" />
              <span className="text-[13px]">Generating your personalized protocol...</span>
            </div>
          ) : actions.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[13px] text-gray-400">No actions yet</p>
              <Link href="/lab-results" className="text-purple-500 font-semibold text-[13px] mt-1 block">
                Upload labs to generate your protocol
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {actions.slice(0, 5).map((action) => (
                <ActionRow key={action.id} action={action} />
              ))}
            </div>
          )}

          {actions.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-50">
              <Link href="/actions" className="text-[13px] font-semibold text-purple-500 flex items-center gap-1">
                View full protocol <ChevronRight size={13} />
              </Link>
            </div>
          )}
        </div>

        {/* AI Coach CTA */}
        <Link href="/coach" className="block">
          <div className="gradient-btn rounded-2xl px-4 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-[14px]">Ask your AI Health Coach</p>
              <p className="text-white/70 text-[12px] mt-0.5">
                {labPanel
                  ? `${outOfRange.length} markers analyzed — ask me anything`
                  : "Get personalized health guidance"}
              </p>
            </div>
            <ChevronRight size={16} className="text-white/70" />
          </div>
        </Link>

        {/* Wearable integration */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <Watch size={18} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-gray-800">Connect Wearable</p>
            <p className="text-[12px] text-gray-400 mt-0.5">Oura · WHOOP · Apple Health</p>
          </div>
          <Link
            href="/connect"
            className="text-[12px] font-semibold text-purple-500 bg-purple-50 px-3 py-1.5 rounded-lg"
          >
            Connect
          </Link>
        </div>

        {/* Labs shortcut */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp size={17} className="text-purple-500" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-800">Lab Results</p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {labPanel.biomarkers.length} biomarkers · {labPanel.source}
              </p>
            </div>
          </div>
          <Link href="/lab-results" className="text-[12px] font-semibold text-purple-500 flex items-center gap-0.5">
            View <ChevronRight size={13} />
          </Link>
        </div>

      </div>
    </div>
  );
}

function ActionRow({ action }: { action: { id: string; title: string; description: string; completed: boolean; category: string; biomarkerTarget?: string } }) {
  const { toggleAction } = useHealthStore();
  return (
    <button
      onClick={() => toggleAction(action.id)}
      className="w-full flex items-start gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors"
    >
      <div className="mt-0.5 flex-shrink-0">
        {action.completed
          ? <CheckCircle2 size={20} className="text-green-500" />
          : <Circle size={20} className="text-gray-300" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-semibold leading-tight ${action.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
          {action.title}
        </p>
        {action.biomarkerTarget && (
          <p className="text-[11px] text-purple-500 font-medium mt-0.5">{action.biomarkerTarget}</p>
        )}
        <p className="text-[12px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{action.description}</p>
      </div>
    </button>
  );
}
