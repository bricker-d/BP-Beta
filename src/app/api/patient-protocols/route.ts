import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// PATCH /api/patient-protocols?patient_id=xxx
// Updates personalized_actions for an assigned patient protocol
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const patient_id = req.nextUrl.searchParams.get("patient_id");
  if (!patient_id) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

  const { actions } = await req.json();
  if (!Array.isArray(actions)) return NextResponse.json({ error: "actions array required" }, { status: 400 });

  const { error } = await supabase
    .from("patient_protocols")
    .update({ personalized_actions: actions })
    .eq("patient_id", patient_id)
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET /api/patient-protocols?patient_id=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const patient_id = req.nextUrl.searchParams.get("patient_id");
  if (!patient_id) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("patient_protocols")
    .select("*, protocol:protocols(name, description, protocol_actions(id, title, description, mechanism, category, time_of_day, biomarker_targets, evidence_grade, effect_size, time_to_effect, sort_order))")
    .eq("patient_id", patient_id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
