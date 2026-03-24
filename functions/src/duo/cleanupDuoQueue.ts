/**
 * Scheduled function that runs every 5 minutes to clean up stale duo queue entries.
 * Deletes entries that have been searching for more than 2 minutes.
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
import {getFirestore} from "firebase-admin/firestore";

export const cleanupDuoQueueScheduled = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "America/Los_Angeles",
  },
  async () => {
    console.log("Cleaning up stale duo queue entries...");

    const db = getFirestore();
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    try {
      const staleEntries = await db
        .collection("duoQueue")
        .where("status", "==", "searching")
        .where("createdAt", "<", twoMinutesAgo)
        .get();

      if (staleEntries.empty) {
        console.log("No stale duo queue entries found");
        return;
      }

      const batch = db.batch();
      for (const doc of staleEntries.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();

      console.log(`Deleted ${staleEntries.size} stale duo queue entries`);
    } catch (error) {
      console.error("Error cleaning up duo queue:", error);
    }
  }
);
