"use client";

import { useEffect, useState } from "react";
import { useHealthStore } from "@/store/useHealthStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, FlaskConical, MessageCircle,
  ChevronRight, Loader2, AlertTriangle, TrendingUp, Zap, X, BookOpen, Send,
} from "lucide-react";
import { Biomarker } from "@/lib/types";
import NotificationBanner from "@/components/notifications/NotificationBanner";
import BiometricLock from "@/components/BiometricLock";
import {
  isBiometricEnrolled,
  isBiometricSessionActive,
  setBiometricSessionActive,
} from "@/lib/webauthn";

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
          <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
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
    ...cat, score: categoryScore(cat.ids, biomarkers),
  })).filter(c => c.score !== null);
  if (!scores.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text3)" }}>Health breakdown</p>
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
                    <circle cx="24" cy="24" r={r} fill="none" stroke={cat.color} strokeWidth="4"
                      strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s ease" }} />
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

// ── Care team message widget ──────────────────────────────────────────────────

function CareTeamWidget() {
  const { practitionerMessages, sendMessageToPractitioner, patientId } = useHealthStore();
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  if (!patientId) return null;

  const unread = practitionerMessages.filter(m => m.sender === "practitioner" && !m.read).length;
  const last = practitionerMessages[practitionerMessages.length - 1];

  async function send() {
    if (!msg.trim()) return;
    setSending(true);
    await sendMessageToPractitioner(msg.trim());
    setMsg("");
    setSending(false);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(16,185,129,0.1)" }}>
          <MessageCircle size={16} color="#10b981" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>
            Frame Longevity Care Team
          </p>
          <p className="text-[11px] truncate" style={{ color: "var(--text3)" }}>
            {last ? last.body : "Send your care team a message"}
          </p>
        </div>
        {unread > 0 && (
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {unread}
          </span>
        )}
        <ChevronRight size={14} color="var(--text3)" className={open ? "rotate-90" : ""} style={{ transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
            {practitionerMessages.length === 0 && (
              <p className="text-[12px] text-center py-2" style={{ color: "var(--text3)" }}>No messages yet</p>
            )}
            {practitionerMessages.map(m => (
              <div key={m.id} className={`flex ${m.sender === "patient" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                  m.sender === "patient"
                    ? "text-white rounded-br-sm"
                    : "rounded-bl-sm"
                }`} style={{
                  background: m.sender === "patient" ? "var(--accent)" : "var(--surface2)",
                  color: m.sender === "patient" ? "#fff" : "var(--text1)",
                }}>
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              placeholder="Message your care team..."
              className="flex-1 px-3 py-2 text-[13px] rounded-xl focus:outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)" }}
            />
            <button
              onClick={send}
              disabled={!msg.trim() || sending}
              className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              <Send size={14} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const {
    intakeProfile, labPanel, actions, isGeneratingActions,
    tutorialDismissed, dismissTutorial,
    assignedProtocolActions, loadAssignedProtocol,
    patientId, loadPractitionerMessages,
  } = useHealthStore();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!intakeProfile?.name) { router.replace("/onboarding"); return; }
    if (isBiometricEnrolled() && !isBiometricSessionActive()) { setLocked(true); return; }
    if (patientId) {
      loadAssignedProtocol();
      loadPractitionerMessages();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!intakeProfile?.name) return null;
  if (locked) return <BiometricLock onUnlock={() => { setBiometricSessionActive(); setLocked(false); }} />;

  const name = intakeProfile.name;
  const displayActions = assignedProtocolActions ?? actions;
  const done  = displayActions.filter(a => a.completed).length;
  const total = displayActions.length;
  const score = labPanel ? computeScore(labPanel.biomarkers) : null;
  const outOfRange = labPanel ? labPanel.biomarkers.filter(b => b.status !== "optimal") : [];
  const topAction = displayActions.find(a => !a.completed);
  const hasAssignedProtocol = !!assignedProtocolActions?.length;

  return (
    <div className="page-content page-enter min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="px-5 pt-12 pb-6 space-y-5">

        {/* Header */}
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

        {/* Frame protocol banner — only when practitioner has assigned one */}
        {hasAssignedProtocol && (
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.15)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold" style={{ color: "#10b981" }}>Frame Longevity Protocol</p>
              <p className="text-[11px]" style={{ color: "var(--text2)" }}>
                Your personalized protocol is active — {total} daily actions
              </p>
            </div>
          </div>
        )}

        {/* Category scores */}
        {labPanel && labPanel.biomarkers.length > 0 && (
          <CategoryScores biomarkers={labPanel.biomarkers} />
        )}

        {actions.length > 0 && <NotificationBanner />}

        {/* Tutorial */}
        {!tutorialDismissed && !hasAssignedProtocol && (
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
                { n: "1", t: "Upload your labs",        s: "We parse every biomarker and build your clinical protocol.", href: "/lab-results?upload=1" },
                { n: "2", t: "Follow your protocol",    s: "Daily actions ranked by clinical impact with the evidence behind each.", href: "/actions" },
                { n: "3", t: "Ask your health coach",   s: "It knows your exact numbers. Ask why a marker is off or how to fix it.", href: "/coach" },
              ].map(item => (
                <Link key={item.n} href={item.href} onClick={dismissTutorial} className="flex items-start gap-3 active:opacity-60 transition-opacity">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold"
                    style={{ background: "var(--accent-lo)", color: "var(--accent)" }}>{item.n}</span>
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
          <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <AlertTriangle size={14} color="#f59e0b" />
            <p className="text-[13px] font-medium" style={{ color: "#f59e0b" }}>
              {outOfRange.length} marker{outOfRange.length !== 1 ? "s" : ""} need attention
            </p>
            <Link href="/lab-results" className="ml-auto text-[12px] font-semibold" style={{ color: "#f59e0b" }}>View →</Link>
          </div>
        )}

        {/* No labs CTA */}
        {!labPanel && !isGeneratingActions && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="px-5 pt-5 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 1</p>
              <p className="text-[17px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
                Upload your labs to activate your protocol
              </p>
              <p className="text-[13px] mt-1.5" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
                We parse every biomarker and personalize your clinical protocol to your specific values.
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

        {/* Top action */}
        {(topAction || isGeneratingActions) && (
          <div className="rounded-2xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={14} color="var(--accent)" />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                  Your #1 right now
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="-rotate-90" width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="12" fill="none" stroke="var(--accent-mid)" strokeWidth="3" />
                    <circle cx="16" cy="16" r="12" fill="none" stroke="var(--accent)" strokeWidth="3"
                      strokeDasharray={2 * Math.PI * 12}
                      strokeDashoffset={2 * Math.PI * 12 - (total ? done / total : 0) * 2 * Math.PI * 12}
                      strokeLinecap="round" />
                  </svg>
                  <span className="absolute mono text-[9px] font-bold" style={{ color: "var(--text1)" }}>{done}</span>
                </div>
                <span className="text-[11px]" style={{ color: "var(--text3)" }}>{done}/{total}</span>
              </div>
            </div>
            {isGeneratingActions ? (
              <div className="flex items-center gap-2" style={{ color: "var(--text2)" }}>
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[13px]">Building your protocol from your labs...</span>
              </div>
            ) : topAction ? (
              <div>
                <p className="text-[16px] font-semibold" style={{ color: "var(--text1)", lineHeight: 1.4 }}>{topAction.title}</p>
                {topAction.biomarkerTarget && (
                  <p className="text-[11px] mt-1 font-medium" style={{ color: "var(--accent)" }}>{topAction.biomarkerTarget}</p>
                )}
                <p className="text-[13px] mt-2" style={{ color: "var(--text2)", lineHeight: 1.5 }}>{topAction.description}</p>
                <Link href="/actions" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
                  See full protocol <ChevronRight size={13} />
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {/* Protocol preview */}
        {displayActions.length > 1 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>
                {hasAssignedProtocol ? "Your Frame Protocol" : "Today's protocol"}
              </p>
              <Link href="/actions" className="text-[12px] font-medium" style={{ color: "var(--accent)" }}>View all →</Link>
            </div>
            {displayActions.slice(0, 4).map((a, i) => (
              <ActionRow key={a.id} action={a} showDivider={i < Math.min(displayActions.length, 4) - 1} />
            ))}
          </div>
        )}

        {/* Care team messaging */}
        <CareTeamWidget />

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/coach">
            <div className="rounded-2xl px-3 py-4 flex flex-col gap-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <MessageCircle size={18} color="var(--accent)" />
              <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>AI Coach</p>
              <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                {labPanel ? `${outOfRange.length} markers analyzed` : "Ask anything"}
              </p>
            </div>
          </Link>
          <Link href="/lab-results">
            <div className="rounded-2xl px-3 py-4 flex flex-col gap-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
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
      <button onClick={() => toggleAction(action.id)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity"
        style={{ opacity: action.completed ? 0.45 : 1 }}>
        {action.completed ? <CheckCircle2 size={18} color="var(--green)" /> : <Circle size={18} color="var(--text3)" />}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate"
            style={{ color: "var(--text1)", textDecoration: action.completed ? "line-through" : "none" }}>
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
