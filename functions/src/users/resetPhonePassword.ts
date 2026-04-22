import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";

/**
 * Cloud Function: Reset password for phone-based accounts.
 *
 * Called after OTP verification succeeds on the client.
 * Looks up the user by phone number, sets a temporary password,
 * and returns the generated email so the client can sign in
 * via the web SDK and then update to the user's chosen password.
 */
export const resetPhonePasswordFunction = onCall(
  {invoker: "public"},
  async (request) => {
    const {phoneNumber, newPassword} = request.data;

    if (!phoneNumber || typeof phoneNumber !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "Phone number is required."
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "New password must be at least 6 characters."
      );
    }

    try {
      // Find user by phone number in Firestore
      const usersSnapshot = await admin.firestore()
        .collection("users")
        .where("phoneNumber", "==", phoneNumber)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        throw new HttpsError(
          "not-found",
          "No account found with this phone number."
        );
      }

      const userId = usersSnapshot.docs[0].id;
      const userData = usersSnapshot.docs[0].data();
      const email = userData.email;

      if (!email) {
        throw new HttpsError(
          "failed-precondition",
          "Account has no email associated."
        );
      }

      // Update the password via Admin SDK (no old password needed)
      await admin.auth().updateUser(userId, {
        password: newPassword,
      });

      logger.info(`Password reset for phone user ${userId}`);

      return {success: true, email};
    } catch (error: any) {
      if (error instanceof HttpsError) throw error;
      logger.error("Error resetting phone password:", error);
      throw new HttpsError(
        "internal",
        "Failed to reset password. Please try again."
      );
    }
  }
);
