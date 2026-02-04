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
  const viewedUserId = params.userId as string | undefined; // If viewing another user's stats
  const isOwnProfile = !viewedUserId || viewedUserId === user?.id;

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
    const targetUserId = viewedUserId || user?.id;
    if (game && targetUserId && !cacheLoaded) {
      loadCachedData();
    }
  }, [game?.name, user?.id, viewedUserId]);

  // Helper function to check if cache is expired (> 3 hours)
  const isCacheExpired = (lastUpdated: any): boolean => {
    if (!lastUpdated) return true;

    const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    const lastUpdatedTime = lastUpdated.toMillis ? lastUpdated.toMillis() : lastUpdated;
    const now = Date.now();
    const cacheAge = now - lastUpdatedTime;

    return cacheAge > CACHE_TTL;
  };

  // Load cached stats from Firestore
  const loadCachedData = async () => {
    const targetUserId = viewedUserId || user?.id;
    if (!targetUserId) return;

    try {
      console.log(`Loading cached League stats from Firestore for user: ${targetUserId}...`);
      const userRef = doc(db, 'users', targetUserId);
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

          // Only auto-fetch if viewing own profile
          if (isOwnProfile) {
            // Check if cache is expired and fetch if needed
            if (isCacheExpired(data.riotStats.lastUpdated)) {
              console.log('League cache expired, fetching fresh data...');
              fetchLeagueData();
            } else {
              console.log('League cache is still valid');
              setHasFetched(true);
            }
          } else {
            // Viewing another user - just show cached data
            console.log('Viewing another user - showing cached data only');
            setHasFetched(true);
          }
        } else {
          // No cached data
          if (isOwnProfile) {
            // Fetch for own profile
            console.log('No cached data found, fetching...');
            setCacheLoaded(true);
            fetchLeagueData();
          } else {
            // No data for other user
            console.log('No stats available for this user');
            setError('This user has not linked their League account or has no stats available.');
            setCacheLoaded(true);
            setHasFetched(true);
          }
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
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        isOwnProfile ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        ) : undefined
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
            <View style={styles.summonerNameRow}>
              <ThemedText style={styles.summonerNameText}>
                {summonerName.gameName}
              </ThemedText>
              <ThemedText style={styles.summonerTagText}>
                {' '}#{summonerName.tagLine}
              </ThemedText>
            </View>
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
            <ActivityIndicator size="large" color="#fff" />
            <ThemedText style={styles.loadingText}>Loading stats...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchLeagueData}
              >
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : riotStats ? (
          // Display League of Legends stats - Hierarchical Layout
          <>
            {/* CURRENT RANK - Hero Card (Full Width) */}
            <View style={styles.heroRankCard}>
              <ThemedText style={styles.heroRankLabel}>CURRENT RANK</ThemedText>
              <Image
                source={getRankIcon(
                  riotStats.rankedSolo
                    ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)
                    : 'Unranked'
                )}
                style={styles.heroRankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.heroRankTitle}>
                {riotStats.rankedSolo
                  ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)
                  : 'Unranked'}
              </ThemedText>
              {riotStats.rankedSolo && (
                <ThemedText style={styles.heroRankSubtext}>
                  {riotStats.rankedSolo.leaguePoints} LP
                </ThemedText>
              )}
            </View>

            {/* Important Stats Row - Peak Rank & Win Rate */}
            <View style={styles.importantStatsRow}>
              {/* PEAK RANK Card */}
              {riotStats.peakRank && (
                <View style={styles.importantStatCard}>
                  <ThemedText style={styles.importantStatLabel}>PEAK RANK</ThemedText>
                  <Image
                    source={getRankIcon(formatRank(riotStats.peakRank.tier, riotStats.peakRank.rank))}
                    style={styles.importantStatIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.importantStatTitle}>
                    {formatRank(riotStats.peakRank.tier, riotStats.peakRank.rank)}
                  </ThemedText>
                </View>
              )}

              {/* Win Rate Card */}
              <View style={styles.importantStatCard}>
                <ThemedText style={styles.importantStatLabel}>WIN RATE</ThemedText>
                <View style={styles.importantStatIconContainer}>
                  <IconSymbol size={24} name="chart.line.uptrend.xyaxis" color="#fff" />
                </View>
                <ThemedText style={styles.importantStatTitle}>
                  {riotStats.rankedSolo ? `${riotStats.rankedSolo.winRate}% (${riotStats.rankedSolo.wins}W)` : 'N/A'}
                </ThemedText>
              </View>
            </View>

            {/* Secondary Stats Grid - Smaller cards */}
            <View style={styles.secondaryStatsGrid}>
              {/* Games Played */}
              <View style={styles.secondaryStatCard}>
                <View style={styles.secondaryStatIconContainer}>
                  <IconSymbol size={16} name="gamecontroller.fill" color="#fff" />
                </View>
                <ThemedText style={styles.secondaryStatLabel}>Games</ThemedText>
                <ThemedText style={styles.secondaryStatValue}>
                  {riotStats.rankedSolo
                    ? riotStats.rankedSolo.wins + riotStats.rankedSolo.losses
                    : 0}
                </ThemedText>
              </View>

              {/* Top Champion */}
              <View style={styles.secondaryStatCard}>
                <View style={styles.secondaryStatIconContainer}>
                  <IconSymbol size={16} name="person.fill" color="#fff" />
                </View>
                <ThemedText style={styles.secondaryStatLabel}>Top Champion</ThemedText>
                <ThemedText style={styles.secondaryStatValue}>
                  {riotStats.topChampions && riotStats.topChampions.length > 0
                    ? getChampionName(riotStats.topChampions[0].championId)
                    : 'N/A'}
                </ThemedText>
              </View>

              {/* Summoner Level */}
              <View style={styles.secondaryStatCard}>
                <View style={styles.secondaryStatIconContainer}>
                  <IconSymbol size={16} name="number" color="#fff" />
                </View>
                <ThemedText style={styles.secondaryStatLabel}>Level</ThemedText>
                <ThemedText style={styles.secondaryStatValue}>{riotStats.summonerLevel}</ThemedText>
              </View>
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
    backgroundColor: '#0f1f3d',
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    height: 200,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
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
    top: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summonerNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summonerNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  summonerTagText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
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
    backgroundColor: '#23262b',
    marginHorizontal: 20,
    marginTop: -60,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#36393e',
  },
  statRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statRowLabel: {
    flex: 1,
    fontSize: 14,
    color: '#b9bbbe',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  statRowValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c2f33',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  shareButtonIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#b9bbbe',
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
    backgroundColor: '#c42743',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Hero Rank Card - Current Rank (Full Width, Most Prominent)
  heroRankCard: {
    backgroundColor: '#1a1d21',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  heroRankLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8e9297',
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  heroRankIcon: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  heroRankTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -1,
  },
  heroRankSubtext: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f1f3d',
    marginTop: 6,
  },
  // Important Stats Row - Peak Rank & Win Rate
  importantStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  importantStatCard: {
    flex: 1,
    backgroundColor: '#1a1d21',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  importantStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8e9297',
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  importantStatIcon: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  importantStatIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0f1f3d',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#0f1f3d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  importantStatTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  importantStatSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5c6066',
    marginTop: 4,
  },
  // Secondary Stats Grid - Smaller, Less Prominent
  secondaryStatsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryStatCard: {
    flex: 1,
    backgroundColor: '#1a1d21',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryStatIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f1f3d',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#72767d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  secondaryStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
});
