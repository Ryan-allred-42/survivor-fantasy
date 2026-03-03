import { createAdminClient } from "@/lib/supabase/server";
import UserManager from "@/components/admin/UserManager";

export const metadata = { title: "Users — Admin" };

export default async function AdminUsersPage() {
  const supabase = await createAdminClient();

  const { data: profiles } = await supabase
    .from("survivor_profiles")
    .select("id, display_name, is_admin, created_at")
    .order("created_at", { ascending: false });

  const { data: authData } = await supabase.auth.admin.listUsers();
  const emailMap = {};
  for (const u of authData?.users ?? []) {
    emailMap[u.id] = u.email;
  }

  const { data: memberships } = await supabase
    .from("survivor_league_members")
    .select("user_id");

  const leagueCountMap = {};
  for (const m of memberships ?? []) {
    leagueCountMap[m.user_id] = (leagueCountMap[m.user_id] ?? 0) + 1;
  }

  const users = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? "Unknown",
    league_count: leagueCountMap[p.id] ?? 0,
  }));

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-black text-foreground mb-2">User Management</h1>
      <p className="text-muted-foreground text-sm mb-8">
        View all registered users, edit profiles, and manage admin access.
      </p>
      <UserManager users={users} />
    </div>
  );
}
