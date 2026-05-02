import Anthropic from "@anthropic-ai/sdk";
import { LabPanel, WearableData, HealthAction } from "@/lib/types";
import {
  BIOMARKER_LIBRARY,
  CLINICAL_DISCLAIMER,
  formatCitation,
  type ClinicalIntervention,
} from "@/lib/clinicalLibrary";
import { pubmedSearch, buildQuery, formatCitation as fmtPubMed } from "@/lib/pubmed";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ── Goal → biomarker priority mapping ────────────────────────────────────────
// Each goal maps to the biomarkers that most directly affect it, ranked by
// impact. These are used to weight the action selection.

const GOAL_PRIORITY: Record<string, string[]> = {
  energy:          ["ferritin", "vitaminB12", "vitaminD", "hemoglobin", "tsh", "freeT3", "cortisol", "magnesium", "fastingInsulin"],
  longevity:       ["hscrp", "homocysteine", "apoB", "ldl", "glucose", "vitaminD", "omega3Index", "uricAcid"],
  weight_loss:     ["fastingInsulin", "glucose", "hba1c", "cortisol", "tsh", "triglycerides", "hscrp"],
  muscle_gain:     ["testosterone", "freeTesto", "igf1", "vitaminD", "zinc", "magnesium", "hemoglobin"],
  heart_health:    ["apoB", "ldl", "hscrp", "homocysteine", "hdl", "triglycerides", "lpa", "omega3Index"],
  hormone_balance: ["testosterone", "dheas", "cortisol", "shbg", "estradiol", "progesterone", "tsh", "vitaminD"],
  mental_clarity:  ["omega3Index", "vitaminB12", "vitaminD", "ferritin", "tsh", "hscrp", "homocysteine", "magnesium"],
  sleep:           ["cortisol", "magnesium", "vitaminD", "tsh", "ferritin"],
};

const PAIN_PRIORITY: Record<string, string[]> = {
  exhausted:  ["ferritin", "vitaminB12", "vitaminD", "hemoglobin", "tsh", "freeT3", "cortisol"],
  weight:     ["fastingInsulin", "glucose", "hba1c", "cortisol", "tsh", "triglycerides"],
  normal:     [],
  proactive:  ["apoB", "hscrp", "homocysteine", "ldl", "glucose", "vitaminD"],
  optimize:   ["testosterone", "igf1", "vitaminD", "omega3Index", "hscrp", "magnesium"],
  referred:   ["hscrp", "glucose", "ldl", "apoB", "vitaminD"],
};

const TIME_HORIZON_NOTES: Record<string, string> = {
  "90d":  "Prefer interventions with time-to-effect under 8 weeks. Grade A evidence only. Quick wins over long-term changes.",
  "6mo":  "Balance quick wins (< 8 weeks) with medium-term interventions. Grades A and B acceptable.",
  "long": "Include long-term interventions. Supplement protocols, dietary shifts, and structural habit changes all valid.",
};

// ── Priority scoring ──────────────────────────────────────────────────────────

