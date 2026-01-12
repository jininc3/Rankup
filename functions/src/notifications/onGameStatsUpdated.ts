/**
 * Cloud Function: Notify party members when someone moves into or changes position in top 3
 * Triggers when: users/{userId}/gameStats/{game} is updated
 */

import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  calculatePartyRankings,
  PartyMember,
} from "../utils/rankCalculator";

interface Top3Snapshot {
  userId: string;
  username: string;
  avatar: string;
  rank: number;
  currentRank: string;
  lp?: number;
  rr?: number;
}

/**
 * Handle game stats updates and send leaderboard notifications
 */
export const onGameStatsUpdatedFunction = onDocumentWritten(
  "users/{userId}/gameStats/{game}",
  async (event) => {
    const userId = event.params.userId;
    const game = event.params.game; // "league" or "valorant"

    // Only process updates, not deletions
    if (!event.data?.after.exists) {
      logger.info(`Game stats deleted for user ${userId}, game ${game}`);
      return;
    }

    const updatedStats = event.data.after.data();
    if (!updatedStats) {
      logger.error(`No data found for game stats update: ${userId}, ${game}`);
      return;
    }

    logger.info(`Game stats updated for user ${userId}, game ${game}`);

    try {
      const db = admin.firestore();

      // Get user's basic info
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        logger.error(`User ${userId} not found`);
        return;
      }

      const userData = userDoc.data();
      const username = userData?.username || "Unknown";
      const avatar = userData?.photoURL || "";

      // Determine game type
      const isLeague = game === "league";
      const gameName = isLeague ? "League of Legends" : "Valorant";

      // Find all parties this user is in for this game
      const partiesSnapshot = await db
        .collection("parties")
        .where("members", "array-contains", userId)
        .where("game", "==", gameName)
        .get();

      if (partiesSnapshot.empty) {
        logger.info(`User ${userId} is not in any ${gameName} parties`);
        return;
      }

      logger.info(`Found ${partiesSnapshot.size} ${gameName} parties for user ${userId}`);

      // Process each party
      for (const partyDoc of partiesSnapshot.docs) {
        await processPartyUpdate(
          db,
          partyDoc.id,
          partyDoc.data(),
          userId,
          username,
          avatar,
          updatedStats,
          isLeague,
          gameName
        );
      }
    } catch (error) {
      logger.error("Error processing game stats update:", error);
    }
  }
);

/**
 * Process a single party update
 */
async function processPartyUpdate(
  db: admin.firestore.Firestore,
  partyDocId: string,
  partyData: admin.firestore.DocumentData,
  updatedUserId: string,
  updatedUsername: string,
  updatedAvatar: string,
  updatedStats: admin.firestore.DocumentData,
  isLeague: boolean,
  gameName: string
): Promise<void> {
  const partyName = partyData.partyName || "Unknown Party";
  const memberDetails = partyData.memberDetails || [];

  logger.info(`Processing party: ${partyName} (${partyDocId})`);

  // Fetch current stats for all members
  const members: PartyMember[] = [];

  for (const member of memberDetails) {
    let stats;

    // Use the updated stats for the current user
    if (member.userId === updatedUserId) {
      stats = updatedStats;
    } else {
      // Fetch stats for other members
      const gameStatsPath = isLeague ? "league" : "valorant";
      const memberStatsDoc = await db
        .collection("users")
        .doc(member.userId)
        .collection("gameStats")
        .doc(gameStatsPath)
        .get();

      stats = memberStatsDoc.exists ? memberStatsDoc.data() : null;

      // Fallback to main user stats if gameStats doesn't exist
      if (!stats || !stats.currentRank) {
        const memberUserDoc = await db.collection("users").doc(member.userId).get();
        const memberUserData = memberUserDoc.data();

        if (isLeague && memberUserData?.riotStats?.rankedSolo) {
          stats = {
            currentRank: `${memberUserData.riotStats.rankedSolo.tier} ${memberUserData.riotStats.rankedSolo.rank}`,
            lp: memberUserData.riotStats.rankedSolo.leaguePoints || 0,
          };
        } else if (!isLeague && memberUserData?.valorantStats) {
          stats = {
            currentRank: memberUserData.valorantStats.currentRank || "Unranked",
            rr: memberUserData.valorantStats.rankRating || 0,
          };
        }
      }
    }

    members.push({
      userId: member.userId,
      username: member.username,
      avatar: member.avatar,
      currentRank: stats?.currentRank || "Unranked",
      lp: isLeague ? (stats?.lp || 0) : undefined,
      rr: !isLeague ? (stats?.rr || 0) : undefined,
    });
  }

  // Calculate new rankings
  const newRankings = calculatePartyRankings(members, isLeague);

  // Ranking change notifications have been disabled
  // Rankings are still calculated and stored for leaderboard display
  logger.info(`Skipping rank change notifications for party ${partyName} (notifications disabled)`);

  // No notifications will be sent for ranking changes

  // Update stored rankings snapshot (full rankings and top 3)
  const newTop3: Top3Snapshot[] = newRankings.slice(0, 3).map((m) => ({
    userId: m.userId,
    username: m.username,
    avatar: m.avatar,
    rank: m.rank,
    currentRank: m.currentRank,
    lp: m.lp,
    rr: m.rr,
  }));

  await db.collection("parties").doc(partyDocId).update({
    rankings: newRankings,
    top3Rankings: newTop3,
    lastRankingUpdate: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`Updated rankings snapshot for party ${partyName}`);
}
