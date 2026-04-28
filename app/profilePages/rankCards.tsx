import rankCard from '@/app/components/rankCard';
const RankCard = rankCard;

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
import { useRouter } from '@/hooks/useRouter';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useRef, useState } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useValorantStats } from '@/contexts/ValorantStatsContext';
import { formatRank } from '@/services/riotService';
import { LinearGradient } from 'expo-linear-gradient';

export default function RankCardsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { fetchStats: fetchValorantStats } = useValorantStats();
  const params = useLocalSearchParams<{ userId?: string; username?: string }>();

  // If userId is passed, we're viewing another user's rank cards
  const viewingUserId = params.userId && params.userId !== user?.id ? params.userId : null;
  const isOwnProfile = !viewingUserId;
  const targetUserId = viewingUserId || user?.id;

  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [fetchedUsername, setFetchedUsername] = useState<string>('User');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'stacked' | 'swipe'>('stacked');
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const fetchData = useCallback(async () => {
    if (!targetUserId) { setLoading(false); return; }
    try {
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setRiotAccount(data.riotAccount || null);
        setValorantAccount(data.valorantAccount || null);
        setRiotStats(data.riotStats || null);
        setValorantStats(data.valorantStats || null);
        setEnabledRankCards(data.enabledRankCards || []);
        setFetchedUsername(data.username || params.username || 'User');
      }
    } catch (error) {
      console.error('Error fetching rank card data:', error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, params.username]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const handleRankCardRefresh = useCallback(async () => {
    if (isOwnProfile) {
      try { await fetchValorantStats(false); } catch {}
    }
    await fetchData();
  }, [fetchData, fetchValorantStats, isOwnProfile]);

  // Derive userGames — identical mapping to profile.tsx (userGamesBase)
  const userGames = (riotAccount || valorantAccount)
    ? enabledRankCards
        .map(gameType => {
          if (gameType === 'league' && riotStats) {
            return {
              id: 2,
              name: 'League of Legends',
              rank: riotStats.rankedSolo
                ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)
                : 'Unranked',
              trophies: riotStats.rankedSolo?.leaguePoints || 0,
              icon: '⚔️',
              image: require('@/assets/images/leagueoflegends.png'),
              wins: riotStats.rankedSolo?.wins || 0,
              losses: riotStats.rankedSolo?.losses || 0,
              winRate: riotStats.rankedSolo?.winRate || 0,
              recentMatches: ['+15', '-18', '+20', '+17', '-14'],
              profileIconId: riotStats.profileIconId,
              topChampions: riotStats.topChampions || [],
              summonerLevel: riotStats.summonerLevel,
              peakRank: riotStats.peakRank
                ? { tier: `${riotStats.peakRank.tier} ${riotStats.peakRank.rank}`, season: riotStats.peakRank.season || '' }
                : undefined,
            };
          }
          if (gameType === 'tft') {
            return {
              id: 4,
              name: 'TFT',
              rank: 'Gold I',
              trophies: 45,
              icon: '♟️',
              image: require('@/assets/images/tft.png'),
              wins: 28,
              losses: 22,
              winRate: 56.0,
              recentMatches: ['+12', '-10', '+15', '+18', '-8'],
              profileIconId: riotStats?.profileIconId,
            };
          }
          if (gameType === 'valorant' && valorantStats) {
            return {
              id: 3,
              name: 'Valorant',
              rank: valorantStats.currentRank || 'Unranked',
              trophies: valorantStats.rankRating || 0,
              icon: '🎯',
              image: require('@/assets/images/valorant-black.png'),
              wins: valorantStats.wins || 0,
              losses: valorantStats.losses || 0,
              winRate: valorantStats.winRate || 0,
              matchHistory: valorantStats.matchHistory || [],
              valorantCard: valorantStats.card?.small,
              peakRank: valorantStats.peakRank
                ? { tier: valorantStats.peakRank.tier, season: valorantStats.peakRank.season }
                : undefined,
              accountLevel: valorantStats.accountLevel,
              gamesPlayed: valorantStats.gamesPlayed,
              mmr: valorantStats.mmr,
              mostPlayedAgent: valorantStats.mostPlayedAgent,
            };
          }
          return null;
        })
        .filter((game): game is NonNullable<typeof game> => game !== null)
    : [];

  return (
    <View style={styles.container}>
      {/* Background shimmer — matches tabs pages */}
      <View style={styles.backgroundGlow} pointerEvents="none">
        <View style={styles.shimmerBand} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.03)',
              'rgba(255, 255, 255, 0.065)',
              'rgba(255, 255, 255, 0.03)',
              'transparent',
            ]}
            locations={[0, 0.37, 0.5, 0.63, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.shimmerBandSecondary} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.035)',
              'transparent',
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol size={22} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {userGames.length > 1 && (
            <TouchableOpacity style={styles.viewToggle} onPress={() => setViewMode(v => v === 'stacked' ? 'swipe' : 'stacked')}>
              <IconSymbol size={18} name={viewMode === 'stacked' ? 'rectangle.split.1x2' : 'square.stack.3d.up'} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.step}>{isOwnProfile ? 'Profile' : `@${fetchedUsername}`}</ThemedText>
          <ThemedText style={styles.title}>Rank Cards</ThemedText>
          {isOwnProfile && (
            <TouchableOpacity
              style={styles.newCardButton}
              onPress={() => router.push('/profilePages/newRankCard')}
            >
              <IconSymbol size={14} name={riotAccount && valorantAccount ? 'gearshape' : 'plus'} color="#fff" />
              <ThemedText style={styles.newCardButtonText}>
                {riotAccount && valorantAccount ? 'Manage Cards' : 'New Card'}
              </ThemedText>
            </TouchableOpacity>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}

          {!loading && userGames.length === 0 && (
            isOwnProfile ? (
              <TouchableOpacity
                style={styles.emptyBanner}
                onPress={() => router.push('/profilePages/newRankCard')}
                activeOpacity={0.8}
              >
                <View style={styles.emptyBannerIconRow}>
                  <View style={styles.emptyBannerIconCircle}>
                    <Image
                      source={require('@/assets/images/valorant-logo.png')}
                      style={{ width: 18, height: 18, tintColor: '#72767d' }}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={[styles.emptyBannerIconCircle, styles.emptyBannerIconCircleCenter]}>
                    <Image
                      source={require('@/assets/images/riotgames.png')}
                      style={{ width: 24, height: 24 }}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.emptyBannerIconCircle}>
                    <Image
                      source={require('@/assets/images/leagueoflegends.png')}
                      style={{ width: 18, height: 18, tintColor: '#72767d' }}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <View style={styles.emptyBannerTextContainer}>
                  <ThemedText style={styles.emptyBannerTitle}>Show off your rank</ThemedText>
                  <ThemedText style={styles.emptyBannerSubtext}>Link your Riot account to get started</ThemedText>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyBanner}>
                <View style={styles.emptyBannerTextContainer}>
                  <ThemedText style={styles.emptyBannerTitle}>No rank cards yet</ThemedText>
                  <ThemedText style={styles.emptyBannerSubtext}>
                    This user hasn't linked any gaming accounts
                  </ThemedText>
                </View>
              </View>
            )
          )}
        </View>

        {!loading && userGames.length === 1 && (
          <View style={styles.verticalRankCardsContainer}>
            {(() => {
              const game = userGames[0];
              let displayUsername = (isOwnProfile ? user?.username : fetchedUsername) || 'User';

              if (game.name === 'Valorant' && valorantAccount) {
                displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
              } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
              }

              return (
                <View key={game.id} style={styles.verticalCardWrapper}>
                  <RankCard game={game} username={displayUsername} viewOnly={false} userId={viewingUserId || undefined} isFocused={true} onRefresh={handleRankCardRefresh} />
                </View>
              );
            })()}
          </View>
        )}

        {!loading && userGames.length > 1 && viewMode === 'stacked' && (() => {
          const totalCards = userGames.length;
          const CARD_HEIGHT = 240;
          const STACK_OFFSET = 50;
          const containerHeight = CARD_HEIGHT + (totalCards - 1) * STACK_OFFSET;

          return (
            <View style={[styles.verticalRankCardsContainer, { paddingBottom: 0 }]}>
              <View style={[styles.stackedCardsWrapper, { height: containerHeight }]}>
                {userGames.map((game, index) => {
                  let displayUsername = (isOwnProfile ? user?.username : fetchedUsername) || 'User';

                  if (game.name === 'Valorant' && valorantAccount) {
                    displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                  } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                    displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                  }

                  const reverseIndex = totalCards - 1 - index;
                  const topOffset = index * STACK_OFFSET;
                  const scale = 1 - (reverseIndex * 0.02);
                  const cardZIndex = index + 1;

                  return (
                    <View
                      key={game.id}
                      style={[
                        styles.stackedCardItem,
                        {
                          top: topOffset,
                          transform: [{ scale }],
                          zIndex: cardZIndex,
                        },
                      ]}
                    >
                      <View style={{ width: '100%' }}>
                        <RankCard game={game} username={displayUsername} viewOnly={false} userId={viewingUserId || undefined} isFocused={true} isBackOfStack={index < totalCards - 1} onRefresh={handleRankCardRefresh} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {!loading && userGames.length > 1 && viewMode === 'swipe' && (
          <>
            <FlatList
              data={userGames}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (screenWidth - 32));
                setActiveCardIndex(index);
              }}
              contentContainerStyle={styles.swipeContainer}
              renderItem={({ item: game }) => {
                let displayUsername = (isOwnProfile ? user?.username : fetchedUsername) || 'User';
                if (game.name === 'Valorant' && valorantAccount) {
                  displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                  displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                }
                return (
                  <View style={styles.swipeCard}>
                    <RankCard game={game} username={displayUsername} viewOnly={false} userId={viewingUserId || undefined} isFocused={true} onRefresh={handleRankCardRefresh} />
                  </View>
                );
              }}
            />
            {/* Page indicators */}
            <View style={styles.swipeDots}>
              {userGames.map((_, index) => (
                <View key={index} style={[styles.swipeDot, activeCardIndex === index && styles.swipeDotActive]} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    top: -screenHeight * 0.35,
    left: -screenWidth * 0.6,
    width: screenWidth * 2.2,
    height: screenHeight * 1.7,
    transform: [{ rotate: '20deg' }],
  },
  shimmerBandSecondary: {
    position: 'absolute',
    top: -screenHeight * 0.2,
    left: -screenWidth * 0.1,
    width: screenWidth * 1.9,
    height: screenHeight * 1.5,
    transform: [{ rotate: '-15deg' }],
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
  viewToggle: {
    padding: 8,
  },
  newCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
  },
  newCardButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stacked rank cards (matches profile.tsx)
  verticalRankCardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 16,
  },
  stackedCardsWrapper: {
    position: 'relative',
    height: 320,
    width: '100%',
  },
  stackedCardItem: {
    position: 'absolute',
    width: '100%',
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
  },
  // Swipe view
  swipeContainer: {
    paddingTop: 18,
  },
  swipeCard: {
    width: screenWidth - 32,
    marginHorizontal: 16,
  },
  swipeDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  swipeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  swipeDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  verticalCardWrapper: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
  },
  // Empty banner (matches profile.tsx)
  emptyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    gap: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyBannerIconRow: {
    flexDirection: 'row',
    gap: -6,
  },
  emptyBannerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  emptyBannerIconCircleCenter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  emptyBannerTextContainer: {
    flex: 1,
  },
  emptyBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  emptyBannerSubtext: {
    fontSize: 12,
    color: '#666',
  },
});
