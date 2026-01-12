// Tier border colors
export const TIER_COLORS = {
  S: '#FFD700', // Gold
  A: '#C0C0C0', // Silver/Grey
  B: '#A855F7', // Purple
  C: '#3B82F6', // Blue
  D: '#22C55E', // Green
  F: '#EF4444', // Red
};

// Tier ranking by value (higher is better)
const TIER_VALUES = {
  S: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
};

// Map League of Legends ranks to tiers
const mapLeagueRankToTier = (rank: string | undefined): 'F' | 'D' | 'C' | 'B' | 'A' | 'S' => {
  if (!rank) return 'F';

  const normalizedRank = rank.toLowerCase();

  // S Tier: Grandmaster, Challenger
  if (normalizedRank.includes('grandmaster') || normalizedRank.includes('challenger')) {
    return 'S';
  }

  // A Tier: Master
  if (normalizedRank.includes('master')) {
    return 'A';
  }

  // B Tier: Diamond
  if (normalizedRank.includes('diamond')) {
    return 'B';
  }

  // C Tier: Platinum, Emerald
  if (normalizedRank.includes('platinum') || normalizedRank.includes('emerald')) {
    return 'C';
  }

  // D Tier: Silver, Gold
  if (normalizedRank.includes('silver') || normalizedRank.includes('gold')) {
    return 'D';
  }

  // F Tier: Unranked, Iron, Bronze
  return 'F';
};

// Map Valorant ranks to tiers
const mapValorantRankToTier = (rank: string | undefined): 'F' | 'D' | 'C' | 'B' | 'A' | 'S' => {
  if (!rank) return 'F';

  const normalizedRank = rank.toLowerCase();

  // S Tier: Immortal, Radiant
  if (normalizedRank.includes('immortal') || normalizedRank.includes('radiant')) {
    return 'S';
  }

  // A Tier: Ascendant
  if (normalizedRank.includes('ascendant')) {
    return 'A';
  }

  // B Tier: Diamond
  if (normalizedRank.includes('diamond')) {
    return 'B';
  }

  // C Tier: Platinum
  if (normalizedRank.includes('platinum')) {
    return 'C';
  }

  // D Tier: Silver, Gold
  if (normalizedRank.includes('silver') || normalizedRank.includes('gold')) {
    return 'D';
  }

  // F Tier: Unranked, Iron, Bronze
  return 'F';
};

/**
 * Calculate the tier border color based on peak ranks from League of Legends and Valorant
 * @param leagueRank - Current League of Legends rank (e.g., "Gold I", "Diamond IV")
 * @param valorantRank - Current Valorant rank (e.g., "Platinum 3", "Ascendant 2")
 * @returns The hex color code for the tier border, or null if no rank
 */
export const calculateTierBorderColor = (
  leagueRank?: string,
  valorantRank?: string
): string | null => {
  // If no ranks provided, return null (no border)
  if (!leagueRank && !valorantRank) {
    return null;
  }

  // Calculate tiers for each game
  const leagueTier = mapLeagueRankToTier(leagueRank);
  const valorantTier = mapValorantRankToTier(valorantRank);

  // Get the highest tier (highest value)
  let highestTier: 'F' | 'D' | 'C' | 'B' | 'A' | 'S';

  if (!leagueRank) {
    highestTier = valorantTier;
  } else if (!valorantRank) {
    highestTier = leagueTier;
  } else {
    // Both exist, compare tier values
    highestTier = TIER_VALUES[leagueTier] > TIER_VALUES[valorantTier] ? leagueTier : valorantTier;
  }

  return TIER_COLORS[highestTier];
};

/**
 * Calculate the tier letter based on peak ranks
 * @param leagueRank - Current League of Legends rank
 * @param valorantRank - Current Valorant rank
 * @returns The tier letter (F, D, C, B, A, S) or null if no rank
 */
export const calculateTier = (
  leagueRank?: string,
  valorantRank?: string
): 'F' | 'D' | 'C' | 'B' | 'A' | 'S' | null => {
  if (!leagueRank && !valorantRank) {
    return null;
  }

  const leagueTier = mapLeagueRankToTier(leagueRank);
  const valorantTier = mapValorantRankToTier(valorantRank);

  if (!leagueRank) return valorantTier;
  if (!valorantRank) return leagueTier;

  return TIER_VALUES[leagueTier] > TIER_VALUES[valorantTier] ? leagueTier : valorantTier;
};
