import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";

/**
 * Set a password on a user's Firebase Auth account via Admin SDK.
 * Used during signup to ensure all users (including Google/phone)
 * can login with username + password.
 * Must be called by the authenticated user for their own account.
 */
export const setUserPasswordFunction = onCall(
  {invoker: "public"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated.");
    }

    const {password} = request.data;

    if (!password || typeof password !== "string" || password.length < 8) {
      throw new HttpsError(
        "invalid-argument",
        "Password must be at least 8 characters."
      );
    }

    const userId = request.auth.uid;

    try {
      await admin.auth().updateUser(userId, {password});
      logger.info(`Password set for user ${userId}`);
      return {success: true};
    } catch (error: any) {
      logger.error("Error setting password:", error);
      throw new HttpsError("internal", "Failed to set password.");
    }
  }
);
