import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { sendPushNotification } from './sendPushNotification';

/**
 * Cloud Function that triggers when a new notification is created
 * Automatically sends a push notification to the user's device
 */
export const onNotificationCreated = onDocumentCreated(
  'users/{userId}/notifications/{notificationId}',
  async (event) => {
    const notification = event.data?.data();
    const userId = event.params.userId;

    if (!notification) {
      console.log('No notification data found');
      return;
    }

    console.log(`Processing notification for user ${userId}:`, notification);

    const db = getFirestore();

    try {
      // Get user's notification preferences
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const preferences = userData?.notificationPreferences;

      // Check if user has disabled this type of notification
      if (preferences) {
        if (notification.type === 'like' && preferences.likes === false) {
          console.log('User disabled like notifications');
          return;
        }
        if (notification.type === 'comment' && preferences.comments === false) {
          console.log('User disabled comment notifications');
          return;
        }
        if (notification.type === 'follow' && preferences.followers === false) {
          console.log('User disabled follower notifications');
          return;
        }
      }

      // Build notification title and body based on type
      const title = 'RankUp';
      let body = '';

      switch (notification.type) {
        case 'follow':
          body = `${notification.fromUsername} started following you`;
          break;

        case 'like':
          body = `${notification.fromUsername} liked your post`;
          break;

        case 'comment':
          const commentPreview = notification.commentText?.substring(0, 50) || '';
          const commentSuffix = notification.commentText?.length > 50 ? '...' : '';
          body = `${notification.fromUsername}: ${commentPreview}${commentSuffix}`;
          break;

        case 'tag':
          body = `${notification.fromUsername} tagged you in a post`;
          break;

        default:
          console.log(`Unknown notification type: ${notification.type}`);
          return;
      }

      // Send the push notification
      await sendPushNotification(userId, title, body, {
        notificationId: event.params.notificationId,
        type: notification.type,
        fromUserId: notification.fromUserId,
        fromUsername: notification.fromUsername,
        postId: notification.postId,
        timestamp: new Date().toISOString(),
      });

      console.log(`Push notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error processing notification:', error);
      // Don't throw error - we don't want to retry failed push notifications
      // The in-app notification is already created, which is the most important part
    }
  }
);
