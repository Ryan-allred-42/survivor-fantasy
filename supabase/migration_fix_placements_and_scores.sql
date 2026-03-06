-- ============================================================
-- Migration: Fix inverted placements and recompute all scores
--
-- The old markEpisodeComplete code set placement = activeCount,
-- which gave the first person out placement=24 (100× multiplier)
-- instead of placement=1 (1× multiplier).
--
-- This migration:
--   1. Fixes any player placements set by the admin UI
--      (manual SQL migrations already used correct values)
--   2. Wipes and recomputes all survivor_scores using correct multipliers
--
-- Run this in the Supabase SQL Editor AFTER deploying the code fix.
-- ============================================================

BEGIN;

-- ── 1. Fix inverted placements ──
-- Players eliminated via the admin UI got placement = activeCount (inverted).
-- Correct formula: placement = totalPlayers + 1 - oldPlacement
-- (where oldPlacement was the incorrectly stored activeCount).
--
-- We only fix players whose placement > total_eliminated_before_them.
-- The SQL migration already correctly set Jenna=1, Kyle=2.
-- Any player resolved via admin UI after that would have placement >= 22
-- (since activeCount was 22 when the 3rd person was eliminated).
--
-- Safe approach: re-derive placement from eliminated_week ordering.
-- Players eliminated earlier should have lower placement numbers.

-- First, let's see what we're working with (for verification before committing)
-- Uncomment the SELECT below to preview before running the UPDATE:
-- SELECT name, placement, eliminated_week, is_active
-- FROM survivor_players WHERE season = 50 AND placement IS NOT NULL
-- ORDER BY eliminated_week, placement;

-- Re-derive placements based on elimination order
-- ROW_NUMBER by eliminated_week gives us the correct 1-based placement
WITH correct_placements AS (
  SELECT
    id,
    name,
    placement AS old_placement,
    ROW_NUMBER() OVER (ORDER BY eliminated_week ASC, placement ASC) AS new_placement
  FROM survivor_players
  WHERE season = 50
    AND placement IS NOT NULL
    AND is_active = false
)
UPDATE survivor_players sp
SET placement = cp.new_placement
FROM correct_placements cp
WHERE sp.id = cp.id
  AND sp.placement != cp.new_placement;

-- ── 2. Recompute all scores ──
-- Delete existing scores so we can rebuild from scratch
DELETE FROM survivor_scores;

-- Recompute scores for each completed episode
-- multiplier_table maps placement to multiplier (matching FULL_SEASON_MULTIPLIERS in utils.js)
WITH multiplier_table(placement, multiplier) AS (
  VALUES
    (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6),
    (7, 8), (8, 10), (9, 12), (10, 14), (11, 17), (12, 20),
    (13, 23), (14, 26), (15, 29), (16, 32), (17, 34), (18, 36),
    (19, 38), (20, 42), (21, 46), (22, 50), (23, 75), (24, 100)
),
-- For each completed episode, find the eliminated player and their placement
episode_elims AS (
  SELECT
    e.id AS episode_id,
    e.week_number,
    e.eliminated_player_id,
    p.placement
  FROM survivor_episodes e
  JOIN survivor_players p ON p.id = e.eliminated_player_id
  WHERE e.season = 50
    AND e.is_complete = true
    AND e.eliminated_player_id IS NOT NULL
),
-- For each pick in a completed episode, compute the weekly score
weekly_scores AS (
  SELECT
    pk.user_id,
    pk.league_id,
    pk.episode_id,
    ee.week_number,
    COALESCE(SUM(
      CASE WHEN a.player_id = ee.eliminated_player_id
           THEN a.points * COALESCE(mt.multiplier, ee.placement)
           ELSE 0
      END
    ), 0) AS weekly_score
  FROM survivor_picks pk
  JOIN episode_elims ee ON ee.episode_id = pk.episode_id
  LEFT JOIN survivor_allocations a ON a.pick_id = pk.id
  LEFT JOIN multiplier_table mt ON mt.placement = ee.placement
  GROUP BY pk.user_id, pk.league_id, pk.episode_id, ee.week_number
),
-- Compute cumulative scores ordered by week
cumulative AS (
  SELECT
    user_id,
    league_id,
    episode_id,
    week_number,
    weekly_score,
    SUM(weekly_score) OVER (
      PARTITION BY user_id, league_id
      ORDER BY week_number
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_score
  FROM weekly_scores
)
INSERT INTO survivor_scores (user_id, league_id, episode_id, weekly_score, cumulative_score, updated_at)
SELECT
  user_id,
  league_id,
  episode_id,
  weekly_score,
  cumulative_score,
  now()
FROM cumulative;

COMMIT;

-- ── Verify ──
SELECT name, placement, eliminated_week, is_active
FROM survivor_players
WHERE season = 50 AND placement IS NOT NULL
ORDER BY placement;

SELECT
  ss.user_id,
  sp.display_name,
  ss.league_id,
  se.week_number,
  ss.weekly_score,
  ss.cumulative_score
FROM survivor_scores ss
JOIN survivor_profiles sp ON sp.id = ss.user_id
JOIN survivor_episodes se ON se.id = ss.episode_id
ORDER BY ss.league_id, sp.display_name, se.week_number;
