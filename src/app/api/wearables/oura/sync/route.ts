import { createClient } from "@supabase/supabase-js";

// POST /api/wearables/oura/sync
// Called by StepWearables after returning from Oura OAuth to verify the token was stored.
// Accepts: Authorization: Bearer <jwt> header
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return Response.json({ connected: false, error: "Unauthorized" }, { status: 401 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return Response.json({ connected: false, error: "Invalid token" }, { status: 401 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await serviceClient
      .from("user_wearable_tokens")
      .select("provider, connected_at")
      .eq("user_id", user.id)
      .eq("provider", "oura")
      .maybeSingle();

    if (!data) return Response.json({ connected: false });
    return Response.json({ connected: true, provider: "oura", connectedAt: data.connected_at });
  } catch (err) {
    console.error("[oura/sync]", err);
    return Response.json({ connected: false, error: "Sync check failed" }, { status: 500 });
  }
}
