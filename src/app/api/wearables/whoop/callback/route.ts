import { getSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) return Response.redirect(`bioprecision://wearable-error?reason=${error}`);
  if (!code || !stateParam) return Response.json({ error: "Missing code or state" }, { status: 400 });

  let patientId: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    patientId = decoded.patientId;
  } catch {
    return Response.json({ error: "Invalid state" }, { status: 400 });
  }

  const clientId = process.env.WHOOP_CLIENT_ID!;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET!;
  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app";
  const redirectUri = `${BASE}/api/wearables/whoop/callback`;

  const tokenRes = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
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
    console.error("[whoop callback] token exchange failed:", await tokenRes.text());
    return Response.redirect(`bioprecision://wearable-error?reason=token_exchange_failed`);
  }

  const tokens = await tokenRes.json();

  await getSupabase()
    .from("wearable_connections")
    .upsert({
      patient_id: patientId,
      provider: "whoop",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(),
    }, { onConflict: "patient_id,provider" });

  return Response.redirect(`${BASE}/connect/success?provider=whoop&patientId=${patientId}`);
}
