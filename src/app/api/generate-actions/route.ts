import Anthropic from "@anthropic-ai/sdk";
import { LabPanel, WearableData, HealthAction, ActionCategory } from "@/lib/types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ── Clinical knowledge base for action generation ─────────────────────────────
const BIOMARKER_ACTIONS: Record<string, {
  priority: number; // 1 = highest clinical urgency
  actions: Array<{
    title: string;
    description: string;
    category: ActionCategory;
    why: string;
    effectSize: string;
    targetBiomarkers: string[];
  }>;
}> = {
  glucose: {
    priority: 1,
    actions: [
      {
        title: "10-min walk after each meal today",
        description: "Walk within 30 min of finishing breakfast, lunch, and dinner",
        category: "Movement",
        why: "Post-meal walks activate GLUT-4 transporters in muscle tissue, clearing glucose from the bloodstream without insulin. RCTs show 30% reduction in postprandial glucose spikes.",
        effectSize: "−20–30 mg/dL postprandial spike reduction",
        targetBiomarkers: ["glucose", "hba1c"],
      },
      {
        title: "Eat protein and fiber before carbs",
        description: "Start every meal with protein or vegetables, carbs last",
        category: "Nutrition",
        why: "Meal sequencing (protein/fat/fiber before carbs) slows gastric emptying and blunts glucose absorption by 30–40%. Study: Shukla et al., Diabetes Care 2015.",
        effectSize: "−30–40% postprandial glucose reduction",
        targetBiomarkers: ["glucose", "hba1c"],
      },
      {
        title: "Take magnesium glycinate tonight",
        description: "400mg with dinner — improves insulin sensitivity overnight",
        category: "Supplement",
        why: "Magnesium is a cofactor for 300+ enzymes including glucose transporter regulation. Meta-analysis (n=2,582) showed significant fasting glucose reduction in borderline-high patients.",
        effectSize: "−3–5 mg/dL fasting glucose over 12 weeks",
        targetBiomarkers: ["glucose"],
      },
    ],
  },
  hba1c: {
    priority: 1,
    actions: [
      {
        title: "150 min zone 2 cardio this week",
        description: "Brisk walk, bike, or swim at a conversational pace — spread across 5 days",
        category: "Exercise",
        why: "Zone 2 cardio is the gold standard for metabolic health. Cochrane review: consistent aerobic exercise reduces HbA1c by ~0.7% over 12 weeks by increasing mitochondrial density and GLUT-4 expression.",
        effectSize: "−0.5–0.7% HbA1c over 12 weeks",
        targetBiomarkers: ["hba1c", "glucose", "hdl"],
      },
    ],
  },
  ldl: {
    priority: 2,
    actions: [
      {
        title: "Add psyllium husk to breakfast",
        description: "1 tbsp in water or mixed into oatmeal — take before your first meal",
        category: "Nutrition",
        why: "Soluble fiber binds bile acids in the gut, forcing the liver to pull LDL from the bloodstream to make more bile. Meta-analysis: 5–7 mg/dL LDL reduction per 5g soluble fiber/day.",
        effectSize: "−5–10 mg/dL LDL over 4–8 weeks",
        targetBiomarkers: ["ldl", "totalCholesterol"],
      },
      {
        title: "Replace saturated fat with olive oil today",
        description: "Use olive oil instead of butter, coconut oil, or animal fat at every meal",
        category: "Nutrition",
        why: "Replacing saturated fat with monounsaturated fat reduces LDL by 8–10% by downregulating hepatic LDL synthesis. The PREDIMED trial (7,447 participants) confirmed this effect.",
        effectSize: "−8–10% LDL reduction sustained",
        targetBiomarkers: ["ldl", "totalCholesterol"],
      },
    ],
  },
  hdl: {
    priority: 3,
    actions: [
      {
        title: "30-min aerobic session today",
        description: "Any sustained cardio — walk, run, bike, swim — at moderate intensity",
        category: "Exercise",
        why: "Regular aerobic exercise is the most reliable non-pharmacologic intervention for raising HDL. Mechanism: increases hepatic lipase activity and promotes reverse cholesterol transport. Effect: +3–9% HDL.",
        effectSize: "+3–9% HDL over 8–12 weeks",
        targetBiomarkers: ["hdl"],
      },
    ],
  },
  triglycerides: {
    priority: 2,
    actions: [
      {
        title: "Eliminate added sugar for today",
        description: "No sweetened drinks, desserts, or foods with added sugar",
        category: "Nutrition",
        why: "Dietary fructose and refined carbohydrates are the primary driver of hepatic triglyceride synthesis (de novo lipogenesis). Reducing added sugar is the single most potent triglyceride intervention: −20–50% in 4 weeks.",
        effectSize: "−20–50% triglycerides over 4 weeks",
        targetBiomarkers: ["triglycerides"],
      },
      {
        title: "Take omega-3 with dinner",
        description: "2–4g EPA+DHA fish oil with your largest meal",
        category: "Supplement",
        why: "Omega-3 fatty acids reduce hepatic VLDL secretion and increase triglyceride clearance. FDA-approved for hypertriglyceridemia. Meta-analysis: −20–30% reduction at 3–4g/day.",
        effectSize: "−20–30% triglycerides at 4g/day",
        targetBiomarkers: ["triglycerides"],
      },
    ],
  },
  hscrp: {
    priority: 2,
    actions: [
      {
        title: "Take curcumin + black pepper with a meal",
        description: "500mg curcumin with piperine (black pepper extract) — enhances absorption 20x",
        category: "Supplement",
        why: "Curcumin inhibits NF-κB and reduces IL-6 and TNF-α — the upstream drivers of CRP synthesis. Multiple RCTs show significant CRP reduction. Piperine is required for bioavailability.",
        effectSize: "−15–25% hs-CRP over 8 weeks",
        targetBiomarkers: ["hscrp"],
      },
      {
        title: "Prioritize 8hrs sleep tonight",
        description: "Set a hard bedtime to be asleep by 10:30pm",
        category: "Sleep",
        why: "Even one week of restricted sleep (6 hrs) significantly elevates IL-6 and CRP. Sleep is the primary time for cellular repair and inflammatory resolution. Effect is bidirectional — improvement is rapid.",
        effectSize: "Significant CRP reduction within 2 weeks of consistent sleep",
        targetBiomarkers: ["hscrp", "cortisol"],
      },
    ],
  },
  vitaminD: {
    priority: 2,
    actions: [
      {
        title: "Take vitamin D3 + K2 with breakfast",
        description: "3,000–5,000 IU D3 with 100mcg K2-MK7 — take with a fat-containing meal",
        category: "Supplement",
        why: "Vitamin D3 requires dietary fat for absorption and K2 for proper calcium routing. Deficiency affects 2,000+ gene pathways. Typical correction from deficient to optimal takes 90 days at this dose.",
        effectSize: "+15–25 ng/mL over 90 days",
        targetBiomarkers: ["vitaminD"],
      },
    ],
  },
  testosterone: {
    priority: 2,
    actions: [
      {
        title: "Resistance training session today",
        description: "Compound lifts (squat, deadlift, bench, rows) — 45–60 min, high intensity",
        category: "Exercise",
        why: "Heavy resistance training is the most potent natural testosterone stimulus. Compound movements involving large muscle groups create an acute hormonal response. Effect compounds with consistency: +15–20% over 12 weeks.",
        effectSize: "+15–20% total testosterone over 12 weeks (consistent training)",
        targetBiomarkers: ["testosterone"],
      },
      {
        title: "Sleep 8hrs+ tonight — no compromises",
        description: "60% of daily testosterone is released during sleep (pulses during REM)",
        category: "Sleep",
        why: "Testosterone is primarily secreted during sleep, with the largest pulse during deep sleep stages. One week of <5hr sleep reduces testosterone by 10–15% in young healthy men (Leproult & Van Cauter, JAMA 2011).",
        effectSize: "Maintain full testosterone output vs −10–15% from sleep deprivation",
        targetBiomarkers: ["testosterone", "cortisol"],
      },
    ],
  },
  cortisol: {
    priority: 2,
    actions: [
      {
        title: "10-min meditation or breathwork",
        description: "Box breathing (4-4-4-4) or guided meditation — morning or before bed",
        category: "Sleep",
        why: "Mindfulness-based stress reduction reliably reduces cortisol 14–26% in RCTs by downregulating HPA axis reactivity. Even 10 minutes activates the parasympathetic nervous system.",
        effectSize: "−14–26% cortisol over 8 weeks of consistent practice",
        targetBiomarkers: ["cortisol"],
      },
      {
        title: "Ashwagandha KSM-66 tonight",
        description: "300mg of KSM-66 extract with dinner",
        category: "Supplement",
        why: "KSM-66 is the most studied ashwagandha extract. RCT (Chandrasekhar 2012, n=64): 27% cortisol reduction vs placebo at 60 days. Mechanism: blocks cortisol synthesis upstream.",
        effectSize: "−27% cortisol over 60 days (Chandrasekhar RCT)",
        targetBiomarkers: ["cortisol", "testosterone"],
      },
    ],
  },
  ferritin: {
    priority: 2,
    actions: [
      {
        title: "Eat iron-rich food with vitamin C today",
        description: "Red meat, eggs, or legumes — with a glass of OJ or bell peppers",
        category: "Nutrition",
        why: "Vitamin C (200mg) taken with iron-containing foods increases non-heme iron absorption 3-fold by reducing ferric to ferrous iron in the gut. Low ferritin is a common reversible cause of fatigue.",
        effectSize: "3x improvement in iron absorption",
        targetBiomarkers: ["ferritin"],
      },
    ],
  },
  tsh: {
    priority: 2,
    actions: [
      {
        title: "Take selenium today",
        description: "200mcg selenium (selenomethionine form) with a meal",
        category: "Supplement",
        why: "Selenium is required for the deiodinase enzyme that converts T4 to active T3. Deficiency impairs thyroid function and is common. Replenishment improves thyroid hormone conversion and can reduce TSH.",
        effectSize: "Improved T4→T3 conversion within 4–8 weeks",
        targetBiomarkers: ["tsh"],
      },
    ],
  },
};

