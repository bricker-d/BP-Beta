import Anthropic from "@anthropic-ai/sdk";
import { LabPanel, WearableData } from "@/lib/types";
import { saveChatMessage } from "@/lib/supabase";
import { BIOMARKER_LIBRARY, CLINICAL_DISCLAIMER, formatCitation } from "@/lib/clinicalLibrary";
import { pubmedSearchWithAbstracts, isEvidenceQuery, formatForPrompt, buildQuery } from "@/lib/pubmed";

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
  painPoint?: string;
  timeHorizon?: string;
  medications?: string[];
  familyHistory?: string[];
  activeConditions?: string[];
  allergies?: string[];
  sleepHours?: number;
  exerciseDaysPerWeek?: number;
  exerciseType?: string;
  dietStyle?: string;
  stressLevel?: number;
  alcoholFrequency?: string;
  caffeineIntake?: string;
  smokingStatus?: string;
  occupation?: string;
  sleepQuality?: number;
  currentSupplements?: string[];
  symptoms?: string[];
  symptomsOther?: string;
  notificationStyle?: string;
  wearableSource?: string;
  intakeSummary?: string;
}

// ── Biomarker reference data (mirrors mobile/lib/biomarkers.ts) ──────────────
// Kept here so the system prompt can render full clinical context without
// requiring the mobile lib to be imported into the Next.js API.
// Build clinical context from the shared clinical library
function computeBMI(profile: { weightLbs?: number; heightFt?: number; heightIn?: number }): string {
  if (!profile.weightLbs || !profile.heightFt) return "";
  const totalInches = (profile.heightFt * 12) + (profile.heightIn ?? 0);
  const bmi = (profile.weightLbs / (totalInches * totalInches)) * 703;
  return `BMI ${bmi.toFixed(1)}`;
}

function buildBiomarkerContext(biomarkerId: string, value: number, unit: string): string {
  const meta = BIOMARKER_LIBRARY[biomarkerId];
  if (!meta) return "";
  const interventions = meta.interventions.map(i => {
    const topCitation = i.citations[0];
    return `  - ${i.title} (Evidence: ${i.evidenceGrade}) | Effect: ${i.effectSize}\n    ${topCitation ? formatCitation(topCitation) : ""}\n    Finding: "${topCitation?.finding ?? ""}"`;
  }).join("\n");
  return `${meta.name}: ${value} ${unit}\n  Mechanism: ${meta.mechanismSummary}\n  Clinical significance: ${meta.clinicalSignificance}\n  Evidence-based interventions:\n${interventions}`;
}

