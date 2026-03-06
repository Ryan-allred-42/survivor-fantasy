"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { FULL_SEASON_MULTIPLIERS } from "@/lib/utils";

const BASE_POINTS = 10;
const GUESS_BONUS = 5;
const MULLIGAN_BONUS = 10;

/**
 * Called after admin marks an episode complete (eliminated player set).
 * 1. Mark guess_correct on all picks for this episode.
 * 2. Award guess bonus points into the NEXT episode's picks.
 * 3. Compute scores based on each league's scoring method.
 * 4. Handle mulligan logic.
 *
 * @param {string} episodeId
 * @param {string} eliminatedPlayerId
 * @param {number} totalPlayers  - total cast size (used for full_season multiplier)
 */
export async function resolveEpisode(episodeId, eliminatedPlayerId, totalPlayers = 24) {
  const supabase = await createAdminClient();

  // --- 1. Fetch episode details ---
  const { data: episode } = await supabase
    .from("survivor_episodes")
    .select("*, season, week_number")
    .eq("id", episodeId)
    .single();

  if (!episode) throw new Error("Episode not found");

  // --- 2. Fetch all picks for this episode ---
  const { data: picks } = await supabase
    .from("survivor_picks")
    .select("*, survivor_allocations(*)")
    .eq("episode_id", episodeId);

  if (!picks || picks.length === 0) return { success: true, processed: 0 };

  // Fetch the next episode (for bonus point carryover)
  const { data: nextEpisode } = await supabase
    .from("survivor_episodes")
    .select("id")
    .eq("season", episode.season)
    .eq("week_number", episode.week_number + 1)
    .single();

  // --- 3. Process each pick ---
  for (const pick of picks) {
    const isCorrectGuess =
      pick.guessed_eliminated_player_id === eliminatedPlayerId;

    // Update guess_correct
    await supabase
      .from("survivor_picks")
      .update({ guess_correct: isCorrectGuess })
      .eq("id", pick.id);

    // --- 4. Handle mulligan ---
    const { data: member } = await supabase
      .from("survivor_league_members")
      .select("mulligan_used, mulligan_episode_id")
      .eq("user_id", pick.user_id)
      .eq("league_id", pick.league_id)
      .single();

    const forgotToPlay = pick.total_points_allocated === 0;
    let mulliganBonus = 0;

    // Week 1 is free — no one had a chance to pick, so don't count it as a miss
    if (forgotToPlay && member && !member.mulligan_used && episode.week_number !== 1) {
      await supabase
        .from("survivor_league_members")
        .update({ mulligan_used: true, mulligan_episode_id: episodeId })
        .eq("user_id", pick.user_id)
        .eq("league_id", pick.league_id);
      mulliganBonus = MULLIGAN_BONUS;
    }

    // --- 5. Create/update next episode pick row with carried bonus points ---
    if (nextEpisode) {
      const extraPoints =
        (isCorrectGuess ? GUESS_BONUS : 0) + mulliganBonus;

      if (extraPoints > 0) {
        const nextBudget = BASE_POINTS + extraPoints;

        // Upsert next episode's pick to set bonus_points_available
        await supabase.from("survivor_picks").upsert(
          {
            user_id: pick.user_id,
            league_id: pick.league_id,
            episode_id: nextEpisode.id,
            bonus_points_available: nextBudget,
            total_points_allocated: 0,
          },
          {
            onConflict: "user_id,league_id,episode_id",
            ignoreDuplicates: false,
          }
        );
      }
    }
  }

  // --- 6. Fetch all leagues represented in these picks ---
  const leagueIds = [...new Set(picks.map((p) => p.league_id))];

  const { data: leagues } = await supabase
    .from("survivor_leagues")
    .select("id")
    .in("id", leagueIds);

  // Fetch eliminated player placement
  const { data: eliminatedPlayer } = await supabase
    .from("survivor_players")
    .select("placement")
    .eq("id", eliminatedPlayerId)
    .single();

  const placement = eliminatedPlayer?.placement ?? 1;

  // --- 7. Compute scores per league (full_season only) ---
  for (const league of leagues) {
    const leaguePicks = picks.filter((p) => p.league_id === league.id);

    for (const pick of leaguePicks) {
      const allocations = pick.survivor_allocations ?? [];

      const toEliminated = allocations
        .filter((a) => a.player_id === eliminatedPlayerId)
        .reduce((sum, a) => sum + a.points, 0);

      const multiplier = FULL_SEASON_MULTIPLIERS[placement] ?? placement;
      const weeklyScore = toEliminated * multiplier;

      // Fetch previous cumulative score
      const { data: prevScore } = await supabase
        .from("survivor_scores")
        .select("cumulative_score")
        .eq("user_id", pick.user_id)
        .eq("league_id", league.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevCumulative = prevScore?.cumulative_score ?? 0;

      await supabase.from("survivor_scores").upsert(
        {
          user_id: pick.user_id,
          league_id: league.id,
          episode_id: episodeId,
          weekly_score: weeklyScore,
          cumulative_score: prevCumulative + weeklyScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,league_id,episode_id" }
      );
    }
  }

  // Mark episode complete
  await supabase
    .from("survivor_episodes")
    .update({ is_complete: true })
    .eq("id", episodeId);

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
