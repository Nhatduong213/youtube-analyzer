-- Enable pg_cron if not already enabled
create extension if not exists pg_cron;

-- ======================================================================
-- PREREQUISITE: Set these GUCs in your Supabase SQL Editor ONCE:
--
--   ALTER DATABASE postgres SET app.supabase_url = 'https://<your-project>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<your-service-role-key>';
--
-- Then reload the config:  SELECT pg_reload_conf();
-- ======================================================================

-- Hourly Tracker: Trigger every hour.
-- URL and Bearer token are read from Postgres GUCs — never hardcoded.
select cron.schedule(
  'hourly-tracker-job',
  '0 * * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/hourly-tracker',
      headers := json_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )::jsonb,
      body := '{}'::jsonb
    )
  $$
);
