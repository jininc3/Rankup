import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { signUpWithEmail } from '@/services/authService';
import { db, auth } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';

export default function EmailSignUpStep3() {
  const router = useRouter();
  const { username, dateOfBirth } = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const validatePassword = (pwd: string): { isValid: boolean; message?: string } => {
    if (pwd.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[0-9]/.test(pwd)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }
    if (!/[a-zA-Z]/.test(pwd)) {
      return { isValid: false, message: 'Password must contain at least one letter' };
    }
    return { isValid: true };
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert('Weak Password', passwordValidation.message || 'Please choose a stronger password');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const user = await signUpWithEmail(
        email.trim(),
        password,
        (username as string).toLowerCase()
      );

      // Save date of birth to Firestore
      if (user?.id) {
        await updateDoc(doc(db, 'users', user.id), {
          dateOfBirth: dateOfBirth as string,
        });
      }

      // Send email verification
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        await sendEmailVerification(auth.currentUser);
      }

      // Navigate to email verification page
      router.replace('/(auth)/verifyEmailSignUp');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
          >
            <IconSymbol size={24} name="chevron.left" color="#000" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Account Details</ThemedText>
              <ThemedText style={styles.subtitle}>
                Step 3 of 3
              </ThemedText>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Email *</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Password *</ThemedText>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                />
                {password.length > 0 && (
                  <View style={styles.requirementsCard}>
                    <View style={styles.requirementItem}>
                      <IconSymbol
                        size={16}
                        name={password.length >= 8 ? "checkmark.circle.fill" : "circle"}
                        color={password.length >= 8 ? "#22c55e" : "#999"}
                      />
                      <ThemedText style={[
                        styles.requirementText,
                        password.length >= 8 && styles.requirementMet
                      ]}>
                        At least 8 characters
                      </ThemedText>
                    </View>
                    <View style={styles.requirementItem}>
                      <IconSymbol
                        size={16}
                        name={/[0-9]/.test(password) ? "checkmark.circle.fill" : "circle"}
                        color={/[0-9]/.test(password) ? "#22c55e" : "#999"}
                      />
                      <ThemedText style={[
                        styles.requirementText,
                        /[0-9]/.test(password) && styles.requirementMet
                      ]}>
                        At least one number
                      </ThemedText>
                    </View>
                    <View style={styles.requirementItem}>
                      <IconSymbol
                        size={16}
                        name={/[a-zA-Z]/.test(password) ? "checkmark.circle.fill" : "circle"}
                        color={/[a-zA-Z]/.test(password) ? "#22c55e" : "#999"}
                      />
                      <ThemedText style={[
                        styles.requirementText,
                        /[a-zA-Z]/.test(password) && styles.requirementMet
                      ]}>
                        At least one letter
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Confirm Password *</ThemedText>
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
                {confirmPassword.length > 0 && (
                  <View style={styles.requirementItem}>
                    <IconSymbol
                      size={16}
                      name={password === confirmPassword && confirmPassword !== '' ? "checkmark.circle.fill" : "circle"}
                      color={password === confirmPassword && confirmPassword !== '' ? "#22c55e" : "#999"}
                    />
                    <ThemedText style={[
                      styles.requirementText,
                      password === confirmPassword && confirmPassword !== '' && styles.requirementMet
                    ]}>
                      Passwords match
                    </ThemedText>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.signupButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                <ThemedText style={styles.signupButtonText}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </ThemedText>
              </TouchableOpacity>
            </View>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
    overflow: 'visible',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 40,
    overflow: 'visible',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
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
  signupButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  requirementsCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
  },
  requirementMet: {
    color: '#22c55e',
    fontWeight: '500',
  },
});
