import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, KeyboardAvoidingView, Platform } from 'react-native';

export default function PhoneSignUpPhone() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [phoneNumber, setPhoneNumber] = useState('+44 ');

  const isValid = /^\+?[0-9\s\-\(\)]{7,}$/.test(phoneNumber.trim());

  const handleContinue = () => {
    if (!isValid) return;
    let formatted = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
    if (!formatted.startsWith('+')) formatted = '+' + formatted;

    router.push({
      pathname: '/(auth)/verifyPhoneSignUp',
      params: { ...params, phoneNumber: formatted },
    });
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
            pathname: '/(auth)/emailSignUpEmail',
            params: { dateOfBirth: params.dateOfBirth as string, signupMethod: 'email' },
          })}
        >
          <ThemedText style={styles.switchButtonText}>Email</ThemedText>
        </TouchableOpacity>

        <View style={styles.content}>
          <ThemedText style={styles.title}>What's your{'\n'}phone number?</ThemedText>
          <ThemedText style={styles.subtitle}>We'll send a verification code.</ThemedText>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="+44 7123 456789"
              placeholderTextColor="#555"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="default"
            />
          </View>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.continueButton, !isValid && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!isValid}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
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
    fontSize: 18, color: '#fff', letterSpacing: 1,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
