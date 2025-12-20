import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/app/components/loadingScreen';
import { addNotificationTapListener } from '@/services/notificationService';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, needsUsernameSetup } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onUsernameSetup = segments[1] === 'createUsername';

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
      console.log('Redirecting to createUsername');
      router.replace('/(auth)/createUsername');
    } else if (isAuthenticated && !needsUsernameSetup && inAuthGroup) {
      // Authenticated with username set, redirect to main app
      console.log('Redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading, needsUsernameSetup]);

  // Set up notification tap handlers
  useEffect(() => {
    const subscription = addNotificationTapListener((response) => {
      const data = response.notification.request.content.data;

      console.log('Notification tapped:', data);

      // Navigate based on notification type
      if (data.type === 'follow') {
        // Navigate to the user's profile who followed
        router.push(`/profilePages/viewOthersProfile?userId=${data.fromUserId}`);
      } else if (data.type === 'like' || data.type === 'comment' || data.type === 'tag') {
        // Navigate to the post
        if (data.postId) {
          router.push(`/components/postViewerModal?postId=${data.postId}`);
        }
      }
    });

    // Clean up subscription on unmount
    return () => subscription.remove();
  }, [router]);

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
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="components/gameStats" options={{ headerShown: false }} />
        <Stack.Screen
          name="profilePages/settings"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="leaderboardPages/[id]"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="leaderboardPages/leaderboardDetail"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
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