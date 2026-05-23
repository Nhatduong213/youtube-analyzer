-- V12 MIGRATION SCRIPT
-- Priority 1: Schema Rate Limit
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS rate_limit_log (
  user_id text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT date_trunc('minute', now(), 'UTC'),
  count int NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_log (window_start);

SELECT cron.schedule('cleanup_rate_limit', '* * * * *', $$
  DELETE FROM rate_limit_log WHERE window_start < date_trunc('minute', now(), 'UTC') - INTERVAL '2 minutes';
$$);

CREATE OR REPLACE FUNCTION increment_rate_limit(p_user_id text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO rate_limit_log (user_id) 
  VALUES (p_user_id)
  ON CONFLICT (user_id, window_start) 
  DO UPDATE SET count = rate_limit_log.count + 1
  RETURNING count INTO v_count;
  
  RETURN v_count;
END;
$$;

-- Priority 2: Vault Upsert RPC (Namespace Lock 1 & Nested Exception NO_DATA_FOUND)
DROP FUNCTION IF EXISTS save_user_secret(text, text);

CREATE OR REPLACE FUNCTION save_user_secret(secret_name text, secret_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF secret_name IS NULL THEN 
    RAISE EXCEPTION 'secret_name cannot be null'; 
  END IF;

  -- Namespace 1: vault secrets
  IF NOT pg_try_advisory_xact_lock(1, hashtext('vault_secret_' || secret_name)) THEN
    RAISE EXCEPTION 'ERR_SECRET_UPDATE_IN_PROGRESS';
  END IF;

  BEGIN
    PERFORM vault.create_secret(secret_value, secret_name);
  EXCEPTION WHEN unique_violation THEN
    BEGIN
      SELECT id INTO STRICT v_id FROM vault.secrets WHERE name = secret_name FOR UPDATE;
      PERFORM vault.update_secret(v_id, secret_value);
    EXCEPTION WHEN NO_DATA_FOUND THEN
      -- Row deleted mid-flight, retry create
      PERFORM vault.create_secret(secret_value, secret_name);
    END;
  END;
END;
$$;

-- Priority 3: Edge Function Dedup Helper (Namespace Lock 2 & JSON Return)
-- This function can be called by your Edge Function to acquire the lock
CREATE OR REPLACE FUNCTION acquire_channel_process_lock(p_channel_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Namespace 2: channel processing
  IF NOT pg_try_advisory_xact_lock(2, hashtext('channel_process_' || p_channel_id)) THEN
    RETURN json_build_object('status', 'skipped', 'reason', 'lock_not_acquired');
  END IF;
  
  RETURN json_build_object('status', 'acquired');
END;
$$;
