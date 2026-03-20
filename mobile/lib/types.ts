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

export type ActionCategory = "Movement" | "Nutrition" | "Exercise" | "Sleep" | "Supplement";

export interface HealthAction {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  why: string;
  completed: boolean;
  targetBiomarkers: string[]; // biomarker IDs this action addresses
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


// ─── Onboarding / Intake ─────────────────────────────────────────────────────

export interface IntakeProfile {
  name: string;
    goals: string[];
      age?: number;
        biologicalSex?: 'Male' | 'Female' | 'Other / prefer not to say';
          heightFt?: number;
            heightIn?: number;
              weightLbs?: number;
                symptoms: string[];
                  symptomsOther?: string;
                    labDataSource?: 'upload' | 'demo' | 'skip';
                      wearableSource?: 'Apple Health' | 'Whoop' | 'Oura' | 'Garmin' | 'none';
                        completedAt?: string; // ISO date
                        }