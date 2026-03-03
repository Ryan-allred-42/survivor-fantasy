"use server";

import { createClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";

/**
 * Create a new league for the authenticated user.
 */
export async function createLeague(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name")?.toString().trim();

  if (!name) return { error: "League name is required" };

  // Generate a unique join code
  let joinCode;
  let attempts = 0;
  while (attempts < 10) {
    joinCode = generateJoinCode();
    const { data: existing } = await supabase
      .from("survivor_leagues")
      .select("id")
      .eq("join_code", joinCode)
      .maybeSingle();
    if (!existing) break;
    attempts++;
  }

  if (!joinCode) return { error: "Could not generate a unique join code" };

  const { data: league, error } = await supabase
    .from("survivor_leagues")
    .insert({ name, owner_id: user.id, scoring_method: "full_season", join_code: joinCode, season: 50 })
    .select()
    .single();

  if (error) return { error: error.message };

  // Auto-join the owner — check for error explicitly
  const { error: memberError } = await supabase
    .from("survivor_league_members")
    .insert({ league_id: league.id, user_id: user.id });

  if (memberError && memberError.code !== "23505") {
    // 23505 = already exists (safe to ignore), anything else is a real problem
    // Clean up the orphaned league and report error
    await supabase.from("survivor_leagues").delete().eq("id", league.id);
    return { error: `Failed to join league: ${memberError.message}` };
  }

  revalidatePath("/dashboard");
  return { success: true, league };
}

/**
 * Join a league using a 5-character join code.
 */
export async function joinLeague(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const code = formData.get("join_code")?.toString().trim().toUpperCase();
  if (!code || code.length !== 5) return { error: "Invalid join code" };

  const { data: league, error: leagueError } = await supabase
    .from("survivor_leagues")
    .select("id, name")
    .eq("join_code", code)
    .maybeSingle();

  if (leagueError || !league) return { error: "League not found" };

  const { error: memberError } = await supabase
    .from("survivor_league_members")
    .insert({ league_id: league.id, user_id: user.id });

  if (memberError) {
    if (memberError.code === "23505") return { error: "You are already in this league" };
    return { error: memberError.message };
  }

  revalidatePath("/dashboard");
  return { success: true, league };
}

/**
 * Get all leagues the current user belongs to.
 */
export async function getMyLeagues() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("survivor_league_members")
    .select("league_id, survivor_leagues(id, name, scoring_method, join_code, owner_id, created_at)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  return data?.map((d) => d.survivor_leagues).filter(Boolean) ?? [];
}
