import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { patient_id, notes } = await req.json();

  if (!patient_id) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

  // Fetch protocol with actions
  const { data: protocol, error: pErr } = await supabase
    .from("protocols")
    .select("*, protocol_actions(*)")
    .eq("id", id)
    .single();

  if (pErr || !protocol) return NextResponse.json({ error: "Protocol not found" }, { status: 404 });

  // Fetch patient data
  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patient_id)
    .single();

  // Fetch latest lab panel
  const { data: panels } = await supabase
    .from("lab_panels")
    .select("*")
    .eq("patient_id", patient_id)
    .order("panel_date", { ascending: false })
    .limit(1);

  const labPanel = panels?.[0] ?? null;
  const actions = (protocol.protocol_actions ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );

  // AI personalization
  let personalizedActions = actions.map((a: Record<string, unknown>, i: number) => ({
    id: `pa-${i}`,
    title: a.title,
    description: a.description ?? "",
    category: a.category,
    why: a.mechanism ?? "",
    completed: false,
    targetBiomarkers: a.biomarker_targets ?? [],
    evidenceGrade: a.evidence_grade,
    effectSize: a.effect_size,
    timeToEffect: a.time_to_effect,
    timeOfDay: a.time_of_day,
    citations: a.citations,
  }));

  if (patient && actions.length > 0) {
    try {
      const patientContext = [
        patient.name && `Patient: ${patient.name}`,
        patient.age && `Age: ${patient.age}`,
        patient.biological_sex && `Sex: ${patient.biological_sex}`,
        patient.weight_lbs && `Weight: ${patient.weight_lbs} lbs`,
        (patient.habits as Record<string, unknown>)?.dietStyle && `Diet: ${(patient.habits as Record<string, unknown>).dietStyle}`,
        patient.goals?.length && `Goals: ${(patient.goals as string[]).join(", ")}`,
        labPanel && `Latest labs (${labPanel.panel_date}): ${JSON.stringify(labPanel.biomarkers).slice(0, 1500)}`,
        notes && `Practitioner notes: ${notes}`,
      ].filter(Boolean).join("\n");

      const resp = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: `You are personalizing a clinical protocol for a specific patient.

Patient context:
${patientContext}

Protocol: "${protocol.name}"
${protocol.description ? `Description: ${protocol.description}` : ""}

Template actions (JSON):
${JSON.stringify(actions, null, 2)}

Personalize these actions for this patient. For each action:
- Adjust the description to reference the patient's specific lab values where relevant
- Add specific dosages, timing, or targets based on their actual numbers
- Flag any actions that may need modification given their conditions or medications
- Remove conditional actions that don't apply (based on condition_biomarker/threshold)
- Keep all action fields, just enrich the description and why fields

Return ONLY a JSON array of HealthAction objects with fields: id, title, description, category, why, completed (false), targetBiomarkers, evidenceGrade, effectSize, timeToEffect, timeOfDay, biomarkerTarget (human-readable target like "Vitamin D: 28 → 50-80 ng/mL").`,
        }],
      });

      const text = resp.content[0].type === "text" ? resp.content[0].text : "";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        personalizedActions = JSON.parse(match[0]);
      }
    } catch (e) {
      console.error("AI personalization failed, using template actions:", e);
    }
  }

  // Upsert assignment
  const { error: assignErr } = await supabase
    .from("patient_protocols")
    .upsert({
      patient_id,
      protocol_id: id,
      is_active: true,
      notes: notes ?? null,
      personalized_actions: personalizedActions,
      assigned_at: new Date().toISOString(),
    }, { onConflict: "patient_id" });

  if (assignErr) return NextResponse.json({ error: assignErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, actions: personalizedActions });
}