// ── Wearable-based actions ────────────────────────────────────────────────────
function getWearableActions(wearable: WearableData): Array<{
  title: string;
  description: string;
  category: ActionCategory;
  why: string;
  effectSize: string;
  targetBiomarkers: string[];
}> {
  const actions = [];

  if (wearable.dailySteps < 7000) {
    actions.push({
      title: "Reach 8,000 steps today",
      description: `You're averaging ${wearable.dailySteps.toLocaleString()} steps. Add a 20-min walk to close the gap.`,
      category: "Movement" as ActionCategory,
      why: "The mortality benefit of walking flattens above 8,000 steps/day. Each additional 1,000 steps below that threshold is associated with a measurable increase in all-cause mortality risk (Saint-Maurice et al., JAMA 2020).",
      effectSize: "Mortality curve benefit at 8,000+ steps/day",
      targetBiomarkers: ["glucose", "triglycerides"],
    });
  }

  if (wearable.sleepDuration < 7) {
    actions.push({
      title: `Get to bed 1 hour earlier tonight`,
      description: `Your 7-day average is ${wearable.sleepDuration} hrs. Target 7.5–8.5 hrs.`,
      category: "Sleep" as ActionCategory,
      why: "Sleep under 7 hours impairs glucose clearance, raises cortisol, suppresses testosterone, and increases hs-CRP — it negatively impacts nearly every biomarker you're tracking.",
      effectSize: "Multi-biomarker improvement cascade within 2 weeks",
      targetBiomarkers: ["cortisol", "testosterone", "hscrp", "glucose"],
    });
  }

  if (wearable.hrv < 40) {
    actions.push({
      title: "Active recovery only today",
      description: `HRV is ${wearable.hrv}ms — low autonomic reserve. Light walk or yoga only.`,
      category: "Movement" as ActionCategory,
      why: "Low HRV indicates the autonomic nervous system is under-recovered. Hard training on a low-HRV day increases injury risk and cortisol without performance benefit. Recovery work is the optimal choice.",
      effectSize: "HRV recovery within 24–48hrs with proper rest",
      targetBiomarkers: ["cortisol"],
    });
  }

  return actions;
}

