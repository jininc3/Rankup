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
      showsVerticalScrollIndicator={false}
      refreshControl={
        isOwnProfile ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000"
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
            <ThemedText style={styles.gamerNameText}>
              {valorantStats.gameName}
            </ThemedText>
            <ThemedText style={styles.gamerTagText}>
              #{valorantStats.tag}
            </ThemedText>
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
            <ActivityIndicator size="large" color="#000" />
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
          // Display Valorant stats from Henrik's API
          <>
            {/* CURRENT RANK - Prominent Display */}
            <View style={styles.currentRankSection}>
              <ThemedText style={styles.rankSectionLabel}>CURRENT RANK</ThemedText>
              <Image
                source={getRankIcon(valorantStats.currentRank)}
                style={styles.rankIconLarge}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankTitleLarge}>{valorantStats.currentRank}</ThemedText>
              <View style={styles.rrContainer}>
                <ThemedText style={styles.rrText}>{valorantStats.rankRating} RR</ThemedText>
                <View style={styles.divider} />
                <ThemedText style={styles.mmrText}>{valorantStats.mmr} MMR</ThemedText>
              </View>
            </View>

            {/* PEAK RANK - Secondary Prominent Display */}
            {valorantStats.peakRank && (
              <View style={styles.peakRankSection}>
                <ThemedText style={styles.rankSectionLabel}>PEAK RANK</ThemedText>
                <View style={styles.peakRankContent}>
                  <Image
                    source={getRankIcon(valorantStats.peakRank.tier)}
                    style={styles.rankIconMedium}
                    resizeMode="contain"
                  />
                  <View style={styles.peakRankText}>
                    <ThemedText style={styles.rankTitleMedium}>{valorantStats.peakRank.tier}</ThemedText>
                    <ThemedText style={styles.seasonText}>Season {valorantStats.peakRank.season}</ThemedText>
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
                {valorantStats.winRate}% ({valorantStats.wins}W)
              </ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="gamecontroller.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Games Played</ThemedText>
              <ThemedText style={styles.statRowValue}>{valorantStats.gamesPlayed}</ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="number" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Account Level</ThemedText>
              <ThemedText style={styles.statRowValue}>{valorantStats.accountLevel}</ThemedText>
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
  gamerIdContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamerNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  gamerTagText: {
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
    backgroundColor: '#B2313B',
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
  rrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rrText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B2313B',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#ddd',
  },
  mmrText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
  seasonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  // Section Divider
  sectionDivider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 16,
  },
});
