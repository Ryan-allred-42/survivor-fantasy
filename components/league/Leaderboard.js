"use client";

import { useState } from "react";
import Image from "next/image";

const TRIBE_COLORS = {
  Cila: { text: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-500/5" },
  Kalo: { text: "text-teal-400", border: "border-teal-500/30", bg: "bg-teal-500/5" },
  Vatu: { text: "text-fuchsia-400", border: "border-fuchsia-500/30", bg: "bg-fuchsia-500/5" },
};
const DEFAULT_TRIBE = { text: "text-muted-foreground", border: "border-border", bg: "" };
function tribeStyle(tribe) { return TRIBE_COLORS[tribe] ?? DEFAULT_TRIBE; }

const WARM_CARD = {
  background: "linear-gradient(135deg, oklch(0.18 0.06 35), oklch(0.13 0.04 35))",
  borderColor: "oklch(0.38 0.12 38 / 0.50)",
};

function ComparePlayerModal({ currentUserId, targetUser, completedEpisodes, allMembersPicksMap, players, onClose }) {
  const myName = "You";
  const theirName = targetUser.displayName;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl border w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={WARM_CARD}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-foreground text-base">
              {theirName} vs You
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Completed episodes only</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {completedEpisodes.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No completed episodes yet.</p>
          )}

          {completedEpisodes.map((ep) => {
            const epPicks = allMembersPicksMap[ep.id] ?? {};
            const myPick = epPicks[currentUserId];
            const theirPick = epPicks[targetUser.userId];
            const eliminatedPlayer = ep.eliminated_player_id
              ? players.find((p) => p.id === ep.eliminated_player_id)
              : null;

            return (
              <div key={ep.id} className="rounded-xl border border-white/10 overflow-hidden">
                {/* Episode header */}
                <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between bg-white/3">
                  <span className="text-xs font-bold text-foreground">Episode {ep.week_number}</span>
                  {eliminatedPlayer && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-destructive/70 uppercase font-bold">Out:</span>
                      <span className="text-xs text-destructive/80 font-medium">{eliminatedPlayer.name}</span>
                    </div>
                  )}
                </div>

                {/* Side by side picks */}
                <div className="grid grid-cols-2 divide-x divide-white/8">
                  {[
                    { label: myName, pick: myPick, isMe: true },
                    { label: theirName, pick: theirPick, isMe: false },
                  ].map(({ label, pick, isMe }) => {
                    const guessPlayer = pick?.guess ? players.find((p) => p.id === pick.guess) : null;
                    const topAllocs = Object.entries(pick?.allocations ?? {})
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([pid, pts]) => ({ player: players.find((p) => p.id === pid), pts }))
                      .filter((a) => a.player);

                    return (
                      <div key={label} className="px-3 py-3 space-y-2">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isMe ? "text-primary" : "text-muted-foreground"}`}>
                          {label}
                        </p>

                        {/* Boot guess */}
                        <div>
                          <p className="text-[9px] text-muted-foreground/60 uppercase mb-0.5">Boot Pick</p>
                          {guessPlayer ? (
                            <div className="flex items-center gap-1.5">
                              {guessPlayer.photo_url && (
                                <Image src={guessPlayer.photo_url} alt="" width={18} height={18} className="rounded-full object-cover" />
                              )}
                              <span className={`text-[11px] font-medium ${
                                pick.guessCorrect === true ? "text-emerald-400" : pick.guessCorrect === false ? "text-destructive/70" : "text-foreground"
                              }`}>
                                {guessPlayer.name.split(" ")[0]}
                              </span>
                              {pick.guessCorrect === true && <span className="text-emerald-400 text-[10px]">✓</span>}
                              {pick.guessCorrect === false && <span className="text-destructive text-[10px]">✗</span>}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/40 italic">None</span>
                          )}
                        </div>

                        {/* Allocations */}
                        {topAllocs.length > 0 && (
                          <div>
                            <p className="text-[9px] text-muted-foreground/60 uppercase mb-0.5">Points</p>
                            <div className="space-y-0.5">
                              {topAllocs.map(({ player, pts }) => {
                                const ts = tribeStyle(player.tribe);
                                const isOnEliminated = player.id === ep.eliminated_player_id;
                                return (
                                  <div key={player.id} className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded ${ts.bg}`}>
                                    <span className={`text-[10px] truncate ${isOnEliminated ? "text-primary font-semibold" : ts.text}`}>
                                      {player.name.split(" ")[0]}
                                    </span>
                                    <span className={`text-[10px] tabular-nums font-bold shrink-0 ${isOnEliminated ? "text-primary" : "text-foreground"}`}>
                                      {pts}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {!pick && (
                          <p className="text-[10px] text-muted-foreground/40 italic">No picks</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard({
  leaderboard,
  currentUserId,
  seasonStarted,
  joinCode,
  completedEpisodes,
  allMembersPicksMap,
  players,
}) {
  const [compareUserId, setCompareUserId] = useState(null);
  const targetUser = compareUserId ? leaderboard.find((e) => e.userId === compareUserId) : null;

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden border"
        style={{
          background: "linear-gradient(135deg, oklch(0.18 0.06 35), oklch(0.13 0.04 35))",
          borderColor: "oklch(0.38 0.12 38 / 0.50)",
        }}
      >
        <div className="px-4 py-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground text-sm">Leaderboard</h2>
            <span className="text-[10px] text-muted-foreground">{leaderboard.length} {leaderboard.length === 1 ? "member" : "members"}</span>
          </div>
          {!seasonStarted && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Scores appear once episodes resolve</p>
          )}
        </div>
        <div className="divide-y divide-border/30">
          {leaderboard.map((entry, idx) => {
            const isMe = entry.userId === currentUserId;
            const isClickable = !isMe && completedEpisodes.length > 0;
            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isMe ? "bg-primary/5" : ""
                } ${isClickable ? "hover:bg-white/5 cursor-pointer" : ""}`}
                onClick={isClickable ? () => setCompareUserId(entry.userId) : undefined}
              >
                <span className={`text-sm font-black w-5 text-center shrink-0 ${
                  idx === 0 ? "text-amber-400" : idx === 1 ? "text-zinc-400" : idx === 2 ? "text-amber-700" : "text-muted-foreground"
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {entry.displayName}
                    {isMe && <span className="ml-1 text-primary font-normal">(you)</span>}
                  </p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  {seasonStarted ? (
                    <div>
                      <p className="text-xs font-bold text-foreground tabular-nums">{entry.cumulative.toFixed(1)}</p>
                      {entry.lastWeekly > 0 && (
                        <p className="text-[10px] text-muted-foreground tabular-nums">+{entry.lastWeekly.toFixed(1)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                  {isClickable && (
                    <span className="text-muted-foreground/40 text-xs">›</span>
                  )}
                </div>
              </div>
            );
          })}
          {leaderboard.length === 0 && (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">No members yet.</p>
          )}
        </div>
        {leaderboard.length <= 1 && (
          <div className="px-4 py-3 border-t border-border/40 text-center">
            <p className="text-[10px] text-muted-foreground mb-1.5">Invite friends to join with code:</p>
            <span className="font-mono text-sm font-bold text-primary tracking-widest bg-primary/10 border border-primary/25 px-3 py-1 rounded-lg">
              {joinCode}
            </span>
          </div>
        )}
      </div>

      {targetUser && (
        <ComparePlayerModal
          currentUserId={currentUserId}
          targetUser={targetUser}
          completedEpisodes={completedEpisodes}
          allMembersPicksMap={allMembersPicksMap}
          players={players}
          onClose={() => setCompareUserId(null)}
        />
      )}
    </>
  );
}
