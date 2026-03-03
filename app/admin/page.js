import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: playerCount },
    { count: episodeCount },
    { count: leagueCount },
    { count: memberCount },
    { data: episodes },
  ] = await Promise.all([
    supabase.from("survivor_players").select("id", { count: "exact", head: true }).eq("season", 50),
    supabase.from("survivor_episodes").select("id", { count: "exact", head: true }).eq("season", 50),
    supabase.from("survivor_leagues").select("id", { count: "exact", head: true }).eq("season", 50),
    supabase.from("survivor_league_members").select("id", { count: "exact", head: true }),
    supabase
      .from("survivor_episodes")
      .select("id, week_number, is_complete, is_locked, survivor_players(name)")
      .eq("season", 50)
      .order("week_number", { ascending: true })
      .limit(5),
  ]);

  const stats = [
    { label: "Castaways", value: playerCount ?? 0 },
    { label: "Episodes", value: episodeCount ?? 0 },
    { label: "Leagues", value: leagueCount ?? 0 },
    { label: "Players", value: memberCount ?? 0 },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black text-foreground mb-8">Admin Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="gradient-card border border-border rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-gradient">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent episodes */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Recent Episodes</h2>
          <Link href="/admin/episodes" className="text-sm text-primary hover:underline">
            Manage all →
          </Link>
        </div>
        <div className="gradient-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border/40">
            {(episodes ?? []).map((ep) => (
              <div key={ep.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground text-sm">Episode {ep.week_number}</span>
                  {ep.survivor_players?.name && (
                    <span className="text-xs text-muted-foreground">{ep.survivor_players.name} eliminated</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {ep.is_complete ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">Complete</Badge>
                  ) : ep.is_locked ? (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">Locked</Badge>
                  ) : (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Open</Badge>
                  )}
                  <Link href="/admin/episodes" className="text-xs text-primary hover:underline">
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
