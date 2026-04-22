import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { createEmailAuthAccount, tryResumeEmailSignup } from '@/services/authService';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';

export default function EmailSignUpEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleContinue = async () => {
    if (!isValidEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      await createEmailAuthAccount(email.trim());
      router.push({
        pathname: '/(auth)/verifyEmailSignUp',
        params: { ...params, email: email.trim() },
      });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        const result = await tryResumeEmailSignup(email.trim());
        if (result === 'resume') {
          router.push({
            pathname: '/(auth)/verifyEmailSignUp',
            params: { ...params, email: email.trim() },
          });
        } else {
          Alert.alert('Already Registered', 'This email already has an account. Please log in instead.');
        }
      } else {
        Alert.alert('Error', error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol size={22} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <View style={styles.progress}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => router.replace({
            pathname: '/(auth)/phoneSignUpPhone',
            params: { dateOfBirth: params.dateOfBirth as string, signupMethod: 'phone' },
          })}
        >
          <ThemedText style={styles.switchButtonText}>Phone</ThemedText>
        </TouchableOpacity>

        <View style={styles.content}>
          <ThemedText style={styles.title}>What's your{'\n'}email?</ThemedText>
          <ThemedText style={styles.subtitle}>We'll send a verification link.</ThemedText>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#555"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
              editable={!isLoading}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.continueButton, (!isValidEmail(email.trim()) || isLoading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!isValidEmail(email.trim()) || isLoading}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.continueButtonText}>
              {isLoading ? 'Sending...' : 'Continue'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 60, paddingHorizontal: 16 },
  backButton: { padding: 8 },
  switchRow: { alignSelf: 'flex-end', paddingHorizontal: 28, marginTop: 10 },
  switchButtonText: { fontSize: 13, fontWeight: '600', color: '#1a73e8' },
  progress: { flex: 1, height: 2, marginLeft: 12, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  progressFill: { width: '28.6%', height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555' },
  inputContainer: { marginTop: 32 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: '#fff',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
