import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  getValorantStats,
  type ValorantStats,
} from '@/services/valorantService';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Valorant rank icon mapping - Includes subdivision ranks
const VALORANT_RANK_ICONS: { [key: string]: any } = {
  // Base ranks (fallback)
  iron: require('@/assets/images/valorantranks/iron.png'),
  bronze: require('@/assets/images/valorantranks/bronze.png'),
  silver: require('@/assets/images/valorantranks/silver.png'),
  gold: require('@/assets/images/valorantranks/gold.png'),
  platinum: require('@/assets/images/valorantranks/platinum.png'),
  diamond: require('@/assets/images/valorantranks/diamond.png'),
  ascendant: require('@/assets/images/valorantranks/ascendant.png'),
  immortal: require('@/assets/images/valorantranks/immortal.png'),
  radiant: require('@/assets/images/valorantranks/radiant.png'),
  unranked: require('@/assets/images/valorantranks/unranked.png'),

  // Subdivision ranks
  iron1: require('@/assets/images/valorantranks/iron1.png'),
  iron2: require('@/assets/images/valorantranks/iron2.png'),
  iron3: require('@/assets/images/valorantranks/iron3.png'),
  bronze1: require('@/assets/images/valorantranks/bronze1.png'),
  bronze2: require('@/assets/images/valorantranks/bronze2.png'),
  bronze3: require('@/assets/images/valorantranks/bronze3.png'),
  silver1: require('@/assets/images/valorantranks/silver1.png'),
  silver2: require('@/assets/images/valorantranks/silver2.png'),
  silver3: require('@/assets/images/valorantranks/silver3.png'),
  gold1: require('@/assets/images/valorantranks/gold1.png'),
  gold2: require('@/assets/images/valorantranks/gold2.png'),
  gold3: require('@/assets/images/valorantranks/gold3.png'),
  platinum1: require('@/assets/images/valorantranks/platinum1.png'),
  platinum2: require('@/assets/images/valorantranks/platinum2.png'),
  platinum3: require('@/assets/images/valorantranks/platinum3.png'),
  diamond1: require('@/assets/images/valorantranks/diamond1.png'),
  diamond2: require('@/assets/images/valorantranks/diamond2.png'),
  diamond3: require('@/assets/images/valorantranks/diamond3.png'),
  ascendant1: require('@/assets/images/valorantranks/ascendant1.png'),
  ascendant2: require('@/assets/images/valorantranks/ascendant2.png'),
  ascendant3: require('@/assets/images/valorantranks/ascendant3.png'),
  immortal1: require('@/assets/images/valorantranks/immortal1.png'),
  immortal2: require('@/assets/images/valorantranks/immortal2.png'),
  immortal3: require('@/assets/images/valorantranks/immortal3.png'),
};

