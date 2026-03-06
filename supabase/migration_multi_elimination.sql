-- ============================================================
-- Migration: Support multiple eliminations per episode
--
-- Adds eliminated_player_ids (uuid array) to survivor_episodes.
-- Backfills from existing eliminated_player_id column.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

BEGIN;

-- Add array column for multiple eliminations
ALTER TABLE survivor_episodes
ADD COLUMN IF NOT EXISTS eliminated_player_ids uuid[] NOT NULL DEFAULT '{}';

-- Backfill: copy existing single eliminated_player_id into the array
UPDATE survivor_episodes
SET eliminated_player_ids = ARRAY[eliminated_player_id]
WHERE eliminated_player_id IS NOT NULL
  AND eliminated_player_ids = '{}';

COMMIT;

-- Verify
SELECT week_number, eliminated_player_id, eliminated_player_ids, is_complete
FROM survivor_episodes
WHERE season = 50
ORDER BY week_number;
