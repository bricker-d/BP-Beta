-- Replaces legacy wearable_connections table.
-- Stores OAuth tokens per user per provider, scoped to auth users (profiles.id).
CREATE TABLE IF NOT EXISTS user_wearable_tokens (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider         text NOT NULL CHECK (provider IN ('oura', 'whoop', 'garmin')),
  access_token     text NOT NULL,
  refresh_token    text,
  token_expires_at timestamptz,
  scopes           text,
  connected_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS user_wearable_tokens_user_idx ON user_wearable_tokens(user_id);

ALTER TABLE user_wearable_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_wearable_tokens" ON user_wearable_tokens;
CREATE POLICY "users_own_wearable_tokens" ON user_wearable_tokens FOR ALL USING (auth.uid() = user_id);
