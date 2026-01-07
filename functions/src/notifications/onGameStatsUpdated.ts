/**
 * Cloud Function: Notify party members when someone moves into or changes position in top 3
 * Triggers when: users/{userId}/gameStats/{game} is updated
 */

import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  calculatePartyRankings,
  detectTop3Changes,
  PartyMember,
} from "../utils/rankCalculator";
import {sendBatchPushNotifications} from "./sendPushNotification";

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

  // Get stored top 3 snapshot
  const oldTop3: Top3Snapshot[] = partyData.top3Rankings || [];

  // Detect changes in top 3
  const changes = detectTop3Changes(
    oldTop3.map(t => ({
      ...t,
      rank: t.rank,
    })),
    newRankings
  );

  if (changes.length === 0) {
    logger.info(`No top 3 changes in party ${partyName}`);
    return;
  }

  logger.info(`Detected ${changes.length} top 3 changes in party ${partyName}`);

  // Prepare notifications for all party members
  const notifications: Array<{
    recipientUserId: string;
    title: string;
    body: string;
    data: Record<string, any>;
  }> = [];

  for (const change of changes) {
    const rankEmoji = change.newRank === 1 ? "🥇" : change.newRank === 2 ? "🥈" : "🥉";
    let notificationBody: string;

    if (change.isNewEntry) {
      // User newly entered top 3
      notificationBody = `${change.username} just climbed to #${change.newRank} in ${partyName}!`;
    } else {
      // User changed position within top 3
      notificationBody = `${change.username} moved to #${change.newRank} in ${partyName}!`;
    }

    // Send notification to all party members (including the user who moved up)
    for (const member of partyData.members) {
      notifications.push({
        recipientUserId: member,
        title: `${rankEmoji} Leaderboard Update`,
        body: notificationBody,
        data: {
          type: "party_ranking_change",
          partyId: partyData.partyId,
          partyName: partyName,
          game: gameName,
          userId: change.userId,
          username: change.username,
          newRank: change.newRank,
        },
      });

      // Also create in-app notification document
      await db
        .collection("users")
        .doc(member)
        .collection("notifications")
        .add({
          type: "party_ranking_change",
          fromUserId: change.userId,
          fromUsername: change.username,
          partyId: partyData.partyId,
          partyName: partyName,
          game: gameName,
          newRank: change.newRank,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
  }

  // Send batch push notifications
  if (notifications.length > 0) {
    try {
      await sendBatchPushNotifications(notifications);
      logger.info(`Sent ${notifications.length} notifications for party ${partyName}`);
    } catch (error) {
      logger.error(`Error sending notifications for party ${partyName}:`, error);
    }
  }

  // Update stored top 3 snapshot
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
    top3Rankings: newTop3,
    lastRankingUpdate: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`Updated top 3 snapshot for party ${partyName}`);
}
