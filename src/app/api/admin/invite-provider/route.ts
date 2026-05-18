import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await serverClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "bp_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, organization_id } = await req.json();
  if (!email || !organization_id) {
    return NextResponse.json({ error: "email and organization_id required" }, { status: 400 });
  }

  const admin = adminClient();

  // Verify the org exists
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organization_id)
    .single();

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Send invite — Supabase creates the auth user and emails the magic link
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://bp-beta-beta.vercel.app"}/practitioner/accept-invite`,
    data: { role: "org_admin", organization_id },
  });

  if (inviteErr || !invited.user) {
    return NextResponse.json({ error: inviteErr?.message ?? "Invite failed" }, { status: 500 });
  }

  // Pre-create profile so the layout can read role immediately on first login
  const { error: profileErr } = await admin.from("profiles").upsert({
    id:                  invited.user.id,
    role:                "org_admin",
    organization_id,
    onboarding_complete: true,
  }, { onConflict: "id" });

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invited_email: email, org_name: org.name });
}
