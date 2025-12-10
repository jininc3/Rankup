import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getRiotStats, formatRank, getChampionName, type RiotStats } from '@/services/riotService';

interface GameStatsScreenProps {
  // Props will come from navigation params
}

export default function GameStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse the game data from params
  const game = params.game ? JSON.parse(params.game as string) : null;

  // State for Riot data
  const [riotStats, setRiotStats] = useState<RiotStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch Riot stats if this is League of Legends (only once)
  useEffect(() => {
    if (game && game.name === 'League of Legends' && !hasFetched && !loading) {
      fetchRiotData();
    }
  }, [game?.name]);

  const fetchRiotData = async () => {
    if (loading || hasFetched) return; // Prevent multiple simultaneous calls

    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const response = await getRiotStats();
      if (response.success && response.stats) {
        setRiotStats(response.stats);
      }
    } catch (err: any) {
      console.error('Error fetching Riot stats:', err);
      setError(err.message);
      setHasFetched(false); // Allow retry on error
    } finally {
      setLoading(false);
    }
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
      case 'Valorant':
        return '#e8a5a5'; // Dark pastel red
      case 'League of Legends':
        return '#b3d9ff'; // Pastel blue
      case 'Apex Legends':
        return '#fff4b3'; // Pastel yellow
      default:
        return '#e0e0e0'; // Default gray
    }
  };

  // Get game image
  const getGameImage = () => {
    switch (game.name) {
      case 'Valorant':
        return require('@/assets/images/valorant.png');
      case 'League of Legends':
        return require('@/assets/images/leagueoflegends.png');
      case 'Apex Legends':
        return require('@/assets/images/apex.png');
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section with Pastel Background */}
      <View style={[styles.heroSection, { backgroundColor: getGameColor() }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>

        {/* Game Logo */}
        <View style={styles.heroContent}>
          <Image source={getGameImage()} style={styles.heroGameImage} resizeMode="contain" />
          <ThemedText style={styles.gameTitle}>{game.name}</ThemedText>
        </View>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <ThemedText style={styles.loadingText}>Loading stats...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRiotData}>
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
                  ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)
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
                <IconSymbol size={20} name="shield.fill" color="#666" />
              </View>
              <ThemedText style={styles.statRowLabel}>League Points</ThemedText>
              <ThemedText style={styles.statRowValue}>
                {riotStats.rankedSolo ? `${riotStats.rankedSolo.leaguePoints} LP` : 'N/A'}
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
        ) : (
          // Display mock data for other games or if no Riot account linked
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
                {game.name === 'Valorant'
                  ? 'Agent'
                  : game.name === 'League of Legends'
                  ? 'Champion'
                  : 'Character'}
              </ThemedText>
              <ThemedText style={styles.statRowValue}>{game.topCharacter || 'Jett'}</ThemedText>
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
