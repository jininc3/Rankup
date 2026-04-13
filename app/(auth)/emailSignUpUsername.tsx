import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function EmailSignUpUsername() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(async (name: string) => {
    if (name.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const q = query(collection(db, 'users'), where('usernameLower', '==', name.toLowerCase()));
      const snapshot = await getDocs(q);
      setUsernameAvailable(snapshot.empty);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  const handleUsernameChange = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
    setUsername(cleaned);
    setUsernameAvailable(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cleaned.length >= 3) {
      debounceRef.current = setTimeout(() => checkUsername(cleaned), 500);
    }
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const isValid = username.length >= 3 && usernameAvailable === true;

  const handleContinue = () => {
    if (!isValid) return;
    router.push({
      pathname: '/(auth)/emailSignUpPassword',
      params: { ...params, username, avatarUri: avatarUri || '' },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>

        <View style={styles.progress}>
          <View style={styles.progressFill} />
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.step}>Step 4 of 7</ThemedText>
          <ThemedText style={styles.title}>Pick a username{'\n'}and photo</ThemedText>

          <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar} activeOpacity={0.7}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <IconSymbol size={28} name="camera.fill" color="#555" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <IconSymbol size={12} name="plus" color="#0f0f0f" />
            </View>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#555"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            {username.length >= 3 && (
              <View style={styles.usernameStatus}>
                {checkingUsername ? (
                  <ThemedText style={styles.statusChecking}>Checking...</ThemedText>
                ) : usernameAvailable === true ? (
                  <ThemedText style={styles.statusAvailable}>Available</ThemedText>
                ) : usernameAvailable === false ? (
                  <ThemedText style={styles.statusTaken}>Taken</ThemedText>
                ) : null}
              </View>
            )}
          </View>

          <ThemedText style={styles.hint}>3-20 characters. Letters, numbers, and underscores only.</ThemedText>
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
  backButton: { position: 'absolute', top: 60, left: 16, zIndex: 10, padding: 8 },
  progress: { marginTop: 100, marginHorizontal: 28, height: 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  progressFill: { width: '57.1%', height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  step: { fontSize: 13, color: '#555', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 24 },
  avatarPicker: { alignSelf: 'center', marginBottom: 28 },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  inputContainer: { position: 'relative' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: '#fff',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  usernameStatus: { position: 'absolute', right: 16, top: 16 },
  statusChecking: { fontSize: 13, color: '#555' },
  statusAvailable: { fontSize: 13, color: '#22C55E' },
  statusTaken: { fontSize: 13, color: '#EF4444' },
  hint: { fontSize: 12, color: '#444', marginTop: 8 },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
