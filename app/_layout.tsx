import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

import LoadingScreen from '@/app/components/loadingScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addNotificationTapListener, addNotificationReceivedListener } from '@/services/notificationService';
import { InAppNotificationProvider, useInAppNotification } from '@/contexts/InAppNotificationContext';
import InAppNotificationContainer from '@/app/components/InAppNotificationContainer';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, needsUsernameSetup } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { showNotification } = useInAppNotification();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onUsernameSetup = segments[1] === 'googleSignUp';

    console.log('Routing check:', {
      isAuthenticated,
      needsUsernameSetup,
      inAuthGroup,
      onUsernameSetup,
      segments
    });

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated, redirect to login
      console.log('Redirecting to login');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && needsUsernameSetup && !onUsernameSetup) {
      // Authenticated but needs username setup
      console.log('Redirecting to googleSignUp');
      router.replace('/(auth)/googleSignUp');
    } else if (isAuthenticated && !needsUsernameSetup && inAuthGroup) {
      // Authenticated with username set, redirect to main app
      console.log('Redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading, needsUsernameSetup]);

  // Set up notification tap handlers
  useEffect(() => {
    // Handle notification that opened the app (when app was closed)
    const handleInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const data = response.notification.request.content.data;
        console.log('App opened from notification:', data);
        handleNotificationNavigation(data);
      }
    };

    // Only check for initial notification when user is authenticated
    if (isAuthenticated && !isLoading) {
      handleInitialNotification();
    }

    // Handle notifications tapped while app is open or in background
    const subscription = addNotificationTapListener((response) => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      handleNotificationNavigation(data);
    });

    // Clean up subscription on unmount
    return () => subscription.remove();
  }, [router, isAuthenticated, isLoading]);

  // Listen for foreground notifications and show in-app banner
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const subscription = addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      console.log('Foreground notification received:', data);

      // Format notification message
      let message = '';
      if (data.type === 'follow') {
        message = 'started following you';
      } else if (data.type === 'like') {
        message = 'liked your post';
      } else if (data.type === 'comment') {
        message = 'commented on your post';
      } else if (data.type === 'tag') {
        message = 'tagged you in a post';
      } else if (data.type === 'message') {
        message = 'sent you a message';
      } else if (data.type === 'party_invite') {
        message = `invited you to ${data.partyName || 'a party'}`;
      } else if (data.type === 'party_complete') {
        message = data.winnerUsername ? `${data.winnerUsername} won the party!` : 'Party completed!';
      } else if (data.type === 'party_ranking_change') {
        if (data.newRank) {
          const rankEmoji = data.newRank === 1 ? '🥇' : data.newRank === 2 ? '🥈' : data.newRank === 3 ? '🥉' : '';
          const rankText = rankEmoji ? `${rankEmoji} #${data.newRank}` : `#${data.newRank}`;
          message = `${data.username} just moved to ${rankText} in ${data.partyName}!`;
        } else {
          message = `${data.username} just moved in ${data.partyName} rankings!`;
        }
      }

      // Show in-app notification
      showNotification({
        id: Date.now().toString(),
        type: data.type,
        fromUserId: data.fromUserId,
        fromUsername: data.fromUsername,
        fromUserAvatar: data.fromUserAvatar,
        postId: data.postId,
        postThumbnail: data.postThumbnail,
        chatId: data.chatId,
        partyId: data.partyId,
        game: data.game,
        message,
        navigationData: data,
      });
    });

    return () => subscription.remove();
  }, [isAuthenticated, isLoading, showNotification]);

  // Centralized notification navigation handler
  const handleNotificationNavigation = (data: any) => {
    if (data.type === 'follow') {
      // Navigate to the user's profile who followed you
      router.push(`/profilePages/profileView?userId=${data.fromUserId}`);
    } else if (data.type === 'like' || data.type === 'comment' || data.type === 'tag') {
      // Navigate to the post that was liked/commented/tagged
      if (data.postId) {
        router.push(`/postViewer?postId=${data.postId}`);
      }
    } else if (data.type === 'message') {
      // Navigate to the chat screen
      if (data.chatId && data.senderId && data.senderUsername) {
        router.push(`/chatPages/chatScreen?chatId=${data.chatId}&otherUserId=${data.senderId}&otherUsername=${data.senderUsername}`);
      }
    } else if (data.type === 'party_invite' || data.type === 'party_complete' || data.type === 'party_ranking_change') {
      // Navigate to the party details/leaderboard
      if (data.partyId && data.game) {
        router.push(`/leaderboardPages/leaderboardDetail?partyId=${data.partyId}&game=${encodeURIComponent(data.game)}`);
      }
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="components/gameStats" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <InAppNotificationContainer />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <InAppNotificationProvider>
        <RootLayoutNav />
      </InAppNotificationProvider>
    </AuthProvider>
  );
}