export default function ValorantGameStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // Parse the game data from params
  const game = params.game ? JSON.parse(params.game as string) : null;
  const viewedUserId = params.userId as string | undefined; // If viewing another user's stats
  const isOwnProfile = !viewedUserId || viewedUserId === user?.id;

  // State for Valorant data
  const [valorantStats, setValorantStats] = useState<ValorantStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);

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
      console.log(`Loading cached Valorant stats from Firestore for user: ${targetUserId}...`);
      const userRef = doc(db, 'users', targetUserId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();

        if (data.valorantStats) {
          console.log('Loaded cached Valorant stats');
          setValorantStats(data.valorantStats);
          setCacheLoaded(true);

          // Only auto-fetch if viewing own profile
          if (isOwnProfile) {
            // Check if cache is expired and fetch if needed
            if (isCacheExpired(data.valorantStats.lastUpdated)) {
              console.log('Valorant cache expired, fetching fresh data...');
              fetchValorantData();
            } else {
              console.log('Valorant cache is still valid');
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
            fetchValorantData();
          } else {
            // No data for other user
            console.log('No stats available for this user');
            setError('This user has not linked their Valorant account or has no stats available.');
            setCacheLoaded(true);
            setHasFetched(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
      setCacheLoaded(true);
      fetchValorantData();
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await getValorantStats(true); // Force refresh
      if (response.success && response.stats) {
        setValorantStats(response.stats);
      }
    } catch (err: any) {
      console.error('Error refreshing stats:', err);
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchValorantData = async () => {
    if (loading || hasFetched) return;

    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const response = await getValorantStats();
      if (response.success && response.stats) {
        console.log('Valorant stats loaded:', response.stats);
        setValorantStats(response.stats);
      }
    } catch (err: any) {
      console.error('Error fetching Valorant stats:', err);
      setError(err.message);
      setHasFetched(false);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get rank icon
  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return VALORANT_RANK_ICONS.unranked;
    }

    // Extract tier and subdivision (e.g., "Gold 3" → "gold3")
    const parts = rank.split(' ');
    const tier = parts[0].toLowerCase(); // e.g., "gold"
    const subdivision = parts[1]; // e.g., "3"

    // Try to get subdivision rank first (e.g., "gold3")
    if (subdivision) {
      const subdivisionKey = tier + subdivision; // e.g., "gold3"
      if (VALORANT_RANK_ICONS[subdivisionKey]) {
        return VALORANT_RANK_ICONS[subdivisionKey];
      }
    }

    // Fallback to base tier (e.g., "gold") or radiant (which has no subdivision)
    return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
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
      {/* Hero Section with Valorant Red Background */}
      <View style={[styles.heroSection, { backgroundColor: '#B2313B' }]}>
        {/* Valorant text logo watermark */}
        <Image
          source={require('@/assets/images/valorant-text.png')}
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

        {/* Gamer ID and Tag - Centered Title */}
        {valorantStats && (
          <View style={styles.gamerIdContainer}>
            <View style={styles.gamerIdRow}>
              <ThemedText style={styles.gamerNameText}>
                {valorantStats.gameName}
              </ThemedText>
              <ThemedText style={styles.gamerTagText}>
                {' '}#{valorantStats.tag}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Valorant Player Card - Top Right */}
        {valorantStats && valorantStats.card && (
          <Image
            source={{ uri: valorantStats.card.small }}
            style={styles.profileIcon}
            onError={(error) => console.log('Valorant card load error:', error.nativeEvent)}
            onLoad={() => console.log('Valorant card loaded successfully')}
          />
        )}
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        {loading && !valorantStats ? (
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
                onPress={fetchValorantData}
              >
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : valorantStats ? (
          // Display Valorant stats - Hierarchical Layout
          <>
            {/* CURRENT RANK - Hero Card (Full Width) */}
            <View style={styles.heroRankCard}>
              <ThemedText style={styles.heroRankLabel}>CURRENT RANK</ThemedText>
              <Image
                source={getRankIcon(valorantStats.currentRank)}
                style={styles.heroRankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.heroRankTitle}>{valorantStats.currentRank}</ThemedText>
              <ThemedText style={styles.heroRankSubtext}>
                {valorantStats.rankRating} RR
              </ThemedText>
            </View>

            {/* Important Stats Row - Peak Rank & Win Rate */}
            <View style={styles.importantStatsRow}>
              {/* PEAK RANK Card */}
              {valorantStats.peakRank && (
                <View style={styles.importantStatCard}>
                  <ThemedText style={styles.importantStatLabel}>PEAK RANK</ThemedText>
                  <Image
                    source={getRankIcon(valorantStats.peakRank.tier)}
                    style={styles.importantStatIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.importantStatTitle}>{valorantStats.peakRank.tier}</ThemedText>
                  <ThemedText style={styles.importantStatSubtext}>
                    Season {valorantStats.peakRank.season}
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
                  {valorantStats.winRate}% ({valorantStats.wins}W)
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
                <ThemedText style={styles.secondaryStatValue}>{valorantStats.gamesPlayed}</ThemedText>
              </View>

              {/* MMR */}
              <View style={styles.secondaryStatCard}>
                <View style={styles.secondaryStatIconContainer}>
                  <IconSymbol size={16} name="chart.bar.fill" color="#fff" />
                </View>
                <ThemedText style={styles.secondaryStatLabel}>MMR</ThemedText>
                <ThemedText style={styles.secondaryStatValue}>{valorantStats.mmr}</ThemedText>
              </View>

              {/* Account Level */}
              <View style={styles.secondaryStatCard}>
                <View style={styles.secondaryStatIconContainer}>
                  <IconSymbol size={16} name="number" color="#fff" />
                </View>
                <ThemedText style={styles.secondaryStatLabel}>Level</ThemedText>
                <ThemedText style={styles.secondaryStatValue}>{valorantStats.accountLevel}</ThemedText>
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
    backgroundColor: '#B2313B',
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
  gamerIdContainer: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamerIdRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  gamerNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  gamerTagText: {
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
  backgroundLogo: {
    position: 'absolute',
    width: 400,
    height: 400,
    top: '85%',
    left: '50%',
    marginTop: -200,
    marginLeft: -175,
    opacity: 0.1,
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
    color: '#B2313B',
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
    backgroundColor: '#B2313B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#B2313B',
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
    backgroundColor: '#B2313B',
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
