import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { createEmailAuthAccount } from '@/services/authService';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => router.replace({
            pathname: '/(auth)/phoneSignUpPhone',
            params: { dateOfBirth: params.dateOfBirth as string },
          })}
        >
          <ThemedText style={styles.switchButtonText}>Phone</ThemedText>
        </TouchableOpacity>

        <View style={styles.progress}>
          <View style={styles.progressFill} />
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.step}>Step 2 of 7</ThemedText>
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
  backButton: { position: 'absolute', top: 60, left: 16, zIndex: 10, padding: 8 },
  switchButton: { position: 'absolute', top: 60, right: 16, zIndex: 10, padding: 8 },
  switchButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  progress: { marginTop: 100, marginHorizontal: 28, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  progressFill: { width: '28.6%', height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  step: { fontSize: 13, color: '#555', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555' },
  inputContainer: { marginTop: 32 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
