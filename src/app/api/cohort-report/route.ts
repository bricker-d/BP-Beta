import Anthropic from "@anthropic-ai/sdk";
import { getPatientOverview, getCohortOutcomes } from "@/lib/supabase";

let _client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function POST() {
  try {
    const [patients, outcomes] = await Promise.all([
      getPatientOverview(),
      getCohortOutcomes(),
    ]);

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const totalPatients = patients.length;
    const checkedInToday = patients.filter((p: { days_since_checkin: number | null }) => p.days_since_checkin === 0).length;
    const avgCompletion = totalPatients
      ? Math.round(patients.reduce((s: number, p: { weekly_completion_pct: number | null }) => s + (p.weekly_completion_pct ?? 0), 0) / totalPatients)
      : 0;
    const needAttention = patients.filter((p: { days_since_checkin: number | null }) => (p.days_since_checkin ?? 99) > 3).length;

    const topImproved = outcomes
      .filter(o => o.improved > o.worsened)
      .slice(0, 5);
    const topWatch = outcomes
      .filter(o => o.worsened > 0)
      .slice(0, 5);

    const contextForClaude = `
Frame Longevity BioPrecision Cohort — ${today}

COHORT SUMMARY:
- Total enrolled patients: ${totalPatients}
- Checked in today: ${checkedInToday}
- Average 7-day protocol completion: ${avgCompletion}%
- Patients needing attention (3+ days without check-in): ${needAttention}

BIOMARKER OUTCOMES (patients with 2+ panels):
${topImproved.map(o => `- ${o.biomarkerName}: ${o.improved}/${o.totalPatients} patients improved`).join("\n") || "Not enough panels yet for outcomes data."}

MARKERS TO WATCH:
${topWatch.map(o => `- ${o.biomarkerName}: ${o.worsened}/${o.totalPatients} patients worsened`).join("\n") || "None identified."}
    `.trim();

    const aiResponse = await getClient().messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `You are writing a monthly clinical outcomes summary for Frame Longevity clinic. Write a concise 3-paragraph narrative (no headers, no bullet points — flowing prose) that:
1. Summarizes overall cohort engagement and protocol adherence
2. Highlights the most meaningful biomarker improvements and what they suggest about protocol effectiveness
3. Identifies any patterns or markers worth discussing at the next clinical review

Keep it clinical but readable — the audience is Dan Bricker and his clinical team. Under 200 words total.

Data:
${contextForClaude}`,
      }],
    });

    const narrative = aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BioPrecision Cohort Report — ${today}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 48px; max-width: 820px; margin: 0 auto; }
  h1 { font-size: 26px; font-weight: 800; color: #111; letter-spacing: -0.03em; }
  .meta { font-size: 13px; color: #888; margin-top: 4px; margin-bottom: 32px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
  .stat-value { font-size: 28px; font-weight: 800; color: #111; }
  .stat-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 12px; }
  .narrative { font-size: 14px; line-height: 1.7; color: #374151; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; }
  td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  tr:last-child td { border-bottom: none; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .pill-green { background: rgba(5,150,105,0.1); color: #059669; }
  .pill-yellow { background: rgba(245,158,11,0.1); color: #d97706; }
  .pill-red { background: rgba(220,38,38,0.1); color: #dc2626; }
  .pill-gray { background: #f3f4f6; color: #6b7280; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #d1d5db; text-align: center; }
  @media print { body { padding: 32px; } }
</style>
</head>
<body>

<h1>BioPrecision Cohort Report</h1>
<p class="meta">Frame Longevity · ${today} · Confidential</p>

<div class="stats">
  <div class="stat">
    <div class="stat-value">${totalPatients}</div>
    <div class="stat-label">Enrolled Patients</div>
  </div>
  <div class="stat">
    <div class="stat-value">${checkedInToday}</div>
    <div class="stat-label">Checked In Today</div>
  </div>
  <div class="stat">
    <div class="stat-value">${avgCompletion}%</div>
    <div class="stat-label">Avg 7-Day Completion</div>
  </div>
  <div class="stat">
    <div class="stat-value">${needAttention}</div>
    <div class="stat-label">Need Attention</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Clinical Summary</div>
  <p class="narrative">${narrative.replace(/\n\n/g, "</p><p class=\"narrative\" style=\"margin-top:12px\">")}</p>
</div>

${outcomes.length > 0 ? `
<div class="section">
  <div class="section-title">Biomarker Outcomes (patients with 2+ panels)</div>
  <table>
    <thead>
      <tr>
        <th>Biomarker</th>
        <th>Patients</th>
        <th>Improved</th>
        <th>Stable</th>
        <th>Worsened</th>
        <th>Improvement Rate</th>
      </tr>
    </thead>
    <tbody>
      ${outcomes.slice(0, 12).map(o => {
        const rate = Math.round((o.improved / o.totalPatients) * 100);
        const pillClass = rate >= 60 ? "pill-green" : rate >= 40 ? "pill-yellow" : "pill-red";
        return `<tr>
          <td><strong>${o.biomarkerName}</strong></td>
          <td>${o.totalPatients}</td>
          <td>${o.improved}</td>
          <td>${o.stable}</td>
          <td>${o.worsened}</td>
          <td><span class="pill ${pillClass}">${rate}%</span></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
</div>
` : ""}

<div class="section">
  <div class="section-title">Patient Roster</div>
  <table>
    <thead>
      <tr>
        <th>Patient</th>
        <th>Primary Focus</th>
        <th>Latest Panel</th>
        <th>7-Day Completion</th>
        <th>Last Check-In</th>
      </tr>
    </thead>
    <tbody>
      ${patients.map((p: {
        name: string | null;
        age: number | null;
        biological_sex: string | null;
        primary_focus: string | null;
        latest_panel_date: string | null;
        weekly_completion_pct: number | null;
        days_since_checkin: number | null;
      }) => {
        const days = p.days_since_checkin;
        const checkinLabel = days === null ? "Never" : days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`;
        const checkinClass = days === null ? "pill-gray" : days === 0 ? "pill-green" : days <= 3 ? "pill-yellow" : "pill-red";
        const compPct = p.weekly_completion_pct;
        const compClass = compPct === null ? "pill-gray" : compPct >= 80 ? "pill-green" : compPct >= 50 ? "pill-yellow" : "pill-red";
        return `<tr>
          <td><strong>${p.name ?? "Anonymous"}</strong>${p.age ? `<br><span style="font-size:11px;color:#9ca3af">${p.age}${p.biological_sex ? " · " + p.biological_sex : ""}</span>` : ""}</td>
          <td>${p.primary_focus?.replace(/_/g, " ") ?? "—"}</td>
          <td>${p.latest_panel_date ? new Date(p.latest_panel_date).toLocaleDateString() : "—"}</td>
          <td><span class="pill ${compClass}">${compPct !== null ? compPct + "%" : "No data"}</span></td>
          <td><span class="pill ${checkinClass}">${checkinLabel}</span></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
</div>

<div class="footer">
  BioPrecision · Frame Longevity · This report is for clinical use only and does not constitute medical advice.
</div>

</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("[cohort-report] error:", error);
    return Response.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
