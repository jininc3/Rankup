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
import { formatRank } from '@/services/riotService';

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
      `Are you sure you want to unlink ${valorantAccount?.gameName}#${valorantAccount?.tagLine}?`,
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

  const getLeagueRank = () => {
    if (riotStats?.rankedSolo) return formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank);
    return 'Unranked';
  };

  const getValorantRank = () => valorantStats?.currentRank || 'Unranked';

  const renderGameCard = (
    game: GameType,
    name: string,
    logo: any,
    account: any,
    rankText: string,
    onUnlink: () => void,
  ) => {
    const isLinked = !!account;
    const isEnabled = enabledRankCards.includes(game);

    return (
      <View key={game} style={styles.gameCardWrapper}>
        <TouchableOpacity
          style={[styles.gameCard, isEnabled && styles.gameCardActive]}
          onPress={() => handleGameSelect(game)}
          activeOpacity={0.7}
        >
          <Image source={logo} style={styles.gameLogo} resizeMode="contain" />
          <View style={styles.gameInfo}>
            <ThemedText style={styles.gameName}>{name}</ThemedText>
            {isLinked ? (
              <>
                <ThemedText style={styles.accountName}>{account.gameName}#{account.tagLine || account.tag}</ThemedText>
                <ThemedText style={styles.rankText}>{rankText}</ThemedText>
              </>
            ) : (
              <ThemedText style={styles.notLinkedText}>Tap to link your account</ThemedText>
            )}
          </View>
          {isLinked && isEnabled ? (
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <ThemedText style={styles.activePillText}>Active</ThemedText>
            </View>
          ) : (
            <IconSymbol size={18} name="chevron.right" color="#555" />
          )}
        </TouchableOpacity>
        {isLinked && (
          <TouchableOpacity style={styles.unlinkButton} onPress={onUnlink}>
            <ThemedText style={styles.unlinkText}>Unlink</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Rank Cards</ThemedText>
      </View>

      <View style={styles.content}>
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
                riotAccount, getLeagueRank(), handleUnlinkRiotAccount,
              )}
              {renderGameCard(
                'valorant', 'Valorant',
                require('@/assets/images/valorant-red.png'),
                valorantAccount, getValorantRank(), handleUnlinkValorantAccount,
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 16,
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
  gameCardWrapper: {},
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
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
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
  gameName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  accountName: {
    fontSize: 13,
    color: '#555',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  notLinkedText: {
    fontSize: 13,
    color: '#555',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#22C55E',
  },
  unlinkButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
  },
  unlinkText: {
    fontSize: 12,
    color: '#555',
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginTop: 24,
  },
});
