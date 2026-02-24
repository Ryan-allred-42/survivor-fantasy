"use client";

import { useState } from "react";
import { markEpisodeComplete } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function EpisodeManager({ episodes, players }) {
  const [loadingId, setLoadingId] = useState(null);
  const [selections, setSelections] = useState({});

  async function handleResolve(episodeId) {
    const eliminatedPlayerId = selections[episodeId];
    if (!eliminatedPlayerId) {
      toast.error("Select the eliminated player first");
      return;
    }

    setLoadingId(episodeId);
    const result = await markEpisodeComplete({ episodeId, eliminatedPlayerId });
    setLoadingId(null);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`Episode resolved! Processed ${result.processed} picks.`);
    }
  }

  const activePlayers = players.filter((p) => p.is_active);

  return (
    <div className="space-y-3">
      {episodes.map((ep) => (
        <div key={ep.id} className="gradient-card border border-border rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-foreground">Episode {ep.week_number}</span>
              {ep.air_date && (
                <span className="text-xs text-muted-foreground">
                  {new Date(ep.air_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {ep.is_complete ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                  Complete — {ep.survivor_players?.name}
                </Badge>
              ) : ep.is_locked ? (
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">Locked</Badge>
              ) : (
                <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Open</Badge>
              )}
            </div>

            {!ep.is_complete && (
              <div className="flex items-center gap-2">
                <Select
                  value={selections[ep.id] ?? ""}
                  onValueChange={(val) => setSelections((prev) => ({ ...prev, [ep.id]: val }))}
                >
                  <SelectTrigger className="w-48 bg-input border-border text-foreground text-sm">
                    <SelectValue placeholder="Select eliminated..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {activePlayers.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-sm">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => handleResolve(ep.id)}
                  disabled={loadingId === ep.id || !selections[ep.id]}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
                >
                  {loadingId === ep.id ? "Processing..." : "Resolve"}
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
