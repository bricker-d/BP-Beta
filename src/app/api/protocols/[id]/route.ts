import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocols")
    .select("*, protocol_actions(*)")
    .eq("id", params.id)
    .order("sort_order", { referencedTable: "protocol_actions", ascending: true })
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const body = await req.json();
  const { actions, ...protocolFields } = body;

  const { error } = await supabase
    .from("protocols")
    .update({ ...protocolFields, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (actions !== undefined) {
    await supabase.from("protocol_actions").delete().eq("protocol_id", params.id);
    if (actions.length) {
      const rows = actions.map((a: Record<string, unknown>, i: number) => ({
        ...a,
        id: undefined, // let DB generate new id
        protocol_id: params.id,
        sort_order: i,
      }));
      await supabase.from("protocol_actions").insert(rows);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { error } = await supabase.from("protocols").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
