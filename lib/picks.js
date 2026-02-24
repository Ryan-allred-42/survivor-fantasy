import { createClient } from "@/lib/supabase/server";
import { isEpisodeLocked } from "@/lib/utils";

const BASE_POINTS = 10;

/**
 * Fetch the current open episode for picking.
 * Returns the earliest episode that is not complete and not locked.
 */
export async function getCurrentEpisode(season = 50) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("survivor_episodes")
    .select("*")
    .eq("season", season)
    .eq("is_complete", false)
    .order("week_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Fetch the user's existing pick for an episode/league combo.
 */
export async function getUserPick(userId, leagueId, episodeId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("survivor_picks")
    .select("*, survivor_allocations(*)")
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .eq("episode_id", episodeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Fetch all active players for the current season.
 */
export async function getActivePlayers(season = 50) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("survivor_players")
    .select("*")
    .eq("season", season)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get a user's point budget for a specific episode.
 * Checks for pre-created pick row (bonus/mulligan stored there),
 * otherwise returns BASE_POINTS.
 */
export async function getEpisodeBudget(userId, leagueId, episodeId) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("survivor_picks")
    .select("bonus_points_available")
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .eq("episode_id", episodeId)
    .maybeSingle();

  return data?.bonus_points_available ?? BASE_POINTS;
}

/**
 * Validate that allocations are valid:
 * - Total points do not exceed budget
 * - No negative points
 * - All player IDs are active
 */
export function validateAllocations(allocations, budget, activePlayers) {
  const activeIds = new Set(activePlayers.map((p) => p.id));
  let total = 0;

  for (const { playerId, points } of allocations) {
    if (!activeIds.has(playerId)) {
      return { valid: false, error: `Player ${playerId} is not active` };
    }
    if (points < 0) {
      return { valid: false, error: "Points cannot be negative" };
    }
    total += points;
  }

  if (total > budget) {
    return { valid: false, error: `Exceeds budget of ${budget} points` };
  }

  return { valid: true, total };
}
