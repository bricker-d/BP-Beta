import { upsertPatient, getPatientByDeviceId, getLabPanels, getDailyLogs, getChatHistory } from "@/lib/supabase";

// ── POST /api/patient — upsert patient, return full state ─────────────────────
// Called by mobile on every app open. Creates patient if new, returns synced state.
export async function POST(req: Request) {
  try {
    const { deviceId, profile } = await req.json();

    if (!deviceId) {
      return Response.json({ error: "deviceId required" }, { status: 400 });
    }

    // Upsert patient with latest profile data
    const patient = await upsertPatient(deviceId, {
      name:           profile?.name,
      primary_focus:  profile?.primaryFocus,
      goals:          profile?.goals,
      age:            profile?.age,
      biological_sex: profile?.biologicalSex,
      height_ft:      profile?.heightFt,
      height_in:      profile?.heightIn,
      weight_lbs:     profile?.weightLbs,
      symptoms:       profile?.symptoms,
      habits:         profile?.habits,
      wearable_source: profile?.wearableSource,
      lab_data_source: profile?.labDataSource,
    });

    if (!patient) {
      return Response.json({ error: "Failed to upsert patient" }, { status: 500 });
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
