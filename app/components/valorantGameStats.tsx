import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { type ValorantStats } from '@/services/valorantService';
import { useAuth } from '@/contexts/AuthContext';
import { useValorantStats } from '@/contexts/ValorantStatsContext';
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

  // For own profile: use ValorantStatsContext
  const {
    valorantStats: contextStats,
    isLoading: contextLoading,
    error: contextError,
    fetchStats: contextFetchStats,
  } = useValorantStats();

  // For other users: local state from Firestore
  const [otherUserStats, setOtherUserStats] = useState<ValorantStats | null>(null);
  const [otherUserLoading, setOtherUserLoading] = useState(false);
  const [otherUserError, setOtherUserError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Resolved values based on own vs other profile
  const valorantStats = isOwnProfile ? contextStats : otherUserStats;
  const loading = isOwnProfile ? contextLoading : otherUserLoading;
  const error = isOwnProfile ? contextError : otherUserError;

  // Load other user's cached stats from Firestore
  useEffect(() => {
    if (isOwnProfile || !viewedUserId || !game) return;

    const loadOtherUserData = async () => {
      setOtherUserLoading(true);
      try {
        const userRef = doc(db, 'users', viewedUserId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().valorantStats) {
          setOtherUserStats(userDoc.data().valorantStats);
        } else {
          setOtherUserError('This user has not linked their Valorant account or has no stats available.');
        }
      } catch (err) {
        console.error('Error loading other user stats:', err);
        setOtherUserError('Failed to load stats.');
      } finally {
        setOtherUserLoading(false);
      }
    };

    loadOtherUserData();
  }, [isOwnProfile, viewedUserId, game?.name]);

  // Handle pull-to-refresh (own profile only)
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await contextFetchStats(true);
    } catch (err: any) {
      console.error('Error refreshing stats:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchValorantData = async () => {
    if (isOwnProfile) {
      await contextFetchStats();
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
          // Display Valorant stats - Compact 2-Container Layout
          <>
            {/* Top Container: Current Rank, Peak Rank, Win Rate */}
            <View style={styles.compactStatsContainer}>
              <View style={styles.compactStatItem}>
                <ThemedText style={styles.compactStatLabel}>CURRENT</ThemedText>
                <Image
                  source={getRankIcon(valorantStats.currentRank)}
                  style={styles.compactRankIcon}
                  resizeMode="contain"
                />
                <ThemedText style={styles.compactStatValue}>{valorantStats.currentRank}</ThemedText>
                <ThemedText style={styles.compactStatSubtext}>{valorantStats.rankRating} RR</ThemedText>
              </View>
              <View style={styles.compactStatDivider} />
              <View style={styles.compactStatItem}>
                <ThemedText style={styles.compactStatLabel}>PEAK</ThemedText>
                <Image
                  source={getRankIcon(valorantStats.peakRank?.tier || 'Unranked')}
                  style={styles.compactRankIcon}
                  resizeMode="contain"
                />
                <ThemedText style={styles.compactStatValue}>
                  {valorantStats.peakRank ? valorantStats.peakRank.tier : 'N/A'}
                </ThemedText>
                {valorantStats.peakRank && (
                  <ThemedText style={styles.compactStatSubtext}>S{valorantStats.peakRank.season}</ThemedText>
                )}
              </View>
              <View style={styles.compactStatDivider} />
              <View style={styles.compactStatItem}>
                <ThemedText style={styles.compactStatLabel}>WIN RATE</ThemedText>
                <View style={styles.compactWinRateIcon}>
                  <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color="#fff" />
                </View>
                <ThemedText style={styles.compactStatValue}>{valorantStats.winRate}%</ThemedText>
                <ThemedText style={styles.compactStatSubtext}>{valorantStats.wins}W</ThemedText>
              </View>
            </View>

            {/* Second Container: Games, MMR, Level */}
            <View style={styles.compactStatsContainer}>
              <View style={styles.compactStatItem}>
                <ThemedText style={styles.compactStatLabel}>GAMES</ThemedText>
                <View style={styles.compactSecondaryIcon}>
                  <IconSymbol size={20} name="gamecontroller.fill" color="#fff" />
                </View>
                <ThemedText style={styles.compactStatValue}>{valorantStats.gamesPlayed}</ThemedText>
              </View>
              <View style={styles.compactStatDivider} />
              <View style={styles.compactStatItem}>
                <ThemedText style={styles.compactStatLabel}>MMR</ThemedText>
                <View style={styles.compactSecondaryIcon}>
                  <IconSymbol size={20} name="chart.bar.fill" color="#fff" />
                </View>
                <ThemedText style={styles.compactStatValue}>{valorantStats.mmr}</ThemedText>
              </View>
              <View style={styles.compactStatDivider} />
              <View style={styles.compactStatItem}>
                <ThemedText style={styles.compactStatLabel}>LEVEL</ThemedText>
                <View style={styles.compactSecondaryIcon}>
                  <IconSymbol size={20} name="number" color="#fff" />
                </View>
                <ThemedText style={styles.compactStatValue}>{valorantStats.accountLevel}</ThemedText>
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
    borderColor: 'rgba(239, 84, 102, 0.2)',
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
    borderColor: 'rgba(239, 84, 102, 0.15)',
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
  // Compact 2-Container Layout Styles
  compactStatsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1d21',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 84, 102, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  compactStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStatDivider: {
    width: 1,
    backgroundColor: 'rgba(239, 84, 102, 0.2)',
    marginVertical: 4,
  },
  compactStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8e9297',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  compactRankIcon: {
    width: 44,
    height: 44,
    marginBottom: 6,
  },
  compactWinRateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#B2313B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  compactSecondaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#B2313B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  compactStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  compactStatSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5c6066',
    marginTop: 2,
  },
});
