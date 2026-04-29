import { cookies } from "next/headers";

const SESSION_COOKIE = "bp_clinician_session";
const SESSION_VALUE  = "authenticated";
const MAX_AGE        = 60 * 60 * 8; // 8 hours

export async function POST(req: Request) {
  const { password } = await req.json();

  const correctPassword = process.env.CLINICIAN_PASSWORD;

  if (!correctPassword) {
    // If env var not set, use a default (remind Dan to set it)
    console.warn("[clinician/auth] CLINICIAN_PASSWORD env var not set — using default");
  }

  const expected = correctPassword ?? "FrameLongevity2024!";

  if (password !== expected) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/clinician",
  });

  return Response.json({ success: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ success: true });
}