function getPriorityBiomarkers(goals: string[], painPoint: string): string[] {
  const seen = new Set<string>();
  const priority: string[] = [];

  // Pain point first (most urgent)
  const painIds = painPoint?.split(",").map(p => p.trim()) ?? [];
  for (const pain of painIds) {
    for (const id of (PAIN_PRIORITY[pain] ?? [])) {
      if (!seen.has(id)) { seen.add(id); priority.push(id); }
    }
  }

  // Then goals
  for (const goal of (goals ?? [])) {
    for (const id of (GOAL_PRIORITY[goal] ?? [])) {
      if (!seen.has(id)) { seen.add(id); priority.push(id); }
    }
  }

  return priority;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const {
      labPanel, wearableData, goals, patientName, biologicalSex,
      habits, medications, timeHorizon, painPoint,
    }: {
      labPanel: LabPanel;
      wearableData?: WearableData;
      goals?: string[];
      patientName?: string;
      biologicalSex?: string;
      habits?: Record<string, string | number | undefined>;
      medications?: string[];
      timeHorizon?: string;
      painPoint?: string;
    } = await req.json();

    if (!labPanel?.biomarkers?.length) {
      return Response.json({ error: "No lab panel provided" }, { status: 400 });
    }

    const isFemale = biologicalSex?.toLowerCase().includes("female") || biologicalSex?.toLowerCase().includes("woman");
    const outOfRange = labPanel.biomarkers.filter(b => b.status !== "optimal");
    const priorityBiomarkers = getPriorityBiomarkers(goals ?? [], painPoint ?? "");

    interface CandidateAction {
      intervention: ClinicalIntervention;
      biomarkerId: string;
      biomarkerName: string;
      biomarkerValue: number;
      biomarkerUnit: string;
      biomarkerStatus: string;
      optimalRange: string;
      priority: number;
      goalRelevance: number; // 0–3, higher = more relevant to stated goals
    }

    const candidates: CandidateAction[] = [];

    for (const biomarker of outOfRange) {
      const meta = BIOMARKER_LIBRARY[biomarker.id];
      if (!meta?.interventions?.length) continue;
      const optMin = isFemale && meta.optimalMinFemale !== undefined ? meta.optimalMinFemale : meta.optimalMin;
      const optMax = isFemale && meta.optimalMaxFemale !== undefined ? meta.optimalMaxFemale : meta.optimalMax;

      // Check medications for contraindications
      const medList = (medications ?? []).map(m => m.toLowerCase());

      for (const intervention of meta.interventions) {
        if (intervention.contraindications?.toLowerCase().includes("pregnancy") && isFemale) continue;

        // Skip interventions that conflict with known medications
        const contra = intervention.contraindications?.toLowerCase() ?? "";
        if (medList.some(med => med.includes("statin") && contra.includes("statin"))) continue;
        if (medList.some(med => med.includes("warfarin") && contra.includes("anticoagulant"))) continue;

        // Goal relevance: how high does this biomarker rank in stated goals?
        const priorityIdx = priorityBiomarkers.indexOf(biomarker.id);
        const goalRelevance = priorityIdx === -1 ? 0 : Math.max(0, 3 - Math.floor(priorityIdx / 3));

        candidates.push({
          intervention,
          biomarkerId: biomarker.id,
          biomarkerName: meta.name,
          biomarkerValue: biomarker.value,
          biomarkerUnit: biomarker.unit,
          biomarkerStatus: biomarker.status,
          optimalRange: `${optMin}–${optMax} ${biomarker.unit}`,
          priority: (biomarker.status === "elevated" || biomarker.status === "low") ? 1 : 2,
          goalRelevance,
        });
      }
    }

    // Wearable step action
    if (wearableData?.dailySteps && wearableData.dailySteps < 7000) {
      candidates.push({
        intervention: {
          title: "Reach 8,000 steps today",
          description: `You're averaging ${wearableData.dailySteps.toLocaleString()} steps. Add a 20-min walk.`,
          category: "Movement",
          mechanism: "8,000 steps/day is associated with significantly lower all-cause mortality (−51% vs. <4,000 steps). Each additional 1,000 steps reduces mortality risk by ~15%. The mechanism involves improved insulin sensitivity, reduced visceral adiposity, and anti-inflammatory effects.",
          effectSize: "Significant mortality risk reduction at 8,000+ steps/day",
          timeToEffect: "Cumulative; immediate metabolic and cardiovascular effects",
          evidenceGrade: "A",
          citations: [{ authors: "Saint-Maurice PF, et al.", year: 2020, title: "Association of Daily Step Count and Step Intensity With Mortality Among US Adults", journal: "JAMA", pmid: "32207799", finding: "8,000–12,000 steps/day was associated with significantly lower all-cause mortality vs. 4,000 steps/day." }],
          targetBiomarkers: ["glucose", "triglycerides", "hscrp"],
        },
        biomarkerId: "wearable", biomarkerName: "Daily Activity",
        biomarkerValue: wearableData.dailySteps, biomarkerUnit: "steps",
        biomarkerStatus: "low", optimalRange: "8,000+ steps",
        priority: 2, goalRelevance: 1,
      });
    }

    if (candidates.length === 0) {
      return Response.json({
        actions: [{
          id: "maintain-1",
          title: "Maintain your current lifestyle — all markers are optimal",
          description: "Your lab results show excellent metabolic health. Consistency is the most underrated intervention.",
          category: "Lifestyle", why: "Consistency produces optimal biomarker results. Your current habits are working.", completed: false,
          targetBiomarkers: [], biomarkerTarget: "All markers optimal", evidenceGrade: "A",
          citations: [], effectSize: "Maintenance", timeToEffect: "Ongoing",
        }],
        disclaimer: CLINICAL_DISCLAIMER,
      });
    }

    // Build context for Claude
    const labContext = outOfRange.map(b => {
      const meta = BIOMARKER_LIBRARY[b.id];
      const priorityIdx = priorityBiomarkers.indexOf(b.id);
      const goalFlag = priorityIdx !== -1 ? ` [GOAL PRIORITY #${priorityIdx + 1}]` : "";
      return `- ${b.name}: ${b.value} ${b.unit} [${b.status.toUpperCase()}]${goalFlag}\n  Optimal: ${b.optimalMin}–${b.optimalMax} ${b.unit}\n  ${meta?.clinicalSignificance ?? ""}`;
    }).join("\n\n");

    const wearableContext = wearableData
      ? `\nWEARABLE: ${wearableData.dailySteps}/day steps | Sleep ${wearableData.sleepDuration}hrs | HRV ${wearableData.hrv}ms | RHR ${wearableData.restingHeartRate}bpm`
      : "";

    const habitContext = habits ? [
      habits.sleepHours         ? `Sleep: ${habits.sleepHours} hrs/night` : null,
      habits.exerciseDaysPerWeek ? `Exercise: ${habits.exerciseDaysPerWeek} days/week${habits.exerciseType ? ` (${habits.exerciseType})` : ""}` : null,
      habits.dietStyle          ? `Diet: ${habits.dietStyle}` : null,
      habits.stressLevel        ? `Stress: ${habits.stressLevel}/5` : null,
      habits.alcoholFrequency   ? `Alcohol: ${habits.alcoholFrequency}` : null,
    ].filter(Boolean).join(" | ") : "";

    const candidateContext = candidates
      .sort((a, b) => (b.goalRelevance - a.goalRelevance) || (a.priority - b.priority))
      .slice(0, 25)
      .map((c, i) => {
        const cite = c.intervention.citations[0];
        return `[${i + 1}] ${c.biomarkerName} (${c.biomarkerValue} ${c.biomarkerUnit}) | GoalRelevance:${c.goalRelevance} | ${c.intervention.title} | Grade ${c.intervention.evidenceGrade} | Effect: ${c.intervention.effectSize} | Time: ${c.intervention.timeToEffect} | Mechanism: ${c.intervention.mechanism.slice(0, 150)} | Citation: ${cite ? formatCitation(cite) : "N/A"}`;
      })
      .join("\n");

    const timeNote = TIME_HORIZON_NOTES[timeHorizon ?? ""] ?? "";
    const goalList = (goals ?? []).join(", ") || "general health";
    const priorityNote = priorityBiomarkers.length > 0
      ? `\nGOAL-ALIGNED PRIORITY BIOMARKERS (ranked by relevance to stated goals):\n${priorityBiomarkers.slice(0, 10).map((id, i) => `  ${i + 1}. ${id}`).join("\n")}\nStrongly weight candidates targeting these biomarkers.`
      : "";

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `You are the BioPrecision clinical action ranking agent. Select exactly 5 evidence-based interventions that will have the highest impact on this patient's specific goals and biomarker profile.

PATIENT: ${patientName ?? "Patient"} | Sex: ${biologicalSex ?? "not specified"} | Goals: ${goalList}
Why they're here: ${painPoint ?? "general optimization"}
Time horizon: ${timeHorizon ?? "not specified"}${timeNote ? `\nTime horizon guidance: ${timeNote}` : ""}
Habits: ${habitContext || "not provided"}
Medications: ${(medications ?? []).join(", ") || "none"}
${priorityNote}

OUT-OF-RANGE BIOMARKERS (markers labeled GOAL PRIORITY must be addressed first):
${labContext}
${wearableContext}

CANDIDATE INTERVENTIONS (select exactly 5):
${candidateContext}

SELECTION RULES:
1. Exactly 5 interventions. The first 2 MUST target Goal Priority biomarkers if any exist.
2. Prefer Grade A evidence. Never select two interventions addressing the same biomarker.
3. Balance categories: avoid all 5 being the same category (e.g., all Supplements).
4. Personalize description to use patient's actual value and state the specific benefit.
5. The "why" field must cite the biological mechanism AND a specific study/finding.
6. If a medication is listed, flag contraindications explicitly in the description.
7. Include specific dosing or protocol in the description (not just "take fish oil" — "4g/day EPA+DHA").

Return ONLY a valid JSON array of 5 objects — no markdown, no explanation:
[{
  "id": "action-1",
  "title": "specific actionable title",
  "description": "personalized description with patient's actual value, specific protocol/dosing",
  "category": "Movement|Nutrition|Exercise|Sleep|Supplement|Lifestyle",
  "why": "mechanism (2-3 sentences) + specific study finding with year",
  "completed": false,
  "targetBiomarkers": ["biomarker-id"],
  "biomarkerTarget": "MarkerName: current → optimal range",
  "evidenceGrade": "A|B|C",
  "citations": ["formatted citation string"],
  "effectSize": "quantified expected change",
  "timeToEffect": "realistic timeline"
}]`,
      }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return Response.json({ error: "Failed to generate actions" }, { status: 500 });
    const actions: HealthAction[] = JSON.parse(jsonMatch[0]);

    // Enrich with live PubMed citations (parallel, 5s timeout each)
    const enriched = await Promise.all(
      actions.map(async action => {
        try {
          const biomarkerName = action.targetBiomarkers?.[0] ?? "";
          const query = buildQuery(biomarkerName, action.title);
          const papers = await Promise.race([
            pubmedSearch(query, 1),
            new Promise<[]>(r => setTimeout(() => r([]), 5000)),
          ]);
          if (papers.length > 0) {
            return {
              ...action,
              citations: [fmtPubMed(papers[0]), ...(action.citations ?? [])].slice(0, 3),
            };
          }
        } catch { /* keep action as-is on failure */ }
        return action;
      })
    );

    return Response.json({
      actions: enriched,
      disclaimer: CLINICAL_DISCLAIMER,
      biomarkersAddressed: outOfRange.map(b => b.name),
    });

  } catch (error) {
    console.error("[generate-actions] error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
