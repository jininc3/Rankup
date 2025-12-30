/**
 * Link Valorant Account Cloud Function (using Henrik's API)
 *
 * This function verifies a Valorant account exists and links it to the user's profile.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {getValorantAccountByRiotId} from "./valorantApi";

export interface LinkValorantAccountRequest {
  gameName: string;
  tag: string;
  region: string;
}

export interface LinkValorantAccountResponse {
  success: boolean;
  message: string;
  account?: {
    gameName: string;
    tag: string;
    region: string;
    linkedAt: any;
  };
}

/**
 * Link a Valorant account to the user's profile using Henrik's API
 *
 * @param request - Callable request containing data and auth
 * @returns Response with success status and account data
 */
export const linkValorantAccountFunction = onCall(
  {
    invoker: "public",
    secrets: ["HENRIK_API_KEY"],
  },
  async (request): Promise<LinkValorantAccountResponse> => {
    // Log request details for debugging
    logger.info("linkValorantAccount called", {
      hasAuth: !!request.auth,
      authUid: request.auth?.uid,
    });

    // Check authentication
    if (!request.auth) {
      logger.error("No auth in request");
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to link a Valorant account. Please ensure you are logged in."
      );
    }

    const userId = request.auth.uid;
    logger.info("Authenticated user:", userId);
    const data = request.data as LinkValorantAccountRequest;
    const {gameName, tag, region = "na"} = data;

    // Validate input
    if (!gameName || !tag) {
      throw new HttpsError(
        "invalid-argument",
        "Game Name and Tag are required"
      );
    }

    // Trim and validate format
    const cleanGameName = gameName.trim();
    const cleanTag = tag.trim();

    if (cleanGameName.length < 3 || cleanGameName.length > 16) {
      throw new HttpsError(
        "invalid-argument",
        "Game Name must be between 3 and 16 characters"
      );
    }

    if (cleanTag.length < 2 || cleanTag.length > 5) {
      throw new HttpsError(
        "invalid-argument",
        "Tag must be between 2 and 5 characters"
      );
    }

    // Validate region
    const validRegions = ["na", "eu", "ap", "kr", "latam", "br"];
    if (!validRegions.includes(region.toLowerCase())) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid region. Must be one of: ${validRegions.join(", ")}`
      );
    }

    try {
      logger.info(`User ${userId} is linking Valorant account: ${cleanGameName}#${cleanTag} (${region})`);

      const db = admin.firestore();

      // Create account identifier for claim checking (includes region for Valorant)
      const accountId = `valorant:${cleanGameName}#${cleanTag}#${region.toLowerCase()}`;

      // Check if account is already claimed by another user
      const linkedAccountRef = db.collection("linkedAccounts").doc(accountId);
      const linkedAccountDoc = await linkedAccountRef.get();

      if (linkedAccountDoc.exists) {
        const linkedData = linkedAccountDoc.data();
        if (linkedData && linkedData.userId !== userId) {
          logger.warn(`Account ${accountId} already linked to user ${linkedData.userId}`);
          throw new HttpsError(
            "already-exists",
            "This Valorant account is already linked to another RankUp profile. Please unlink it from the other profile first, or contact support if you believe this is an error."
          );
        }
        logger.info(`Account ${accountId} already linked to current user, allowing re-link`);
      }

      // Verify account exists via Henrik's API
      const valorantAccount = await getValorantAccountByRiotId(
        cleanGameName,
        cleanTag
      );

      logger.info(`Valorant account verified: ${valorantAccount.name}#${valorantAccount.tag}`);

      // Store in Firestore
      const userRef = db.collection("users").doc(userId);

      const accountData = {
        gameName: valorantAccount.name,
        tag: valorantAccount.tag,
        region: region.toLowerCase(),
        accountLevel: valorantAccount.account_level,
        cardUrl: valorantAccount.card?.small || null,
        linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Claim the account in linkedAccounts collection
      await linkedAccountRef.set({
        userId: userId,
        accountType: "valorant",
        gameName: valorantAccount.name,
        tag: valorantAccount.tag,
        region: region.toLowerCase(),
        linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await userRef.set({
        valorantAccount: accountData,
      }, { merge: true });

      logger.info(`Successfully linked Valorant account for user ${userId}`);

      return {
        success: true,
        message: "Valorant account linked successfully!",
        account: accountData as any,
      };
    } catch (error) {
      logger.error("Error linking Valorant account:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Failed to link Valorant account. Please verify the account exists and try again."
      );
    }
  }
);
