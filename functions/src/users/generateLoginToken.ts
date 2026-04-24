import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";

/**
 * Passwordless login helper.
 * Called after the user has verified their identity via OTP (phone).
 * Sets a temporary password on the user's Firebase Auth account and
 * returns it along with the auth email so the client can sign in
 * via signInWithEmailAndPassword on the web SDK.
 */
export const generateLoginTokenFunction = onCall(
  {invoker: "public"},
  async (request) => {
    const {phoneNumber} = request.data;

    if (!phoneNumber) {
      throw new HttpsError(
        "invalid-argument",
        "Phone number is required."
      );
    }

    const db = admin.firestore();

    let snapshot = await db.collection("users")
      .where("phoneNumber", "==", phoneNumber)
      .limit(1)
      .get();

    // Fallback: look up by the generated internal email
    if (snapshot.empty) {
      const sanitized = phoneNumber.replace(/[^0-9]/g, "");
      const generatedEmail = `phone_${sanitized}@rankup-phone.internal`;
      snapshot = await db.collection("users")
        .where("email", "==", generatedEmail)
        .limit(1)
        .get();
    }

    if (snapshot.empty) {
      throw new HttpsError("not-found", "No account found with this phone number.");
    }

    const userId = snapshot.docs[0].id;

    try {
      // Get the user's Firebase Auth email
      const authUser = await admin.auth().getUser(userId);
      const authEmail = authUser.email;

      if (!authEmail) {
        throw new HttpsError("failed-precondition", "Account has no auth email.");
      }

      // Set a temporary password so the client can sign in via the web SDK
      const tempPassword = Array.from({length: 32}, () =>
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
          .charAt(Math.floor(Math.random() * 62))
      ).join("");

      await admin.auth().updateUser(userId, {password: tempPassword});

      logger.info(`Generated login credentials for user ${userId}`);
      return {authEmail, tempPassword};
    } catch (error: any) {
      if (error instanceof HttpsError) throw error;
      logger.error("Error generating login credentials:", error);
      throw new HttpsError("internal", "Failed to generate login credentials.");
    }
  }
);
