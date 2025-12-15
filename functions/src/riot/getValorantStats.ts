/**
 * Get Valorant Stats Cloud Function
 *
 * This function fetches Valorant player statistics and caches them in Firestore.
 * Implements auto-refresh if data is older than 6 hours.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  getValorantAccount,
  getValorantMMR,
  getValorantMMRHistory,
} from "./riotApi";
import {GetValorantStatsResponse, UserValorantStats} from "../types/riot";

// Cache duration: 6 hours in milliseconds
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

/**
 * Check if cached data is still fresh
 */
function isCacheFresh(lastUpdated: admin.firestore.Timestamp): boolean {
  const now = Date.now();
  const lastUpdatedMs = lastUpdated.toMillis();
  return (now - lastUpdatedMs) < CACHE_DURATION_MS;
}

/**
 * Calculate win rate percentage
 */
function calculateWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100 * 100) / 100; // Round to 2 decimals
}

/**
 * Parse Valorant rank tier and division from patched rank string
 * Example: "Gold 2" -> { tier: "GOLD", division: "2" }
 */
function parseValorantRank(patchedRank: string): { tier: string; division: string } {
  if (!patchedRank || patchedRank === "Unranked") {
    return { tier: "UNRANKED", division: "" };
  }

  // Handle special ranks (no divisions)
  if (["Radiant", "Immortal"].includes(patchedRank)) {
    return { tier: patchedRank.toUpperCase(), division: "" };
  }

  // Parse regular ranks (e.g., "Gold 2")
  const parts = patchedRank.split(" ");
  const tier = parts[0]?.toUpperCase() || "UNRANKED";
  const division = parts[1] || "";

  return { tier, division };
}

/**
 * Update peak rank if current rank is higher
 */
