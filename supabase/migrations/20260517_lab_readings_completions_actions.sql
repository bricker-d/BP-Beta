-- Priority 4 + 5: lab_readings trigger, step_completions, user_daily_actions
-- Additive only — no tables or columns dropped
--
-- ONE-TIME SETUP Dan must do in Supabase SQL editor before the trigger fires:
--   SELECT vault.create_secret('<your-service-role-key>', 'supabase_service_role_key');
-- The trigger reads this secret to authenticate the edge function call.

-- ── New tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lab_readings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source      text,
  biomarkers  jsonb NOT NULL DEFAULT '[]',
  uploaded_at timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);

-- Tracks which protocol steps a user completed on a given day
CREATE TABLE IF NOT EXISTS step_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step_id      uuid NOT NULL REFERENCES protocol_steps(id) ON DELETE CASCADE,
  completed_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, step_id, completed_on)
);

-- AI-generated daily action list per user per day (protocol steps fill first)
CREATE TABLE IF NOT EXISTS user_daily_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generated_date date NOT NULL DEFAULT CURRENT_DATE,
  actions        jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, generated_date)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS lab_readings_user_idx
  ON lab_readings(user_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS step_completions_user_date_idx
  ON step_completions(user_id, completed_on);

CREATE INDEX IF NOT EXISTS user_daily_actions_user_date_idx
  ON user_daily_actions(user_id, generated_date);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE lab_readings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_completions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_lab_readings"    ON lab_readings;
DROP POLICY IF EXISTS "users_own_step_completions" ON step_completions;
DROP POLICY IF EXISTS "users_read_daily_actions"   ON user_daily_actions;
CREATE POLICY "users_own_lab_readings"
  ON lab_readings FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_step_completions"
  ON step_completions FOR ALL USING (auth.uid() = user_id);

-- Service role writes via edge function; users read their own
CREATE POLICY "users_read_daily_actions"
  ON user_daily_actions FOR SELECT USING (auth.uid() = user_id);

-- ── Postgres trigger → edge function ─────────────────────────────────────────
-- Fires after each lab_readings INSERT.
-- Reads service role key from vault, calls generate-recommendations edge function.

CREATE OR REPLACE FUNCTION fn_trigger_recommendations()
RETURNS TRIGGER AS $$
DECLARE
  svc_key text;
BEGIN
  SELECT decrypted_secret INTO svc_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  -- Silently no-op if vault secret not yet configured
  IF svc_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://lrblvcixijbbfxiutgnp.supabase.co/functions/v1/generate-recommendations',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body    := jsonb_build_object(
      'user_id',    NEW.user_id::text,
      'reading_id', NEW.id::text
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lab_readings_recommendations ON lab_readings;
CREATE TRIGGER trg_lab_readings_recommendations
  AFTER INSERT ON lab_readings
  FOR EACH ROW
  EXECUTE FUNCTION fn_trigger_recommendations();
