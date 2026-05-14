import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useAppleAuth } from '@/hooks/useAppleAuth';
import { signInWithGoogleCredential, signInWithAppleCredential } from '@/services/authService';
import { useRouter } from '@/hooks/useRouter';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const googleAuth = useGoogleAuth();
  const appleAuth = useAppleAuth();

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
      Alert.alert('Google Sign Up Failed', error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await googleAuth.promptAsync();
    } catch (error: any) {
      Alert.alert('Google Sign Up Failed', error.message);
      console.error(error);
    }
  };

  const handleAppleSignUp = async () => {
    try {
      setIsLoading(true);
      const { appleCredential, rawNonce } = await appleAuth.signIn();

      if (!appleCredential.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      const profile = await signInWithAppleCredential(
        appleCredential.identityToken,
        rawNonce
      );

      if (profile.needsUsernameSetup) {
        router.replace({ pathname: '/(auth)/signUpBirthday', params: { signupMethod: 'apple' } });
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign Up Failed', error.message);
        console.error(error);
      }
    } finally {
      setIsLoading(false);
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
          <Image source={require('@/assets/images/peakdlogo.png')} style={styles.logo} />
          <ThemedText style={styles.tagline}>
            Join the{'\n'}community
          </ThemedText>
        </View>

        {/* Bottom section - Auth buttons */}
        <View style={styles.authSection}>
          {/* Google signup - main CTA */}
          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignUp}
            disabled={!googleAuth.request || isLoading}
            activeOpacity={0.8}
          >
            <Image source={require('@/assets/images/google.png')} style={styles.socialIcon} />
            <ThemedText style={styles.googleButtonText}>Continue with Google</ThemedText>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>or</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {/* Circular icon buttons row */}
          <View style={styles.socialRow}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.socialCircle, isLoading && styles.buttonDisabled]}
                onPress={handleAppleSignUp}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Image source={require('@/assets/images/apple.png')} style={styles.socialCircleIcon} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.socialCircle}
              onPress={() => router.push({ pathname: '/(auth)/signUpBirthday', params: { signupMethod: 'email' } })}
              activeOpacity={0.7}
            >
              <MaterialIcons name="email" size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialCircle}
              onPress={() => router.push({ pathname: '/(auth)/signUpBirthday', params: { signupMethod: 'phone' } })}
              activeOpacity={0.7}
            >
              <IconSymbol size={22} name="phone.fill" color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Already have an account?{' '}
            </ThemedText>
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText style={styles.footerLink}>Sign In</ThemedText>
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

  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  logo: {
    width: 400,
    height: 180,
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

  authSection: {
    paddingHorizontal: 28,
  },

  socialIcon: {
    width: 20,
    height: 20,
  },

  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  googleButtonText: {
    color: '#0f0f0f',
    fontSize: 16,
    fontWeight: '700',
  },

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
    resizeMode: 'contain',
  },

  buttonDisabled: {
    opacity: 0.5,
  },

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
