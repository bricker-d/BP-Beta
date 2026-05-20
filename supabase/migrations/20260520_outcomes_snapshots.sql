-- Priority 6: outcomes snapshots at days 30/60/90
-- Additive only — no tables or columns dropped.
-- Run in Supabase SQL editor after prior migrations.

-- ── RLS: org_admin reads their org's snapshots ────────────────────────────────

DROP POLICY IF EXISTS "org_admin_read_snapshots" ON outcomes_snapshots;
CREATE POLICY "org_admin_read_snapshots"
  ON outcomes_snapshots FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('org_admin', 'bp_admin')
    )
  );

DROP POLICY IF EXISTS "bp_admin_all_snapshots" ON outcomes_snapshots;
CREATE POLICY "bp_admin_all_snapshots"
  ON outcomes_snapshots FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'bp_admin')
  );

-- ── Function: compute and upsert one snapshot ─────────────────────────────────
-- Call manually: SELECT compute_outcomes_snapshot('<user_protocol_id>');

CREATE OR REPLACE FUNCTION compute_outcomes_snapshot(up_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id        uuid;
  v_protocol_id    uuid;
  v_org_id         uuid;
  v_started_at     timestamptz;
  v_current_day    integer;
  v_step_count     integer;
  v_expected       integer;
  v_actual         integer;
  v_adherence      numeric;
  v_snapshot_day   integer;
  v_baseline_labs  jsonb;
  v_latest_labs    jsonb;
  v_deltas         jsonb := '{}';
BEGIN
  -- Load user_protocol
  SELECT user_id, protocol_id, organization_id, started_at, current_day
  INTO v_user_id, v_protocol_id, v_org_id, v_started_at, v_current_day
  FROM user_protocols
  WHERE id = up_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Only snapshot at milestones
  IF v_current_day NOT IN (30, 60, 90) THEN RETURN; END IF;
  v_snapshot_day := v_current_day;

  -- Count distinct daily steps (cap at 7, matching app logic)
  SELECT LEAST(COUNT(*), 7) INTO v_step_count
  FROM (
    SELECT DISTINCT ON (title) id
    FROM protocol_steps
    WHERE protocol_id = v_protocol_id AND day_number = 1
    ORDER BY title, sort_order ASC
  ) deduped;

  v_expected := v_snapshot_day * v_step_count;

  -- Count actual completions within the protocol window
  SELECT COUNT(*) INTO v_actual
  FROM step_completions sc
  JOIN protocol_steps ps ON ps.id = sc.step_id
  WHERE sc.user_id = v_user_id
    AND ps.protocol_id = v_protocol_id
    AND sc.completed_on >= v_started_at::date
    AND sc.completed_on <= (v_started_at::date + (v_snapshot_day - 1));

  v_adherence := CASE WHEN v_expected > 0
    THEN ROUND((v_actual::numeric / v_expected) * 100, 1)
    ELSE NULL
  END;

  -- Biomarker deltas: first vs. most recent lab_reading for this user
  SELECT biomarkers INTO v_baseline_labs
  FROM lab_readings
  WHERE user_id = v_user_id
  ORDER BY uploaded_at ASC
  LIMIT 1;

  SELECT biomarkers INTO v_latest_labs
  FROM lab_readings
  WHERE user_id = v_user_id
  ORDER BY uploaded_at DESC
  LIMIT 1;

  IF v_baseline_labs IS NOT NULL AND v_latest_labs IS NOT NULL THEN
    SELECT jsonb_object_agg(
      latest_b->>'id',
      ROUND((latest_b->>'value')::numeric - (base_b->>'value')::numeric, 2)
    )
    INTO v_deltas
    FROM jsonb_array_elements(v_latest_labs)  AS latest_b
    JOIN jsonb_array_elements(v_baseline_labs) AS base_b
      ON latest_b->>'id' = base_b->>'id'
    WHERE (latest_b->>'value') IS NOT NULL
      AND (base_b->>'value')  IS NOT NULL;
  END IF;

  -- Upsert snapshot
  INSERT INTO outcomes_snapshots
    (user_id, protocol_id, organization_id, snapshot_day, adherence_rate, biomarker_deltas)
  VALUES
    (v_user_id, v_protocol_id, v_org_id, v_snapshot_day, v_adherence, COALESCE(v_deltas, '{}'))
  ON CONFLICT (user_id, protocol_id, snapshot_day)
    DO UPDATE SET
      adherence_rate   = EXCLUDED.adherence_rate,
      biomarker_deltas = EXCLUDED.biomarker_deltas;

EXCEPTION WHEN OTHERS THEN
  -- Never let snapshot errors surface to callers
  NULL;
END;
$$;

-- Unique constraint required for ON CONFLICT above (idempotent add)
ALTER TABLE outcomes_snapshots
  DROP CONSTRAINT IF EXISTS outcomes_snapshots_user_protocol_day_key;
ALTER TABLE outcomes_snapshots
  ADD CONSTRAINT outcomes_snapshots_user_protocol_day_key
  UNIQUE (user_id, protocol_id, snapshot_day);

-- ── Trigger: fire on current_day milestone ───────────────────────────────────

CREATE OR REPLACE FUNCTION fn_snapshot_on_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.current_day IN (30, 60, 90) AND NEW.current_day IS DISTINCT FROM OLD.current_day THEN
    PERFORM compute_outcomes_snapshot(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_milestone ON user_protocols;
CREATE TRIGGER trg_snapshot_milestone
  AFTER UPDATE OF current_day ON user_protocols
  FOR EACH ROW EXECUTE FUNCTION fn_snapshot_on_milestone();
