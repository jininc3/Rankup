import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { deleteIncompleteAccount, createPhoneAuthAccount, tryResumePhoneSignup } from '@/services/authService';
import rnfbAuth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export default function VerifyPhoneSignUp() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const phoneNumberRaw = params.phoneNumber as string;

  const formatE164 = (phone: string): string => {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  const phoneNumber = formatE164(phoneNumberRaw);

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

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
      await confirmation.confirm(verificationCode);
      await rnfbAuth().signOut();

      try {
        await createPhoneAuthAccount(phoneNumber);
      } catch (createError: any) {
        if (createError.code === 'auth/email-already-in-use') {
          // Incomplete signup from before — try to resume
          const result = await tryResumePhoneSignup(phoneNumber);
          if (result === 'resume') {
            router.replace({
              pathname: '/(auth)/signUpUsername',
              params: { ...params },
            });
            return;
          } else {
            Alert.alert('Already Registered', 'This phone number already has an account. Please log in instead.');
            return;
          }
        }
        throw createError;
      }

      Alert.alert(
        'Success!',
        'Your phone number has been verified!',
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

  const handleBack = async () => {
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <IconSymbol size={22} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <View style={styles.progress}>
              <View style={styles.progressFill} />
            </View>
          </View>

          <View style={styles.content}>
            <ThemedText style={styles.title}>Verify your{'\n'}phone number</ThemedText>
            <ThemedText style={styles.subtitle}>
              We sent a code to {phoneNumber}
            </ThemedText>

            {isSending && !codeSent ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <ThemedText style={styles.loadingText}>Sending code...</ThemedText>
              </View>
            ) : (
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
            )}

            <TouchableOpacity
              onPress={handleResend}
              disabled={isSending}
            >
              <ThemedText style={styles.resendText}>
                {isSending ? 'Sending...' : 'Resend code'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.continueButton, (isVerifying || code.join('').length !== 6) && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={isVerifying || code.join('').length !== 6}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.continueButtonText}>
                {isVerifying ? 'Verifying...' : 'Continue'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
  loadingContainer: { alignItems: 'center', gap: 12, marginTop: 32 },
  loadingText: { fontSize: 14, color: '#555' },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  otpInputFilled: {
    borderColor: '#fff',
  },
  resendText: { fontSize: 13, fontWeight: '600', color: '#1a73e8' },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
