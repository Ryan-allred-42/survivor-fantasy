import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const [
    { count: playerCount },
    { count: episodeCount },
    { count: leagueCount },
    { count: memberCount },
    { data: episodes },
    { data: recentLeagues },
    { count: userCount },
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
    supabase
      .from("survivor_leagues")
      .select("id, name, join_code, owner_id, created_at")
      .eq("season", 50)
      .order("created_at", { ascending: false })
      .limit(5),
    adminSupabase.from("survivor_profiles").select("id", { count: "exact", head: true }),
  ]);

  const ownerIds = [...new Set((recentLeagues ?? []).map((l) => l.owner_id))];
  const { data: ownerProfiles } = ownerIds.length
    ? await adminSupabase.from("survivor_profiles").select("id, display_name").in("id", ownerIds)
    : { data: [] };
  const ownerMap = {};
  for (const p of ownerProfiles ?? []) {
    ownerMap[p.id] = p.display_name ?? "Unknown";
  }

  const stats = [
    { label: "Castaways", value: playerCount ?? 0, href: "/admin/players" },
    { label: "Episodes", value: episodeCount ?? 0, href: "/admin/episodes" },
    { label: "Leagues", value: leagueCount ?? 0, href: "/admin/leagues" },
    { label: "Players", value: memberCount ?? 0, href: "/admin/users" },
    { label: "Users", value: userCount ?? 0, href: "/admin/users" },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black text-foreground mb-8">Admin Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <div className="gradient-card border border-border rounded-2xl p-5 text-center group-hover:border-primary/40 transition-colors">
              <p className="text-3xl font-black text-gradient">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { href: "/admin/episodes", label: "Manage Episodes", desc: "Resolve & create episodes" },
          { href: "/admin/players", label: "Manage Players", desc: "Cast roster & status" },
          { href: "/admin/leagues", label: "Manage Leagues", desc: "View, edit & delete leagues" },
          { href: "/admin/users", label: "Manage Users", desc: "Profiles & admin access" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="group">
            <div className="gradient-card border border-border rounded-xl p-4 group-hover:border-primary/40 transition-colors h-full">
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{link.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
            </div>
          </Link>
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
            {(episodes ?? []).length === 0 && (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">No episodes yet.</div>
            )}
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

      {/* Recent leagues */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Recent Leagues</h2>
          <Link href="/admin/leagues" className="text-sm text-primary hover:underline">
            Manage all →
          </Link>
        </div>
        <div className="gradient-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border/40">
            {(recentLeagues ?? []).length === 0 && (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">No leagues yet.</div>
            )}
            {(recentLeagues ?? []).map((league) => (
              <div key={league.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground text-sm">{league.name}</span>
                  <span className="text-xs text-muted-foreground">
                    by {ownerMap[league.owner_id] ?? "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">{league.join_code}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(league.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <Link href="/admin/leagues" className="text-xs text-primary hover:underline">
                    Manage
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
