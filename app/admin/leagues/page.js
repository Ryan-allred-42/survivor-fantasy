import { createAdminClient } from "@/lib/supabase/server";
import LeagueManager from "@/components/admin/LeagueManager";

export const metadata = { title: "Leagues — Admin" };

export default async function AdminLeaguesPage() {
  const supabase = await createAdminClient();

  const { data: leagues } = await supabase
    .from("survivor_leagues")
    .select("*")
    .eq("season", 50)
    .order("created_at", { ascending: false });

  const ownerIds = [...new Set((leagues ?? []).map((l) => l.owner_id))];
  const { data: ownerProfiles } = ownerIds.length
    ? await supabase.from("survivor_profiles").select("id, display_name").in("id", ownerIds)
    : { data: [] };

  const ownerMap = {};
  for (const p of ownerProfiles ?? []) {
    ownerMap[p.id] = p.display_name ?? "Unknown";
  }

  const { data: allMembers } = await supabase
    .from("survivor_league_members")
    .select("league_id");

  const countMap = {};
  for (const m of allMembers ?? []) {
    countMap[m.league_id] = (countMap[m.league_id] ?? 0) + 1;
  }

  const enriched = (leagues ?? []).map((l) => ({
    ...l,
    owner_name: ownerMap[l.owner_id] ?? "Unknown",
    member_count: countMap[l.id] ?? 0,
  }));

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-black text-foreground mb-2">League Management</h1>
      <p className="text-muted-foreground text-sm mb-8">
        View and manage all leagues, their members, and ownership.
      </p>
      <LeagueManager leagues={enriched} />
    </div>
  );
}
