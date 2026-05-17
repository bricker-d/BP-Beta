-- Multi-tenancy migration: add clinics table and clinic_id to patients/protocols

-- 1. Clinics table
CREATE TABLE IF NOT EXISTS clinics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE clinics DISABLE ROW LEVEL SECURITY;

-- 2. Add clinic_id columns
ALTER TABLE patients  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE protocols ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
CREATE INDEX IF NOT EXISTS patients_clinic_idx  ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS protocols_clinic_idx ON protocols(clinic_id);

-- 3. Seed Frame Longevity clinic (existing password)
INSERT INTO clinics (name, slug, password_hash)
VALUES ('Frame Longevity', 'frame-longevity', crypt('FrameLongevity2024!', gen_salt('bf')))
ON CONFLICT (slug) DO NOTHING;

-- 4. Assign all existing data to Frame Longevity
UPDATE patients  SET clinic_id = (SELECT id FROM clinics WHERE slug = 'frame-longevity') WHERE clinic_id IS NULL;
UPDATE protocols SET clinic_id = (SELECT id FROM clinics WHERE slug = 'frame-longevity') WHERE clinic_id IS NULL;

-- 5. Password verification RPC (uses pgcrypto, which Supabase enables by default)
CREATE OR REPLACE FUNCTION verify_clinic_login(p_slug text, p_password text)
RETURNS TABLE(id uuid, name text, slug text) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.slug FROM clinics c
  WHERE c.slug = p_slug
    AND c.password_hash = crypt(p_password, c.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add clinic_id to patient_overview view
CREATE OR REPLACE VIEW patient_overview AS
SELECT
  p.id,
  p.name,
  p.primary_focus,
  p.goals,
  p.age,
  p.biological_sex,
  p.created_at,
  p.clinic_id,
  (SELECT panel_date FROM lab_panels lp WHERE lp.patient_id = p.id ORDER BY panel_date DESC LIMIT 1) AS latest_panel_date,
  (SELECT jsonb_array_length(lp.biomarkers) FROM lab_panels lp WHERE lp.patient_id = p.id ORDER BY panel_date DESC LIMIT 1) AS total_biomarkers,
  (
    SELECT round(
      100.0 * avg(
        (SELECT count(*) FROM jsonb_each_text(dl.action_completions) WHERE value = 'true')::numeric /
        nullif((SELECT count(*) FROM jsonb_each_text(dl.action_completions)), 0)
      )
    )
    FROM daily_logs dl
    WHERE dl.patient_id = p.id
      AND dl.log_date >= current_date - interval '7 days'
  ) AS weekly_completion_pct,
  (current_date - (SELECT log_date FROM daily_logs dl WHERE dl.patient_id = p.id ORDER BY log_date DESC LIMIT 1)) AS days_since_checkin
FROM patients p;

-- To add a new clinic (run for each new clinic you onboard):
-- INSERT INTO clinics (name, slug, password_hash)
-- VALUES ('Clinic Name', 'clinic-slug', crypt('their-password', gen_salt('bf')));
