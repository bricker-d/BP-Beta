import Anthropic from "@anthropic-ai/sdk";
import { LabPanel, WearableData } from "@/lib/types";
import { saveChatMessage } from "@/lib/supabase";

// Lazy client — only instantiated on first request so missing key gives a clear 503
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface IntakeProfile {
  name?: string;
  goals?: string[];
  age?: number;
  biologicalSex?: string;
  heightFt?: number;
  heightIn?: number;
  weightLbs?: number;
  symptoms?: string[];
  symptomsOther?: string;
  wearableSource?: string;
}

// ── Biomarker reference data (mirrors mobile/lib/biomarkers.ts) ──────────────
// Kept here so the system prompt can render full clinical context without
// requiring the mobile lib to be imported into the Next.js API.
const BIOMARKER_META: Record<string, {
  name: string;
  category: string;
  unit: string;
  description: string;
  mechanismSummary: string;
  optimalRange: string;       // human-readable, e.g. "70–99 mg/dL"
  borderlineRange: string;
  elevatedRange: string;
  lowRange?: string;
  goalRelevance: Record<string, string>; // goal key → why it matters
  keyInterventions: string[];            // evidence-based levers
}> = {
  glucose: {
    name: "Fasting Glucose",
    category: "Metabolic",
    unit: "mg/dL",
    description: "Primary marker of blood sugar regulation and insulin sensitivity.",
    mechanismSummary: "Elevated fasting glucose indicates reduced insulin sensitivity or insufficient insulin secretion, driving glycation, inflammation, and mitochondrial stress.",
    optimalRange: "70–99 mg/dL",
    borderlineRange: "100–125 mg/dL (pre-diabetic zone)",
    elevatedRange: "≥126 mg/dL (diabetic threshold)",
    lowRange: "<70 mg/dL (hypoglycemia risk)",
    goalRelevance: {
      longevity: "Chronic hyperglycemia accelerates AGE formation and vascular aging — one of the strongest predictors of healthspan.",
      weight_loss: "Elevated glucose drives insulin secretion and fat storage; lowering it is foundational to fat loss.",
      energy: "Glucose volatility (spikes/crashes) is a primary driver of energy fluctuations and brain fog.",
      mental_clarity: "The brain is acutely sensitive to glucose dysregulation; stable glucose improves focus and cognition.",
      heart_health: "Pre-diabetes doubles cardiovascular risk independent of other factors.",
    },
    keyInterventions: [
      "Time-restricted eating (16:8) — reduces fasting glucose 4–8 mg/dL in RCTs",
      "30-min post-meal walks — blunts postprandial glucose spikes by ~30%",
      "Resistance training 2–3×/week — increases GLUT4 expression in muscle",
      "Reduce refined carbohydrates and added sugars",
      "Magnesium glycinate 200–400mg — improves insulin sensitivity (meta-analysis, n=2,582)",
      "Berberine 500mg 2–3× daily — comparable to metformin in multiple RCTs",
      "Quality sleep (7–9hrs) — even one night of poor sleep raises next-day glucose ~13%",
    ],
  },
  hba1c: {
    name: "HbA1c",
    category: "Metabolic",
    unit: "%",
    description: "3-month average blood sugar; gold standard for long-term glycemic control.",
    mechanismSummary: "Reflects cumulative glycation of hemoglobin — each 1% rise above 5.5% roughly doubles cardiovascular and neuropathy risk over a decade.",
    optimalRange: "4.8–5.4%",
    borderlineRange: "5.5–5.6% (early dysregulation)",
    elevatedRange: "≥5.7% (pre-diabetic), ≥6.5% (diabetic)",
    goalRelevance: {
      longevity: "HbA1c below 5.4% is consistently associated with lowest all-cause mortality in large cohort studies.",
      weight_loss: "Lowering HbA1c reflects genuine metabolic improvement, not just weight loss.",
      heart_health: "Each 1% reduction in HbA1c reduces cardiovascular events by ~14%.",
    },
    keyInterventions: [
      "Low-glycemic diet — reduces HbA1c 0.3–0.5% over 3 months",
      "Consistent aerobic exercise — reduces HbA1c ~0.7% (Cochrane review)",
      "Reduce alcohol (raises HbA1c via glycation independent of glucose)",
      "Cinnamon 1–6g/day — modest but consistent reductions in multiple trials",
    ],
  },
  totalCholesterol: {
    name: "Total Cholesterol",
    category: "Lipid",
    unit: "mg/dL",
    description: "Sum of all cholesterol-carrying particles. Context-dependent — must be interpreted with LDL, HDL, and triglycerides.",
    mechanismSummary: "Total cholesterol alone is a poor risk predictor; the LDL/HDL ratio and particle counts are far more informative.",
    optimalRange: "150–199 mg/dL",
    borderlineRange: "200–239 mg/dL",
    elevatedRange: "≥240 mg/dL",
    goalRelevance: {
      heart_health: "Elevated total cholesterol, especially with high LDL-P, accelerates atherosclerosis.",
      longevity: "Very low total cholesterol (<150) is also associated with increased all-cause mortality.",
    },
    keyInterventions: [
      "Replace saturated fat with monounsaturated fat (olive oil, avocado)",
      "Soluble fiber 5–10g/day — reduces LDL ~5% (oats, psyllium)",
      "Plant sterols 2g/day — reduces LDL 8–10%",
      "Aerobic exercise raises HDL and reduces LDL",
    ],
  },
  ldl: {
    name: "LDL Cholesterol",
    category: "Lipid",
    unit: "mg/dL",
    description: "Low-density lipoprotein — primary atherogenic particle carrier.",
    mechanismSummary: "LDL particles penetrate arterial walls and oxidize, initiating plaque formation. LDL particle number (LDL-P) is more predictive than LDL-C concentration.",
    optimalRange: "<100 mg/dL (optimal), <70 mg/dL (ideal for high CV risk)",
    borderlineRange: "100–129 mg/dL",
    elevatedRange: "≥130 mg/dL",
    goalRelevance: {
      heart_health: "LDL is the single most modifiable causal risk factor for atherosclerosis — decades of evidence from Mendelian randomization and RCTs.",
      longevity: "Lower lifetime LDL burden is consistently associated with reduced all-cause and CV mortality.",
    },
    keyInterventions: [
      "Reduce saturated fat to <7% of calories — reduces LDL 8–10%",
      "Soluble fiber (psyllium, oats) — reduces LDL 5–7%",
      "Red yeast rice 1,200–2,400mg — reduces LDL 15–25% (contains monacolin K)",
      "Omega-3 fatty acids — minimal LDL effect but reduces triglycerides and inflammation",
      "Eliminate trans fats completely",
    ],
  },
  hdl: {
    name: "HDL Cholesterol",
    category: "Lipid",
    unit: "mg/dL",
    description: "High-density lipoprotein — reverse cholesterol transport; cardioprotective.",
    mechanismSummary: "HDL facilitates reverse cholesterol transport from arteries back to liver. Functionality matters as much as quantity — HDL can become dysfunctional in chronic inflammation.",
    optimalRange: ">60 mg/dL (men), >65 mg/dL (women)",
    borderlineRange: "40–59 mg/dL",
    lowRange: "<40 mg/dL (men) or <50 mg/dL (women) — increased CV risk",
    elevatedRange: "",
    goalRelevance: {
      heart_health: "Low HDL is an independent risk factor for coronary artery disease.",
      longevity: "Higher HDL is associated with longevity in multiple population studies.",
      exercise: "Exercise is one of the most reliable ways to raise HDL.",
    },
    keyInterventions: [
      "Aerobic exercise — raises HDL 3–9% (most reliable non-pharmacologic intervention)",
      "Eliminate smoking — raises HDL significantly within weeks",
      "Replace refined carbohydrates with healthy fats",
      "Moderate alcohol has a mild HDL-raising effect but benefits are outweighed by risks",
      "Niacin — raises HDL but has significant side effects; discuss with doctor",
    ],
  },
  triglycerides: {
    name: "Triglycerides",
    category: "Lipid",
    unit: "mg/dL",
    description: "Blood fat concentration — primary marker of metabolic health and dietary carbohydrate/alcohol intake.",
    mechanismSummary: "Elevated triglycerides reflect hepatic overproduction from excess carbohydrates, alcohol, or insulin resistance. They promote small dense LDL particles, which are more atherogenic.",
    optimalRange: "<100 mg/dL (optimal), <150 mg/dL (acceptable)",
    borderlineRange: "150–199 mg/dL",
    elevatedRange: "200–499 mg/dL (high), ≥500 mg/dL (very high — pancreatitis risk)",
    goalRelevance: {
      heart_health: "Triglycerides/HDL ratio >3.0 is a strong predictor of insulin resistance and CV disease.",
      weight_loss: "Triglycerides are among the most responsive lipid markers to dietary carbohydrate reduction.",
      longevity: "Elevated triglycerides in the presence of normal LDL is a common pattern in metabolic syndrome.",
    },
    keyInterventions: [
      "Reduce refined carbohydrates and added sugars — most potent intervention (−20–50%)",
      "Eliminate alcohol or reduce to <1 drink/day",
      "Omega-3 fatty acids 2–4g EPA+DHA — reduces triglycerides 20–30% (FDA-approved for hypertriglyceridemia)",
      "Weight loss of 5–10% body weight reduces triglycerides 20%",
      "Aerobic exercise — reduces triglycerides 10–20%",
    ],
  },
  hscrp: {
    name: "hs-CRP",
    category: "Inflammatory",
    unit: "mg/L",
    description: "High-sensitivity C-reactive protein — primary marker of systemic inflammation.",
    mechanismSummary: "CRP is produced by the liver in response to cytokines (IL-6, TNF-α). Chronic low-grade elevation drives endothelial dysfunction, insulin resistance, and accelerated aging.",
    optimalRange: "<0.5 mg/L (optimal), <1.0 mg/L (low risk)",
    borderlineRange: "1.0–3.0 mg/L (moderate risk)",
    elevatedRange: ">3.0 mg/L (high risk); >10 mg/L may indicate acute infection/illness",
    goalRelevance: {
      longevity: "Chronic inflammation is a central hallmark of aging (inflammaging). CRP is one of the strongest predictors of all-cause mortality in prospective studies.",
      heart_health: "hs-CRP >3.0 mg/L doubles CV risk independent of LDL — the JUPITER trial showed statins benefit even normal-LDL patients with high CRP.",
      mental_clarity: "Neuroinflammation driven by systemic CRP is increasingly linked to cognitive decline and depression.",
      energy: "Chronic inflammation drives fatigue via cytokine-mediated mitochondrial suppression.",
    },
    keyInterventions: [
      "Omega-3 fatty acids 2–4g EPA+DHA/day — reduces CRP 20–30% in meta-analyses",
      "Mediterranean diet adherence — reduces CRP ~30% (PREDIMED trial)",
      "Resistance training — reduces IL-6 and downstream CRP",
      "Sleep optimization (7–9hrs) — even one week of restricted sleep raises CRP significantly",
      "Reduce ultra-processed food, refined seed oils, and added sugar",
      "Curcumin with piperine 500–1000mg/day — reduces CRP in multiple RCTs",
      "Weight loss if overweight — adipose tissue secretes inflammatory cytokines",
    ],
  },
  vitaminD: {
    name: "Vitamin D (25-OH)",
    category: "Vitamin",
    unit: "ng/mL",
    description: "Fat-soluble vitamin and hormone precursor — involved in 2,000+ gene expression pathways.",
    mechanismSummary: "Vitamin D acts as a transcription factor affecting immunity, calcium metabolism, insulin secretion, and muscle function. Deficiency is rampant (>40% of US adults) due to limited sun exposure.",
    optimalRange: "50–80 ng/mL (functional optimum)",
    borderlineRange: "30–49 ng/mL (insufficient)",
    lowRange: "<30 ng/mL (deficient), <20 ng/mL (severe deficiency)",
    elevatedRange: ">100 ng/mL (toxicity risk)",
    goalRelevance: {
      longevity: "Vitamin D deficiency is associated with 35% higher all-cause mortality in large meta-analyses.",
      energy: "Deficiency impairs mitochondrial function and is one of the most common reversible causes of fatigue.",
      muscle_gain: "Vitamin D receptors in muscle regulate protein synthesis and muscle fiber composition.",
      mental_clarity: "Deficiency is strongly associated with depression, cognitive decline, and seasonal mood disorders.",
      hormone_balance: "Vitamin D regulates testosterone synthesis; deficiency is associated with low testosterone in men.",
    },
    keyInterventions: [
      "Vitamin D3 supplementation with K2 — typical dose 2,000–5,000 IU/day depending on baseline",
      "Take with fat-containing meal for optimal absorption",
      "Retest in 90 days to confirm response",
      "Magnesium is required for Vitamin D activation — supplement together",
      "Sun exposure 15–30 min/day on large skin areas when possible",
    ],
  },
  testosterone: {
    name: "Total Testosterone",
    category: "Hormone",
    unit: "ng/dL",
    description: "Primary anabolic and androgenic hormone — critical for muscle, energy, libido, and metabolic health in both sexes.",
    mechanismSummary: "Testosterone drives protein synthesis, red blood cell production, bone density, and insulin sensitivity. Levels decline ~1–2%/year after 30. Functional deficiency often occurs even with 'normal' ranges due to high SHBG.",
    optimalRange: "600–900 ng/dL (men), 50–150 ng/dL (women)",
    borderlineRange: "350–599 ng/dL (men) — functional deficiency zone",
    lowRange: "<350 ng/dL (men), <50 ng/dL (women)",
    elevatedRange: ">1,000 ng/dL (men) — investigate cause",
    goalRelevance: {
      muscle_gain: "Testosterone is the primary driver of muscle protein synthesis — below 500 ng/dL in men significantly impairs gains.",
      energy: "Low testosterone is one of the most common causes of fatigue, low motivation, and brain fog.",
      longevity: "Low testosterone is associated with increased all-cause mortality, metabolic syndrome, and cardiovascular risk.",
      hormone_balance: "Testosterone balance with estrogen and SHBG is critical for vitality in both sexes.",
      weight_loss: "Low testosterone promotes fat accumulation, particularly visceral fat, creating a vicious cycle.",
    },
    keyInterventions: [
      "Resistance training 3–4×/week — most reliable natural testosterone stimulus",
      "Sleep 7–9hrs — 60% of daily testosterone release occurs during sleep",
      "Reduce chronic stress (cortisol suppresses testosterone via HPA-HPG axis interference)",
      "Zinc 15–30mg/day if deficient — zinc is required for testosterone synthesis",
      "Vitamin D optimization — D deficiency strongly correlates with low T",
      "Maintain healthy body fat (10–20% in men) — adipose aromatizes testosterone to estrogen",
      "Minimize alcohol — even moderate drinking suppresses testosterone production",
    ],
  },
  cortisol: {
    name: "Cortisol (AM)",
    category: "Hormone",
    unit: "mcg/dL",
    description: "Primary stress hormone — regulates metabolism, immune response, and circadian rhythm.",
    mechanismSummary: "AM cortisol should peak within 30 minutes of waking (cortisol awakening response). Chronically elevated cortisol drives muscle catabolism, fat accumulation, immune suppression, and HPA axis dysregulation.",
    optimalRange: "10–18 mcg/dL (6–8 AM)",
    borderlineRange: "18–23 mcg/dL (borderline high) or 7–9 mcg/dL (borderline low)",
    elevatedRange: ">23 mcg/dL (investigate adrenal/pituitary cause)",
    lowRange: "<7 mcg/dL (possible adrenal insufficiency — requires MD evaluation)",
    goalRelevance: {
      energy: "Both high and low cortisol cause fatigue — high cortisol disrupts sleep and crashes energy; low cortisol causes persistent exhaustion.",
      muscle_gain: "Chronically elevated cortisol is catabolic — it breaks down muscle tissue and blocks protein synthesis.",
      mental_clarity: "Cortisol excess causes hippocampal atrophy and impairs memory consolidation.",
      longevity: "Cortisol dysregulation is central to accelerated aging, metabolic syndrome, and immune dysfunction.",
      hormone_balance: "Cortisol competes with progesterone and suppresses testosterone via shared precursors.",
    },
    keyInterventions: [
      "Consistent sleep-wake schedule — regulates the cortisol awakening response",
      "Mindfulness/meditation 10–20 min/day — reduces cortisol 14–26% in RCTs",
      "Limit caffeine after noon — blunts the afternoon cortisol suppression cycle",
      "Ashwagandha 300–600mg KSM-66 extract — reduces cortisol 27% in RCTs (Chandrasekhar 2012)",
      "Reduce overtraining — excessive exercise volume spikes cortisol without adequate recovery",
      "Phosphatidylserine 400mg — reduces exercise-induced cortisol spike",
    ],
  },
  ferritin: {
    name: "Ferritin",
    category: "Metabolic",
    unit: "ng/mL",
    description: "Iron storage protein — both a marker of iron status and an acute-phase inflammatory marker.",
    mechanismSummary: "Low ferritin indicates depleted iron stores (even when hemoglobin is normal) impairing oxygen transport, mitochondrial function, and thyroid enzyme activity. High ferritin can indicate iron overload or inflammation.",
    optimalRange: "50–150 ng/mL (men), 40–100 ng/mL (women)",
    borderlineRange: "20–49 ng/mL — early depletion",
    lowRange: "<20 ng/mL — iron deficiency (pre-anemia); <12 ng/mL — frank deficiency",
    elevatedRange: ">200 ng/mL (women), >300 ng/mL (men) — investigate hemochromatosis or inflammation",
    goalRelevance: {
      energy: "Low ferritin is one of the most common and reversible causes of persistent fatigue, especially in premenopausal women.",
      muscle_gain: "Iron is required for myoglobin synthesis and mitochondrial electron transport — low ferritin directly limits exercise capacity.",
      mental_clarity: "Iron deficiency impairs neurotransmitter synthesis (dopamine, serotonin) and myelination.",
    },
    keyInterventions: [
      "Iron-rich foods: red meat, organ meat, shellfish (heme iron has 15–35% absorption vs 2–5% non-heme)",
      "Vitamin C 200mg with iron-rich meals — enhances non-heme iron absorption 3-fold",
      "Avoid calcium, coffee, or tea within 1 hour of iron intake (competitive absorption)",
      "If supplementing: ferrous bisglycinate is best tolerated with least GI side effects",
      "Investigate underlying cause if persistently low (celiac, heavy periods, occult bleeding)",
    ],
  },
  tsh: {
    name: "TSH",
    category: "Hormone",
    unit: "mIU/L",
    description: "Thyroid-stimulating hormone — pituitary signal that controls thyroid hormone production.",
    mechanismSummary: "TSH is the primary screening marker for thyroid dysfunction. It follows an inverse relationship with thyroid output — high TSH means the pituitary is working hard to stimulate an underperforming thyroid.",
    optimalRange: "0.5–2.0 mIU/L (functional optimum)",
    borderlineRange: "2.0–4.5 mIU/L (subclinical hypothyroidism zone)",
    elevatedRange: ">4.5 mIU/L (hypothyroidism); consider testing free T3/T4",
    lowRange: "<0.5 mIU/L (hyperthyroidism or over-replacement)",
    goalRelevance: {
      energy: "Subclinical hypothyroidism (TSH 2.5–4.5) is an extremely common cause of fatigue, weight gain, and brain fog that is frequently undertreated.",
      weight_loss: "Thyroid hormones set the metabolic rate — even mildly elevated TSH can reduce BMR 10–15%.",
      mental_clarity: "Thyroid affects every cell — cognitive dysfunction is a hallmark of hypothyroidism.",
      hormone_balance: "Thyroid dysfunction cascades through all hormonal systems including sex hormones and adrenals.",
    },
    keyInterventions: [
      "Selenium 200mcg/day — required for T4→T3 conversion; deficiency impairs thyroid function",
      "Iodine adequacy (but not excess) — required for thyroid hormone synthesis",
      "Reduce chronic stress — cortisol inhibits TSH secretion and T4→T3 conversion",
      "Avoid goitrogenic foods in large raw quantities if deficient (kale, broccoli) — less relevant when cooked",
      "Test free T3, free T4, and thyroid antibodies if TSH is borderline",
      "Rule out selenium and zinc deficiency before assuming primary thyroid disease",
    ],
  },
};

