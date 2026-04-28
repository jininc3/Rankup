/**
 * Cloud Function: Handle duo match accept/decline
 * Triggered when a duoMatches document is updated.
 * Checks if both users accepted, or if one declined, and handles accordingly.
 */

import * as admin from "firebase-admin";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";

export const onDuoMatchUpdated = onDocumentUpdated(
  "duoMatches/{matchId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) {
      return;
    }

    // Only process pending matches
    if (after.status !== "pending") {
      return;
    }

    const matchId = event.params.matchId;
    const db = admin.firestore();
    const matchRef = db.collection("duoMatches").doc(matchId);

    // Check if both users accepted
    if (after.user1Accepted === true && after.user2Accepted === true) {
      logger.info(`Both users accepted match ${matchId}`);
      await matchRef.update({status: "active"});

      // Clean up queue entries
      const queue1Ref = db.collection("duoQueue").doc(`${after.user1Id}_${after.game}`);
      const queue2Ref = db.collection("duoQueue").doc(`${after.user2Id}_${after.game}`);
      await Promise.all([
        queue1Ref.delete().catch(() => {}),
        queue2Ref.delete().catch(() => {}),
      ]);

      return;
    }

    // Check if user1 declined
    if (after.user1Accepted === "declined" && before.user1Accepted !== "declined") {
      logger.info(`User1 (${after.user1Id}) declined match ${matchId}`);
      await matchRef.update({status: "declined"});

      // Clean up decliner's queue entry
      const queue1Ref = db.collection("duoQueue").doc(`${after.user1Id}_${after.game}`);
      await queue1Ref.delete().catch(() => {});

      // Re-queue user2 if they accepted or haven't responded yet
      if (after.user2Accepted !== "declined") {
        await requeueUser(db, after.user2Id, after.game, after.user2Card, after.mode || "duo");
      }

      return;
    }

    // Check if user2 declined
    if (after.user2Accepted === "declined" && before.user2Accepted !== "declined") {
      logger.info(`User2 (${after.user2Id}) declined match ${matchId}`);
      await matchRef.update({status: "declined"});

      // Clean up decliner's queue entry
      const queue2Ref = db.collection("duoQueue").doc(`${after.user2Id}_${after.game}`);
      await queue2Ref.delete().catch(() => {});

      // Re-queue user1 if they accepted or haven't responded yet
      if (after.user1Accepted !== "declined") {
        await requeueUser(db, after.user1Id, after.game, after.user1Card, after.mode || "duo");
      }

      return;
    }
  }
);

/**
 * Re-queue a user by creating a new duoQueue entry
 */
async function requeueUser(
  db: admin.firestore.Firestore,
  userId: string,
  game: string,
  cardData: any,
  mode: string = "duo",
) {
  const queueRef = db.collection("duoQueue").doc(`${userId}_${game}`);
  await queueRef.set({
    userId,
    game,
    mode,
    status: "searching",
    matchedWith: null,
    matchId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    username: cardData.username || "",
    avatar: cardData.avatar || null,
    inGameIcon: cardData.inGameIcon || null,
    inGameName: cardData.inGameName || null,
    currentRank: cardData.currentRank || null,
    mainRole: cardData.mainRole || null,
    mainAgent: cardData.mainAgent || null,
  });
  logger.info(`Re-queued user ${userId} for ${game}`);
}
