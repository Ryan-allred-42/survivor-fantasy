-- ============================================================
-- Migration: Fix recursive RLS policy on survivor_league_members
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Drop the old recursive SELECT policy
DROP POLICY IF EXISTS "members_read_league" ON survivor_league_members;

-- Replace with a simple non-recursive policy:
-- Users can only directly read their own membership rows.
-- All-member reads for leaderboards use the service role key (server-side).
CREATE POLICY "members_read_own" ON survivor_league_members
  FOR SELECT USING (auth.uid() = user_id);
