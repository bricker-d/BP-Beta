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

export async function POST(req: Request) {
  try {
    const { labPanel, wearableData, goals, patientName, biologicalSex }: {
      labPanel: LabPanel;
      wearableData?: WearableData;
      goals?: string[];
      patientName?: string;
      biologicalSex?: string;
    } = await req.json();

    if (!labPanel?.biomarkers?.length) {
      return Response.json({ error: "No lab panel provided" }, { status: 400 });
    }

    const isFemale = biologicalSex?.toLowerCase().includes("female") || biologicalSex?.toLowerCase().includes("woman");
    const outOfRange = labPanel.biomarkers.filter(b => b.status !== "optimal");

    interface CandidateAction {
      intervention: ClinicalIntervention;
      biomarkerId: string;
      biomarkerName: string;
      biomarkerValue: number;
      biomarkerUnit: string;
      biomarkerStatus: string;
      optimalRange: string;
      priority: number;
    }

    const candidates: CandidateAction[] = [];

    for (const biomarker of outOfRange) {
      const meta = BIOMARKER_LIBRARY[biomarker.id];
      if (!meta?.interventions?.length) continue;
      const optMin = isFemale && meta.optimalMinFemale !== undefined ? meta.optimalMinFemale : meta.optimalMin;
      const optMax = isFemale && meta.optimalMaxFemale !== undefined ? meta.optimalMaxFemale : meta.optimalMax;
      for (const intervention of meta.interventions) {
        if (intervention.contraindications?.toLowerCase().includes("pregnancy") && isFemale) continue;
        candidates.push({
          intervention,
          biomarkerId: biomarker.id,
          biomarkerName: meta.name,
          biomarkerValue: biomarker.value,
          biomarkerUnit: biomarker.unit,
          biomarkerStatus: biomarker.status,
          optimalRange: `${optMin}\u2013${optMax} ${biomarker.unit}`,
          priority: biomarker.status === "elevated" || biomarker.status === "low" ? 1 : 2,
        });
      }
    }

    // Wearable candidates
    if (wearableData?.dailySteps && wearableData.dailySteps < 7000) {
      candidates.push({
        intervention: {
          title: "Reach 8,000 steps today",
          description: `You're averaging ${wearableData.dailySteps.toLocaleString()} steps. Add a 20-min walk.`,
          category: "Movement",
          mechanism: "8,000 steps/day is associated with significantly lower all-cause mortality. Each 1,000 steps below this threshold increases risk.",
          effectSize: "Significant mortality risk reduction at 8,000+ steps/day",
          timeToEffect: "Cumulative; immediate cardiovascular effects",
          evidenceGrade: "A",
          citations: [{ authors: "Saint-Maurice PF, et al.", year: 2020, title: "Association of Daily Step Count and Step Intensity With Mortality Among US Adults", journal: "JAMA", pmid: "32207799", finding: "8,000-12,000 steps/day was associated with significantly lower all-cause mortality." }],
          targetBiomarkers: ["glucose", "triglycerides"],
        },
        biomarkerId: "wearable", biomarkerName: "Daily Activity", biomarkerValue: wearableData.dailySteps, biomarkerUnit: "steps", biomarkerStatus: "low", optimalRange: "8,000+ steps", priority: 3,
      });
    }

    if (candidates.length === 0) {
      return Response.json({
        actions: [{
          id: "maintain-1", title: "All biomarkers are within optimal range", description: "Your lab results show excellent metabolic health. Focus on maintaining your current habits.",
          category: "Lifestyle", why: "Consistency is the most underrated health intervention. Your lifestyle is producing optimal biomarker results.", completed: false, targetBiomarkers: [], biomarkerTarget: "All markers optimal", evidenceGrade: "A", citations: [], effectSize: "Maintenance", timeToEffect: "Ongoing",
        }],
        disclaimer: CLINICAL_DISCLAIMER,
      });
    }

    const labContext = outOfRange.map(b => {
      const meta = BIOMARKER_LIBRARY[b.id];
      return `- ${b.name}: ${b.value} ${b.unit} [${b.status.toUpperCase()}] | optimal: ${b.optimalMin}\u2013${b.optimalMax} ${b.unit}\n  ${meta?.clinicalSignificance ?? ""}`;
    }).join("\n\n");

    const wearableContext = wearableData ? `\nWEARABLE: Steps ${wearableData.dailySteps}/day | Sleep ${wearableData.sleepDuration}hrs | HRV ${wearableData.hrv}ms` : "";

    const candidateContext = candidates.slice(0, 20).map((c, i) => `[${i+1}] ${c.biomarkerName} (${c.biomarkerValue} ${c.biomarkerUnit}) | ${c.intervention.title} | Grade ${c.intervention.evidenceGrade} | Effect: ${c.intervention.effectSize} | Citation: ${formatCitation(c.intervention.citations[0])} — "${c.intervention.citations[0]?.finding ?? ""}"`).join("\n");

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `You are the BioPrecision clinical action ranking agent. Select exactly 5 evidence-based interventions.

PATIENT: ${patientName ?? "Patient"} | Sex: ${biologicalSex ?? "not specified"} | Goals: ${goals?.join(", ") ?? "not specified"}

OUT-OF-RANGE BIOMARKERS:
${labContext}
${wearableContext}

CANDIDATE INTERVENTIONS (select 5):
${candidateContext}

RULES:
1. Exactly 5 interventions, ranked by clinical impact
2. Prefer Grade A evidence; avoid redundancy; balance categories
3. Personalize description with patient's actual value
4. Include study name+year in "why" field
5. Include contraindications note in description if relevant

Return ONLY valid JSON array of 5 objects — no markdown:
[{"id":"action-1","title":"","description":"personalized with actual value","category":"Movement|Nutrition|Exercise|Sleep|Supplement|Lifestyle","why":"mechanism + study finding (2-3 sentences)","completed":false,"targetBiomarkers":["id"],"biomarkerTarget":"Marker: value → target range","evidenceGrade":"A","citations":["formatted citation"],"effectSize":"","timeToEffect":""}]`,
      }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return Response.json({ error: "Failed to generate actions" }, { status: 500 });
    const actions: HealthAction[] = JSON.parse(jsonMatch[0]);

    // Enrich each action with a live PubMed citation (parallel, 5s timeout per action)
    const enriched = await Promise.all(
      actions.map(async action => {
        try {
          const biomarkerName = action.targetBiomarkers?.[0] ?? "";
          const query = buildQuery(biomarkerName, action.title);
          const papers = await Promise.race([
            pubmedSearch(query, 1),
            new Promise<[]>(r => setTimeout(() => r([]), 5000)),
          ]);
          if (papers.length > 0) {
            const liveCitation = fmtPubMed(papers[0]);
            return {
              ...action,
              citations: [liveCitation, ...(action.citations ?? [])].slice(0, 3),
            };
          }
        } catch { /* keep action as-is on failure */ }
        return action;
      })
    );

    return Response.json({ actions: enriched, disclaimer: CLINICAL_DISCLAIMER, biomarkersAddressed: outOfRange.map(b => b.name) });

  } catch (error) {
    console.error("[generate-actions] error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
