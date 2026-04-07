import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { deleteIncompleteAccount } from '@/services/authService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import rnfbAuth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export default function VerifyPhoneSignUp() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const phoneNumber = params.phoneNumber as string;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Send verification code on mount
  useEffect(() => {
    sendVerificationCode();
  }, []);

  const sendVerificationCode = async () => {
    try {
      setIsSending(true);
      const confirm = await rnfbAuth().signInWithPhoneNumber(phoneNumber);
      setConfirmation(confirm);
      setCodeSent(true);
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    if (!confirmation) {
      Alert.alert('Error', 'No verification session found. Please resend the code.');
      return;
    }

    try {
      setIsVerifying(true);

      // Verify the code (this signs in with native Firebase SDK)
      await confirmation.confirm(verificationCode);

      // Sign out from native Firebase SDK (we use JS SDK for auth state)
      await rnfbAuth().signOut();

      // Mark phone as verified in Firestore
      if (user?.id) {
        await updateDoc(doc(db, 'users', user.id), {
          phoneVerified: true,
        });
      }

      Alert.alert(
        'Success!',
        'Your phone number has been verified!',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace({
                pathname: '/(auth)/onboardingSignUp1',
                params: { ...params },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Verification error:', error);
      if (error.code === 'auth/invalid-verification-code') {
        Alert.alert('Error', 'Invalid verification code. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to verify code. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    await sendVerificationCode();
    Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
  };

  const handleClose = async () => {
    Alert.alert(
      'Cancel Signup?',
      'Are you sure you want to cancel? Your account will be deleted.',
      [
        { text: 'No, Stay', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await rnfbAuth().signOut();
              await deleteIncompleteAccount();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error cancelling:', error);
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <IconSymbol size={24} name="xmark" color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol size={80} name="phone.fill" color="#fff" />
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Verify Your Phone</ThemedText>
          <ThemedText style={styles.subtitle}>
            We've sent a verification code to
          </ThemedText>
          <ThemedText style={styles.phone}>{phoneNumber}</ThemedText>
          <ThemedText style={styles.description}>
            Enter the 6-digit code below to verify your phone number.
          </ThemedText>
        </View>

        {isSending && !codeSent ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c42743" />
            <ThemedText style={styles.loadingText}>Sending code...</ThemedText>
          </View>
        ) : (
          <>
            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!isVerifying}
                />
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.verifyButton, isVerifying && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={isVerifying || code.join('').length !== 6}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.verifyButtonText}>Verify Phone</ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resendButton, isSending && styles.buttonDisabled]}
                onPress={handleResend}
                disabled={isSending}
              >
                <ThemedText style={styles.resendButtonText}>
                  {isSending ? 'Sending...' : 'Resend Code'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Standard messaging rates may apply.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
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
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
  },
  phone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3a3f44',
    backgroundColor: '#2c2f33',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  otpInputFilled: {
    borderColor: '#c42743',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  verifyButton: {
    backgroundColor: '#c42743',
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
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#fff',
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
