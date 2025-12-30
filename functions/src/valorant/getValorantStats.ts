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
  getValorantMatches,
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

      // Check cache (stats updated in last 10 minutes)
      const cachedStats = userData?.valorantStats;
      const cacheTime = cachedStats?.lastUpdated?.toDate();
      const cacheAge = cacheTime ? Date.now() - cacheTime.getTime() : Infinity;
      const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
      const [accountData, mmrData, matchesData] = await Promise.all([
        getValorantAccountByRiotId(gameName, tag),
        getValorantMMR(region, gameName, tag),
        getValorantMatches(region, gameName, tag, 20),
      ]);

      // Calculate win/loss from matches
      let wins = 0;
      let losses = 0;

      matchesData.forEach((match) => {
        const playerTeam = match.players.all_players.find(
          (p) => p.name.toLowerCase() === gameName.toLowerCase() &&
                p.tag.toLowerCase() === tag.toLowerCase()
        )?.team;

        if (playerTeam) {
          const teamData = playerTeam.toLowerCase() === "red" ?
            match.teams.red : match.teams.blue;

          if (teamData.has_won) {
            wins++;
          } else {
            losses++;
          }
        }
      });

      const totalGames = wins + losses;
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
