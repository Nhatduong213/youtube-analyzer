-- Enable pg_cron if not already enabled
create extension if not exists pg_cron;

-- Hourly Tracker: Staggered trigger
-- Gọi Edge Function `hourly-tracker` cho các kênh chia theo khung giờ.
-- Ví dụ: Channel N chạy lúc xx:N*2. Vì pg_cron chỉ cho phép lịch tới từng phút (không có giây), ta sẽ lập lịch chạy mỗi phút và trigger function.
-- Tuy nhiên, cách tốt hơn để stagger với pg_cron là lên lịch chạy 1 job mỗi phút và truyền thông số phút hiện tại, Edge Function sẽ tự map.

-- Unschedule old daily-scan-job (no longer needed)
select cron.unschedule('daily-scan-job');

-- Lịch chạy hourly-tracker: Có thể trigger mỗi phút hoặc mỗi 2 phút
-- Nếu ta muốn trigger mỗi 2 phút để xử lý các channel được phân bổ vào phút đó
select cron.schedule(
  'hourly-tracker-job',
  '*/2 * * * *',
  $$
    select net.http_post(
      url:='https://xmdigxeedngotpjqwtbm.supabase.co/functions/v1/hourly-tracker',
      headers:='{"Authorization": "Bearer sb_publishable_CqlfmuF0VLZbCcjE8AT_Kw_R1Z9ifLz"}'::jsonb,
      body:=json_build_object('minute', extract(minute from now()))::jsonb
    )
  $$
);
