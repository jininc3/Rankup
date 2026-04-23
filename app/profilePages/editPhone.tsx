import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import rnfbAuth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

type Step = 'loading' | 'verify-current' | 'verify-otp' | 'input';

export default function EditPhoneScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('loading');
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('+44 ');
  const [isChecking, setIsChecking] = useState(false);

  // OTP state for verifying current phone
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [confirmation, setConfirmation] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const hiddenInputRef = useRef<TextInput | null>(null);

  // Load current phone number from Firestore on mount
  useEffect(() => {
    const loadCurrentPhone = async () => {
      if (!user?.id) { setStep('input'); return; }
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.phoneNumber && data.phoneVerified) {
            setCurrentPhone(data.phoneNumber);
            setStep('verify-current');
            return;
          }
        }
      } catch (error) {
        console.error('Error loading phone number:', error);
      }
      setStep('input');
    };
    loadCurrentPhone();
  }, [user?.id]);

  // --- Verify current phone OTP logic ---

  const sendCurrentPhoneOTP = async () => {
    if (!currentPhone) return;
    try {
      setIsSending(true);
      const confirm = await rnfbAuth().signInWithPhoneNumber(currentPhone);
      setConfirmation(confirm);
      setCodeSent(true);
      setStep('verify-otp');
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCodeChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) {
      hiddenInputRef.current?.blur();
    }
  };

  const handleVerifyCurrentPhone = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }
    if (!confirmation) {
      Alert.alert('Error', 'No verification session found. Please resend the code.');
      return;
    }

    try {
      setIsVerifying(true);
      await confirmation.confirm(code);
      await rnfbAuth().signOut();

      // Verified — allow changing to new number
      setCode('');
      setConfirmation(null);
      setCodeSent(false);
      setStep('input');
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
    setCode('');
    hiddenInputRef.current?.focus();
    await sendCurrentPhoneOTP();
    Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
  };

  // --- New phone input logic ---

  const isValid = /^\+?[0-9\s\-\(\)]{7,}$/.test(phoneNumber.trim());

  const handleContinue = async () => {
    if (!isValid || !user?.id) return;

    let formatted = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
    if (!formatted.startsWith('+')) formatted = '+' + formatted;

    if (currentPhone && formatted === currentPhone) {
      Alert.alert('No Change', 'This is already your phone number.');
      return;
    }

    setIsChecking(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', formatted));
      const snapshot = await getDocs(q);

      const takenByOther = snapshot.docs.some(d => d.id !== user.id);
      if (takenByOther) {
        Alert.alert('Phone Number In Use', 'This phone number is already linked to another account.');
        return;
      }

      router.replace({
        pathname: '/profilePages/verifyPhone',
        params: { phoneNumber: formatted },
      });
    } catch (error) {
      console.error('Error checking phone:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  // --- Render ---

  const renderVerifyCurrent = () => (
    <>
      <View style={styles.infoCard}>
        <IconSymbol size={24} name="lock" color="#888" />
        <ThemedText style={styles.infoText}>
          To change your phone number, you need to verify your current number first.
        </ThemedText>
      </View>

      <View style={styles.inputSection}>
        <ThemedText style={styles.label}>Current Phone</ThemedText>
        <View style={styles.currentValueContainer}>
          <ThemedText style={styles.currentValue}>{currentPhone}</ThemedText>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.continueButton, isSending && styles.buttonDisabled]}
        onPress={sendCurrentPhoneOTP}
        disabled={isSending}
        activeOpacity={0.8}
      >
        {isSending ? (
          <ActivityIndicator color="#0f0f0f" />
        ) : (
          <ThemedText style={styles.continueButtonText}>Send Verification Code</ThemedText>
        )}
      </TouchableOpacity>
    </>
  );

  const renderVerifyOTP = () => (
    <>
      <ThemedText style={styles.otpTitle}>Verify your{'\n'}current number</ThemedText>
      <ThemedText style={styles.otpSubtitle}>
        We sent a code to {currentPhone}
      </ThemedText>

      {isSending && !codeSent ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <ThemedText style={styles.loadingText}>Sending code...</ThemedText>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.otpContainer}
          activeOpacity={1}
          onPress={() => hiddenInputRef.current?.focus()}
        >
          <TextInput
            ref={hiddenInputRef}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            editable={!isVerifying}
            autoFocus
            style={styles.hiddenInput}
          />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <View
              key={index}
              style={[styles.otpInput, code[index] ? styles.otpInputFilled : null]}
            >
              <ThemedText style={styles.otpDigit}>{code[index] || ''}</ThemedText>
            </View>
          ))}
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleResend} disabled={isSending}>
        <ThemedText style={styles.resendText}>
          {isSending ? 'Sending...' : 'Resend code'}
        </ThemedText>
      </TouchableOpacity>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[styles.continueButton, (isVerifying || code.length !== 6) && styles.buttonDisabled]}
        onPress={handleVerifyCurrentPhone}
        disabled={isVerifying || code.length !== 6}
        activeOpacity={0.8}
      >
        <ThemedText style={styles.continueButtonText}>
          {isVerifying ? 'Verifying...' : 'Verify'}
        </ThemedText>
      </TouchableOpacity>
    </>
  );

  const renderNewPhoneInput = () => (
    <>
      <View style={styles.infoCard}>
        <IconSymbol size={24} name="info.circle" color="#888" />
        <ThemedText style={styles.infoText}>
          We'll send a verification code to confirm your new phone number.
        </ThemedText>
      </View>

      <View style={styles.inputSection}>
        {currentPhone && (
          <>
            <ThemedText style={styles.label}>Current Phone</ThemedText>
            <View style={styles.currentValueContainer}>
              <ThemedText style={styles.currentValue}>{currentPhone}</ThemedText>
            </View>
          </>
        )}

        <ThemedText style={styles.label}>
          {currentPhone ? 'New Phone Number' : 'Phone Number'}
        </ThemedText>
        <TextInput
          style={styles.input}
          placeholder="+44 7123 456789"
          placeholderTextColor="#666"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.continueButton, (!isValid || isChecking) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!isValid || isChecking}
        activeOpacity={0.8}
      >
        {isChecking ? (
          <ActivityIndicator color="#0f0f0f" />
        ) : (
          <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topGradient}
          pointerEvents="none"
        />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (step === 'verify-otp') {
              setStep('verify-current');
              setCode('');
              setConfirmation(null);
              setCodeSent(false);
            } else {
              router.back();
            }
          }}>
            <IconSymbol size={20} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Phone Number</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.content}>
            {step === 'loading' && (
              <ActivityIndicator color="#888" style={{ marginTop: 20 }} />
            )}
            {step === 'verify-current' && renderVerifyCurrent()}
            {step === 'verify-otp' && renderVerifyOTP()}
            {step === 'input' && renderNewPhoneInput()}
          </View>
        </KeyboardAvoidingView>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  currentValueContainer: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 24,
  },
  currentValue: {
    fontSize: 16,
    color: '#888',
  },
  input: {
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#252525',
    letterSpacing: 1,
  },
  continueButton: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#0f0f0f',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  // OTP verification styles
  otpTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#555',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 22,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInputFilled: {
    borderColor: '#fff',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a73e8',
  },
});
