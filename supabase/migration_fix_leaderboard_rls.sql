-- ============================================================
-- Migration: Fix leaderboard — allow members to see all other
--            members in the same league, and let everyone see
--            display names in survivor_profiles.
--
-- Problem: The "members_read_own" policy (auth.uid() = user_id)
--          only lets you see your own row, so the leaderboard
--          can't show other players' names/scores.
--          A naive "see all members in your leagues" policy
--          causes infinite recursion because the policy would
--          query survivor_league_members while evaluating
--          a query on survivor_league_members.
--
-- Solution: Use a SECURITY DEFINER function that bypasses RLS
--           when fetching the current user's league IDs.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Helper function — returns the league IDs the current user belongs to
--    SECURITY DEFINER means it runs as the function owner (bypassing RLS),
--    which avoids the infinite recursion.
CREATE OR REPLACE FUNCTION get_my_league_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT league_id
  FROM survivor_league_members
  WHERE user_id = auth.uid();
$$;

-- 2. Drop the old overly-restrictive policy
DROP POLICY IF EXISTS "members_read_own" ON survivor_league_members;

-- 3. New policy: you can read any member row that belongs to a league you're in
CREATE POLICY "members_read_same_league" ON survivor_league_members
  FOR SELECT
  USING (league_id IN (SELECT get_my_league_ids()));

-- 4. Allow any authenticated user to read display names from survivor_profiles.
--    Names are not sensitive — they need to be visible to fellow league members.
DROP POLICY IF EXISTS "profiles_read_all_authenticated" ON survivor_profiles;
CREATE POLICY "profiles_read_all_authenticated" ON survivor_profiles
  FOR SELECT
  TO authenticated
  USING (true);
