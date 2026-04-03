/**
 * Pure scoring utilities — no server dependencies, fully testable.
 */

/**
 * Compute points earned for one elimination event under the new scoring model.
 *
 * New model: points allocated to SURVIVING players × the eliminated player's
 * boot-order multiplier = score for this episode.
 * Points on the eliminated player (and any other eliminated-this-episode player)
 * do NOT contribute to the score.
 *
 * @param {Array<{player_id: string, points: number}>} allocations - All allocations for this pick
 * @param {string[]} elimIds - All player IDs eliminated this episode
 * @param {number} multiplier - Boot-order multiplier for the eliminated player
 * @returns {number} Points earned
 */
export function computeEpisodeScore(allocations, elimIds, multiplier) {
  const survivingPoints = allocations
    .filter((a) => !elimIds.includes(a.player_id))
    .reduce((sum, a) => sum + a.points, 0);
  return survivingPoints * multiplier;
}
