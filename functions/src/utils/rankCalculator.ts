/**
 * Shared rank calculation utilities for leaderboard parties
 * Used by both client and server to ensure consistent rankings
 */

export interface PartyMember {
  userId: string;
  username: string;
  avatar: string;
  currentRank: string;
  lp?: number; // League Points (League of Legends)
  rr?: number; // Rank Rating (Valorant)
}

export interface RankedMember extends PartyMember {
  rank: number;
}

/**
 * Calculate League of Legends rank value for sorting
 */
export function getLeagueRankValue(currentRank: string, lp: number): number {
  const rankOrder: { [key: string]: number } = {
    'CHALLENGER': 10,
    'GRANDMASTER': 9,
    'MASTER': 8,
    'DIAMOND': 7,
    'EMERALD': 6,
    'PLATINUM': 5,
    'GOLD': 4,
    'SILVER': 3,
    'BRONZE': 2,
    'IRON': 1,
    'UNRANKED': 0,
  };

  const divisionOrder: { [key: string]: number } = {
    'I': 4,
    'II': 3,
    'III': 2,
    'IV': 1,
  };

  const parts = currentRank.toUpperCase().split(' ');
  const tier = parts[0];
  const division = parts[1] || '';

  const tierValue = rankOrder[tier] || 0;
  const divisionValue = divisionOrder[division] || 0;

  return tierValue * 1000 + divisionValue * 100 + lp;
}

/**
 * Calculate Valorant rank value for sorting
 */
export function getValorantRankValue(currentRank: string, rr: number): number {
  const rankOrder: { [key: string]: number } = {
    'RADIANT': 9,
    'IMMORTAL': 8,
    'ASCENDANT': 7,
    'DIAMOND': 6,
    'PLATINUM': 5,
    'GOLD': 4,
    'SILVER': 3,
    'BRONZE': 2,
    'IRON': 1,
    'UNRANKED': 0,
  };

  const parts = currentRank.toUpperCase().split(' ');
  const tier = parts[0];
  const division = parts[1] || '0';

  const tierValue = rankOrder[tier] || 0;
  const divisionValue = parseInt(division) || 0;

  return tierValue * 1000 + divisionValue * 100 + rr;
}

/**
 * Calculate rankings for a party based on game type
 */
export function calculatePartyRankings(
  members: PartyMember[],
  isLeague: boolean
): RankedMember[] {
  // Sort members by rank value
  const sortedMembers = [...members].sort((a, b) => {
    if (isLeague) {
      const aValue = getLeagueRankValue(a.currentRank, a.lp || 0);
      const bValue = getLeagueRankValue(b.currentRank, b.lp || 0);
      return bValue - aValue; // Higher rank first
    } else {
      const aValue = getValorantRankValue(a.currentRank, a.rr || 0);
      const bValue = getValorantRankValue(b.currentRank, b.rr || 0);
      return bValue - aValue; // Higher rank first
    }
  });

  // Assign rank positions
  return sortedMembers.map((member, index) => ({
    ...member,
    rank: index + 1,
  }));
}

/**
 * Compare two ranking snapshots to detect top 3 changes
 * Returns the changes that occurred in the top 3
 */
export interface RankingChange {
  userId: string;
  username: string;
  oldRank?: number; // undefined if newly entered top 3
  newRank: number;
  isNewEntry: boolean; // true if user wasn't in top 3 before
}

export function detectTop3Changes(
  oldRankings: RankedMember[] | undefined,
  newRankings: RankedMember[]
): RankingChange[] {
  const changes: RankingChange[] = [];

  // Get top 3 from both rankings
  const newTop3 = newRankings.slice(0, 3);
  const oldTop3Map = new Map(
    (oldRankings || []).slice(0, 3).map(m => [m.userId, m.rank])
  );

  for (const member of newTop3) {
    const oldRank = oldTop3Map.get(member.userId);

    if (oldRank === undefined) {
      // User is newly in top 3
      changes.push({
        userId: member.userId,
        username: member.username,
        newRank: member.rank,
        isNewEntry: true,
      });
    } else if (oldRank !== member.rank) {
      // User was in top 3 but changed position
      changes.push({
        userId: member.userId,
        username: member.username,
        oldRank,
        newRank: member.rank,
        isNewEntry: false,
      });
    }
  }

  return changes;
}
