/**
 * Tests for the new surviving-players scoring model.
 *
 * New model: when player X is voted out (placement P, multiplier M),
 * each user earns: sum(points on surviving players) × M
 * Points on the eliminated player do NOT score.
 *
 * Run: node --test __tests__/scoring.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeEpisodeScore } from "../lib/scoring-utils.js";

// ─── Multiplier table (subset of FULL_SEASON_MULTIPLIERS for reference) ──────
// placement 1 → 1×, placement 5 → 5×, placement 10 → 14×, placement 24 → 100×

describe("computeEpisodeScore — basic cases", () => {
  test("returns 0 when no allocations", () => {
    const score = computeEpisodeScore([], ["player-out"], 5);
    assert.equal(score, 0);
  });

  test("returns 0 when all allocation is on the eliminated player", () => {
    const allocations = [{ player_id: "player-out", points: 10 }];
    const score = computeEpisodeScore(allocations, ["player-out"], 5);
    assert.equal(score, 0);
  });

  test("counts points on a surviving player × multiplier", () => {
    const allocations = [
      { player_id: "survivor-1", points: 7 },
      { player_id: "player-out", points: 3 },
    ];
    // Only survivor-1's 7 points score. Multiplier = 4.
    const score = computeEpisodeScore(allocations, ["player-out"], 4);
    assert.equal(score, 28); // 7 × 4
  });

  test("sums points across multiple surviving players", () => {
    const allocations = [
      { player_id: "survivor-1", points: 4 },
      { player_id: "survivor-2", points: 3 },
      { player_id: "player-out", points: 3 },
    ];
    // 4 + 3 = 7 surviving points. Multiplier = 2.
    const score = computeEpisodeScore(allocations, ["player-out"], 2);
    assert.equal(score, 14); // 7 × 2
  });

  test("all points on surviving players score in full", () => {
    const allocations = [
      { player_id: "survivor-1", points: 5 },
      { player_id: "survivor-2", points: 5 },
    ];
    const score = computeEpisodeScore(allocations, ["player-out"], 3);
    assert.equal(score, 30); // 10 × 3
  });
});

describe("computeEpisodeScore — multi-elimination episodes", () => {
  test("excludes all eliminated players in a double boot", () => {
    const allocations = [
      { player_id: "survivor-1", points: 6 },
      { player_id: "boot-1",     points: 2 },
      { player_id: "boot-2",     points: 2 },
    ];
    // Only 6 points survive. Each boot gets its own resolveEpisode call.
    // Here we test the call for boot-1 (multiplier 3).
    const score = computeEpisodeScore(allocations, ["boot-1", "boot-2"], 3);
    assert.equal(score, 18); // 6 × 3
  });

  test("second elimination in same episode uses same surviving pool", () => {
    const allocations = [
      { player_id: "survivor-1", points: 6 },
      { player_id: "boot-1",     points: 2 },
      { player_id: "boot-2",     points: 2 },
    ];
    // Call for boot-2 (multiplier 5) — same allEliminatedIds, same surviving pool
    const score = computeEpisodeScore(allocations, ["boot-1", "boot-2"], 5);
    assert.equal(score, 30); // 6 × 5
  });
});

describe("computeEpisodeScore — multiplier edge cases", () => {
  test("multiplier 1× (first boot) gives 1× points", () => {
    const allocations = [{ player_id: "survivor-1", points: 10 }];
    const score = computeEpisodeScore(allocations, ["boot"], 1);
    assert.equal(score, 10);
  });

  test("multiplier 100× (winner) gives 100× points", () => {
    const allocations = [{ player_id: "survivor-1", points: 7 }];
    const score = computeEpisodeScore(allocations, ["boot"], 100);
    assert.equal(score, 700);
  });

  test("multiplier 0 gives 0 regardless of allocations", () => {
    const allocations = [{ player_id: "survivor-1", points: 10 }];
    const score = computeEpisodeScore(allocations, ["boot"], 0);
    assert.equal(score, 0);
  });
});

describe("computeEpisodeScore — old model no longer applies", () => {
  test("eliminated player's points are NOT counted (old model would count them)", () => {
    const allocations = [
      { player_id: "player-out", points: 10 }, // all points on the eliminated player
    ];
    // Under OLD model this would be 10 × 5 = 50. Under NEW model it's 0.
    const score = computeEpisodeScore(allocations, ["player-out"], 5);
    assert.equal(score, 0, "eliminated player's points should not score");
  });

  test("survivor with 0 allocation contributes nothing", () => {
    const allocations = [
      { player_id: "survivor-1", points: 0 },
      { player_id: "survivor-2", points: 8 },
      { player_id: "player-out", points: 2 },
    ];
    const score = computeEpisodeScore(allocations, ["player-out"], 6);
    assert.equal(score, 48); // (0 + 8) × 6
  });
});

describe("computeEpisodeScore — real-world scenario", () => {
  test("week 1: first boot (1×), user spread points across survivors", () => {
    // 24-player cast. First boot has placement 1, multiplier 1×.
    // User allocated: 5 on boot, 3 on survivor-A, 2 on survivor-B.
    const allocations = [
      { player_id: "boot",       points: 5 },
      { player_id: "survivor-a", points: 3 },
      { player_id: "survivor-b", points: 2 },
    ];
    const score = computeEpisodeScore(allocations, ["boot"], 1);
    assert.equal(score, 5); // (3+2) × 1
  });

  test("final 5: 5th place boot (42×), all budget on survivors pays big", () => {
    // User put 10 points on a survivor, 0 on the 5th-place boot.
    const allocations = [
      { player_id: "survivor-finalist", points: 10 },
      { player_id: "boot-5th",          points: 0  },
    ];
    const score = computeEpisodeScore(allocations, ["boot-5th"], 42);
    assert.equal(score, 420); // 10 × 42
  });

  test("correct strategy: all points on survivors pays more than old model", () => {
    // Under new model: 10 on survivor × 42 = 420
    // Under old model: 10 on eliminated × 42 = 420 (same total but requires picking the boot)
    // With new model you want to AVOID the boot; here user avoided → scores maximum
    const allocations = [
      { player_id: "survivor-1", points: 6 },
      { player_id: "survivor-2", points: 4 },
    ];
    const score = computeEpisodeScore(allocations, ["boot"], 42);
    assert.equal(score, 420); // 10 × 42
  });
});
