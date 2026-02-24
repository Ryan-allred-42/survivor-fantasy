import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import CardCreateLeague from "@/components/league/CardCreateLeague";
import CardJoinLeague from "@/components/league/CardJoinLeague";
import { Badge } from "@/components/ui/badge";
import { SCORING_METHOD_LABELS } from "@/lib/utils";

export const metadata = { title: "Dashboard — Survivor Fantasy" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const { data: memberships } = await supabase
    .from("survivor_league_members")
    .select("joined_at, survivor_leagues(id, name, scoring_method, join_code, owner_id)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const leagues = memberships?.map((m) => m.survivor_leagues).filter(Boolean) ?? [];

  return (
    <div className="min-h-screen flex flex-col relative">
      <NavBar />

      {/* ── Decorative Survivor Torch ──────────────────────── */}
      <div
        className="fixed right-0 top-0 h-full flex items-center pointer-events-none select-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <svg
          width="160"
          height="600"
          viewBox="0 0 160 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.07 }}
        >
          {/* Handle */}
          <rect x="73" y="320" width="14" height="280" rx="7" fill="oklch(0.45 0.12 35)" />
          {/* Taper */}
          <path d="M73 320 Q70 280 74 260 L86 260 Q90 280 87 320 Z" fill="oklch(0.40 0.10 35)" />
          {/* Basket bands */}
          <rect x="64" y="255" width="32" height="8" rx="4" fill="oklch(0.38 0.09 35)" />
          <rect x="66" y="240" width="28" height="7" rx="3.5" fill="oklch(0.38 0.09 35)" />
          <rect x="68" y="226" width="24" height="7" rx="3.5" fill="oklch(0.38 0.09 35)" />
          {/* Torch cup */}
          <path d="M62 260 Q56 220 64 200 L96 200 Q104 220 98 260 Z" fill="oklch(0.42 0.10 35)" />
          {/* Inner glow cup */}
          <path d="M68 255 Q65 225 70 210 L90 210 Q95 225 92 255 Z" fill="oklch(0.55 0.15 38)" />
          {/* Flame — outer */}
          <path d="M80 205 C60 175 45 140 55 100 C60 75 70 55 80 20 C90 55 100 75 105 100 C115 140 100 175 80 205 Z"
            fill="oklch(0.65 0.22 38)" />
          {/* Flame — mid */}
          <path d="M80 195 C65 168 55 138 63 105 C68 85 75 68 80 45 C85 68 92 85 97 105 C105 138 95 168 80 195 Z"
            fill="oklch(0.75 0.24 45)" />
          {/* Flame — inner bright */}
          <path d="M80 180 C70 158 65 132 70 108 C74 92 78 78 80 60 C82 78 86 92 90 108 C95 132 90 158 80 180 Z"
            fill="oklch(0.90 0.20 58)" />
          {/* Spark tip */}
          <ellipse cx="80" cy="25" rx="5" ry="12" fill="oklch(0.97 0.12 72)" />
        </svg>
      </div>

      <main className="flex-1 px-6 py-10 md:px-10 max-w-5xl mx-auto w-full relative" style={{ zIndex: 1 }}>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-1">
            Your <span className="text-gradient">Leagues</span>
          </h1>
          <p className="text-muted-foreground text-sm">Survivor Season 50 · Fantasy</p>
        </div>

        {/* ── 1. Active leagues ──────────────────────────── */}
        {leagues.length > 0 && (
          <section className="mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leagues.map((league, idx) => (
                <Link key={league.id} href={`/league/${league.id}`} className="group">
                  <div
                    className="relative overflow-hidden border rounded-2xl p-5 transition-all h-full flex flex-col hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.18 0.06 35), oklch(0.14 0.04 40))",
                      borderColor: `oklch(0.38 0.12 ${35 + (idx * 8) % 30} / 0.5)`,
                      boxShadow: `0 0 20px oklch(0.65 0.22 38 / 0.08)`,
                    }}
                  >
                    {/* Warm ember glow in corner */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "radial-gradient(ellipse 70% 60% at 100% 100%, oklch(0.65 0.22 38 / 0.10) 0%, transparent 65%)",
                      }}
                    />
                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: "radial-gradient(ellipse 80% 70% at 50% 50%, oklch(0.65 0.22 38 / 0.07) 0%, transparent 70%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between mb-3">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm leading-snug pr-2">
                        {league.name}
                      </h3>
                      {league.owner_id === user.id && (
                        <Badge className="bg-primary/15 text-primary border-primary/30 text-xs shrink-0">Owner</Badge>
                      )}
                    </div>
                    <div className="relative flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                      <Badge
                        className="text-xs"
                        style={{
                          background: "oklch(0.65 0.22 38 / 0.15)",
                          color: "oklch(0.82 0.18 45)",
                          borderColor: "oklch(0.65 0.22 38 / 0.30)",
                        }}
                      >
                        {SCORING_METHOD_LABELS[league.scoring_method]}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono tracking-widest">
                        {league.join_code}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {leagues.length === 0 && (
          <div className="text-center py-12 mb-8 text-muted-foreground">
            <p className="text-4xl mb-3">🏝️</p>
            <p className="text-lg font-semibold text-foreground mb-1">No leagues yet</p>
            <p className="text-sm">Create a new league or enter a code below to join one.</p>
          </div>
        )}

        {/* ── 2. Create / Join ──────────────────────────── */}
        <div className="border-t border-border/40 pt-8">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-5">
            {leagues.length > 0 ? "New League" : "Get Started"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            <CardCreateLeague />
            <CardJoinLeague />
          </div>
        </div>

      </main>
    </div>
  );
}
