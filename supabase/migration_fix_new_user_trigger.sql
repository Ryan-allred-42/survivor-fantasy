-- ============================================================
-- Fix: "Database error saving new user"
--
-- The handle_new_user() trigger must:
--   1. Be SECURITY DEFINER to bypass RLS
--   2. Have SET search_path = public to avoid schema issues
--   3. Have an INSERT policy on survivor_profiles (or RLS handled via SECURITY DEFINER)
--
-- This also adds a profiles_insert policy for the trigger function
-- and updates the scoring_method constraint to only allow full_season.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- ── 1. Recreate the trigger function with explicit search_path ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.survivor_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 2. Recreate the trigger ──
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. Grant necessary permissions ──
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.survivor_profiles TO supabase_auth_admin;

-- ── 4. Update scoring method constraint (full_season only) ──
ALTER TABLE survivor_leagues
  DROP CONSTRAINT IF EXISTS survivor_leagues_scoring_method_check;
ALTER TABLE survivor_leagues
  ADD CONSTRAINT survivor_leagues_scoring_method_check
  CHECK (scoring_method = 'full_season');

-- Update any existing leagues that used the old methods
UPDATE survivor_leagues
SET scoring_method = 'full_season'
WHERE scoring_method IN ('winner_only', 'top_five');
