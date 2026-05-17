import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { upsertPatient, upsertPatientByAuthId, getPatientByDeviceId, getLabPanels, getDailyLogs, getChatHistory } from "@/lib/supabase";

// ── POST /api/patient — upsert patient, return full state ─────────────────────
export async function POST(req: NextRequest) {
  try {
    const { deviceId, profile } = await req.json();

    // Try to identify via Supabase auth session first
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();

    const profileData = {
      name:            profile?.name,
      primary_focus:   profile?.primaryFocus,
      goals:           profile?.goals,
      age:             profile?.age,
      biological_sex:  profile?.biologicalSex,
      height_ft:       profile?.heightFt,
      height_in:       profile?.heightIn,
      weight_lbs:      profile?.weightLbs,
      symptoms:        profile?.symptoms,
      habits:          profile?.habits,
      wearable_source: profile?.wearableSource,
      lab_data_source: profile?.labDataSource,
    };

    // If authenticated, upsert by auth_user_id (cross-device identity)
    const patient = user
      ? await upsertPatientByAuthId(user.id, { device_id: deviceId, ...profileData })
      : await upsertPatient(deviceId, profileData);

    if (!deviceId && !user) {
      return Response.json({ error: "deviceId or auth session required" }, { status: 400 });
    }

    if (!patient) {
      // Temporary: surface Supabase error for debugging
      const { data: dbg, error: dbgErr } = await (await import('@/lib/supabase')).getSupabase()
        .from('patients').select('id').limit(1);
      return Response.json({ error: "Failed to upsert patient", debug: dbgErr?.message ?? `table ok, rows: ${dbg?.length}` }, { status: 500 });
    }

    // Fetch full state in parallel
    const [labPanels, dailyLogs, chatHistory] = await Promise.all([
      getLabPanels(patient.id, 5),
      getDailyLogs(patient.id, 90),
      getChatHistory(patient.id, 50),
    ]);

    return Response.json({
      patientId:   patient.id,
      patient,
      labPanels,
      dailyLogs,
      chatHistory,
    });
  } catch (error) {
    console.error("[patient] sync error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET /api/patient?deviceId=xxx — fetch patient by device ID ────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return Response.json({ error: "deviceId required" }, { status: 400 });
    }

    const patient = await getPatientByDeviceId(deviceId);
    if (!patient) {
      return Response.json({ error: "Patient not found" }, { status: 404 });
    }

    const [labPanels, dailyLogs] = await Promise.all([
      getLabPanels(patient.id, 5),
      getDailyLogs(patient.id, 30),
    ]);

    return Response.json({ patientId: patient.id, patient, labPanels, dailyLogs });
  } catch (error) {
    console.error("[patient] fetch error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
