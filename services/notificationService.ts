import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and save the device token to Firestore
 * @param userId - The current user's ID
 * @returns The Expo push token or undefined if registration failed
 */
export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Only physical devices can receive push notifications
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return;
    }

    try {
      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.error('No project ID found in app config');
        return;
      }

      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;

      console.log('Expo push token:', token);

      // Save token to Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        expoPushToken: token,
        pushTokenUpdatedAt: new Date(),
      });

      console.log('Push token saved to Firestore');
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Unregister push notifications for the current user
 * @param userId - The current user's ID
 */
export async function unregisterPushNotifications(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      expoPushToken: null,
      pushTokenUpdatedAt: new Date(),
    });
    console.log('Push token removed from Firestore');
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

/**
 * Set up a listener for notification taps
 * @param callback - Function to call when a notification is tapped
 * @returns Subscription object to remove the listener
 */
export function addNotificationTapListener(
  callback: (notification: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Set up a listener for notifications received while app is in foreground
 * @param callback - Function to call when a notification is received
 * @returns Subscription object to remove the listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Set the app badge count (the number shown on the app icon)
 * @param count - The badge number to display
 */
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get the current app badge count
 * @returns The current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}
