import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { StyleSheet, TouchableOpacity, View, Alert, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { LinearGradient } from 'expo-linear-gradient';

const GAMES = [
  { id: 'valorant', name: 'Valorant', logo: require('@/assets/images/valorant-red.png') },
  { id: 'league', name: 'League of Legends', logo: require('@/assets/images/lol-icon.png') },
];

export default function GamePreferencesScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const loadPreferences = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.interests && Array.isArray(data.interests)) {
            setSelected(new Set(data.interests));
          }
        }
      } catch (error) {
        console.error('Error loading game preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  const toggleGame = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user?.id || selected.size === 0) return;

    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'users', user.id), {
        interests: Array.from(selected),
        updatedAt: new Date(),
      });
      await refreshUser();
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Game Preferences</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      ) : (
        <View style={styles.content}>
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

          <TouchableOpacity
            style={[styles.saveButton, (isSaving || selected.size === 0) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving || selected.size === 0}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
  },
  backButton: { padding: 4, flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 16 },
  subtitle: { fontSize: 15, color: '#555', marginBottom: 24 },
  gameList: { gap: 12 },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  gameCardSelected: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  gameLogo: { width: 36, height: 36, borderRadius: 8 },
  gameName: { flex: 1, fontSize: 17, fontWeight: '600', color: '#999' },
  gameNameSelected: { color: '#fff' },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: { color: '#0f0f0f', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
