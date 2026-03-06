import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import PicksForm from "@/components/picks/PicksForm";
import { isEpisodeLocked } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Submit Picks — Survivor Fantasy" };

export default async function PicksPage({ params }) {
  const { id: leagueId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin");

  const { data: league } = await supabase
    .from("survivor_leagues")
    .select("id, name, owner_id")
    .eq("id", leagueId)
    .single();

  if (!league) notFound();

  // Verify membership (or auto-repair if owner row is missing)
  let member = null;
  const { data: existingMember } = await supabase
    .from("survivor_league_members")
    .select("id, mulligan_used")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMember) {
    if (league.owner_id === user.id) {
      await supabase
        .from("survivor_league_members")
        .insert({ league_id: leagueId, user_id: user.id });
      member = { id: null, mulligan_used: false };
    } else {
      notFound();
    }
  } else {
    member = existingMember;
  }

  // Fetch current open episode
  const { data: episode } = await supabase
    .from("survivor_episodes")
    .select("*")
    .eq("season", 50)
    .eq("is_complete", false)
    .order("week_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!episode) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-4xl mb-4">🏆</p>
          <h1 className="text-2xl font-bold text-foreground mb-2">Season Complete</h1>
          <p className="text-muted-foreground mb-6">There are no more episodes to pick for.</p>
          <Link href={`/league/${leagueId}`}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Back to League</Button>
          </Link>
        </div>
      </div>
    );
  }

  const locked = isEpisodeLocked(episode.lock_time);

  if (locked) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold text-foreground mb-2">Picks Are Locked</h1>
          <p className="text-muted-foreground mb-2">
            The deadline for Episode {episode.week_number} has passed.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Picks locked every Wednesday at 8:00 PM EST.
          </p>
          <Link href={`/league/${leagueId}`}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Back to League</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch active players
  const { data: players } = await supabase
    .from("survivor_players")
    .select("id, name, tribe, photo_url")
    .eq("season", 50)
    .eq("is_active", true)
    .order("name");

  // Fetch existing pick for this episode
  const { data: existingPick } = await supabase
    .from("survivor_picks")
    .select("*, survivor_allocations(*)")
    .eq("user_id", user.id)
    .eq("league_id", leagueId)
    .eq("episode_id", episode.id)
    .maybeSingle();

  const budget = existingPick?.bonus_points_available ?? 10;

  const existingAllocations = (existingPick?.survivor_allocations ?? []).reduce((acc, a) => {
    acc[a.player_id] = a.points;
    return acc;
  }, {});

  return (
    <main className="flex-1 px-4 py-8 md:px-10 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <span>/</span>
          <Link href={`/league/${leagueId}`} className="hover:text-foreground">{league.name}</Link>
          <span>/</span>
          <span className="text-foreground">Picks</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          Episode {episode.week_number} Picks
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Allocate your {budget} points and guess who gets voted out.
        </p>
      </div>

      <PicksForm
        leagueId={leagueId}
        episodeId={episode.id}
        episodeNumber={episode.week_number}
        lockTime={episode.lock_time}
        players={players ?? []}
        budget={budget}
        existingGuess={existingPick?.guessed_eliminated_player_id ?? null}
        existingAllocations={existingAllocations}
        mulliganUsed={member.mulligan_used}
      />
    </main>
  );
}
