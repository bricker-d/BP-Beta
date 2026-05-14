// ─── Biomarkers ────────────────────────────────────────────────────────────────

export type BiomarkerStatus = "optimal" | "elevated" | "low" | "borderline";

export interface Biomarker {
  id: string;
  name: string;
  shortName: string;
  value: number;
  unit: string;
  status: BiomarkerStatus;
  optimalMin: number;
  optimalMax: number;
  category: "metabolic" | "lipid" | "hormone" | "vitamin" | "inflammatory";
  // Delta from previous panel
  previousValue?: number;
  delta?: number;
  deltaStatus?: 'improved' | 'worsened' | 'stable';
}

export interface LabPanel {
  id: string;
  date: string; // ISO date string
  source: string; // "Quest", "Rupa", "LabCorp", etc.
  biomarkers: Biomarker[];
}

// ─── Wearable ──────────────────────────────────────────────────────────────────

export interface WearableData {
  dailySteps: number;
  sleepDuration: number; // hours
  restingHeartRate: number; // bpm
  hrv: number; // ms RMSSD
  hrvTrend: number; // % change
  source: "Apple Health" | "Garmin" | "Whoop" | "Oura" | "Manual";
  syncedAt: string; // ISO date
}

// ─── Actions ───────────────────────────────────────────────────────────────────

export type ActionCategory = "Movement" | "Nutrition" | "Exercise" | "Sleep" | "Supplement" | "Lifestyle";

export interface HealthAction {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  why: string;
  completed: boolean;
  targetBiomarkers: string[]; // biomarker IDs this action addresses
  biomarkerTarget?: string;   // human-readable, e.g. "Testosterone: 516 → 600–900 ng/dL"
  evidenceGrade?: string;
  effectSize?: string;
  timeToEffect?: string;
  citations?: string[];
  timeOfDay?: "morning" | "midday" | "evening";
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// ─── User ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  name: string;
  avatarInitials: string;
}

// ─── Protocols ─────────────────────────────────────────────────────────────────

export interface ProtocolAction {
  id: string;
  protocol_id: string;
  title: string;
  description?: string;
  mechanism?: string;
  category: ActionCategory;
  time_of_day?: "morning" | "midday" | "evening";
  biomarker_targets?: string[];
  evidence_grade?: string;
  effect_size?: string;
  time_to_effect?: string;
  citations?: string[];
  is_conditional?: boolean;
  condition_biomarker?: string;
  condition_operator?: "below" | "above";
  condition_threshold?: number;
  sort_order?: number;
}

export interface Protocol {
  id: string;
  name: string;
  description?: string;
  focus_areas?: string[];
  target_conditions?: string[];
  target_age_min?: number;
  target_age_max?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  actions?: ProtocolAction[];
}

export interface PatientProtocol {
  id: string;
  patient_id: string;
  protocol_id: string;
  assigned_at: string;
  is_active: boolean;
  notes?: string;
  personalized_actions?: HealthAction[];
  protocol?: Protocol;
}

// ─── Messages ──────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  patient_id: string;
  sender: "practitioner" | "patient";
  body: string;
  read: boolean;
  created_at: string;
}
