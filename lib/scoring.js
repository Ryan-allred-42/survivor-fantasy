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

    if (forgotToPlay && member && !member.mulligan_used) {
      // First miss — use mulligan
      await supabase
        .from("survivor_league_members")
        .update({ mulligan_used: true, mulligan_episode_id: episodeId })
        .eq("user_id", pick.user_id)
        .eq("league_id", pick.league_id);
      mulliganBonus = MULLIGAN_BONUS;
    }
    // Second miss: mulligan_used is already true, no additional bonus

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
    .select("id, scoring_method")
    .in("id", leagueIds);

  // Fetch eliminated player placement
  const { data: eliminatedPlayer } = await supabase
    .from("survivor_players")
    .select("placement")
    .eq("id", eliminatedPlayerId)
    .single();

  const placement = eliminatedPlayer?.placement ?? 1;

  // --- 7. Compute scores per league ---
  for (const league of leagues) {
    const leaguePicks = picks.filter((p) => p.league_id === league.id);

    for (const pick of leaguePicks) {
      const allocations = pick.survivor_allocations ?? [];
      let weeklyScore = 0;

      if (league.scoring_method === "full_season") {
        // Score immediately: sum allocations to eliminated player × boot-order multiplier
        const toEliminated = allocations
          .filter((a) => a.player_id === eliminatedPlayerId)
          .reduce((sum, a) => sum + a.points, 0);

        // placement = boot order (1 = first out, 23 = runner-up, 24 = winner)
        const multiplier = FULL_SEASON_MULTIPLIERS[placement] ?? placement;
        weeklyScore = toEliminated * multiplier;
      }
      // winner_only and top_five: scored at season end via resolveSeasonEnd()

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
 * Compute final scores for winner_only and top_five leagues.
 * Call this when the season ends (winner is crowned).
 *
 * @param {number} season
 */
export async function resolveSeasonEnd(season = 50, totalCastSize = 24) {
  const supabase = await createAdminClient();

  // Get all players with placement set
  const { data: players } = await supabase
    .from("survivor_players")
    .select("id, placement")
    .eq("season", season)
    .not("placement", "is", null);

  if (!players) return;

  const totalPlayers = players.length;
  const winner = players.find((p) => p.placement === totalPlayers);
  const topFive = players
    .sort((a, b) => b.placement - a.placement)
    .slice(0, 5)
    .map((p) => p.id);

  // Get all leagues for this season
  const { data: leagues } = await supabase
    .from("survivor_leagues")
    .select("id, scoring_method")
    .eq("season", season)
    .in("scoring_method", ["winner_only", "top_five"]);

  if (!leagues) return;

  for (const league of leagues) {
    // Get all picks in this league (across all episodes)
    const { data: allPicks } = await supabase
      .from("survivor_picks")
      .select("user_id, episode_id, survivor_allocations(*)")
      .eq("league_id", league.id);

    if (!allPicks) continue;

    // Aggregate allocations per user
    const userTotals = {};
    for (const pick of allPicks) {
      const uid = pick.user_id;
      if (!userTotals[uid]) userTotals[uid] = 0;

      for (const alloc of pick.survivor_allocations ?? []) {
        const isScoring =
          league.scoring_method === "winner_only"
            ? alloc.player_id === winner?.id
            : topFive.includes(alloc.player_id);

        if (isScoring) userTotals[uid] += alloc.points;
      }
    }

    // Upsert a "season final" score row using a special episode placeholder
    // (last episode of the season)
    const { data: lastEpisode } = await supabase
      .from("survivor_episodes")
      .select("id")
      .eq("season", season)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    for (const [userId, score] of Object.entries(userTotals)) {
      await supabase.from("survivor_scores").upsert(
        {
          user_id: userId,
          league_id: league.id,
          episode_id: lastEpisode.id,
          weekly_score: score,
          cumulative_score: score,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,league_id,episode_id" }
      );
    }
  }

  return { success: true };
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
