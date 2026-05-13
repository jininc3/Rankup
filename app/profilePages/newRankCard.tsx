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
import { useRouter } from '@/hooks/useRouter';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
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
        router.replace('/profilePages/linkValorantAccount');
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
      router.replace({ pathname: '/profilePages/linkRiotAccount', params: { selectedGame: game } });
    }
  };

  const handleUnlinkRiotAccount = async () => {
    if (!riotAccount || !user?.id) return;

    // Check for active duo post in feed
    let hasActiveDuoPost = false;
    try {
      const duoPostDoc = await getDoc(doc(db, 'duoPosts', `${user.id}_league`));
      if (duoPostDoc.exists()) {
        const data = duoPostDoc.data();
        hasActiveDuoPost = !!(data.expiresAt && data.expiresAt.toDate() > new Date());
      }
    } catch {}

    const message = `Are you sure you want to unlink ${riotAccount?.gameName}#${riotAccount?.tagLine}? All League and TFT rank cards will be removed.`
      + (hasActiveDuoPost ? '\n\nYour active League duo card in the feed will also be deleted.' : '');

    Alert.alert(
      'Unlink League of Legends Account',
      message,
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
                // Remove league duo card, active duo post, and leaderboard stats
                await deleteDoc(doc(db, 'duoCards', `${user.id}_league`)).catch(() => {});
                await deleteDoc(doc(db, 'duoPosts', `${user.id}_league`)).catch(() => {});
                await deleteDoc(doc(db, 'users', user.id, 'gameStats', 'league')).catch(() => {});
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

  const handleUnlinkValorantAccount = async () => {
    if (!valorantAccount || !user?.id) return;

    // Check for active duo post in feed
    let hasActiveDuoPost = false;
    try {
      const duoPostDoc = await getDoc(doc(db, 'duoPosts', `${user.id}_valorant`));
      if (duoPostDoc.exists()) {
        const data = duoPostDoc.data();
        hasActiveDuoPost = !!(data.expiresAt && data.expiresAt.toDate() > new Date());
      }
    } catch {}

    const message = `Are you sure you want to unlink ${valorantAccount?.gameName}#${valorantAccount?.tag || valorantAccount?.tagLine || ''}? Your Valorant rank card will be removed.`
      + (hasActiveDuoPost ? '\n\nYour active Valorant duo card in the feed will also be deleted.' : '');

    Alert.alert(
      'Unlink Valorant Account',
      message,
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
                // Remove valorant duo card, active duo post, and leaderboard stats
                await deleteDoc(doc(db, 'duoCards', `${user.id}_valorant`)).catch(() => {});
                await deleteDoc(doc(db, 'duoPosts', `${user.id}_valorant`)).catch(() => {});
                await deleteDoc(doc(db, 'users', user.id, 'gameStats', 'valorant')).catch(() => {});
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

    // Determine color based on game
    const accentColor = game === 'valorant'
      ? 'rgba(196, 39, 67, 0.6)'
      : game === 'league'
      ? 'rgba(59, 130, 246, 0.6)'
      : 'rgba(212, 168, 67, 0.6)';

    const accentColorSubtle = game === 'valorant'
      ? 'rgba(196, 39, 67, 0.15)'
      : game === 'league'
      ? 'rgba(59, 130, 246, 0.15)'
      : 'rgba(212, 168, 67, 0.15)';

    return (
      <View key={game} style={styles.rankCardWrapper}>
        <TouchableOpacity
          style={styles.rankCardContainer}
          onPress={() => handleGameSelect(game)}
          activeOpacity={0.85}
        >
          {/* Rank card shape with gradient border */}
          <LinearGradient
            colors={isLinked ? [accentColor, 'rgba(0,0,0,0.4)'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rankCardOuter}
          >
            <View style={[styles.rankCardInner, !isLinked && styles.rankCardSilhouette]}>
              {/* Background gradient */}
              <LinearGradient
                colors={isLinked ? ['#1a1a1a', '#0f0f0f'] : ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.01)']}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Accent overlay */}
              {isLinked && (
                <LinearGradient
                  colors={[accentColorSubtle, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}

              {/* Content */}
              <View style={styles.rankCardContent}>
                {/* Top section with logo */}
                <View style={styles.rankCardTop}>
                  <Image source={logo} style={styles.rankCardLogo} resizeMode="contain" />
                </View>

                {/* Center section */}
                <View style={styles.rankCardCenter}>
                  <ThemedText style={[styles.rankCardGameName, !isLinked && styles.silhouetteText]}>
                    {name}
                  </ThemedText>
                  {isLinked ? (
                    <ThemedText style={styles.rankCardAccountName}>
                      {account.gameName || account.name}#{account.tagLine || account.tag}
                    </ThemedText>
                  ) : (
                    <ThemedText style={styles.rankCardNotLinked}>
                      Tap to link your account
                    </ThemedText>
                  )}
                </View>

                {/* Bottom section with status */}
                <View style={styles.rankCardBottom}>
                  {isLinked ? (
                    <View style={styles.statusRow}>
                      <View style={styles.linkedBadge}>
                        <IconSymbol size={12} name="checkmark" color="#22C55E" />
                        <ThemedText style={styles.linkedText}>Linked</ThemedText>
                      </View>
                      {isEnabled && (
                        <View style={styles.enabledDot} />
                      )}
                    </View>
                  ) : (
                    <IconSymbol size={20} name="chevron.right" color="rgba(255,255,255,0.2)" />
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Unlink button - positioned absolutely */}
        {isLinked && (
          <TouchableOpacity
            style={styles.unlinkButton}
            onPress={onUnlink}
            hitSlop={8}
            activeOpacity={0.6}
          >
            <IconSymbol size={16} name="xmark" color="#888" />
          </TouchableOpacity>
        )}
      </View>
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
    gap: 20,
  },
  rankCardWrapper: {
    position: 'relative',
  },
  rankCardContainer: {
    width: '100%',
  },
  rankCardOuter: {
    borderRadius: 16,
    padding: 1.5,
    height: 220,
  },
  rankCardInner: {
    flex: 1,
    borderRadius: 14.5,
    overflow: 'hidden',
  },
  rankCardSilhouette: {
    opacity: 0.4,
  },
  rankCardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  rankCardTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  rankCardLogo: {
    width: 52,
    height: 52,
  },
  rankCardCenter: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  rankCardGameName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  silhouetteText: {
    color: 'rgba(255,255,255,0.3)',
  },
  rankCardAccountName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
    letterSpacing: -0.2,
  },
  rankCardNotLinked: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.25)',
    fontStyle: 'italic',
  },
  rankCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  linkedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22C55E',
  },
  enabledDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  unlinkButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginTop: 24,
  },
});
