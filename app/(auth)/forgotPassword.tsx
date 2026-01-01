import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { auth, db } from '@/config/firebase';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailTrimmed = email.trim();

    // Validate email format
    if (!emailTrimmed.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);

      // Check if user exists and get their login provider
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', emailTrimmed));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const provider = userData.provider;

        // If user signed up with Google, tell them to use Google login
        if (provider === 'google') {
          Alert.alert(
            'Google Account Detected',
            'This account uses Google sign-in. Please use the "Continue with Google" button on the login screen instead of resetting your password.',
            [
              {
                text: 'Back to Login',
                onPress: () => router.back(),
              },
              {
                text: 'OK',
                style: 'cancel',
              },
            ]
          );
          setIsLoading(false);
          return;
        }
      }

      // Proceed with password reset for email accounts
      await sendPasswordResetEmail(auth, emailTrimmed);
      setEmailSent(true);
    } catch (error: any) {
      console.error('Password reset error:', error);

      // Handle specific error cases
      if (error.code === 'auth/user-not-found') {
        Alert.alert('Error', 'No account found with this email address');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Error', 'Invalid email address');
      } else {
        Alert.alert('Error', 'Failed to send password reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header with Back Button */}
            <View style={styles.headerContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <IconSymbol size={24} name="chevron.left" color="#000" />
              </TouchableOpacity>
            </View>

            {!emailSent ? (
              <>
                {/* Title Section */}
                <View style={styles.header}>
                  <IconSymbol size={64} name="lock.shield" color="#000" />
                  <ThemedText style={styles.title}>Forgot Password?</ThemedText>
                  <ThemedText style={styles.subtitle}>
                    No worries! Enter your email address and we'll send you a link to reset your password.
                  </ThemedText>
                </View>

                {/* Form */}
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <ThemedText style={styles.label}>Email Address</ThemedText>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!isLoading}
                      returnKeyType="send"
                      onSubmitEditing={handleSendResetEmail}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.sendButton, isLoading && styles.buttonDisabled]}
                    onPress={handleSendResetEmail}
                    disabled={isLoading}
                  >
                    <ThemedText style={styles.sendButtonText}>
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Success State */}
                <View style={styles.successContainer}>
                  <View style={styles.successIconContainer}>
                    <IconSymbol size={80} name="checkmark.circle.fill" color="#22c55e" />
                  </View>
                  <ThemedText style={styles.successTitle}>Email Sent!</ThemedText>
                  <ThemedText style={styles.successSubtitle}>
                    We've sent a password reset link to
                  </ThemedText>
                  <ThemedText style={styles.emailText}>{email}</ThemedText>
                  <ThemedText style={styles.instructionText}>
                    Please check your inbox and follow the instructions to reset your password.
                  </ThemedText>

                  <TouchableOpacity
                    style={styles.backToLoginButton}
                    onPress={() => router.back()}
                  >
                    <ThemedText style={styles.backToLoginText}>
                      Back to Login
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={() => setEmailSent(false)}
                  >
                    <ThemedText style={styles.resendText}>
                      Didn't receive the email?
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  headerContainer: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
    overflow: 'visible',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 36,
    overflow: 'visible',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  sendButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    overflow: 'visible',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 36,
    overflow: 'visible',
  },
  successSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  backToLoginButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginBottom: 16,
  },
  backToLoginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    padding: 8,
  },
  resendText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
