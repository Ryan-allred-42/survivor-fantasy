"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { FULL_SEASON_MULTIPLIERS } from "@/lib/utils";

const BASE_POINTS = 10;
const GUESS_BONUS = 5;
const MULLIGAN_BONUS = 10;

/**
 * Called after admin marks an episode complete.
 * Called once per eliminated player. For multi-elimination episodes,
 * this is called multiple times with the same episodeId.
 *
 * @param {string} episodeId
 * @param {string} eliminatedPlayerId - the player being scored this call
 * @param {string[]} allEliminatedIds - all eliminated player IDs for this episode
 */
export async function resolveEpisode(episodeId, eliminatedPlayerId, allEliminatedIds = []) {
  const supabase = await createAdminClient();

  // Normalize: ensure allEliminatedIds is always an array of strings
  const elimIds = Array.isArray(allEliminatedIds) && allEliminatedIds.length > 0
    ? allEliminatedIds
    : [eliminatedPlayerId];

  const { data: episode } = await supabase
    .from("survivor_episodes")
    .select("*, season, week_number")
    .eq("id", episodeId)
    .single();

  if (!episode) throw new Error("Episode not found");

  const { data: picks } = await supabase
    .from("survivor_picks")
    .select("*, survivor_allocations(*)")
    .eq("episode_id", episodeId);

  if (!picks || picks.length === 0) return { success: true, processed: 0 };

  const { data: nextEpisode } = await supabase
    .from("survivor_episodes")
    .select("id")
    .eq("season", episode.season)
    .eq("week_number", episode.week_number + 1)
    .maybeSingle();

  const isLastElimination = eliminatedPlayerId === elimIds[elimIds.length - 1];

  for (const pick of picks) {
    const guessedId = pick.guessed_eliminated_player_id;
    const isCorrectGuess = elimIds.includes(guessedId);

    // Only update guess_correct on the last elimination pass to avoid overwriting
    if (isLastElimination) {
      await supabase
        .from("survivor_picks")
        .update({ guess_correct: isCorrectGuess })
        .eq("id", pick.id);
    }

    // Handle mulligan and bonus only on the last elimination pass
    if (isLastElimination) {
      const { data: member } = await supabase
        .from("survivor_league_members")
        .select("mulligan_used, mulligan_episode_id")
        .eq("user_id", pick.user_id)
        .eq("league_id", pick.league_id)
        .single();

      const forgotToPlay = pick.total_points_allocated === 0;
      let mulliganBonus = 0;

      if (forgotToPlay && member && !member.mulligan_used && episode.week_number !== 1) {
        await supabase
          .from("survivor_league_members")
          .update({ mulligan_used: true, mulligan_episode_id: episodeId })
          .eq("user_id", pick.user_id)
          .eq("league_id", pick.league_id);
        mulliganBonus = MULLIGAN_BONUS;
      }

      if (nextEpisode) {
        const extraPoints = (isCorrectGuess ? GUESS_BONUS : 0) + mulliganBonus;
        if (extraPoints > 0) {
          const newBudget = BASE_POINTS + extraPoints;

          // Check if a pick row already exists for next episode
          const { data: existingNextPick } = await supabase
            .from("survivor_picks")
            .select("id, bonus_points_available")
            .eq("user_id", pick.user_id)
            .eq("league_id", pick.league_id)
            .eq("episode_id", nextEpisode.id)
            .maybeSingle();

          if (existingNextPick) {
            // Update only the budget — don't touch allocations the user already submitted
            await supabase
              .from("survivor_picks")
              .update({ bonus_points_available: newBudget })
              .eq("id", existingNextPick.id);
          } else {
            await supabase.from("survivor_picks").insert({
              user_id: pick.user_id,
              league_id: pick.league_id,
              episode_id: nextEpisode.id,
              bonus_points_available: newBudget,
              total_points_allocated: 0,
            });
          }
        }
      }
    }
  }

  // Fetch eliminated player placement
  const { data: eliminatedPlayer } = await supabase
    .from("survivor_players")
    .select("placement")
    .eq("id", eliminatedPlayerId)
    .single();

  const placement = eliminatedPlayer?.placement ?? 1;
  const multiplier = FULL_SEASON_MULTIPLIERS[placement] ?? placement;

  // Compute scores per league
  const leagueIds = [...new Set(picks.map((p) => p.league_id))];
  const { data: leagues } = await supabase
    .from("survivor_leagues")
    .select("id")
    .in("id", leagueIds);

  for (const league of leagues) {
    const leaguePicks = picks.filter((p) => p.league_id === league.id);

    for (const pick of leaguePicks) {
      const allocations = pick.survivor_allocations ?? [];
      const toEliminated = allocations
        .filter((a) => a.player_id === eliminatedPlayerId)
        .reduce((sum, a) => sum + a.points, 0);

      const addedScore = toEliminated * multiplier;

      // Fetch the existing score row for this episode (may already have points
      // from a previous elimination in the same episode)
      const { data: existingScore } = await supabase
        .from("survivor_scores")
        .select("weekly_score, cumulative_score")
        .eq("user_id", pick.user_id)
        .eq("league_id", league.id)
        .eq("episode_id", episodeId)
        .maybeSingle();

      const prevWeekly = existingScore?.weekly_score ?? 0;

      // Fetch the most recent cumulative score from a *previous* episode
      const { data: prevEpScore } = await supabase
        .from("survivor_scores")
        .select("cumulative_score, episode_id")
        .eq("user_id", pick.user_id)
        .eq("league_id", league.id)
        .neq("episode_id", episodeId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevCumulative = prevEpScore?.cumulative_score ?? 0;
      const newWeekly = prevWeekly + addedScore;

      await supabase.from("survivor_scores").upsert(
        {
          user_id: pick.user_id,
          league_id: league.id,
          episode_id: episodeId,
          weekly_score: newWeekly,
          cumulative_score: prevCumulative + newWeekly,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,league_id,episode_id" }
      );
    }
  }

  if (isLastElimination) {
    await supabase
      .from("survivor_episodes")
      .update({ is_complete: true })
      .eq("id", episodeId);
  }

  return { success: true, processed: picks.length };
}

/**
 * Calculate the point budget a user has for a given episode in a given league.
 * Base 10 + any bonus stored in the picks row for that episode.
 */
export async function getEpisodeBudget(userId, leagueId, episodeId) {
  const supabase = await createAdminClient();

  const { data: pick } = await supabase
    .from("survivor_picks")
    .select("bonus_points_available")
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .eq("episode_id", episodeId)
    .maybeSingle();

  // If no row yet, default to BASE_POINTS
  return pick?.bonus_points_available ?? BASE_POINTS;
}
