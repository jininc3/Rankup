/**
 * Formats a rank string for display: uppercases and converts Arabic numerals to Roman numerals.
 * e.g., "Platinum 2" → "PLATINUM II", "Diamond 1" → "DIAMOND I"
 * Ranks without subdivisions (Master, Grandmaster, Challenger, Radiant) strip any trailing number.
 */
export const formatRankDisplay = (rank: string): string => {
  if (!rank || rank === 'N/A') return rank;
  const upper = rank.toUpperCase().trim();
  // Ranks that have no subdivisions — strip any trailing number
  const soloRanks = ['MASTER', 'GRANDMASTER', 'CHALLENGER', 'RADIANT'];
  for (const solo of soloRanks) {
    if (upper === solo || upper.startsWith(solo + ' ')) {
      return solo;
    }
  }
  return upper
    .replace(/\b4\b/g, 'IV')
    .replace(/\b3\b/g, 'III')
    .replace(/\b2\b/g, 'II')
    .replace(/\b1\b/g, 'I');
};
