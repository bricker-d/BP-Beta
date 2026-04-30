"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHealthStore } from "@/store/useHealthStore";
import { ChevronRight, ArrowLeft, Check } from "lucide-react";

const GOALS = [
  { id: "energy",          emoji: "⚡", label: "More energy",          sub: "Fight fatigue, improve focus" },
  { id: "longevity",       emoji: "⏳", label: "Live longer",           sub: "Optimize for healthspan" },
  { id: "weight_loss",     emoji: "🔥", label: "Lose body fat",         sub: "Metabolic optimization" },
  { id: "muscle_gain",     emoji: "💪", label: "Build muscle",          sub: "Strength & body composition" },
  { id: "heart_health",    emoji: "❤️",  label: "Heart health",          sub: "Cardiovascular protection" },
  { id: "hormone_balance", emoji: "🔄", label: "Balance hormones",      sub: "Testosterone, thyroid, cortisol" },
  { id: "mental_clarity",  emoji: "🧠", label: "Mental clarity",        sub: "Focus, mood, cognition" },
  { id: "sleep",           emoji: "🌙", label: "Better sleep",          sub: "Recovery & restoration" },
];

const SYMPTOMS = [
  "Low energy or fatigue",
  "Brain fog or poor focus",
  "Trouble sleeping",
  "Low libido",
  "Mood swings or anxiety",
  "Stubborn weight gain",
  "Poor recovery after exercise",
  "Frequent illness",
  "Hair thinning or loss",
  "Digestive issues",
];

const SEX_OPTIONS = ["Male", "Female", "Prefer not to say"];

type Step = "welcome" | "goal" | "basics" | "symptoms" | "labs" | "done";

const STEPS: Step[] = ["welcome", "goal", "basics", "symptoms", "labs", "done"];

export default function OnboardingPage() {
  const router = useRouter();
  const { setIntakeProfile, setUser } = useHealthStore();

  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [labChoice, setLabChoice] = useState<"upload" | "skip" | null>(null);

  const stepIdx = STEPS.indexOf(step);
  const progress = (stepIdx / (STEPS.length - 1)) * 100;

  function back() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  }

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function finish(choice: "upload" | "skip") {
    setLabChoice(choice);
    const profile = {
      name,
      goals: [goal],
      age: parseInt(age) || undefined,
      biologicalSex: sex || undefined,
      symptoms,
    };
    setIntakeProfile(profile);
    setUser({ name, avatarInitials: name.slice(0, 2).toUpperCase() });
    if (choice === "upload") {
      router.push("/lab-results");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Progress bar */}
      {step !== "welcome" && step !== "done" && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5" style={{ background: "var(--surface2)", maxWidth: 430, margin: "0 auto" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "var(--accent)" }}
          />
        </div>
      )}

      {/* Back button */}
      {step !== "welcome" && step !== "done" && (
        <button
          onClick={back}
          className="fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: "var(--surface2)" }}
        >
          <ArrowLeft size={16} color="var(--text2)" />
        </button>
      )}

      <div className="flex-1 flex flex-col px-6 pt-16 pb-10">

        {/* ── WELCOME ── */}
        {step === "welcome" && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex-1 flex flex-col justify-center items-center text-center gap-6">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center glow-purple"
                style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)" }}
              >
                <span className="text-4xl">⚡</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.03em" }}>
                  BioPrecision
                </h1>
                <p className="mt-3 text-base" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
                  Your daily protocol, built around your biology. Not generic advice — actions tied to your actual lab results.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <button className="btn-primary" onClick={() => setStep("goal")}>
                Get Started <ChevronRight size={16} />
              </button>
              <p className="text-center text-xs" style={{ color: "var(--text3)" }}>
                Takes about 2 minutes
              </p>
            </div>
          </div>
        )}

        {/* ── GOAL ── */}
        {step === "goal" && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 1</p>
              <h2 className="text-2xl font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
                What&apos;s your main goal?
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                We&apos;ll build your protocol around this.
              </p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setGoal(g.id); setStep("basics"); }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left"
                  style={{
                    background: goal === g.id ? "var(--accent-lo)" : "var(--surface)",
                    border: `1px solid ${goal === g.id ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text1)" }}>{g.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>{g.sub}</p>
                  </div>
                  {goal === g.id && <Check size={16} color="var(--accent)" className="ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── BASICS ── */}
        {step === "basics" && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 2</p>
              <h2 className="text-2xl font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
                A little about you
              </h2>
            </div>

            <div className="flex-1 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--text2)" }}>
                  First name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text1)",
                  }}
                />
              </div>

              {/* Age */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--text2)" }}>
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="e.g. 34"
                  className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text1)",
                  }}
                />
              </div>

              {/* Sex */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--text2)" }}>
                  Biological sex
                </label>
                <div className="flex gap-2">
                  {SEX_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className="flex-1 py-3 rounded-2xl text-xs font-semibold transition-all"
                      style={{
                        background: sex === s ? "var(--accent-lo)" : "var(--surface)",
                        border: `1px solid ${sex === s ? "var(--accent)" : "var(--border)"}`,
                        color: sex === s ? "var(--accent)" : "var(--text2)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => setStep("symptoms")}
              disabled={!name.trim()}
              style={{ opacity: name.trim() ? 1 : 0.4 }}
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── SYMPTOMS ── */}
        {step === "symptoms" && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 3</p>
              <h2 className="text-2xl font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
                What are you experiencing?
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                Select all that apply. This helps us prioritize your protocol.
              </p>
            </div>

            <div className="flex-1 flex flex-wrap gap-2 content-start overflow-y-auto">
              {SYMPTOMS.map(s => {
                const selected = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className="px-4 py-2.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: selected ? "var(--accent-lo)" : "var(--surface)",
                      border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      color: selected ? "var(--accent)" : "var(--text2)",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            <button className="btn-primary" onClick={() => setStep("labs")}>
              {symptoms.length > 0 ? `Continue (${symptoms.length} selected)` : "Skip for now"}
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── LABS ── */}
        {step === "labs" && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 4</p>
              <h2 className="text-2xl font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
                Connect your lab results
              </h2>
              <p className="text-sm mt-2" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
                Your protocol is far more powerful with real lab data. Upload a PDF from Quest, LabCorp, or any lab.
              </p>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <button
                onClick={() => finish("upload")}
                className="btn-primary"
                style={{ padding: "18px 20px" }}
              >
                <span className="text-lg">📄</span>
                Upload my labs now
              </button>

              <div
                className="rounded-2xl px-4 py-4 text-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>
                  Why upload?
                </p>
                <div className="space-y-2 text-left">
                  {[
                    "Actions tied to your actual biomarkers, not generic advice",
                    "AI coach knows your exact numbers",
                    "Track improvement over time as values change",
                  ].map(t => (
                    <div key={t} className="flex items-start gap-2">
                      <Check size={14} color="var(--green)" className="flex-shrink-0 mt-0.5" />
                      <p className="text-xs" style={{ color: "var(--text2)" }}>{t}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => finish("skip")}
                className="btn-ghost"
              >
                I&apos;ll add labs later
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
