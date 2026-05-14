import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocols")
    .select("*, protocol_actions(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { name, description, focus_areas, target_conditions, target_age_min, target_age_max, actions } = body;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data: protocol, error } = await supabase
    .from("protocols")
    .insert({ name, description, focus_areas, target_conditions, target_age_min, target_age_max })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (actions?.length) {
    const rows = actions.map((a: Record<string, unknown>, i: number) => ({ ...a, protocol_id: protocol.id, sort_order: i }));
    await supabase.from("protocol_actions").insert(rows);
  }

  return NextResponse.json(protocol, { status: 201 });
}
