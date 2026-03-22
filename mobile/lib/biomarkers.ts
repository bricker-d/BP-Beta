import type { Biomarker, HealthAction, LabPanel, WearableData } from './types';
import type { IntakeProfile } from './types';

// ─── Reference ranges (baseline, sex/age adjusted below) ────────────────────

export interface BiomarkerRef {
  optimalMin: number;
  optimalMax: number;
  unit: string;
  category: Biomarker['category'];
  name: string;
  shortName: string;
  description: string;
  /** biomarker IDs that are meaningfully correlated */
  relatedIds?: string[];
}

export const BIOMARKER_REFS: Record<string, BiomarkerRef> = {
  glucose: {
    optimalMin: 70, optimalMax: 99, unit: 'mg/dL', category: 'metabolic',
    name: 'Fasting Glucose', shortName: 'GLUCOSE',
    description: 'Primary marker of insulin sensitivity and metabolic health.',
    relatedIds: ['hba1c', 'triglycerides'],
  },
  hba1c: {
    optimalMin: 4.0, optimalMax: 5.6, unit: '%', category: 'metabolic',
    name: 'Hemoglobin A1c', shortName: 'HBA1C',
    description: '3-month average blood sugar — the gold standard for metabolic health.',
    relatedIds: ['glucose', 'triglycerides'],
  },
  ldl: {
    optimalMin: 0, optimalMax: 100, unit: 'mg/dL', category: 'lipid',
    name: 'LDL Cholesterol', shortName: 'LDL',
    description: 'Primary driver of atherosclerosis when oxidised.',
    relatedIds: ['hdl', 'triglycerides'],
  },
  hdl: {
    optimalMin: 60, optimalMax: 120, unit: 'mg/dL', category: 'lipid',
    name: 'HDL Cholesterol', shortName: 'HDL',
    description: 'Protective cholesterol — higher is generally better.',
    relatedIds: ['ldl', 'triglycerides'],
  },
  triglycerides: {
    optimalMin: 0, optimalMax: 100, unit: 'mg/dL', category: 'lipid',
    name: 'Triglycerides', shortName: 'TRIG',
    description: 'Strongly linked to insulin resistance and metabolic syndrome.',
    relatedIds: ['glucose', 'hba1c', 'hdl'],
  },
  vitaminD: {
    optimalMin: 50, optimalMax: 80, unit: 'ng/mL', category: 'vitamin',
    name: 'Vitamin D', shortName: 'VIT D',
    description: 'Regulates immunity, mood, bone density, and testosterone.',
    relatedIds: ['testosterone'],
  },
  crp: {
    optimalMin: 0, optimalMax: 0.8, unit: 'mg/L', category: 'inflammatory',
    name: 'hsCRP', shortName: 'CRP',
    description: 'High-sensitivity inflammatory marker — cardiovascular and metabolic risk.',
    relatedIds: ['glucose', 'ldl'],
  },
  testosterone: {
    optimalMin: 500, optimalMax: 900, unit: 'ng/dL', category: 'hormone',
    name: 'Total Testosterone', shortName: 'TESTO',
    description: 'Key hormone for energy, muscle mass, libido, and mood.',
    relatedIds: ['vitaminD'],
  },
  tsh: {
    optimalMin: 0.5, optimalMax: 2.5, unit: 'mIU/L', category: 'hormone',
    name: 'TSH', shortName: 'TSH',
    description: 'Thyroid stimulating hormone — controls metabolism and energy.',
    relatedIds: [],
  },
  ferritin: {
    optimalMin: 50, optimalMax: 200, unit: 'ng/mL', category: 'vitamin',
    name: 'Ferritin', shortName: 'FERR',
    description: 'Iron storage — essential for energy, cognition, and immune function.',
    relatedIds: [],
  },
  homocysteine: {
    optimalMin: 0, optimalMax: 9, unit: 'µmol/L', category: 'inflammatory',
    name: 'Homocysteine', shortName: 'HCY',
    description: 'Cardiovascular and cognitive risk marker. High = B12/folate insufficiency.',
    relatedIds: ['crp'],
  },
  apoB: {
    optimalMin: 0, optimalMax: 80, unit: 'mg/dL', category: 'lipid',
    name: 'ApoB', shortName: 'APOB',
    description: 'Best predictor of atherosclerotic risk — counts all atherogenic particles.',
    relatedIds: ['ldl', 'triglycerides'],
  },
};

// ─── Sex & age adjustments ───────────────────────────────────────────────────

