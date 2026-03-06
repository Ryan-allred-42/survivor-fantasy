"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { submitPicks } from "@/actions/picks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PlayerAvatar from "@/components/PlayerAvatar";

function checkIsLocked(lockTime) {
  if (!lockTime) return true;
  return new Date() >= new Date(lockTime);
}

// Format a lock time as "Wed, Feb 26 at 8:00 PM ET"
function formatDeadline(lockTime) {
  if (!lockTime) return "";
  return new Date(lockTime).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

// Warm ember card style (matches dashboard league cards)
const WARM_CARD = {
  background: "linear-gradient(135deg, oklch(0.18 0.06 35), oklch(0.13 0.04 35))",
  borderColor: "oklch(0.38 0.12 38 / 0.50)",
  boxShadow:   "0 0 18px oklch(0.65 0.22 38 / 0.07)",
};

// Step indicator badge
function StepBadge({ n, label, sublabel, active = true }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
          active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        {n}
      </div>
      <div>
        <p className={`text-sm font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}

const TRIBE_COLORS = {
  Cila: { dot: "bg-orange-500",  text: "text-orange-400",  border: "border-orange-500/30", bg: "bg-orange-500/5"   },
  Kalo: { dot: "bg-teal-500",    text: "text-teal-400",    border: "border-teal-500/30",   bg: "bg-teal-500/5"    },
  Vatu: { dot: "bg-fuchsia-500", text: "text-fuchsia-400", border: "border-fuchsia-500/30",bg: "bg-fuchsia-500/5" },
};
const DEFAULT_TRIBE = { dot: "bg-muted", text: "text-muted-foreground", border: "border-border", bg: "" };
function tribeStyle(tribe) { return TRIBE_COLORS[tribe] ?? DEFAULT_TRIBE; }

// ─────────────────────────────────────────────────────────────
// Boot Pick Modal
// ─────────────────────────────────────────────────────────────
function BootPickModal({ players, guess, setGuess, onClose }) {
  const activePlayers = players.filter((p) => p.is_active);
  const TRIBE_ORDER = ["Cila", "Kalo", "Vatu"];
  const tribes = [...new Set(activePlayers.map((p) => p.tribe || "Unknown"))];
  const orderedTribes = [
    ...TRIBE_ORDER.filter((t) => tribes.includes(t)),
    ...tribes.filter((t) => !TRIBE_ORDER.includes(t)),
  ];

  function pick(playerId) {
    setGuess(playerId);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl border w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={WARM_CARD}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-foreground text-base">🔮 Boot Pick</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Who gets voted out? Correct = +5 pts next week</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Clear pick option */}
          <button
            onClick={() => pick(null)}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-medium text-left transition-all ${
              !guess ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-white/10 text-muted-foreground hover:border-white/25"
            }`}
          >
            No guess this week
          </button>

          {orderedTribes.map((tribe) => {
            const ts = tribeStyle(tribe);
            const tribePlayers = activePlayers.filter((p) => p.tribe === tribe);
            return (
              <div key={tribe}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${ts.dot}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${ts.text}`}>{tribe}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {tribePlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => pick(p.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all flex items-center gap-2.5 ${
                        guess === p.id
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-white/10 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      <PlayerAvatar player={p} size={28} />
                      <span className="text-xs font-medium truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Boot Guess history row (Step 1)
// ─────────────────────────────────────────────────────────────
function BootGuessRow({ episodes, players, userPicksMap, currentEpisodeId, openEpisode, guess, setGuess, onCompare }) {
  const [bootModalOpen, setBootModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={WARM_CARD}
    >
      {/* Ember corner glow */}
      <div
        className="absolute pointer-events-none inset-0 rounded-2xl"
        style={{ background: "radial-gradient(ellipse 60% 50% at 100% 100%, oklch(0.65 0.22 38 / 0.09) 0%, transparent 65%)" }}
      />

      <div className="relative p-5">
        {/* Step header */}
        <div className="flex items-center justify-between mb-4">
          <StepBadge
            n="1"
            label="Boot Pick"
            sublabel={openEpisode ? "Tap the current episode to pick who gets voted out" : "Who did you think got voted out?"}
            active={openEpisode}
          />
          {openEpisode && guess && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-primary/50 bg-primary/10 text-xs font-medium text-primary shrink-0">
              <span>🔮</span>
              {players.find((p) => p.id === guess)?.name ?? "?"}
            </div>
          )}
        </div>

        {/* Episode cards — horizontal scrollable */}
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-2.5 pb-1" style={{ minWidth: "max-content" }}>
            {episodes.map((ep) => {
              const pick = userPicksMap[ep.id];
              const guessedPlayer = pick?.guess ? players.find((p) => p.id === pick.guess) : null;
              const isCurrent = ep.id === currentEpisodeId;
              const isLocked = mounted && (checkIsLocked(ep.lock_time) || ep.is_complete);
              const canCompare = isLocked;
              const correct = pick?.guessCorrect;
              const hasPick = pick?.guess != null;
              const canPickBoot = isCurrent && openEpisode;

              let borderCls = "border-white/10";
              let bgCls = "bg-white/5";
              if (canPickBoot)                 { borderCls = "border-primary/40"; bgCls = "bg-primary/10"; }
              else if (correct === true)       { borderCls = "border-emerald-500/40"; bgCls = "bg-emerald-500/8"; }
              else if (correct === false)      { borderCls = "border-destructive/30"; bgCls = "bg-destructive/8"; }
              else if (isCurrent && isLocked)  { borderCls = "border-amber-500/30";   bgCls = "bg-amber-500/8"; }

              const isClickable = canPickBoot || canCompare;

              return (
                <div
                  key={ep.id}
                  className={`relative rounded-xl border ${borderCls} ${bgCls} p-3 w-[96px] shrink-0 flex flex-col gap-1.5 transition-all ${
                    isClickable ? "cursor-pointer hover:border-primary/40 group" : ""
                  }`}
                  onClick={canPickBoot ? () => setBootModalOpen(true) : canCompare ? () => onCompare(ep.id) : undefined}
                  title={canPickBoot ? "Pick who gets voted out" : canCompare ? "Compare everyone's picks" : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                      Ep {ep.week_number}
                    </span>
                    {correct === true  && <span className="text-emerald-400 text-xs">✓</span>}
                    {correct === false && <span className="text-destructive text-xs">✗</span>}
                    {canPickBoot && <span className="text-primary text-[10px]">now</span>}
                    {isCurrent && isLocked && !ep.is_complete && <span className="text-amber-400 text-[10px]">🔒</span>}
                  </div>

                  {canPickBoot ? (
                    <div className="flex-1">
                      {guess ? (
                        <>
                          {(() => {
                            const guessPlayer = players.find((p) => p.id === guess);
                            return guessPlayer ? (
                              <div className="flex justify-center mb-1">
                                <PlayerAvatar player={guessPlayer} size={32} />
                              </div>
                            ) : null;
                          })()}
                          <p className="text-[10px] text-primary font-medium text-center leading-tight line-clamp-2">
                            {players.find((p) => p.id === guess)?.name}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-primary/60 text-center italic mt-1">tap to pick</p>
                      )}
                    </div>
                  ) : hasPick ? (
                    <div className="flex-1">
                      {guessedPlayer && (
                        <div className="flex justify-center mb-1">
                          <PlayerAvatar player={guessedPlayer} size={32} />
                        </div>
                      )}
                      <p className={`text-[10px] font-medium text-center leading-tight line-clamp-2 ${
                        correct === true ? "text-emerald-400" : correct === false ? "text-destructive/70" : "text-muted-foreground"
                      }`}>
                        {guessedPlayer?.name ?? "?"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/40 text-center italic mt-1 flex-1">—</p>
                  )}

                  {canCompare && (
                    <p className="text-[9px] text-primary/60 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      compare
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Boot pick modal */}
      {bootModalOpen && (
        <BootPickModal
          players={players}
          guess={guess}
          setGuess={setGuess}
          onClose={() => setBootModalOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Comparison Modal
// ─────────────────────────────────────────────────────────────
function CompareModal({ episode, players, allMembersPicksMap, currentUserId, onClose }) {
  const episodePicks = allMembersPicksMap?.[episode.id] ?? {};

  const entries = Object.entries(episodePicks).sort(([aId], [bId]) => {
    if (aId === currentUserId) return -1;
    if (bId === currentUserId) return 1;
    return 0;
  });

  const eliminatedPlayer = episode.eliminated_player_id
    ? players.find((p) => p.id === episode.eliminated_player_id)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl border w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={WARM_CARD}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-foreground text-base">Episode {episode.week_number} — Everyone's Picks</h2>
            {episode.air_date && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(episode.air_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {eliminatedPlayer && (
          <div className="mx-5 mt-4 flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 shrink-0">
            <PlayerAvatar player={eliminatedPlayer} size={32} />
            <div>
              <p className="text-xs text-destructive/80 uppercase tracking-wider font-bold">Voted Out</p>
              <p className="text-sm font-semibold text-foreground">{eliminatedPlayer.name}</p>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {entries.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No picks were submitted for this episode.</p>
          )}
          {entries.map(([userId, data]) => {
            const isMe = userId === currentUserId;
            const guessedPlayer = data.guess ? players.find((p) => p.id === data.guess) : null;
            const topAllocs = Object.entries(data.allocations ?? {})
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([pid, pts]) => ({ player: players.find((p) => p.id === pid), pts }))
              .filter((a) => a.player);

            return (
              <div key={userId} className={`rounded-xl border p-4 ${isMe ? "border-primary/35 bg-primary/5" : "border-white/10 bg-white/3"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground"}`}>
                    {data.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {data.displayName}
                    {isMe && <span className="ml-1.5 text-primary text-xs font-normal">(you)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold w-16 shrink-0">Boot Pick</span>
                  {guessedPlayer ? (
                    <div className="flex items-center gap-1.5">
                      <PlayerAvatar player={guessedPlayer} size={20} />
                      <span className={`text-xs font-medium ${data.guessCorrect === true ? "text-emerald-400" : data.guessCorrect === false ? "text-destructive/70" : "text-foreground"}`}>
                        {guessedPlayer.name}
                      </span>
                      {data.guessCorrect === true  && <span className="text-emerald-400 text-xs">✓</span>}
                      {data.guessCorrect === false && <span className="text-destructive text-xs">✗</span>}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50 italic">No pick</span>
                  )}
                </div>

                {topAllocs.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold w-16 shrink-0 mt-0.5">Points</span>
                    <div className="flex flex-wrap gap-1.5">
                      {topAllocs.map(({ player, pts }) => {
                        const ts = tribeStyle(player.tribe);
                        return (
                          <div key={player.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border ${ts.border} ${ts.bg}`}>
                            <span className={`text-[10px] font-semibold ${ts.text}`}>{player.name.split(" ")[0]}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums font-bold">{pts}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {topAllocs.length === 0 && !guessedPlayer && (
                  <p className="text-xs text-muted-foreground/50 italic">No picks submitted</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function WeeklyAllocationsTable({
  players,
  episodes,
  userPicksMap,
  currentEpisodeId,
  leagueId,
  mulliganUsed,
  allMembersPicksMap = {},
  currentUserId,
}) {
  const currentPick = currentEpisodeId ? userPicksMap[currentEpisodeId] : null;

  const [allocations, setAllocations] = useState(currentPick?.allocations ?? {});
  const [guess, setGuess] = useState(currentPick?.guess ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compareEpisodeId, setCompareEpisodeId] = useState(null);
  const [savedAt, setSavedAt] = useState(
    // Pre-populate if picks were already saved server-side
    currentPick && (currentPick.totalAllocated > 0 || currentPick.guess) ? "loaded" : null
  );

  // mounted prevents SSR/hydration mismatch from Date.now() in checkIsLocked
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const budget = currentPick?.budget ?? 10;
  const totalAllocated = Object.values(allocations).reduce((s, v) => s + (v || 0), 0);
  const remaining = budget - totalAllocated;

  const currentEpisode = episodes.find((e) => e.id === currentEpisodeId);
  const openEpisode = mounted && currentEpisode && !currentEpisode.is_complete && !checkIsLocked(currentEpisode.lock_time);
  const currentIsLocked = mounted && currentEpisode && !currentEpisode.is_complete && checkIsLocked(currentEpisode.lock_time);
  const hasAnyEpisode = episodes.length > 0;

  const compareEpisode = compareEpisodeId ? episodes.find((e) => e.id === compareEpisodeId) : null;

  function setAlloc(playerId, val) {
    const num = Math.max(0, parseInt(val) || 0);
    const othersTotal = totalAllocated - (allocations[playerId] || 0);
    const clamped = Math.min(num, budget - othersTotal);
    setAllocations((prev) => ({ ...prev, [playerId]: clamped }));
  }

  function inc(playerId) {
    if (remaining <= 0) return;
    setAllocations((prev) => ({ ...prev, [playerId]: (prev[playerId] || 0) + 1 }));
  }

  function dec(playerId) {
    if ((allocations[playerId] || 0) <= 0) return;
    setAllocations((prev) => ({ ...prev, [playerId]: prev[playerId] - 1 }));
  }

  async function handleSave() {
    if (!currentEpisodeId) return;
    setIsSubmitting(true);
    const allocationArray = Object.entries(allocations)
      .filter(([, pts]) => pts > 0)
      .map(([playerId, points]) => ({ playerId, points }));

    const result = await submitPicks({
      leagueId,
      episodeId: currentEpisodeId,
      guessedEliminatedPlayerId: guess,
      allocations: allocationArray,
    });
    setIsSubmitting(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      setSavedAt(new Date());
      toast.success("Picks saved! You can still edit until the deadline.");
    }
  }

  // Table: group players by tribe
  const TRIBE_ORDER = ["Cila", "Kalo", "Vatu"];
  const tribes = [...new Set(players.map((p) => p.tribe || "Unknown"))];
  const orderedTribes = [
    ...TRIBE_ORDER.filter((t) => tribes.includes(t)),
    ...tribes.filter((t) => !TRIBE_ORDER.includes(t)),
  ];
  const byTribe = orderedTribes.reduce((acc, tribe) => {
    acc[tribe] = players.filter((p) => p.tribe === tribe);
    return acc;
  }, {});

  function playerTotal(playerId) {
    return Object.values(userPicksMap).reduce((sum, pick) => sum + (pick.allocations?.[playerId] || 0), 0);
  }

  function cellClass(pts) {
    return pts ? "text-foreground font-semibold" : "text-muted-foreground/40";
  }

  return (
    <div className="space-y-3">

      {/* ── No episode banners ─────────────────────────────── */}
      {!hasAnyEpisode && (
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm font-semibold text-amber-400 mb-1">Episode schedule not set up yet</p>
          <p className="text-xs text-muted-foreground">An admin needs to run the episode schedule migration in Supabase.</p>
        </div>
      )}

      {hasAnyEpisode && currentIsLocked && (
        <div className="border border-amber-500/30 rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: "oklch(0.15 0.04 45 / 0.6)" }}>
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-foreground">Episode {currentEpisode.week_number} picks are locked</p>
            <p className="text-xs text-muted-foreground mt-0.5">Waiting for results. Click any episode card above to compare picks.</p>
          </div>
        </div>
      )}

      {/* ── Step 1: Boot Pick ──────────────────────────────── */}
      {hasAnyEpisode && (
        <div className="relative">
          <BootGuessRow
            episodes={episodes}
            players={players}
            userPicksMap={userPicksMap}
            currentEpisodeId={currentEpisodeId}
            openEpisode={openEpisode}
            guess={guess}
            setGuess={setGuess}
            onCompare={setCompareEpisodeId}
          />
        </div>
      )}

      {/* Step connector — only when picks are open */}
      {openEpisode && (
        <div className="flex items-center gap-3 px-4">
          <div className="w-7 flex justify-center">
            <div className="w-0.5 h-6 bg-primary/25" />
          </div>
          <p className="text-xs text-muted-foreground/50">then</p>
        </div>
      )}

      {/* ── Step 2: Point Allocation ───────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={WARM_CARD}>
        {/* Step 2 header + budget */}
        <div className="relative p-5 border-b" style={{ borderColor: "oklch(0.38 0.12 38 / 0.30)" }}>
          {/* Ember glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 50% 80% at 100% 50%, oklch(0.65 0.22 38 / 0.07) 0%, transparent 65%)" }}
          />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <StepBadge
              n="2"
              label="Point Allocation"
              sublabel={openEpisode
                ? `Distribute up to ${budget} pts across any active players`
                : "Your season-wide point allocations"}
              active={openEpisode}
            />

            {openEpisode && (
              <div className="sm:ml-auto flex items-center gap-3 min-w-[160px]">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Budget</span>
                    <span className="text-sm font-black text-gradient tabular-nums">
                      {remaining}<span className="text-xs text-muted-foreground font-normal"> / {budget}</span>
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-200"
                      style={{ width: `${Math.min(100, (totalAllocated / budget) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {openEpisode && !mulliganUsed && totalAllocated === 0 && (
            <p className="relative text-xs text-amber-400/70 mt-3">
              💡 Mulligan available — submitting 0 pts this week gives +10 pts next week.
            </p>
          )}
        </div>

        {/* Allocation table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.38 0.12 38 / 0.25)" }}>
                <th
                  className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide sticky left-0 z-10 min-w-[170px]"
                  style={{ background: "oklch(0.15 0.05 36)", boxShadow: "2px 0 8px -2px rgba(0,0,0,0.5)" }}
                >
                  Player
                </th>
                {episodes.map((ep) => {
                  const isCurrent = ep.id === currentEpisodeId;
                  const isPast = ep.is_complete;
                  return (
                    <th
                      key={ep.id}
                      className={`px-1 py-3 text-center font-semibold text-xs w-12 ${
                        isCurrent ? "text-primary" : isPast ? "text-muted-foreground" : "text-muted-foreground/30"
                      }`}
                      style={isCurrent ? { background: "oklch(0.65 0.22 38 / 0.08)" } : {}}
                    >
                      {isCurrent ? (
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="text-primary">Ep {ep.week_number}</span>
                          <span className="text-[10px] font-normal text-primary/60">← now</span>
                        </span>
                      ) : `Ep ${ep.week_number}`}
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-right font-semibold text-xs text-muted-foreground uppercase tracking-wide w-14">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {orderedTribes.map((tribe) => {
                const ts = tribeStyle(tribe);
                const tribePlayers = byTribe[tribe] ?? [];

                return [
                  <tr key={`tribe-${tribe}`} className={ts.bg}>
                    <td
                      colSpan={episodes.length + 2}
                      className={`px-4 py-1.5 sticky left-0 z-10 ${ts.bg}`}
                      style={{ boxShadow: "2px 0 8px -2px rgba(0,0,0,0.5)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ts.dot}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${ts.text}`}>{tribe}</span>
                      </div>
                    </td>
                  </tr>,

                  ...tribePlayers.map((player) => {
                    const isEliminated = !player.is_active;
                    const currentPts = allocations[player.id] || 0;
                    const total = playerTotal(player.id);

                    return (
                      <tr
                        key={player.id}
                        className={`transition-colors ${isEliminated ? "opacity-40" : "hover:bg-white/3"}`}
                        style={{ borderTop: "1px solid oklch(0.38 0.12 38 / 0.15)" }}
                      >
                        <td
                          className="px-4 py-2.5 sticky left-0 z-10"
                          style={{ background: "oklch(0.15 0.05 36)", boxShadow: "2px 0 8px -2px rgba(0,0,0,0.5)" }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar player={player} size={28} />
                            <span className={`text-xs font-medium truncate ${isEliminated ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {player.name}
                            </span>
                          </div>
                        </td>

                        {episodes.map((ep) => {
                          const isCurrent = ep.id === currentEpisodeId;
                          const pastPts = userPicksMap[ep.id]?.allocations?.[player.id] || 0;
                          const isEliminatedThisEp = ep.is_complete && ep.eliminated_player_id === player.id;

                          if (isCurrent && openEpisode && !isEliminated) {
                            return (
                              <td key={ep.id} className="px-1 py-1.5 text-center" style={{ background: "oklch(0.65 0.22 38 / 0.06)" }}>
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    onClick={() => dec(player.id)}
                                    disabled={currentPts <= 0}
                                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 disabled:opacity-20 text-base leading-none transition-colors"
                                  >−</button>
                                  <input
                                    type="number" min={0} max={budget}
                                    value={currentPts || ""}
                                    placeholder="0"
                                    onChange={(e) => setAlloc(player.id, e.target.value)}
                                    className="w-7 text-center bg-transparent text-foreground font-bold tabular-nums text-xs focus:outline-none"
                                  />
                                  <button
                                    onClick={() => inc(player.id)}
                                    disabled={remaining <= 0}
                                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 disabled:opacity-20 text-base leading-none transition-colors"
                                  >+</button>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={ep.id}
                              className={`px-1 py-2.5 text-center ${isEliminatedThisEp ? "bg-destructive/5" : ""}`}
                            >
                              {isEliminatedThisEp ? (
                                <span className="text-destructive/60 text-[10px]" title="Eliminated">✗</span>
                              ) : (
                                <span className={`tabular-nums text-xs ${cellClass(pastPts || (isCurrent ? currentPts : 0))}`}>
                                  {isCurrent
                                    ? currentPts > 0 ? currentPts : <span className="text-muted-foreground/30">—</span>
                                    : pastPts > 0 ? pastPts : <span className="text-muted-foreground/30">—</span>}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-3 py-2.5 text-right">
                          <span className={`tabular-nums text-xs font-bold ${total > 0 ? "text-foreground" : "text-muted-foreground/30"}`}>
                            {total > 0 ? total : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>

        {/* ── Save bar ──────────────────────────────────────── */}
        {openEpisode && (
          <div
            className="relative px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
            style={{ borderTop: "1px solid oklch(0.38 0.12 38 / 0.30)", background: "oklch(0.14 0.05 35 / 0.8)" }}
          >
            {/* Summary + saved state */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalAllocated}</span> / {budget} pts allocated
                </span>
                {guess && (
                  <span className="text-xs text-primary/80">
                    · boot pick: <span className="font-semibold">{players.find((p) => p.id === guess)?.name}</span>
                  </span>
                )}
              </div>
              {savedAt ? (
                <p className="text-xs text-emerald-400/80 mt-0.5 flex items-center gap-1">
                  <span>✓</span>
                  <span>
                    {savedAt === "loaded" ? "Picks saved from before" : `Saved at ${savedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                    {" · "}editable until <span className="font-medium">{mounted ? formatDeadline(currentEpisode?.lock_time) : "deadline"}</span>
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Deadline: {mounted ? formatDeadline(currentEpisode?.lock_time) : "…"}
                </p>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="shrink-0 font-bold px-6 h-10"
              style={{
                background: savedAt ? "oklch(0.55 0.18 150)" : undefined,
              }}
            >
              {isSubmitting ? "Saving…" : savedAt && savedAt !== "loaded" ? "✓ Update Picks" : "Save Picks"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Compare Modal ───────────────────────────────────── */}
      {compareEpisode && (
        <CompareModal
          episode={compareEpisode}
          players={players}
          allMembersPicksMap={allMembersPicksMap}
          currentUserId={currentUserId}
          onClose={() => setCompareEpisodeId(null)}
        />
      )}
    </div>
  );
}
