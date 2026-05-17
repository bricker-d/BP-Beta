import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyClinicSession } from "@/lib/session";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionValue) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const clinicId = verifyClinicSession(sessionValue);
  if (!clinicId) return Response.json({ error: "Invalid session" }, { status: 401 });

  const supabase = await createClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, slug")
    .eq("id", clinicId)
    .single();

  if (!clinic) return Response.json({ error: "Clinic not found" }, { status: 404 });
  return Response.json(clinic);
}
