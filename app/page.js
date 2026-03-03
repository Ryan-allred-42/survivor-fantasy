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
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" asChild>
            <Link href="/auth/signup">Get Started</Link>
          </Button>
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
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 h-13 text-base" asChild>
            <Link href="/auth/signup">Start Playing Free</Link>
          </Button>
          <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary h-13 text-base px-10" asChild>
            <Link href="#how-it-works">How It Works</Link>
          </Button>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-3 gap-8 md:gap-16">
          {[
            { value: "24", label: "Castaways" },
            { value: "~14", label: "Episodes" },
            { value: "100×", label: "Winner Multiplier" },
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
                title: "Invite Your Tribe",
                desc: "Share your 5-character league code with friends so they can join and compete.",
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

      {/* Scoring */}
      <section className="py-20 px-6 md:px-12 bg-secondary/20 border-t border-border/40">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            <span className="text-gradient">Full Season Scoring</span>
          </h2>
          <p className="text-muted-foreground mb-14 max-w-xl mx-auto">
            Every elimination matters. Allocate your points wisely — the longer a player lasts, the bigger the multiplier.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                value: "1×",
                label: "First Boot",
                desc: "The first player voted out earns the lowest multiplier. Low risk, low reward.",
              },
              {
                value: "50×",
                label: "Third Place",
                desc: "Making it to the final three means your points on that player are multiplied by 50.",
              },
              {
                value: "100×",
                label: "Sole Survivor",
                desc: "The winner earns the maximum 100× multiplier. Back the right horse and dominate.",
              },
            ].map((item) => (
              <div key={item.label} className="gradient-card border border-primary/30 rounded-2xl p-7">
                <div className="text-4xl font-black text-gradient mb-3">{item.value}</div>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
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
        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 h-13 text-base" asChild>
          <Link href="/auth/signup">Create Your League</Link>
        </Button>
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
