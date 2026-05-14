import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { auth, functions } from '@/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import rnfbAuth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

export default function VerifyEmailLogin() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const handleLink = ({ url }: { url: string }) => {
      if (rnfbAuth().isSignInWithEmailLink(url)) {
        handleSignIn(url);
      }
    };

    // Listen for incoming deep links (app in foreground/background)
    const subscription = Linking.addEventListener('url', handleLink);

    // Check if app was opened from a killed state with this link
    Linking.getInitialURL().then((url) => {
      if (url && rnfbAuth().isSignInWithEmailLink(url)) {
        handleSignIn(url);
      }
    });

    return () => subscription.remove();
  }, []);

  const handleSignIn = async (url: string) => {
    try {
      setIsVerifying(true);
      const storedEmail = (await AsyncStorage.getItem('emailForSignIn')) || email;

      // Sign in via native Firebase SDK (verifies the email link)
      await rnfbAuth().signInWithEmailLink(storedEmail, url);

      // Sign out of native SDK (same pattern as phone login)
      await rnfbAuth().signOut();

      // Bridge to web SDK via temp credentials
      const generateLogin = httpsCallable(functions, 'generateEmailLoginToken');
      const result = await generateLogin({ email: storedEmail });
      const { authEmail, tempPassword } = result.data as { authEmail: string; tempPassword: string };

      await signInWithEmailAndPassword(auth, authEmail, tempPassword);
      await AsyncStorage.removeItem('emailForSignIn');
      // AuthContext detects sign-in via onAuthStateChanged and navigates automatically
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      if (error?.message?.includes('No account found')) {
        Alert.alert(
          'No Account Found',
          'No account is linked to this email. Would you like to sign up?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => router.replace('/(auth)/signUp') },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      await rnfbAuth().sendSignInLinkToEmail(email, {
        handleCodeInApp: true,
        url: `https://${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'rankup-a2a8a.firebaseapp.com'}`,
        iOS: { bundleId: 'com.jininc3.Peakd' },
        android: { packageName: 'com.jininc3.Peakd', installApp: false },
      });
      Alert.alert('Link Sent', 'A new sign-in link has been sent to your email.');
    } catch (error) {
      console.error('Error resending link:', error);
      Alert.alert('Error', 'Failed to resend link. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <IconSymbol size={22} name="chevron.left" color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <ThemedText style={styles.title}>Check your{'\n'}email</ThemedText>
        <ThemedText style={styles.subtitle}>
          We sent a sign-in link to {email}
        </ThemedText>

        {isVerifying ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <ThemedText style={styles.statusText}>Signing in...</ThemedText>
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="mark-email-unread" size={32} color="#fff" />
            </View>
            <ThemedText style={styles.instruction}>
              Tap the link in your email to sign in. You'll be redirected back to the app automatically.
            </ThemedText>
          </View>
        )}

        <TouchableOpacity onPress={handleResend} disabled={isResending}>
          <ThemedText style={styles.resendText}>
            {isResending ? 'Sending...' : 'Resend link'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.continueButton, isVerifying ? {} : styles.buttonDisabled]}
          disabled
          activeOpacity={0.8}
        >
          <ThemedText style={styles.continueButtonText}>
            {isVerifying ? 'Signing in...' : 'Waiting for link...'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  backButton: { position: 'absolute', top: 60, left: 16, zIndex: 10, padding: 8 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 120 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', marginBottom: 40 },
  statusContainer: { alignItems: 'center', gap: 16, marginBottom: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: { fontSize: 15, color: '#888' },
  instruction: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  resendText: { fontSize: 13, fontWeight: '600', color: '#1a73e8', textAlign: 'center' },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
