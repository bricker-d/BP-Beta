import { Biomarker, HealthAction, WearableData, LabPanel } from "./types";

// ─── Reference ranges ─────────────────────────────────────────────────────────

export const BIOMARKER_REFERENCES: Record<
  string,
  { optimalMin: number; optimalMax: number; unit: string; category: Biomarker["category"] }
> = {
  glucose: { optimalMin: 70, optimalMax: 99, unit: "mg/dL", category: "metabolic" },
  hba1c: { optimalMin: 4.0, optimalMax: 5.6, unit: "%", category: "metabolic" },
  ldl: { optimalMin: 0, optimalMax: 100, unit: "mg/dL", category: "lipid" },
  hdl: { optimalMin: 60, optimalMax: 120, unit: "mg/dL", category: "lipid" },
  triglycerides: { optimalMin: 0, optimalMax: 150, unit: "mg/dL", category: "lipid" },
  vitaminD: { optimalMin: 40, optimalMax: 80, unit: "ng/mL", category: "vitamin" },
  crp: { optimalMin: 0, optimalMax: 1.0, unit: "mg/L", category: "inflammatory" },
  testosterone: { optimalMin: 400, optimalMax: 900, unit: "ng/dL", category: "hormone" },
};

export function getBiomarkerStatus(
  value: number,
  min: number,
  max: number
): Biomarker["status"] {
  if (value >= min && value <= max) return "optimal";
  const buffer = (max - min) * 0.15;
  if (value > max) return value > max + buffer ? "elevated" : "borderline";
  return value < min - buffer ? "low" : "borderline";
}

// ─── Mock data (replace with real API calls) ──────────────────────────────────

export const MOCK_PANEL: LabPanel = {
  id: "panel-1",
  date: "2025-01-19",
  source: "Quest Diagnostics",
  biomarkers: [
    {
      id: "glucose",
      name: "Fasting Glucose",
      shortName: "GLUCOSE",
      value: 102,
      unit: "mg/dL",
      status: "borderline",
      optimalMin: 70,
      optimalMax: 99,
      category: "metabolic",
    },
    {
      id: "hba1c",
      name: "Hemoglobin A1c",
      shortName: "HBA1C",
      value: 5.7,
      unit: "%",
      status: "borderline",
      optimalMin: 4.0,
      optimalMax: 5.6,
      category: "metabolic",
    },
    {
      id: "ldl",
      name: "LDL Cholesterol",
      shortName: "LDL-C",
      value: 125,
      unit: "mg/dL",
      status: "elevated",
      optimalMin: 0,
      optimalMax: 100,
      category: "lipid",
    },
    {
      id: "hdl",
      name: "HDL Cholesterol",
      shortName: "HDL-C",
      value: 52,
      unit: "mg/dL",
      status: "borderline",
      optimalMin: 60,
      optimalMax: 120,
      category: "lipid",
    },
    {
      id: "triglycerides",
      name: "Triglycerides",
      shortName: "TRIG",
      value: 148,
      unit: "mg/dL",
      status: "borderline",
      optimalMin: 0,
      optimalMax: 150,
      category: "lipid",
    },
    {
      id: "vitaminD",
      name: "Vitamin D",
      shortName: "VIT D",
      value: 28,
      unit: "ng/mL",
      status: "low",
      optimalMin: 40,
      optimalMax: 80,
      category: "vitamin",
    },
  ],
};

export const MOCK_WEARABLE: WearableData = {
  dailySteps: 8432,
  sleepDuration: 7.2,
  restingHeartRate: 68,
  hrv: 45,
  hrvTrend: 3,
  source: "Apple Health",
  syncedAt: new Date().toISOString(),
};

export const MOCK_ACTIONS: HealthAction[] = [
  {
    id: "action-1",
    title: "Walk 10 min after each meal",
    description: "Short walks help your body process food better",
    category: "Movement",
    why: "Post-meal walks reduce postprandial glucose spikes by up to 30% by activating glucose transporter GLUT-4 in muscle tissue. Even 10 minutes is clinically significant for insulin sensitivity.",
    completed: false,
    targetBiomarkers: ["glucose", "hba1c"],
  },
  {
    id: "action-2",
    title: "Eat protein before carbs at meals",
    description: "Simple meal sequencing trick",
    category: "Nutrition",
    why: "Eating protein and fiber before carbohydrates slows gastric emptying and blunts glucose absorption, reducing your post-meal glucose spike by 30-40% according to multiple RCTs.",
    completed: false,
    targetBiomarkers: ["glucose", "hba1c"],
  },
  {
    id: "action-3",
    title: "150 min moderate exercise this week",
    description: "Structured activity improves insulin sensitivity by 23-48%",
    category: "Exercise",
    why: "Zone 2 cardio (conversational pace) is the gold standard for metabolic health. 150 min/week increases mitochondrial density and improves insulin sensitivity across multiple pathways.",
    completed: false,
    targetBiomarkers: ["glucose", "hba1c", "ldl", "hdl"],
  },
];

// ─── Category color map ────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  Movement: { bg: "bg-blue-500", text: "text-white" },
  Nutrition: { bg: "bg-green-500", text: "text-white" },
  Exercise: { bg: "bg-cyan-500", text: "text-white" },
  Sleep: { bg: "bg-purple-500", text: "text-white" },
  Supplement: { bg: "bg-amber-500", text: "text-white" },
};

export const STATUS_COLORS: Record<
  string,
  { dot: string; label: string }
> = {
  optimal: { dot: "bg-green-500", label: "Optimal" },
  elevated: { dot: "bg-red-500", label: "Elevated" },
  low: { dot: "bg-red-500", label: "Low" },
  borderline: { dot: "bg-amber-400", label: "Borderline" },
};
