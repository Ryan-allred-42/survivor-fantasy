import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = null;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("survivor_profiles")
      .select("display_name, is_admin")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name;
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 md:px-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5">
        <Image
          src="/survivor-s50-logo.png"
          alt="Survivor Season 50"
          width={88}
          height={55}
          className="object-contain drop-shadow-[0_1px_4px_rgba(251,146,60,0.35)]"
          priority
        />
        <span className="text-xs tracking-[0.25em] text-muted-foreground/70 uppercase hidden sm:inline">
          Fantasy
        </span>
      </Link>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs">
              Admin
            </Button>
          </Link>
        )}
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {displayName || user.email}
            </span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground hover:text-foreground text-xs">
                Sign Out
              </Button>
            </form>
          </div>
        ) : (
          <Link href="/auth/signin">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
