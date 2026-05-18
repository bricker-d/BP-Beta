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
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (me?.role !== "org_admin" && me?.role !== "bp_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, protocol_id } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const organization_id = me.organization_id;
  if (!organization_id) {
    return NextResponse.json({ error: "Practitioner has no organization" }, { status: 400 });
  }

  const admin = adminClient();

  // Resolve protocol — use provided or fall back to org's first active protocol
  let resolvedProtocolId = protocol_id;
  if (!resolvedProtocolId) {
    const { data: proto } = await admin
      .from("protocols_v2")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    resolvedProtocolId = proto?.id ?? null;
  }

  // Send invite
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://bp-beta-beta.vercel.app"}/accept-invite`,
    data: { role: "user", organization_id },
  });

  if (inviteErr || !invited.user) {
    return NextResponse.json({ error: inviteErr?.message ?? "Invite failed" }, { status: 500 });
  }

  const patientId = invited.user.id;

  // Pre-create profile linked to this org
  await admin.from("profiles").upsert({
    id:                  patientId,
    role:                "user",
    organization_id,
    onboarding_complete: false,
  }, { onConflict: "id" });

  // Pre-assign protocol if one is available
  if (resolvedProtocolId) {
    // Deactivate any existing active protocol (shouldn't exist for new user, but guard anyway)
    await admin
      .from("user_protocols")
      .update({ status: "paused" })
      .eq("user_id", patientId)
      .eq("status", "active");

    await admin.from("user_protocols").insert({
      user_id:         patientId,
      protocol_id:     resolvedProtocolId,
      organization_id,
      status:          "active",
      current_day:     1,
      started_at:      new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    invited_email: email,
    protocol_assigned: !!resolvedProtocolId,
  });
}
