import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

import LoadingScreen from '@/app/components/loadingScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ValorantStatsProvider } from '@/contexts/ValorantStatsContext';
import { Platform } from 'react-native';
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

  // Register for remote notifications so Firebase Auth gets the APNs token
  // This is required for silent phone verification (skip reCAPTCHA)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      Notifications.getDevicePushTokenAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onSignupFlow = segments[1]?.startsWith('googleSignUp') ||
                         segments[1]?.startsWith('onboardingSignUp') ||
                         segments[1]?.startsWith('emailSignUp') ||
                         segments[1]?.startsWith('phoneSignUp') ||
                         segments[1] === 'verifyEmailSignUp' ||
                         segments[1] === 'verifyPhoneSignUp';
    const inProfilePages = segments[0] === 'profilePages';

    console.log('Routing check:', {
      isAuthenticated,
      needsUsernameSetup,
      inAuthGroup,
      onSignupFlow,
      inProfilePages,
      segments
    });

    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated, redirect to login
      console.log('Redirecting to login');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && needsUsernameSetup && !onSignupFlow && !inProfilePages) {
      // Authenticated but needs username setup (allow profilePages for linking accounts during signup)
      console.log('Redirecting to signUpBirthday (google)');
      router.replace({ pathname: '/(auth)/signUpBirthday', params: { signupMethod: 'google' } });
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

      // Format notification message to match push notification content
      let message = '';
      if (data.type === 'follow') {
        message = 'started following you';
      } else if (data.type === 'like') {
        message = 'liked your post';
      } else if (data.type === 'comment') {
        const commentPreview = data.commentText?.substring(0, 50) || '';
        const commentSuffix = data.commentText?.length > 50 ? '...' : '';
        message = commentPreview ? `${commentPreview}${commentSuffix}` : 'commented on your post';
      } else if (data.type === 'tag') {
        message = 'tagged you in a post';
      } else if (data.type === 'message') {
        const msgPreview = data.messageText?.substring(0, 100) || '';
        const msgSuffix = data.messageText?.length > 100 ? '...' : '';
        message = msgPreview ? `${msgPreview}${msgSuffix}` : 'sent you a message';
      } else if (data.type === 'party_invite') {
        message = `invited you to join "${data.partyName || 'a leaderboard'}"${data.game ? ` for ${data.game}` : ''}!`;
      } else if (data.type === 'challenge_invite') {
        message = `challenged you in "${data.partyName || 'a leaderboard'}"! Accept to compete.`;
      } else if (data.type === 'party_complete') {
        message = data.winnerUsername ? `${data.winnerUsername} won the leaderboard!` : 'Leaderboard completed!';
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
        router.push(`/partyPages/leaderboardDetail?id=${data.partyId}&game=${encodeURIComponent(data.game)}`);
      }
    }
  };

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
      {isLoading && <LoadingScreen style={StyleSheet.absoluteFill} />}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ValorantStatsProvider>
        <InAppNotificationProvider>
          <RootLayoutNav />
        </InAppNotificationProvider>
      </ValorantStatsProvider>
    </AuthProvider>
  );
}