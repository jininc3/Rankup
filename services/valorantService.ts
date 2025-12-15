import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '@/config/firebase';

// Types for Valorant stats
export interface ValorantStats {
  puuid: string;
  accountLevel: number;
  card?: {
    small: string;
    large: string;
    wide: string;
    id: string;
  };
  rankedRating: number;
  currentRank?: {
    tier: string;
    division: string;
    rankScore: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  peakRank?: {
    tier: string;
    division: string;
    season: string;
    achievedAt: any;
  };
  lastUpdated: any;
}

export interface GetValorantStatsResponse {
  success: boolean;
  message: string;
  stats?: ValorantStats;
  cached?: boolean;
}

/**
 * Get Valorant stats for the current user
 * @param forceRefresh - Force refresh data from Riot API (bypass cache)
 */
export const getValorantStats = async (
  forceRefresh: boolean = false
): Promise<GetValorantStatsResponse> => {
  try {
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to view Valorant stats');
    }

    // Get fresh ID token to ensure authentication
    await currentUser.getIdToken(true);

    const getValorantStatsFn = httpsCallable<{ forceRefresh?: boolean }, GetValorantStatsResponse>(
      functions,
      'getValorantStats'
    );

    const result = await getValorantStatsFn({ forceRefresh });

    return result.data;
  } catch (error: any) {
    console.error('Error fetching Valorant stats:', error);

    // Provide more helpful error messages
    if (error.code === 'unauthenticated') {
      throw new Error('Authentication error. Please try logging out and back in.');
    }

    throw new Error(error.message || 'Failed to fetch Valorant stats');
  }
};

/**
 * Format Valorant rank display string
 * @param tier - Rank tier (e.g., "GOLD")
 * @param division - Division (e.g., "2")
 */
export const formatValorantRank = (tier: string, division: string): string => {
  if (!tier || tier === 'UNRANKED') return 'Unranked';

  // Capitalize first letter, lowercase rest for tier
  const formattedTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();

  // Radiant, Immortal don't show divisions in the same way
  if (['Radiant', 'Immortal'].includes(formattedTier)) {
    return formattedTier;
  }

  // If no division, just return tier
  if (!division) return formattedTier;

  return `${formattedTier} ${division}`;
};

/**
 * Get Valorant rank tier color
 * @param tier - Rank tier
 */
export const getValorantRankColor = (tier: string): string => {
  const colors: { [key: string]: string } = {
    'IRON': '#4A4A4A',
    'BRONZE': '#CD7F32',
    'SILVER': '#C0C0C0',
    'GOLD': '#FFD700',
    'PLATINUM': '#00CED1',
    'DIAMOND': '#B9F2FF',
    'ASCENDANT': '#0F4C75',
    'IMMORTAL': '#BB0A21',
    'RADIANT': '#FFFFAA',
  };

  return colors[tier?.toUpperCase()] || '#666666';
};
