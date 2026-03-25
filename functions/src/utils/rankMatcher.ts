/**
 * Rank matching utilities for duo queue.
 * Duplicated from client-side utils/rankFilters.ts since cloud functions
 * can't import from the client directory.
 */

const VALORANT_RANKS: string[] = [
  "Iron 1", "Iron 2", "Iron 3",
  "Bronze 1", "Bronze 2", "Bronze 3",
  "Silver 1", "Silver 2", "Silver 3",
  "Gold 1", "Gold 2", "Gold 3",
  "Platinum 1", "Platinum 2", "Platinum 3",
  "Diamond 1", "Diamond 2", "Diamond 3",
  "Ascendant 1", "Ascendant 2", "Ascendant 3",
  "Immortal 1", "Immortal 2", "Immortal 3",
  "Radiant",
];

const LEAGUE_RANKS: string[] = [
  "Iron IV", "Iron III", "Iron II", "Iron I",
  "Bronze IV", "Bronze III", "Bronze II", "Bronze I",
  "Silver IV", "Silver III", "Silver II", "Silver I",
  "Gold IV", "Gold III", "Gold II", "Gold I",
  "Platinum IV", "Platinum III", "Platinum II", "Platinum I",
  "Emerald IV", "Emerald III", "Emerald II", "Emerald I",
  "Diamond IV", "Diamond III", "Diamond II", "Diamond I",
  "Master",
  "Grandmaster",
  "Challenger",
];

/**
 * Get the tier range (divisions per tier) for a game.
 * Valorant has 3 divisions per tier, League has 4.
 */
export function getTierRange(game: string): number {
  return game === "valorant" ? 3 : 4;
}

/**
 * Get the absolute rank distance between two ranks.
 * Returns Infinity if either rank is null, undefined, 'Unranked', or not found.
 */
export function getRankDistance(
  game: string,
  rankA: string | null | undefined,
  rankB: string | null | undefined
): number {
  if (!rankA || !rankB || rankA === "Unranked" || rankB === "Unranked") {
    return Infinity;
  }

  const ranks = game === "valorant" ? VALORANT_RANKS : LEAGUE_RANKS;
  const indexA = ranks.indexOf(rankA);
  const indexB = ranks.indexOf(rankB);

  if (indexA === -1 || indexB === -1) {
    return Infinity;
  }

  return Math.abs(indexA - indexB);
}
