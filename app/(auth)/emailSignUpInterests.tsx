import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { auth, db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert } from 'react-native';

const INTERESTS = [
  { id: 'valorant', label: 'Valorant' },
  { id: 'league', label: 'League of Legends' },
  { id: 'clips', label: 'Game Clips' },
  { id: 'tips', label: 'Tips & Tricks' },
  { id: 'ranked', label: 'Ranked Climbing' },
  { id: 'funny', label: 'Funny Moments' },
  { id: 'esports', label: 'Esports' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'duos', label: 'Finding Duos' },
  { id: 'highlights', label: 'Highlights' },
];

export default function EmailSignUpInterests() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const toggleInterest = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFinish = async () => {
    try {
      setIsLoading(true);
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          interests: Array.from(selected),
          needsUsernameSetup: false,
          updatedAt: new Date(),
        });
        await refreshUser();
      }
      router.replace('/(tabs)/profile');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save interests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <View style={styles.progress}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.title}>What are you{'\n'}into?</ThemedText>
        <ThemedText style={styles.subtitle}>Pick a few to personalize your feed.</ThemedText>

        <View style={styles.grid}>
          {INTERESTS.map((interest) => {
            const isSelected = selected.has(interest.id);
            return (
              <TouchableOpacity
                key={interest.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleInterest(interest.id)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {interest.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.buttonDisabled]}
          onPress={handleFinish}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <ThemedText style={styles.continueButtonText}>
            {isLoading ? 'Finishing...' : selected.size > 0 ? 'Finish' : 'Skip & Finish'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 60, paddingHorizontal: 16 },
  backButton: { padding: 8 },
  progress: { flex: 1, height: 2, marginLeft: 12, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 1 },
  progressFill: { width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 32 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 24, borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipText: { fontSize: 14, fontWeight: '500', color: '#999' },
  chipTextSelected: { color: '#0f0f0f', fontWeight: '600' },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
