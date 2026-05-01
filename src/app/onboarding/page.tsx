"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHealthStore } from "@/store/useHealthStore";
import { ChevronRight, ArrowLeft, Check, Loader2 } from "lucide-react";

// ─── Step data ────────────────────────────────────────────────────────────────

const PAIN_OPTIONS = [
  { id: "exhausted",   label: "I'm exhausted and no one can explain why",               sub: "Fatigue that doesn't respond to sleep or rest" },
  { id: "weight",      label: "Gaining weight despite doing everything right",           sub: "Metabolic resistance, not a willpower problem" },
  { id: "normal",      label: "My labs are 'normal' — but I don't feel normal",         sub: "Conventional ranges miss a lot" },
  { id: "proactive",   label: "I want to catch problems before they become serious",     sub: "Prevention is the highest-leverage play" },
  { id: "optimize",    label: "I want to operate at my absolute peak",                  sub: "Performance, longevity, and vitality" },
  { id: "referred",    label: "My doctor suggested I track my health more closely",      sub: "Turning clinical guidance into daily action" },
];

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

const TIME_HORIZONS = [
  { id: "90d",  label: "In the next 90 days",     sub: "I want results fast" },
  { id: "6mo",  label: "Over the next 6 months",  sub: "Sustainable, steady progress" },
  { id: "long", label: "Playing the long game",   sub: "Building health for decades" },
];

const MEDICATIONS = [
  "Cholesterol medication (statin)",
  "Diabetes medication (metformin)",
  "Blood pressure medication",
  "Thyroid medication (levothyroxine)",
  "Hormonal birth control",
  "Antidepressant or anti-anxiety",
  "None",
];

const FAMILY_HISTORY = [
  "Heart disease or stroke",
  "Type 2 diabetes",
  "Cancer",
  "Alzheimer's or dementia",
  "Autoimmune conditions",
  "Osteoporosis",
  "None known",
];

const SLEEP_OPTIONS = [5, 6, 7, 8, 9];
const EXERCISE_OPTIONS = [
  { id: "0",   label: "None" },
  { id: "1-2", label: "1–2 days" },
  { id: "3-4", label: "3–4 days" },
  { id: "5+",  label: "5+ days" },
];
const EXERCISE_TYPES = ["Cardio", "Strength", "Mixed", "Yoga / mobility", "Sports"];
const DIET_STYLES = ["Standard / mixed", "Mediterranean", "Whole food / clean", "Low carb", "Keto", "Vegan", "Vegetarian"];
const ALCOHOL_OPTIONS = [
  { id: "none",    label: "None" },
  { id: "light",   label: "1–2 / week" },
  { id: "moderate",label: "3–5 / week" },
  { id: "daily",   label: "Daily" },
];

const SYMPTOM_GROUPS = [
  {
    group: "Energy & focus",
    items: ["Persistent fatigue", "Afternoon energy crashes", "Brain fog or poor concentration", "Low motivation"],
  },
  {
    group: "Sleep & recovery",
    items: ["Difficulty falling asleep", "Waking through the night", "Unrefreshing sleep", "Slow recovery after exercise"],
  },
  {
    group: "Body composition",
    items: ["Unexplained weight gain", "Belly fat that won't budge", "Loss of muscle mass"],
  },
  {
    group: "Hormones & mood",
    items: ["Low libido", "Mood swings or irritability", "Anxiety or depression", "Hair thinning"],
  },
  {
    group: "Digestion & immunity",
    items: ["Bloating or digestive discomfort", "Getting sick frequently", "Joint pain or inflammation"],
  },
];

const NOTIFICATION_STYLES = [
  { id: "gentle",  label: "Gentle",  sub: "Supportive, encouraging, never judgmental" },
  { id: "direct",  label: "Direct",  sub: "Clear and specific, no fluff" },
  { id: "blunt",   label: "Blunt",   sub: "Data-first — tell me exactly what I need to hear" },
];

