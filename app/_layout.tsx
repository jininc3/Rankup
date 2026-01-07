import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

import LoadingScreen from '@/app/components/loadingScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addNotificationTapListener } from '@/services/notificationService';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, needsUsernameSetup } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
    } else if (data.type === 'party_invite' || data.type === 'party_complete') {
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
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}