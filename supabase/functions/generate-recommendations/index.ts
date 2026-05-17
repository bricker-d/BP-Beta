import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MAX_DAILY_ACTIONS = 5;

interface Biomarker {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: string;
}

interface DailyAction {
  source: "protocol" | "ai";
  step_id: string | null;
  title: string;
  description: string;
  evidence_summary: string | null;
  completed: false;
}

async function generateAIActions(
  outOfRange: Biomarker[],
  slots: number
): Promise<DailyAction[]> {
  const biomarkerList = outOfRange
    .slice(0, 8)
    .map((b) => `${b.name}: ${b.value} ${b.unit} (${b.status})`)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Generate exactly ${slots} specific, actionable health interventions for these out-of-range biomarkers. Return only a JSON array, no other text.

Out-of-range biomarkers:
${biomarkerList}

Return JSON array:
[{"title": "brief action max 7 words sentence case", "description": "one sentence what to do and when no doses", "evidence_summary": "one sentence mechanism plain English"}]`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "[]";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const items = JSON.parse(match[0]);
    return items.slice(0, slots).map(
      (item: { title: string; description: string; evidence_summary: string }) => ({
        source: "ai" as const,
        step_id: null,
        title: item.title,
        description: item.description,
        evidence_summary: item.evidence_summary ?? null,
        completed: false as const,
      })
    );
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Verify this is called with service role (from trigger) or bearer token
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { user_id, reading_id } = await req.json();
  if (!user_id) {
    return new Response(JSON.stringify({ error: "user_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Service role client — bypasses RLS so we can write user_daily_actions
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Get user's active protocol steps (these fill first slots)
  const { data: up } = await supabase
    .from("user_protocols")
    .select("protocol_id, current_day")
    .eq("user_id", user_id)
    .eq("status", "active")
    .maybeSingle();

  let protocolSteps: Array<{
    id: string;
    title: string;
    description: string | null;
    evidence_summary: string | null;
  }> = [];

  if (up) {
    const { data: steps } = await supabase
      .from("protocol_steps")
      .select("id, title, description, evidence_summary")
      .eq("protocol_id", up.protocol_id)
      .eq("day_number", 1)
      .order("sort_order")
      .limit(MAX_DAILY_ACTIONS);

    protocolSteps = steps ?? [];
  }

  // 2. Build actions — protocol steps take priority
  const actions: DailyAction[] = protocolSteps.map((s) => ({
    source: "protocol" as const,
    step_id: s.id,
    title: s.title,
    description: s.description ?? "",
    evidence_summary: s.evidence_summary ?? null,
    completed: false as const,
  }));

  // 3. Fill remaining slots with AI recommendations from lab data
  const remainingSlots = MAX_DAILY_ACTIONS - actions.length;

  if (remainingSlots > 0 && reading_id) {
    const { data: reading } = await supabase
      .from("lab_readings")
      .select("biomarkers")
      .eq("id", reading_id)
      .single();

    const biomarkers: Biomarker[] = reading?.biomarkers ?? [];
    const outOfRange = biomarkers.filter((b) => b.status !== "optimal");

    if (outOfRange.length > 0) {
      const aiActions = await generateAIActions(outOfRange, remainingSlots).catch(
        () => []
      );
      actions.push(...aiActions);
    }
  }

  // 4. Upsert — one record per user per day, replace on re-run
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("user_daily_actions").upsert(
    { user_id, generated_date: today, actions },
    { onConflict: "user_id,generated_date" }
  );

  if (error) {
    console.error("[generate-recommendations] upsert error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, actions_generated: actions.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
