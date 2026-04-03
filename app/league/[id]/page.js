import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { isEpisodeLocked, FULL_SEASON_MULTIPLIERS } from "@/lib/utils";
import EpisodeCountdown from "@/components/league/EpisodeCountdown";
import WeeklyAllocationsTable from "@/components/picks/WeeklyAllocationsTable";
import LeagueRulesCard from "@/components/league/LeagueRulesCard";
import Leaderboard from "@/components/league/Leaderboard";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("survivor_leagues").select("name").eq("id", id).single();
  return { title: `${data?.name ?? "League"} — Survivor Fantasy` };
}

export default async function LeaguePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  // Fetch league
  const { data: league } = await supabase
    .from("survivor_leagues")
    .select("*")
    .eq("id", id)
    .single();
  if (!league) notFound();

  // Membership check + auto-repair for owner
  const { data: member } = await supabase
    .from("survivor_league_members")
    .select("id, mulligan_used")
    .eq("league_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    if (league.owner_id === user.id) {
      await supabase.from("survivor_league_members").insert({ league_id: id, user_id: user.id });
    } else {
      notFound();
    }
  }

  const mulliganUsed = member?.mulligan_used ?? false;

  // All episodes for this season
  const { data: episodes } = await supabase
    .from("survivor_episodes")
    .select("*")
    .eq("season", 50)
    .order("week_number", { ascending: true });

  // Current episode: earliest incomplete
  const currentEpisode = (episodes ?? []).find((e) => !e.is_complete) ?? null;
  const currentEpisodeId = currentEpisode?.id ?? null;
  const isLocked = currentEpisode ? isEpisodeLocked(currentEpisode.lock_time) : true;

  // All players
  const { data: players } = await supabase
    .from("survivor_players")
    .select("id, name, tribe, photo_url, is_active, eliminated_week, placement")
    .eq("season", 50)
    .order("name");

  const TRIBE_ORDER = ["Cila", "Kalo", "Vatu"];
  const sortedPlayers = [...(players ?? [])].sort((a, b) => {
    const ti = TRIBE_ORDER.indexOf(a.tribe ?? "") - TRIBE_ORDER.indexOf(b.tribe ?? "");
    if (ti !== 0) return ti;
    if (a.is_active !== b.is_active) return b.is_active ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  // ── League members + name map (admin client bypasses RLS) ──
  const { data: leagueMembers } = await adminSupabase
    .from("survivor_league_members")
    .select("user_id")
    .eq("league_id", id);

  const memberUserIds = (leagueMembers ?? []).map((m) => m.user_id);

  const { data: memberProfiles } = memberUserIds.length
    ? await adminSupabase
        .from("survivor_profiles")
        .select("id, display_name")
        .in("id", memberUserIds)
    : { data: [] };

  const nameMap = {};
  for (const p of memberProfiles ?? []) {
    nameMap[p.id] = p.display_name ?? "Anonymous";
  }
  for (const uid of memberUserIds) {
    if (!nameMap[uid]) {
      nameMap[uid] = `Player ${uid.slice(0, 4)}`;
    }
  }
  if (user && !nameMap[user.id]) {
    nameMap[user.id] = "You";
  }

  // ── Current user's picks ──
  const { data: myPicks } = await supabase
    .from("survivor_picks")
    .select("id, episode_id, guessed_eliminated_player_id, guess_correct, total_points_allocated, bonus_points_available")
    .eq("user_id", user.id)
    .eq("league_id", id);

  const myPickIds = (myPicks ?? []).map((p) => p.id);
  let myAllocations = [];
  if (myPickIds.length > 0) {
    const { data } = await supabase
      .from("survivor_allocations")
      .select("pick_id, player_id, points")
      .in("pick_id", myPickIds);
    myAllocations = data ?? [];
  }

  const userPicksMap = {};
  for (const pick of myPicks ?? []) {
    const pickAllocs = myAllocations.filter((a) => a.pick_id === pick.id);
    const allocMap = pickAllocs.reduce((acc, a) => { acc[a.player_id] = a.points; return acc; }, {});
    userPicksMap[pick.episode_id] = {
      guess: pick.guessed_eliminated_player_id,
      guessCorrect: pick.guess_correct,
      allocations: allocMap,
      budget: pick.bonus_points_available ?? 10,
      totalAllocated: pick.total_points_allocated,
    };
  }
  if (currentEpisodeId && !userPicksMap[currentEpisodeId]) {
    userPicksMap[currentEpisodeId] = { guess: null, guessCorrect: null, allocations: {}, budget: 10, totalAllocated: 0 };
  }

  // ── All members' picks (for comparison modal) ──
  // Only fetch for locked/complete episodes to keep payload reasonable
  const lockedEpisodeIds = (episodes ?? [])
    .filter((e) => e.is_complete || isEpisodeLocked(e.lock_time))
    .map((e) => e.id);

  let allMembersPicksMap = {}; // { [episodeId]: { [userId]: { displayName, guess, guessCorrect, allocations } } }

  if (lockedEpisodeIds.length > 0) {
    const { data: allLeaguePicks } = await adminSupabase
      .from("survivor_picks")
      .select("id, user_id, episode_id, guessed_eliminated_player_id, guess_correct, total_points_allocated")
      .eq("league_id", id)
      .in("episode_id", lockedEpisodeIds);

    const allPickIds = (allLeaguePicks ?? []).map((p) => p.id);
    let allLeagueAllocs = [];
    if (allPickIds.length > 0) {
      const { data } = await adminSupabase
        .from("survivor_allocations")
        .select("pick_id, player_id, points")
        .in("pick_id", allPickIds);
      allLeagueAllocs = data ?? [];
    }

    for (const pick of allLeaguePicks ?? []) {
      const pickAllocs = allLeagueAllocs.filter((a) => a.pick_id === pick.id);
      const allocMap = pickAllocs.reduce((acc, a) => { acc[a.player_id] = a.points; return acc; }, {});
      if (!allMembersPicksMap[pick.episode_id]) allMembersPicksMap[pick.episode_id] = {};
      allMembersPicksMap[pick.episode_id][pick.user_id] = {
        displayName: nameMap[pick.user_id] ?? "Anonymous",
        guess: pick.guessed_eliminated_player_id,
        guessCorrect: pick.guess_correct,
        allocations: allocMap,
      };
    }
  }

  // ── Leaderboard (admin client to see all members' scores) ──
  const { data: scoreRows } = await adminSupabase
    .from("survivor_scores")
    .select("user_id, cumulative_score, weekly_score, episode_id, survivor_episodes(week_number)")
    .eq("league_id", id)
    .order("updated_at", { ascending: false });

  const latestByUser = {};
  for (const row of scoreRows ?? []) {
    const wn = row.survivor_episodes?.week_number ?? 0;
    if (!latestByUser[row.user_id] || wn > latestByUser[row.user_id].week) {
      latestByUser[row.user_id] = { userId: row.user_id, cumulative: row.cumulative_score, lastWeekly: row.weekly_score, week: wn };
    }
  }

  // Build leaderboard — every member appears, even those with no scores yet
  const leaderboard = Object.values(latestByUser)
    .map((e) => ({ ...e, displayName: nameMap[e.userId] ?? "Anonymous" }));

  for (const m of leagueMembers ?? []) {
    if (!latestByUser[m.user_id]) {
      leaderboard.push({ userId: m.user_id, cumulative: 0, lastWeekly: 0, week: 0, displayName: nameMap[m.user_id] ?? "Anonymous" });
    }
  }
  leaderboard.sort((a, b) => b.cumulative - a.cumulative);

  // ── Max points potential ──
  // For each user: if the player they allocated the most points to finishes 1st (100x),
  // second-most finishes 2nd (75x), etc., what's the best possible final score?
  const activePlayers = (players ?? []).filter((p) => p.is_active);
  const totalPlayerCount = (players ?? []).length;

  // Remaining placements = slots not yet assigned (active player count determines these)
  // Active players will occupy the top N placement slots
  // e.g. if 22 active remain, they'll fill placements 3..24 (the top 22)
  const eliminatedCount = totalPlayerCount - activePlayers.length;
  const remainingMultipliers = [];
  for (let p = eliminatedCount + 1; p <= totalPlayerCount; p++) {
    remainingMultipliers.push(FULL_SEASON_MULTIPLIERS[p] ?? p);
  }
  remainingMultipliers.sort((a, b) => b - a); // highest first

  // Fetch all members' allocations for the current episode to compute max potential
  let memberAllocationsMap = {}; // { userId: [{ playerId, points }] }
  if (currentEpisodeId) {
    const { data: allCurrentPicks } = await adminSupabase
      .from("survivor_picks")
      .select("id, user_id, total_points_allocated")
      .eq("league_id", id)
      .eq("episode_id", currentEpisodeId);

    const currentPickIds = (allCurrentPicks ?? []).map((p) => p.id);
    let currentAllocs = [];
    if (currentPickIds.length > 0) {
      const { data } = await adminSupabase
        .from("survivor_allocations")
        .select("pick_id, player_id, points")
        .in("pick_id", currentPickIds);
      currentAllocs = data ?? [];
    }

    for (const pick of allCurrentPicks ?? []) {
      const allocs = currentAllocs
        .filter((a) => a.pick_id === pick.id)
        .map((a) => ({ playerId: a.player_id, points: a.points }));
      memberAllocationsMap[pick.user_id] = allocs;
    }
  }

  // Build a map of userId → boolean for whether they've submitted picks this episode
  const memberPickStatusMap = {};
  for (const uid of memberUserIds) {
    memberPickStatusMap[uid] = !!(memberAllocationsMap[uid] && memberAllocationsMap[uid].length > 0);
  }

  // Gather allocations for completed (closed) episodes only to compute running totals per active player
  const allCompletedEpisodeIds = (episodes ?? []).filter((e) => e.is_complete).map((e) => e.id);
  let allTimeAllocsMap = {}; // { userId: { playerId: totalPoints } }

  if (allCompletedEpisodeIds.length > 0) {
    const episodeIdsToFetch = [...allCompletedEpisodeIds];

    const { data: allPicks } = await adminSupabase
      .from("survivor_picks")
      .select("id, user_id, episode_id")
      .eq("league_id", id)
      .in("episode_id", episodeIdsToFetch);

    const allPickIds = (allPicks ?? []).map((p) => p.id);
    let allAllocs = [];
    if (allPickIds.length > 0) {
      const { data } = await adminSupabase
        .from("survivor_allocations")
        .select("pick_id, player_id, points")
        .in("pick_id", allPickIds);
      allAllocs = data ?? [];
    }

    for (const pick of allPicks ?? []) {
      if (!allTimeAllocsMap[pick.user_id]) allTimeAllocsMap[pick.user_id] = {};
      const pickAllocs = allAllocs.filter((a) => a.pick_id === pick.id);
      for (const a of pickAllocs) {
        allTimeAllocsMap[pick.user_id][a.player_id] =
          (allTimeAllocsMap[pick.user_id][a.player_id] ?? 0) + a.points;
      }
    }
  }

  // Compute max potential for each leaderboard entry
  for (const entry of leaderboard) {
    const playerPoints = allTimeAllocsMap[entry.userId] ?? {};
    
    // Only allocations on currently ACTIVE players can earn future points!
    const activePts = [];
    for (const p of activePlayers) {
       if (playerPoints[p.id]) activePts.push(playerPoints[p.id]);
    }
    const sortedPoints = activePts.sort((a, b) => b - a);

    // Pair highest allocation with highest remaining multiplier
    let maxFromActive = 0;
    for (let i = 0; i < Math.min(sortedPoints.length, remainingMultipliers.length); i++) {
      maxFromActive += sortedPoints[i] * remainingMultipliers[i];
    }

    entry.maxPotential = entry.cumulative + maxFromActive;
  }

  const seasonStarted = (scoreRows ?? []).length > 0;
  const completedEpisodes = (episodes ?? []).filter((e) => e.is_complete);

  return (
    <main className="flex-1 px-4 py-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* ── Header ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
              <span>/</span>
              <span className="text-foreground">{league.name}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground">{league.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge className="bg-secondary text-secondary-foreground border-border text-xs">
                Full Season
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">Code: {league.join_code}</span>
              {currentEpisode && !isLocked && (
                <span className="text-xs text-primary">
                  Ep {currentEpisode.week_number} open · <EpisodeCountdown lockTime={currentEpisode.lock_time} inline />
                </span>
              )}
              {currentEpisode && isLocked && (
                <span className="text-xs text-destructive">Ep {currentEpisode.week_number} locked</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Rules card ───────────────────────────────────── */}
        <LeagueRulesCard joinCode={league.join_code} />

        {/* ── Main grid: picks + sidebar ───────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-9 gap-5">

          {/* ── Picks (main content) ── */}
          <div className="xl:col-span-6">
            <WeeklyAllocationsTable
              players={sortedPlayers}
              episodes={episodes ?? []}
              userPicksMap={userPicksMap}
              currentEpisodeId={currentEpisodeId}
              leagueId={id}
              mulliganUsed={mulliganUsed}
              allMembersPicksMap={allMembersPicksMap}
              currentUserId={user.id}
            />
          </div>

          {/* ── Sidebar ── */}
          <div className="xl:col-span-3 space-y-4">
            {/* Episode status */}
            {currentEpisode ? (
              <div
                className="rounded-2xl border p-4"
                style={{
                  background: "linear-gradient(135deg, oklch(0.18 0.06 35), oklch(0.13 0.04 35))",
                  borderColor: "oklch(0.38 0.12 38 / 0.50)",
                }}
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Current Episode</p>
                <p className="font-bold text-foreground text-base">Episode {currentEpisode.week_number}</p>
                {currentEpisode.air_date && (
                  <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                    Airs {new Date(currentEpisode.air_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                )}
                <div className={`rounded-lg px-3 py-2 text-xs ${isLocked ? "bg-destructive/15 border border-destructive/30 text-destructive" : "bg-primary/10 border border-primary/30 text-primary"}`}>
                  {isLocked ? "🔒 Picks locked" : <EpisodeCountdown lockTime={currentEpisode.lock_time} />}
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl border p-4 text-center"
                style={{
                  background: "linear-gradient(135deg, oklch(0.18 0.06 35), oklch(0.13 0.04 35))",
                  borderColor: "oklch(0.38 0.12 38 / 0.50)",
                }}
              >
                <p className="text-2xl mb-1">🏆</p>
                <p className="font-bold text-foreground text-sm">Season Complete</p>
              </div>
            )}

            {/* Leaderboard */}
            <Leaderboard
              leaderboard={leaderboard}
              currentUserId={user.id}
              seasonStarted={seasonStarted}
              joinCode={league.join_code}
              completedEpisodes={completedEpisodes}
              allMembersPicksMap={allMembersPicksMap}
              players={sortedPlayers}
              showMaxPotential={seasonStarted}
              multipliers={FULL_SEASON_MULTIPLIERS}
              allTimeAllocsMap={allTimeAllocsMap}
              remainingMultipliers={remainingMultipliers}
              memberPickStatusMap={memberPickStatusMap}
              currentEpisodeNumber={currentEpisode?.week_number ?? null}
              isLocked={isLocked}
            />
          </div>
        </div>
    </main>
  );
}
