-- ============================================================
-- Survivor Season 50 Fantasy App — Database Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. survivor_players
-- ============================================================
CREATE TABLE IF NOT EXISTS survivor_players (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  age           int,
  hometown      text,
  occupation    text,
  photo_url     text,
  tribe         text,
  season        int NOT NULL DEFAULT 50,
  is_active     boolean NOT NULL DEFAULT true,
  eliminated_week int,
  placement     int, -- 1 = first out, N = winner (where N = total players)
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. survivor_episodes
-- ============================================================
CREATE TABLE IF NOT EXISTS survivor_episodes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season                int NOT NULL DEFAULT 50,
  week_number           int NOT NULL,
  air_date              date,
  lock_time             timestamptz NOT NULL, -- Wednesday 8pm EST for that week
  eliminated_player_id  uuid REFERENCES survivor_players(id) ON DELETE SET NULL,
  is_locked             boolean NOT NULL DEFAULT false,
  is_complete           boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season, week_number)
);

-- ============================================================
-- 3. survivor_leagues
-- ============================================================
CREATE TABLE IF NOT EXISTS survivor_leagues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scoring_method  text NOT NULL DEFAULT 'full_season' CHECK (scoring_method = 'full_season'),
  join_code       char(5) NOT NULL UNIQUE,
  season          int NOT NULL DEFAULT 50,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. survivor_league_members
-- ============================================================
CREATE TABLE IF NOT EXISTS survivor_league_members (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id           uuid NOT NULL REFERENCES survivor_leagues(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at           timestamptz NOT NULL DEFAULT now(),
  mulligan_used       boolean NOT NULL DEFAULT false,
  mulligan_episode_id uuid REFERENCES survivor_episodes(id) ON DELETE SET NULL,
  UNIQUE(league_id, user_id)
);

-- ============================================================
-- 5. survivor_picks
-- ============================================================
CREATE TABLE IF NOT EXISTS survivor_picks (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id                     uuid NOT NULL REFERENCES survivor_leagues(id) ON DELETE CASCADE,
  episode_id                    uuid NOT NULL REFERENCES survivor_episodes(id) ON DELETE CASCADE,
  guessed_eliminated_player_id  uuid REFERENCES survivor_players(id) ON DELETE SET NULL,
  guess_correct                 boolean, -- null until episode resolved
  total_points_allocated        int NOT NULL DEFAULT 0,
  bonus_points_available        int NOT NULL DEFAULT 10, -- total budget for this week
  submitted_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, league_id, episode_id)
);

-- ============================================================
-- 6. survivor_allocations
-- ============================================================
CREATE TABLE IF NOT EXISTS survivor_allocations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_id     uuid NOT NULL REFERENCES survivor_picks(id) ON DELETE CASCADE,
  player_id   uuid NOT NULL REFERENCES survivor_players(id) ON DELETE CASCADE,
  points      int NOT NULL CHECK (points > 0),
  UNIQUE(pick_id, player_id)
);

-- ============================================================
-- 7. survivor_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS survivor_scores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id        uuid NOT NULL REFERENCES survivor_leagues(id) ON DELETE CASCADE,
  episode_id       uuid NOT NULL REFERENCES survivor_episodes(id) ON DELETE CASCADE,
  weekly_score     numeric NOT NULL DEFAULT 0,
  cumulative_score numeric NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, league_id, episode_id)
);

-- ============================================================
-- 8. survivor_profiles (display names, admin flag)
-- ============================================================
CREATE TABLE IF NOT EXISTS survivor_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  is_admin     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.survivor_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE survivor_players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_episodes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_leagues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_league_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_picks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_allocations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_scores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_profiles         ENABLE ROW LEVEL SECURITY;

-- survivor_players: public read, admin write
CREATE POLICY "players_public_read" ON survivor_players
  FOR SELECT USING (true);

CREATE POLICY "players_admin_write" ON survivor_players
  FOR ALL USING (
    EXISTS (SELECT 1 FROM survivor_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- survivor_episodes: public read, admin write
CREATE POLICY "episodes_public_read" ON survivor_episodes
  FOR SELECT USING (true);

CREATE POLICY "episodes_admin_write" ON survivor_episodes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM survivor_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- survivor_leagues: any auth user can read; owner can update/delete; any auth user can insert
CREATE POLICY "leagues_read_auth" ON survivor_leagues
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "leagues_insert_auth" ON survivor_leagues
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "leagues_owner_update" ON survivor_leagues
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "leagues_owner_delete" ON survivor_leagues
  FOR DELETE USING (auth.uid() = owner_id);

-- survivor_league_members: users can read their own membership rows.
-- Leaderboard/all-member fetches use the service role key server-side to avoid
-- recursive RLS (self-referential EXISTS subqueries cause infinite recursion in Postgres).
CREATE POLICY "members_read_own" ON survivor_league_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "members_insert_self" ON survivor_league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members_update_self" ON survivor_league_members
  FOR UPDATE USING (auth.uid() = user_id);

-- survivor_picks: user can manage their own picks; league members can read all picks in their league
CREATE POLICY "picks_read_league_member" ON survivor_picks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM survivor_league_members
      WHERE league_id = survivor_picks.league_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "picks_insert_self" ON survivor_picks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "picks_update_self" ON survivor_picks
  FOR UPDATE USING (auth.uid() = user_id);

-- survivor_allocations: accessible if user can see the parent pick
CREATE POLICY "allocations_read" ON survivor_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM survivor_picks p
      JOIN survivor_league_members lm ON lm.league_id = p.league_id
      WHERE p.id = survivor_allocations.pick_id
        AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "allocations_insert_self" ON survivor_allocations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM survivor_picks
      WHERE id = survivor_allocations.pick_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "allocations_update_self" ON survivor_allocations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM survivor_picks
      WHERE id = survivor_allocations.pick_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "allocations_delete_self" ON survivor_allocations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM survivor_picks
      WHERE id = survivor_allocations.pick_id
        AND user_id = auth.uid()
    )
  );

-- survivor_scores: league members can read; admin/server can write
CREATE POLICY "scores_read_league_member" ON survivor_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM survivor_league_members
      WHERE league_id = survivor_scores.league_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "scores_admin_write" ON survivor_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM survivor_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- survivor_profiles: users read their own; public read display_name
CREATE POLICY "profiles_read_own" ON survivor_profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON survivor_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_league_members_league ON survivor_league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user   ON survivor_league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_picks_episode          ON survivor_picks(episode_id);
CREATE INDEX IF NOT EXISTS idx_picks_league_user      ON survivor_picks(league_id, user_id);
CREATE INDEX IF NOT EXISTS idx_allocations_pick       ON survivor_allocations(pick_id);
CREATE INDEX IF NOT EXISTS idx_scores_league          ON survivor_scores(league_id);
CREATE INDEX IF NOT EXISTS idx_episodes_week          ON survivor_episodes(season, week_number);
