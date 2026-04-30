"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHealthStore } from "@/store/useHealthStore";
import { ChevronRight, ArrowLeft, Check } from "lucide-react";

const GOALS = [
  { id: "energy",          label: "More consistent energy",    sub: "End the afternoon crashes and brain fog" },
  { id: "longevity",       label: "Live longer, feel younger", sub: "Optimize for healthspan, not just lifespan" },
  { id: "weight_loss",     label: "Lose body fat",             sub: "Metabolic health and body composition" },
  { id: "muscle_gain",     label: "Build strength and muscle", sub: "Performance and body composition" },
  { id: "heart_health",    label: "Protect my heart",          sub: "Cardiovascular risk reduction" },
  { id: "hormone_balance", label: "Balance my hormones",       sub: "Testosterone, thyroid, cortisol" },
  { id: "mental_clarity",  label: "Sharper mind",              sub: "Focus, mood, and cognitive performance" },
  { id: "sleep",           label: "Sleep better",              sub: "Recovery, restoration, and deep sleep" },
];

const SYMPTOMS = [
  "Low energy or fatigue",
  "Difficulty concentrating",
  "Poor sleep quality",
  "Low sex drive",
  "Mood changes or anxiety",
  "Difficulty losing weight",
  "Slow recovery after exercise",
  "Getting sick frequently",
  "Hair thinning",
  "Digestive discomfort",
];

const SEX_OPTIONS = ["Male", "Female", "Prefer not to say"];

type Step = "welcome" | "goal" | "basics" | "symptoms" | "labs";
const STEPS: Step[] = ["welcome", "goal", "basics", "symptoms", "labs"];

export default function OnboardingPage() {
  const router = useRouter();
  const { setIntakeProfile, setUser } = useHealthStore();

  const [step, setStep]       = useState<Step>("welcome");
  const [name, setName]       = useState("");
  const [goal, setGoal]       = useState("");
  const [age, setAge]         = useState("");
  const [sex, setSex]         = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);

  const stepIdx  = STEPS.indexOf(step);
  const progress = stepIdx / (STEPS.length - 1);

  function back() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  }

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function finish(choice: "upload" | "skip") {
    const profile = {
      name,
      goals: [goal],
      age: parseInt(age) || undefined,
      biologicalSex: sex || undefined,
      symptoms,
    };
    setIntakeProfile(profile);
    setUser({ name, avatarInitials: name.slice(0, 2).toUpperCase() });
    router.push(choice === "upload" ? "/lab-results" : "/");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>

      {/* Progress */}
      {step !== "welcome" && (
        <div className="fixed top-0 left-0 right-0 z-50" style={{ maxWidth: 430, margin: "0 auto", height: 3, background: "var(--border)" }}>
          <div
            style={{ width: `${progress * 100}%`, height: "100%", background: "var(--accent)", transition: "width 0.4s ease" }}
          />
        </div>
      )}

      {/* Back */}
      {step !== "welcome" && (
        <button
          onClick={back}
          className="fixed top-5 left-5 z-50 w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft size={15} color="var(--text2)" />
        </button>
      )}

      <div className="flex-1 flex flex-col px-6 pt-16 pb-10">

        {/* WELCOME */}
        {step === "welcome" && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex-1 flex flex-col justify-center gap-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--accent)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
                </svg>
              </div>
              <div>
                <h1 className="text-[32px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                  Your daily protocol.<br />Built from your biology.
                </h1>
                <p className="mt-4 text-[15px]" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
                  BioPrecision turns your lab results into specific daily actions — and sends you reminders throughout the day to follow through.
                </p>
              </div>
            </div>
            <div className="space-y-3 pt-6">
              <button className="btn-primary" onClick={() => setStep("goal")}>
                Get started
                <ChevronRight size={16} />
              </button>
              <p className="text-center text-[12px]" style={{ color: "var(--text3)" }}>
                Takes 2 minutes · No credit card required
              </p>
            </div>
          </div>
        )}

        {/* GOAL */}
        {step === "goal" && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 1 of 4</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>
                What matters most to you?
              </h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>
                Your protocol will be built around this priority.
              </p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto -mx-1 px-1">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setGoal(g.id); setStep("basics"); }}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-2xl text-left transition-all"
                  style={{
                    background: goal === g.id ? "var(--accent-lo)" : "var(--surface)",
                    border: `1.5px solid ${goal === g.id ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>{g.label}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{g.sub}</p>
                  </div>
                  {goal === g.id
                    ? <Check size={16} color="var(--accent)" />
                    : <ChevronRight size={15} color="var(--text3)" />
                  }
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BASICS */}
        {step === "basics" && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 2 of 4</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>About you</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>
                Used to personalize your reference ranges and recommendations.
              </p>
            </div>

            <div className="flex-1 space-y-5">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--text2)" }}>
                  First name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your first name"
                  className="w-full px-4 py-3.5 rounded-xl text-[15px] outline-none"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text1)" }}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--text2)" }}>
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="e.g. 34"
                  className="w-full px-4 py-3.5 rounded-xl text-[15px] outline-none"
                  style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text1)" }}
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--text2)" }}>
                  Biological sex
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SEX_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className="py-3 rounded-xl text-[13px] font-medium transition-all"
                      style={{
                        background: sex === s ? "var(--accent-lo)" : "var(--surface)",
                        border: `1.5px solid ${sex === s ? "var(--accent)" : "var(--border)"}`,
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
              style={{ opacity: name.trim() ? 1 : 0.35 }}
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* SYMPTOMS */}
        {step === "symptoms" && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 3 of 4</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>
                What are you dealing with?
              </h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>
                Select everything that applies. This shapes your protocol.
              </p>
            </div>

            <div className="flex-1 flex flex-wrap gap-2 content-start overflow-y-auto">
              {SYMPTOMS.map(s => {
                const on = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className="px-4 py-2.5 rounded-full text-[13px] font-medium transition-all"
                    style={{
                      background: on ? "var(--accent-lo)" : "var(--surface)",
                      border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                      color: on ? "var(--accent)" : "var(--text2)",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            <button className="btn-primary" onClick={() => setStep("labs")}>
              {symptoms.length > 0 ? `Continue — ${symptoms.length} selected` : "Skip for now"}
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* LABS */}
        {step === "labs" && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 4 of 4</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>
                Connect your lab results
              </h2>
              <p className="text-[14px] mt-2" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
                Your protocol becomes significantly more precise with real lab data. Upload a PDF from any lab — Quest, LabCorp, or your doctor.
              </p>
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <button
                onClick={() => finish("upload")}
                className="btn-primary"
                style={{ paddingTop: 16, paddingBottom: 16 }}
              >
                Upload my labs
              </button>

              <div className="card px-4 py-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                  Why it matters
                </p>
                {[
                  "Actions tied to your actual biomarker values, not generic advice",
                  "Your AI coach can reference your exact numbers in every conversation",
                  "Track changes over time as your results improve",
                ].map(t => (
                  <div key={t} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "var(--accent-lo)" }}>
                      <Check size={10} color="var(--accent)" />
                    </div>
                    <p className="text-[13px]" style={{ color: "var(--text2)", lineHeight: 1.5 }}>{t}</p>
                  </div>
                ))}
              </div>

              <button onClick={() => finish("skip")} className="btn-ghost">
                I will add labs later
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
