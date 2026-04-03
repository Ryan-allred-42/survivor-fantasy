"use client";

import { useState } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";

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

function ChevronIcon({ expanded, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform ${expanded ? "rotate-180" : ""} ${className}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ComparePlayerModal({ currentUserId, targetUser, completedEpisodes, allMembersPicksMap, players, multipliers, allTimeAllocsMap, remainingMultipliers, onClose }) {
  const [expandedEp, setExpandedEp] = useState(null);
  const [selectedPlayerModal, setSelectedPlayerModal] = useState(null);
  const myName = "You";
  const theirName = targetUser.displayName;

  // Helper: get all eliminated players for an episode
  function getEliminatedPlayers(ep) {
    const ids = ep.eliminated_player_ids?.length > 0
      ? ep.eliminated_player_ids
      : ep.eliminated_player_id ? [ep.eliminated_player_id] : [];
    return ids.map((id) => players.find((p) => p.id === id)).filter(Boolean);
  }

  // Pre-compute per-episode data just for the pick display (no running totals here!)
  const episodeData = [];
  for (const ep of completedEpisodes) {
    const epPicks = allMembersPicksMap[ep.id] ?? {};
    const myPick = epPicks[currentUserId];
    const theirPick = epPicks[targetUser.userId];
    const eliminatedPlayers = getEliminatedPlayers(ep);

    // All players eliminated on or before this episode
    const nonScoringIds = new Set(
      players
        .filter((p) => p.eliminated_week != null && p.eliminated_week <= ep.week_number)
        .map((p) => p.id)
    );

    episodeData.push({ ep, myPick, theirPick, eliminatedPlayers, nonScoringIds });
  }

  // Calculate accrued score for each player across the whole season
  const elimCount = players.filter(p => !p.is_active).length;
  const activeMult = multipliers[elimCount + 1] ?? multipliers[multipliers.length - 1];

  const myAccruedScores = {};
  const theirAccruedScores = {};
  const myTotalAllocs = allTimeAllocsMap[currentUserId] ?? {};
  const theirTotalAllocs = allTimeAllocsMap[targetUser.userId] ?? {};

  for (const p of players) {
    const mult = p.is_active ? activeMult : (multipliers[p.placement] ?? 0);
    const myPts = myTotalAllocs[p.id] ?? 0;
    const theirPts = theirTotalAllocs[p.id] ?? 0;
    
    myAccruedScores[p.id] = { pts: myPts, mult, score: myPts * mult };
    theirAccruedScores[p.id] = { pts: theirPts, mult, score: theirPts * mult };
  }

  // Sort players by total score accrued
  const sortedAccruedPlayers = [...players].sort((a, b) => {
    const scoreB = Math.max(myAccruedScores[b.id].score, theirAccruedScores[b.id].score);
    const scoreA = Math.max(myAccruedScores[a.id].score, theirAccruedScores[a.id].score);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.name.localeCompare(b.name);
  });

  // Calculate myTotal and theirTotal based on THIS math!
  let myTotal = 0;
  let theirTotal = 0;
  for (const p of players) {
    myTotal += myAccruedScores[p.id].score;
    theirTotal += theirAccruedScores[p.id].score;
  }

  const myLeading = myTotal > theirTotal;
  const theirLeading = theirTotal > myTotal;
  const diff = Math.abs(myTotal - theirTotal);

  // Total allocations across all episodes per active player (for the "all episodes" view)
  const activePlayers = players.filter((p) => p.is_active);
  const myTotalAllocs2 = allTimeAllocsMap[currentUserId] ?? {};
  const theirTotalAllocs2 = allTimeAllocsMap[targetUser.userId] ?? {};

  // Compute max potential scenario for each user
  // Pair each user's per-player allocations with the best remaining multipliers
  function computeMaxScenario(userAllocs) {
    const entries = activePlayers
      .map((p) => ({ player: p, pts: userAllocs[p.id] ?? 0 }))
      .filter((e) => e.pts > 0)
      .sort((a, b) => b.pts - a.pts);
    const mults = [...remainingMultipliers]; // already sorted desc
    const result = new Map();
    for (let i = 0; i < entries.length && i < mults.length; i++) {
      result.set(entries[i].player.id, { pts: entries[i].pts, mult: mults[i], score: entries[i].pts * mults[i] });
    }
    return result;
  }
  const myMaxScenario = computeMaxScenario(myTotalAllocs2);
  const theirMaxScenario = computeMaxScenario(theirTotalAllocs2);

  let myMaxTotal = myTotal;
  let theirMaxTotal = theirTotal;
  for (const v of myMaxScenario.values()) myMaxTotal += v.score;
  for (const v of theirMaxScenario.values()) theirMaxTotal += v.score;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl border w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={WARM_CARD}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-foreground text-base">{theirName} vs You</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{completedEpisodes.length} episode{completedEpisodes.length !== 1 ? "s" : ""} completed</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Total score comparison */}
          {completedEpisodes.length > 0 ? (
            <div className="px-5 py-5 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">{myName}</p>
                  <p className={`text-2xl font-black tabular-nums ${myLeading ? "text-emerald-400" : "text-foreground"}`}>{myTotal}</p>
                </div>
                <div className="text-center px-4">
                  <p className="text-[10px] text-muted-foreground/50 uppercase mb-1">vs</p>
                  {diff > 0 && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {myLeading ? "+" : "-"}{diff}
                    </p>
                  )}
                </div>
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{theirName}</p>
                  <p className={`text-2xl font-black tabular-nums ${theirLeading ? "text-emerald-400" : "text-foreground"}`}>{theirTotal}</p>
                </div>
              </div>
              {(myTotal > 0 || theirTotal > 0) && (
                <div className="flex rounded-full overflow-hidden h-2 bg-white/5">
                  <div className="bg-primary transition-all" style={{ width: `${(myTotal / (myTotal + theirTotal)) * 100}%` }} />
                  <div className="bg-muted-foreground/40 transition-all" style={{ width: `${(theirTotal / (myTotal + theirTotal)) * 100}%` }} />
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">No completed episodes yet.</p>
          )}

          {/* Score Accrued by Player */}
          {players.length > 0 && (
            <div className="px-4 pt-4 pb-2">
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="px-4 py-2.5 bg-white/3 border-b border-white/8">
                  <p className="text-xs font-bold text-foreground">Score Accrued by Player</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">Total score each player generated across the season</p>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-4 py-1.5 border-b border-white/6 bg-white/2 text-[9px] text-muted-foreground/50 uppercase tracking-wider font-bold">
                  <span>Player</span>
                  <span className="w-16 text-right text-primary/50">{myName}</span>
                  <span className="w-16 text-right">{theirName}</span>
                </div>
                <div className="divide-y divide-white/5">
                  {sortedAccruedPlayers.map((player) => {
                    const myData = myAccruedScores[player.id];
                    const theirData = theirAccruedScores[player.id];
                    if (myData.score === 0 && theirData.score === 0 && myData.pts === 0 && theirData.pts === 0) return null; // hide irrelevant players

                    const ts = tribeStyle(player.tribe);
                    const isEliminated = !player.is_active;

                    return (
                      <button key={player.id} onClick={() => setSelectedPlayerModal(player)} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-4 py-2 w-full hover:bg-white/5 transition-colors text-left">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-medium truncate ${isEliminated ? "text-muted-foreground/40" : ts.text}`}>
                            {player.name.split(" ")[0]}
                          </span>
                          {isEliminated && <span className="text-[8px] text-muted-foreground/30 uppercase">Out</span>}
                        </div>
                        <div className="w-16 text-right">
                          {myData.pts > 0 ? (
                            <span className="text-[10px] tabular-nums">
                              <span className="text-muted-foreground/50">{myData.pts}×{myData.mult}=</span>
                              <span className="text-primary font-bold">{myData.score}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/20 tabular-nums">0</span>
                          )}
                        </div>
                        <div className="w-16 text-right">
                          {theirData.pts > 0 ? (
                            <span className="text-[10px] tabular-nums">
                              <span className="text-muted-foreground/50">{theirData.pts}×{theirData.mult}=</span>
                              <span className="text-foreground font-bold">{theirData.score}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/20 tabular-nums">0</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Totals row */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-4 py-2 border-t border-white/10 bg-white/3">
                  <span className="text-[10px] font-bold text-foreground uppercase">Total</span>
                  <span className={`w-16 text-right text-xs font-black tabular-nums ${myLeading ? "text-emerald-400" : "text-primary"}`}>{myTotal}</span>
                  <span className={`w-16 text-right text-xs font-black tabular-nums ${theirLeading ? "text-emerald-400" : "text-foreground"}`}>{theirTotal}</span>
                </div>
              </div>
            </div>
          )}

          {/* Episode accordion */}
          <div className="px-4 pt-2 pb-4 space-y-2">
            <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-bold px-1 pt-1">Episode Breakdown</p>
            {episodeData.map(({ ep, myPick, theirPick, eliminatedPlayers, nonScoringIds }) => {
              const isExpanded = expandedEp === ep.id;
              const elimIds = new Set(eliminatedPlayers.map((p) => p.id));
              const activeAtEpisode = players.filter(
                (p) => p.is_active || (p.eliminated_week != null && p.eliminated_week >= ep.week_number)
              );
              const elimNames = eliminatedPlayers.map((p) => p.name).join(", ");

              return (
                <div key={ep.id} className="rounded-xl border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setExpandedEp(isExpanded ? null : ep.id)}
                    className="w-full px-4 py-2.5 flex items-center justify-between bg-white/3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-foreground shrink-0">Ep {ep.week_number}</span>
                      {eliminatedPlayers.length > 0 && (
                        <span className="text-[10px] text-destructive/70 truncate">
                          <span className="font-bold">Out:</span> {elimNames}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ChevronIcon expanded={isExpanded} className="text-muted-foreground/40" />
                    </div>
                  </button>

                  {isExpanded && (
                    <>
                      <div className="grid grid-cols-2 divide-x divide-white/8 border-t border-white/6">
                        {[
                          { label: myName, pick: myPick, isMe: true },
                          { label: theirName, pick: theirPick, isMe: false },
                        ].map(({ label, pick, isMe }) => {
                          const guessPlayer = pick?.guess ? players.find((p) => p.id === pick.guess) : null;
                          const guessIsCorrect = guessPlayer && elimIds.has(guessPlayer.id);
                          return (
                            <div key={label} className="px-3 py-3 space-y-2">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${isMe ? "text-primary" : "text-muted-foreground"}`}>
                                {label}
                              </p>
                              <div>
                                <p className="text-[9px] text-muted-foreground/60 uppercase mb-0.5">Boot Pick</p>
                                {guessPlayer ? (
                                  <div className="flex items-center gap-1.5">
                                    <PlayerAvatar player={guessPlayer} size={18} />
                                    <span className={`text-[11px] font-medium ${
                                      guessIsCorrect ? "text-emerald-400" : "text-destructive/70"
                                    }`}>
                                      {guessPlayer.name.split(" ")[0]}
                                    </span>
                                    {guessIsCorrect ? <span className="text-emerald-400 text-[10px]">✓</span> : <span className="text-destructive text-[10px]">✗</span>}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/40 italic">None</span>
                                )}
                              </div>
                              <div>
                                <p className="text-[9px] text-muted-foreground/60 uppercase mb-0.5">Points</p>
                                <div className="space-y-0.5">
                                  {activeAtEpisode.map((player) => {
                                    const pts = pick?.allocations?.[player.id] ?? 0;
                                    const ts = tribeStyle(player.tribe);
                                    const isNonScoring = nonScoringIds.has(player.id);
                                    const hasPoints = pts > 0;
                                    return (
                                      <div key={player.id} className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded ${
                                        isNonScoring && hasPoints ? "bg-destructive/10 ring-1 ring-destructive/20" : hasPoints ? ts.bg : ""
                                      }`}>
                                        <span className={`text-[10px] truncate ${
                                          isNonScoring ? "text-destructive/70 line-through" : hasPoints ? ts.text : "text-muted-foreground/30"
                                        }`}>
                                          {player.name.split(" ")[0]}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <span className={`text-[10px] tabular-nums font-bold ${
                                            isNonScoring && hasPoints ? "text-destructive/70 line-through" : hasPoints ? "text-foreground" : "text-muted-foreground/20"
                                          }`}>
                                            {pts}
                                          </span>
                                          {!isNonScoring && hasPoints && (
                                            <span className="text-[9px] text-emerald-400/60 tabular-nums font-bold">✓</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              {!pick && <p className="text-[10px] text-muted-foreground/40 italic">No picks</p>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Player Point Allocations Overlay */}
      {selectedPlayerModal && (
        <div className="absolute inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelectedPlayerModal(null); }}>
          <div className="rounded-xl border w-full max-w-sm border-white/10 shadow-2xl overflow-hidden" style={WARM_CARD}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PlayerAvatar player={selectedPlayerModal} size={32} />
                <div>
                  <h3 className="font-bold text-foreground text-sm">{selectedPlayerModal.name}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Point Allocations</p>
                </div>
              </div>
              <button onClick={() => setSelectedPlayerModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">✕</button>
            </div>
            <div className="p-4 bg-white/5">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 mb-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Episode</span>
                <span className="w-12 text-right text-primary/80">{myName}</span>
                <span className="w-12 text-right">{theirName}</span>
              </div>
              <div className="space-y-1">
                {completedEpisodes.map(ep => {
                  const epPicks = allMembersPicksMap[ep.id] ?? {};
                  const myAlloc = epPicks[currentUserId]?.allocations?.[selectedPlayerModal.id] ?? 0;
                  const theirAlloc = epPicks[targetUser.userId]?.allocations?.[selectedPlayerModal.id] ?? 0;
                  
                  if (myAlloc === 0 && theirAlloc === 0 && (selectedPlayerModal.eliminated_week != null && selectedPlayerModal.eliminated_week < ep.week_number)) {
                      return null;
                  }

                  return (
                    <div key={ep.id} className="grid grid-cols-[1fr_auto_auto] gap-4 py-2 px-2 rounded-lg bg-black/20 border border-white/5 items-center">
                      <span className="text-xs font-medium">Ep {ep.week_number}</span>
                      <span className={`w-12 text-right text-xs tabular-nums ${myAlloc > 0 ? "text-primary font-bold" : "text-muted-foreground/30"}`}>{myAlloc || "-"}</span>
                      <span className={`w-12 text-right text-xs tabular-nums ${theirAlloc > 0 ? "text-foreground font-bold" : "text-muted-foreground/30"}`}>{theirAlloc || "-"}</span>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 mt-3 pt-3 border-t border-white/10 px-2 items-center">
                <span className="text-[10px] font-bold uppercase text-foreground tracking-wider">Total Allocated</span>
                <span className="w-12 text-right text-sm font-black tabular-nums text-primary">{myAccruedScores[selectedPlayerModal.id]?.pts || 0}</span>
                <span className="w-12 text-right text-sm font-black tabular-nums text-foreground">{theirAccruedScores[selectedPlayerModal.id]?.pts || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
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
  showMaxPotential = false,
  multipliers = [],
  allTimeAllocsMap = {},
  remainingMultipliers = [],
  memberPickStatusMap = {},
  currentEpisodeNumber = null,
  isLocked = true,
}) {
  const [compareUserId, setCompareUserId] = useState(null);
  const [sortBy, setSortBy] = useState("points");
  const targetUser = compareUserId ? leaderboard.find((e) => e.userId === compareUserId) : null;

  const HIDDEN_USER_IDS = new Set(["5b809d3d-f386-4bd0-9c91-519bc2a99c37"]);

  const sorted = [...leaderboard].filter((e) => !HIDDEN_USER_IDS.has(e.userId)).sort((a, b) => {
    if (sortBy === "max") {
      const maxDiff = (b.maxPotential ?? 0) - (a.maxPotential ?? 0);
      return maxDiff !== 0 ? maxDiff : b.cumulative - a.cumulative;
    }
    const ptsDiff = b.cumulative - a.cumulative;
    return ptsDiff !== 0 ? ptsDiff : (b.maxPotential ?? 0) - (a.maxPotential ?? 0);
  });

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
          {seasonStarted && showMaxPotential && (
            <div className="flex items-center justify-end mt-2">
              <div className="flex items-center gap-0">
                <button
                  onClick={() => setSortBy("points")}
                  className={`w-14 text-center px-1 py-1 rounded-l-md text-[10px] font-semibold transition-colors border ${
                    sortBy === "points"
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/5 border-border/30"
                  }`}
                >
                  Score
                </button>
                <button
                  onClick={() => setSortBy("max")}
                  className={`w-14 text-center px-1 py-1 rounded-r-md text-[10px] font-semibold transition-colors border border-l-0 ${
                    sortBy === "max"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/5 border-border/30"
                  }`}
                >
                  Max
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/40 bg-white/2">
          <span className="w-5 shrink-0" />
          <span className="flex-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">Player</span>
          {currentEpisodeNumber && !isLocked && (
            <span className="shrink-0 w-8 text-center text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 leading-tight">Ep {currentEpisodeNumber}<br />Picks?</span>
          )}
          <div className="shrink-0 flex items-center">
            <span className="w-14 text-right text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">Pts</span>
            {seasonStarted && showMaxPotential && (
              <span className="w-14 text-right text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 pl-2">Max</span>
            )}
            <span className="w-4" />
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {sorted.map((entry, idx) => {
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
                {currentEpisodeNumber && !isLocked && (
                  <div className="shrink-0 w-8 flex justify-center">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        memberPickStatusMap[entry.userId]
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/5 text-muted-foreground/30"
                      }`}
                      title={memberPickStatusMap[entry.userId] ? `Ep ${currentEpisodeNumber} picks submitted` : `Ep ${currentEpisodeNumber} picks not submitted`}
                    >
                      {memberPickStatusMap[entry.userId] ? "✓" : "—"}
                    </span>
                  </div>
                )}
                <div className="shrink-0 flex items-center">
                  {seasonStarted ? (
                    <>
                      <div className="w-14 text-right">
                        <p className={`text-xs font-bold tabular-nums ${sortBy === "points" ? "text-foreground" : "text-muted-foreground"}`}>
                          {Math.round(entry.cumulative)}
                        </p>
                        {entry.lastWeekly > 0 && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">+{Math.round(entry.lastWeekly)}</p>
                        )}
                      </div>
                      {showMaxPotential && entry.maxPotential != null && (
                        <div className="w-14 text-right border-l border-border/30 pl-2">
                          <p className={`text-[10px] tabular-nums font-semibold ${sortBy === "max" ? "text-emerald-400" : "text-emerald-400/50"}`}>
                            {Math.round(entry.maxPotential)}
                          </p>
                          <p className="text-[9px] text-muted-foreground/50">max</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-14 text-right">
                      <p className="text-xs text-muted-foreground">—</p>
                    </div>
                  )}
                  {isClickable && (
                    <span className="text-muted-foreground/40 text-xs ml-1.5">›</span>
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
          multipliers={multipliers}
          allTimeAllocsMap={allTimeAllocsMap}
          remainingMultipliers={remainingMultipliers}
          onClose={() => setCompareUserId(null)}
        />
      )}
    </>
  );
}
