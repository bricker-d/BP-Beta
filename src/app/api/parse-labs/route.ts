import Anthropic from "@anthropic-ai/sdk";
import { getBiomarkerStatus } from "@/lib/biomarkers";
import { LabPanel, Biomarker } from "@/lib/types";
let saveLabPanel: ((patientId: string, source: string, biomarkers: unknown[], date: string) => Promise<unknown>) | null = null;
try {
  // Supabase is optional — parse-labs works without it
  saveLabPanel = (await import("@/lib/supabase")).saveLabPanel;
} catch { /* supabase not configured */ }

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const PARSE_PROMPT = `You are a medical data extraction system for BioPrecision. Extract ALL biomarker values from the provided lab report.

Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Just the raw JSON array.

Schema for each item:
{
  "id": "snake_case_id — use IDs from the known list below when possible",
  "name": "Full biomarker name as printed on report",
  "shortName": "ABBREVIATION",
  "value": <number>,
  "unit": "unit string",
  "category": "metabolic" | "lipid" | "hormone" | "vitamin" | "inflammatory" | "cbc" | "kidney" | "liver" | "thyroid" | "nutrition",
  "optimalMin": <number — ALWAYS use functional medicine optimal ranges below, not lab reference ranges>,
  "optimalMax": <number>
}

FUNCTIONAL MEDICINE OPTIMAL RANGES (use these — stricter than conventional lab ranges):
METABOLIC:
- glucose → id=glucose, 70–85 mg/dL
- hba1c → id=hba1c, 4.3–5.4 %
- fastingInsulin → id=fastingInsulin, 2–6 µIU/mL
- uricAcid → id=uricAcid, 2.5–5.5 mg/dL

LIPIDS:
- totalCholesterol → id=totalCholesterol, 150–199 mg/dL
- ldl → id=ldl, 0–100 mg/dL (LDL-C)
- hdl → id=hdl, 60–120 mg/dL
- triglycerides → id=triglycerides, 0–100 mg/dL
- apoB → id=apoB, 0–90 mg/dL
- lpa → id=lpa, 0–75 nmol/L (or 0–30 mg/dL)
- vldl → id=vldl, 0–30 mg/dL
- nonHdlCholesterol → id=nonHdlCholesterol, 0–130 mg/dL

INFLAMMATORY:
- hscrp → id=hscrp, 0–0.5 mg/L
- homocysteine → id=homocysteine, 0–9 µmol/L
- fibrinogen → id=fibrinogen, 200–350 mg/dL
- esr → id=esr, 0–10 mm/hr
- il6 → id=il6, 0–3 pg/mL

HORMONES (male defaults — adjust if female):
- testosterone → id=testosterone, 600–900 ng/dL (female: 50–150)
- freeTesto → id=freeTesto, 100–150 pg/mL (female: 1–8.5 pg/mL) — NOTE: if value is in ng/dL, multiply by 10 to convert; dialysis method typically reports in pg/mL
- shbg → id=shbg, 20–60 nmol/L
- estradiol → id=estradiol, 20–40 pg/mL (female: 50–200)
- progesterone → id=progesterone, 1–3 ng/mL (female: 5–25)
- dheas → id=dheas, 200–400 µg/dL (female: 100–250)
- cortisol → id=cortisol, 10–18 µg/dL (AM)
- lh → id=lh, 2–9 IU/L
- fsh → id=fsh, 2–9 IU/L
- igf1 → id=igf1, 150–250 ng/mL
- prolactin → id=prolactin, 3–18 ng/mL

THYROID:
- tsh → id=tsh, 0.5–2.0 mIU/L
- freeT4 → id=freeT4, 1.0–1.5 ng/dL
- freeT3 → id=freeT3, 3.2–4.2 pg/mL
- reverseT3 → id=reverseT3, 0–15 ng/dL
- tpoAntibodies → id=tpoAntibodies, 0–9 IU/mL
- tgAntibodies → id=tgAntibodies, 0–4 IU/mL

VITAMINS & NUTRITION:
- vitaminD → id=vitaminD, 50–80 ng/mL
- vitaminB12 → id=vitaminB12, 700–1100 pg/mL
- folate → id=folate, 10–25 ng/mL (RBC folate)
- vitaminB6 → id=vitaminB6, 30–80 nmol/L (P5P)
- vitaminA → id=vitaminA, 50–70 µg/dL
- vitaminC → id=vitaminC, 0.6–2.0 mg/dL
- vitaminK2 → id=vitaminK2, 0.2–2.0 ng/mL
- ferritin → id=ferritin, 50–150 ng/mL (female: 40–100)
- magnesium → id=magnesium, 5.2–6.5 mg/dL (RBC) or 2.0–2.5 mg/dL (serum)
- zinc → id=zinc, 90–130 µg/dL
- selenium → id=selenium, 125–165 µg/L
- omega3Index → id=omega3Index, 8–12 %
- copperSerum → id=copperSerum, 85–110 µg/dL

CBC:
- hemoglobin → id=hemoglobin, 13.5–17.5 g/dL (female: 12–16)
- hematocrit → id=hematocrit, 40–52 % (female: 36–47)
- mcv → id=mcv, 82–92 fL
- wbc → id=wbc, 4.0–7.0 K/µL
- platelets → id=platelets, 150–350 K/µL
- neutrophils → id=neutrophils, 1.8–7.0 K/µL
- lymphocytes → id=lymphocytes, 1.0–4.0 K/µL

KIDNEY:
- creatinine → id=creatinine, 0.7–1.1 mg/dL (female: 0.6–0.9)
- egfr → id=egfr, 90–120 mL/min/1.73m²
- bun → id=bun, 10–20 mg/dL
- bunCreatinineRatio → id=bunCreatinineRatio, 10–16
- cystatinC → id=cystatinC, 0.5–1.0 mg/L
- microalbumin → id=microalbumin, 0–30 µg/mg creatinine

LIVER:
- alt → id=alt, 7–30 U/L
- ast → id=ast, 10–30 U/L
- ggt → id=ggt, 10–30 U/L
- alkalinePhosphatase → id=alkalinePhosphatase, 44–100 U/L
- totalBilirubin → id=totalBilirubin, 0.2–1.0 mg/dL
- albumin → id=albumin, 4.0–5.0 g/dL
- totalProtein → id=totalProtein, 6.5–8.0 g/dL

OTHER:
- glucose2hrPP → id=glucose2hrPP, 0–100 mg/dL (2-hour postprandial)
- hsCRP → id=hscrp (same as above)

For any biomarker NOT in this list: assign a sensible id, infer category, and use the lab's own reference range ±10% for the optimal range (conventional labs use disease thresholds, not optimal targets).

CRITICAL RULES:
1. Extract EVERY biomarker present — do not skip any values.
2. The "value" field must ALWAYS be a plain number. If the report shows "<0.2", use 0.2. If it shows ">120", use 120. Strip all operators.
3. Return valid JSON array only — no markdown, no code fences, no explanation.
4. For sex-specific ranges (testosterone, creatinine, hemoglobin, etc.) use MALE ranges unless the report indicates female patient.
5. If a biomarker panel is listed but no numeric value is shown (e.g. a header row only), skip it.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const source = (formData.get("source") as string) || "Unknown";
    const patientId = formData.get("patientId") as string | null ?? undefined;

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
        model: "claude-opus-4-6",
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
      return buildResponse(rawJson, source, file.name, patientId);
    } else {
      // Excel: treat as text for now (a real implementation would use xlsx library)
      textContent = await file.text();
    }

    // Parse text content with Claude
    const response = await getClient().messages.create({
      model: "claude-opus-4-6",
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

function buildResponse(rawJson: string, source: string, fileName: string, patientId?: string) {
  try {
    // Strip markdown code fences if present, then extract the JSON array
    const stripped = rawJson
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    const jsonMatch = stripped.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[parse-labs] No JSON array found in response. Raw:", rawJson.slice(0, 300));
      return Response.json({ error: "AI returned no structured data" }, { status: 500 });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.error("[parse-labs] Parsed array is empty. Raw:", rawJson.slice(0, 300));
      return Response.json({ error: "No biomarkers extracted from document" }, { status: 422 });
    }

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

    // Persist to Supabase if patient_id provided (fire-and-forget, don't block response)
    if (patientId && saveLabPanel) {
      saveLabPanel(patientId, source, biomarkers, panel.date).catch(() => {});
    }

    return Response.json({ panel, fileName });
  } catch {
    return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
