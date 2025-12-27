import { leaderboards } from '@/app/data/userData';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import PartyCards from '@/app/components/partyCards';

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
                    <ThemedText style={styles.summaryMembers}>
                      of {item.totalMembers} members
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
            <PartyCards
              key={leaderboard.id}
              leaderboard={leaderboard}
              onPress={handleLeaderboardPress}
            />
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
    padding: 12,
    borderRadius: 12,
    minWidth: 160,
    height: 110,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  summaryCardTitleSection: {
    flex: 1,
    marginRight: 8,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGameLogo: {
    width: 28,
    height: 28,
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
    color: '#000',
  },
  summaryRankSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRankLabel: {
    fontSize: 9,
    color: '#666',
    letterSpacing: 0.8,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryRankValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  summaryLeaderboardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  summaryMembers: {
    fontSize: 10,
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
  bottomSpacer: {
    height: 40,
  },
});