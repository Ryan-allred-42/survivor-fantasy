-- ============================================================
-- Migration: Fix Season 50 episode dates to the real 2026 schedule
-- Season 50 premieres Wednesday, February 25, 2026
-- Lock times = episode air date at 8pm ET
--   • EST (UTC-5): before March 8  → lock = next day 01:00 UTC
--   • EDT (UTC-4): March 8 onward  → lock = next day 00:00 UTC
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- Remove old placeholder episodes
DELETE FROM survivor_episodes WHERE season = 50;

-- Insert the real 2026 schedule (14 episodes + 1 finale)
INSERT INTO survivor_episodes (season, week_number, air_date, lock_time) VALUES
  (50,  1, '2026-02-25', '2026-02-26 01:00:00+00'),  -- 8pm EST
  (50,  2, '2026-03-04', '2026-03-05 01:00:00+00'),  -- 8pm EST
  (50,  3, '2026-03-11', '2026-03-12 00:00:00+00'),  -- 8pm EDT (DST starts Mar 8)
  (50,  4, '2026-03-18', '2026-03-19 00:00:00+00'),
  (50,  5, '2026-03-25', '2026-03-26 00:00:00+00'),
  (50,  6, '2026-04-01', '2026-04-02 00:00:00+00'),
  (50,  7, '2026-04-08', '2026-04-09 00:00:00+00'),
  (50,  8, '2026-04-15', '2026-04-16 00:00:00+00'),
  (50,  9, '2026-04-22', '2026-04-23 00:00:00+00'),
  (50, 10, '2026-04-29', '2026-04-30 00:00:00+00'),
  (50, 11, '2026-05-06', '2026-05-07 00:00:00+00'),
  (50, 12, '2026-05-13', '2026-05-14 00:00:00+00'),
  (50, 13, '2026-05-20', '2026-05-21 00:00:00+00'),
  (50, 14, '2026-05-27', '2026-05-28 00:00:00+00')   -- Finale
ON CONFLICT (season, week_number) DO UPDATE
  SET air_date  = EXCLUDED.air_date,
      lock_time = EXCLUDED.lock_time;
