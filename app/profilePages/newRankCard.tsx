import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useValorantStats } from '@/contexts/ValorantStatsContext';
import { unlinkRiotAccount } from '@/services/riotService';
import { LinearGradient } from 'expo-linear-gradient';

type GameType = 'league' | 'valorant' | 'tft';

export default function NewRankCardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { fetchStats: fetchValorantStats } = useValorantStats();
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (!user?.id) { setLoading(false); return; }
        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.id));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRiotAccount(data.riotAccount || null);
            setValorantAccount(data.valorantAccount || null);
            setRiotStats(data.riotStats || null);
            setValorantStats(data.valorantStats || null);
            setEnabledRankCards(data.enabledRankCards || []);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [user?.id])
  );

  const handleGameSelect = async (game: GameType) => {
    if (!user?.id) return;

    // Already active — no action needed
    if (enabledRankCards.includes(game)) return;

    if (game === 'valorant') {
      if (valorantAccount) {
        try {
          await updateDoc(doc(db, 'users', user.id), { enabledRankCards: arrayUnion(game) });
          setEnabledRankCards([...enabledRankCards, game]);
          try { await fetchValorantStats(false); } catch {}
          router.back();
        } catch (error) {
          console.error('Error adding rank card:', error);
        }
      } else {
        router.push('/profilePages/linkValorantAccount');
      }
      return;
    }

    if (riotAccount) {
      try {
        await updateDoc(doc(db, 'users', user.id), { enabledRankCards: arrayUnion(game) });
        setEnabledRankCards([...enabledRankCards, game]);
        router.back();
      } catch (error) {
        console.error('Error adding rank card:', error);
      }
    } else {
      router.push({ pathname: '/profilePages/linkRiotAccount', params: { selectedGame: game } });
    }
  };

  const handleUnlinkRiotAccount = () => {
    if (!riotAccount) return;
    Alert.alert(
      'Unlink League of Legends Account',
      `Are you sure you want to unlink ${riotAccount?.gameName}#${riotAccount?.tagLine}? All League and TFT rank cards will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkRiotAccount();
              if (user?.id) {
                const userDoc = await getDoc(doc(db, 'users', user.id));
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  const updatedCards = (data.enabledRankCards || []).filter((c: string) => c !== 'league' && c !== 'tft');
                  await updateDoc(doc(db, 'users', user.id), { enabledRankCards: updatedCards });
                  setEnabledRankCards(updatedCards);
                }
              }
              setRiotAccount(null);
              setRiotStats(null);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unlink');
            }
          },
        },
      ]
    );
  };

  const handleUnlinkValorantAccount = () => {
    if (!valorantAccount) return;
    Alert.alert(
      'Unlink Valorant Account',
      `Are you sure you want to unlink ${valorantAccount?.gameName}#${valorantAccount?.tag || valorantAccount?.tagLine || ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.id) {
                await updateDoc(doc(db, 'users', user.id), { valorantAccount: null, valorantStats: null });
                const userDoc = await getDoc(doc(db, 'users', user.id));
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  const updatedCards = (data.enabledRankCards || []).filter((c: string) => c !== 'valorant');
                  await updateDoc(doc(db, 'users', user.id), { enabledRankCards: updatedCards });
                  setEnabledRankCards(updatedCards);
                }
              }
              setValorantAccount(null);
              setValorantStats(null);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unlink');
            }
          },
        },
      ]
    );
  };

  const renderGameCard = (
    game: GameType,
    name: string,
    logo: any,
    account: any,
    onUnlink: () => void,
  ) => {
    const isLinked = !!account;
    const isEnabled = enabledRankCards.includes(game);

    return (
      <TouchableOpacity
        key={game}
        style={[styles.gameCard, isEnabled && styles.gameCardActive]}
        onPress={() => handleGameSelect(game)}
        activeOpacity={0.7}
      >
        <Image source={logo} style={styles.gameLogo} resizeMode="contain" />
        <View style={styles.gameInfo}>
          <View style={styles.gameNameRow}>
            <ThemedText style={styles.gameName}>{name}</ThemedText>
            {isLinked && isEnabled && <View style={styles.activeDot} />}
          </View>
          {isLinked ? (
            <ThemedText style={styles.accountName}>
              {account.gameName}#{account.tagLine || account.tag}
            </ThemedText>
          ) : (
            <ThemedText style={styles.notLinkedText}>Tap to link your account</ThemedText>
          )}
        </View>
        {isLinked ? (
          <TouchableOpacity
            style={styles.unlinkIconButton}
            onPress={onUnlink}
            hitSlop={8}
            activeOpacity={0.6}
          >
            <IconSymbol size={14} name="xmark" color="#888" />
          </TouchableOpacity>
        ) : (
          <IconSymbol size={18} name="chevron.right" color="#555" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.step}>Profile</ThemedText>
        <ThemedText style={styles.title}>Rank Cards</ThemedText>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : (
          <>
            <ThemedText style={styles.sectionTitle}>Games</ThemedText>

            <View style={styles.gameList}>
              {renderGameCard(
                'league', 'League of Legends',
                require('@/assets/images/lol-icon.png'),
                riotAccount, handleUnlinkRiotAccount,
              )}
              {renderGameCard(
                'valorant', 'Valorant',
                require('@/assets/images/valorant-red.png'),
                valorantAccount, handleUnlinkValorantAccount,
              )}
            </View>

            <ThemedText style={styles.infoText}>
              Linked accounts display your current rank on your profile.
            </ThemedText>
          </>
        )}
      </View>

      <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  step: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 32,
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  gameList: {
    gap: 12,
  },
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
  gameCardActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  gameLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  gameInfo: {
    flex: 1,
    gap: 2,
  },
  gameNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  accountName: {
    fontSize: 13,
    color: '#888',
  },
  notLinkedText: {
    fontSize: 13,
    color: '#555',
  },
  unlinkIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginTop: 24,
  },
});
