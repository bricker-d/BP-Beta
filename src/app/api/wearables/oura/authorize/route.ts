// GET /api/wearables/oura/authorize?patientId=xxx
// Redirects patient to Oura OAuth consent screen
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const returnTo = searchParams.get("returnTo") ?? "bioprecision://wearable-connected";

  if (!patientId) {
    return Response.json({ error: "patientId required" }, { status: 400 });
  }

  const clientId = process.env.OURA_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "OURA_CLIENT_ID not configured. Register app at https://cloud.ouraring.com/oauth/applications" },
      { status: 503 }
    );
  }

  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app";
  const redirectUri = `${BASE}/api/wearables/oura/callback`;

  // State encodes patientId + returnTo for callback
  const state = Buffer.from(JSON.stringify({ patientId, returnTo })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "daily email heartrate personal session spo2 workout",
    state,
  });

  return Response.redirect(`https://cloud.ouraring.com/oauth/authorize?${params}`);
}
