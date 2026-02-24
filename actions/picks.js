"use server";

import { createClient } from "@/lib/supabase/server";
import { isEpisodeLocked } from "@/lib/utils";
import { getActivePlayers, getEpisodeBudget, validateAllocations } from "@/lib/picks";
import { revalidatePath } from "next/cache";

/**
 * Submit (or update) a user's weekly picks for an episode in a league.
 *
 * @param {Object} params
 * @param {string} params.leagueId
 * @param {string} params.episodeId
 * @param {string|null} params.guessedEliminatedPlayerId
 * @param {Array<{playerId: string, points: number}>} params.allocations
 */
export async function submitPicks({ leagueId, episodeId, guessedEliminatedPlayerId, allocations }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify episode is not locked
  const { data: episode } = await supabase
    .from("survivor_episodes")
    .select("lock_time, is_complete, is_locked")
    .eq("id", episodeId)
    .single();

  if (!episode) return { error: "Episode not found" };
  if (episode.is_complete) return { error: "This episode has already been resolved" };
  if (episode.is_locked || isEpisodeLocked(episode.lock_time)) {
    return { error: "Picks are locked for this episode (deadline has passed)" };
  }

  // Verify user is in the league
  const { data: member } = await supabase
    .from("survivor_league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return { error: "You are not a member of this league" };

  // Get budget for this episode
  const budget = await getEpisodeBudget(user.id, leagueId, episodeId);

  // Validate allocations
  const activePlayers = await getActivePlayers();
  const filtered = (allocations ?? []).filter((a) => a.points > 0);
  const validation = validateAllocations(filtered, budget, activePlayers);
  if (!validation.valid) return { error: validation.error };

  const totalAllocated = validation.total ?? 0;

  // Upsert the pick row
  const { data: pick, error: pickError } = await supabase
    .from("survivor_picks")
    .upsert(
      {
        user_id: user.id,
        league_id: leagueId,
        episode_id: episodeId,
        guessed_eliminated_player_id: guessedEliminatedPlayerId || null,
        total_points_allocated: totalAllocated,
        bonus_points_available: budget,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,league_id,episode_id" }
    )
    .select()
    .single();

  if (pickError) return { error: pickError.message };

  // Delete existing allocations for this pick and re-insert
  await supabase.from("survivor_allocations").delete().eq("pick_id", pick.id);

  if (filtered.length > 0) {
    const insertRows = filtered.map(({ playerId, points }) => ({
      pick_id: pick.id,
      player_id: playerId,
      points,
    }));

    const { error: allocError } = await supabase
      .from("survivor_allocations")
      .insert(insertRows);

    if (allocError) return { error: allocError.message };
  }

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/picks`);
  return { success: true };
}
