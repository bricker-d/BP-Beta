import Anthropic from "@anthropic-ai/sdk";
import { getBiomarkerStatus } from "@/lib/biomarkers";
import { LabPanel, Biomarker } from "@/lib/types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const PARSE_PROMPT = `You are a medical data extraction system for BioPrecision. Extract all biomarker values from the provided lab report.

Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Just the raw JSON array.

Schema for each item:
{
  "id": "snake_case_id matching these known IDs when possible: glucose, hba1c, totalCholesterol, ldl, hdl, triglycerides, hscrp, vitaminD, testosterone, cortisol, ferritin, tsh",
  "name": "Full biomarker name as printed on report",
  "shortName": "ABBREVIATION",
  "value": <number>,
  "unit": "unit string",
  "category": "metabolic" | "lipid" | "hormone" | "vitamin" | "inflammatory",
  "optimalMin": <number — use functional medicine optimal ranges, not just lab reference ranges>,
  "optimalMax": <number>
}

Functional medicine optimal ranges to use:
- Fasting Glucose: id=glucose, 70–99 mg/dL, metabolic
- HbA1c: id=hba1c, 4.8–5.4 %, metabolic
- Total Cholesterol: id=totalCholesterol, 150–199 mg/dL, lipid
- LDL Cholesterol: id=ldl, 0–100 mg/dL, lipid
- HDL Cholesterol: id=hdl, 60–120 mg/dL, lipid
- Triglycerides: id=triglycerides, 0–100 mg/dL, lipid
- hs-CRP: id=hscrp, 0–0.5 mg/L, inflammatory
- Vitamin D (25-OH): id=vitaminD, 50–80 ng/mL, vitamin
- Total Testosterone: id=testosterone, 600–900 ng/dL (men) / 50–150 (women), hormone
- Cortisol AM: id=cortisol, 10–18 mcg/dL, hormone
- Ferritin: id=ferritin, 50–150 ng/mL (men) / 40–100 (women), metabolic
- TSH: id=tsh, 0.5–2.0 mIU/L, hormone

For any biomarker not in the above list, assign a sensible id, infer category, and use the lab's own reference range as the optimal range.
Extract EVERY biomarker present in the document. Return valid JSON array only.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const source = (formData.get("source") as string) || "Unknown";

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    let textContent = "";

    // Handle different file types
    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      textContent = await file.text();
    } else if (file.type === "application/pdf") {
      // For PDF: convert to base64 and use Claude vision
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const response = await getClient().messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: PARSE_PROMPT,
              },
            ],
          },
        ],
      });

      const rawJson = response.content[0].type === "text" ? response.content[0].text : "[]";
      return buildResponse(rawJson, source, file.name);
    } else {
      // Excel: treat as text for now (a real implementation would use xlsx library)
      textContent = await file.text();
    }

    // Parse text content with Claude
    const response = await getClient().messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${PARSE_PROMPT}\n\nLab report content:\n\`\`\`\n${textContent.slice(0, 12000)}\n\`\`\``,
        },
      ],
    });

    const rawJson = response.content[0].type === "text" ? response.content[0].text : "[]";
    return buildResponse(rawJson, source, file.name);
  } catch (error) {
    console.error("Lab parsing error:", error);
    return Response.json({ error: "Failed to parse lab results" }, { status: 500 });
  }
}

function buildResponse(rawJson: string, source: string, fileName: string) {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = rawJson.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawJson);

    const biomarkers: Biomarker[] = parsed.map((b: Omit<Biomarker, "status">) => ({
      ...b,
      status: getBiomarkerStatus(b.value, b.optimalMin, b.optimalMax),
    }));

    const panel: LabPanel = {
      id: `panel-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      source,
      biomarkers,
    };

    return Response.json({ panel, fileName });
  } catch {
    return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
