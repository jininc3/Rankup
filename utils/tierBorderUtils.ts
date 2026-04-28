// Tier border colors (solid)
export const TIER_COLORS = {
  S: '#D4A843', // Gold Chrome
  A: '#7B5EA7', // Royal Purple
  B: '#3D6F9E', // Royal Azure
  C: '#4A8C5C', // Green
  D: '#C9A84C', // Royal Peach / Yellow
  F: '#8B7355', // Brown/Grey
};

// Tier border gradients (for enhanced visual effect)
export const TIER_GRADIENTS = {
  S: ['#D4A843', '#F5D675', '#B8942E', '#F5D675', '#D4A843'], // Gold Chrome gradient
  A: ['#7B5EA7', '#9B7FCC', '#6A4D93', '#9B7FCC', '#7B5EA7'], // Royal Purple gradient
  B: ['#3D6F9E', '#5A9FD4', '#2C5578', '#5A9FD4', '#3D6F9E'], // Royal Azure gradient
  C: ['#4A8C5C', '#6AB87A', '#3A7048', '#6AB87A', '#4A8C5C'], // Green gradient
  D: ['#C9A84C', '#E8CC7A', '#A8893A', '#E8CC7A', '#C9A84C'], // Royal Peach gradient
  F: ['#8B7355', '#A89070', '#6E5A42', '#A89070', '#8B7355'], // Brown/Grey gradient
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

// Parse subdivision number from rank string (e.g. "Gold 1" → 1, "Diamond IV" → 4)
const parseSubdivision = (rank: string): number => {
  const parts = rank.trim().split(/\s+/);
  if (parts.length < 2) return 0;
  const sub = parts[parts.length - 1];
  // Handle numeric: "1", "2", "3"
  const num = parseInt(sub, 10);
  if (!isNaN(num)) return num;
  // Handle roman: "I", "II", "III", "IV"
  const roman: { [key: string]: number } = { i: 1, ii: 2, iii: 3, iv: 4 };
  return roman[sub.toLowerCase()] || 0;
};

// Map League of Legends ranks to tiers
// F: Unranked - Bronze | D: Silver - Gold | C: Plat - Emerald 2 | B: Emerald 1 - Diamond 2 | A: Diamond 1 - Masters | S: GrandMasters - Challenger
const mapLeagueRankToTier = (rank: string | undefined): 'F' | 'D' | 'C' | 'B' | 'A' | 'S' => {
  if (!rank) return 'F';

  const normalizedRank = rank.toLowerCase();
  const subdivision = parseSubdivision(rank);

  // S Tier: Grandmaster, Challenger
  if (normalizedRank.includes('grandmaster') || normalizedRank.includes('challenger')) return 'S';

  // A Tier: Diamond 1, Masters (League: I=1 is highest)
  if (normalizedRank.includes('master')) return 'A';
  if (normalizedRank.includes('diamond') && subdivision === 1) return 'A';

  // B Tier: Emerald 1, Diamond 2-4
  if (normalizedRank.includes('diamond')) return 'B'; // Diamond 2-4
  if (normalizedRank.includes('emerald') && subdivision === 1) return 'B';

  // C Tier: Platinum, Emerald 2-4
  if (normalizedRank.includes('emerald')) return 'C'; // Emerald 2-4
  if (normalizedRank.includes('platinum')) return 'C';

  // D Tier: Silver, Gold
  if (normalizedRank.includes('silver') || normalizedRank.includes('gold')) return 'D';

  // F Tier: Unranked, Iron, Bronze
  return 'F';
};

// Map Valorant ranks to tiers
// F: Unranked - Bronze | D: Silver | C: Gold 1 - Plat 2 | B: Plat 3 - Asc 1 | A: Asc 2 - Immo 1 | S: Immo 2 - Radiant
const mapValorantRankToTier = (rank: string | undefined): 'F' | 'D' | 'C' | 'B' | 'A' | 'S' => {
  if (!rank) return 'F';

  const normalizedRank = rank.toLowerCase();
  const subdivision = parseSubdivision(rank);

  // S Tier: Immortal 2, Immortal 3, Radiant
  if (normalizedRank.includes('radiant')) return 'S';
  if (normalizedRank.includes('immortal') && subdivision >= 2) return 'S';

  // A Tier: Ascendant 2, Ascendant 3, Immortal 1
  if (normalizedRank.includes('immortal')) return 'A'; // Immortal 1 (subdivision < 2 handled above)
  if (normalizedRank.includes('ascendant') && subdivision >= 2) return 'A';

  // B Tier: Platinum 3, Diamond 1-3, Ascendant 1
  if (normalizedRank.includes('ascendant')) return 'B'; // Ascendant 1
  if (normalizedRank.includes('diamond')) return 'B';
  if (normalizedRank.includes('platinum') && subdivision >= 3) return 'B';

  // C Tier: Gold 1, Gold 2, Gold 3, Platinum 1, Platinum 2
  if (normalizedRank.includes('platinum')) return 'C'; // Plat 1-2
  if (normalizedRank.includes('gold')) return 'C';

  // D Tier: Silver
  if (normalizedRank.includes('silver')) return 'D';

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

/**
 * Calculate the tier border gradient based on peak ranks
 * @param leagueRank - Current League of Legends rank
 * @param valorantRank - Current Valorant rank
 * @returns Array of gradient colors or null if no rank
 */
export const calculateTierBorderGradient = (
  leagueRank?: string,
  valorantRank?: string
): string[] | null => {
  const tier = calculateTier(leagueRank, valorantRank);
  return tier ? TIER_GRADIENTS[tier] : null;
};