async function updatePeakRank(
  userId: string,
  currentTier: string,
  currentDivision: string,
  currentStats: UserValorantStats
): Promise<void> {
  const rankOrder: {[key: string]: number} = {
    "IRON": 1,
    "BRONZE": 2,
    "SILVER": 3,
    "GOLD": 4,
    "PLATINUM": 5,
    "DIAMOND": 6,
    "ASCENDANT": 7,
    "IMMORTAL": 8,
    "RADIANT": 9,
  };

  const currentRankValue = rankOrder[currentTier] || 0;
  const currentDivisionValue = parseInt(currentDivision) || 0;

  // If no peak rank, set current as peak
  if (!currentStats.peakRank) {
    const db = admin.firestore();
    await db.collection("users").doc(userId).update({
      "valorantStats.peakRank": {
        tier: currentTier,
        division: currentDivision,
        season: "2025", // Update based on current episode/act
        achievedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
    return;
  }

  const peakRankValue = rankOrder[currentStats.peakRank.tier] || 0;
  const peakDivisionValue = parseInt(currentStats.peakRank.division) || 0;

  // Compare ranks (higher number = higher rank, higher division = better)
  const isHigherRank = currentRankValue > peakRankValue ||
    (currentRankValue === peakRankValue && currentDivisionValue > peakDivisionValue);

  if (isHigherRank) {
    const db = admin.firestore();
    await db.collection("users").doc(userId).update({
      "valorantStats.peakRank": {
        tier: currentTier,
        division: currentDivision,
        season: "2025",
        achievedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
    logger.info(`Updated peak Valorant rank for user ${userId}: ${currentTier} ${currentDivision}`);
  }
}

/**
 * Get Valorant stats (with caching and auto-refresh)
 *
 * @param request - Callable request containing data and auth
 * @returns Response with stats and cache status
 */
export const getValorantStatsFunction = onCall(
  {
    invoker: "public",
  },
  async (request): Promise<GetValorantStatsResponse> => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to get Valorant stats"
      );
    }

    const userId = request.auth.uid;
    const data = request.data as {forceRefresh?: boolean};
    const {forceRefresh = false} = data;

    try {
      logger.info(`User ${userId} is fetching Valorant stats (forceRefresh: ${forceRefresh})`);

      const db = admin.firestore();
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError(
          "not-found",
          "User not found"
        );
      }

      const userData = userDoc.data();

      // Check if Riot account is linked
      if (!userData?.riotAccount || !userData.riotAccount.puuid) {
        throw new HttpsError(
          "failed-precondition",
          "No Riot account linked. Please link your account first."
        );
      }

      const {puuid, region} = userData.riotAccount;

      // Convert League region to Valorant region format
      const valorantRegion = region.startsWith("eu") ? "eu" : region.startsWith("na") ? "na" : "ap";

      // Check if we have cached stats and they're fresh
      const cachedStats = userData.valorantStats as UserValorantStats | undefined;
      if (cachedStats && cachedStats.lastUpdated && !forceRefresh) {
        if (isCacheFresh(cachedStats.lastUpdated)) {
          logger.info(`Returning cached Valorant stats for user ${userId}`);
          return {
            success: true,
            message: "Stats retrieved from cache",
            stats: cachedStats,
            cached: true,
          };
        }
      }

      logger.info(`Fetching fresh Valorant stats from API for user ${userId}`);

      // Fetch fresh data from Valorant API
      const [accountData, mmrData, mmrHistory] = await Promise.all([
        getValorantAccount(puuid),
        getValorantMMR(puuid, valorantRegion),
        getValorantMMRHistory(puuid, valorantRegion),
      ]);

      // Parse current rank
      const {tier, division} = parseValorantRank(mmrData.currenttierpatched);

      // Calculate wins/losses from MMR history
      let wins = 0;
      let losses = 0;

      if (mmrHistory && mmrHistory.length > 0) {
        mmrHistory.forEach((match) => {
          if (match.mmr_change_to_last_game > 0) {
            wins++;
          } else if (match.mmr_change_to_last_game < 0) {
            losses++;
          }
        });
      }

      const stats: UserValorantStats = {
        puuid,
        accountLevel: accountData.account_level,
        card: accountData.card,
        rankedRating: mmrData.elo,
        currentRank: tier !== "UNRANKED" ? {
          tier,
          division,
          rankScore: mmrData.ranking_in_tier,
          wins,
          losses,
          winRate: calculateWinRate(wins, losses),
        } : undefined,
        lastUpdated: admin.firestore.Timestamp.now(),
        peakRank: cachedStats?.peakRank || {
          tier: "UNRANKED",
          division: "",
          season: "2025",
          achievedAt: admin.firestore.Timestamp.now(),
        },
      };

      // Update peak rank if applicable
      if (tier !== "UNRANKED") {
        await updatePeakRank(userId, tier, division, stats);
        // Re-fetch to get updated peak rank
        const updatedDoc = await userRef.get();
        const updatedData = updatedDoc.data();
        if (updatedData?.valorantStats?.peakRank) {
          stats.peakRank = updatedData.valorantStats.peakRank;
        }
      }

      // Store in Firestore
      await userRef.update({
        valorantStats: stats,
      });

      logger.info(`Successfully updated Valorant stats for user ${userId}`);

      return {
        success: true,
        message: "Stats updated successfully",
        stats,
        cached: false,
      };
    } catch (error: any) {
      logger.error("Error fetching Valorant stats:", error);

      // If user hasn't played Valorant, return a more specific error
      if (error instanceof HttpsError && error.code === "not-found") {
        throw new HttpsError(
          "not-found",
          "No Valorant account found. You may not have played Valorant yet."
        );
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      // If we have cached data, return it even if stale
      const db = admin.firestore();
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();
      const cachedStats = userData?.valorantStats as UserValorantStats | undefined;

      if (cachedStats) {
        logger.info(`Returning stale cached Valorant stats due to API error for user ${userId}`);
        return {
          success: true,
          message: "Showing cached stats (Valorant API unavailable)",
          stats: cachedStats,
          cached: true,
        };
      }

      throw new HttpsError(
        "internal",
        "Failed to fetch Valorant stats. Henrik's API may be unavailable."
      );
    }
  }
);
