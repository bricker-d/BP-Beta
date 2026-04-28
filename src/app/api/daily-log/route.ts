import { saveDailyLog, getDailyLogs } from "@/lib/supabase";

// ── POST /api/daily-log — save a morning check-in ─────────────────────────────
export async function POST(req: Request) {
  try {
    const { patientId, log } = await req.json();

    if (!patientId || !log) {
      return Response.json({ error: "patientId and log required" }, { status: 400 });
    }

    const saved = await saveDailyLog(patientId, {
      log_date:           log.date,
      action_completions: log.actionCompletions,
      sleep_quality:      log.sleepQuality,
      energy_level:       log.energyLevel,
      stress_level:       log.stressLevel,
    });

    if (!saved) {
      return Response.json({ error: "Failed to save log" }, { status: 500 });
    }

    return Response.json({ success: true, log: saved });
  } catch (error) {
    console.error("[daily-log] save error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET /api/daily-log?patientId=xxx&days=30 ──────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const days = parseInt(searchParams.get("days") ?? "30");

    if (!patientId) {
      return Response.json({ error: "patientId required" }, { status: 400 });
    }

    const logs = await getDailyLogs(patientId, days);
    return Response.json({ logs });
  } catch (error) {
    console.error("[daily-log] fetch error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
