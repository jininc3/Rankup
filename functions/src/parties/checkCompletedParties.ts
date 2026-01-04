import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Scheduled function that runs daily at 9 AM UTC to check for completed parties
 * and send winner notifications to all members
 */
export const checkCompletedPartiesScheduled = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'America/Los_Angeles',
  },
  async (event) => {
    console.log('Checking for completed parties...');

    const db = getFirestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Get all parties
      const partiesSnapshot = await db.collection('parties').get();

      for (const partyDoc of partiesSnapshot.docs) {
        const partyData = partyDoc.data();
        const partyId = partyData.partyId;

        // Parse end date
        let endDate: Date | null = null;
        if (typeof partyData.endDate === 'string') {
          const parts = partyData.endDate.split('/');
          if (parts.length === 3) {
            const month = parseInt(parts[0], 10) - 1;
            const day = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            endDate = new Date(year, month, day);
          }
        } else if (partyData.endDate?.toDate) {
          endDate = partyData.endDate.toDate();
        }

        if (!endDate) continue;

        endDate.setHours(0, 0, 0, 0);

        // Check if party ended yesterday (so we notify on the day after)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Check if we already sent completion notification
        if (partyData.completionNotificationSent) {
          continue;
        }

        // Check if party ended yesterday
        if (endDate.getTime() === yesterday.getTime()) {
          console.log(`Party ${partyId} ended yesterday, calculating winner...`);

          try {
            await notifyPartyCompletion(partyDoc.id, partyData);

            // Mark that we sent the notification
            await partyDoc.ref.update({
              completionNotificationSent: true,
              completionNotificationSentAt: FieldValue.serverTimestamp(),
            });
          } catch (error) {
            console.error(`Error processing party ${partyId}:`, error);
          }
        }
      }

      console.log('Completed party check finished');
    } catch (error) {
      console.error('Error checking completed parties:', error);
    }
  }
);

/**
 * Calculate winner and send notifications to all party members
 */
async function notifyPartyCompletion(partyDocId: string, partyData: any) {
  const db = getFirestore();
  const partyName = partyData.partyName;
  const game = partyData.game;
  const partyId = partyData.partyId;
  const memberDetails = partyData.memberDetails || [];

  if (memberDetails.length === 0) {
    console.log(`Party ${partyId} has no members`);
    return;
  }

  // Get game stats for all members
  const isLeague = game === 'League of Legends';
  const gameStatsPath = isLeague ? 'league' : 'valorant';

  // Fetch final stats for all members
  const memberStatsPromises = memberDetails.map(async (member: any) => {
    try {
      const gameStatsDoc = await db
        .collection('users')
        .doc(member.userId)
        .collection('gameStats')
        .doc(gameStatsPath)
        .get();

      let stats = gameStatsDoc.data();

      // Fallback to main stats if gameStats doesn't exist
      if (!stats || !stats.currentRank) {
        const userDoc = await db.collection('users').doc(member.userId).get();
        const userData = userDoc.data();

        if (isLeague && userData?.riotStats?.rankedSolo) {
          stats = {
            currentRank: `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`,
            lp: userData.riotStats.rankedSolo.leaguePoints || 0,
          };
        } else if (!isLeague && userData?.valorantStats) {
          stats = {
            currentRank: userData.valorantStats.currentRank || 'Unranked',
            rr: userData.valorantStats.rankRating || 0,
          };
        }
      }

      return {
        userId: member.userId,
        username: member.username,
        currentRank: stats?.currentRank || 'Unranked',
        lp: stats?.lp || 0,
        rr: stats?.rr || 0,
      };
    } catch (error) {
      console.error(`Error getting stats for user ${member.userId}:`, error);
      return {
        userId: member.userId,
        username: member.username,
        currentRank: 'Unranked',
        lp: 0,
        rr: 0,
      };
    }
  });

  const memberStats = await Promise.all(memberStatsPromises);

  // Sort members by rank
  memberStats.sort((a, b) => {
    if (isLeague) {
      return getLeagueRankValue(b.currentRank, b.lp) - getLeagueRankValue(a.currentRank, a.lp);
    } else {
      return getValorantRankValue(b.currentRank, b.rr) - getValorantRankValue(a.currentRank, a.rr);
    }
  });

  // Winner is the first person in sorted list
  const winner = memberStats[0];

  // Create notifications for all members
  for (const member of memberStats) {
    const isWinner = member.userId === winner.userId;
    const rank = memberStats.findIndex(m => m.userId === member.userId) + 1;

    // Create in-app notification
    const notificationRef = db
      .collection('users')
      .doc(member.userId)
      .collection('notifications')
      .doc();

    await notificationRef.set({
      type: 'party_complete',
      partyId: partyId,
      partyName: partyName,
      game: game,
      winnerUserId: winner.userId,
      winnerUsername: winner.username,
      isWinner: isWinner,
      finalRank: rank,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Don't send push notifications here - Cloud Function will handle it
  }

  console.log(`Sent completion notifications for party ${partyId}, winner: ${winner.username}`);
}

// Helper function to calculate League rank value for sorting
function getLeagueRankValue(currentRank: string, lp: number): number {
  const rankOrder: { [key: string]: number } = {
    'CHALLENGER': 10, 'GRANDMASTER': 9, 'MASTER': 8, 'DIAMOND': 7,
    'EMERALD': 6, 'PLATINUM': 5, 'GOLD': 4, 'SILVER': 3,
    'BRONZE': 2, 'IRON': 1, 'UNRANKED': 0,
  };
  const divisionOrder: { [key: string]: number } = { 'I': 4, 'II': 3, 'III': 2, 'IV': 1 };

  const parts = currentRank.toUpperCase().split(' ');
  const tierValue = rankOrder[parts[0]] || 0;
  const divisionValue = divisionOrder[parts[1]] || 0;

  return tierValue * 1000 + divisionValue * 100 + lp;
}

// Helper function to calculate Valorant rank value for sorting
function getValorantRankValue(currentRank: string, rr: number): number {
  const rankOrder: { [key: string]: number } = {
    'RADIANT': 9, 'IMMORTAL': 8, 'ASCENDANT': 7, 'DIAMOND': 6,
    'PLATINUM': 5, 'GOLD': 4, 'SILVER': 3, 'BRONZE': 2,
    'IRON': 1, 'UNRANKED': 0,
  };

  const parts = currentRank.toUpperCase().split(' ');
  const tierValue = rankOrder[parts[0]] || 0;
  const divisionValue = parseInt(parts[1]) || 0;

  return tierValue * 1000 + divisionValue * 100 + rr;
}
