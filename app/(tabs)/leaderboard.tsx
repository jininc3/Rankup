import { leaderboards } from '@/app/data/userData';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant.png'),
  'League of Legends': require('@/assets/images/leagueoflegends.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
  'CS2': require('@/assets/images/valorant.png'), // placeholder
  'Overwatch 2': require('@/assets/images/valorant.png'), // placeholder
};

// User's rank summary data
const userRankSummary = leaderboards
  .filter(lb => lb.userRank !== null)
  .map(lb => ({
    leaderboardName: lb.name,
    rank: lb.userRank!,
    totalMembers: lb.members,
    game: lb.game,
  }));

// List of all available leaderboards with player data
const leaderboardsList = leaderboards;

export default function LeaderboardScreen() {
  const router = useRouter();

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#666';
  };

  const handleLeaderboardPress = (leaderboard: any) => {
    const params = {
      name: leaderboard.name,
      icon: leaderboard.icon,
      game: leaderboard.game,
      members: leaderboard.members.toString(),
      players: JSON.stringify(leaderboard.players),
    };

    router.push({ pathname: '/leaderboardPages/leaderboardDetail', params });
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Leaderboards</ThemedText>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Your Rankings Summary */}
        <View style={styles.summarySection}>
          <ThemedText style={styles.sectionTitle}>Your Rankings</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.summaryScroll}
          >
            {userRankSummary.map((item, index) => (
              <View key={index} style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <View style={styles.summaryCardTitleSection}>
                    <ThemedText style={styles.summaryLeaderboardName}>
                      {item.leaderboardName}
                    </ThemedText>
                  </View>
                  <View style={styles.summaryIconContainer}>
                    <Image
                      source={GAME_LOGOS[item.game] || GAME_LOGOS['Valorant']}
                      style={styles.summaryGameLogo}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <View style={styles.summaryRankSection}>
                  <ThemedText style={styles.summaryRankLabel}>Your Rank</ThemedText>
                  <ThemedText style={styles.summaryRankValue}>#{item.rank}</ThemedText>
                  <ThemedText style={styles.summaryMembers}>
                    of {item.totalMembers} members
                  </ThemedText>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* All Leaderboards */}
        <View style={styles.leaderboardsSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>All Leaderboards</ThemedText>
            <TouchableOpacity>
              <IconSymbol size={20} name="plus.circle.fill" color="#000" />
            </TouchableOpacity>
          </View>

          {leaderboardsList.map((leaderboard) => (
            <TouchableOpacity
              key={leaderboard.id}
              style={styles.leaderboardCard}
              onPress={() => handleLeaderboardPress(leaderboard)}
            >
              {/* Top section with icon and title */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleSection}>
                  <ThemedText style={styles.leaderboardName}>{leaderboard.name}</ThemedText>
                </View>
                <View style={styles.leaderboardIconContainer}>
                  <Image
                    source={GAME_LOGOS[leaderboard.game] || GAME_LOGOS['Valorant']}
                    style={styles.gameLogoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Progress section */}
              {leaderboard.userRank && (
                <View style={styles.progressSection}>
                  <ThemedText style={styles.progressText}>
                    {Math.round((leaderboard.userRank / leaderboard.members) * 100)}%
                  </ThemedText>
                  <ThemedText style={styles.endTimeText}>
                    Rank #{leaderboard.userRank} of {leaderboard.members}
                  </ThemedText>
                </View>
              )}

              {/* Progress bar */}
              {leaderboard.userRank && (
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${(leaderboard.userRank / leaderboard.members) * 100}%` }
                    ]} 
                  />
                </View>
              )}

              {/* Bottom meta info */}
              <View style={styles.cardFooter}>
                {leaderboard.isJoined && (
                  <View style={styles.joinedBadge}>
                    <ThemedText style={styles.joinedBadgeText}>Joined</ThemedText>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  summarySection: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  summaryScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    minWidth: 200,
    height: 140,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryCardTitleSection: {
    flex: 1,
    marginRight: 8,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGameLogo: {
    width: 32,
    height: 32,
  },
  summaryRankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryRankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  summaryRankSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRankLabel: {
    fontSize: 10,
    color: '#666',
    letterSpacing: 1,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryRankValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  summaryLeaderboardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.2,
  },
  summaryMembers: {
    fontSize: 11,
    color: '#666',
    fontWeight: '400',
  },
  leaderboardsSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaderboardCard: {
    flexDirection: 'column',
    backgroundColor: '#2a2a2e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  leaderboardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardIconText: {
    fontSize: 32,
  },
  gameLogoImage: {
    width: 48,
    height: 48,
  },
  leaderboardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  leaderboardDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 18,
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b9d',
  },
  endTimeText: {
    fontSize: 13,
    color: '#a0a0a0',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ff6b9d',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '400',
  },
  joinedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  joinedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userRankText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});