-- ============================================================
-- Migration: Record Week 1 eliminations (double boot) + open Week 2
--
-- Both eliminated in Week 1:
--   Jenna Lewis-Dougherty: 1st out (placement = 1)
--   Kyle Fraser:           2nd out (placement = 2)
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ── 1. Mark Jenna Lewis-Dougherty as 1st eliminated (week 1) ──
UPDATE survivor_players
SET is_active = false,
    eliminated_week = 1,
    placement = 1
WHERE name = 'Jenna Lewis-Dougherty'
  AND season = 50;

-- ── 2. Mark Kyle Fraser as 2nd eliminated (week 1) ──
UPDATE survivor_players
SET is_active = false,
    eliminated_week = 1,
    placement = 2
WHERE name = 'Kyle Fraser'
  AND season = 50;

-- ── 3. Complete episode 1 and link first eliminated player ──
UPDATE survivor_episodes
SET is_complete = true,
    is_locked = true,
    eliminated_player_id = (
      SELECT id FROM survivor_players
      WHERE name = 'Jenna Lewis-Dougherty' AND season = 50
    )
WHERE season = 50
  AND week_number = 1;

-- ── 4. Ensure week 2 is open (unlocked) ──
UPDATE survivor_episodes
SET is_locked = false,
    is_complete = false
WHERE season = 50
  AND week_number = 2;

COMMIT;

-- ── Verify ──
SELECT name, placement, eliminated_week, is_active
FROM survivor_players
WHERE season = 50 AND placement IS NOT NULL
ORDER BY placement;

SELECT week_number, is_locked, is_complete,
       (SELECT name FROM survivor_players WHERE id = eliminated_player_id) AS eliminated
FROM survivor_episodes
WHERE season = 50
ORDER BY week_number
LIMIT 5;
