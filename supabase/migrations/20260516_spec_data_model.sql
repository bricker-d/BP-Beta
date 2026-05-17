-- BioPrecision Spec Data Model Migration
-- Status: APPLIED 2026-05-16
-- Additive only — no tables or columns dropped
-- Note: profiles.id has no FK to auth.users (Supabase cross-schema FK blocked in SQL editor)
--       The app enforces the relationship by always using auth.uid() as the profile id.

CREATE TABLE IF NOT EXISTS organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  branding   jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id                  uuid PRIMARY KEY,
  organization_id     uuid REFERENCES organizations(id),
  role                text NOT NULL DEFAULT 'user'
                        CHECK (role IN ('user', 'org_admin', 'bp_admin')),
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

CREATE TABLE IF NOT EXISTS user_protocols (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  protocol_id     uuid NOT NULL REFERENCES protocols_v2(id),
  organization_id uuid REFERENCES organizations(id),
  started_at      timestamptz DEFAULT now(),
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'completed')),
  current_day     integer NOT NULL DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outcomes_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  protocol_id      uuid NOT NULL REFERENCES protocols_v2(id),
  organization_id  uuid REFERENCES organizations(id),
  snapshot_day     integer NOT NULL,
  adherence_rate   numeric,
  biomarker_deltas jsonb DEFAULT '{}',
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_org_idx         ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS protocols_v2_org_idx     ON protocols_v2(organization_id);
CREATE INDEX IF NOT EXISTS protocol_steps_proto_idx ON protocol_steps(protocol_id, day_number, sort_order);
CREATE INDEX IF NOT EXISTS user_protocols_user_idx  ON user_protocols(user_id);
CREATE INDEX IF NOT EXISTS user_protocols_org_idx   ON user_protocols(organization_id);
CREATE INDEX IF NOT EXISTS outcomes_user_idx        ON outcomes_snapshots(user_id, protocol_id, snapshot_day);

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profiles_updated_at();

ALTER TABLE organizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols_v2       ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_steps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_protocols     ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile"     ON profiles           FOR ALL    USING (auth.uid() = id);
CREATE POLICY "users_own_protocols"   ON user_protocols     FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "users_own_snapshots"   ON outcomes_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "read_active_protocols" ON protocols_v2       FOR SELECT USING (is_active = true);
CREATE POLICY "read_protocol_steps"   ON protocol_steps    FOR SELECT USING (true);

INSERT INTO organizations (name, slug)
VALUES ('Frame Longevity', 'frame-longevity')
ON CONFLICT (slug) DO NOTHING;
