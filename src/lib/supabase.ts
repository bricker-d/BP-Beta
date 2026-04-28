import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DbPatient {
  id: string;
  device_id: string | null;
  name: string | null;
  primary_focus: string | null;
  goals: string[] | null;
  age: number | null;
  biological_sex: string | null;
  height_ft: number | null;
  height_in: number | null;
  weight_lbs: number | null;
  symptoms: string[] | null;
  habits: Record<string, string> | null;
  wearable_source: string | null;
  lab_data_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbLabPanel {
  id: string;
  patient_id: string;
  source: string | null;
  panel_date: string;
  biomarkers: unknown[];
  created_at: string;
}

export interface DbDailyLog {
  id: string;
  patient_id: string;
  log_date: string;
  action_completions: Record<string, boolean>;
  sleep_quality: number | null;
  energy_level: number | null;
  stress_level: number | null;
  created_at: string;
}

export interface DbChatMessage {
  id: string;
  patient_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ── Client singleton ──────────────────────────────────────────────────────────
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in Vercel'
    );
  }

  _client = createClient(url, key);
  return _client;
}

// ── Patient operations ────────────────────────────────────────────────────────

export async function upsertPatient(
  deviceId: string,
  profile: Partial<Omit<DbPatient, 'id' | 'device_id' | 'created_at' | 'updated_at'>>
): Promise<DbPatient | null> {
  const { data, error } = await getSupabase()
    .from('patients')
    .upsert({ device_id: deviceId, ...profile }, { onConflict: 'device_id' })
    .select()
    .single();

  if (error) { console.error('[supabase] upsertPatient:', error.message); return null; }
  return data;
}

export async function getPatientByDeviceId(deviceId: string): Promise<DbPatient | null> {
  const { data, error } = await getSupabase()
    .from('patients')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  if (error) { return null; }
  return data;
}

// ── Lab panel operations ──────────────────────────────────────────────────────

export async function saveLabPanel(
  patientId: string,
  source: string,
  biomarkers: unknown[],
  panelDate?: string
): Promise<DbLabPanel | null> {
  const { data, error } = await getSupabase()
    .from('lab_panels')
    .insert({
      patient_id: patientId,
      source,
      biomarkers,
      panel_date: panelDate ?? new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) { console.error('[supabase] saveLabPanel:', error.message); return null; }
  return data;
}

export async function getLabPanels(patientId: string, limit = 10): Promise<DbLabPanel[]> {
  const { data, error } = await getSupabase()
    .from('lab_panels')
    .select('*')
    .eq('patient_id', patientId)
    .order('panel_date', { ascending: false })
    .limit(limit);

  if (error) { console.error('[supabase] getLabPanels:', error.message); return []; }
  return data ?? [];
}

// ── Daily log operations ──────────────────────────────────────────────────────

export async function saveDailyLog(
  patientId: string,
  log: Omit<DbDailyLog, 'id' | 'patient_id' | 'created_at'>
): Promise<DbDailyLog | null> {
  const { data, error } = await getSupabase()
    .from('daily_logs')
    .upsert({ patient_id: patientId, ...log }, { onConflict: 'patient_id,log_date' })
    .select()
    .single();

  if (error) { console.error('[supabase] saveDailyLog:', error.message); return null; }
  return data;
}

export async function getDailyLogs(patientId: string, days = 90): Promise<DbDailyLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await getSupabase()
    .from('daily_logs')
    .select('*')
    .eq('patient_id', patientId)
    .gte('log_date', since.toISOString().split('T')[0])
    .order('log_date', { ascending: false });

  if (error) { console.error('[supabase] getDailyLogs:', error.message); return []; }
  return data ?? [];
}

// ── Chat message operations ───────────────────────────────────────────────────

export async function saveChatMessage(
  patientId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const { error } = await getSupabase()
    .from('chat_messages')
    .insert({ patient_id: patientId, role, content });

  if (error) console.error('[supabase] saveChatMessage:', error.message);
}

export async function getChatHistory(patientId: string, limit = 50): Promise<DbChatMessage[]> {
  const { data, error } = await getSupabase()
    .from('chat_messages')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) { console.error('[supabase] getChatHistory:', error.message); return []; }
  return data ?? [];
}

// ── Clinician view ────────────────────────────────────────────────────────────

export async function getPatientOverview() {
  const { data, error } = await getSupabase()
    .from('patient_overview')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('[supabase] getPatientOverview:', error.message); return []; }
  return data ?? [];
}
