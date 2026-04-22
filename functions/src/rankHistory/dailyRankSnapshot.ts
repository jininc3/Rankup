/**
 * Daily Rank Snapshot Cloud Function
 *
 * Runs once daily to fetch and store LP/RR snapshots for all users
 * with linked Riot or Valorant accounts. Data is used for the
 * LP/RR progression graph in rank card modals.
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {getRankedStats} from "../riot/riotApi";
import {getValorantMMR} from "../valorant/valorantApi";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const dailyRankSnapshotScheduled = onSchedule(
  {
    schedule: "every day 06:00",
    timeZone: "UTC",
    secrets: ["RIOT_API_KEY", "HENRIK_API_KEY"],
    maxInstances: 1,
    timeoutSeconds: 540,
  },
  async () => {
    const db = admin.firestore();
    logger.info("Starting daily rank snapshot job");

    const usersSnapshot = await db.collection("users").get();
    let leagueCount = 0;
    let valorantCount = 0;
    let errorCount = 0;

    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    // Process in batches to respect rate limits
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (user) => {
        // League of Legends snapshot
        const riotAccount = user.data?.riotAccount;
        if (riotAccount?.puuid && riotAccount?.region) {
          try {
            const rankedStats = await getRankedStats(
              riotAccount.puuid,
              riotAccount.region
            );
            const soloQueue = rankedStats.find(
              (q) => q.queueType === "RANKED_SOLO_5x5"
            );
            if (soloQueue) {
              await db
                .collection("users")
                .doc(user.id)
                .collection("rankHistory")
                .add({
                  game: "league",
                  value: soloQueue.leaguePoints,
                  rank: `${soloQueue.tier} ${soloQueue.rank}`,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
              leagueCount++;
            }
          } catch (err) {
            logger.warn(
              `Failed to snapshot League LP for user ${user.id}:`,
              err
            );
            errorCount++;
          }
        }

        // Valorant snapshot
        const valorantAccount = user.data?.valorantAccount;
        if (
          valorantAccount?.gameName &&
          valorantAccount?.tag &&
          valorantAccount?.region
        ) {
          try {
            const mmrData = await getValorantMMR(
              valorantAccount.region,
              valorantAccount.gameName,
              valorantAccount.tag
            );
            if (mmrData?.current_data?.currenttierpatched !== "Unranked") {
              await db
                .collection("users")
                .doc(user.id)
                .collection("rankHistory")
                .add({
                  game: "valorant",
                  value: mmrData.current_data.ranking_in_tier,
                  rank: mmrData.current_data.currenttierpatched,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
              valorantCount++;
            }
          } catch (err) {
            logger.warn(
              `Failed to snapshot Valorant RR for user ${user.id}:`,
              err
            );
            errorCount++;
          }
        }
      }));

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < users.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    logger.info(
      `Daily rank snapshot complete: ${leagueCount} League, ` +
      `${valorantCount} Valorant snapshots saved. ${errorCount} errors.`
    );
  }
);
