// Rank ordering for filtering and sorting
export const VALORANT_RANKS = [
  'Iron 1', 'Iron 2', 'Iron 3',
  'Bronze 1', 'Bronze 2', 'Bronze 3',
  'Silver 1', 'Silver 2', 'Silver 3',
  'Gold 1', 'Gold 2', 'Gold 3',
  'Platinum 1', 'Platinum 2', 'Platinum 3',
  'Diamond 1', 'Diamond 2', 'Diamond 3',
  'Ascendant 1', 'Ascendant 2', 'Ascendant 3',
  'Immortal 1', 'Immortal 2', 'Immortal 3',
  'Radiant',
];

export const LEAGUE_RANKS = [
  'Iron IV', 'Iron III', 'Iron II', 'Iron I',
  'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
  'Silver IV', 'Silver III', 'Silver II', 'Silver I',
  'Gold IV', 'Gold III', 'Gold II', 'Gold I',
  'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
  'Emerald IV', 'Emerald III', 'Emerald II', 'Emerald I',
  'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
  'Master',
  'Grandmaster',
  'Challenger',
];

/**
 * Get allowed ranks within ±1 division of current rank
 * @param game - Game type (valorant or league)
 * @param currentRank - User's current rank
 * @returns Array of allowed ranks
 */
export function getAllowedRanks(game: 'valorant' | 'league', currentRank: string): string[] {
  const ranks = game === 'valorant' ? VALORANT_RANKS : LEAGUE_RANKS;
  const currentIndex = ranks.indexOf(currentRank);

  // If rank not found or unranked, return all ranks
  if (currentIndex === -1 || currentRank === 'Unranked') {
    return ranks;
  }

  // ±1 division = ±3 ranks (e.g., Gold 1,2,3)
  const DIVISION_SIZE = 3;
  const RANGE = DIVISION_SIZE;

  const minIndex = Math.max(0, currentIndex - RANGE);
  const maxIndex = Math.min(ranks.length - 1, currentIndex + RANGE);

  return ranks.slice(minIndex, maxIndex + 1);
}

/**
 * Calculate rank distance for sorting
 * @param game - Game type
 * @param rankA - First rank
 * @param rankB - Second rank (user's rank)
 * @returns Absolute distance between ranks
 */
export function getRankDistance(game: 'valorant' | 'league', rankA: string, rankB: string): number {
  const ranks = game === 'valorant' ? VALORANT_RANKS : LEAGUE_RANKS;
  const indexA = ranks.indexOf(rankA);
  const indexB = ranks.indexOf(rankB);

  // If either rank not found, put at end
  if (indexA === -1 || indexB === -1) {
    return 999;
  }

  return Math.abs(indexA - indexB);
}

/**
 * Sort duo cards by rank proximity to user's rank
 * @param cards - Array of duo cards
 * @param game - Game type
 * @param userRank - User's current rank
 * @returns Sorted array of duo cards
 */
export function sortByRankProximity<T extends { currentRank: string }>(
  cards: T[],
  game: 'valorant' | 'league',
  userRank: string
): T[] {
  return [...cards].sort((a, b) => {
    const distanceA = getRankDistance(game, a.currentRank, userRank);
    const distanceB = getRankDistance(game, b.currentRank, userRank);
    return distanceA - distanceB;
  });
}

/**
 * Get rank range display text
 * @param game - Game type
 * @param currentRank - User's current rank
 * @returns String like "Gold 1 - Plat 3"
 */
export function getRankRangeText(game: 'valorant' | 'league', currentRank: string): string {
  const allowedRanks = getAllowedRanks(game, currentRank);

  if (allowedRanks.length === 0) {
    return 'All Ranks';
  }

  const minRank = allowedRanks[0];
  const maxRank = allowedRanks[allowedRanks.length - 1];

  if (minRank === maxRank) {
    return minRank;
  }

  return `${minRank} - ${maxRank}`;
}
