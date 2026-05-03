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

    // Sort and slice candidates — Claude will select from these by index
    const rankedCandidates = candidates
      .sort((a, b) => (b.goalRelevance - a.goalRelevance) || (a.priority - b.priority))
      .slice(0, 20);

    // Build full candidate context — untruncated so Claude has all the evidence
    const candidateContext = rankedCandidates.map((c, i) => {
      const cite = c.intervention.citations[0];
      return [
        `[${i + 1}] BIOMARKER: ${c.biomarkerName} — ${c.biomarkerValue} ${c.biomarkerUnit} (optimal: ${c.optimalRange}) [${c.biomarkerStatus.toUpperCase()}] GoalRelevance:${c.goalRelevance}`,
        `    INTERVENTION: ${c.intervention.title}`,
        `    CATEGORY: ${c.intervention.category} | GRADE: ${c.intervention.evidenceGrade}`,
        `    DOSE: ${c.intervention.description}`,
        `    MECHANISM: ${c.intervention.mechanism}`,
        `    EFFECT SIZE: ${c.intervention.effectSize}`,
        `    TIME TO EFFECT: ${c.intervention.timeToEffect}`,
        `    CITATION: ${cite ? formatCitation(cite) : "N/A"}`,
        `    FINDING: ${cite?.finding ?? ""}`,
        c.intervention.contraindications ? `    CONTRAINDICATIONS: ${c.intervention.contraindications}` : "",
      ].filter(Boolean).join("\n");
    }).join("\n\n");

    const timeNote = TIME_HORIZON_NOTES[timeHorizon ?? ""] ?? "";
    const goalList = (goals ?? []).join(", ") || "general health";
    const priorityNote = priorityBiomarkers.length > 0
      ? `\nGOAL-ALIGNED PRIORITY BIOMARKERS: ${priorityBiomarkers.slice(0, 8).join(", ")}\nThe first 2 selected actions MUST target these biomarkers.`
      : "";

    // Claude's job: SELECT by index and write personalized title + description only.
    // All clinical claims (mechanism, citations, dosing, effect size) come from the library above.
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are the BioPrecision clinical action selector. Your ONLY job is to:
1. Select the 5 best interventions from the numbered list below for this specific patient
2. Write a personalized title and one-sentence description for each using their actual biomarker values

CRITICAL: Do NOT add clinical claims, dosing, mechanisms, or citations beyond what is provided in the candidate list. The system will populate those fields from the library. You write ONLY the title and description.

PATIENT: ${patientName ?? "Patient"} | ${biologicalSex ?? ""} | Goals: ${goalList}
Situation: ${painPoint ?? "general optimization"} | Time horizon: ${timeHorizon ?? "standard"}${timeNote ? ` (${timeNote})` : ""}
Current habits: ${habitContext || "not provided"}
Medications: ${(medications ?? []).join(", ") || "none"}
${priorityNote}

OUT-OF-RANGE BIOMARKERS:
${labContext}
${wearableContext}

CANDIDATE INTERVENTIONS — select 5 by their [number]:
${candidateContext}

SELECTION RULES:
1. Select exactly 5. If GOAL-ALIGNED PRIORITY biomarkers exist, first 2 selections MUST address them.
2. Prefer Grade A evidence. Do not select two interventions for the same biomarker.
3. Balance categories — avoid selecting all Supplements or all Exercise.
4. If a medication conflicts with a contraindication, skip that intervention.
5. Prefer interventions with shorter time-to-effect if time horizon is 90d.

Return ONLY valid JSON — no markdown, no explanation:
[{
  "candidateIndex": <number from list>,
  "title": "action title personalized with patient's actual value (e.g. 'Raise testosterone from 516 → 600+ ng/dL with resistance training')",
  "description": "one sentence: what to do, personalized to this patient's specific situation"
}]`,
      }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return Response.json({ error: "Failed to generate actions" }, { status: 500 });

    // Parse Claude's selections and merge with library data — all clinical facts from library
    interface Selection { candidateIndex: number; title: string; description: string; }
    const selections: Selection[] = JSON.parse(jsonMatch[0]);

    const actions: HealthAction[] = selections
      .filter(s => s.candidateIndex >= 1 && s.candidateIndex <= rankedCandidates.length)
      .slice(0, 5)
      .map((s, i) => {
        const c = rankedCandidates[s.candidateIndex - 1];
        const iv = c.intervention;
        return {
          id: `action-${i + 1}`,
          title: s.title,
          description: s.description,
          category: iv.category,
          // why comes entirely from library — no Claude generation
          why: `${iv.mechanism} ${iv.citations[0]?.finding ?? ""}`.trim(),
          completed: false,
          targetBiomarkers: iv.targetBiomarkers,
          biomarkerTarget: `${c.biomarkerName}: ${c.biomarkerValue} ${c.biomarkerUnit} → ${c.optimalRange}`,
          evidenceGrade: iv.evidenceGrade,
          effectSize: iv.effectSize,
          timeToEffect: iv.timeToEffect,
          citations: iv.citations.map(formatCitation),
        };
      });

    // Augment citations with live PubMed verification (parallel, 4s timeout, non-blocking)
    // PubMed is used to ADD a second verified citation — never replaces the library citation
    const enriched = await Promise.all(
      actions.map(async (action) => {
        try {
          const c = rankedCandidates.find(rc =>
            rc.intervention.targetBiomarkers.some(id => action.targetBiomarkers?.includes(id))
          );
          if (!c) return action;
          const query = buildQuery(c.biomarkerName, c.intervention.title);
          const papers = await Promise.race([
            pubmedSearch(query, 1),
            new Promise<[]>(r => setTimeout(() => r([]), 4000)),
          ]);
          if (papers.length > 0) {
            const pubmedCite = fmtPubMed(papers[0]);
            // Only add if different from library citation
            const existing = action.citations ?? [];
            if (!existing.some(c => c.includes(papers[0].pmid))) {
              return { ...action, citations: [...existing, pubmedCite].slice(0, 3) };
            }
          }
        } catch { /* keep action as-is */ }
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
