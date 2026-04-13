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
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useValorantStats } from '@/contexts/ValorantStatsContext';
import { unlinkRiotAccount } from '@/services/riotService';
import { formatRank } from '@/services/riotService';

const { width: screenWidth } = Dimensions.get('window');

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

  // Fetch Riot account status and enabled rank cards when screen gains focus
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (!user?.id) {
          setLoading(false);
          return;
        }

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

    // Valorant uses Henrik's API - separate flow
    if (game === 'valorant') {
      if (valorantAccount) {
        try {
          await updateDoc(doc(db, 'users', user.id), {
            enabledRankCards: arrayUnion(game),
          });
          setEnabledRankCards([...enabledRankCards, game]);

          try {
            await fetchValorantStats(false);
          } catch (statsError) {
            console.warn('Failed to fetch stats, but rank card added:', statsError);
          }

          router.back();
        } catch (error) {
          console.error('Error adding rank card:', error);
        }
      } else {
        router.push('/profilePages/linkValorantAccount');
      }
      return;
    }

    // If already connected to Riot, just add the rank card
    if (riotAccount) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          enabledRankCards: arrayUnion(game),
        });
        setEnabledRankCards([...enabledRankCards, game]);
        router.back();
      } catch (error) {
        console.error('Error adding rank card:', error);
      }
    } else {
      router.push({
        pathname: '/profilePages/linkRiotAccount',
        params: { selectedGame: game },
      });
    }
  };

  const handleUnlinkRiotAccount = () => {
    if (!riotAccount) return;

    Alert.alert(
      'Unlink League of Legends Account',
      `Are you sure you want to unlink ${riotAccount?.gameName}#${riotAccount?.tagLine}? All League and TFT rank cards will be removed from your profile.`,
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
                  const currentCards = data.enabledRankCards || [];
                  const updatedCards = currentCards.filter((card: string) => card !== 'league' && card !== 'tft');

                  await updateDoc(doc(db, 'users', user.id), {
                    enabledRankCards: updatedCards,
                  });

                  setEnabledRankCards(updatedCards);
                }
              }

              setRiotAccount(null);
              setRiotStats(null);
              Alert.alert('Success', 'League of Legends account unlinked successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unlink League account');
              console.error(error);
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
      `Are you sure you want to unlink ${valorantAccount?.gameName}#${valorantAccount?.tagLine}? Your Valorant rank card will be removed from your profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user?.id) {
                await updateDoc(doc(db, 'users', user.id), {
                  valorantAccount: null,
                  valorantStats: null,
                });

                const userDoc = await getDoc(doc(db, 'users', user.id));
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  const currentCards = data.enabledRankCards || [];
                  const updatedCards = currentCards.filter((card: string) => card !== 'valorant');

                  await updateDoc(doc(db, 'users', user.id), {
                    enabledRankCards: updatedCards,
                  });

                  setEnabledRankCards(updatedCards);
                }
              }

              setValorantAccount(null);
              setValorantStats(null);
              Alert.alert('Success', 'Valorant account unlinked successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unlink Valorant account');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const getLeagueRank = () => {
    if (riotStats?.rankedSolo) {
      return formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank);
    }
    return 'Unranked';
  };

  const getValorantRank = () => {
    return valorantStats?.currentRank || 'Unranked';
  };

  const renderGameRow = (
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
      <View style={styles.gameRow} key={game}>
        <TouchableOpacity
          style={styles.gameCard}
          onPress={() => {
            if (!isLinked) {
              handleGameSelect(game);
            } else if (!isEnabled) {
              handleGameSelect(game);
            }
          }}
          activeOpacity={isLinked && isEnabled ? 1 : 0.7}
        >
          {/* Left: Logo */}
          <Image source={logo} style={[styles.gameLogo, !isLinked && { opacity: 0.35 }]} resizeMode="contain" />

          {/* Middle: Info */}
          <View style={styles.gameInfo}>
            <ThemedText style={[styles.gameName, !isLinked && { opacity: 0.4 }]}>{name}</ThemedText>
            {isLinked ? (
              <>
                <ThemedText style={styles.accountName}>
                  {account.gameName}#{account.tagLine || account.tag}
                </ThemedText>
                <ThemedText style={styles.rankText}>{rankText}</ThemedText>
              </>
            ) : (
              <ThemedText style={styles.notLinkedText}>Not linked</ThemedText>
            )}
          </View>

          {/* Right: Action */}
          <View style={styles.cardAction}>
            {isLinked && isEnabled ? (
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <ThemedText style={styles.activePillText}>Active</ThemedText>
              </View>
            ) : isLinked ? (
              <View style={styles.addPill}>
                <IconSymbol size={12} name="plus" color="#C9A84C" />
                <ThemedText style={styles.addPillText}>Add</ThemedText>
              </View>
            ) : (
              <View style={styles.linkPill}>
                <IconSymbol size={12} name="link" color="#C9A84C" />
                <ThemedText style={styles.linkPillText}>Link</ThemedText>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Unlink */}
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerAccent} />
          <ThemedText style={styles.headerTitle}>Rank Cards</ThemedText>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#C9A84C" />
          </View>
        ) : (
          <>
            <ThemedText style={styles.sectionLabel}>Games</ThemedText>

            {renderGameRow(
              'league',
              'League of Legends',
              require('@/assets/images/lol-icon.png'),
              riotAccount,
              getLeagueRank(),
              handleUnlinkRiotAccount,
            )}

            <View style={styles.divider} />

            {renderGameRow(
              'valorant',
              'Valorant',
              require('@/assets/images/valorant-red.png'),
              valorantAccount,
              getValorantRank(),
              handleUnlinkValorantAccount,
            )}

            {/* Info */}
            <View style={styles.infoContainer}>
              <ThemedText style={styles.infoText}>
                Linked accounts display your current rank on your profile.
              </ThemedText>
            </View>
          </>
        )}
      </View>

      <View style={styles.bottomSpacer} />
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
    paddingTop: 58,
    paddingBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAccent: {
    width: 2,
    height: 16,
    backgroundColor: '#C9A84C',
    borderRadius: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(201, 168, 76, 0.5)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 2,
  },
  gameRow: {
    marginVertical: 2,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 0,
    gap: 12,
  },
  gameLogo: {
    width: 22,
    height: 22,
    opacity: 0.7,
  },
  gameInfo: {
    flex: 1,
    gap: 1,
  },
  gameName: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  accountName: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(201, 168, 76, 0.5)',
  },
  notLinkedText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#3a3a3a',
  },
  cardAction: {
    marginLeft: 8,
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
    backgroundColor: '#C9A84C',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(201, 168, 76, 0.6)',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.15)',
  },
  addPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(201, 168, 76, 0.7)',
  },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201, 168, 76, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.12)',
  },
  linkPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(201, 168, 76, 0.5)',
  },
  unlinkButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  unlinkText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#3a3a3a',
  },
  infoContainer: {
    marginTop: 24,
    paddingHorizontal: 0,
  },
  infoText: {
    fontSize: 11,
    color: '#3a3a3a',
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 60,
  },
});
