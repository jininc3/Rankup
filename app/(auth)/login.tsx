import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { signInWithGoogleCredential } from '@/services/authService';
import { useRouter } from '@/hooks/useRouter';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function LoginScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const googleAuth = useGoogleAuth();

  useEffect(() => {
    if (googleAuth.response?.type === 'success') {
      handleGoogleSuccess(googleAuth.response);
    }
  }, [googleAuth.response]);

  const handleGoogleSuccess = async (response: any) => {
    try {
      setIsLoading(true);
      const { id_token } = response.params;

      if (id_token) {
        const profile = await signInWithGoogleCredential(id_token);
        if (profile.needsUsernameSetup) {
          router.replace({ pathname: '/(auth)/signUpBirthday', params: { signupMethod: 'google' } });
        }
        // Existing users: root routing redirects to tabs automatically
      }
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleAuth.promptAsync();
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message);
      console.error(error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          {/* Top section - Logo & tagline */}
          <View style={styles.heroSection}>
            <Image source={require('@/assets/images/rankup-white.png')} style={styles.logo} />
            <ThemedText style={styles.tagline}>
              Level up your{'\n'}game
            </ThemedText>
          </View>

          {/* Bottom section - Auth buttons */}
          <View style={styles.authSection}>
            {/* Login with username - main CTA */}
            <TouchableOpacity
              style={styles.usernameButton}
              onPress={() => router.push('/(auth)/loginUsername')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="alternate-email" size={20} color="#0f0f0f" />
              <ThemedText style={styles.usernameButtonText}>Login with username</ThemedText>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            {/* Circular icon buttons row */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialCircle, isLoading && styles.buttonDisabled]}
                onPress={handleGoogleLogin}
                disabled={!googleAuth.request || isLoading}
                activeOpacity={0.7}
              >
                <Image source={require('@/assets/images/google.png')} style={styles.socialCircleIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialCircle}
                onPress={() => router.push('/(auth)/loginPhone')}
                activeOpacity={0.7}
              >
                <IconSymbol size={22} name="phone.fill" color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialCircle}
                onPress={() => router.push('/(auth)/loginEmail')}
                activeOpacity={0.7}
              >
                <MaterialIcons name="email" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Don't have an account?{' '}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/(auth)/signUp')}>
                <ThemedText style={styles.footerLink}>Sign Up</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Hero section
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  logo: {
    width: 180,
    height: 55,
    resizeMode: 'contain',
    marginBottom: 24,
  },
  tagline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
  },

  // Auth section
  authSection: {
    paddingHorizontal: 28,
  },

  // Username button - main CTA (white, where Google used to be)
  usernameButton: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  usernameButtonText: {
    color: '#0f0f0f',
    fontSize: 16,
    fontWeight: '700',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#555',
    fontSize: 13,
  },

  // Circular icon buttons
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 28,
  },
  socialCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialCircleIcon: {
    width: 22,
    height: 22,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#555',
    fontSize: 13,
  },
  footerLink: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
