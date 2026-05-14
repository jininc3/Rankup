import { useEffect } from 'react';
import { useRouter } from '@/hooks/useRouter';
import { useAuth } from '@/contexts/AuthContext';
import { View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, needsUsernameSetup } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || needsUsernameSetup) {
      // Not authenticated or needs username setup — go to login
      router.replace('/(auth)/login');
    } else {
      // Authenticated and ready, go to main app
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, needsUsernameSetup]);

  // Return empty view - root layout already shows LoadingScreen
  return <View style={{ flex: 1, backgroundColor: '#0f0f0f' }} />;
}
