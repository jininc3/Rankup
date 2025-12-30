import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  getLeagueStats,
  formatRank,
  getChampionName,
  getProfileIconUrl,
  type RiotStats
} from '@/services/riotService';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// League of Legends rank icon mapping
const LEAGUE_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/leagueranks/iron.png'),
  bronze: require('@/assets/images/leagueranks/bronze.png'),
  silver: require('@/assets/images/leagueranks/silver.png'),
  gold: require('@/assets/images/leagueranks/gold.png'),
  platinum: require('@/assets/images/leagueranks/platinum.png'),
  emerald: require('@/assets/images/leagueranks/emerald.png'),
  diamond: require('@/assets/images/leagueranks/diamond.png'),
  master: require('@/assets/images/leagueranks/masters.png'),
  grandmaster: require('@/assets/images/leagueranks/grandmaster.png'),
  challenger: require('@/assets/images/leagueranks/challenger.png'),
  unranked: require('@/assets/images/leagueranks/unranked.png'),
};

export default function LeagueGameStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // Parse the game data from params
  const game = params.game ? JSON.parse(params.game as string) : null;

  // State for Riot data (League of Legends)
  const [riotStats, setRiotStats] = useState<RiotStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [summonerName, setSummonerName] = useState<{ gameName: string; tagLine: string } | null>(null);

  // Load cached data from Firestore on mount
  useEffect(() => {
    if (game && user?.id && !cacheLoaded) {
      loadCachedData();
    }
  }, [game?.name, user?.id]);

  // Helper function to check if cache is expired (> 6 hours)
  const isCacheExpired = (lastUpdated: any): boolean => {
    if (!lastUpdated) return true;

    const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    const lastUpdatedTime = lastUpdated.toMillis ? lastUpdated.toMillis() : lastUpdated;
    const now = Date.now();
    const cacheAge = now - lastUpdatedTime;

    return cacheAge > CACHE_TTL;
  };

  // Load cached stats from Firestore
  const loadCachedData = async () => {
    if (!user?.id) return;

    try {
      console.log('Loading cached League stats from Firestore...');
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();

        // Load summoner name from riotAccount
        if (data.riotAccount) {
          setSummonerName({
            gameName: data.riotAccount.gameName,
            tagLine: data.riotAccount.tagLine,
          });
        }

        if (data.riotStats) {
          console.log('Loaded cached League stats');
          setRiotStats(data.riotStats);
          setCacheLoaded(true);

          // Check if cache is expired and fetch if needed
          if (isCacheExpired(data.riotStats.lastUpdated)) {
            console.log('League cache expired, fetching fresh data...');
            fetchLeagueData();
          } else {
            console.log('League cache is still valid');
            setHasFetched(true);
          }
        } else {
          // No cached data, fetch for the first time
          console.log('No cached data found, fetching...');
          setCacheLoaded(true);
          fetchLeagueData();
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
      setCacheLoaded(true);
      fetchLeagueData();
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await getLeagueStats(true); // Force refresh
      if (response.success && response.stats) {
        setRiotStats(response.stats);
      }
    } catch (err: any) {
      console.error('Error refreshing stats:', err);
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLeagueData = async () => {
    if (loading || hasFetched) return;

    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const response = await getLeagueStats();
      if (response.success && response.stats) {
        console.log('League stats loaded:', response.stats);
        console.log('Profile icon ID:', response.stats.profileIconId);
        console.log('Profile icon URL:', getProfileIconUrl(response.stats.profileIconId));
        setRiotStats(response.stats);
      }
    } catch (err: any) {
      console.error('Error fetching League stats:', err);
      setError(err.message);
      setHasFetched(false);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get rank icon
  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
  };

  if (!game) {
    return (
      <View style={styles.container}>
        <ThemedText>No game data available</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#000"
        />
      }
    >
      {/* Hero Section with Navy Blue Background */}
      <View style={[styles.heroSection, { backgroundColor: '#0f1f3d' }]}>
        {/* League of Legends background logo */}
        <Image
          source={require('@/assets/images/lol.png')}
          style={styles.backgroundLogo}
          resizeMode="contain"
        />

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            size={24}
            name="chevron.left"
            color="#fff"
          />
        </TouchableOpacity>

        {/* Summoner Name - Centered Title */}
        {summonerName && (
          <View style={styles.summonerNameContainer}>
            <ThemedText style={styles.summonerNameText}>
              {summonerName.gameName}
            </ThemedText>
            <ThemedText style={styles.summonerTagText}>
              #{summonerName.tagLine}
            </ThemedText>
          </View>
        )}

        {/* Profile Icon - Top Right */}
        {riotStats && (
          <Image
            source={{ uri: getProfileIconUrl(riotStats.profileIconId) }}
            style={styles.profileIcon}
            onError={(error) => console.log('Profile icon load error:', error.nativeEvent)}
            onLoad={() => console.log('Profile icon loaded successfully')}
          />
        )}
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        {loading && !riotStats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <ThemedText style={styles.loadingText}>Loading stats...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchLeagueData}
            >
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : riotStats ? (
          // Display League of Legends stats
          <>
            {/* CURRENT RANK - Prominent Display */}
            <View style={styles.currentRankSection}>
              <ThemedText style={styles.rankSectionLabel}>CURRENT RANK</ThemedText>
              <Image
                source={getRankIcon(
                  riotStats.rankedSolo
                    ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)
                    : 'Unranked'
                )}
                style={styles.rankIconLarge}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankTitleLarge}>
                {riotStats.rankedSolo
                  ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)
                  : 'Unranked'}
              </ThemedText>
              {riotStats.rankedSolo && (
                <View style={styles.lpContainer}>
                  <ThemedText style={styles.lpText}>{riotStats.rankedSolo.leaguePoints} LP</ThemedText>
                </View>
              )}
            </View>

            {/* PEAK RANK - Secondary Prominent Display */}
            {riotStats.peakRank && (
              <View style={styles.peakRankSection}>
                <ThemedText style={styles.rankSectionLabel}>PEAK RANK</ThemedText>
                <View style={styles.peakRankContent}>
                  <Image
                    source={getRankIcon(formatRank(riotStats.peakRank.tier, riotStats.peakRank.rank))}
                    style={styles.rankIconMedium}
                    resizeMode="contain"
                  />
                  <View style={styles.peakRankText}>
                    <ThemedText style={styles.rankTitleMedium}>
                      {formatRank(riotStats.peakRank.tier, riotStats.peakRank.rank)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}

            {/* DIVIDER */}
            <View style={styles.sectionDivider} />

            {/* OTHER STATS - Compact Display */}
            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="chart.line.uptrend.xyaxis" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Win Rate</ThemedText>
              <ThemedText style={styles.statRowValue}>
                {riotStats.rankedSolo
                  ? `${riotStats.rankedSolo.winRate}% (${riotStats.rankedSolo.wins}W)`
                  : 'N/A'}
              </ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="gamecontroller.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Games Played</ThemedText>
              <ThemedText style={styles.statRowValue}>
                {riotStats.rankedSolo
                  ? riotStats.rankedSolo.wins + riotStats.rankedSolo.losses
                  : 0}
              </ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="person.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Top Champion</ThemedText>
              <ThemedText style={styles.statRowValue}>
                {riotStats.topChampions && riotStats.topChampions.length > 0
                  ? getChampionName(riotStats.topChampions[0].championId)
                  : 'N/A'}
              </ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="number" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Summoner Level</ThemedText>
              <ThemedText style={styles.statRowValue}>{riotStats.summonerLevel}</ThemedText>
            </View>
          </>
        ) : null}
      </View>

      {/* Share Button */}
      <TouchableOpacity style={styles.shareButton}>
        <ThemedText style={styles.shareButtonText}>Share Stats</ThemedText>
        <View style={styles.shareButtonIcon}>
          <IconSymbol size={20} name="arrow.right" color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroSection: {
    height: 240,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundLogo: {
    position: 'absolute',
    width: 308,
    height: 308,
    top: '85%',
    left: '50%',
    marginTop: -154,
    marginLeft: -134,
    opacity: 0.1,
  },
  summonerNameContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summonerNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  summonerTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 0,
  },
  profileIcon: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -80,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  statRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statRowLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  statRowValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1f3d',
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  shareButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Current Rank Section - Prominent
  currentRankSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginBottom: 16,
  },
  rankSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  rankIconLarge: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  rankTitleLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.5,
    lineHeight: 34,
    includeFontPadding: false,
  },
  lpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lpText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1f3d',
  },
  // Peak Rank Section - Secondary Prominent
  peakRankSection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
  },
  peakRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rankIconMedium: {
    width: 80,
    height: 80,
  },
  peakRankText: {
    flex: 1,
  },
  rankTitleMedium: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  // Section Divider
  sectionDivider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 16,
  },
});