function adjustRanges(
  baseRef: BiomarkerRef,
  id: string,
  profile: Partial<IntakeProfile> | null,
): { optimalMin: number; optimalMax: number } {
  const sex = profile?.biologicalSex;
  const age = profile?.age ?? 35;
  let { optimalMin, optimalMax } = baseRef;

  if (id === 'testosterone') {
    if (sex === 'Female') {
      optimalMin = 15; optimalMax = 70; // ng/dL female range
    } else {
      // Age-adjusted male: drop ~1% per year after 30
      const drop = Math.max(0, (age - 30) * 8);
      optimalMin = Math.max(300, 500 - drop);
      optimalMax = Math.max(550, 900 - drop);
    }
  }

  if (id === 'hdl') {
    // Women have naturally higher HDL
    if (sex === 'Female') { optimalMin = 65; optimalMax = 130; }
  }

  if (id === 'glucose' && age >= 50) {
    // Slightly wider acceptable range for older adults
    optimalMax = 102;
  }

  if (id === 'hba1c' && age >= 65) {
    // Guidelines allow up to 6.0% for elderly to avoid hypoglycaemia risk
    optimalMax = 6.0;
  }

  if (id === 'ferritin') {
    if (sex === 'Female') { optimalMin = 30; optimalMax = 150; }
  }

  if (id === 'vitaminD') {
    // Higher target for anyone with fatigue/mood symptoms
    const hasFatigue = profile?.symptoms?.some(s =>
      ['fatigue', 'mood', 'poor_sleep', 'brainfog'].includes(s)
    );
    if (hasFatigue) { optimalMin = 60; optimalMax = 90; }
  }

  return { optimalMin, optimalMax };
}

// ─── Compute biomarker status ────────────────────────────────────────────────

export function getBiomarkerStatus(
  value: number,
  min: number,
  max: number,
): Biomarker['status'] {
  if (value >= min && value <= max) return 'optimal';
  const buffer = (max - min) * 0.15;
  if (value > max) return value > max + buffer ? 'elevated' : 'borderline';
  return value < min - buffer ? 'low' : 'borderline';
}

// ─── Priority score (0-100) — how urgently attention is needed ───────────────
// Used to sort biomarkers: non-optimal ones related to user goals/symptoms first.

export function biomarkerPriorityScore(
  b: Biomarker,
  profile: Partial<IntakeProfile> | null,
): number {
  let score = 0;
  const statusWeight = { optimal: 0, borderline: 40, elevated: 70, low: 65 };
  score += statusWeight[b.status] ?? 0;

  if (!profile) return score;

  // Goal relevance
  const goalMap: Record<string, string[]> = {
    longevity:  ['crp', 'homocysteine', 'apoB', 'glucose', 'hba1c'],
    energy:     ['ferritin', 'tsh', 'vitaminD', 'testosterone'],
    weight:     ['glucose', 'hba1c', 'triglycerides', 'tsh'],
    muscle:     ['testosterone', 'vitaminD'],
    sleep:      ['tsh', 'ferritin', 'vitaminD'],
    cognition:  ['homocysteine', 'vitaminD', 'ferritin', 'tsh'],
    hormones:   ['testosterone', 'tsh', 'vitaminD'],
    heart:      ['ldl', 'hdl', 'apoB', 'crp', 'homocysteine', 'triglycerides'],
  };
  const symptomMap: Record<string, string[]> = {
    fatigue:    ['ferritin', 'tsh', 'vitaminD', 'testosterone'],
    brainfog:   ['homocysteine', 'vitaminD', 'ferritin', 'glucose'],
    poor_sleep: ['tsh', 'vitaminD', 'testosterone'],
    mood:       ['vitaminD', 'testosterone', 'ferritin'],
    weight_gain:['tsh', 'glucose', 'hba1c', 'testosterone'],
    low_libido: ['testosterone', 'vitaminD'],
    joint_pain: ['vitaminD', 'crp'],
    digestion:  ['crp', 'glucose'],
    hair_skin:  ['ferritin', 'tsh', 'vitaminD'],
    anxiety:    ['tsh', 'ferritin'],
  };

  const goals = profile.goals ?? [];
  const symptoms = profile.symptoms ?? [];

  for (const goal of goals) {
    if (goalMap[goal]?.includes(b.id)) score += 12;
  }
  for (const sym of symptoms) {
    if (symptomMap[sym]?.includes(b.id)) score += 15;
  }

  return Math.min(100, score);
}

// ─── Build a full LabPanel from values + profile ─────────────────────────────

