import { createClient } from "@supabase/supabase-js";

// POST /api/wearables/oura/sync — called by StepWearables after OAuth return
// Verifies the Oura token is valid by checking user_wearable_tokens.
// patientId in the request body is actually the Supabase auth user ID (store.patientId).
export async function POST(req: Request) {
  try {
    const { patientId } = await req.json();
    if (!patientId) {
      return Response.json({ error: "patientId required" }, { status: 400 });
    }

    // Use service role to bypass RLS — this endpoint is called from mobile with no user session
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await serviceClient
      .from("user_wearable_tokens")
      .select("user_id, provider, connected_at")
      .eq("user_id", patientId)
      .eq("provider", "oura")
      .maybeSingle();

    if (error) {
      console.error("[oura/sync] db error:", error.message);
      return Response.json({ connected: false }, { status: 500 });
    }

    if (!data) {
      return Response.json({ connected: false });
    }

    return Response.json({ connected: true, provider: "oura" });
  } catch (error) {
    console.error("[oura/sync] error:", error);
    return Response.json({ error: "Sync check failed" }, { status: 500 });
  }
}
