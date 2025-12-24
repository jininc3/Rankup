/**
 * Cloud Function: Automatically increment follower/following counts
 * Triggered when a new follow document is created
 */

import * as admin from "firebase-admin";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";

export const onFollowerCreated = onDocumentCreated(
  "users/{targetUserId}/followers/{followerId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data associated with the event");
      return;
    }

    const targetUserId = event.params.targetUserId;
    const followerId = event.params.followerId;

    logger.info(`New follower: ${followerId} is following ${targetUserId}`);

    const db = admin.firestore();

    try {
      // Use batch writes for atomic operations
      const batch = db.batch();

      // Increment followers count for the target user
      const targetUserRef = db.collection("users").doc(targetUserId);
      batch.update(targetUserRef, {
        followersCount: admin.firestore.FieldValue.increment(1),
      });

      // Increment following count for the follower
      const followerUserRef = db.collection("users").doc(followerId);
      batch.update(followerUserRef, {
        followingCount: admin.firestore.FieldValue.increment(1),
      });

      await batch.commit();

      logger.info(
        `Successfully updated counts for follow: ${followerId} -> ${targetUserId}`
      );
    } catch (error) {
      logger.error("Error updating follow counts:", error);
      throw error;
    }
  }
);
