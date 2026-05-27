-- Enable pg_cron if not already enabled
create extension if not exists pg_cron;

-- ======================================================================
-- 1. CREATE SECURE SCHEMA & TABLE TO STORE SYSTEM KEYS
-- (Avoids "permission denied" errors when setting custom database GUCs)
-- ======================================================================
create schema if not exists private;

create table if not exists private.keys (
  key text primary key,
  value text not null
);

-- Protect the table from public/authenticated access
revoke all on private.keys from public, anon, authenticated;

-- ======================================================================
-- 2. PREREQUISITE: Run this insert statement ONCE in your SQL Editor:
--
--   insert into private.keys (key, value) values 
--     ('supabase_url', 'https://<your-project>.supabase.co'),
--     ('supabase_secret_key', '<your-secret-key>')
--   on conflict (key) do update set value = excluded.value;
-- ======================================================================

-- Hourly Tracker: Trigger every hour.
-- Reads URL and Bearer token securely from the private database table.
select cron.schedule(
  'hourly-tracker-job',
  '0 * * * *',
  $$
    select net.http_post(
      url := (select value from private.keys where key = 'supabase_url') || '/functions/v1/hourly-tracker',
      headers := json_build_object(
        'Authorization', 'Bearer ' || (select value from private.keys where key = 'supabase_secret_key')
      )::jsonb,
      body := '{}'::jsonb
    )
  $$
);
