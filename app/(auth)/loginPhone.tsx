import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';

export default function LoginPhone() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('+44 ');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const isValid = /^\+?[0-9\s\-\(\)]{7,}$/.test(phoneNumber.trim());

  const handleContinue = () => {
    if (!isValid) return;
    let formatted = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
    if (!formatted.startsWith('+')) formatted = '+' + formatted;

    router.push({
      pathname: '/(auth)/verifyPhoneLogin',
      params: { phoneNumber: formatted },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          <ThemedText style={styles.title}>Enter your{'\n'}phone number</ThemedText>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <IconSymbol size={20} name="phone.fill" color="#555" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="+44 7123 456789"
                placeholderTextColor="#555"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </View>
          </View>
        </View>

        <View style={[styles.bottomSection, !keyboardVisible && styles.bottomSectionResting]}>
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
  backButton: { position: 'absolute', top: 60, left: 16, zIndex: 10, padding: 8 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 120 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 32 },
  inputContainer: {},
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 18,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  input: { flex: 1, paddingVertical: 16, fontSize: 18, color: '#fff', letterSpacing: 1 },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 10 },
  bottomSectionResting: { paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
