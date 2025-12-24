import React, { useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/config/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function VerifyEmailSignUp() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleCheckVerification = async () => {
    try {
      setIsChecking(true);

      // Reload the user to get the latest emailVerified status
      if (auth.currentUser) {
        await auth.currentUser.reload();
        await refreshUser();

        if (auth.currentUser.emailVerified) {
          // Email is verified, show success message
          Alert.alert(
            'Success!',
            'Your email has been verified!',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate to app after user dismisses alert
                  router.replace('/(tabs)');
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Email Not Verified',
            'Please check your email and click the verification link before continuing.'
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to check verification status. Please try again.');
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      setIsResending(true);

      if (auth.currentUser && !auth.currentUser.emailVerified) {
        await sendEmailVerification(auth.currentUser);
        Alert.alert('Email Sent', 'Verification email has been sent. Please check your inbox.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend verification email. Please try again later.');
      console.error(error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol size={80} name="envelope.fill" color="#000" />
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Verify Your Email</ThemedText>
          <ThemedText style={styles.subtitle}>
            We've sent a verification link to
          </ThemedText>
          <ThemedText style={styles.email}>{user?.email}</ThemedText>
          <ThemedText style={styles.description}>
            Click the link in the email to verify your account, then come back here and click the button below.
          </ThemedText>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.verifyButton, isChecking && styles.buttonDisabled]}
            onPress={handleCheckVerification}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.verifyButtonText}>Email Verified</ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resendButton, isResending && styles.buttonDisabled]}
            onPress={handleResendEmail}
            disabled={isResending}
          >
            <ThemedText style={styles.resendButtonText}>
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Make sure to check your spam folder if you don't see the email.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  verifyButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