function buildSystemPrompt(
  labPanel?: LabPanel,
  wearableData?: WearableData,
  intakeProfile?: IntakeProfile
): string {
  const patientName = intakeProfile?.name?.split(" ")[0] ?? "the user";

  // ── 1. IDENTITY & ROLE ────────────────────────────────────────────────────
  let prompt = `You are BioPrecision AI — a personalized health intelligence coach for ${patientName}.

Your role: translate lab results and lifestyle data into specific, actionable guidance that a non-medical person can actually understand and follow. You are not a physician and never diagnose or prescribe. You explain, educate, and recommend — always tied to this patient's actual numbers and goals, always in plain language.

## Core Principles
- Connect every recommendation to their actual lab values — no generic advice
- Explain WHY something works, but in plain English (what the body does, not clinical terminology)
- Be specific: doses, timing, realistic timelines — not vague suggestions
- Be direct and honest — no platitudes ("eat well, exercise more")
- Flag when something needs a doctor. Don't overdo this — only when genuinely needed
- Keep responses tight: answer what was asked, then add the single most useful follow-on insight
`;

  // ── 2. PATIENT PROFILE ────────────────────────────────────────────────────
  if (intakeProfile) {
    const age      = intakeProfile.age ? `${intakeProfile.age} years old` : "age not specified";
    const sex      = intakeProfile.biologicalSex ?? "sex not specified";
    const goals    = intakeProfile.goals?.join(", ") ?? "none specified";
    const bmi      = computeBMI(intakeProfile);
    const height   = intakeProfile.heightFt ? `${intakeProfile.heightFt}'${intakeProfile.heightIn ?? 0}"` : "";
    const weight   = intakeProfile.weightLbs ? `${intakeProfile.weightLbs} lbs` : "";
    const symptoms = intakeProfile.symptoms?.join(", ") ?? "none reported";
    const wearable = intakeProfile.wearableSource ?? "none";
    const meds       = intakeProfile.medications?.join(", ") || "none";
    const family     = intakeProfile.familyHistory?.join(", ") || "none noted";
    const conditions = intakeProfile.activeConditions?.join(", ") || "none reported";
    const allergies  = intakeProfile.allergies?.join(", ") || "none reported";

    const habitLines = [
      intakeProfile.sleepHours        ? `Sleep: ${intakeProfile.sleepHours} hrs/night${intakeProfile.sleepQuality ? ` (quality ${intakeProfile.sleepQuality}/5)` : ""}` : null,
      intakeProfile.exerciseDaysPerWeek ? `Exercise: ${intakeProfile.exerciseDaysPerWeek} days/week${intakeProfile.exerciseType ? ` (${intakeProfile.exerciseType})` : ""}` : null,
      intakeProfile.occupation        ? `Occupation: ${intakeProfile.occupation}` : null,
      intakeProfile.dietStyle         ? `Diet: ${intakeProfile.dietStyle}` : null,
      intakeProfile.stressLevel       ? `Stress: ${intakeProfile.stressLevel}/5` : null,
      intakeProfile.alcoholFrequency  ? `Alcohol: ${intakeProfile.alcoholFrequency}` : null,
      intakeProfile.caffeineIntake    ? `Caffeine: ${intakeProfile.caffeineIntake}` : null,
      intakeProfile.smokingStatus && intakeProfile.smokingStatus !== "never" ? `Smoking: ${intakeProfile.smokingStatus}` : null,
    ].filter(Boolean).join(" | ");

    prompt += `
## Patient Profile
- Name: ${patientName}
- Age/Sex: ${age}, ${sex}
- Body: ${height} ${weight}${bmi ? " — " + bmi : ""}
- Primary goal: ${goals}
- Why they're here: ${intakeProfile.painPoint ?? "not specified"}
- Time horizon: ${intakeProfile.timeHorizon ?? "not specified"}
- Reported symptoms: ${symptoms}
- Habits baseline: ${habitLines || "not provided"}
- Active conditions: ${conditions}
- Allergies: ${allergies}
- Medications: ${meds}
- Family history: ${family}
- Wearable device: ${wearable}
- Coaching style preference: ${intakeProfile.notificationStyle ?? "direct"}
`;

    if (intakeProfile.intakeSummary) {
      prompt += `- Initial assessment: "${intakeProfile.intakeSummary}"\n`;
    }
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
      const meta = BIOMARKER_LIBRARY[b.id];
      const optRange  = meta ? `${meta.optimalMin}–${meta.optimalMax} ${b.unit}` : "see reference";
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
        const meta = BIOMARKER_LIBRARY[b.id];
        if (!meta) continue;

        // Find goal-relevant context
        const relevantGoals = intakeProfile?.goals?.join(", ") ?? "general health";

        prompt += `
**${meta.name}: ${b.value} ${b.unit} (${b.status.toUpperCase()})**
- Optimal range: ${meta.optimalMin}–${meta.optimalMax} ${b.unit}
- Current deviation: ${b.value} ${b.unit} vs optimal ${meta.optimalMin}–${meta.optimalMax} ${b.unit}
- Mechanism: ${meta.mechanismSummary}
- Relevance to patient's goals: ${relevantGoals || "general health impact"}
- Evidence-based interventions:
${meta.interventions.slice(0,2).map((i: { title: string; evidenceGrade: string; effectSize: string }) => `  • ${i.title} (Grade ${i.evidenceGrade}) — ${i.effectSize}`).join("\n")}
`;
      }
    }

    // Summarize optimal markers briefly
    const optimal = labPanel.biomarkers.filter(b => b.status === "optimal");
    if (optimal.length > 0) {
      prompt += `
### Optimal Markers (maintain current approach)
${optimal.map(b => `- ${BIOMARKER_LIBRARY[b.id]?.name ?? b.id}: ${b.value} ${b.unit} ✓`).join("\n")}
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

  // ── 5. RESPONSE STYLE ────────────────────────────────────────────────────
  prompt += `
## How to Respond

You are a sharp, knowledgeable friend — not a physician writing a report. Be specific, be brief, be useful.

FORMAT — NON-NEGOTIABLE:
- Plain prose only. Zero markdown: no ##, no **, no dashes, no bullet lists.
- 2 paragraphs maximum. Most answers need only 1. Short answers are better answers.
- Lead with the direct answer. One sentence of reason. One concrete action if relevant.
- Numbers tied to this patient's actual values. Never generic.
- If they ask why: one plain sentence on the biology ("cortisol blocks insulin signaling directly").
- Specific over vague: "400mg magnesium glycinate before bed" not "try magnesium."
- No filler. No "great question." No "it's important to note." No hedging.
- Never say "consult a healthcare professional" unless the marker is genuinely alarming.
- Never diagnose or tell them to stop medications.
- Do not start with ${patientName}'s name. Vary your openings.
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

    // If the user is asking about evidence/studies, pre-fetch relevant PubMed papers
    // and inject them into the system prompt before Claude responds
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user" && isEvidenceQuery(lastUserMessage.content)) {
      try {
        // Build search query from the user's message + any out-of-range biomarkers
        const outOfRange = labPanel?.biomarkers.filter((b: { status: string }) => b.status !== "optimal") ?? [];
        const topMarker  = outOfRange[0];
        const searchTerm = topMarker
          ? buildQuery(topMarker.name, lastUserMessage.content.slice(0, 80))
          : lastUserMessage.content.slice(0, 100);

        const papers = await Promise.race([
          pubmedSearchWithAbstracts(searchTerm, 2),
          new Promise<[]>(r => setTimeout(() => r([]), 5000)),
        ]);

        if (papers.length > 0) {
          systemPrompt += `\n\n## Live PubMed Evidence (retrieved for this query)\nCite these studies naturally in your response.\n\n${formatForPrompt(papers)}`;
        }
      } catch { /* non-blocking — continue without live citations */ }
    }

    const stream = await getClient().messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1024,
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
