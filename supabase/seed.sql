-- ============================================================
-- Survivor Season 50 Cast Seed Data
-- Update photo_url values after uploading headshots to Supabase Storage
-- Placement and eliminated_week will be filled in as the season progresses
-- ============================================================

INSERT INTO survivor_players (name, age, hometown, occupation, tribe, season, is_active) VALUES
  ('TBD Player 1',  NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 2',  NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 3',  NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 4',  NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 5',  NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 6',  NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 7',  NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 8',  NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 9',  NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 10', NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 11', NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 12', NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 13', NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 14', NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 15', NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 16', NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 17', NULL, 'TBD', 'TBD', 'TBD', 50, true),
  ('TBD Player 18', NULL, 'TBD', 'TBD', 'TBD', 50, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Season 50 Episodes
-- Wednesdays at 8pm EST as lock times
-- Adjust air_date and lock_time once the schedule is confirmed
-- lock_time = Wednesday at 20:00 EST = 01:00 UTC the next day
-- ============================================================

INSERT INTO survivor_episodes (season, week_number, air_date, lock_time) VALUES
  (50,  1, '2025-03-05', '2025-03-06 01:00:00+00'),
  (50,  2, '2025-03-12', '2025-03-13 01:00:00+00'),
  (50,  3, '2025-03-19', '2025-03-20 01:00:00+00'),
  (50,  4, '2025-03-26', '2025-03-27 01:00:00+00'),
  (50,  5, '2025-04-02', '2025-04-03 01:00:00+00'),
  (50,  6, '2025-04-09', '2025-04-10 01:00:00+00'),
  (50,  7, '2025-04-16', '2025-04-17 01:00:00+00'),
  (50,  8, '2025-04-23', '2025-04-24 01:00:00+00'),
  (50,  9, '2025-04-30', '2025-05-01 01:00:00+00'),
  (50, 10, '2025-05-07', '2025-05-08 01:00:00+00'),
  (50, 11, '2025-05-14', '2025-05-15 01:00:00+00'),
  (50, 12, '2025-05-21', '2025-05-22 01:00:00+00'),
  (50, 13, '2025-05-28', '2025-05-29 01:00:00+00'),
  (50, 14, '2025-06-04', '2025-06-05 01:00:00+00')
ON CONFLICT DO NOTHING;
