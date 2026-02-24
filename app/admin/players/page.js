import { createClient } from "@/lib/supabase/server";
import PlayerManager from "@/components/admin/PlayerManager";

export const metadata = { title: "Players — Admin" };

export default async function AdminPlayersPage() {
  const supabase = await createClient();

  const { data: players } = await supabase
    .from("survivor_players")
    .select("*")
    .eq("season", 50)
    .order("placement", { ascending: false, nullsFirst: false });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black text-foreground mb-2">Player Management</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Manage the Season 50 cast. Add players, update their info, or mark them inactive.
      </p>
      <PlayerManager players={players ?? []} />
    </div>
  );
}
