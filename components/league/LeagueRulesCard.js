"use client";

import { useState } from "react";
import { FULL_SEASON_MULTIPLIERS } from "@/lib/utils";

const SCORING_DETAIL = [
  "Allocate up to your point budget each week across any active players.",
  "When a player is voted out, your points on ALL SURVIVING players are multiplied by that week's boot-order multiplier.",
  "Points on the eliminated player do NOT score — only players still in the game earn you points.",
  "24th place = 1×. The multiplier grows as fewer players remain. 3rd = 50×, 2nd = 75×, winner = 100×.",
  "Correct tribal guesses give +5 pts next week — the right read still pays off.",
];

const GENERAL_RULES = [
  { icon: "📊", title: "Weekly Budget", desc: "You start each week with 10 points to allocate across any active players. You can put all 10 on one player or spread them any way you like." },
  { icon: "🔮", title: "Tribal Guess", desc: "Each week you can guess who will be voted out. Guess correctly and you earn +5 bonus points to spend the following week." },
  { icon: "🛡️", title: "Mulligan", desc: "Miss a week with 0 points allocated? Your first miss earns you +10 extra points the following week. Subsequent missed weeks receive no bonus." },
  { icon: "⏰", title: "Lock Time", desc: "Picks lock every Wednesday at 8 PM Eastern before the episode airs. Late submissions are not accepted." },
];

export default function LeagueRulesCard({ joinCode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden mb-5 border"
      style={{
        background: "linear-gradient(135deg, oklch(0.18 0.06 35), oklch(0.13 0.04 35))",
        borderColor: "oklch(0.38 0.12 38 / 0.50)",
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">🔥</span>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">League Rules</span>
              <span className="text-xs bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-medium">
                Full Season
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              Surviving players earn points each vote-off — multiplier grows steeply in the final five.
            </p>
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 ml-3 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable body */}
      {isOpen && (
        <div className="border-t border-border/50 px-5 py-5 space-y-5">

          {/* Scoring method detail */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              🔥 Full Season Scoring
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Each vote-off, your points on surviving players earn you score. Multiplier grows steeply in the final five.
            </p>
            <ul className="space-y-2">
              {SCORING_DETAIL.map((rule, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                  <span className="text-xs text-muted-foreground leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Boot multiplier table */}
          <div className="border-t border-border/40" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
              🔥 Boot Multiplier Table
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              This week&apos;s multiplier is set by whoever gets voted out. Your points on all surviving players earn: points × multiplier.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border/40">
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Place</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-semibold">Multiplier</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Place</th>
                    <th className="px-3 py-2 text-right text-muted-foreground font-semibold">Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 12 }, (_, row) => {
                    const leftPlace  = row + 1;
                    const rightPlace = row + 1 + 12;
                    const leftDbPlacement  = 25 - leftPlace;
                    const rightDbPlacement = 25 - rightPlace;
                    const leftMult  = FULL_SEASON_MULTIPLIERS[leftDbPlacement]  ?? 0;
                    const rightMult = FULL_SEASON_MULTIPLIERS[rightDbPlacement] ?? 0;
                    const isTopFiveL = leftPlace  <= 5;
                    const ordinal = (n) => {
                      const s = ["th","st","nd","rd"];
                      const v = n % 100;
                      return n + (s[(v-20)%10] || s[v] || s[0]);
                    };
                    return (
                      <tr key={row} className="border-b border-border/20 last:border-0">
                        <td className={`px-3 py-1.5 font-medium ${isTopFiveL ? "text-primary/80" : "text-muted-foreground"}`}>
                          {ordinal(leftPlace)}{leftPlace === 1 ? " 🏆" : isTopFiveL ? " ★" : ""}
                        </td>
                        <td className={`px-3 py-1.5 text-right font-bold tabular-nums ${isTopFiveL ? "text-primary" : "text-foreground"}`}>
                          {leftMult === 0 ? "—" : `${leftMult}×`}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {ordinal(rightPlace)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold tabular-nums text-foreground">
                          {rightMult === 0 ? "—" : `${rightMult}×`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-3 py-2 text-[10px] text-muted-foreground/60 border-t border-border/20">
                ★ Top 5 &nbsp;·&nbsp; 🏆 Winner &nbsp;·&nbsp; Multiplier set by the boot — earned by surviving players
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/40" />

          {/* General weekly mechanics */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Weekly Mechanics
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GENERAL_RULES.map((rule) => (
                <div key={rule.title} className="flex items-start gap-3 bg-secondary/30 rounded-xl px-3 py-3">
                  <span className="text-base shrink-0 mt-0.5">{rule.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">{rule.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Join code reminder */}
          {joinCode && (
            <>
              <div className="border-t border-border/40" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Share this league</span>
                <span className="font-mono text-sm font-bold text-primary tracking-widest bg-primary/10 border border-primary/25 px-3 py-1 rounded-lg">
                  {joinCode}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
