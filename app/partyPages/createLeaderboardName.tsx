import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, Image, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function CreateLeaderboardName() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const pickIcon = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setIconUri(result.assets[0].uri);
  };

  const handleContinue = () => {
    if (!name.trim()) return;
    router.push({
      pathname: '/partyPages/createLeaderboardGame',
      params: { name: name.trim().toUpperCase(), iconUri: iconUri || '' },
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
            <View style={[styles.progressFill, { width: '20%' }]} />
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.step}>Step 1 of 5</ThemedText>
          <ThemedText style={styles.title}>Name your{'\n'}leaderboard</ThemedText>

          <TouchableOpacity style={styles.iconPicker} onPress={pickIcon} activeOpacity={0.7}>
            {iconUri ? (
              <Image source={{ uri: iconUri }} style={styles.iconImage} />
            ) : (
              <View style={styles.iconPlaceholder}>
                <IconSymbol size={28} name="trophy.fill" color="#555" />
              </View>
            )}
            <View style={styles.iconBadge}>
              <IconSymbol size={12} name="plus" color="#0f0f0f" />
            </View>
          </TouchableOpacity>
          <ThemedText style={styles.iconHint}>Add an icon (optional)</ThemedText>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="LEADERBOARD NAME"
              placeholderTextColor="#555"
              value={name}
              onChangeText={(t) => setName(t.substring(0, 30))}
              autoCapitalize="characters"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
          <ThemedText style={styles.charCount}>{name.length}/30</ThemedText>
        </ScrollView>

        <View style={[styles.bottomSection, !keyboardVisible && styles.bottomSectionResting]}>
          <TouchableOpacity
            style={[styles.continueButton, !name.trim() && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!name.trim()}
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
  progress: { flex: 1, height: 2, marginLeft: 12, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 28 },
  contentInner: { paddingTop: 16, paddingBottom: 20 },
  step: { fontSize: 13, color: '#555', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 24 },
  iconPicker: { alignSelf: 'center', marginBottom: 8 },
  iconImage: { width: 80, height: 80, borderRadius: 16 },
  iconPlaceholder: {
    width: 80, height: 80, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  iconHint: { fontSize: 12, color: '#444', textAlign: 'center', marginBottom: 24 },
  inputContainer: { marginTop: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: '#fff', letterSpacing: 1,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  charCount: { fontSize: 12, color: '#444', textAlign: 'right', marginTop: 6 },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 10 },
  bottomSectionResting: { paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
