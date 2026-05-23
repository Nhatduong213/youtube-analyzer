-- V13 MIGRATION SCRIPT
-- Add missing columns for Video Analytics
ALTER TABLE videos ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS tags jsonb;

-- Create table to store daily view history (since Turso only keeps 48h)
CREATE TABLE IF NOT EXISTS daily_video_stats (
  video_id text REFERENCES videos(id) ON DELETE CASCADE,
  captured_date date NOT NULL DEFAULT current_date,
  view_count bigint NOT NULL,
  PRIMARY KEY (video_id, captured_date)
);
