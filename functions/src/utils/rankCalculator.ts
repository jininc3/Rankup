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

/**
 * Notification recipient for a rank change
 */
export interface RankChangeNotification {
  recipientUserId: string;
  movedUserId: string;
  movedUsername: string;
  newRank: number;
  oldRank?: number;
  wasOvertaken: boolean; // true if recipient was overtaken, false if they overtook someone
}

/**
 * Detect relevant rank changes and determine who should be notified
 * Only notifies users when:
 * - Someone overtakes them OR they overtake someone
 * - At least one person involved is in top 3
 */
export function detectRelevantRankChanges(
  oldRankings: RankedMember[] | undefined,
  newRankings: RankedMember[]
): RankChangeNotification[] {
  const notifications: RankChangeNotification[] = [];

  if (!oldRankings || oldRankings.length === 0) {
    // First time rankings - notify top 3 users about their initial position
    for (const member of newRankings.slice(0, 3)) {
      notifications.push({
        recipientUserId: member.userId,
        movedUserId: member.userId,
        movedUsername: member.username,
        newRank: member.rank, // Use member.rank for initial ranking
        oldRank: undefined,
        wasOvertaken: false,
      });
    }
    return notifications;
  }

  // Create maps for easy lookup
  const oldRankMap = new Map(oldRankings.map(m => [m.userId, m.rank]));
  const newRankMap = new Map(newRankings.map(m => [m.userId, m.rank]));

  // Check each user whose rank changed
  for (const newMember of newRankings) {
    const oldRank = oldRankMap.get(newMember.userId);
    const newRank = newMember.rank;

    // Skip if rank didn't change
    if (oldRank === undefined || oldRank === newRank) {
      continue;
    }

    // Determine if this change involves someone in top 3
    const isInTop3Now = newRank <= 3;
    const wasInTop3Before = oldRank <= 3;

    // Skip if neither old nor new rank is in top 3
    if (!isInTop3Now && !wasInTop3Before) {
      continue;
    }

    if (newRank < oldRank) {
      // User moved up (improved rank) - they overtook someone
      // Notify the user who moved up
      notifications.push({
        recipientUserId: newMember.userId,
        movedUserId: newMember.userId,
        movedUsername: newMember.username,
        newRank: newRank, // Explicitly set newRank
        oldRank: oldRank,
        wasOvertaken: false,
      });

      // Find and notify users who were overtaken
      for (const otherMember of oldRankings) {
        const otherNewRank = newRankMap.get(otherMember.userId);
        const otherOldRank = otherMember.rank;

        // Check if this user was overtaken (their rank got worse)
        if (
          otherNewRank !== undefined &&
          otherOldRank < oldRank && // They were ahead before
          otherNewRank >= newRank && // Now they're at or behind the moved user
          otherOldRank >= newRank // They were in the range that got overtaken
        ) {
          notifications.push({
            recipientUserId: otherMember.userId,
            movedUserId: newMember.userId,
            movedUsername: newMember.username,
            newRank: newRank, // Explicitly set to the rank of the person who moved up
            oldRank: oldRank,
            wasOvertaken: true,
          });
        }
      }
    } else {
      // User moved down (worse rank) - someone overtook them
      // Notify the user who moved down
      notifications.push({
        recipientUserId: newMember.userId,
        movedUserId: newMember.userId,
        movedUsername: newMember.username,
        newRank: newRank, // Explicitly set newRank
        oldRank: oldRank,
        wasOvertaken: true,
      });
    }
  }

  return notifications;
}
