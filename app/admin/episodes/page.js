import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import EpisodeManager from "@/components/admin/EpisodeManager";

export const metadata = { title: "Episodes — Admin" };

export default async function AdminEpisodesPage() {
  const supabase = await createClient();

  const [{ data: episodes }, { data: players }] = await Promise.all([
    supabase
      .from("survivor_episodes")
      .select("*, survivor_players(id, name)")
      .eq("season", 50)
      .order("week_number", { ascending: true }),
    supabase
      .from("survivor_players")
      .select("id, name, is_active")
      .eq("season", 50)
      .order("name"),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black text-foreground mb-2">Episode Management</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Set the eliminated player after each episode airs. This triggers scoring for all leagues.
      </p>
      <EpisodeManager episodes={episodes ?? []} players={players ?? []} />
    </div>
  );
}
