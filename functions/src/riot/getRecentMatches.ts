/**
 * Get Recent Matches Cloud Function
 *
 * Fetches the last 5 ranked match results (win/loss) for a given user.
 * Supports both League of Legends (Riot match-v5) and Valorant (Henrik matches API).
 * Accepts a targetUserId so it can be called for any user's duo card, not just the authenticated user.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {getRecentMatchIds, getMatchById} from "./riotApi";
import {getValorantMatches} from "../valorant/valorantApi";

export interface RecentMatchResult {
  won: boolean;
}

export interface GetRecentMatchesRequest {
  targetUserId: string;
  game: "league" | "valorant";
}

export interface GetRecentMatchesResponse {
  success: boolean;
  matches: RecentMatchResult[];
  message?: string;
}

export const getRecentMatchesFunction = onCall(
  {
    invoker: "public",
    secrets: ["RIOT_API_KEY", "HENRIK_API_KEY"],
  },
  async (request): Promise<GetRecentMatchesResponse> => {
    const {targetUserId, game} = request.data as GetRecentMatchesRequest;

    if (!targetUserId || !game) {
      throw new HttpsError(
        "invalid-argument",
        "targetUserId and game are required"
      );
    }

    try {
      const db = admin.firestore();
      const userDoc = await db.collection("users").doc(targetUserId).get();

      if (!userDoc.exists) {
        return {
          success: true,
          matches: [],
          message: "User not found",
        };
      }

      const userData = userDoc.data();

      if (game === "league") {
        return await getLeagueRecentMatches(userData);
      } else {
        return await getValorantRecentMatches(userData);
      }
    } catch (error) {
      logger.error("Error fetching recent matches:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      // Return empty matches gracefully instead of crashing
      return {
        success: true,
        matches: [],
        message: "Could not fetch match history",
      };
    }
  }
);

async function getLeagueRecentMatches(userData: any): Promise<GetRecentMatchesResponse> {
  const riotAccount = userData?.riotAccount;

  if (!riotAccount?.puuid) {
    return {
      success: true,
      matches: [],
      message: "No Riot account linked",
    };
  }

  const {puuid, region} = riotAccount;

  // Step 1: Get last 5 ranked match IDs
  const matchIds = await getRecentMatchIds(puuid, region, 5);

  if (!matchIds || matchIds.length === 0) {
    return {
      success: true,
      matches: [],
      message: "No recent matches found",
    };
  }

  // Step 2: Fetch each match detail and extract win/loss for this player
  const matches: RecentMatchResult[] = [];

  for (const matchId of matchIds) {
    try {
      const matchData = await getMatchById(matchId, region);
      const participant = matchData?.info?.participants?.find(
        (p: any) => p.puuid === puuid
      );

      if (participant) {
        matches.push({won: participant.win === true});
      }
    } catch (err) {
      logger.warn(`Failed to fetch match ${matchId}:`, err);
      // Skip this match but continue with the rest
    }
  }

  return {
    success: true,
    matches,
  };
}

async function getValorantRecentMatches(userData: any): Promise<GetRecentMatchesResponse> {
  const valorantAccount = userData?.valorantAccount;

  if (!valorantAccount) {
    return {
      success: true,
      matches: [],
      message: "No Valorant account linked",
    };
  }

  const {gameName, tag, region} = valorantAccount;

  // Henrik API returns matches with team win/loss info
  const henrikMatches = await getValorantMatches(region, gameName, tag, 5);

  if (!henrikMatches || henrikMatches.length === 0) {
    return {
      success: true,
      matches: [],
      message: "No recent matches found",
    };
  }

  // Determine which team this player is on, then check if that team won
  const matches: RecentMatchResult[] = henrikMatches.map((match) => {
    const player = match.players.all_players.find(
      (p) => p.name.toLowerCase() === gameName.toLowerCase() && p.tag.toLowerCase() === tag.toLowerCase()
    );

    if (!player) {
      // Fallback: can't determine team, default to red team
      return {won: match.teams.red.has_won};
    }

    const playerTeam = player.team.toLowerCase(); // "red" or "blue"
    const won = playerTeam === "red" ? match.teams.red.has_won : match.teams.blue.has_won;

    return {won};
  });

  return {
    success: true,
    matches,
  };
}
