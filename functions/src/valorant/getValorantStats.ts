/**
 * Get Valorant Stats Cloud Function (using Henrik's API)
 *
 * This function fetches comprehensive Valorant statistics for the authenticated user.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  getValorantMMR,
  getValorantAccountByRiotId,
} from "./valorantApi";

export interface ValorantStats {
  gameName: string;
  tag: string;
  region: string;
  accountLevel: number;
  card?: {
    small: string;
    large: string;
    wide: string;
    id: string;
  };
  currentRank: string; // e.g., "Gold 3"
  rankRating: number; // RR (Rank Rating)
  mmr: number; // MMR
  peakRank?: {
    tier: string; // e.g., "Diamond 2"
    season: string;
  };
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  lastUpdated: any;
}

export interface GetValorantStatsResponse {
  success: boolean;
  message: string;
  stats?: ValorantStats;
  cached?: boolean;
}

/**
 * Get Valorant stats for the current user
 *
 * @param request - Callable request containing data and auth
 * @returns Response with success status and Valorant stats
 */
export const getValorantStatsFunction = onCall(
  {
    invoker: "public",
    secrets: ["HENRIK_API_KEY"],
  },
  async (request): Promise<GetValorantStatsResponse> => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to view Valorant stats"
      );
    }

    const userId = request.auth.uid;
    const {forceRefresh = false} = request.data;

    try {
      const db = admin.firestore();
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const valorantAccount = userData?.valorantAccount;

      if (!valorantAccount) {
        throw new HttpsError(
          "failed-precondition",
          "No Valorant account linked. Please link your Valorant account first."
        );
      }

      const {gameName, tag, region} = valorantAccount;

      // Check cache (stats updated in last 6 hours)
      const cachedStats = userData?.valorantStats;
      const cacheTime = cachedStats?.lastUpdated?.toDate();
      const cacheAge = cacheTime ? Date.now() - cacheTime.getTime() : Infinity;
      const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

      if (!forceRefresh && cachedStats && cacheAge < CACHE_TTL) {
        logger.info(`Returning cached Valorant stats for user ${userId}`);
        return {
          success: true,
          message: "Valorant stats retrieved from cache",
          stats: cachedStats,
          cached: true,
        };
      }

      logger.info(`Fetching fresh Valorant stats for user ${userId}: ${gameName}#${tag}`);

      // Fetch fresh data from Henrik's API
      const [accountData, mmrData] = await Promise.all([
        getValorantAccountByRiotId(gameName, tag),
        getValorantMMR(region, gameName, tag),
      ]);

      // Get seasonal stats from MMR data
      let wins = 0;
      let totalGames = 0;
      let losses = 0;

      // Get the current season's stats from by_season data
      if (mmrData.by_season && Object.keys(mmrData.by_season).length > 0) {
        // Find the most recent season that has actual data (not undefined)
        // Sort by episode and act number properly (e10a6 > e9a3)
        const seasonsWithData = Object.keys(mmrData.by_season)
          .filter(season => {
            const data = mmrData.by_season[season];
            return data && data.number_of_games !== undefined && data.number_of_games > 0;
          })
          .sort((a, b) => {
            // Extract episode and act numbers (e.g., "e10a6" -> episode=10, act=6)
            const parseSeasonCode = (code: string) => {
              const match = code.match(/e(\d+)a(\d+)/);
              if (!match) return { episode: 0, act: 0 };
              return {
                episode: parseInt(match[1], 10),
                act: parseInt(match[2], 10),
              };
            };

            const aData = parseSeasonCode(a);
            const bData = parseSeasonCode(b);

            // Sort by episode first, then act
            if (aData.episode !== bData.episode) {
              return aData.episode - bData.episode;
            }
            return aData.act - bData.act;
          });

        if (seasonsWithData.length > 0) {
          // Get the latest season with data
          const currentSeason = seasonsWithData[seasonsWithData.length - 1];
          const seasonData = mmrData.by_season[currentSeason];

          wins = seasonData.wins || 0;
          totalGames = seasonData.number_of_games || 0;
          losses = totalGames - wins;

          logger.info(`Current season ${currentSeason} stats: ${wins}W ${losses}L (${totalGames} total games)`);
        }
      }

      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

      // Build stats object
      const stats: ValorantStats = {
        gameName: accountData.name,
        tag: accountData.tag,
        region,
        accountLevel: accountData.account_level,
        card: accountData.card,
        currentRank: mmrData.current_data.currenttierpatched,
        rankRating: mmrData.current_data.ranking_in_tier,
        mmr: mmrData.current_data.elo,
        peakRank: mmrData.highest_rank ? {
          tier: mmrData.highest_rank.patched_tier,
          season: mmrData.highest_rank.season,
        } : undefined,
        gamesPlayed: totalGames,
        wins,
        losses,
        winRate: parseFloat(winRate.toFixed(2)),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp() as any,
      };

      // Cache the stats in Firestore
      await userRef.update({
        valorantStats: stats,
      });

      logger.info(`Successfully fetched Valorant stats for user ${userId}`);

      return {
        success: true,
        message: "Valorant stats retrieved successfully",
        stats,
        cached: false,
      };
    } catch (error) {
      logger.error("Error fetching Valorant stats:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Failed to fetch Valorant stats. Please try again."
      );
    }
  }
);
