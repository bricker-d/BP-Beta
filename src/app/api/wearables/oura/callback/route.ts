import { createClient } from "@supabase/supabase-js";

// GET /api/wearables/oura/callback?code=xxx&state=xxx
// Exchanges auth code for tokens, stores in user_wearable_tokens, redirects back to app.
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

  // Decode state — now carries userId (Supabase auth user ID) instead of patientId
  let userId: string;
  let returnTo: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    userId = decoded.userId;
    returnTo = decoded.returnTo ?? "bioprecision://wearable-connected";
  } catch {
    return Response.json({ error: "Invalid state" }, { status: 400 });
  }

  const clientId = process.env.OURA_CLIENT_ID!;
  const clientSecret = process.env.OURA_CLIENT_SECRET!;
  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://bp-beta-beta.vercel.app";
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

  // Use service role client to bypass RLS — callback runs server-side without user session
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: dbError } = await serviceClient
    .from("user_wearable_tokens")
    .upsert(
      {
        user_id: userId,
        provider: "oura",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scopes: "daily email heartrate personal session spo2 workout",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

  if (dbError) {
    console.error("[oura callback] db error:", dbError.message);
  }

  // Redirect to success page — mobile deep link handled client-side
  return Response.redirect(`${BASE}/connect/success?provider=oura&userId=${userId}`);
}
