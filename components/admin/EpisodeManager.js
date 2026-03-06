"use client";

import { useState } from "react";
import { markEpisodeComplete, reResolveEpisode } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function EpisodeManager({ episodes, players }) {
  const [loadingId, setLoadingId] = useState(null);
  const [reResolvingId, setReResolvingId] = useState(null);
  const [selections, setSelections] = useState({}); // { [episodeId]: string[] }

  function togglePlayer(episodeId, playerId) {
    setSelections((prev) => {
      const current = prev[episodeId] ?? [];
      const next = current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId];
      return { ...prev, [episodeId]: next };
    });
  }

  async function handleResolve(episodeId) {
    const selected = selections[episodeId] ?? [];
    if (selected.length === 0) {
      toast.error("Select at least one eliminated player");
      return;
    }

    setLoadingId(episodeId);
    const result = await markEpisodeComplete({ episodeId, eliminatedPlayerIds: selected });
    setLoadingId(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`Episode resolved! ${selected.length} elimination${selected.length > 1 ? "s" : ""}, ${result.processed} picks processed.`);
      setSelections((prev) => ({ ...prev, [episodeId]: [] }));
    }
  }

  async function handleReResolve(episodeId) {
    setReResolvingId(episodeId);
    const result = await reResolveEpisode(episodeId);
    setReResolvingId(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Episode re-resolved! Scores, guesses, and bonuses recalculated.");
    }
  }

  const activePlayers = players.filter((p) => p.is_active);

  return (
    <div className="space-y-3">
      {episodes.map((ep) => {
        const selected = selections[ep.id] ?? [];
        const eliminatedNames = (ep.eliminated_player_ids ?? [])
          .map((pid) => players.find((p) => p.id === pid)?.name)
          .filter(Boolean);
        const legacyName = ep.survivor_players?.name;

        return (
          <div key={ep.id} className="gradient-card border border-border rounded-2xl p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-foreground">Episode {ep.week_number}</span>
                {ep.air_date && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(ep.air_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                {ep.is_complete ? (
                  <>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                      Complete — {eliminatedNames.length > 0 ? eliminatedNames.join(", ") : legacyName}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReResolve(ep.id)}
                      disabled={reResolvingId === ep.id}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs h-6 px-2"
                    >
                      {reResolvingId === ep.id ? "Re-resolving…" : "Re-resolve"}
                    </Button>
                  </>
                ) : ep.is_locked ? (
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">Locked</Badge>
                ) : (
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Open</Badge>
                )}
              </div>

              {!ep.is_complete && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Select eliminated player(s):</p>
                  <div className="flex flex-wrap gap-2">
                    {activePlayers.map((p) => {
                      const isSelected = selected.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => togglePlayer(ep.id, p.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            isSelected
                              ? "bg-destructive/15 text-destructive border-destructive/40"
                              : "bg-secondary/50 text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                          }`}
                        >
                          {p.name}
                          {isSelected && " ✕"}
                        </button>
                      );
                    })}
                  </div>
                  {selected.length > 0 && (
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-foreground">
                        <span className="font-bold">{selected.length}</span> player{selected.length > 1 ? "s" : ""} selected
                      </p>
                      <Button
                        onClick={() => handleResolve(ep.id)}
                        disabled={loadingId === ep.id}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
                      >
                        {loadingId === ep.id ? "Processing..." : "Resolve Episode"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
