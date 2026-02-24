import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Image
            src="/survivor-s50-logo.png"
            alt="Survivor Season 50"
            width={80}
            height={50}
            className="object-contain drop-shadow-[0_1px_6px_rgba(251,146,60,0.35)]"
          />
          <span className="text-xs tracking-[0.3em] text-muted-foreground/70 uppercase hidden sm:inline">
            Fantasy
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
        <div className="mb-8 drop-shadow-[0_2px_20px_rgba(251,146,60,0.30)]">
          <Image
            src="/survivor-s50-logo.png"
            alt="Survivor: In the Hands of the Fans — Season 50"
            width={340}
            height={211}
            className="object-contain mx-auto"
            priority
          />
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
          <span className="text-gradient">Outwit. Outplay.</span>
          <br />
          <span className="text-foreground">Outlast your friends.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          The ultimate Survivor Season 50 fantasy league. Create a league, pick who gets voted out
          each week, allocate your points wisely, and see who truly has what it takes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/auth/signup">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 h-13 text-base">
              Start Playing Free
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary h-13 text-base px-10">
              How It Works
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-3 gap-8 md:gap-16">
          {[
            { value: "18", label: "Castaways" },
            { value: "~14", label: "Episodes" },
            { value: "3", label: "Scoring Modes" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-black text-gradient">{stat.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 md:px-12 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4">
            <span className="text-gradient">How It Works</span>
          </h2>
          <p className="text-center text-muted-foreground mb-14 max-w-xl mx-auto">
            Four simple steps to join the most strategic Survivor fantasy experience around.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Create or Join",
                desc: "Create your own league and share the 5-character code, or enter a friend's code to join theirs.",
              },
              {
                step: "02",
                title: "Choose Your Mode",
                desc: "Pick from three scoring methods: Winner Only, Top 5, or Full Season scoring.",
              },
              {
                step: "03",
                title: "Make Your Picks",
                desc: "Each week before Wednesday 8 PM EST, guess who goes home and allocate up to 10 points across the cast.",
              },
              {
                step: "04",
                title: "Watch & Win",
                desc: "Correct guesses earn +5 bonus points. Smart allocations climb you up the leaderboard.",
              },
            ].map((item) => (
              <div key={item.step} className="gradient-card border border-border rounded-2xl p-6 relative overflow-hidden">
                <div className="text-5xl font-black text-primary/15 absolute top-4 right-4 leading-none select-none">
                  {item.step}
                </div>
                <div className="text-xs text-primary font-bold tracking-wider uppercase mb-3">{item.step}</div>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring Modes */}
      <section className="py-20 px-6 md:px-12 bg-secondary/20 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4">
            <span className="text-gradient">3 Ways to Play</span>
          </h2>
          <p className="text-center text-muted-foreground mb-14 max-w-xl mx-auto">
            Each league chooses one scoring mode at creation. Play with your tribe your way.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Final Tribal",
                badge: "Winner Only",
                color: "text-red-400",
                borderColor: "border-red-500/30",
                desc: "Only your points allocated to the sole winner count. Maximum risk, maximum reward. One survivor, one champion.",
                risk: "Extreme Risk",
              },
              {
                name: "Jury's Choice",
                badge: "Top 5 Only",
                color: "text-amber-400",
                borderColor: "border-amber-500/30",
                desc: "Your allocations to the final 5 players count. Back strong players early and hold on for the long game.",
                risk: "Medium Risk",
                featured: true,
              },
              {
                name: "Full Season",
                badge: "All Eliminations",
                color: "text-emerald-400",
                borderColor: "border-emerald-500/30",
                desc: "Every elimination earns points. Longer-lasting players are worth more. Weekly scoring keeps everyone in the hunt.",
                risk: "Beginner Friendly",
              },
            ].map((mode) => (
              <div
                key={mode.name}
                className={`gradient-card border rounded-2xl p-7 relative ${
                  mode.featured ? "border-primary/50 ring-1 ring-primary/20" : mode.borderColor
                }`}
              >
                {mode.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-xs px-3">Most Popular</Badge>
                  </div>
                )}
                <Badge className={`mb-4 text-xs font-bold bg-transparent border ${mode.borderColor} ${mode.color}`}>
                  {mode.badge}
                </Badge>
                <h3 className={`text-xl font-black mb-3 ${mode.color}`}>{mode.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{mode.desc}</p>
                <span className="text-xs text-muted-foreground italic">{mode.risk}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mechanics callout */}
      <section className="py-20 px-6 md:px-12 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-14">
            <span className="text-gradient">The Rules</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: "🎯",
                title: "Weekly Point Allocation",
                desc: "Each week you get 10 points to spread across any remaining castaways. Stack them on one or spread the risk.",
              },
              {
                icon: "🔮",
                title: "Tribal Guess Bonus",
                desc: "Correctly predict who gets voted out and earn +5 bonus points for the following week.",
              },
              {
                icon: "🛡️",
                title: "One-Time Mulligan",
                desc: "Miss a week with 0 points? Your one-time mulligan kicks in — you'll get +10 extra points the following week.",
              },
              {
                icon: "⏰",
                title: "Wednesday 8 PM Lock",
                desc: "All picks lock every Wednesday at 8 PM EST. Plan ahead — late picks are not accepted.",
              },
            ].map((rule) => (
              <div key={rule.title} className="gradient-card border border-border rounded-2xl p-6 flex gap-4">
                <span className="text-3xl">{rule.icon}</span>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{rule.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center border-t border-border/40 bg-secondary/10">
        <h2 className="text-3xl md:text-4xl font-black mb-4">
          Ready to{" "}
          <span className="text-gradient">Outwit, Outplay, Outlast?</span>
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Season 50 is underway. Create your league and invite your tribe today.
        </p>
        <Link href="/auth/signup">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 h-13 text-base">
            Create Your League
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/40 text-center">
        <p className="text-xs text-muted-foreground">
          Survivor Fantasy is a fan-made app. Survivor is a trademark of CBS Broadcasting Inc.
        </p>
      </footer>
    </div>
  );
}
