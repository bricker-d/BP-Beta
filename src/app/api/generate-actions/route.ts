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
      habits, medications, currentSupplements, timeHorizon, painPoint, symptoms,
    }: {
      labPanel: LabPanel;
      wearableData?: WearableData;
      goals?: string[];
      patientName?: string;
      biologicalSex?: string;
      habits?: Record<string, string | number | undefined>;
      medications?: string[];
      currentSupplements?: string[];
      timeHorizon?: string;
      painPoint?: string;
      symptoms?: string[];
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

    // Note: wearable step goals are not added here — actions must be grounded in lab biomarkers only

    if (candidates.length === 0) {
      return Response.json({
        actions: [],
        allOptimal: true,
        disclaimer: CLINICAL_DISCLAIMER,
      });
    }

    // Build context for Claude — NO numeric values, so they cannot appear in titles
    const labContext = outOfRange.map(b => {
      const meta = BIOMARKER_LIBRARY[b.id];
      const priorityIdx = priorityBiomarkers.indexOf(b.id);
      const goalFlag = priorityIdx !== -1 ? ` [GOAL PRIORITY #${priorityIdx + 1}]` : "";
      const direction = b.status === "low" ? "needs to come up" : b.status === "elevated" ? "needs to come down" : "is borderline";
      return `- ${b.name} ${direction}${goalFlag}\n  ${meta?.clinicalSignificance ?? ""}`;
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
    const supplementContext = currentSupplements?.length ? `Already taking: ${currentSupplements.join(", ")}` : "";
    const symptomContext = symptoms?.length ? `Reported symptoms: ${symptoms.join(", ")}` : "";

    // Sort and slice candidates — Claude will select from these by index
    const rankedCandidates = candidates
      .sort((a, b) => (b.goalRelevance - a.goalRelevance) || (a.priority - b.priority))
      .slice(0, 20);

    // Build full candidate context — untruncated so Claude has all the evidence
    const candidateContext = rankedCandidates.map((c, i) => {
      const cite = c.intervention.citations[0];
      return [
        `[${i + 1}] BIOMARKER: ${c.biomarkerName} [${c.biomarkerStatus.toUpperCase()}] GoalRelevance:${c.goalRelevance}`,
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

    // Claude's job: SELECT by index, write plain-English title + description + why.
    // All clinical facts (citations, dosing, effect size, grade) come from the library — never from Claude.
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are building a simple daily health routine for someone who knows nothing about health or lab results. Your only job is to pick the right habits from the list below and write them in the friendliest, simplest language possible.

RULES:
1. Only select interventions tied to an actual out-of-range lab marker. No extras.
2. Return exactly 3 to 4 actions total — no more, no fewer. Pick the highest-impact ones. Fewer actions = more compliance.
3. Assign a timeOfDay to each action: "morning", "midday", or "evening". Spread them across the day — no more than 2 at the same time. Match the action to a natural moment (morning = supplements with breakfast, midday = walk after lunch, evening = magnesium before bed).
3. Titles must be dead simple — one action a confused person can do today. No numbers, no lab names, no medical terms, no dosages.
4. Descriptions must NEVER include specific doses, mg amounts, lab values, or clinical measurements. Just say what to do and when.
5. Use the patient's habits to personalise: if they already exercise 5 days/week, don't tell them to exercise more. If they sleep 8 hrs already, don't tell them to sleep more.
6. If they already take a supplement, skip recommending that same supplement.
7. Prefer Grade A evidence. One intervention per biomarker max.
8. Address goal-priority biomarkers first.
9. Spread timeOfDay across morning, midday, evening — no more than 2 at the same time of day.

PATIENT: ${patientName ?? "Patient"} | ${biologicalSex ?? ""} | Goals: ${goalList}
Medications: ${(medications ?? []).join(", ") || "none"}
Habits: ${habitContext || "unknown"}
${supplementContext}
${symptomContext}
${wearableContext}
${timeNote}
${priorityNote}

OUT-OF-RANGE MARKERS:
${labContext}

CANDIDATE INTERVENTIONS — select by [number]:
${candidateContext}

TITLE RULES — most important:
- Pretend you are texting a busy friend who has never seen a lab result in their life
- MAX 7 words. No numbers. No lab names. No clinical terms. No dosages.
- BAD: "Optimize testosterone via resistance training protocol"
- BAD: "Increase testosterone from 516 toward optimal range"
- BAD: "Resistance Training Protocol for Testosterone"
- GOOD: "Lift weights three times this week"
- BAD: "Supplement with magnesium glycinate 400mg for insulin"
- GOOD: "Take magnesium before bed tonight"
- BAD: "Engage in post-meal ambulation to improve glucose"
- GOOD: "Walk 10 minutes after each meal"
- The intervention title in the candidate list is for YOUR reference only — never copy it

DESCRIPTION RULES:
- One sentence. What to do and when. Nothing else.
- NO specific doses (no "400mg", no "2000 IU", no "1g")
- NO lab values or ranges
- NO clinical terminology
- BAD: "Take 400mg magnesium glycinate before bed to improve insulin sensitivity"
- GOOD: "Take a magnesium supplement each night before you go to sleep"
- BAD: "Perform resistance training 3x/week to raise testosterone from 516 ng/dL"
- GOOD: "Add three weightlifting sessions to your week, any type works"

PLAIN WHY RULES:
- 2 sentences max. What happens in the body in plain English.
- Write like you're explaining to a curious 16-year-old
- No Latin, no abbreviations, no clinical terms, no numbers

Return ONLY valid JSON, no markdown:
[{
  "candidateIndex": <number>,
  "title": "simple instruction, max 7 words, no numbers, no jargon",
  "description": "one sentence, what to do and when, no doses no lab values",
  "plainWhy": "2 sentences max, plain English, what the body does and why it helps",
  "timeOfDay": "morning" | "midday" | "evening"
}]`,
      }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return Response.json({ error: "Failed to generate actions" }, { status: 500 });

    // Parse Claude's selections and merge with library data — all clinical facts from library
    interface Selection { candidateIndex: number; title: string; description: string; plainWhy: string; timeOfDay?: "morning" | "midday" | "evening"; }
    const selections: Selection[] = JSON.parse(jsonMatch[0]);

    const actions: HealthAction[] = selections
      .filter(s => s.candidateIndex >= 1 && s.candidateIndex <= rankedCandidates.length)
      .map((s, i) => {
        const c = rankedCandidates[s.candidateIndex - 1];
        const iv = c.intervention;
        return {
          id: `action-${i + 1}`,
          title: s.title,
          description: s.description,
          category: iv.category,
          // why = Claude's plain-English translation; falls back to library finding if blank
          why: s.plainWhy?.trim() || iv.citations[0]?.finding || iv.mechanism,
          completed: false,
          targetBiomarkers: iv.targetBiomarkers,
          biomarkerTarget: c.biomarkerName,
          evidenceGrade: iv.evidenceGrade,
          effectSize: iv.effectSize,
          timeToEffect: iv.timeToEffect,
          citations: iv.citations.map(formatCitation),
          timeOfDay: s.timeOfDay ?? undefined,
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
