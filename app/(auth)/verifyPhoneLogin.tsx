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
import { useRouter, useLocalSearchParams } from 'expo-router';
import rnfbAuth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export default function VerifyPhoneLogin() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phoneNumber = params.phoneNumber as string;

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
      // This signs in the user with the native Firebase SDK
      await confirmation.confirm(verificationCode);
      // AuthContext will detect the sign-in via onAuthStateChanged
      // Navigation handled automatically
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

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <IconSymbol size={24} name="chevron.left" color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol size={80} name="phone.fill" color="#fff" />
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Enter Code</ThemedText>
          <ThemedText style={styles.subtitle}>
            We sent a verification code to
          </ThemedText>
          <ThemedText style={styles.phone}>{phoneNumber}</ThemedText>
        </View>

        {isSending && !codeSent ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c42743" />
            <ThemedText style={styles.loadingText}>Sending code...</ThemedText>
          </View>
        ) : (
          <>
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
                  <ThemedText style={styles.verifyButtonText}>Sign In</ThemedText>
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
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
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
    marginBottom: 12,
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
});
