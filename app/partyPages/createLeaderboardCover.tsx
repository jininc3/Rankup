import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Image, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const screenWidth = Dimensions.get('window').width;

export default function CreateLeaderboardCover() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [coverUri, setCoverUri] = useState<string | null>(null);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const handleContinue = () => {
    router.push({
      pathname: '/partyPages/createLeaderboardSettings',
      params: { ...params, coverUri: coverUri || '' },
    });
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: '60%' }]} />
        </View>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.step}>Step 3 of 5</ThemedText>
        <ThemedText style={styles.title}>Add a cover{'\n'}photo</ThemedText>
        <ThemedText style={styles.subtitle}>This appears at the top of your leaderboard.</ThemedText>

        <TouchableOpacity style={styles.coverPicker} onPress={pickCover} activeOpacity={0.7}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <IconSymbol size={32} name="photo.fill" color="#555" />
              <ThemedText style={styles.coverPlaceholderText}>Tap to select</ThemedText>
            </View>
          )}
        </TouchableOpacity>

        {coverUri && (
          <TouchableOpacity onPress={() => setCoverUri(null)} style={styles.removeButton}>
            <ThemedText style={styles.removeButtonText}>Remove photo</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8}>
          <ThemedText style={styles.continueButtonText}>
            {coverUri ? 'Continue' : 'Skip'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const coverWidth = screenWidth - 56;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 60, paddingHorizontal: 16 },
  backButton: { padding: 8 },
  progress: { flex: 1, height: 2, marginLeft: 12, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  step: { fontSize: 13, color: '#555', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', marginBottom: 32 },
  coverPicker: { borderRadius: 14, overflow: 'hidden' },
  coverImage: { width: coverWidth, height: coverWidth * 9 / 16, borderRadius: 14 },
  coverPlaceholder: {
    width: coverWidth, height: coverWidth * 9 / 16, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  coverPlaceholderText: { fontSize: 14, color: '#555' },
  removeButton: { alignItems: 'center', marginTop: 12 },
  removeButtonText: { fontSize: 14, color: '#555' },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
});
