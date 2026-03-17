import Anthropic from "@anthropic-ai/sdk";
import { getBiomarkerStatus } from "@/lib/biomarkers";
import { LabPanel, Biomarker } from "@/lib/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PARSE_PROMPT = `You are a medical data extraction system. Extract all biomarker values from the provided lab report text.

Return a JSON array of biomarkers with this exact schema:
[
  {
    "id": "snake_case_id",
    "name": "Full biomarker name",
    "shortName": "ABBREV",
    "value": 102,
    "unit": "mg/dL",
    "category": "metabolic" | "lipid" | "hormone" | "vitamin" | "inflammatory",
    "optimalMin": 70,
    "optimalMax": 99
  }
]

Common reference ranges:
- Fasting Glucose: 70–99 mg/dL (optimal), metabolic
- HbA1c: 4.0–5.6% (optimal), metabolic
- LDL Cholesterol: 0–100 mg/dL (optimal), lipid
- HDL Cholesterol: 60–120 mg/dL (optimal), lipid
- Triglycerides: 0–150 mg/dL (optimal), lipid
- Vitamin D: 40–80 ng/mL (optimal), vitamin
- CRP: 0–1.0 mg/L (optimal), inflammatory
- Testosterone (male): 400–900 ng/dL (optimal), hormone

Extract ONLY values that are clearly present in the document. Return valid JSON only, no other text.`;

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

      const response = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 2048,
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
    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${PARSE_PROMPT}\n\nLab report content:\n\`\`\`\n${textContent.slice(0, 8000)}\n\`\`\``,
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
