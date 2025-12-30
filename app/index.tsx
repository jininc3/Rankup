import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, needsUsernameSetup } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Not authenticated, go to login
      router.replace('/(auth)/login');
    } else if (needsUsernameSetup) {
      // Authenticated but needs username setup
      router.replace('/(auth)/googleSignUp');
    } else {
      // Authenticated and ready, go to main app
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, needsUsernameSetup]);

  // Return empty view - root layout already shows LoadingScreen
  return <View />;
}
