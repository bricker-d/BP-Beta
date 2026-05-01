import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function POST(req: Request) {
  try {
    const { intakeProfile } = await req.json();

    const {
      name,
      painPoint,
      goals,
      timeHorizon,
      age,
      biologicalSex,
      sleepHours,
      exerciseDaysPerWeek,
      exerciseType,
      dietStyle,
      stressLevel,
      alcoholFrequency,
      medications,
      familyHistory,
      symptoms,
      notificationStyle,
    } = intakeProfile ?? {};

    const firstName = name?.split(" ")[0] ?? "there";

    const painMap: Record<string, string> = {
      exhausted: "persistent unexplained fatigue",
      weight: "weight gain despite doing everything right",
      normal: "labs that look 'normal' but don't feel normal",
      proactive: "wanting to catch problems before they start",
      optimize: "wanting to perform at their absolute peak",
      referred: "following clinical guidance to track their health closely",
    };

    const horizonMap: Record<string, string> = {
      "90d":  "within 90 days",
      "6mo":  "over 6 months",
      "long": "playing the long game",
    };

    const context = `
Patient name: ${firstName}
Age: ${age ?? "not specified"}, Sex: ${biologicalSex ?? "not specified"}
Primary concern: ${painMap[painPoint ?? ""] ?? painPoint ?? "general health improvement"}
Primary goal: ${goals?.[0] ?? "not specified"}
Time horizon: ${horizonMap[timeHorizon ?? ""] ?? "not specified"}
Sleep: ${sleepHours ? `${sleepHours} hours/night` : "not specified"}
Exercise: ${exerciseDaysPerWeek ? `${exerciseDaysPerWeek} days/week` : "not specified"}${exerciseType ? `, ${exerciseType}` : ""}
Diet: ${dietStyle ?? "not specified"}
Stress level: ${stressLevel ? `${stressLevel}/5` : "not specified"}
Alcohol: ${alcoholFrequency ?? "not specified"}
Medications: ${medications?.length ? medications.join(", ") : "none"}
Family history: ${familyHistory?.length ? familyHistory.join(", ") : "none noted"}
Symptoms: ${symptoms?.length ? symptoms.join(", ") : "none selected"}
Coaching style preference: ${notificationStyle ?? "direct"}
`.trim();

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Write 3 sentences from BioPrecision to ${firstName} after they just finished a health intake questionnaire.

Sound like a real person — not an AI, not a doctor's office, not a wellness app. Think: a brilliant friend who happens to know a lot about medicine and actually read what they filled out.

The tone is direct, warm, and specific. Reference something real from their answers — a symptom, a habit, a goal — not generic phrases. Do not say: "I understand", "It's clear that", "Based on your responses", "Thank you for sharing", "Your journey", "comprehensive", or anything that sounds like corporate wellness copy.

Do not start with their name. Do not label anything "Assessment" or use any headers. Just three plain sentences, no punctuation gimmicks.

What they shared:
${context}`,
      }],
    });

    const summary = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return Response.json({ summary });

  } catch (error) {
    console.error("[intake-summary] error:", error);
    return Response.json({ summary: "" }, { status: 500 });
  }
}