export function buildLabPanel(
  values: Record<string, number>,
  profile: Partial<IntakeProfile> | null,
  source: string,
): LabPanel {
  const biomarkers: Biomarker[] = Object.entries(values).map(([id, value]) => {
    const ref = BIOMARKER_REFS[id];
    if (!ref) return null;
    const { optimalMin, optimalMax } = adjustRanges(ref, id, profile);
    const status = getBiomarkerStatus(value, optimalMin, optimalMax);
    return {
      id, value, status, optimalMin, optimalMax,
      name: ref.name, shortName: ref.shortName,
      unit: ref.unit, category: ref.category,
    };
  }).filter(Boolean) as Biomarker[];

  return {
    id: `panel-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    source,
    biomarkers,
  };
}

// ─── Demo panel values (realistic but instructive) ───────────────────────────

export const DEMO_LAB_VALUES: Record<string, number> = {
  glucose:      102,   // borderline high
  hba1c:        5.7,   // borderline
  ldl:          118,   // slightly elevated
  hdl:          54,    // low-ish for longevity
  triglycerides: 145,  // borderline high
  vitaminD:     31,    // deficient
  crp:          1.8,   // elevated
  testosterone: 420,   // low-normal
  ferritin:     22,    // low
};

// ─── Generate personalised actions from labs + intake ────────────────────────

interface ActionTemplate {
  id: string;
  title: string;
  description: string;
  category: HealthAction['category'];
  why: string;
  targetBiomarkers: string[];
  /** conditions that make this action relevant */
  condition: (panel: LabPanel, profile: Partial<IntakeProfile> | null) => boolean;
  /** higher = show first */
  priority: number;
}

const ACTION_TEMPLATES: ActionTemplate[] = [
  // ── Glucose / metabolic ──────────────────────────────────────────────────
  {
    id: 'post-meal-walk', title: '10-min walk after every meal',
    description: 'Reduces post-prandial glucose spikes',
    category: 'Movement', targetBiomarkers: ['glucose', 'hba1c'],
    why: 'Post-meal walks reduce glucose spikes by up to 30% by activating GLUT-4 in muscle tissue.',
    priority: 90,
    condition: (p) => p.biomarkers.some(b => b.id === 'glucose' && b.status !== 'optimal'),
  },
  {
    id: 'protein-first', title: 'Eat protein before carbs at meals',
    description: 'Simple meal sequencing trick',
    category: 'Nutrition', targetBiomarkers: ['glucose', 'hba1c'],
    why: 'Protein before carbs slows gastric emptying and blunts glucose absorption by 30-40% (multiple RCTs).',
    priority: 85,
    condition: (p) => p.biomarkers.some(b => ['glucose', 'hba1c'].includes(b.id) && b.status !== 'optimal'),
  },
  {
    id: 'zone2-cardio', title: '150 min Zone 2 cardio this week',
    description: 'Structured activity improves insulin sensitivity',
    category: 'Exercise', targetBiomarkers: ['glucose', 'hba1c', 'ldl', 'hdl'],
    why: 'Zone 2 cardio (conversational pace) increases mitochondrial density and improves insulin sensitivity across multiple pathways.',
    priority: 88,
    condition: (p) => p.biomarkers.some(b => ['glucose', 'hba1c', 'ldl'].includes(b.id) && b.status !== 'optimal'),
  },
  // ── Lipids ───────────────────────────────────────────────────────────────
  {
    id: 'omega3', title: 'Take 2–4g EPA/DHA omega-3 daily',
    description: 'Proven triglyceride and inflammation reducer',
    category: 'Supplement', targetBiomarkers: ['triglycerides', 'hdl', 'crp'],
    why: 'High-dose EPA/DHA reduces triglycerides by 20-50% and lowers hsCRP. Choose fish oil or algal oil.',
    priority: 85,
    condition: (p) => p.biomarkers.some(b => ['triglycerides', 'crp'].includes(b.id) && b.status !== 'optimal'),
  },
  {
    id: 'alcohol-cut', title: 'Limit alcohol to 2 drinks/week',
    description: 'Alcohol is a primary driver of high triglycerides',
    category: 'Nutrition', targetBiomarkers: ['triglycerides', 'hdl', 'crp'],
    why: 'Even moderate alcohol raises triglycerides and liver-driven inflammation significantly.',
    priority: 80,
    condition: (p) => p.biomarkers.some(b => b.id === 'triglycerides' && b.status !== 'optimal'),
  },
  {
    id: 'soluble-fiber', title: 'Add 10g soluble fiber daily',
    description: 'Oats, psyllium, or legumes work best',
    category: 'Nutrition', targetBiomarkers: ['ldl', 'glucose'],
    why: 'Soluble fiber binds bile acids, forcing the liver to pull LDL from the bloodstream. Reduces LDL by 5-10%.',
    priority: 75,
    condition: (p) => p.biomarkers.some(b => b.id === 'ldl' && b.status !== 'optimal'),
  },
  // ── Vitamin D ─────────────────────────────────────────────────────────────
  {
    id: 'vitD-supplement', title: 'Take 4,000 IU Vitamin D3 + K2 daily',
    description: 'Most effective protocol for D deficiency',
    category: 'Supplement', targetBiomarkers: ['vitaminD', 'testosterone'],
    why: 'Vitamin D deficiency impairs immune function, mood, and testosterone synthesis. K2 ensures calcium goes to bones, not arteries.',
    priority: 92,
    condition: (p) => p.biomarkers.some(b => b.id === 'vitaminD' && b.status !== 'optimal'),
  },
  {
    id: 'morning-sun', title: '15 min morning sunlight daily',
    description: 'Free Vitamin D + circadian reset',
    category: 'Movement', targetBiomarkers: ['vitaminD'],
    why: 'Skin synthesis of Vitamin D from UVB is the most bioavailable form. Morning light also sets circadian rhythm for better sleep.',
    priority: 70,
    condition: (p) => p.biomarkers.some(b => b.id === 'vitaminD' && b.status !== 'optimal'),
  },
  // ── Inflammation (CRP) ────────────────────────────────────────────────────
  {
    id: 'mediterranean-diet', title: 'Mediterranean diet for 4 weeks',
    description: 'Best anti-inflammatory dietary pattern',
    category: 'Nutrition', targetBiomarkers: ['crp', 'ldl', 'hdl', 'glucose'],
    why: 'The Mediterranean diet reduces hsCRP by 20-30%. Rich in polyphenols, healthy fats, and fiber.',
    priority: 80,
    condition: (p) => p.biomarkers.some(b => b.id === 'crp' && b.status !== 'optimal'),
  },
  {
    id: 'sleep-7-9', title: 'Prioritise 7–9 hours of sleep nightly',
    description: 'Sleep is the most powerful anti-inflammatory',
    category: 'Sleep', targetBiomarkers: ['crp', 'glucose', 'testosterone'],
    why: 'Chronic short sleep (<6 hrs) raises CRP by 25% and increases cortisol, suppressing testosterone and raising glucose.',
    priority: 88,
    condition: (p, profile) => {
      const hasCRP = p.biomarkers.some(b => b.id === 'crp' && b.status !== 'optimal');
      const hasSleepSymptom = profile?.symptoms?.includes('poor_sleep') ?? false;
      return hasCRP || hasSleepSymptom;
    },
  },
  // ── Testosterone / hormones ───────────────────────────────────────────────
  {
    id: 'resistance-training', title: 'Resistance train 3× per week',
    description: 'Most effective natural testosterone support',
    category: 'Exercise', targetBiomarkers: ['testosterone', 'glucose'],
    why: 'Compound lifts (squat, deadlift, press) acutely and chronically raise testosterone and growth hormone.',
    priority: 85,
    condition: (p) => p.biomarkers.some(b => b.id === 'testosterone' && b.status !== 'optimal'),
  },
  {
    id: 'zinc-magnesium', title: 'Take Zinc 30mg + Magnesium 400mg nightly',
    description: 'Critical cofactors for testosterone synthesis',
    category: 'Supplement', targetBiomarkers: ['testosterone'],
    why: 'Zinc deficiency directly reduces testosterone production. Magnesium improves sleep quality and free testosterone levels.',
    priority: 78,
    condition: (p) => p.biomarkers.some(b => b.id === 'testosterone' && b.status !== 'optimal'),
  },
  // ── Ferritin / iron ───────────────────────────────────────────────────────
  {
    id: 'iron-rich-food', title: 'Add iron-rich food to every meal',
    description: 'Red meat, lentils, or spinach + vitamin C',
    category: 'Nutrition', targetBiomarkers: ['ferritin'],
    why: 'Low ferritin is the most common reversible cause of fatigue. Vitamin C (50mg) doubles non-haem iron absorption.',
    priority: 88,
    condition: (p) => p.biomarkers.some(b => b.id === 'ferritin' && b.status === 'low'),
  },
  // ── Stress / cortisol ─────────────────────────────────────────────────────
  {
    id: 'stress-protocol', title: '10-min daily breathwork or meditation',
    description: 'Lowers cortisol and systemic inflammation',
    category: 'Sleep', targetBiomarkers: ['crp', 'glucose', 'testosterone'],
    why: 'Chronic stress elevates cortisol which raises glucose, suppresses testosterone, and drives inflammation.',
    priority: 72,
    condition: (_, profile) => profile?.symptoms?.some(s => ['anxiety', 'poor_sleep', 'mood'].includes(s)) ?? false,
  },
];

// ─── Generate personalised actions ───────────────────────────────────────────

export function generateActionsFromPanel(
  panel: LabPanel,
  profile: Partial<IntakeProfile> | null,
): HealthAction[] {
  return ACTION_TEMPLATES
    .filter(t => t.condition(panel, profile))
    .sort((a, b) => {
      // Boost priority based on how many of user's goals/symptoms each addresses
      const scoreAction = (t: ActionTemplate) => {
        let s = t.priority;
        const goals = profile?.goals ?? [];
        const symptoms = profile?.symptoms ?? [];
        const goalMap: Record<string, string[]> = {
          longevity: ['crp', 'homocysteine', 'apoB', 'glucose'],
          energy:    ['ferritin', 'tsh', 'vitaminD', 'testosterone'],
          weight:    ['glucose', 'hba1c', 'triglycerides'],
          muscle:    ['testosterone', 'vitaminD'],
          sleep:     ['tsh', 'ferritin', 'vitaminD'],
          cognition: ['homocysteine', 'vitaminD', 'ferritin'],
          hormones:  ['testosterone', 'tsh', 'vitaminD'],
          heart:     ['ldl', 'hdl', 'apoB', 'crp', 'triglycerides'],
        };
        for (const g of goals) {
          if (t.targetBiomarkers.some(b => goalMap[g]?.includes(b))) s += 10;
        }
        for (const sym of symptoms) {
          const symMap: Record<string, string[]> = {
            fatigue:     ['ferritin', 'vitaminD', 'testosterone'],
            brainfog:    ['homocysteine', 'vitaminD', 'ferritin'],
            poor_sleep:  ['tsh', 'vitaminD'],
            low_libido:  ['testosterone', 'vitaminD'],
            joint_pain:  ['vitaminD', 'crp'],
            weight_gain: ['glucose', 'tsh'],
            anxiety:     ['tsh', 'ferritin'],
          };
          if (t.targetBiomarkers.some(b => symMap[sym]?.includes(b))) s += 12;
        }
        return s;
      };
      return scoreAction(b) - scoreAction(a);
    })
    .map((t, i) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      why: t.why,
      completed: false,
      targetBiomarkers: t.targetBiomarkers,
      biomarkerTarget: t.targetBiomarkers
        .map((id: string) => BIOMARKER_REFS[id]?.name ?? id)
        .join(', '),
    }));
}

// ─── Compute a single Health Score (0-100) from a panel ─────────────────────

export function computeHealthScore(
  panel: LabPanel,
  profile: Partial<IntakeProfile> | null,
): number {
  if (!panel.biomarkers.length) return 0;
  const weights = panel.biomarkers.map(b => {
    const prio = biomarkerPriorityScore(b, profile);
    const w = 1 + prio / 100; // higher priority = more weight
    const statusScore = { optimal: 100, borderline: 55, elevated: 20, low: 20 };
    return { score: statusScore[b.status] ?? 50, weight: w };
  });
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  const weighted = weights.reduce((s, w) => s + w.score * w.weight, 0);
  return Math.round(weighted / totalWeight);
}

// ─── Legacy exports (backward compat) ────────────────────────────────────────

// Keep BIOMARKER_REFERENCES for any code that still reads it
export const BIOMARKER_REFERENCES = Object.fromEntries(
  Object.entries(BIOMARKER_REFS).map(([id, r]) => [id, {
    optimalMin: r.optimalMin, optimalMax: r.optimalMax,
    unit: r.unit, category: r.category,
  }])
);

// Mock panel kept for fallback but now generated through buildLabPanel
export const MOCK_PANEL = buildLabPanel(DEMO_LAB_VALUES, null, 'Demo Data');

// Legacy mock actions (replaced by generateActionsFromPanel at runtime)
export const MOCK_ACTIONS: HealthAction[] = generateActionsFromPanel(MOCK_PANEL, null).slice(0, 5);

// Legacy mock wearable
export const MOCK_WEARABLE: WearableData = {
  dailySteps: 7240,
  sleepDuration: 6.8,
  restingHeartRate: 62,
  hrv: 41,
  hrvTrend: -3,
  source: 'Apple Health',
  syncedAt: new Date().toISOString(),
};
