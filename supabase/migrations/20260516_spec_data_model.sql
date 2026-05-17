-- BioPrecision Spec Data Model Migration
-- Run in Supabase SQL Editor
-- Additive only — no tables or columns are dropped

-- ── Organizations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  branding    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_read_own_org" ON organizations FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE organization_id = organizations.id
    AND role IN ('org_admin', 'bp_admin')
  ));

CREATE POLICY "bp_admin_all_orgs" ON organizations FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'bp_admin'));

-- ── Profiles (extends auth.users) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id     uuid REFERENCES organizations(id),
  role                text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'org_admin', 'bp_admin')),
  onboarding_complete boolean NOT NULL DEFAULT false,
  white_label_slug    text,
  name                text,
  primary_focus       text,
  goals               text[],
  age                 integer,
  biological_sex      text,
  height_ft           integer,
  height_in           integer,
  weight_lbs          numeric,
  symptoms            text[],
  habits              jsonb,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile" ON profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "org_admin_read_org_profiles" ON profiles FOR SELECT
  USING (auth.uid() IN (
    SELECT p2.id FROM profiles p2
    WHERE p2.organization_id = profiles.organization_id
    AND p2.role IN ('org_admin', 'bp_admin')
  ));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profiles_updated_at();

-- Auto-create profile stub on Supabase Auth signup
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, onboarding_complete)
  VALUES (NEW.id, 'user', false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ── Protocols v2 (org-scoped, replaces old protocols table in new code) ────────
-- Named protocols_v2 to avoid conflict with existing protocols table
CREATE TABLE IF NOT EXISTS protocols_v2 (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  name            text NOT NULL,
  description     text,
  duration_days   integer,
  version         integer DEFAULT 1,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE protocols_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_org_or_default_protocols" ON protocols_v2 FOR SELECT
  USING (
    organization_id IS NULL
    OR auth.uid() IN (SELECT id FROM profiles WHERE organization_id = protocols_v2.organization_id)
  );

CREATE POLICY "org_admins_manage_protocols" ON protocols_v2 FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE organization_id = protocols_v2.organization_id
    AND role IN ('org_admin', 'bp_admin')
  ));

-- ── Protocol Steps ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS protocol_steps (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id      uuid NOT NULL REFERENCES protocols_v2(id) ON DELETE CASCADE,
  day_number       integer NOT NULL,
  step_type        text NOT NULL DEFAULT 'action',
  title            text NOT NULL,
  description      text,
  target_metric_id uuid,
  target_value_min numeric,
  target_value_max numeric,
  evidence_summary text,
  sort_order       integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE protocol_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "protocol_steps_follow_protocol" ON protocol_steps FOR SELECT
  USING (protocol_id IN (SELECT id FROM protocols_v2));

-- ── User Protocol Assignments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_protocols (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  protocol_id     uuid NOT NULL REFERENCES protocols_v2(id),
  organization_id uuid REFERENCES organizations(id),
  started_at      timestamptz DEFAULT now(),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  current_day     integer NOT NULL DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE user_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_user_protocols" ON user_protocols FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "org_admins_read_org_user_protocols" ON user_protocols FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE organization_id = user_protocols.organization_id
    AND role IN ('org_admin', 'bp_admin')
  ));

-- ── Outcomes Snapshots ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outcomes_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  protocol_id     uuid NOT NULL REFERENCES protocols_v2(id),
  organization_id uuid REFERENCES organizations(id),
  snapshot_day    integer NOT NULL,
  adherence_rate  numeric,
  biomarker_deltas jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE outcomes_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_snapshots" ON outcomes_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "org_admins_read_org_snapshots" ON outcomes_snapshots FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE organization_id = outcomes_snapshots.organization_id
    AND role IN ('org_admin', 'bp_admin')
  ));

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_org_idx ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS protocols_v2_org_idx ON protocols_v2(organization_id);
CREATE INDEX IF NOT EXISTS protocol_steps_protocol_idx ON protocol_steps(protocol_id, day_number, sort_order);
CREATE INDEX IF NOT EXISTS user_protocols_user_idx ON user_protocols(user_id);
CREATE INDEX IF NOT EXISTS user_protocols_org_idx ON user_protocols(organization_id);
CREATE INDEX IF NOT EXISTS outcomes_snapshots_user_idx ON outcomes_snapshots(user_id, protocol_id, snapshot_day);

-- ── Seed: Frame Longevity organization ────────────────────────────────────────
INSERT INTO organizations (name, slug)
VALUES ('Frame Longevity', 'frame-longevity')
ON CONFLICT (slug) DO NOTHING;

-- To add a new organization (run for each new clinic):
-- INSERT INTO organizations (name, slug, branding)
-- VALUES ('Clinic Name', 'clinic-slug', '{"primary_color": "#1a2e44"}');
-- Then set the user's profile: UPDATE profiles SET organization_id = <org_id>, role = 'org_admin' WHERE id = <user_id>;
