// GET /api/wearables/oura/authorize?userId=xxx
// Redirects user to Oura OAuth consent screen.
// userId is the Supabase auth user ID (profiles.id).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const returnTo = searchParams.get("returnTo") ?? "bioprecision://wearable-connected";

  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  const clientId = process.env.OURA_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "OURA_CLIENT_ID not configured. Register app at https://cloud.ouraring.com/oauth/applications" },
      { status: 503 }
    );
  }

  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://bp-beta-beta.vercel.app";
  const redirectUri = `${BASE}/api/wearables/oura/callback`;

  // State encodes userId + returnTo for callback
  const state = Buffer.from(JSON.stringify({ userId, returnTo })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "daily email heartrate personal session spo2 workout",
    state,
  });

  return Response.redirect(`https://cloud.ouraring.com/oauth/authorize?${params}`);
}
