import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { goal, context } = await req.json();

  if (!goal?.trim()) {
    return NextResponse.json({ error: "goal required" }, { status: 400 });
  }

  const prompt = `You are a clinical protocol designer for a functional medicine platform. A practitioner has described a clinical goal. Your job is to draft a complete, evidence-based clinical protocol with specific, actionable interventions.

Practitioner's goal: "${goal}"
${context ? `Additional context: ${context}` : ""}

Generate a complete protocol as a JSON object with this exact shape:
{
  "name": "Protocol name (concise, clinical, e.g. 'Insulin Resistance Reversal Protocol')",
  "description": "2-3 sentences describing the protocol's purpose, target patient, and expected outcomes",
  "focus_areas": ["one", "or", "more", "from: metabolic, hormones, cognitive, longevity, sleep, cardiac, weight"],
  "target_conditions": ["comma-separated clinical conditions this protocol addresses"],
  "actions": [
    {
      "title": "Specific, actionable instruction with dose/timing (e.g. 'Take 400mg magnesium glycinate at bedtime')",
      "description": "Patient-facing explanation — what to do, when, how, with specific product form if relevant",
      "mechanism": "Biological mechanism — HOW this works at a cellular/hormonal/metabolic level, referencing the specific pathophysiology",
      "category": "one of: Nutrition, Supplement, Exercise, Sleep, Lifestyle, Movement",
      "time_of_day": "morning, midday, or evening",
      "biomarker_targets": ["biomarker keys this action directly improves, e.g. fastingInsulin, hba1c"],
      "evidence_grade": "A (RCT), B (observational/meta-analysis), or C (mechanistic/expert consensus)",
      "effect_size": "Expected outcome with magnitude and timeline (e.g. '-1.2% HbA1c in 12 weeks')",
      "time_to_effect": "Expected time to see measurable results (e.g. '8-12 weeks')",
      "citations": ["PMID numbers only, 2-4 per action, real PMIDs from relevant studies"]
    }
  ]
}

Rules:
- Generate 6-10 actions covering multiple intervention categories (not all supplements)
- Every action must have a specific dose, timing, or quantity — no vague instructions
- Mechanisms must cite specific pathophysiology (e.g. "activates AMPK signaling, improving GLUT4 translocation")
- Effect sizes must be quantified with real numbers from literature
- Citations must be real PMIDs from published peer-reviewed studies
- Prioritize Grade A evidence where it exists
- Include nutrition, lifestyle, supplement, and exercise interventions — don't rely on one category
- Actions should be ordered from highest to lowest expected impact

Return ONLY the JSON object, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const draft = JSON.parse(match[0]);
    return NextResponse.json(draft);
  } catch (e) {
    console.error("Protocol draft error:", e);
    return NextResponse.json({ error: "AI draft failed" }, { status: 500 });
  }
}
