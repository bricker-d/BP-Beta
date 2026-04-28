import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ── POST /api/report ─────────────────────────────────────────────────────────
// Returns a print-ready HTML document Dan can hand to patients
export async function POST(req: Request) {
  try {
    const { labPanel, actions, intakeProfile, dailyLogs, patientName } = await req.json();

    const firstName = patientName ?? intakeProfile?.name ?? "Patient";
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Build biomarker table
    const biomarkers = labPanel?.biomarkers ?? [];
    const outOfRange = biomarkers.filter((b: { status: string }) => b.status !== "optimal");
    const optimal = biomarkers.filter((b: { status: string }) => b.status === "optimal");

    // 30-day completion stats
    const logs = (dailyLogs ?? []).slice(-30);
    const completionRate = logs.length > 0
      ? Math.round(logs.reduce((sum: number, log: { actionCompletions: Record<string, boolean> }) => {
          const completions = Object.values(log.actionCompletions);
          return sum + (completions.filter(Boolean).length / Math.max(completions.length, 1));
        }, 0) / logs.length * 100)
      : null;

    // Generate clinical narrative with Claude
    const narrative = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `Write a clinical summary paragraph (3-4 sentences) for ${firstName}'s BioPrecision health report.

Out-of-range biomarkers: ${outOfRange.map((b: { name: string; value: number; unit: string; status: string }) => `${b.name}: ${b.value} ${b.unit} (${b.status})`).join(", ") || "None"}
Optimal biomarkers: ${optimal.length} markers within functional medicine ranges
Primary focus: ${intakeProfile?.primaryFocus ?? "general health"}
Goals: ${intakeProfile?.goals?.join(", ") ?? "not specified"}
30-day action completion rate: ${completionRate !== null ? completionRate + "%" : "not available"}

Write in third person (e.g. "The patient's..."). Clinical, concise, professional. This will be printed and handed to the patient.`
      }],
    });

    const narrativeText = narrative.content[0].type === "text" ? narrative.content[0].text : "";

    // Status colors
    const statusColor: Record<string, string> = {
      optimal: "#16a34a",
      borderline: "#d97706",
      elevated: "#dc2626",
      low: "#2563eb",
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BioPrecision Health Report — ${firstName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #fff; padding: 48px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #f3f4f6; }
    .brand { font-size: 22px; font-weight: 800; color: #9333ea; }
    .brand-sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }
    .report-meta { text-align: right; font-size: 13px; color: #6b7280; }
    .report-meta strong { color: #111827; display: block; font-size: 16px; }
    h2 { font-size: 16px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin: 32px 0 16px; }
    .narrative { background: #f9fafb; border-left: 4px solid #9333ea; padding: 16px 20px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.7; color: #374151; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; background: #f9fafb; font-weight: 600; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    tr:last-child td { border-bottom: none; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .actions-grid { display: grid; gap: 12px; }
    .action-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
    .action-title { font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 4px; }
    .action-why { font-size: 12px; color: #6b7280; line-height: 1.5; }
    .action-target { font-size: 11px; color: #9333ea; font-weight: 600; margin-top: 6px; }
    .stats-row { display: flex; gap: 24px; margin-bottom: 24px; }
    .stat { flex: 1; background: #f9fafb; border-radius: 10px; padding: 16px; text-align: center; }
    .stat-num { font-size: 28px; font-weight: 800; color: #111827; }
    .stat-lbl { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">BioPrecision</div>
      <div class="brand-sub">Frame Longevity · Precision Health Platform</div>
    </div>
    <div class="report-meta">
      <strong>${firstName}</strong>
      Report Date: ${today}
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-row">
    <div class="stat">
      <div class="stat-num">${biomarkers.length}</div>
      <div class="stat-lbl">Biomarkers Tested</div>
    </div>
    <div class="stat">
      <div class="stat-num" style="color:#dc2626">${outOfRange.length}</div>
      <div class="stat-lbl">Need Attention</div>
    </div>
    <div class="stat">
      <div class="stat-num" style="color:#16a34a">${optimal.length}</div>
      <div class="stat-lbl">Optimal Range</div>
    </div>
    ${completionRate !== null ? `<div class="stat"><div class="stat-num" style="color:#9333ea">${completionRate}%</div><div class="stat-lbl">30-Day Completion</div></div>` : ""}
  </div>

  <!-- Clinical narrative -->
  <h2>Clinical Summary</h2>
  <div class="narrative">${narrativeText}</div>

  <!-- Out of range biomarkers -->
  ${outOfRange.length > 0 ? `
  <h2>Biomarkers Requiring Action</h2>
  <table>
    <tr><th>Biomarker</th><th>Value</th><th>Optimal Range</th><th>Status</th><th>Change</th></tr>
    ${outOfRange.map((b: { name: string; value: number; unit: string; optimalMin: number; optimalMax: number; status: string; delta?: number }) => `
    <tr>
      <td><strong>${b.name}</strong></td>
      <td>${b.value} ${b.unit}</td>
      <td>${b.optimalMin}–${b.optimalMax} ${b.unit}</td>
      <td><span class="status-badge" style="background:${statusColor[b.status]}20;color:${statusColor[b.status]}">${b.status}</span></td>
      <td>${b.delta !== undefined ? (b.delta > 0 ? "+" : "") + b.delta + " " + b.unit : "—"}</td>
    </tr>`).join("")}
  </table>` : ""}

  <!-- Optimal biomarkers -->
  ${optimal.length > 0 ? `
  <h2>Optimal Biomarkers</h2>
  <table>
    <tr><th>Biomarker</th><th>Value</th><th>Optimal Range</th><th>Status</th></tr>
    ${optimal.map((b: { name: string; value: number; unit: string; optimalMin: number; optimalMax: number }) => `
    <tr>
      <td>${b.name}</td>
      <td>${b.value} ${b.unit}</td>
      <td>${b.optimalMin}–${b.optimalMax} ${b.unit}</td>
      <td><span class="status-badge" style="background:#dcfce7;color:#16a34a">Optimal</span></td>
    </tr>`).join("")}
  </table>` : ""}

  <!-- Daily actions -->
  ${actions?.length > 0 ? `
  <h2>Current Daily Protocol (${actions.length} Actions)</h2>
  <div class="actions-grid">
    ${actions.map((a: { title: string; why: string; biomarkerTarget?: string }) => `
    <div class="action-card">
      <div class="action-title">${a.title}</div>
      <div class="action-why">${a.why}</div>
      ${a.biomarkerTarget ? `<div class="action-target">→ ${a.biomarkerTarget}</div>` : ""}
    </div>`).join("")}
  </div>` : ""}

  <div class="footer">
    Generated by BioPrecision AI · Frame Longevity · ${today}<br>
    This report is for informational purposes. Consult your healthcare provider before making changes to your health routine.
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[report] error:", error);
    return Response.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
