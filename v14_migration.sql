-- V14 MIGRATION: N:N Channel Architecture
-- Run this BEFORE deploying new code

-- 1. Junction table: user <-> channel
CREATE TABLE IF NOT EXISTS user_channels (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id text REFERENCES channels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

-- 2. API key error tracking per user per channel
CREATE TABLE IF NOT EXISTS api_key_errors (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id text REFERENCES channels(id) ON DELETE CASCADE,
  error_message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

-- 3. Migrate existing data: copy user_id from channels into user_channels
INSERT INTO user_channels (user_id, channel_id)
SELECT user_id, id FROM channels WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Drop user_id column from channels
ALTER TABLE channels DROP COLUMN IF EXISTS user_id;
