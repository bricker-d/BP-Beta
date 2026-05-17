import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const patient_id = req.nextUrl.searchParams.get("patient_id");
  if (!patient_id) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("patient_id", patient_id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark patient messages as read (practitioner is fetching)
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("patient_id", patient_id)
    .eq("sender", "patient")
    .eq("read", false);

  return NextResponse.json(data);
}

// PATCH — mark practitioner messages as read (called when patient views messages)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { patient_id } = await req.json();
  if (!patient_id) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

  await supabase
    .from("messages")
    .update({ read: true })
    .eq("patient_id", patient_id)
    .eq("sender", "practitioner")
    .eq("read", false);

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { patient_id, sender, body } = await req.json();

  if (!patient_id || !sender || !body) {
    return NextResponse.json({ error: "patient_id, sender, body required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ patient_id, sender, body })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
