import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a random 5-character uppercase alphanumeric join code.
 */
export function generateJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Returns true if the current time is past the episode lock time.
 */
export function isEpisodeLocked(lockTime) {
  return new Date() >= new Date(lockTime);
}

/**
 * Format a date to a readable string in EST.
 */
export function formatEST(date) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Return the next Wednesday at 8pm EST as a Date object.
 * Used when creating episodes without explicit lock_time.
 */
export function nextWednesday8pmEST() {
  const now = new Date();
  const day = now.getDay(); // 0 Sun, 1 Mon … 3 Wed
  const daysUntilWed = ((3 - day + 7) % 7) || 7;
  const wed = new Date(now);
  wed.setDate(now.getDate() + daysUntilWed);
  // Set to 8pm EST = UTC 01:00 next day if DST, 00:00 if EST
  wed.setUTCHours(1, 0, 0, 0); // 8pm EST = 01:00 UTC (approx, works for ET)
  return wed;
}

export const SCORING_METHOD_LABELS = {
  winner_only: "Final Tribal",
  top_five: "Jury's Choice",
  full_season: "Full Season",
};

export const SCORING_METHOD_DESCRIPTIONS = {
  winner_only:
    "Only your points allocated to the sole Survivor winner count. Maximum risk, maximum reward.",
  top_five:
    "Points you allocated to any of the top 5 finishers count toward your score. Reward long-term picks.",
  full_season:
    "Every elimination scores points. Points × multiplier based on boot order — early boots are cheap, the top 5 are worth a fortune.",
};

/**
 * Full Season scoring multipliers indexed by DB `placement`.
 *
 *   DB placement 1  = first person eliminated = 24th place finish → lowest multiplier
 *   DB placement 24 = winner                  = 1st place finish  → highest multiplier
 *
 * Formula: placeFinish = 25 - db_placement
 *   1st place  (db:24) → 100×  ← user-specified
 *   2nd place  (db:23) →  75×  ← user-specified
 *   3rd place  (db:22) →  50×  ← user-specified
 *   4th place  (db:21) →  44×
 *   5th place  (db:20) →  38×
 *   ...
 *   24th place (db:1)  →   1×
 *
 * Index 0 is unused.
 */
export const FULL_SEASON_MULTIPLIERS = [
  0,   // [0]  unused
  1,   // [1]  db:1  → 24th place finish (1st eliminated)
  2,   // [2]  db:2  → 23rd place
  3,   // [3]  db:3  → 22nd place
  4,   // [4]  db:4  → 21st place
  5,   // [5]  db:5  → 20th place
  6,   // [6]  db:6  → 19th place
  8,   // [7]  db:7  → 18th place
  10,  // [8]  db:8  → 17th place
  12,  // [9]  db:9  → 16th place
  14,  // [10] db:10 → 15th place
  17,  // [11] db:11 → 14th place
  20,  // [12] db:12 → 13th place
  23,  // [13] db:13 → 12th place
  26,  // [14] db:14 → 11th place
  29,  // [15] db:15 → 10th place
  32,  // [16] db:16 → 9th place
  34,  // [17] db:17 → 8th place
  36,  // [18] db:18 → 7th place
  38,  // [19] db:19 → 6th place
  42,  // [20] db:20 → 5th place  ← top 5 begins
  46,  // [21] db:21 → 4th place
  50,  // [22] db:22 → 3rd place  ← user-specified
  75,  // [23] db:23 → 2nd place  ← user-specified
  100, // [24] db:24 → 1st place (winner) ← user-specified
];
