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
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.gameLogo} resizeMode="contain" />
          </View>

          {/* Middle: Info */}
          <View style={styles.gameInfo}>
            <ThemedText style={styles.gameName}>{name}</ThemedText>
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
                <IconSymbol size={14} name="plus" color="#fff" />
                <ThemedText style={styles.addPillText}>Add</ThemedText>
              </View>
            ) : (
              <View style={styles.linkPill}>
                <IconSymbol size={14} name="link" color="#fff" />
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
        <ThemedText style={styles.headerTitle}>Rank Cards</ThemedText>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c42743" />
          </View>
        ) : (
          <>
            {/* Section Container */}
            <View style={styles.sectionContainer}>
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
                require('@/assets/images/valorant.png'),
                valorantAccount,
                getValorantRank(),
                handleUnlinkValorantAccount,
              )}
            </View>

            {/* Info */}
            <View style={styles.infoContainer}>
              <IconSymbol size={14} name="info.circle" color="#555" />
              <ThemedText style={styles.infoText}>
                Linked accounts display your current rank on your profile. Manage visibility in Edit Profile.
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
    paddingBottom: 16,
  },
  backButton: {
    padding: 6,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  gameRow: {
    marginVertical: 4,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  logoContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  gameLogo: {
    width: 30,
    height: 30,
  },
  gameInfo: {
    flex: 1,
    gap: 2,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  accountName: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  notLinkedText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#555',
  },
  cardAction: {
    marginLeft: 12,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(196, 39, 67, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(196, 39, 67, 0.3)',
  },
  linkPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c42743',
  },
  unlinkButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  unlinkText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
  },
  bottomSpacer: {
    height: 60,
  },
});
