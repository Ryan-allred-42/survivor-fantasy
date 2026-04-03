"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { FULL_SEASON_MULTIPLIERS } from "@/lib/utils";
import { computeEpisodeScore } from "@/lib/scoring-utils";

const BASE_POINTS = 10;
const GUESS_BONUS = 5;
const MULLIGAN_BONUS = 10;

/**
 * Called after admin marks an episode complete.
 * Called once per eliminated player. For multi-elimination episodes,
 * this is called multiple times with the same episodeId.
 *
 * Scoring model: points allocated to SURVIVING players (all active players
 * not eliminated this episode) × the eliminated player's boot-order multiplier.
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

  // New cumulative scoring model:
  // Score = Sum of all points allocated to a player across all episodes × Player's Multiplier
  // If player is eliminated: their multiplier is their placement multiplier.
  // If player is active: their multiplier is FULL_SEASON_MULTIPLIERS[eliminated_count + 1].
  
  // To compute this correctly for the *current* episode state, we need to know who was
  // eliminated at or before this episode.
  const { data: players } = await supabase
    .from("survivor_players")
    .select("id, placement, eliminated_week");

  const elimCount = players.filter(p => p.eliminated_week != null && p.eliminated_week <= episode.week_number).length;
  const activeMult = FULL_SEASON_MULTIPLIERS[elimCount + 1] ?? FULL_SEASON_MULTIPLIERS[FULL_SEASON_MULTIPLIERS.length - 1];

  const leagueIds = [...new Set(picks.map((p) => p.league_id))];
  const { data: leagues } = await supabase.from("survivor_leagues").select("id").in("id", leagueIds);

  for (const league of leagues) {
    const leaguePicks = picks.filter((p) => p.league_id === league.id);
    const userIds = [...new Set(leaguePicks.map(p => p.user_id))];

    // Fetch ALL past picks and allocations for this league to compute cumulative score
    const { data: allLeaguePicks } = await supabase
      .from("survivor_picks")
      .select("*, survivor_episodes!inner(week_number), survivor_allocations(*)")
      .eq("league_id", league.id)
      .lte("survivor_episodes.week_number", episode.week_number);

    for (const userId of userIds) {
      let cumulativeScore = 0;
      
      for (const player of players) {
        const isEliminated = player.eliminated_week != null && player.eliminated_week <= episode.week_number;
        const mult = isEliminated ? (FULL_SEASON_MULTIPLIERS[player.placement] ?? 0) : activeMult;
        
        let allocated = 0;
        const userPicks = (allLeaguePicks ?? []).filter(p => p.user_id === userId);
        for (const pick of userPicks) {
          const pickAllocs = pick.survivor_allocations ?? [];
          for (const a of pickAllocs) {
            if (a.player_id === player.id) allocated += a.points;
          }
        }
        
        cumulativeScore += allocated * mult;
      }

      // Fetch the most recent cumulative score from a *previous* episode to compute weekly
      const { data: prevEpScore } = await supabase
        .from("survivor_scores")
        .select("cumulative_score")
        .eq("user_id", userId)
        .eq("league_id", league.id)
        .neq("episode_id", episodeId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevCumulative = prevEpScore?.cumulative_score ?? 0;
      const weeklyScore = cumulativeScore - prevCumulative;

      await supabase.from("survivor_scores").upsert(
        {
          user_id: userId,
          league_id: league.id,
          episode_id: episodeId,
          weekly_score: weeklyScore,
          cumulative_score: cumulativeScore,
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
