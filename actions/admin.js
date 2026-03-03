"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { resolveEpisode } from "@/lib/scoring";
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

// ── League Management ────────────────────────────────────────

export async function getAdminLeagues() {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data: leagues, error } = await supabase
    .from("survivor_leagues")
    .select("*")
    .eq("season", 50)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const ownerIds = [...new Set((leagues ?? []).map((l) => l.owner_id))];
  const { data: ownerProfiles } = ownerIds.length
    ? await supabase.from("survivor_profiles").select("id, display_name").in("id", ownerIds)
    : { data: [] };

  const ownerMap = {};
  for (const p of ownerProfiles ?? []) {
    ownerMap[p.id] = p.display_name ?? "Unknown";
  }

  const { data: memberCounts } = await supabase
    .from("survivor_league_members")
    .select("league_id");

  const countMap = {};
  for (const m of memberCounts ?? []) {
    countMap[m.league_id] = (countMap[m.league_id] ?? 0) + 1;
  }

  const enriched = (leagues ?? []).map((l) => ({
    ...l,
    owner_name: ownerMap[l.owner_id] ?? "Unknown",
    member_count: countMap[l.id] ?? 0,
  }));

  return { success: true, leagues: enriched };
}

export async function getLeagueMembers(leagueId) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data: members, error } = await supabase
    .from("survivor_league_members")
    .select("id, user_id, joined_at, mulligan_used")
    .eq("league_id", leagueId)
    .order("joined_at", { ascending: true });

  if (error) return { error: error.message };

  const userIds = (members ?? []).map((m) => m.user_id);

  const { data: profiles } = userIds.length
    ? await supabase.from("survivor_profiles").select("id, display_name").in("id", userIds)
    : { data: [] };

  const profileMap = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = p.display_name ?? "Anonymous";
  }

  const { data: scores } = userIds.length
    ? await supabase
        .from("survivor_scores")
        .select("user_id, cumulative_score, survivor_episodes(week_number)")
        .eq("league_id", leagueId)
    : { data: [] };

  const latestScoreMap = {};
  for (const s of scores ?? []) {
    const wn = s.survivor_episodes?.week_number ?? 0;
    if (!latestScoreMap[s.user_id] || wn > latestScoreMap[s.user_id].week) {
      latestScoreMap[s.user_id] = { score: s.cumulative_score, week: wn };
    }
  }

  const { data: league } = await supabase
    .from("survivor_leagues")
    .select("owner_id")
    .eq("id", leagueId)
    .single();

  const enriched = (members ?? []).map((m) => ({
    ...m,
    display_name: profileMap[m.user_id] ?? "Anonymous",
    cumulative_score: latestScoreMap[m.user_id]?.score ?? 0,
    is_owner: league?.owner_id === m.user_id,
  }));

  return { success: true, members: enriched };
}

export async function updateLeague(leagueId, updates) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const allowed = {};
  if (updates.name !== undefined) allowed.name = updates.name;

  const { data, error } = await supabase
    .from("survivor_leagues")
    .update(allowed)
    .eq("id", leagueId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/leagues");
  return { success: true, league: data };
}

export async function deleteLeague(leagueId) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data: picks } = await supabase
    .from("survivor_picks")
    .select("id")
    .eq("league_id", leagueId);

  const pickIds = (picks ?? []).map((p) => p.id);
  if (pickIds.length > 0) {
    await supabase.from("survivor_allocations").delete().in("pick_id", pickIds);
  }

  await supabase.from("survivor_scores").delete().eq("league_id", leagueId);
  await supabase.from("survivor_picks").delete().eq("league_id", leagueId);
  await supabase.from("survivor_league_members").delete().eq("league_id", leagueId);

  const { error } = await supabase
    .from("survivor_leagues")
    .delete()
    .eq("id", leagueId);

  if (error) return { error: error.message };

  revalidatePath("/admin/leagues");
  revalidatePath("/admin");
  return { success: true };
}

export async function removeLeagueMember(leagueId, userId) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data: league } = await supabase
    .from("survivor_leagues")
    .select("owner_id")
    .eq("id", leagueId)
    .single();

  if (league?.owner_id === userId) {
    return { error: "Cannot remove the league owner. Transfer ownership first." };
  }

  const { data: picks } = await supabase
    .from("survivor_picks")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", userId);

  const pickIds = (picks ?? []).map((p) => p.id);
  if (pickIds.length > 0) {
    await supabase.from("survivor_allocations").delete().in("pick_id", pickIds);
  }

  await supabase.from("survivor_scores").delete().eq("league_id", leagueId).eq("user_id", userId);
  await supabase.from("survivor_picks").delete().eq("league_id", leagueId).eq("user_id", userId);

  const { error } = await supabase
    .from("survivor_league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/leagues");
  return { success: true };
}

export async function transferLeagueOwnership(leagueId, newOwnerId) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data: member } = await supabase
    .from("survivor_league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", newOwnerId)
    .maybeSingle();

  if (!member) return { error: "New owner must be a member of the league" };

  const { error } = await supabase
    .from("survivor_leagues")
    .update({ owner_id: newOwnerId })
    .eq("id", leagueId);

  if (error) return { error: error.message };

  revalidatePath("/admin/leagues");
  return { success: true };
}

// ── User Management ──────────────────────────────────────────

export async function getAdminUsers() {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data: profiles, error } = await supabase
    .from("survivor_profiles")
    .select("id, display_name, is_admin, created_at")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = {};
  for (const u of authUsers?.users ?? []) {
    emailMap[u.id] = u.email;
  }

  const { data: memberships } = await supabase
    .from("survivor_league_members")
    .select("user_id, league_id");

  const leagueCountMap = {};
  for (const m of memberships ?? []) {
    leagueCountMap[m.user_id] = (leagueCountMap[m.user_id] ?? 0) + 1;
  }

  const enriched = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? "Unknown",
    league_count: leagueCountMap[p.id] ?? 0,
  }));

  return { success: true, users: enriched };
}

export async function updateUserProfile(userId, updates) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const allowed = {};
  if (updates.display_name !== undefined) allowed.display_name = updates.display_name;
  if (updates.is_admin !== undefined) allowed.is_admin = updates.is_admin;

  const { data, error } = await supabase
    .from("survivor_profiles")
    .update(allowed)
    .eq("id", userId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: true, profile: data };
}

export async function getUserLeagues(userId) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createAdminClient();

  const { data: memberships, error } = await supabase
    .from("survivor_league_members")
    .select("league_id, joined_at, survivor_leagues(id, name, join_code, owner_id)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (error) return { error: error.message };

  const leagues = (memberships ?? []).map((m) => ({
    ...m.survivor_leagues,
    joined_at: m.joined_at,
    is_owner: m.survivor_leagues?.owner_id === userId,
  }));

  return { success: true, leagues };
}

