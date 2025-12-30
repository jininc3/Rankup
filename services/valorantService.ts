import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '@/config/firebase';

// Types for Valorant stats (Henrik's API)
export interface ValorantStats {
  gameName: string;
  tag: string;
  region: string;
  accountLevel: number;
  card?: {
    small: string;
    large: string;
    wide: string;
    id: string;
  };
  currentRank: string; // e.g., "Gold 3"
  rankRating: number; // RR (Rank Rating)
  mmr: number; // MMR
  currentData?: {
    currenttierpatched: string;
    ranking_in_tier: number;
    elo: number;
    games_needed_for_rating: number;
  };
  peakRank?: {
    tier: string; // e.g., "Diamond 2"
    season: string;
  };
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  lastUpdated: any;
}

// Link account request
export interface LinkValorantAccountRequest {
  gameName: string;
  tag: string;
  region: string;
}

export interface LinkValorantAccountResponse {
  success: boolean;
  message: string;
  account?: {
    gameName: string;
    tag: string;
    region: string;
    linkedAt: any;
  };
}

export interface GetValorantStatsResponse {
  success: boolean;
  message: string;
  stats?: ValorantStats;
  cached?: boolean;
}

/**
 * Link Valorant account using Henrik's API
 * @param gameName - Valorant in-game name
 * @param tag - Valorant tag
 * @param region - Valorant region (na, eu, ap, kr, latam, br)
 */
export const linkValorantAccount = async (
  gameName: string,
  tag: string,
  region: string
): Promise<LinkValorantAccountResponse> => {
  try {
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to link your Valorant account');
    }

    // Get fresh ID token to ensure authentication
    await currentUser.getIdToken(true);

    const linkValorantAccountFn = httpsCallable<LinkValorantAccountRequest, LinkValorantAccountResponse>(
      functions,
      'linkValorantAccount'
    );

    const result = await linkValorantAccountFn({ gameName, tag, region });

    return result.data;
  } catch (error: any) {
    console.error('Error linking Valorant account:', error);

    // Provide more helpful error messages
    if (error.code === 'unauthenticated') {
      throw new Error('Authentication error. Please try logging out and back in.');
    }

    throw new Error(error.message || 'Failed to link Valorant account');
  }
};

/**
 * Get Valorant stats for the current user using Henrik's API
 * @param forceRefresh - Force refresh data from Henrik's API (bypass cache)
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
