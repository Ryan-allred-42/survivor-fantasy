"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { resolveEpisode, resolveSeasonEnd } from "@/lib/scoring";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("survivor_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Unauthorized" };
  return { user };
}

/**
 * Set the eliminated player for an episode and trigger scoring.
 */
export async function markEpisodeComplete({ episodeId, eliminatedPlayerId }) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  // Update player: set is_active=false and record elimination
  const { data: episode } = await supabase
    .from("survivor_episodes")
    .select("week_number")
    .eq("id", episodeId)
    .single();

  // Count active players to determine placement
  const { count: activeCount } = await supabase
    .from("survivor_players")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("season", 50);

  await supabase
    .from("survivor_players")
    .update({
      is_active: false,
      eliminated_week: episode?.week_number,
      placement: activeCount, // current active count = their placement rank
    })
    .eq("id", eliminatedPlayerId);

  // Get remaining active count for totalPlayers
  const { count: remainingAfter } = await supabase
    .from("survivor_players")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("season", 50);

  const totalPlayers = (remainingAfter ?? 0) + 1; // +1 for the one just eliminated

  // Run scoring engine
  const result = await resolveEpisode(episodeId, eliminatedPlayerId, totalPlayers);
  if (!result.success) return { error: "Scoring engine failed" };

  // Lock the episode
  await supabase
    .from("survivor_episodes")
    .update({ is_locked: true, eliminated_player_id: eliminatedPlayerId, is_complete: true })
    .eq("id", episodeId);

  revalidatePath("/admin/episodes");
  revalidatePath("/admin");
  return { success: true, processed: result.processed };
}

/**
 * Create a new episode (admin only).
 */
export async function createEpisode({ weekNumber, airDate, lockTime }) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("survivor_episodes")
    .insert({ season: 50, week_number: weekNumber, air_date: airDate, lock_time: lockTime })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/episodes");
  return { success: true, episode: data };
}

/**
 * Update player info (admin only).
 */
export async function updatePlayer(playerId, updates) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("survivor_players")
    .update(updates)
    .eq("id", playerId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/players");
  return { success: true, player: data };
}

/**
 * Add a new player to the cast (admin only).
 */
export async function addPlayer(playerData) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("survivor_players")
    .insert({ ...playerData, season: 50 })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/players");
  return { success: true, player: data };
}

/**
 * Trigger end-of-season scoring (winner_only and top_five leagues).
 */
export async function triggerSeasonEnd() {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const result = await resolveSeasonEnd(50);
  revalidatePath("/admin");
  return result;
}
