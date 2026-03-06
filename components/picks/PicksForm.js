"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { submitPicks } from "@/actions/picks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EpisodeCountdown from "@/components/league/EpisodeCountdown";
import PlayerAvatar from "@/components/PlayerAvatar";
import { toast } from "sonner";

export default function PicksForm({
  leagueId,
  episodeId,
  episodeNumber,
  lockTime,
  players,
  budget,
  existingGuess,
  existingAllocations,
  mulliganUsed,
}) {
  const router = useRouter();
  const [guessId, setGuessId] = useState(existingGuess ?? null);
  const [allocations, setAllocations] = useState({ ...existingAllocations });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + (v || 0), 0);
  const remaining = budget - totalAllocated;

  function setAllocation(playerId, value) {
    const num = Math.max(0, Math.min(budget, parseInt(value) || 0));
    const currentOthers = totalAllocated - (allocations[playerId] || 0);
    const clamped = Math.min(num, budget - currentOthers);
    setAllocations((prev) => ({ ...prev, [playerId]: clamped }));
  }

  function increment(playerId) {
    if (remaining <= 0) return;
    setAllocations((prev) => ({ ...prev, [playerId]: (prev[playerId] || 0) + 1 }));
  }

  function decrement(playerId) {
    if ((allocations[playerId] || 0) <= 0) return;
    setAllocations((prev) => ({ ...prev, [playerId]: prev[playerId] - 1 }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);

    const allocationArray = Object.entries(allocations)
      .filter(([, pts]) => pts > 0)
      .map(([playerId, points]) => ({ playerId, points }));

    const result = await submitPicks({
      leagueId,
      episodeId,
      guessedEliminatedPlayerId: guessId,
      allocations: allocationArray,
    });

    setIsSubmitting(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Picks submitted!");
      router.push(`/league/${leagueId}`);
    }
  }

  const byTribe = players.reduce((acc, p) => {
    const tribe = p.tribe || "Unknown";
    if (!acc[tribe]) acc[tribe] = [];
    acc[tribe].push(p);
    return acc;
  }, {});

  // Tribe brand colors matching the season: Cila=orange, Kalo=teal, Vatu=magenta
  const TRIBE_STYLES = {
    Cila: { dot: "bg-orange-500", label: "text-orange-400", divider: "bg-orange-500/30" },
    Kalo: { dot: "bg-teal-500",   label: "text-teal-400",   divider: "bg-teal-500/30" },
    Vatu: { dot: "bg-fuchsia-500",label: "text-fuchsia-400",divider: "bg-fuchsia-500/30" },
  };
  const DEFAULT_TRIBE_STYLE = { dot: "bg-muted", label: "text-muted-foreground", divider: "bg-border/60" };

  const tribeNames = Object.keys(byTribe);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Budget bar */}
      <div className="gradient-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-foreground">Point Budget</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Allocate your points across remaining castaways
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-gradient tabular-nums">{remaining}</p>
            <p className="text-xs text-muted-foreground">remaining of {budget}</p>
          </div>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min(100, (totalAllocated / budget) * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{totalAllocated} allocated</span>
          <EpisodeCountdown lockTime={lockTime} />
        </div>
        {!mulliganUsed && (
          <p className="text-xs text-amber-400/80 mt-3">
            💡 Mulligan available — if you submit 0 points, you'll get +10 extra next week.
          </p>
        )}
      </div>

      {/* Tribal guess */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Tribal Council Guess</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Who do you think gets voted out this episode? Correct guess = +5 bonus points next week.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => setGuessId(guessId === player.id ? null : player.id)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium text-left transition-all ${
                guessId === player.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              {player.name}
            </button>
          ))}
        </div>
        {guessId && (
          <p className="text-xs text-primary mt-3">
            Guessing: {players.find((p) => p.id === guessId)?.name}
          </p>
        )}
      </div>

      {/* Point allocation */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Point Allocation</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Spread your {budget} points across any castaways. You can stack multiple points on one player.
        </p>

        <div className="space-y-6">
          {tribeNames.map((tribe, tIdx) => (
            <div key={tribe}>
              {(() => {
                const ts = TRIBE_STYLES[tribe] ?? DEFAULT_TRIBE_STYLE;
                return (
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ts.dot}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${ts.label}`}>{tribe}</span>
                    <div className={`flex-1 h-px ${ts.divider}`} />
                  </div>
                );
              })()}
              <div className="space-y-2">
                {byTribe[tribe].map((player) => {
                  const pts = allocations[player.id] || 0;
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                        pts > 0
                          ? "border-primary/40 bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <PlayerAvatar player={player} size={32} />
                      <span className="flex-1 text-sm font-medium text-foreground truncate">
                        {player.name}
                      </span>
                      {guessId === player.id && (
                        <Badge className="bg-primary/15 text-primary border-primary/30 text-xs shrink-0">
                          Predicted
                        </Badge>
                      )}
                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => decrement(player.id)}
                          disabled={pts <= 0}
                          className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground disabled:opacity-30 text-lg leading-none transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={budget}
                          value={pts === 0 ? "" : pts}
                          placeholder="0"
                          onChange={(e) => setAllocation(player.id, e.target.value)}
                          className="w-10 text-center bg-transparent text-foreground font-bold tabular-nums text-sm focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => increment(player.id)}
                          disabled={remaining <= 0}
                          className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground disabled:opacity-30 text-lg leading-none transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="sticky bottom-4 pt-4">
        <div className="gradient-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {totalAllocated} / {budget} points allocated
            </p>
            <p className="text-xs text-muted-foreground">
              {guessId ? `Guessing: ${players.find((p) => p.id === guessId)?.name}` : "No tribal guess"}
            </p>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-11 shrink-0"
          >
            {isSubmitting ? "Saving..." : "Save Picks"}
          </Button>
        </div>
      </div>
    </form>
  );
}