const CHECK_IN_TIMES  = ["6:00 am", "7:00 am", "8:00 am", "9:00 am"];
const EVENING_TIMES   = ["6:00 pm", "7:00 pm", "8:00 pm", "9:00 pm"];

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step =
  | "welcome"
  | "pain"
  | "goal"
  | "basics"
  | "medical"
  | "habits"
  | "symptoms"
  | "accountability"
  | "labs"
  | "summary";

const STEPS: Step[] = [
  "welcome", "pain", "goal", "basics", "medical",
  "habits", "symptoms", "accountability", "labs", "summary",
];

// Steps that count toward progress (exclude welcome + summary)
const DATA_STEPS = STEPS.slice(1, -1);

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { setIntakeProfile, setUser } = useHealthStore();

  const [step, setStep] = useState<Step>("welcome");

  // Form state
  const [painPoint,           setPainPoint]           = useState("");
  const [goal,                setGoal]                = useState("");
  const [timeHorizon,         setTimeHorizon]         = useState("");
  const [name,                setName]                = useState("");
  const [age,                 setAge]                 = useState("");
  const [sex,                 setSex]                 = useState("");
  const [heightFt,            setHeightFt]            = useState("");
  const [heightIn,            setHeightIn]            = useState("");
  const [weightLbs,           setWeightLbs]           = useState("");
  const [medications,         setMedications]         = useState<string[]>([]);
  const [familyHistory,       setFamilyHistory]       = useState<string[]>([]);
  const [sleepHours,          setSleepHours]          = useState<number | null>(null);
  const [exerciseDays,        setExerciseDays]        = useState("");
  const [exerciseType,        setExerciseType]        = useState("");
  const [dietStyle,           setDietStyle]           = useState("");
  const [stressLevel,         setStressLevel]         = useState<number | null>(null);
  const [alcoholFrequency,    setAlcoholFrequency]    = useState("");
  const [symptoms,            setSymptoms]            = useState<string[]>([]);
  const [notificationStyle,   setNotificationStyle]   = useState("");
  const [checkInTime,         setCheckInTime]         = useState("7:00 am");
  const [eveningTime,         setEveningTime]         = useState("7:00 pm");

  // AI summary
  const [labChoice,           setLabChoice]           = useState<"upload" | "skip">("skip");
  const [summaryText,         setSummaryText]         = useState("");
  const [summaryLoading,      setSummaryLoading]      = useState(false);

  const stepIdx  = STEPS.indexOf(step);
  const dataIdx  = DATA_STEPS.indexOf(step as never);
  const progress = dataIdx >= 0 ? (dataIdx + 1) / DATA_STEPS.length : step === "summary" ? 1 : 0;

  function back() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  }

  function next() {
    setStep(STEPS[stepIdx + 1]);
  }

  function toggleItem<T extends string>(list: T[], item: T, setter: (v: T[]) => void) {
    setter(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  }

  function buildProfile() {
    return {
      name,
      goals: [goal],
      age:            parseInt(age) || undefined,
      biologicalSex:  sex || undefined,
      heightFt:       parseInt(heightFt) || undefined,
      heightIn:       parseInt(heightIn) || 0,
      weightLbs:      parseInt(weightLbs) || undefined,
      painPoint:      painPoint || undefined,
      timeHorizon:    timeHorizon || undefined,
      medications:    medications.filter(m => m !== "None"),
      familyHistory:  familyHistory.filter(f => f !== "None known"),
      sleepHours:     sleepHours ?? undefined,
      exerciseDaysPerWeek: exerciseDays || undefined,
      exerciseType:   exerciseType || undefined,
      dietStyle:      dietStyle || undefined,
      stressLevel:    stressLevel ?? undefined,
      alcoholFrequency: alcoholFrequency || undefined,
      symptoms,
      notificationStyle: notificationStyle || "direct",
      checkInTime,
      eveningReminderTime: eveningTime,
    };
  }

  // Fetch AI summary when summary step is reached
  useEffect(() => {
    if (step !== "summary") return;
    setSummaryLoading(true);
    const profile = buildProfile();

    fetch("/api/intake-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeProfile: profile }),
    })
      .then(r => r.json())
      .then(({ summary }) => setSummaryText(summary ?? ""))
      .catch(() => setSummaryText(""))
      .finally(() => setSummaryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function finish(choice: "upload" | "skip") {
    const profile = buildProfile();
    setIntakeProfile({ ...profile, intakeSummary: summaryText });
    setUser({ name, avatarInitials: name.slice(0, 2).toUpperCase() });
    router.push(choice === "upload" ? "/lab-results?upload=1" : "/");
  }

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: "var(--bg)" }}>

      {/* Progress bar */}
      {step !== "welcome" && (
        <div className="fixed top-0 left-0 right-0 z-50" style={{ maxWidth: 430, margin: "0 auto", height: 3, background: "var(--border)" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--accent)", transition: "width 0.4s ease" }} />
        </div>
      )}

      {/* Back button */}
      {step !== "welcome" && step !== "summary" && (
        <button
          onClick={back}
          className="fixed top-5 left-5 z-50 w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft size={15} color="var(--text2)" />
        </button>
      )}

      <div className="flex-1 flex flex-col px-6 pt-16 pb-10">

        {/* ── WELCOME ──────────────────────────────────────────────────── */}
        {step === "welcome" && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex-1 flex flex-col justify-center gap-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
                </svg>
              </div>
              <div>
                <h1 className="text-[32px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                  Your daily protocol.<br />Built from your biology.
                </h1>
                <p className="mt-4 text-[15px]" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
                  BioPrecision turns your lab results into specific daily actions — and tells you exactly what your physician doesn't have time to explain.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-lo)" }}>
                    <Check size={12} color="var(--accent)" />
                  </div>
                  <p className="text-[13px]" style={{ color: "var(--text2)" }}>What each biomarker does — in plain English</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-lo)" }}>
                    <Check size={12} color="var(--accent)" />
                  </div>
                  <p className="text-[13px]" style={{ color: "var(--text2)" }}>5 daily actions tied to your specific numbers</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-lo)" }}>
                    <Check size={12} color="var(--accent)" />
                  </div>
                  <p className="text-[13px]" style={{ color: "var(--text2)" }}>An AI coach that knows your full chart</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 pt-6">
              <button className="btn-primary" onClick={next}>
                Get started <ChevronRight size={16} />
              </button>
              <p className="text-center text-[12px]" style={{ color: "var(--text3)" }}>Takes 3 minutes · No credit card required</p>
            </div>
          </div>
        )}

        {/* ── PAIN ─────────────────────────────────────────────────────── */}
        {step === "pain" && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 1 of 8</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>What brought you here today?</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>Be honest — this shapes everything we do for you.</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto -mx-1 px-1">
              {PAIN_OPTIONS.map(o => (
                <button
                  key={o.id}
                  onClick={() => { setPainPoint(o.id); next(); }}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-2xl text-left transition-all"
                  style={{
                    background: painPoint === o.id ? "var(--accent-lo)" : "var(--surface)",
                    border: `1.5px solid ${painPoint === o.id ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>{o.label}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{o.sub}</p>
                  </div>
                  <ChevronRight size={15} color="var(--text3)" className="flex-shrink-0 ml-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── GOAL ─────────────────────────────────────────────────────── */}
        {step === "goal" && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 2 of 8</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>What matters most to you?</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>Your protocol is built around this priority.</p>
            </div>
            {!goal ? (
              <div className="flex-1 space-y-2 overflow-y-auto -mx-1 px-1">
                {GOALS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className="w-full flex items-center justify-between px-4 py-4 rounded-2xl text-left transition-all"
                    style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
                  >
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>{g.label}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{g.sub}</p>
                    </div>
                    <ChevronRight size={15} color="var(--text3)" className="flex-shrink-0 ml-3" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4">
                <div className="px-4 py-3 rounded-2xl" style={{ background: "var(--accent-lo)", border: "1.5px solid var(--accent)" }}>
                  <p className="text-[13px] font-semibold" style={{ color: "var(--accent)" }}>{GOALS.find(g2 => g2.id === goal)?.label}</p>
                </div>
                <p className="text-[15px] font-semibold mt-2" style={{ color: "var(--text1)" }}>How soon do you want to see results?</p>
                <div className="space-y-2">
                  {TIME_HORIZONS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTimeHorizon(t.id); next(); }}
                      className="w-full flex items-center justify-between px-4 py-4 rounded-2xl text-left"
                      style={{
                        background: timeHorizon === t.id ? "var(--accent-lo)" : "var(--surface)",
                        border: `1.5px solid ${timeHorizon === t.id ? "var(--accent)" : "var(--border)"}`,
                      }}
                    >
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>{t.label}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{t.sub}</p>
                      </div>
                      <ChevronRight size={15} color="var(--text3)" className="flex-shrink-0 ml-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BASICS ───────────────────────────────────────────────────── */}
        {step === "basics" && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 3 of 8</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>About you</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>Personalizes your reference ranges and recommendations.</p>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto">
              <Field label="First name">
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your first name" className="field-input" style={fieldStyle} />
              </Field>
              <Field label="Age">
                <input type="number" value={age} onChange={e => setAge(e.target.value)}
                  placeholder="e.g. 38" className="field-input" style={fieldStyle} />
              </Field>
              <Field label="Biological sex">
                <div className="grid grid-cols-3 gap-2">
                  {["Male", "Female", "Prefer not to say"].map(s => (
                    <button key={s} onClick={() => setSex(s)}
                      className="py-3 rounded-xl text-[13px] font-medium transition-all"
                      style={{ background: sex === s ? "var(--accent-lo)" : "var(--surface)", border: `1.5px solid ${sex === s ? "var(--accent)" : "var(--border)"}`, color: sex === s ? "var(--accent)" : "var(--text2)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Height (ft)">
                  <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)}
                    placeholder="5" className="field-input" style={fieldStyle} />
                </Field>
                <Field label="Height (in)">
                  <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)}
                    placeholder="10" className="field-input" style={fieldStyle} />
                </Field>
                <Field label="Weight (lbs)">
                  <input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)}
                    placeholder="175" className="field-input" style={fieldStyle} />
                </Field>
              </div>
            </div>
            <button className="btn-primary" onClick={next} disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.35 }}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── MEDICAL ──────────────────────────────────────────────────── */}
        {step === "medical" && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 4 of 8</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>Medical context</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>Helps us flag contraindications and genetic risk factors.</p>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto">
              <div>
                <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--text2)" }}>Current medications</p>
                <div className="flex flex-wrap gap-2">
                  {MEDICATIONS.map(m => {
                    const on = medications.includes(m) || (m === "None" && medications.length === 0);
                    return (
                      <button key={m} onClick={() => {
                        if (m === "None") { setMedications([]); return; }
                        toggleItem(medications, m, setMedications);
                      }}
                        className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all"
                        style={{ background: on ? "var(--accent-lo)" : "var(--surface)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`, color: on ? "var(--accent)" : "var(--text2)" }}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--text2)" }}>Family history</p>
                <div className="flex flex-wrap gap-2">
                  {FAMILY_HISTORY.map(f => {
                    const on = familyHistory.includes(f);
                    return (
                      <button key={f} onClick={() => toggleItem(familyHistory, f, setFamilyHistory)}
                        className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all"
                        style={{ background: on ? "var(--accent-lo)" : "var(--surface)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`, color: on ? "var(--accent)" : "var(--text2)" }}>
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <button className="btn-primary" onClick={next}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── HABITS ───────────────────────────────────────────────────── */}
        {step === "habits" && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 5 of 8</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>Your current habits</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>Your baseline — we build on what you already do.</p>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto">

              <HabitSection label="Hours of sleep per night">
                <div className="flex gap-2">
                  {SLEEP_OPTIONS.map(h => (
                    <button key={h} onClick={() => setSleepHours(h)}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                      style={{ background: sleepHours === h ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${sleepHours === h ? "var(--accent)" : "var(--border)"}`, color: sleepHours === h ? "#fff" : "var(--text2)" }}>
                      {h === 9 ? "9+" : h}
                    </button>
                  ))}
                </div>
              </HabitSection>

              <HabitSection label="Exercise per week">
                <div className="grid grid-cols-4 gap-2">
                  {EXERCISE_OPTIONS.map(o => (
                    <button key={o.id} onClick={() => setExerciseDays(o.id)}
                      className="py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{ background: exerciseDays === o.id ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${exerciseDays === o.id ? "var(--accent)" : "var(--border)"}`, color: exerciseDays === o.id ? "#fff" : "var(--text2)" }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </HabitSection>

              {exerciseDays && exerciseDays !== "0" && (
                <HabitSection label="Exercise type">
                  <div className="flex flex-wrap gap-2">
                    {EXERCISE_TYPES.map(t => (
                      <button key={t} onClick={() => setExerciseType(t)}
                        className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all"
                        style={{ background: exerciseType === t ? "var(--accent-lo)" : "var(--surface)", border: `1.5px solid ${exerciseType === t ? "var(--accent)" : "var(--border)"}`, color: exerciseType === t ? "var(--accent)" : "var(--text2)" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </HabitSection>
              )}

              <HabitSection label="Diet style">
                <div className="flex flex-wrap gap-2">
                  {DIET_STYLES.map(d => (
                    <button key={d} onClick={() => setDietStyle(d)}
                      className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all"
                      style={{ background: dietStyle === d ? "var(--accent-lo)" : "var(--surface)", border: `1.5px solid ${dietStyle === d ? "var(--accent)" : "var(--border)"}`, color: dietStyle === d ? "var(--accent)" : "var(--text2)" }}>
                      {d}
                    </button>
                  ))}
                </div>
              </HabitSection>

              <HabitSection label="Current stress level">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setStressLevel(n)}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
                      style={{ background: stressLevel === n ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${stressLevel === n ? "var(--accent)" : "var(--border)"}`, color: stressLevel === n ? "#fff" : "var(--text2)" }}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>Low</span>
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>High</span>
                </div>
              </HabitSection>

              <HabitSection label="Alcohol consumption">
                <div className="grid grid-cols-4 gap-2">
                  {ALCOHOL_OPTIONS.map(o => (
                    <button key={o.id} onClick={() => setAlcoholFrequency(o.id)}
                      className="py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{ background: alcoholFrequency === o.id ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${alcoholFrequency === o.id ? "var(--accent)" : "var(--border)"}`, color: alcoholFrequency === o.id ? "#fff" : "var(--text2)" }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </HabitSection>

            </div>
            <button className="btn-primary" onClick={next}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── SYMPTOMS ─────────────────────────────────────────────────── */}
        {step === "symptoms" && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 6 of 8</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>What are you dealing with?</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>Select everything that applies. Be thorough — this drives your protocol.</p>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto">
              {SYMPTOM_GROUPS.map(group => (
                <div key={group.group}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>{group.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map(s => {
                      const on = symptoms.includes(s);
                      return (
                        <button key={s} onClick={() => toggleItem(symptoms, s, setSymptoms)}
                          className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all"
                          style={{ background: on ? "var(--accent-lo)" : "var(--surface)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`, color: on ? "var(--accent)" : "var(--text2)" }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={next}>
              {symptoms.length > 0 ? `Continue — ${symptoms.length} selected` : "None of these apply"} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── ACCOUNTABILITY ───────────────────────────────────────────── */}
        {step === "accountability" && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 7 of 8</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>How should we talk to you?</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>This sets the tone of your AI coach and daily reminders.</p>
            </div>
            <div className="space-y-3">
              {NOTIFICATION_STYLES.map(s => (
                <button key={s.id} onClick={() => setNotificationStyle(s.id)}
                  className="w-full px-4 py-4 rounded-2xl text-left transition-all"
                  style={{ background: notificationStyle === s.id ? "var(--accent-lo)" : "var(--surface)", border: `1.5px solid ${notificationStyle === s.id ? "var(--accent)" : "var(--border)"}` }}>
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-bold" style={{ color: "var(--text1)" }}>{s.label}</p>
                    {notificationStyle === s.id && <Check size={16} color="var(--accent)" />}
                  </div>
                  <p className="text-[13px] mt-0.5" style={{ color: "var(--text2)" }}>{s.sub}</p>
                </button>
              ))}
            </div>
            <div className="space-y-4 mt-1">
              <div>
                <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text2)" }}>Morning check-in</p>
                <div className="flex gap-2">
                  {CHECK_IN_TIMES.map(t => (
                    <button key={t} onClick={() => setCheckInTime(t)}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{ background: checkInTime === t ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${checkInTime === t ? "var(--accent)" : "var(--border)"}`, color: checkInTime === t ? "#fff" : "var(--text2)" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text2)" }}>Evening reminder</p>
                <div className="flex gap-2">
                  {EVENING_TIMES.map(t => (
                    <button key={t} onClick={() => setEveningTime(t)}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{ background: eveningTime === t ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${eveningTime === t ? "var(--accent)" : "var(--border)"}`, color: eveningTime === t ? "#fff" : "var(--text2)" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn-primary" onClick={next} disabled={!notificationStyle} style={{ opacity: notificationStyle ? 1 : 0.35 }}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── LABS ─────────────────────────────────────────────────────── */}
        {step === "labs" && (
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step 8 of 8</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>Connect your lab results</h2>
              <p className="text-[14px] mt-2" style={{ color: "var(--text2)", lineHeight: 1.65 }}>
                Your protocol becomes significantly more precise with real lab data. Upload a PDF from any lab — Quest, LabCorp, or your doctor.
              </p>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <button onClick={() => { setLabChoice("upload"); next(); }} className="btn-primary" style={{ paddingTop: 16, paddingBottom: 16 }}>
                Upload my labs
              </button>
              <div className="card px-4 py-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Why it matters</p>
                {[
                  "Actions tied to your actual biomarker values, not estimates",
                  "Your AI coach references your exact numbers in every conversation",
                  "We tell you what each number means — and how to move it",
                ].map(t => (
                  <div key={t} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "var(--accent-lo)" }}>
                      <Check size={10} color="var(--accent)" />
                    </div>
                    <p className="text-[13px]" style={{ color: "var(--text2)", lineHeight: 1.5 }}>{t}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => { setLabChoice("skip"); next(); }} className="btn-ghost">I will add labs later</button>
            </div>
          </div>
        )}

        {/* ── SUMMARY ──────────────────────────────────────────────────── */}
        {step === "summary" && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex-1 flex flex-col justify-center gap-6">
              {summaryLoading ? (
                <div className="flex flex-col items-center gap-6 py-8">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-100" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[16px] font-semibold" style={{ color: "var(--text1)" }}>Reading your profile...</p>
                    <p className="text-[13px] mt-1" style={{ color: "var(--text2)" }}>Building your personalized assessment</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Your assessment</p>
                    <div className="card px-5 py-5">
                      <p className="text-[15px]" style={{ color: "var(--text1)", lineHeight: 1.7 }}>
                        {summaryText || `Welcome, ${name}. Based on what you've shared, we have a clear picture of where to start. Your personalized protocol is ready.`}
                      </p>
                    </div>
                  </div>
                  <div className="card px-4 py-4">
                    <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text3)" }}>What happens next</p>
                    {[
                      { title: "Upload your labs",        sub: "We parse every biomarker with AI — takes 30 seconds" },
                      { title: "Get your daily protocol", sub: "5 specific actions tied to your exact numbers" },
                      { title: "Check in daily",          sub: "30-second morning check-in builds the accountability loop" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold" style={{ background: "var(--accent-lo)", color: "var(--accent)" }}>{i + 1}</span>
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>{item.title}</p>
                          <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {!summaryLoading && (
              <div className="space-y-3 pt-4">
                <button className="btn-primary" onClick={() => finish(labChoice)}>
                  {labChoice === "upload" ? "Upload my labs" : "Go to my dashboard"} <ChevronRight size={16} />
                </button>
                {labChoice === "upload" && (
                  <button className="btn-ghost" onClick={() => finish("skip")}>
                    Skip for now
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[12px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--text2)" }}>{label}</label>
      {children}
    </div>
  );
}

function HabitSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--text2)" }}>{label}</p>
      {children}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  fontSize: 15,
  outline: "none",
  background: "var(--surface)",
  border: "1.5px solid var(--border)",
  color: "var(--text1)",
};
