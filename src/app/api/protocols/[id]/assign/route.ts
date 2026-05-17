import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

// Service role client — bypasses RLS so a practitioner can assign protocols to patients
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: protocol_id } = await params;
  const { user_id } = await req.json();

  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  // Verify the requester is an authenticated org_admin
  const serverClient = await createServerClient();
  const { data: { user: requester } } = await serverClient.auth.getUser();
  if (!requester) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: requesterProfile } = await serverClient
    .from("profiles")
    .select("role, organization_id")
    .eq("id", requester.id)
    .single();

  if (requesterProfile?.role !== "org_admin" && requesterProfile?.role !== "bp_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getAdminClient();

  // Verify protocol exists and is active
  const { data: protocol, error: protoErr } = await admin
    .from("protocols_v2")
    .select("id, name, duration_days")
    .eq("id", protocol_id)
    .eq("is_active", true)
    .single();

  if (protoErr || !protocol) {
    return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
  }

  // Verify patient exists and belongs to the same org (bp_admin can assign across orgs)
  const { data: patient, error: patErr } = await admin
    .from("profiles")
    .select("id, organization_id, role")
    .eq("id", user_id)
    .single();

  if (patErr || !patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  if (
    requesterProfile.role === "org_admin" &&
    patient.organization_id !== requesterProfile.organization_id
  ) {
    return NextResponse.json({ error: "Patient is not in your organization" }, { status: 403 });
  }

  // Deactivate any existing active protocols for this user
  await admin
    .from("user_protocols")
    .update({ status: "paused" })
    .eq("user_id", user_id)
    .eq("status", "active");

  // Assign the new protocol
  const { error: assignErr } = await admin
    .from("user_protocols")
    .insert({
      user_id,
      protocol_id,
      organization_id: patient.organization_id ?? requesterProfile.organization_id,
      status: "active",
      current_day: 1,
      started_at: new Date().toISOString(),
    });

  if (assignErr) {
    return NextResponse.json({ error: assignErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, protocol_name: protocol.name });
}
