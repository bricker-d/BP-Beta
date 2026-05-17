import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { SESSION_COOKIE, signClinicId } from "@/lib/session";

const MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: Request) {
  const { slug, password } = await req.json();

  if (!slug?.trim() || !password) {
    return Response.json({ error: "Clinic ID and password required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_clinic_login", {
    p_slug: slug.toLowerCase().trim(),
    p_password: password,
  });

  if (error || !data || data.length === 0) {
    return Response.json({ error: "Invalid clinic ID or password" }, { status: 401 });
  }

  const clinic = data[0] as { id: string; name: string; slug: string };
  const sessionValue = signClinicId(clinic.id);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });

  return Response.json({ success: true, clinicName: clinic.name });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ success: true });
}
