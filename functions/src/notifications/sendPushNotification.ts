import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { getFirestore } from 'firebase-admin/firestore';

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send a push notification to a user
 * @param recipientUserId - The user ID to send the notification to
 * @param title - The notification title
 * @param body - The notification body text
 * @param data - Optional data to include with the notification
 * @returns Promise that resolves when notification is sent
 */
export async function sendPushNotification(
  recipientUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const db = getFirestore();

  try {
    // Get recipient's user document
    const userDoc = await db.collection('users').doc(recipientUserId).get();

    if (!userDoc.exists) {
      console.log(`User ${recipientUserId} not found`);
      return;
    }

    const userData = userDoc.data();

    // Check if user has a push token
    if (!userData?.expoPushToken) {
      console.log(`No push token for user ${recipientUserId}`);
      return;
    }

    const pushToken = userData.expoPushToken;

    // Check that the token is a valid Expo push token
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      return;
    }

    // Construct the push notification message
    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
      badge: 1,
      priority: 'high',
    };

    // Send the push notification
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    console.log('Push notification sent:', ticketChunk);

    // Check for errors in the ticket
    const ticket = ticketChunk[0] as ExpoPushTicket;
    if (ticket.status === 'error') {
      console.error(`Error sending push notification: ${ticket.message}`);

      // If the token is invalid, remove it from the user's document
      if (ticket.details?.error === 'DeviceNotRegistered') {
        console.log(`Removing invalid push token for user ${recipientUserId}`);
        await db.collection('users').doc(recipientUserId).update({
          expoPushToken: null,
          pushTokenUpdatedAt: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send push notifications to multiple users
 * @param notifications - Array of notification objects with recipientUserId, title, body, and optional data
 * @returns Promise that resolves when all notifications are sent
 */
export async function sendBatchPushNotifications(
  notifications: Array<{
    recipientUserId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }>
): Promise<void> {
  const db = getFirestore();
  const messages: ExpoPushMessage[] = [];
  const tokenToUserIdMap: Map<string, string> = new Map();

  try {
    // Collect all push tokens and build messages
    for (const notification of notifications) {
      const userDoc = await db.collection('users').doc(notification.recipientUserId).get();

      if (!userDoc.exists) {
        console.log(`User ${notification.recipientUserId} not found`);
        continue;
      }

      const userData = userDoc.data();

      if (!userData?.expoPushToken) {
        console.log(`No push token for user ${notification.recipientUserId}`);
        continue;
      }

      const pushToken = userData.expoPushToken;

      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      tokenToUserIdMap.set(pushToken, notification.recipientUserId);

      messages.push({
        to: pushToken,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: 1,
        priority: 'high',
      });
    }

    if (messages.length === 0) {
      console.log('No valid push tokens found');
      return;
    }

    // Send notifications in chunks (Expo recommends chunks of 100)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...(ticketChunk as ExpoPushTicket[]));
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }

    // Check for errors and clean up invalid tokens
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        console.error(`Error in ticket ${i}: ${ticket.message}`);

        // Remove invalid tokens
        if (ticket.details?.error === 'DeviceNotRegistered') {
          const message = messages[i];
          const userId = tokenToUserIdMap.get(message.to as string);
          if (userId) {
            console.log(`Removing invalid push token for user ${userId}`);
            await db.collection('users').doc(userId).update({
              expoPushToken: null,
              pushTokenUpdatedAt: new Date(),
            });
          }
        }
      }
    }

    console.log(`Successfully sent ${messages.length} push notifications`);
  } catch (error) {
    console.error('Error sending batch push notifications:', error);
    throw error;
  }
}
