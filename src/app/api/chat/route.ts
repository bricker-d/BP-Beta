import Anthropic from "@anthropic-ai/sdk";
import { LabPanel, WearableData } from "@/lib/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  });

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

                      function buildSystemPrompt(
                        labPanel?: LabPanel,
                          wearableData?: WearableData,
                            intakeProfile?: IntakeProfile
                            ): string {
                              let context = "";

                                // ── Intake profile context ───────────────────────────────────────────────────
                                  if (intakeProfile) {
                                      const name = intakeProfile.name ?? "the user";
                                          const age = intakeProfile.age ? `${intakeProfile.age} years old` : "";
                                              const sex = intakeProfile.biologicalSex ?? "";
                                                  const goals = intakeProfile.goals?.join(", ") ?? "";
                                                      const symptoms = intakeProfile.symptoms
                                                            ?.filter((s) => s !== "none")
                                                                  .join(", ") ?? "";

                                                                      context += `\n\nPatient Profile:
                                                                      - Name: ${name}${age ? `, ${age}` : ""}${sex ? `, ${sex}` : ""}
                                                                      - Health goals: ${goals || "not specified"}
                                                                      - Reported symptoms: ${symptoms || "none"}${intakeProfile.symptomsOther ? ` (${intakeProfile.symptomsOther})` : ""}${intakeProfile.wearableSource ? `\n- Wearable: ${intakeProfile.wearableSource}` : ""}`;
                                                                        }

                                                                          // ── Lab results context ──────────────────────────────────────────────────────
                                                                            if (labPanel) {
                                                                                const markers = labPanel.biomarkers
                                                                                      .map((b) => `- ${b.name}: ${b.value} ${b.unit} (${b.status})`)
                                                                                            .join("\n");
                                                                                                context += `\n\nLab Results (${labPanel.date}, ${labPanel.source}):\n${markers}`;
                                                                                                  }

                                                                                                    // ── Wearable context ─────────────────────────────────────────────────────────
                                                                                                      if (wearableData) {
                                                                                                          context += `\n\nWearable Data (7-day avg, ${wearableData.source}):
                                                                                                          - Daily Steps: ${wearableData.dailySteps.toLocaleString()}
                                                                                                          - Sleep Duration: ${wearableData.sleepDuration} hrs
                                                                                                          - Resting Heart Rate: ${wearableData.restingHeartRate} bpm
                                                                                                          - HRV (RMSSD): ${wearableData.hrv} ms (${wearableData.hrvTrend > 0 ? "+" : ""}${wearableData.hrvTrend}% trend)`;
                                                                                                            }

                                                                                                              const patientName = intakeProfile?.name?.split(" ")[0] ?? "the user";

                                                                                                                return `You are BioPrecision AI, a personalized health intelligence coach for ${patientName}. You interpret biomarker lab results and wearable data to provide evidence-based, actionable health guidance.

                                                                                                                Your communication style:
                                                                                                                - Speak in plain language — no medical jargon unless explaining it
                                                                                                                - Be direct and specific (not vague platitudes)
                                                                                                                - Cite mechanisms briefly when explaining why something works
                                                                                                                - Always tie recommendations back to the patient's specific numbers and goals
                                                                                                                - Acknowledge when something requires a doctor's supervision
                                                                                                                - Never diagnose — you provide context and education, not diagnosis
                                                                                                                - Keep responses concise but complete (2-4 short paragraphs max)
                                                                                                                - Always use the patient's first name when addressing them
                                                                                                                ${context}

                                                                                                                When asked about labs, always reference the actual values. When making recommendations, always explain the mechanism briefly and connect to their stated goals.`;
                                                                                                                }

                                                                                                                export async function POST(req: Request) {
                                                                                                                  try {
                                                                                                                      const { messages, labPanel, wearableData, intakeProfile } = await req.json();

                                                                                                                          const systemPrompt = buildSystemPrompt(labPanel, wearableData, intakeProfile);

                                                                                                                              // Use streaming
                                                                                                                                  const stream = await client.messages.stream({
                                                                                                                                        model: "claude-3-5-sonnet-20241022",
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