// ── Compute BMI from intake ───────────────────────────────────────────────────
function computeBMI(profile: IntakeProfile): string {
  if (!profile.heightFt && !profile.heightIn && !profile.weightLbs) return "";
  const totalInches = (profile.heightFt ?? 0) * 12 + (profile.heightIn ?? 0);
  if (totalInches === 0 || !profile.weightLbs) return "";
  const bmi = (profile.weightLbs / (totalInches * totalInches)) * 703;
  const cat = bmi < 18.5 ? "underweight" : bmi < 25 ? "normal weight" : bmi < 30 ? "overweight" : "obese";
  return `BMI ${bmi.toFixed(1)} (${cat})`;
}

// ── Build the system prompt ───────────────────────────────────────────────────
function buildSystemPrompt(
  labPanel?: LabPanel,
  wearableData?: WearableData,
  intakeProfile?: IntakeProfile
): string {
  const patientName = intakeProfile?.name?.split(" ")[0] ?? "the user";

  // ── 1. IDENTITY & ROLE ────────────────────────────────────────────────────
  let prompt = `You are BioPrecision AI — a personalized health intelligence coach for ${patientName}.

Your role: interpret biomarker lab results and lifestyle data to deliver evidence-based, mechanistically grounded, actionable health guidance. You are not a physician and never diagnose or prescribe. You educate, explain, and recommend — always grounded in peer-reviewed evidence, always personalized to this patient's specific data and goals.

## Core Principles
- Every recommendation must cite the mechanism (WHY it works biologically)
- Every recommendation must connect back to the patient's specific lab values and goals
- Distinguish between high-evidence interventions (multiple RCTs, meta-analyses) and lower-evidence ones
- Be direct and specific — no vague platitudes ("eat well, exercise more")
- Acknowledge complexity when it exists; flag when something requires physician supervision
- Never extrapolate beyond what the data supports
- Keep responses focused: answer what was asked, then add the single most important related insight
`;

  // ── 2. PATIENT PROFILE ────────────────────────────────────────────────────
  if (intakeProfile) {
    const age    = intakeProfile.age    ? `${intakeProfile.age} years old` : "age not specified";
    const sex    = intakeProfile.biologicalSex ?? "sex not specified";
    const goals  = intakeProfile.goals?.join(", ") ?? "none specified";
    const bmi    = computeBMI(intakeProfile);
    const height = intakeProfile.heightFt
      ? `${intakeProfile.heightFt}'${intakeProfile.heightIn ?? 0}"`
      : "";
    const weight  = intakeProfile.weightLbs ? `${intakeProfile.weightLbs} lbs` : "";
    const symptoms = intakeProfile.symptoms
      ?.filter(s => s !== "none")
      .join(", ") ?? "none";
    const symptomsExtra = intakeProfile.symptomsOther ?? "";
    const wearable = intakeProfile.wearableSource ?? "none";

    prompt += `
## Patient Profile
- Name: ${patientName}
- Age/Sex: ${age}, ${sex}
- Body: ${height} ${weight} ${bmi ? "— " + bmi : ""}
- Health goals: ${goals}
- Reported symptoms: ${symptoms}${symptomsExtra ? " (additional: " + symptomsExtra + ")" : ""}
- Wearable device: ${wearable}
`;
  }

  // ── 3. LAB RESULTS — FULL CLINICAL CONTEXT ───────────────────────────────
  if (labPanel && labPanel.biomarkers.length > 0) {
    prompt += `
## Lab Results (${labPanel.date ? new Date(labPanel.date).toLocaleDateString() : "recent"}, source: ${labPanel.source ?? "uploaded"})

The following table shows each biomarker with full clinical context. Use this data to ground all responses in the patient's actual numbers.

| Biomarker | Value | Unit | Status | Optimal Range | Clinical Significance |
|-----------|-------|------|--------|---------------|----------------------|
`;

    for (const b of labPanel.biomarkers) {
      const meta = BIOMARKER_META[b.id];
      const optRange  = meta?.optimalRange  ?? "see reference";
      const clinicalNote = meta?.mechanismSummary ?? "";
      prompt += `| ${meta?.name ?? b.id} | ${b.value} | ${b.unit} | ${b.status.toUpperCase()} | ${optRange} | ${clinicalNote} |
`;
    }

    // Flag out-of-range markers explicitly
    const flagged = labPanel.biomarkers.filter(b => b.status !== "optimal");
    if (flagged.length > 0) {
      prompt += `
### Out-of-Range Markers Requiring Attention
`;
      for (const b of flagged) {
        const meta = BIOMARKER_META[b.id];
        if (!meta) continue;

        // Find goal-relevant context
        const goals = intakeProfile?.goals ?? [];
        const relevantGoals = goals
          .filter(g => meta.goalRelevance[g])
          .map(g => `${g}: ${meta.goalRelevance[g]}`)
          .join("; ");

        prompt += `
**${meta.name}: ${b.value} ${b.unit} (${b.status.toUpperCase()})**
- Optimal range: ${meta.optimalRange}
- Current range classification: ${b.status === "elevated" ? meta.elevatedRange : b.status === "low" ? (meta.lowRange ?? "below optimal") : meta.borderlineRange}
- Mechanism: ${meta.mechanismSummary}
- Relevance to patient's goals: ${relevantGoals || "general health impact"}
- Evidence-based interventions:
${meta.keyInterventions.map(i => "  • " + i).join("\n")}
`;
      }
    }

    // Summarize optimal markers briefly
    const optimal = labPanel.biomarkers.filter(b => b.status === "optimal");
    if (optimal.length > 0) {
      prompt += `
### Optimal Markers (maintain current approach)
${optimal.map(b => `- ${BIOMARKER_META[b.id]?.name ?? b.id}: ${b.value} ${b.unit} ✓`).join("\n")}
`;
    }
  }

  // ── 4. WEARABLE DATA ─────────────────────────────────────────────────────
  if (wearableData) {
    const hrvInterp = wearableData.hrv > 60
      ? "good autonomic recovery"
      : wearableData.hrv > 40
      ? "moderate — consider recovery focus"
      : "low — high stress load or poor recovery";

    const sleepInterp = wearableData.sleepDuration >= 7.5
      ? "adequate"
      : wearableData.sleepDuration >= 6.5
      ? "borderline — 1 hr short of optimal"
      : "insufficient — significant health and recovery impact";

    prompt += `
## Wearable Data (7-day avg, ${wearableData.source})
- Daily Steps: ${wearableData.dailySteps.toLocaleString()} (${wearableData.dailySteps >= 8000 ? "good — mortality curve flattens above 8k" : "below the 8,000-step threshold where benefits plateau"})
- Sleep Duration: ${wearableData.sleepDuration} hrs — ${sleepInterp}
- Resting Heart Rate: ${wearableData.restingHeartRate} bpm (${wearableData.restingHeartRate < 60 ? "athlete-level" : wearableData.restingHeartRate < 70 ? "good" : wearableData.restingHeartRate < 80 ? "average" : "elevated — cardiovascular or stress signal"})
- HRV (RMSSD): ${wearableData.hrv} ms (${wearableData.hrvTrend > 0 ? "+" : ""}${wearableData.hrvTrend}% trend) — ${hrvInterp}
`;
  }

  // ── 5. REASONING FRAMEWORK ───────────────────────────────────────────────
  prompt += `
## How to Respond

**When asked about a specific biomarker or symptom:**
1. State the patient's current value and what it means clinically
2. Explain the biological mechanism in 2–3 sentences (accessible language)
3. Connect it explicitly to their stated goals
4. Give 2–3 specific, high-evidence interventions with expected effect sizes where known
5. Flag if anything requires physician supervision

**When asked for an overall health summary:**
1. Start with the 1–2 most impactful out-of-range markers given their goals
2. Identify any patterns across markers (e.g., metabolic syndrome cluster, inflammation + cortisol)
3. Give a prioritized action list — highest leverage first
4. End with what's working (optimal markers) so they see the full picture

**When asked about interventions (supplements, diet, exercise):**
1. State the mechanism of action
2. Cite the level of evidence (RCT, meta-analysis, observational)
3. Give specific dosing/protocol where applicable
4. Note contraindications or when to consult a doctor

**Always:**
- Reference the patient's actual numbers, not generic ranges
- Use ${patientName}'s name naturally in responses
- Be encouraging but honest — don't downplay concerning results
- Never diagnose, prescribe, or recommend stopping medications
- If a value is severely abnormal, recommend they discuss with their physician
`;

  return prompt;
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { messages, labPanel, wearableData, intakeProfile, todaysActions, patientId } = await req.json();
    let fullResponse = "";

    let systemPrompt = buildSystemPrompt(labPanel, wearableData, intakeProfile);

    // Agent 3 synthesis: inject today's actions so the coach knows what the patient is working on
    if (todaysActions && Array.isArray(todaysActions) && todaysActions.length > 0) {
      const completed = todaysActions.filter((a: { completed: boolean }) => a.completed);
      const pending = todaysActions.filter((a: { completed: boolean }) => !a.completed);
      systemPrompt += `
## Today's Action Plan (Daily Actions Agent)
Reference these naturally — you know exactly what the patient is working on today.

Pending (${pending.length}):
${pending.map((a: { title: string; targetBiomarkers: string[]; biomarkerTarget?: string }) =>
  `- ${a.title} → targets: ${a.targetBiomarkers.join(", ")}${a.biomarkerTarget ? ` (${a.biomarkerTarget})` : ""}`
).join("\n")}
${completed.length > 0 ? `\nCompleted today:\n${completed.map((a: { title: string }) => `- ✓ ${a.title}`).join("\n")}` : ""}

When asked about their plan or what to do next, refer to these specific actions with clinical context.`;
    }

    const stream = await getClient().messages.stream({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // SSE stream response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullResponse += event.delta.text;
              const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          // Persist to Supabase (fire-and-forget)
          if (patientId) {
            const lastUser = messages[messages.length - 1];
            if (lastUser?.role === "user") {
              saveChatMessage(patientId, "user", lastUser.content).catch(() => {});
            }
            saveChatMessage(patientId, "assistant", fullResponse).catch(() => {});
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
