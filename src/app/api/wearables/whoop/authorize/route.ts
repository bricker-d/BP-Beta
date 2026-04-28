// GET /api/wearables/whoop/authorize?patientId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return Response.json({ error: "patientId required" }, { status: 400 });
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: "WHOOP_CLIENT_ID not configured. Register app at https://developer.whoop.com" },
      { status: 503 }
    );
  }

  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app";
  const redirectUri = `${BASE}/api/wearables/whoop/callback`;
  const state = Buffer.from(JSON.stringify({ patientId })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement",
    state,
  });

  return Response.redirect(`https://api.prod.whoop.com/oauth/oauth2/auth?${params}`);
}
