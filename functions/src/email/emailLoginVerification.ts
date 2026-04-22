/**
 * Cloud Functions for email verification during LOGIN (passwordless).
 *
 * sendEmailLoginCode: Generates a 6-digit code, stores it in Firestore,
 *   and sends it to the user's email via Resend. Only works for existing accounts.
 *
 * verifyEmailLoginCode: Checks the code and returns a custom auth token.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";
import {Resend} from "resend";

const resendApiKey = defineSecret("RESEND_API_KEY");

const CODE_EXPIRY_MINUTES = 10;
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export const sendEmailLoginCodeFunction = onCall(
  {invoker: "public", secrets: [resendApiKey]},
  async (request) => {
    const {email} = request.data as {email: string};

    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "Email is required.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new HttpsError("invalid-argument", "Invalid email address.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = admin.firestore();

    // Verify this email has an existing account
    const usersQuery = await db
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      throw new HttpsError(
        "not-found",
        "No account found with this email."
      );
    }

    // Generate code and store in Firestore
    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await db.collection("emailLoginCodes").doc(normalizedEmail).set({
      code,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email via Resend
    const resend = new Resend(resendApiKey.value());

    const {error} = await resend.emails.send({
      from: "RankUp <onboarding@resend.dev>",
      to: normalizedEmail,
      subject: "Your RankUp login code",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #fff; background: #0f0f0f; padding: 24px; border-radius: 12px; text-align: center;">
            Your login code
          </h2>
          <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; text-align: center; margin: 24px 0;">
            ${code}
          </p>
          <p style="color: #666; font-size: 14px; text-align: center;">
            This code expires in ${CODE_EXPIRY_MINUTES} minutes.
          </p>
        </div>
      `,
    });

    if (error) {
      logger.error(`Resend error for ${normalizedEmail}: ${JSON.stringify(error)}`);
      throw new HttpsError("internal", "Failed to send verification email.");
    }

    logger.info(`Login code sent to ${normalizedEmail}`);
    return {success: true};
  }
);

export const verifyEmailLoginCodeFunction = onCall(
  {invoker: "public"},
  async (request) => {
    const {email, code} = request.data as {email: string; code: string};

    if (!email || !code) {
      throw new HttpsError("invalid-argument", "Email and code are required.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = admin.firestore();
    const docRef = db.collection("emailLoginCodes").doc(normalizedEmail);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new HttpsError("not-found", "No verification code found. Please request a new one.");
    }

    const data = docSnap.data()!;

    if (new Date() > data.expiresAt.toDate()) {
      await docRef.delete();
      throw new HttpsError("deadline-exceeded", "Code expired. Please request a new one.");
    }

    if (data.attempts >= 5) {
      await docRef.delete();
      throw new HttpsError("resource-exhausted", "Too many attempts. Please request a new code.");
    }

    if (data.code !== code) {
      await docRef.update({attempts: admin.firestore.FieldValue.increment(1)});
      throw new HttpsError("permission-denied", "Incorrect verification code.");
    }

    // Code correct — delete it
    await docRef.delete();

    // Find user in Firestore
    const usersQuery = await db.collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      throw new HttpsError("not-found", "No account found.");
    }

    const userId = usersQuery.docs[0].id;

    // Set a temporary password so the client can sign in via the web SDK
    const tempPassword = Array.from({length: 32}, () =>
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        .charAt(Math.floor(Math.random() * 62))
    ).join("");

    // Get the user's Firebase Auth email (may differ from Firestore email for phone users)
    const authUser = await admin.auth().getUser(userId);
    const authEmail = authUser.email;

    if (!authEmail) {
      throw new HttpsError("failed-precondition", "Account has no auth email.");
    }

    await admin.auth().updateUser(userId, {password: tempPassword});

    logger.info(`Email login verified for ${normalizedEmail}`);
    return {success: true, authEmail, tempPassword};
  }
);
