import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  getLeagueStats,
  getTftStats,
  formatRank,
  getChampionName,
  getProfileIconUrl,
  type RiotStats,
  type TftStats
} from '@/services/riotService';
import {
  getValorantStats,
  type ValorantStats,
} from '@/services/valorantService';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface GameStatsScreenProps {
  // Props will come from navigation params
}

export default function GameStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // Parse the game data from params
  const game = params.game ? JSON.parse(params.game as string) : null;

  // State for Riot data (League of Legends)
  const [riotStats, setRiotStats] = useState<RiotStats | null>(null);
  // State for TFT data
  const [tftStats, setTftStats] = useState<TftStats | null>(null);
  // State for Valorant data
  const [valorantStats, setValorantStats] = useState<ValorantStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  // Load cached data from Firestore on mount
  useEffect(() => {
    if (game && user?.id && !cacheLoaded) {
      loadCachedData();
    }
  }, [game?.name, user?.id]);

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
    if (!user?.id) return;

    try {
      console.log('Loading cached stats from Firestore...');
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();

        if (game.name === 'League of Legends' && data.riotStats) {
          console.log('Loaded cached League stats');
          setRiotStats(data.riotStats);
          setCacheLoaded(true);

          // Check if cache is expired and fetch if needed
          if (isCacheExpired(data.riotStats.lastUpdated)) {
            console.log('League cache expired, fetching fresh data...');
            fetchLeagueDataWithCache(data.riotStats); // Pass cached data
          } else {
            console.log('League cache is still valid');
            setHasFetched(true);
          }
        } else if (game.name === 'Valorant' && data.valorantStats) {
          console.log('Loaded cached Valorant stats');
          setValorantStats(data.valorantStats);
          setCacheLoaded(true);

          // Check if cache is expired and fetch if needed
          if (isCacheExpired(data.valorantStats.lastUpdated)) {
            console.log('Valorant cache expired, fetching fresh data...');
            fetchValorantDataWithCache(data.valorantStats); // Pass cached data
          } else {
            console.log('Valorant cache is still valid');
            setHasFetched(true);
          }
        } else if (game.name === 'TFT' && data.tftStats) {
          console.log('Loaded cached TFT stats');
          setTftStats(data.tftStats);
          setCacheLoaded(true);
          setHasFetched(true);
        } else {
          // No cached data, fetch for the first time
          console.log('No cached data found, fetching...');
          setCacheLoaded(true);
          if (game.name === 'League of Legends') {
            fetchLeagueDataWithCache(null);
          } else if (game.name === 'Valorant') {
            fetchValorantDataWithCache(null);
          } else if (game.name === 'TFT') {
            setHasFetched(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
      setCacheLoaded(true);
      // Fallback to fetching if cache load fails
      if (game.name === 'League of Legends') {
        fetchLeagueDataWithCache(null);
      } else if (game.name === 'Valorant') {
        fetchValorantDataWithCache(null);
      }
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      if (game.name === 'League of Legends') {
        const response = await getLeagueStats(true); // Force refresh
        if (response.success && response.stats) {
          setRiotStats(response.stats);
          setError(null);
        }
      } else if (game.name === 'Valorant') {
        const response = await getValorantStats(true); // Force refresh
        if (response.success && response.stats) {
          setValorantStats(response.stats);
          setError(null);
        }
      } else if (game.name === 'TFT') {
        const response = await getTftStats(true); // Force refresh
        if (response.success && response.stats) {
          setTftStats(response.stats);
          setError(null);
        }
      }
    } catch (err: any) {
      console.error('Error refreshing stats:', err);
      // Show gentler error when we have cached data
      const hasCache = (game.name === 'League of Legends' && riotStats) ||
                       (game.name === 'Valorant' && valorantStats) ||
                       (game.name === 'TFT' && tftStats);

      if (hasCache) {
        setError('Unable to refresh - showing cached data');
      } else {
        setError(err.message);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLeagueDataWithCache = async (cachedData: any) => {
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
        setError(null); // Clear any previous errors on success
      } else {
        // API call succeeded but returned unsuccessful response
        console.log('API returned unsuccessful response, using cached data');
        if (!cachedData) {
          setError(response.error || 'Failed to load stats');
        } else {
          setError('Using cached data - API unavailable');
        }
        setHasFetched(false);
      }
    } catch (err: any) {
      console.error('Error fetching League stats:', err);
      // Only show error if we don't have cached data
      if (!cachedData) {
        setError(err.message);
      } else {
        console.log('API error, but using cached data');
        // Show a subtle warning that data might be stale
        setError('Using cached data - API unavailable');
      }
      setHasFetched(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagueData = async () => {
    fetchLeagueDataWithCache(riotStats);
  };

  const fetchTftData = async () => {
    if (loading || hasFetched) return;

    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const response = await getTftStats();
      if (response.success && response.stats) {
        setTftStats(response.stats);
      }
    } catch (err: any) {
      console.error('Error fetching TFT stats:', err);
      setError(err.message);
      setHasFetched(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchValorantDataWithCache = async (cachedData: any) => {
    if (loading || hasFetched) return;

    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const response = await getValorantStats();
      if (response.success && response.stats) {
        console.log('Valorant stats loaded:', response.stats);
        setValorantStats(response.stats);
        setError(null); // Clear any previous errors on success
      } else {
        // API call succeeded but returned unsuccessful response
        console.log('API returned unsuccessful response, using cached data');
        if (!cachedData) {
          setError(response.error || 'Failed to load stats');
        } else {
          setError('Using cached data - API unavailable');
        }
        setHasFetched(false);
      }
    } catch (err: any) {
      console.error('Error fetching Valorant stats:', err);
      // Only show error if we don't have cached data
      if (!cachedData) {
        setError(err.message);
      } else {
        console.log('API error, but using cached data');
        // Show a subtle warning that data might be stale
        setError('Using cached data - API unavailable');
      }
      setHasFetched(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchValorantData = async () => {
    fetchValorantDataWithCache(valorantStats);
  };


  if (!game) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>No game data available</ThemedText>
      </ThemedView>
    );
  }

  // Get game color based on game name
  const getGameColor = () => {
    switch (game.name) {
      case 'League of Legends':
        return '#0f1f3d'; // Navy blue (matches rankCard)
      case 'Valorant':
        return '#B2313B'; // Dark Valorant red (matches rankCard)
      case 'TFT':
        return '#d4b3ff'; // Pastel purple
      case 'Apex Legends':
        return '#fff4b3'; // Pastel yellow
      default:
        return '#e0e0e0'; // Default gray
    }
  };

  // Get game image
  const getGameImage = () => {
    switch (game.name) {
      case 'League of Legends':
        return require('@/assets/images/leagueoflegends.png');
      case 'Valorant':
        return require('@/assets/images/valorant.png');
      case 'TFT':
        return require('@/assets/images/tft.png');
      case 'Apex Legends':
        return require('@/assets/images/apex.png');
      default:
        return null;
    }
  };

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
      {/* Hero Section with Pastel Background */}
      <View style={[styles.heroSection, { backgroundColor: getGameColor() }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            size={24}
            name="chevron.left"
            color={(game.name === 'League of Legends' || game.name === 'Valorant') ? '#fff' : '#000'}
          />
        </TouchableOpacity>

        {/* Profile Icon - Top Right */}
        {(riotStats || tftStats) && (
          <Image
            source={{ uri: getProfileIconUrl((riotStats || tftStats)!.profileIconId) }}
            style={styles.profileIcon}
            onError={(error) => console.log('Profile icon load error:', error.nativeEvent)}
            onLoad={() => console.log('Profile icon loaded successfully')}
          />
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

        {/* League of Legends centered logo */}
        {game.name === 'League of Legends' ? (
          <Image
            source={require('@/assets/images/lol.png')}
            style={styles.centeredLogoLOL}
            resizeMode="contain"
          />
        ) : game.name === 'Valorant' ? (
          /* Valorant centered logo */
          <Image
            source={require('@/assets/images/valorant-logo.png')}
            style={styles.centeredLogoLOL}
            resizeMode="contain"
          />
        ) : (
          /* Game Logo for other games */
          <View style={styles.heroContent}>
            <Image source={getGameImage()} style={styles.heroGameImage} resizeMode="contain" />
            <ThemedText style={styles.gameTitle}>{game.name}</ThemedText>
          </View>
        )}
      </View>

      {/* Warning banner when showing cached data with API error */}
      {error && (riotStats || valorantStats || tftStats) && (
        <View style={styles.warningBanner}>
          <IconSymbol size={16} name="exclamationmark.triangle.fill" color="#f59e0b" />
          <ThemedText style={styles.warningText}>
            {error}
          </ThemedText>
        </View>
      )}

      {/* Stats Card */}
      <View style={styles.statsCard}>
        {loading && !riotStats && !valorantStats && !tftStats ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <ThemedText style={styles.loadingText}>Loading stats...</ThemedText>
          </View>
        ) : error && !riotStats && !valorantStats && !tftStats ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={
                game.name === 'TFT' ? fetchTftData :
                game.name === 'Valorant' ? fetchValorantData :
                fetchLeagueData
              }
            >
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : game.name === 'League of Legends' && riotStats ? (
          // Display real Riot stats for League of Legends
          <>
            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="trophy.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Current Rank</ThemedText>
              <ThemedText style={styles.statRowValue}>
                {riotStats.rankedSolo
                  ? `${formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)} (${riotStats.rankedSolo.leaguePoints} LP)`
                  : 'Unranked'}
              </ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="star.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Peak Rank</ThemedText>
              <ThemedText style={styles.statRowValue}>
                {riotStats.peakRank
                  ? formatRank(riotStats.peakRank.tier, riotStats.peakRank.rank)
                  : 'N/A'}
              </ThemedText>
            </View>

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
        ) : game.name === 'Valorant' && valorantStats ? (
          // Display Valorant stats from Henrik's API
          <>
            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="trophy.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Current Rank</ThemedText>
              <ThemedText style={styles.statRowValue}>
                {valorantStats.currentRank} ({valorantStats.rankRating} RR)
              </ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="chart.line.uptrend.xyaxis" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>MMR</ThemedText>
              <ThemedText style={styles.statRowValue}>{valorantStats.mmr}</ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="star.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Peak Rank</ThemedText>
              <ThemedText style={styles.statRowValue}>
                {valorantStats.peakRank ? valorantStats.peakRank.tier : 'N/A'}
              </ThemedText>
            </View>

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
        ) : (
          // Display placeholder data for TFT or other games
          // TFT API temporarily disabled
          <>
            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="trophy.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Current Rank</ThemedText>
              <ThemedText style={styles.statRowValue}>{game.rank}</ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="star.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Peak Rank</ThemedText>
              <ThemedText style={styles.statRowValue}>{game.peakRank || 'Diamond 3'}</ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="chart.line.uptrend.xyaxis" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Win Rate</ThemedText>
              <ThemedText style={styles.statRowValue}>
                {game.winRate}% ({game.wins}W)
              </ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="gamecontroller.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>Games Played</ThemedText>
              <ThemedText style={styles.statRowValue}>{game.wins + game.losses}</ThemedText>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statRowIcon}>
                <IconSymbol size={20} name="person.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>
                Top{' '}
                {game.name === 'League of Legends'
                  ? 'Champion'
                  : 'Character'}
              </ThemedText>
              <ThemedText style={styles.statRowValue}>{game.topCharacter || 'Unknown'}</ThemedText>
            </View>
          </>
        )}
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
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  heroGameImage: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  gameTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    paddingVertical: 7,
    letterSpacing: -0.5,
  },
  centeredLogoLOL: {
    position: 'absolute',
    width: 200,
    height: 200,
    top: '60%',
    left: '50%',
    marginTop: -100,
    marginLeft: -100,
    opacity: 0.15,
    alignSelf: 'center',
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
  mainStatContainer: {
    alignItems: 'flex-start',
  },
  mainStatValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -2,
  },
  mainStatLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -30,
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
  },
  statRowValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  recentMatchesContainer: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  matchBadge: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  matchBadgePositive: {
    backgroundColor: '#e8f5e9',
  },
  matchBadgeNegative: {
    backgroundColor: '#ffebee',
  },
  matchBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  matchBadgeTextPositive: {
    color: '#2e7d32',
  },
  matchBadgeTextNegative: {
    color: '#c62828',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
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
});
