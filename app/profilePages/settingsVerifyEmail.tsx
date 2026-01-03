import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { auth, db } from '@/config/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

export default function SettingsVerifyEmailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const newEmail = params.email as string;
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const checkEmailVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setIsChecking(true);

    try {
      // Reload user data to get latest emailVerified status
      await reload(currentUser);

      if (currentUser.emailVerified) {
        // Email is verified, update Firestore
        if (user?.id) {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, {
            email: currentUser.email,
            updatedAt: new Date(),
          });
        }

        Alert.alert(
          'Email Updated',
          'Your email address has been successfully verified and updated!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/profilePages/accountSettings'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Not Verified Yet',
          'Please check your email and click the verification link. It may take a few moments to arrive.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
      Alert.alert('Error', 'Failed to check verification status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setIsResending(true);

    try {
      await sendEmailVerification(currentUser);
      Alert.alert('Email Sent', 'Verification email has been resent. Please check your inbox.');
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      if (error.code === 'auth/too-many-requests') {
        Alert.alert('Too Many Requests', 'Please wait a few minutes before requesting another verification email.');
      } else {
        Alert.alert('Error', 'Failed to resend verification email. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/profilePages/accountSettings')}
        >
          <IconSymbol size={24} name="chevron.left" color="#000" />
          <ThemedText style={styles.backText}>Cancel</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Verify Email</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol size={80} name="envelope.fill" color="#000" />
        </View>

        <ThemedText style={styles.title}>Check Your Email</ThemedText>
        <ThemedText style={styles.subtitle}>
          We've sent a verification email to:
        </ThemedText>

        <View style={styles.emailBox}>
          <ThemedText style={styles.email}>{newEmail}</ThemedText>
        </View>

        <View style={styles.instructionsCard}>
          <ThemedText style={styles.instructionsTitle}>Next Steps:</ThemedText>
          <View style={styles.instructionItem}>
            <ThemedText style={styles.instructionNumber}>1.</ThemedText>
            <ThemedText style={styles.instructionText}>
              Open the email we sent to {newEmail}
            </ThemedText>
          </View>
          <View style={styles.instructionItem}>
            <ThemedText style={styles.instructionNumber}>2.</ThemedText>
            <ThemedText style={styles.instructionText}>
              Click the verification link in the email
            </ThemedText>
          </View>
          <View style={styles.instructionItem}>
            <ThemedText style={styles.instructionNumber}>3.</ThemedText>
            <ThemedText style={styles.instructionText}>
              Come back here and tap "I've Verified My Email"
            </ThemedText>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, isChecking && styles.buttonDisabled]}
          onPress={checkEmailVerification}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.verifyButtonText}>I've Verified My Email</ThemedText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resendButton, isResending && styles.buttonDisabled]}
          onPress={handleResendEmail}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <ThemedText style={styles.resendButtonText}>Resend Verification Email</ThemedText>
          )}
        </TouchableOpacity>

        <ThemedText style={styles.helpText}>
          Didn't receive the email? Check your spam folder or resend the verification email.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  backText: {
    fontSize: 17,
    color: '#000',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  emailBox: {
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 32,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  instructionsCard: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    width: 20,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resendButton: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helpText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
