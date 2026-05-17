-- Migration: providers table + provider_id on user_protocols + placeholder protocol seed
-- Run in Supabase SQL Editor after 20260516_spec_data_model.sql

-- ── Providers ─────────────────────────────────────────────────────────────────
-- A provider is a clinician within an organization who assigns protocols to patients.
-- Separate from org_admin role — a provider may also be an org_admin, or not.
CREATE TABLE IF NOT EXISTS providers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  profile_id      uuid NOT NULL REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, profile_id)
);

CREATE INDEX IF NOT EXISTS providers_org_idx     ON providers(organization_id);
CREATE INDEX IF NOT EXISTS providers_profile_idx ON providers(profile_id);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_read_own"       ON providers FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "org_read_own_providers"   ON providers FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE organization_id = providers.organization_id
  ));

-- ── Add provider_id to user_protocols ─────────────────────────────────────────
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES providers(id);
CREATE INDEX IF NOT EXISTS user_protocols_provider_idx ON user_protocols(provider_id);

-- ── Placeholder longevity protocol ────────────────────────────────────────────
-- organization_id NULL = BioPrecision default, available to all orgs
-- Replace with clinic-specific protocols as each clinic onboards

INSERT INTO protocols_v2 (id, organization_id, name, description, duration_days, version, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  'BioPrecision Foundation Protocol',
  'A 90-day evidence-based longevity protocol targeting metabolic health, cardiovascular fitness, body composition, and sleep quality. Validated intervention stack drawn from peer-reviewed literature. Replace with clinic-specific protocol on onboarding.',
  90,
  1,
  true
) ON CONFLICT (id) DO NOTHING;

