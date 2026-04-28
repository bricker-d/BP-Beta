import Anthropic from "@anthropic-ai/sdk";
import { LabPanel, WearableData } from "@/lib/types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

interface DailyLogEntry {
  date: string;
  actionCompletions: Record<string, boolean>;
  sleepQuality: number | null;
  energyLevel: number | null;
  stressLevel: number | null;
}

interface WeeklySummaryRequest {
  patientName?: string;
  labPanel?: LabPanel;
  wearableData?: WearableData;
  goals?: string[];
  primaryFocus?: string;
  dailyLogs: DailyLogEntry[];        // last 7 days
  actions: Array<{ id: string; title: string; targetBiomarkers: string[]; biomarkerTarget?: string }>;
}

export async function POST(req: Request) {
  try {
    const body: WeeklySummaryRequest = await req.json();
    const { patientName, labPanel, goals, primaryFocus, dailyLogs, actions } = body;

    if (!dailyLogs?.length) {
      return Response.json({ error: "No logs provided" }, { status: 400 });
    }

    const firstName = patientName?.split(" ")[0] ?? "there";

    // ── Build weekly stats ─────────────────────────────────────────────────
    const last7 = dailyLogs.slice(-7);
    const totalDays = last7.length;

    // Per-action completion rates
    const actionStats = actions.map(a => {
      const completedDays = last7.filter(log => log.actionCompletions[a.id] === true).length;
      return {
        title: a.title,
        biomarkerTarget: a.biomarkerTarget ?? a.targetBiomarkers.join(", "),
        completedDays,
        totalDays,
        pct: Math.round((completedDays / totalDays) * 100),
      };
    });

    // Overall completion
    const overallPct = Math.round(
      actionStats.reduce((s, a) => s + a.pct, 0) / Math.max(actionStats.length, 1)
    );

    // Wellbeing averages
    const sleepAvg = avg(last7.map(l => l.sleepQuality).filter(Boolean) as number[]);
    const energyAvg = avg(last7.map(l => l.energyLevel).filter(Boolean) as number[]);
    const stressAvg = avg(last7.map(l => l.stressLevel).filter(Boolean) as number[]);

    // Out of range biomarkers
    const outOfRange = labPanel?.biomarkers
      .filter(b => b.status !== "optimal")
      .map(b => `${b.name}: ${b.value} ${b.unit} (${b.status})`)
      .join(", ") ?? "No lab data";

    const prompt = `You are BioPrecision — a precision health AI coach delivering a weekly progress summary.

Patient: ${firstName}
Primary focus: ${primaryFocus ?? goals?.[0] ?? "overall health"}
Goals: ${goals?.join(", ") ?? "not specified"}

OUT-OF-RANGE BIOMARKERS being targeted:
${outOfRange}

THIS WEEK'S ACTION PERFORMANCE (${totalDays} days logged):
${actionStats.map(a => `- "${a.title}" → ${a.completedDays}/${totalDays} days (${a.pct}%) | targets: ${a.biomarkerTarget}`).join("\n")}

Overall completion rate: ${overallPct}%

WELLBEING TRENDS (1=worst, 5=best):
- Sleep quality: ${sleepAvg ? sleepAvg.toFixed(1) + "/5" : "not logged"}
- Energy level: ${energyAvg ? energyAvg.toFixed(1) + "/5" : "not logged"}
- Stress level: ${stressAvg ? stressAvg.toFixed(1) + "/5 (lower is better)" : "not logged"}

Write a weekly summary (4-6 sentences) that:
1. Opens with a specific observation about their best or worst performing action this week
2. Connects their completion rate to expected biomarker impact — be specific (e.g., "At 80% completion on post-meal walks, you're on track to see glucose improvement within 4–6 weeks")
3. Notes one wellbeing pattern if data exists (e.g., sleep trend affecting energy)
4. Gives ONE specific focus for next week — the single highest-leverage action to improve
5. Ends with a forward-looking biomarker target for their next lab panel

Be direct, clinical, and specific. Use ${firstName}'s name once. No generic motivational language. Sound like a knowledgeable physician reviewing their chart.`;

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const summary = response.content[0].type === "text" ? response.content[0].text : "";

    return Response.json({
      summary,
      stats: {
        overallPct,
        actionStats,
        sleepAvg,
        energyAvg,
        stressAvg,
        daysLogged: totalDays,
      },
    });
  } catch (error) {
    console.error("[weekly-summary] error:", error);
    return Response.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}
