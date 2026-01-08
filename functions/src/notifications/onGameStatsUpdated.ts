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
  detectRelevantRankChanges,
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

  // Get stored rankings snapshot
  const oldRankings = partyData.rankings || [];

  // Detect relevant rank changes (only notifies affected users)
  const relevantNotifications = detectRelevantRankChanges(
    oldRankings.length > 0 ? oldRankings : undefined,
    newRankings
  );

  if (relevantNotifications.length === 0) {
    logger.info(`No relevant rank changes in party ${partyName}`);
    // Still update stored rankings even if no notifications
    await db.collection("parties").doc(partyDocId).update({
      rankings: newRankings,
      top3Rankings: newRankings.slice(0, 3).map((m) => ({
        userId: m.userId,
        username: m.username,
        avatar: m.avatar,
        rank: m.rank,
        currentRank: m.currentRank,
        lp: m.lp,
        rr: m.rr,
      })),
      lastRankingUpdate: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  logger.info(`Detected ${relevantNotifications.length} relevant rank change notifications in party ${partyName}`);

  // Prepare notifications for affected users only
  const notifications: Array<{
    recipientUserId: string;
    title: string;
    body: string;
    data: Record<string, any>;
  }> = [];

  // Track which users we've notified to avoid duplicates
  const notifiedUsers = new Set<string>();

  for (const notification of relevantNotifications) {
    const rankEmoji = notification.newRank === 1 ? "🥇" : notification.newRank === 2 ? "🥈" : "🥉";

    let notificationBody: string;
    if (notification.recipientUserId === notification.movedUserId) {
      // Notify the user who moved
      if (notification.oldRank === undefined) {
        // First time in top 3
        notificationBody = `You're now ranked #${notification.newRank} in ${partyName}!`;
      } else if (notification.newRank < notification.oldRank) {
        // Moved up
        notificationBody = `You moved up to #${notification.newRank} in ${partyName}!`;
      } else {
        // Moved down
        notificationBody = `You dropped to #${notification.newRank} in ${partyName}`;
      }
    } else {
      // Notify someone who was affected by the move
      notificationBody = `${notification.movedUsername} moved to #${notification.newRank} in ${partyName}!`;
    }

    // Create unique key to avoid duplicate notifications
    const notificationKey = `${notification.recipientUserId}-${notification.movedUserId}-${notification.newRank}`;
    if (!notifiedUsers.has(notificationKey)) {
      notifiedUsers.add(notificationKey);

      notifications.push({
        recipientUserId: notification.recipientUserId,
        title: `${rankEmoji} Leaderboard Update`,
        body: notificationBody,
        data: {
          type: "party_ranking_change",
          partyId: partyData.partyId,
          partyName: partyName,
          game: gameName,
          userId: notification.movedUserId,
          username: notification.movedUsername,
          newRank: notification.newRank,
        },
      });

      // Also create in-app notification document
      await db
        .collection("users")
        .doc(notification.recipientUserId)
        .collection("notifications")
        .add({
          type: "party_ranking_change",
          fromUserId: notification.movedUserId,
          fromUsername: notification.movedUsername,
          partyId: partyData.partyId,
          partyName: partyName,
          game: gameName,
          newRank: notification.newRank,
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
