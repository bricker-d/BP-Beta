import { getSupabase } from "@/lib/supabase";

// GET /api/wearables/oura/callback?code=xxx&state=xxx
// Exchanges auth code for tokens, stores in Supabase, redirects back to app
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    return Response.redirect(`bioprecision://wearable-error?reason=${error}`);
  }

  if (!code || !stateParam) {
    return Response.json({ error: "Missing code or state" }, { status: 400 });
  }

  // Decode state
  let patientId: string;
  let returnTo: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    patientId = decoded.patientId;
    returnTo = decoded.returnTo ?? "bioprecision://wearable-connected";
  } catch {
    return Response.json({ error: "Invalid state" }, { status: 400 });
  }

  const clientId = process.env.OURA_CLIENT_ID!;
  const clientSecret = process.env.OURA_CLIENT_SECRET!;
  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app";
  const redirectUri = `${BASE}/api/wearables/oura/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[oura callback] token exchange failed:", err);
    return Response.redirect(`bioprecision://wearable-error?reason=token_exchange_failed`);
  }

  const tokens = await tokenRes.json();

  // Store tokens in Supabase (upsert on patient_id + provider)
  const { error: dbError } = await getSupabase()
    .from("wearable_connections")
    .upsert({
      patient_id: patientId,
      provider: "oura",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(),
    }, { onConflict: "patient_id,provider" });

  if (dbError) {
    console.error("[oura callback] db error:", dbError.message);
  }

  // Show success page (mobile deep link won't work from server redirect in all cases)
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app";
  return Response.redirect(`${BASE_URL}/connect/success?provider=oura&patientId=${patientId}`);
}