-- ── Protocol steps (day_number = 1 = daily repeating actions) ─────────────────
INSERT INTO protocol_steps
  (protocol_id, day_number, step_type, title, description, evidence_summary, sort_order)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'action',
    'Zone 2 cardio — 45 min',
    'Maintain a pace where you can hold a conversation but feel the effort. Target heart rate: 60–70% of max HR. Walking fast, cycling, rowing, or swimming all count. Four sessions per week minimum.',
    'Zone 2 training drives mitochondrial biogenesis and improves VO2max — the single strongest predictor of all-cause mortality. Iñigo San Millán et al. (2021): consistent Zone 2 training increases mitochondrial density and fat oxidation capacity within 8–12 weeks. PMID: 34027685',
    1
  ),
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'action',
    'Strength training — 3 sets to near-failure',
    'Compound lifts preferred: squat, deadlift, press, row. 3 sets per movement, stopping 1–2 reps before failure. 2–3 sessions per week. Progressive overload: add weight or reps each week.',
    'Resistance training is the primary intervention for preserving lean muscle mass and insulin sensitivity with age. Morton et al. (2018) meta-analysis: 3 sets to near-failure produces equivalent hypertrophy to higher volumes with lower injury risk. PMID: 28834797',
    2
  ),
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'action',
    'Eat within a 10-hour window',
    'First meal no earlier than 8am, last meal no later than 6pm (or equivalent 10-hour range). Water, black coffee, and plain tea do not break the fast. Not a calorie restriction intervention — eat to satiety within the window.',
    'Time-restricted eating activates AMPK and suppresses mTOR during the fasted period, driving autophagy and improving metabolic flexibility. Sutton et al. (2018) RCT: 10-hour TRE improved insulin sensitivity, blood pressure, and oxidative stress independent of weight loss. PMID: 29754952',
    3
  ),
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'action',
    'Hit your protein target — 1.6 g/kg bodyweight',
    'Distribute across 3–4 meals. Prioritize complete protein sources: meat, fish, eggs, dairy, or well-combined plant sources. A 80 kg person targets 128 g/day minimum. Track for the first week to calibrate portions.',
    'The protein anabolic threshold is reached at ~1.6 g/kg/day for most individuals. Morton et al. (2018) meta-analysis of 49 RCTs: protein supplementation above 1.62 g/kg produced no additional lean mass gains; falling below this threshold accelerates sarcopenia. PMID: 28698222',
    4
  ),
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'action',
    'Vitamin D3 5,000 IU + K2 100 mcg with largest meal',
    'Take with a fat-containing meal for absorption. D3 paired with K2 directs calcium to bone rather than arterial walls. Most adults with vitamin D insufficiency require 4,000–6,000 IU daily to reach the 50–80 ng/mL functional range.',
    'Vitamin D deficiency (< 30 ng/mL) is associated with increased all-cause mortality, immune dysfunction, and insulin resistance. Holick et al.: supplementation of 5,000 IU raises serum 25-OH-D by ~15–20 ng/mL over 8 weeks. K2 (MK-7 form) prevents vascular calcification associated with high-dose D3. PMID: 21872800',
    5
  ),
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'action',
    'Omega-3 — 2 g EPA+DHA daily with food',
    'Look for the combined EPA+DHA content on the label, not total fish oil. Triglyceride-form (rTG) fish oil has 70% higher bioavailability than ethyl ester. Take with the largest meal of the day.',
    'EPA and DHA reduce triglycerides (−15 to −30%), lower hsCRP, and improve endothelial function. REDUCE-IT trial (Bhatt et al. 2019, NEJM): high-dose EPA reduced major cardiovascular events by 25% in high-risk patients. At 2 g/day, primary prevention benefit is well-established. PMID: 30415628',
    6
  ),
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'action',
    'Magnesium glycinate — 400 mg before bed',
    'Glycinate chelate is best tolerated and most bioavailable. Take 30–60 minutes before sleep. If loose stools occur, reduce to 200 mg and titrate up over 2 weeks.',
    'Over 40% of adults are magnesium deficient. Magnesium is a cofactor in 300+ enzymatic reactions including ATP synthesis and insulin signaling. Abbasi et al. (2012) RCT: magnesium supplementation improved sleep efficiency, sleep onset, and reduced cortisol and inflammatory markers. PMID: 23853635',
    7
  ),
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'action',
    'Morning sunlight — 10 min within 1 hour of waking',
    'Go outside within 60 minutes of waking. No sunglasses. Overcast days still work — 10,000 lux outdoors vs 200 lux indoors. This is not about vitamin D — it is about setting the circadian clock via the retinohypothalamic tract.',
    'Morning light exposure sets the phase of the suprachiasmatic nucleus, anchoring the cortisol awakening response and melatonin onset timing. Huberman et al.: consistent morning light exposure improves sleep quality, mood, and alertness within 7–10 days. Lewy et al. (2006): morning light advances the circadian phase and improves sleep timing. PMID: 16648253',
    8
  ),
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'action',
    'No alcohol within 3 hours of sleep',
    'Alcohol consumed within 3 hours of bedtime fragments sleep architecture — specifically suppressing REM sleep in the first half of the night and causing rebound wakefulness in the second half. This applies even to 1–2 drinks.',
    'Alcohol is the most common sleep disruptor in working adults. Ebrahim et al. (2013) meta-analysis: even low-dose alcohol reduces REM sleep by 9.7% and increases wakefulness after sleep onset. REM sleep is required for memory consolidation and emotional regulation. PMID: 24215288',
    9
  ),
  (
    'a0000000-0000-0000-0000-000000000001', 1, 'check_in',
    'Daily readiness check-in',
    'Rate your sleep quality (1–5), energy (1–5), and stress (1–5). Takes 30 seconds. This data is used to track protocol adherence and correlate lifestyle inputs with biomarker outcomes at your 30, 60, and 90-day draws.',
    'Longitudinal self-report data combined with biomarker panels enables within-subject effect size estimation. Adherence tracking is the primary determinant of whether protocol outcomes are attributable to the intervention.',
    10
  )
ON CONFLICT DO NOTHING;
