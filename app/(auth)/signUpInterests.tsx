import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { auth, db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/hooks/useRouter';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert, Image } from 'react-native';

const GAMES = [
  { id: 'valorant', name: 'Valorant', logo: require('@/assets/images/valorant-red.png') },
  { id: 'league', name: 'League of Legends', logo: require('@/assets/images/lol-icon.png') },
];

export default function EmailSignUpInterests() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const toggleGame = (id: string) => {
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
      Alert.alert('Error', 'Failed to save. Please try again.');
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
        <ThemedText style={styles.title}>What do you{'\n'}play?</ThemedText>
        <ThemedText style={styles.subtitle}>Pick the games you're into.</ThemedText>

        <View style={styles.gameList}>
          {GAMES.map((game) => {
            const isSelected = selected.has(game.id);
            return (
              <TouchableOpacity
                key={game.id}
                style={[styles.gameCard, isSelected && styles.gameCardSelected]}
                onPress={() => toggleGame(game.id)}
                activeOpacity={0.7}
              >
                <Image source={game.logo} style={styles.gameLogo} />
                <ThemedText style={[styles.gameName, isSelected && styles.gameNameSelected]}>
                  {game.name}
                </ThemedText>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <IconSymbol size={16} name="checkmark" color="#0f0f0f" />
                  </View>
                )}
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
  subtitle: { fontSize: 15, color: '#555', marginBottom: 32 },
  gameList: { gap: 12 },
  gameCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    paddingVertical: 18, paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  gameCardSelected: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  gameLogo: { width: 36, height: 36, borderRadius: 8 },
  gameName: { flex: 1, fontSize: 17, fontWeight: '600', color: '#999' },
  gameNameSelected: { color: '#fff' },
  checkmark: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  bottomSection: { paddingHorizontal: 28, paddingBottom: 40 },
  continueButton: { backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  continueButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
