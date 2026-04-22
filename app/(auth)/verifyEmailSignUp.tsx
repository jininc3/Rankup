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
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { deleteIncompleteAccount } from '@/services/authService';

export default function VerifyEmailSignUp() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleCheckVerification = async () => {
    try {
      setIsChecking(true);

      if (auth.currentUser) {
        await auth.currentUser.reload();
        await refreshUser();

        if (auth.currentUser.emailVerified) {
          Alert.alert(
            'Success!',
            'Your email has been verified!',
            [
              {
                text: 'OK',
                onPress: () => {
                  router.replace({
                    pathname: '/(auth)/signUpUsername',
                    params: { ...params },
                  });
                },
              },
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

  const handleBack = async () => {
    Alert.alert(
      'Cancel Signup?',
      'Are you sure you want to cancel? Your account will be deleted.',
      [
        {
          text: 'No, Stay',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIncompleteAccount();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error deleting account:', error);
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <View style={styles.progress}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.title}>Verify your{'\n'}email</ThemedText>
        <ThemedText style={styles.subtitle}>
          We sent a verification link to {email || auth.currentUser?.email}
        </ThemedText>

        <View style={styles.infoContainer}>
          <View style={styles.iconRow}>
            <IconSymbol size={48} name="envelope.fill" color="#fff" />
          </View>
          <ThemedText style={styles.description}>
            Click the link in the email to verify your account, then come back here and tap continue.
          </ThemedText>
          <ThemedText style={styles.spamNote}>
            Make sure to check your spam folder if you don't see the email.
          </ThemedText>
        </View>

        <TouchableOpacity
          onPress={handleResendEmail}
          disabled={isResending}
        >
          <ThemedText style={styles.resendText}>
            {isResending ? 'Sending...' : 'Resend email'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.continueButton, isChecking && styles.buttonDisabled]}
          onPress={handleCheckVerification}
          disabled={isChecking}
          activeOpacity={0.8}
        >
          {isChecking ? (
            <ActivityIndicator color="#0f0f0f" />
          ) : (
            <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 60, paddingHorizontal: 16 },
  backButton: { padding: 8 },
  progress: { flex: 1, height: 2, marginLeft: 12, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  progressFill: { width: '42.8%', height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', marginBottom: 32 },
  infoContainer: { alignItems: 'center', marginBottom: 24, gap: 16 },
  iconRow: { marginBottom: 8 },
  description: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  spamNote: { fontSize: 12, color: '#555', textAlign: 'center' },
  resendText: { fontSize: 13, fontWeight: '600', color: '#1a73e8' },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
