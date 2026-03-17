import Anthropic from "@anthropic-ai/sdk";
import { LabPanel, WearableData } from "@/lib/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(labPanel?: LabPanel, wearableData?: WearableData): string {
  let context = "";

  if (labPanel) {
    const markers = labPanel.biomarkers
      .map((b) => `- ${b.name}: ${b.value} ${b.unit} (${b.status})`)
      .join("\n");
    context += `\n\nPatient Lab Results (${labPanel.date}, ${labPanel.source}):\n${markers}`;
  }

  if (wearableData) {
    context += `\n\nWearable Data (7-day avg, ${wearableData.source}):
- Daily Steps: ${wearableData.dailySteps.toLocaleString()}
- Sleep Duration: ${wearableData.sleepDuration} hrs
- Resting Heart Rate: ${wearableData.restingHeartRate} bpm
- HRV (RMSSD): ${wearableData.hrv} ms (${wearableData.hrvTrend > 0 ? "+" : ""}${wearableData.hrvTrend}% trend)`;
  }

  return `You are BioPrecision AI, a personalized health intelligence coach. You interpret biomarker lab results and wearable data to provide evidence-based, actionable health guidance.

Your communication style:
- Speak in plain language — no medical jargon unless explaining it
- Be direct and specific (not vague platitudes)
- Cite mechanisms briefly when explaining why something works
- Always tie recommendations back to the patient's specific numbers
- Acknowledge when something requires a doctor's supervision
- Never diagnose — you provide context and education, not diagnosis
- Keep responses concise but complete (2-4 short paragraphs max)
${context}

When asked about labs, always reference the actual values. When making recommendations, always explain the mechanism briefly.`;
}

export async function POST(req: Request) {
  try {
    const { messages, labPanel, wearableData } = await req.json();

    const systemPrompt = buildSystemPrompt(labPanel, wearableData);

    // Use streaming
    const stream = await client.messages.stream({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Convert to SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({
                choices: [{ delta: { content: event.delta.text } }],
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
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
    return new Response(JSON.stringify({ error: "Chat failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
