"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useHealthStore } from "@/store/useHealthStore";
import { ChevronRight, ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import LabUpload from "@/components/lab-results/LabUpload";
import { createClient } from "@/lib/supabase-browser";

// ─── Step data ────────────────────────────────────────────────────────────────

const PAIN_OPTIONS = [
  { id: "exhausted",  label: "Exhausted and no one can explain why",         sub: "Fatigue that doesn't respond to rest" },
  { id: "weight",     label: "Gaining weight despite doing everything right", sub: "Metabolic resistance, not willpower" },
  { id: "normal",     label: "Labs look 'normal' but I don't feel normal",   sub: "Conventional ranges miss a lot" },
  { id: "proactive",  label: "Catch problems before they become serious",     sub: "Prevention is the highest-leverage play" },
  { id: "optimize",   label: "Operate at my absolute peak",                  sub: "Performance, longevity, vitality" },
  { id: "referred",   label: "Doctor suggested I track more closely",         sub: "Turning guidance into daily action" },
];

const GOALS = [
  { id: "energy",          label: "More consistent energy",    sub: "End crashes and brain fog" },
  { id: "longevity",       label: "Live longer, feel younger", sub: "Optimize for healthspan" },
  { id: "weight_loss",     label: "Lose body fat",             sub: "Metabolic health" },
  { id: "muscle_gain",     label: "Build strength",            sub: "Performance and composition" },
  { id: "heart_health",    label: "Protect my heart",          sub: "Cardiovascular risk" },
  { id: "hormone_balance", label: "Balance my hormones",       sub: "Testosterone, thyroid, cortisol" },
  { id: "mental_clarity",  label: "Sharper mind",              sub: "Focus, mood, cognition" },
  { id: "sleep",           label: "Sleep better",              sub: "Recovery and restoration" },
];

const TIME_HORIZONS = [
  { id: "90d",  label: "90 days",       sub: "Fast, focused results" },
  { id: "6mo",  label: "6 months",      sub: "Steady progress" },
  { id: "long", label: "Long game",     sub: "Decades of health" },
];

const MEDICATIONS = [
  "Cholesterol medication (statin)", "Diabetes medication (metformin)",
  "Blood pressure medication", "Thyroid medication (levothyroxine)",
  "Hormonal birth control", "Antidepressant or anti-anxiety",
  "Blood thinners", "Immunosuppressants", "Testosterone / HRT", "None",
];

const FAMILY_HISTORY = [
  "Heart disease or stroke", "Type 2 diabetes", "Cancer",
  "Alzheimer's or dementia", "Autoimmune conditions", "Osteoporosis",
  "High cholesterol", "Hypertension", "None known",
];

const ACTIVE_CONDITIONS = [
  "Type 2 diabetes", "Hypertension", "Hypothyroidism", "Hyperthyroidism",
  "Autoimmune condition", "PCOS", "Cardiovascular disease", "Depression or anxiety",
  "Sleep apnea", "Chronic kidney disease", "Liver disease", "Cancer (current)",
  "Inflammatory bowel disease", "Metabolic syndrome", "Insulin resistance", "None",
];

const ALLERGY_OPTIONS = [
  "Shellfish", "Tree nuts", "Peanuts", "Dairy / lactose", "Gluten / wheat",
  "Eggs", "Soy", "Fish", "Penicillin", "Sulfa drugs", "NSAIDs / aspirin", "None known",
];

const SLEEP_OPTIONS    = [4, 5, 6, 7, 8, 9];
const EXERCISE_OPTIONS = [
  { id: "0",   label: "None" }, { id: "1-2", label: "1–2x" },
  { id: "3-4", label: "3–4x" }, { id: "5+",  label: "5+x" },
];
const EXERCISE_TYPES   = ["Cardio", "Strength training", "HIIT", "Yoga / mobility", "Sports", "Walking"];
const DIET_STYLES      = ["Standard / mixed", "Mediterranean", "Whole food / clean", "Low carb", "Keto", "Vegan", "Vegetarian", "Carnivore"];
const ALCOHOL_OPTIONS  = [
  { id: "none",     label: "None"      },
  { id: "light",    label: "1–2/wk"   },
  { id: "moderate", label: "3–5/wk"   },
  { id: "daily",    label: "Daily"     },
];
const CAFFEINE_OPTIONS = [
  { id: "none",     label: "None"       },
  { id: "light",    label: "1 cup/day"  },
  { id: "moderate", label: "2–3/day"    },
  { id: "heavy",    label: "4+/day"     },
];
const SMOKING_OPTIONS  = [
  { id: "never",   label: "Never"       },
  { id: "former",  label: "Former"      },
  { id: "current", label: "Current"     },
];
const OCCUPATION_OPTIONS = [
  { id: "sedentary", label: "Desk / sedentary",    sub: "Sitting most of the day" },
  { id: "mixed",     label: "Mixed",                sub: "Some desk, some movement" },
  { id: "active",    label: "On your feet",         sub: "Physically active job" },
];

const SYMPTOM_GROUPS = [
  { group: "Energy & focus",       items: ["Persistent fatigue", "Afternoon energy crash", "Brain fog", "Low motivation", "Difficulty concentrating", "Relying on caffeine to function"] },
  { group: "Sleep & recovery",     items: ["Hard to fall asleep", "Waking at night", "Unrefreshing sleep", "Slow workout recovery", "Excessive sleepiness"] },
  { group: "Body composition",     items: ["Unexplained weight gain", "Belly fat that won't budge", "Muscle loss", "Difficulty building muscle", "Fluid retention / bloating"] },
  { group: "Hormones & mood",      items: ["Low libido", "Mood swings", "Anxiety", "Depression", "Hair thinning or loss", "Irregular periods", "Cold hands or feet", "Night sweats"] },
  { group: "Digestion & immunity", items: ["Bloating after meals", "Constipation or loose stools", "Getting sick often", "Joint pain or stiffness", "Skin issues (acne, eczema)", "Frequent headaches"] },
  { group: "Cardiovascular",       items: ["Heart palpitations", "Shortness of breath with mild exertion", "High blood pressure (diagnosed)", "Dizziness on standing"] },
];

const NOTIFICATION_STYLES = [
  { id: "gentle", label: "Gentle",  sub: "Supportive, never judgmental" },
  { id: "direct", label: "Direct",  sub: "Clear and specific, no fluff" },
  { id: "blunt",  label: "Blunt",   sub: "Data-first, tell me exactly what I need to hear" },
];

const CHECK_IN_TIMES = ["6:00 am", "7:00 am", "8:00 am", "9:00 am"];
const EVENING_TIMES  = ["6:00 pm", "7:00 pm", "8:00 pm", "9:00 pm"];

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = "welcome" | "pain" | "goal" | "labs" | "basics" | "medical" | "habits" | "symptoms" | "accountability" | "summary" | "account";
const STEPS: Step[] = ["welcome", "pain", "goal", "labs", "basics", "medical", "habits", "symptoms", "accountability", "summary", "account"];
const DATA_STEPS = STEPS.slice(1, -2); // excludes welcome, summary, account from progress

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { setIntakeProfile, setUser, labPanel, syncPatient } = useHealthStore();

  const [step, setStep]         = useState<Step>("welcome");
  const [showUpload,    setShowUpload]    = useState(false);
  const [showLabUpload, setShowLabUpload] = useState(false);

  // Form state
  const [painPoints,        setPainPoints]        = useState<string[]>([]);
  const [goals,             setGoals]             = useState<string[]>([]);
  const [timeHorizon,       setTimeHorizon]       = useState("");
  const [name,              setName]              = useState("");
  const [age,               setAge]               = useState("");
  const [sex,               setSex]               = useState("");
  const [heightFt,          setHeightFt]          = useState("");
  const [heightIn,          setHeightIn]          = useState("");
  const [weightLbs,         setWeightLbs]         = useState("");
  const [occupation,        setOccupation]        = useState("");
  const [medications,       setMedications]       = useState<string[]>([]);
  const [familyHistory,     setFamilyHistory]     = useState<string[]>([]);
  const [activeConditions,  setActiveConditions]  = useState<string[]>([]);
  const [allergies,         setAllergies]         = useState<string[]>([]);
  const [consentChecked,    setConsentChecked]    = useState(false);
  const [sleepHours,        setSleepHours]        = useState<number | null>(null);
  const [sleepQuality,      setSleepQuality]      = useState<number | null>(null);
  const [exerciseDays,      setExerciseDays]      = useState("");
  const [exerciseTypes,     setExerciseTypes]     = useState<string[]>([]);
  const [dietStyle,         setDietStyle]         = useState("");
  const [stressLevel,       setStressLevel]       = useState<number | null>(null);
  const [alcoholFrequency,  setAlcoholFrequency]  = useState("");
  const [caffeineIntake,    setCaffeineIntake]    = useState("");
  const [smokingStatus,     setSmokingStatus]     = useState("");
  const [symptoms,          setSymptoms]          = useState<string[]>([]);
  const [supplements,       setSupplements]       = useState<string[]>([]);
  const [checkInTime,       setCheckInTime]       = useState("7:00 am");
  const [eveningTime,       setEveningTime]       = useState("7:00 pm");
  const [notificationStyle, setNotificationStyle] = useState("direct");

  // Account creation state
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState("");

  // Summary
  const [summaryText,    setSummaryText]    = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const stepIdx  = STEPS.indexOf(step);
  const dataIdx  = DATA_STEPS.indexOf(step as never);
  const progress = step === "summary" || step === "account"
    ? 1
    : dataIdx >= 0 ? (dataIdx + 1) / DATA_STEPS.length : 0;

  // When labPanel changes after an upload:
  // - Labs step (showLabUpload): advance to next step — profile is incomplete, keep collecting
  // - Summary step (showUpload): profile is complete, go home
  const prevPanelId = useRef(labPanel?.id ?? null);
  useEffect(() => {
    const newId = labPanel?.id ?? null;
    if (newId && newId !== prevPanelId.current) {
      prevPanelId.current = newId;
      if (showLabUpload) {
        // Mid-onboarding upload — continue collecting the rest of the profile
        setShowLabUpload(false);
        setStep(STEPS[STEPS.indexOf("labs") + 1]); // advance to "basics"
      } else if (showUpload) {
        // Post-summary upload — full profile already saved, go to dashboard
        saveProfileLocally();
        router.push("/");
      }
    }
    prevPanelId.current = newId;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labPanel]);

  function toggle(list: string[], item: string, setter: (v: string[]) => void) {
    setter(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  }

  function next() { setStep(STEPS[stepIdx + 1]); }
  function back() { if (stepIdx > 0) setStep(STEPS[stepIdx - 1]); }

  function buildProfile(extra?: Record<string, string>) {
    return {
      name,
      goals,
      age:                 parseInt(age) || undefined,
      biologicalSex:       sex || undefined,
      heightFt:            parseInt(heightFt) || undefined,
      heightIn:            parseInt(heightIn) || 0,
      weightLbs:           parseInt(weightLbs) || undefined,
      occupation:          occupation || undefined,
      painPoint:           painPoints.join(", ") || undefined,
      timeHorizon:         timeHorizon || undefined,
      medications:         medications.filter(m => m !== "None"),
      familyHistory:       familyHistory.filter(f => f !== "None known"),
      activeConditions:    activeConditions.filter(c => c !== "None"),
      allergies:           allergies.filter(a => a !== "None known"),
      sleepHours:          sleepHours ?? undefined,
      sleepQuality:        sleepQuality ?? undefined,
      exerciseDaysPerWeek: exerciseDays || undefined,
      exerciseType:        exerciseTypes.length ? exerciseTypes.join(", ") : undefined,
      dietStyle:           dietStyle || undefined,
      stressLevel:         stressLevel ?? undefined,
      alcoholFrequency:    alcoholFrequency || undefined,
      caffeineIntake:      caffeineIntake || undefined,
      smokingStatus:       smokingStatus || undefined,
      symptoms,
      currentSupplements:  supplements.length ? supplements : undefined,
      notificationStyle:   notificationStyle || "direct",
      checkInTime,
      eveningReminderTime: eveningTime,
      ...extra,
    };
  }

  // Save to localStorage only (no account yet)
  function saveProfileLocally(extra?: Record<string, string>) {
    const profile = buildProfile(extra);
    setIntakeProfile(profile);
    setUser({ name, avatarInitials: name.slice(0, 2).toUpperCase() });
  }

  // Fetch AI summary when summary step reached
  useEffect(() => {
    if (step !== "summary") return;
    setSummaryLoading(true);
    fetch("/api/intake-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intakeProfile: buildProfile() }),
    })
      .then(r => r.json())
      .then(({ summary }) => setSummaryText(summary ?? ""))
      .catch(() => setSummaryText(""))
      .finally(() => setSummaryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Create account + save profile to Supabase
  async function handleCreateAccount() {
    if (!email.trim() || password.length < 6) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const supabase = createClient();

      // Check if already authenticated (e.g. returning user routed here after login)
      const { data: { user: existingUser } } = await supabase.auth.getUser();

      if (!existingUser) {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) {
          // Already registered — try sign in instead
          if (error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("registered")) {
            const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (signInErr) { setAuthError("Wrong password for this email."); setAuthLoading(false); return; }
          } else {
            setAuthError(error.message);
            setAuthLoading(false);
            return;
          }
        }
      }

      // Save profile locally then sync to Supabase (syncPatient detects auth session)
      saveProfileLocally({ intakeSummary: summaryText });
      await syncPatient();
      router.push("/");
    } catch {
      setAuthError("Connection error. Please try again.");
      setAuthLoading(false);
    }
  }

  function skipAccount() {
    saveProfileLocally({ intakeSummary: summaryText });
    router.push("/");
  }

  function startUpload() {
    saveProfileLocally({ intakeSummary: summaryText });
    setShowUpload(true);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const totalDataSteps = DATA_STEPS.length;

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: "var(--bg)" }}>

      {/* Progress bar */}
      {step !== "welcome" && (
        <div className="fixed top-0 left-0 right-0 z-50" style={{ maxWidth: 430, margin: "0 auto", height: 3, background: "var(--border)" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--accent)", transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
      )}

      {/* Back */}
      {step !== "welcome" && step !== "account" && !showUpload && (
        <button onClick={back} className="fixed top-5 left-5 z-50 w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <ArrowLeft size={15} color="var(--text2)" />
        </button>
      )}

      <div className="flex-1 flex flex-col px-6 pt-16 pb-10">

        {/* ── WELCOME ──────────────────────────────────────────────────── */}
        {step === "welcome" && (
          <div className="flex-1 flex flex-col justify-between step-enter">
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
                <p className="mt-4 text-[15px]" style={{ color: "var(--text2)", lineHeight: 1.7 }}>
                  BioPrecision turns your lab results into specific daily actions — and tells you what your physician doesn&apos;t have time to explain.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  "What each biomarker means — in plain English",
                  "5 daily actions tied to your specific numbers",
                  "An AI coach that knows your full chart",
                ].map(t => (
                  <div key={t} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-lo)" }}>
                      <Check size={11} color="var(--accent)" />
                    </div>
                    <p className="text-[13px]" style={{ color: "var(--text2)" }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 pt-6">
              <button className="btn-primary" onClick={next}>Get started <ChevronRight size={16} /></button>
              <p className="text-center text-[12px]" style={{ color: "var(--text3)" }}>Takes 4 minutes · No credit card required</p>
            </div>
          </div>
        )}

        {/* ── PAIN ─────────────────────────────────────────────────────── */}
        {step === "pain" && (
          <div className="flex-1 flex flex-col gap-5 step-enter">
            <StepHeader n={1} total={totalDataSteps} title="What brought you here?" sub="Select everything that applies." />
            <div className="flex-1 space-y-2 overflow-y-auto -mx-1 px-1">
              {PAIN_OPTIONS.map(o => {
                const on = painPoints.includes(o.id);
                return (
                  <SelectCard key={o.id} on={on} onClick={() => toggle(painPoints, o.id, setPainPoints)}>
                    <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>{o.label}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{o.sub}</p>
                  </SelectCard>
                );
              })}
            </div>
            <button className="btn-primary" onClick={next} disabled={painPoints.length === 0} style={{ opacity: painPoints.length ? 1 : 0.35 }}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── GOAL ─────────────────────────────────────────────────────── */}
        {step === "goal" && (
          <div className="flex-1 flex flex-col gap-5 step-enter">
            <StepHeader n={2} total={totalDataSteps} title="What are your goals?" sub="Pick everything you are working toward." />
            <div className="flex-1 space-y-2 overflow-y-auto -mx-1 px-1">
              {GOALS.map(g => {
                const on = goals.includes(g.id);
                return (
                  <SelectCard key={g.id} on={on} onClick={() => toggle(goals, g.id, setGoals)}>
                    <p className="text-[14px] font-semibold" style={{ color: "var(--text1)" }}>{g.label}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{g.sub}</p>
                  </SelectCard>
                );
              })}
            </div>
            {goals.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[13px] font-semibold" style={{ color: "var(--text2)" }}>How soon do you want results?</p>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_HORIZONS.map(t => (
                    <button key={t.id} onClick={() => setTimeHorizon(t.id)}
                      className="py-3 px-2 rounded-xl text-[12px] font-semibold text-center transition-all"
                      style={{ background: timeHorizon === t.id ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${timeHorizon === t.id ? "var(--accent)" : "var(--border)"}`, color: timeHorizon === t.id ? "#fff" : "var(--text2)" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button className="btn-primary" onClick={next} disabled={goals.length === 0} style={{ opacity: goals.length ? 1 : 0.35 }}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── BASICS ───────────────────────────────────────────────────── */}
        {step === "basics" && (
          <div className="flex-1 flex flex-col gap-6 step-enter">
            <StepHeader n={4} total={totalDataSteps} title="About you" sub="Personalizes your reference ranges and protocol." />
            <div className="flex-1 space-y-5 overflow-y-auto">
              <Field label="First name">
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your first name" style={fieldStyle} />
              </Field>
              <Field label="Age">
                <input type="number" value={age} onChange={e => setAge(e.target.value)}
                  placeholder="e.g. 38" style={fieldStyle} />
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
                <Field label="Height ft"><input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5" style={fieldStyle} /></Field>
                <Field label="Height in"><input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="10" style={fieldStyle} /></Field>
                <Field label="Weight lbs"><input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="175" style={fieldStyle} /></Field>
              </div>
              <Field label="Occupation type">
                <div className="space-y-2">
                  {OCCUPATION_OPTIONS.map(o => {
                    const on = occupation === o.id;
                    return (
                      <SelectCard key={o.id} on={on} onClick={() => setOccupation(o.id)} compact>
                        <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>{o.label}</p>
                        <p className="text-[11px]" style={{ color: "var(--text2)" }}>{o.sub}</p>
                      </SelectCard>
                    );
                  })}
                </div>
              </Field>
            </div>
            <button className="btn-primary" onClick={next} disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.35 }}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── MEDICAL ──────────────────────────────────────────────────── */}
        {step === "medical" && (
          <div className="flex-1 flex flex-col gap-5 step-enter">
            <StepHeader n={5} total={totalDataSteps} title="Medical context" sub="Helps us recommend safely — conditions and medications prevent inappropriate suggestions." />
            <div className="flex-1 space-y-5 overflow-y-auto">
              <ChipGroup label="Active medical conditions" items={ACTIVE_CONDITIONS}
                selected={activeConditions} onToggle={c => {
                  if (c === "None") { setActiveConditions(["None"]); return; }
                  toggle(activeConditions.filter(x => x !== "None"), c, setActiveConditions);
                }} />
              <ChipGroup label="Known allergies" items={ALLERGY_OPTIONS}
                selected={allergies} onToggle={a => {
                  if (a === "None known") { setAllergies(["None known"]); return; }
                  toggle(allergies.filter(x => x !== "None known"), a, setAllergies);
                }} />
              <ChipGroup label="Current medications" items={MEDICATIONS}
                selected={medications} onToggle={m => {
                  if (m === "None") { setMedications(["None"]); return; }
                  toggle(medications.filter(x => x !== "None"), m, setMedications);
                }} />
              <ChipGroup label="Family history" items={FAMILY_HISTORY}
                selected={familyHistory} onToggle={f => toggle(familyHistory, f, setFamilyHistory)} />
            </div>
            <button className="btn-primary" onClick={next}>Continue <ChevronRight size={16} /></button>
          </div>
        )}

        {/* ── HABITS ───────────────────────────────────────────────────── */}
        {step === "habits" && (
          <div className="flex-1 flex flex-col gap-5 step-enter">
            <StepHeader n={6} total={totalDataSteps} title="Your daily habits" sub="Your baseline — the protocol builds on top of this." />
            <div className="flex-1 space-y-5 overflow-y-auto">

              <HabitSection label="Hours of sleep per night">
                <div className="flex gap-2">
                  {SLEEP_OPTIONS.map(h => (
                    <button key={h} onClick={() => setSleepHours(h)} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                      style={{ background: sleepHours === h ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${sleepHours === h ? "var(--accent)" : "var(--border)"}`, color: sleepHours === h ? "#fff" : "var(--text2)" }}>
                      {h === 9 ? "9+" : h}
                    </button>
                  ))}
                </div>
              </HabitSection>

              <HabitSection label="Sleep quality">
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setSleepQuality(n)} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
                      style={{ background: sleepQuality === n ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${sleepQuality === n ? "var(--accent)" : "var(--border)"}`, color: sleepQuality === n ? "#fff" : "var(--text2)" }}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>Poor</span>
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>Excellent</span>
                </div>
              </HabitSection>

              <HabitSection label="Exercise frequency (per week)">
                <div className="grid grid-cols-4 gap-2">
                  {EXERCISE_OPTIONS.map(o => (
                    <button key={o.id} onClick={() => setExerciseDays(o.id)} className="py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{ background: exerciseDays === o.id ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${exerciseDays === o.id ? "var(--accent)" : "var(--border)"}`, color: exerciseDays === o.id ? "#fff" : "var(--text2)" }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </HabitSection>

              {exerciseDays && exerciseDays !== "0" && (
                <HabitSection label="Exercise type">
                  <ChipGroup items={EXERCISE_TYPES} selected={exerciseTypes}
                    onToggle={t => toggle(exerciseTypes, t, setExerciseTypes)} />
                </HabitSection>
              )}

              <HabitSection label="Diet style">
                <ChipGroup items={DIET_STYLES} selected={dietStyle ? [dietStyle] : []}
                  onToggle={d => setDietStyle(dietStyle === d ? "" : d)} />
              </HabitSection>

              <HabitSection label="Current stress level">
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setStressLevel(n)} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
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
                    <button key={o.id} onClick={() => setAlcoholFrequency(o.id)} className="py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{ background: alcoholFrequency === o.id ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${alcoholFrequency === o.id ? "var(--accent)" : "var(--border)"}`, color: alcoholFrequency === o.id ? "#fff" : "var(--text2)" }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </HabitSection>

              <HabitSection label="Caffeine intake">
                <div className="grid grid-cols-4 gap-2">
                  {CAFFEINE_OPTIONS.map(o => (
                    <button key={o.id} onClick={() => setCaffeineIntake(o.id)} className="py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{ background: caffeineIntake === o.id ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${caffeineIntake === o.id ? "var(--accent)" : "var(--border)"}`, color: caffeineIntake === o.id ? "#fff" : "var(--text2)" }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </HabitSection>

              <HabitSection label="Smoking / nicotine">
                <div className="grid grid-cols-3 gap-2">
                  {SMOKING_OPTIONS.map(o => (
                    <button key={o.id} onClick={() => setSmokingStatus(o.id)} className="py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                      style={{ background: smokingStatus === o.id ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${smokingStatus === o.id ? "var(--accent)" : "var(--border)"}`, color: smokingStatus === o.id ? "#fff" : "var(--text2)" }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </HabitSection>

              <HabitSection label="Current supplements">
                <ChipGroup items={["Vitamin D", "Magnesium", "Omega-3 / Fish oil", "Vitamin B12", "Zinc", "Creatine", "Protein powder", "Multivitamin", "Collagen", "Probiotics", "Ashwagandha", "NAD+ / NMN", "CoQ10", "Berberine"]}
                  selected={supplements} onToggle={s => toggle(supplements, s, setSupplements)} />
              </HabitSection>

            </div>
            <button className="btn-primary" onClick={next}>Continue <ChevronRight size={16} /></button>
          </div>
        )}

        {/* ── SYMPTOMS ─────────────────────────────────────────────────── */}
        {step === "symptoms" && (
          <div className="flex-1 flex flex-col gap-5 step-enter">
            <StepHeader n={7} total={totalDataSteps} title="What are you dealing with?" sub="Be thorough — the more you select, the more targeted your protocol." />
            <div className="flex-1 space-y-5 overflow-y-auto">
              {SYMPTOM_GROUPS.map(group => (
                <div key={group.group}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>{group.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map(s => {
                      const on = symptoms.includes(s);
                      return (
                        <button key={s} onClick={() => toggle(symptoms, s, setSymptoms)}
                          className="px-3.5 py-2 rounded-full text-[12px] font-medium transition-all"
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
          <div className="flex-1 flex flex-col gap-5 step-enter">
            <StepHeader n={8} total={totalDataSteps} title="Check-in preferences" sub="When should we prompt you each day?" />
            <div className="space-y-6">
              <div>
                <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--text2)" }}>Coaching style</p>
                <div className="space-y-2">
                  {NOTIFICATION_STYLES.map(o => {
                    const on = notificationStyle === o.id;
                    return (
                      <SelectCard key={o.id} on={on} onClick={() => setNotificationStyle(o.id)} compact>
                        <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>{o.label}</p>
                        <p className="text-[11px]" style={{ color: "var(--text2)" }}>{o.sub}</p>
                      </SelectCard>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text2)" }}>Morning check-in</p>
                <div className="flex gap-2">
                  {CHECK_IN_TIMES.map(t => (
                    <button key={t} onClick={() => setCheckInTime(t)} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
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
                    <button key={t} onClick={() => setEveningTime(t)} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                      style={{ background: eveningTime === t ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${eveningTime === t ? "var(--accent)" : "var(--border)"}`, color: eveningTime === t ? "#fff" : "var(--text2)" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn-primary" onClick={next}>Continue <ChevronRight size={16} /></button>
          </div>
        )}

        {/* ── LABS ─────────────────────────────────────────────────────── */}
        {step === "labs" && !showLabUpload && (
          <div className="flex-1 flex flex-col gap-6 step-enter">
            <StepHeader n={3} total={totalDataSteps} title="Connect your lab results" sub="Upload a PDF from Quest, LabCorp, or your doctor — or try sample data." />
            <div className="flex-1 flex flex-col gap-3">
              <div className="card px-4 py-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>Why it matters</p>
                {[
                  "Actions tied to your actual biomarker values, not estimates",
                  "Your AI coach references your exact numbers in every answer",
                  "We show what each marker means — and exactly how to move it",
                ].map(t => (
                  <div key={t} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "var(--accent-lo)" }}>
                      <Check size={10} color="var(--accent)" />
                    </div>
                    <p className="text-[13px]" style={{ color: "var(--text2)", lineHeight: 1.5 }}>{t}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowLabUpload(true)} className="btn-primary" style={{ paddingTop: 16, paddingBottom: 16 }}>
                <Upload size={16} /> Upload my labs
              </button>
              <button onClick={next} className="btn-ghost" style={{ color: "var(--accent)", fontWeight: 600 }}>
                Try with sample data first →
              </button>
              <button onClick={next} className="btn-ghost">I will add labs later</button>
            </div>
          </div>
        )}

        {step === "labs" && showLabUpload && (
          <div className="flex-1 flex flex-col gap-5 step-enter">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Labs</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>Upload your labs</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>PDF from Quest, LabCorp, Rupa, or your doctor.</p>
            </div>
            <div className="flex-1"><LabUpload /></div>
            <button className="btn-ghost" onClick={next}>Skip for now — I will upload later</button>
          </div>
        )}

        {/* ── SUMMARY ──────────────────────────────────────────────────── */}
        {step === "summary" && !showUpload && (
          <div className="flex-1 flex flex-col justify-between step-enter">
            <div className="flex-1 flex flex-col justify-center gap-6">
              {summaryLoading ? (
                <div className="flex flex-col items-center gap-5 py-8">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--border)" }} />
                    <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
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
                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>Your assessment</p>
                    <div className="card px-5 py-5">
                      <p className="text-[15px]" style={{ color: "var(--text1)", lineHeight: 1.75 }}>
                        {summaryText || `Welcome, ${name}. Based on what you have shared, we have a clear picture of where to start.`}
                      </p>
                    </div>
                  </div>
                  <div className="card px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text3)" }}>What happens next</p>
                    {[
                      { n: 1, t: "Upload your labs",        s: "AI parses every biomarker in 30 seconds" },
                      { n: 2, t: "Get your daily protocol", s: "5 specific actions tied to your exact numbers" },
                      { n: 3, t: "Check in daily",          s: "30-second morning check-in tracks your progress" },
                    ].map(item => (
                      <div key={item.n} className="flex items-start gap-3 mb-3 last:mb-0">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold" style={{ background: "var(--accent-lo)", color: "var(--accent)" }}>{item.n}</span>
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: "var(--text1)" }}>{item.t}</p>
                          <p className="text-[12px] mt-0.5" style={{ color: "var(--text2)" }}>{item.s}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {!summaryLoading && (
              <div className="space-y-3 pt-4">
                <button
                  onClick={() => setConsentChecked(c => !c)}
                  className="w-full flex items-start gap-3 text-left"
                >
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                    style={{ background: consentChecked ? "var(--accent)" : "transparent", border: `1.5px solid ${consentChecked ? "var(--accent)" : "var(--border)"}` }}>
                    {consentChecked && <Check size={11} color="white" />}
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--text3)" }}>
                    I understand BioPrecision provides evidence-based suggestions for educational purposes only, not medical advice. I will consult a licensed clinician before making significant changes to my health routine.
                  </p>
                </button>
                <button className="btn-primary" onClick={next} disabled={!consentChecked} style={{ opacity: consentChecked ? 1 : 0.35 }}>
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {step === "summary" && showUpload && (
          <div className="flex-1 flex flex-col gap-5 step-enter">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Final step</p>
              <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>Upload your labs</h2>
              <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>PDF from Quest, LabCorp, Rupa, or your doctor.</p>
            </div>
            <div className="flex-1"><LabUpload /></div>
            <button className="btn-ghost" onClick={() => { saveProfileLocally({ intakeSummary: summaryText }); router.push("/"); }}>
              Skip for now
            </button>
          </div>
        )}

        {/* ── ACCOUNT CREATION ─────────────────────────────────────────── */}
        {step === "account" && (
          <div className="flex-1 flex flex-col justify-between step-enter">
            <div className="flex-1 flex flex-col justify-center gap-6">
              <div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "var(--accent-lo)", border: "1px solid var(--accent-mid)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
                  </svg>
                </div>
                <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>
                  Save your protocol
                </h2>
                <p className="text-[14px] mt-2" style={{ color: "var(--text2)", lineHeight: 1.6 }}>
                  Create an account to access your results from any device and track your progress over time.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  style={fieldStyle}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a password (6+ characters)"
                  minLength={6}
                  style={fieldStyle}
                />
                {authError && (
                  <div className="rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)" }}>
                    <p className="text-[12px]" style={{ color: "var(--red)" }}>{authError}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCreateAccount}
                  disabled={!email.trim() || password.length < 6 || authLoading}
                  className="btn-primary disabled:opacity-40"
                >
                  {authLoading
                    ? <><Loader2 size={15} className="animate-spin" /> Creating account...</>
                    : <>Create account <ChevronRight size={16} /></>}
                </button>

                <button onClick={startUpload} className="btn-ghost" disabled={authLoading}>
                  <Upload size={15} /> Upload labs first
                </button>

                <button onClick={skipAccount} className="w-full text-center text-[13px] py-2" style={{ color: "var(--text3)" }} disabled={authLoading}>
                  Skip for now — use without an account
                </button>
              </div>

              <p className="text-center text-[11px]" style={{ color: "var(--text3)" }}>
                Already have an account?{" "}
                <button onClick={() => router.push("/auth/login")} className="font-semibold" style={{ color: "var(--accent)" }}>
                  Sign in
                </button>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function StepHeader({ n, total, title, sub }: { n: number; total: number; title: string; sub: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>Step {n} of {total}</p>
      <h2 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.025em" }}>{title}</h2>
      <p className="text-[14px] mt-1.5" style={{ color: "var(--text2)" }}>{sub}</p>
    </div>
  );
}

function SelectCard({ on, onClick, children, compact = false }: {
  on: boolean; onClick: () => void; children: React.ReactNode; compact?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-between text-left transition-all rounded-2xl ${compact ? "px-4 py-3" : "px-4 py-4"}`}
      style={{ background: on ? "var(--accent-lo)" : "var(--surface)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}` }}>
      <div className="flex-1 min-w-0">{children}</div>
      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 transition-all"
        style={{ borderColor: on ? "var(--accent)" : "var(--border)", background: on ? "var(--accent)" : "transparent" }}>
        {on && <Check size={11} color="white" />}
      </div>
    </button>
  );
}

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

function ChipGroup({ label, items, selected, onToggle }: {
  label?: string; items: string[]; selected: string[]; onToggle: (item: string) => void;
}) {
  return (
    <div>
      {label && <p className="text-[13px] font-semibold mb-2.5" style={{ color: "var(--text2)" }}>{label}</p>}
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const on = selected.includes(item);
          return (
            <button key={item} onClick={() => onToggle(item)}
              className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all"
              style={{ background: on ? "var(--accent-lo)" : "var(--surface)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`, color: on ? "var(--accent)" : "var(--text2)" }}>
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 15,
  outline: "none", background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--text1)",
};
