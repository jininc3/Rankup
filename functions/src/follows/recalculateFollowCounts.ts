/**
 * Cloud Function: Recalculate follower/following counts for all users
 * This is a maintenance function to fix any count discrepancies
 * Can be called manually or scheduled to run periodically
 */

import * as admin from "firebase-admin";
import {onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";

/**
 * Recalculate counts for a single user
 */
async function recalculateUserCounts(userId: string): Promise<{
  followersCount: number;
  followingCount: number;
}> {
  const db = admin.firestore();

  // Count followers
  const followersSnapshot = await db
    .collection(`users/${userId}/followers`)
    .get();
  const followersCount = followersSnapshot.size;

  // Count following
  const followingSnapshot = await db
    .collection(`users/${userId}/following`)
    .get();
  const followingCount = followingSnapshot.size;

  // Update user document
  await db.collection("users").doc(userId).update({
    followersCount,
    followingCount,
  });

  return {followersCount, followingCount};
}

/**
 * Callable function to recalculate counts for all users
 * Call this from your app or Firebase Console
 */
export const recalculateFollowCountsCallable = onCall(
  {maxInstances: 1},
  async (request) => {
    // Optional: Add authentication check
    // if (!request.auth) {
    //   throw new HttpsError('unauthenticated', 'Must be authenticated');
    // }

    const db = admin.firestore();
    logger.info("Starting follow counts recalculation for all users");

    try {
      const usersSnapshot = await db.collection("users").get();
      const totalUsers = usersSnapshot.size;
      let processedUsers = 0;
      let updatedUsers = 0;

      const updates = [];

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const currentData = userDoc.data();

        const {followersCount, followingCount} =
          await recalculateUserCounts(userId);

        processedUsers++;

        // Check if counts changed
        if (
          currentData.followersCount !== followersCount ||
          currentData.followingCount !== followingCount
        ) {
          updatedUsers++;
          updates.push({
            userId,
            old: {
              followersCount: currentData.followersCount,
              followingCount: currentData.followingCount,
            },
            new: {
              followersCount,
              followingCount,
            },
          });
        }

        if (processedUsers % 10 === 0) {
          logger.info(`Progress: ${processedUsers}/${totalUsers} users processed`);
        }
      }

      logger.info(
        `Recalculation complete: ${processedUsers} users processed, ${updatedUsers} users updated`
      );

      return {
        success: true,
        totalUsers: processedUsers,
        updatedUsers,
        updates,
      };
    } catch (error) {
      logger.error("Error during recalculation:", error);
      throw error;
    }
  }
);

/**
 * Scheduled function to automatically recalculate counts weekly
 * Runs every Sunday at 3 AM UTC
 */
export const recalculateFollowCountsScheduled = onSchedule(
  {
    schedule: "0 3 * * 0", // Every Sunday at 3 AM
    timeZone: "UTC",
    maxInstances: 1,
  },
  async () => {
    const db = admin.firestore();
    logger.info("Starting scheduled follow counts recalculation");

    try {
      const usersSnapshot = await db.collection("users").get();
      let updatedCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const currentData = userDoc.data();

        const {followersCount, followingCount} =
          await recalculateUserCounts(userId);

        if (
          currentData.followersCount !== followersCount ||
          currentData.followingCount !== followingCount
        ) {
          updatedCount++;
          logger.info(
            `Fixed counts for user ${userId}: ` +
              `followers ${currentData.followersCount} -> ${followersCount}, ` +
              `following ${currentData.followingCount} -> ${followingCount}`
          );
        }
      }

      logger.info(
        `Scheduled recalculation complete: ${updatedCount} users had incorrect counts`
      );
    } catch (error) {
      logger.error("Error during scheduled recalculation:", error);
      throw error;
    }
  }
);