// ── Main POST handler ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { labPanel, wearableData, goals, patientName }: {
      labPanel: LabPanel;
      wearableData?: WearableData;
      goals?: string[];
      patientName?: string;
    } = await req.json();

    if (!labPanel || !labPanel.biomarkers?.length) {
      return Response.json({ error: "No lab panel provided" }, { status: 400 });
    }

    // ── Step 1: Collect candidate actions from out-of-range biomarkers ─────
    const outOfRange = labPanel.biomarkers.filter((b) => b.status !== "optimal");
    const candidateActions: Array<{
      title: string;
      description: string;
      category: ActionCategory;
      why: string;
      effectSize: string;
      targetBiomarkers: string[];
      priority: number;
      biomarkerId: string;
    }> = [];

    for (const biomarker of outOfRange) {
      const meta = BIOMARKER_ACTIONS[biomarker.id];
      if (!meta) continue;
      for (const action of meta.actions) {
        candidateActions.push({
          ...action,
          priority: meta.priority,
          biomarkerId: biomarker.id,
        });
      }
    }

    // ── Step 2: Add wearable-based actions ─────────────────────────────────
    const wearableActions = wearableData ? getWearableActions(wearableData) : [];
    const allCandidates = [
      ...candidateActions,
      ...wearableActions.map(a => ({ ...a, priority: 3, biomarkerId: "wearable" })),
    ];

    if (allCandidates.length === 0) {
      // All biomarkers optimal — return maintenance actions
      const maintenanceActions: HealthAction[] = [
        {
          id: "maintain-1",
          title: "All biomarkers are optimal — maintain your current habits",
          description: "Your lab results show excellent metabolic health across all markers",
          category: "Movement",
          why: "Consistency is the most underrated health intervention. Your current lifestyle is producing optimal biomarker results — the goal now is to maintain it.",
          completed: false,
          targetBiomarkers: [],
          biomarkerTarget: "All markers optimal",
        } as HealthAction & { biomarkerTarget: string },
      ];
      return Response.json({ actions: maintenanceActions });
    }

    // ── Step 3: Use Claude to rank, personalize, and select top 5 actions ──
    const labContext = outOfRange.map(b =>
      `${b.name}: ${b.value} ${b.unit} (${b.status.toUpperCase()}, optimal: ${b.optimalMin}–${b.optimalMax})`
    ).join("\n");

    const wearableContext = wearableData ? `
Wearable data (7-day avg):
- Steps: ${wearableData.dailySteps.toLocaleString()}/day
- Sleep: ${wearableData.sleepDuration} hrs
- Resting HR: ${wearableData.restingHeartRate} bpm
- HRV: ${wearableData.hrv}ms (${wearableData.hrvTrend > 0 ? "+" : ""}${wearableData.hrvTrend}% trend)` : "";

    const goalsContext = goals?.length ? `Patient goals: ${goals.join(", ")}` : "";
    const nameContext = patientName ? `Patient name: ${patientName}` : "";

    const prompt = `You are the BioPrecision action ranking agent. Select and rank the 5 most impactful actions for this patient TODAY.

${nameContext}
${goalsContext}

OUT-OF-RANGE BIOMARKERS:
${labContext}
${wearableContext}

CANDIDATE ACTIONS (choose the best 5, ranked by clinical impact):
${JSON.stringify(allCandidates, null, 2)}

Rules:
1. Select exactly 5 actions. Prioritize highest-priority biomarkers first.
2. Avoid redundancy — if two actions target the same biomarker, pick the highest-impact one unless diversity is valuable.
3. Balance categories (not all supplements, not all exercise).
4. If goals are provided, weight actions that serve those goals higher.
5. Personalize the description to reference the patient's actual values.

Return ONLY a valid JSON array of exactly 5 objects matching this schema — no markdown, no explanation:
[
  {
    "id": "action-<1-5>",
    "title": "string",
    "description": "string — personalized with their actual values",
    "category": "Movement" | "Nutrition" | "Exercise" | "Sleep" | "Supplement",
    "why": "string — mechanism + evidence",
    "completed": false,
    "targetBiomarkers": ["biomarker_id"],
    "biomarkerTarget": "Human readable string like 'Glucose: 102 mg/dL → target <99'"
  }
]`;

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";

    // Strip any markdown fences if present
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Agent 2: no JSON array found in response", raw);
      return Response.json({ error: "Failed to generate actions" }, { status: 500 });
    }

    const actions: HealthAction[] = JSON.parse(jsonMatch[0]);

    return Response.json({ actions });
  } catch (error) {
    console.error("generate-actions error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
