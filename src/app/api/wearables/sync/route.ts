import { getSupabase } from "@/lib/supabase";

interface WearableData {
  source: string;
  dailySteps: number;
  sleepDuration: number;
  sleepScore: number;
  restingHeartRate: number;
  hrv: number;
  hrvTrend: number;
  readinessScore: number;
  lastUpdated: string;
}

// ── Token refresh helpers ─────────────────────────────────────────────────────

async function refreshOuraToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const res = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.OURA_CLIENT_ID!,
      client_secret: process.env.OURA_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function refreshWhoopToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Oura data fetch ───────────────────────────────────────────────────────────

async function fetchOuraData(accessToken: string): Promise<WearableData> {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const headers = { Authorization: `Bearer ${accessToken}` };

  const [sleepRes, activityRes, readinessRes, heartRateRes] = await Promise.all([
    fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${weekAgo}&end_date=${today}`, { headers }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${weekAgo}&end_date=${today}`, { headers }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${weekAgo}&end_date=${today}`, { headers }),
    fetch(`https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${weekAgo}T00:00:00&end_datetime=${today}T23:59:59`, { headers }),
  ]);

  const [sleepData, activityData, readinessData] = await Promise.all([
    sleepRes.ok ? sleepRes.json() : { data: [] },
    activityRes.ok ? activityRes.json() : { data: [] },
    readinessRes.ok ? readinessRes.json() : { data: [] },
  ]);

  // Get most recent day's data
  const latestSleep = sleepData.data?.[sleepData.data.length - 1];
  const latestActivity = activityData.data?.[activityData.data.length - 1];
  const latestReadiness = readinessData.data?.[readinessData.data.length - 1];

  // 7-day averages
  const avgSteps = activityData.data?.length
    ? Math.round(activityData.data.reduce((s: number, d: { steps?: number }) => s + (d.steps ?? 0), 0) / activityData.data.length)
    : 0;

  const avgSleepHrs = sleepData.data?.length
    ? parseFloat((sleepData.data.reduce((s: number, d: { contributors?: { total_sleep?: number } }) => s + (d.contributors?.total_sleep ?? 0), 0) / sleepData.data.length / 60).toFixed(1))
    : 0;

  // HRV from readiness contributors (7-day avg)
  const avgHRV = readinessData.data?.length
    ? Math.round(readinessData.data.reduce((s: number, d: { contributors?: { hrv_balance?: number } }) => s + (d.contributors?.hrv_balance ?? 0), 0) / readinessData.data.length)
    : 0;

  // HRV trend: compare last 3 days vs previous 4
  const recent = readinessData.data?.slice(-3) ?? [];
  const older = readinessData.data?.slice(0, 4) ?? [];
  const recentHRV = recent.length ? recent.reduce((s: number, d: { contributors?: { hrv_balance?: number } }) => s + (d.contributors?.hrv_balance ?? 0), 0) / recent.length : avgHRV;
  const olderHRV = older.length ? older.reduce((s: number, d: { contributors?: { hrv_balance?: number } }) => s + (d.contributors?.hrv_balance ?? 0), 0) / older.length : avgHRV;
  const hrvTrend = olderHRV > 0 ? parseFloat(((recentHRV - olderHRV) / olderHRV * 100).toFixed(1)) : 0;

  return {
    source: "oura",
    dailySteps: avgSteps,
    sleepDuration: avgSleepHrs,
    sleepScore: latestSleep?.score ?? 0,
    restingHeartRate: latestActivity?.resting_time ?? 60,
    hrv: avgHRV,
    hrvTrend,
    readinessScore: latestReadiness?.score ?? 0,
    lastUpdated: new Date().toISOString(),
  };
}

// ── WHOOP data fetch ──────────────────────────────────────────────────────────

async function fetchWhoopData(accessToken: string): Promise<WearableData> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const [recoveryRes, sleepRes, cycleRes] = await Promise.all([
    fetch("https://api.prod.whoop.com/developer/v1/recovery?limit=7", { headers }),
    fetch("https://api.prod.whoop.com/developer/v1/activity/sleep?limit=7", { headers }),
    fetch("https://api.prod.whoop.com/developer/v1/cycle?limit=7", { headers }),
  ]);

  const [recoveryData, sleepData, cycleData] = await Promise.all([
    recoveryRes.ok ? recoveryRes.json() : { records: [] },
    sleepRes.ok ? sleepRes.json() : { records: [] },
    cycleRes.ok ? cycleRes.json() : { records: [] },
  ]);

  const latestRecovery = recoveryData.records?.[0];
  const avgSleepMs = sleepData.records?.length
    ? sleepData.records.reduce((s: number, r: { score?: { total_in_bed_time_milli?: number } }) =>
        s + (r.score?.total_in_bed_time_milli ?? 0), 0) / sleepData.records.length
    : 0;

  const avgHRV = recoveryData.records?.length
    ? Math.round(recoveryData.records.reduce((s: number, r: { score?: { hrv_rmssd_milli?: number } }) =>
        s + (r.score?.hrv_rmssd_milli ?? 0), 0) / recoveryData.records.length)
    : 0;

  const recent = recoveryData.records?.slice(0, 3) ?? [];
  const older = recoveryData.records?.slice(3) ?? [];
  const recentHRV = recent.length ? recent.reduce((s: number, r: { score?: { hrv_rmssd_milli?: number } }) => s + (r.score?.hrv_rmssd_milli ?? 0), 0) / recent.length : avgHRV;
  const olderHRV = older.length ? older.reduce((s: number, r: { score?: { hrv_rmssd_milli?: number } }) => s + (r.score?.hrv_rmssd_milli ?? 0), 0) / older.length : avgHRV;
  const hrvTrend = olderHRV > 0 ? parseFloat(((recentHRV - olderHRV) / olderHRV * 100).toFixed(1)) : 0;

  return {
    source: "whoop",
    dailySteps: 0, // WHOOP doesn't track steps
    sleepDuration: parseFloat((avgSleepMs / 3600000).toFixed(1)),
    sleepScore: Math.round((latestRecovery?.score?.sleep_performance_percentage ?? 0)),
    restingHeartRate: latestRecovery?.score?.resting_heart_rate ?? 60,
    hrv: avgHRV,
    hrvTrend,
    readinessScore: Math.round((latestRecovery?.score?.recovery_score ?? 0)),
    lastUpdated: new Date().toISOString(),
  };
}

// ── POST /api/wearables/sync ──────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { patientId } = await req.json();
    if (!patientId) return Response.json({ error: "patientId required" }, { status: 400 });

    // Get connection from Supabase
    const { data: conn, error } = await getSupabase()
      .from("wearable_connections")
      .select("*")
      .eq("patient_id", patientId)
      .order("connected_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !conn) {
      return Response.json({ error: "No wearable connected", connected: false }, { status: 404 });
    }

    let accessToken = conn.access_token;

    // Refresh token if expired
    const expiresAt = new Date(conn.token_expires_at).getTime();
    if (Date.now() > expiresAt - 60000) {
      const refreshFn = conn.provider === "oura" ? refreshOuraToken : refreshWhoopToken;
      const refreshed = await refreshFn(conn.refresh_token);
      if (refreshed) {
        accessToken = refreshed.access_token;
        await getSupabase()
          .from("wearable_connections")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          })
          .eq("id", conn.id);
      }
    }

    // Fetch real data
    const wearableData = conn.provider === "oura"
      ? await fetchOuraData(accessToken)
      : await fetchWhoopData(accessToken);

    return Response.json({ connected: true, provider: conn.provider, wearableData });
  } catch (error) {
    console.error("[wearables/sync] error:", error);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }
}

// ── GET /api/wearables/sync?patientId=xxx — check connection status ───────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  if (!patientId) return Response.json({ error: "patientId required" }, { status: 400 });

  const { data: conn } = await getSupabase()
    .from("wearable_connections")
    .select("provider, connected_at, token_expires_at")
    .eq("patient_id", patientId)
    .limit(1)
    .single();

  if (!conn) return Response.json({ connected: false });
  return Response.json({ connected: true, provider: conn.provider, connectedAt: conn.connected_at });
}
