/**
 * Cloud Function: Automatically decrement follower/following counts
 * Triggered when a follow document is deleted
 */

import * as admin from "firebase-admin";
import {onDocumentDeleted} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";

export const onFollowerDeleted = onDocumentDeleted(
  "users/{targetUserId}/followers/{followerId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data associated with the event");
      return;
    }

    const targetUserId = event.params.targetUserId;
    const followerId = event.params.followerId;

    logger.info(`Unfollow: ${followerId} unfollowed ${targetUserId}`);

    const db = admin.firestore();

    try {
      // Update counts individually to handle missing documents
      const targetUserRef = db.collection("users").doc(targetUserId);
      const followerUserRef = db.collection("users").doc(followerId);

      // Check if documents exist
      const [targetDoc, followerDoc] = await Promise.all([
        targetUserRef.get(),
        followerUserRef.get(),
      ]);

      if (!targetDoc.exists) {
        logger.warn(`Target user ${targetUserId} document not found, skipping follower count update`);
      } else {
        await targetUserRef.update({
          followersCount: admin.firestore.FieldValue.increment(-1),
        });
      }

      if (!followerDoc.exists) {
        logger.warn(`Follower user ${followerId} document not found, skipping following count update`);
      } else {
        await followerUserRef.update({
          followingCount: admin.firestore.FieldValue.increment(-1),
        });
      }

      logger.info(
        `Successfully updated counts for unfollow: ${followerId} -> ${targetUserId}`
      );
    } catch (error) {
      logger.error("Error updating unfollow counts:", error);
      throw error;
    }
  }
);
