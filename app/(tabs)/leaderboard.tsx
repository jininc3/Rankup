import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// User's rank summary data
const userRankSummary = [
  { leaderboardName: 'Squad Goals', rank: 4, totalMembers: 12, game: 'Valorant' },
  { leaderboardName: 'Diamond Grinders', rank: 7, totalMembers: 20, game: 'League of Legends' },
  { leaderboardName: 'Weekend Warriors', rank: 2, totalMembers: 8, game: 'Apex Legends' },
];

// List of all available leaderboards with player data
const leaderboardsList = [
  {
    id: 1,
    name: 'Squad Goals',
    game: 'Valorant',
    members: 12,
    description: 'Competitive squad pushing for Immortal',
    icon: '🎯',
    userRank: 4,
    isJoined: true,
    players: [
      { rank: 1, name: 'ProGamer_X', points: 2450, avatar: '🎯' },
      { rank: 2, name: 'ShadowNinja', points: 2340, avatar: '⚔️' },
      { rank: 3, name: 'QuickShot77', points: 2190, avatar: '🎮' },
      { rank: 4, name: 'your_username', points: 2050, avatar: '👤', isCurrentUser: true },
      { rank: 5, name: 'ElitePlayer', points: 1980, avatar: '🔥' },
      { rank: 6, name: 'NightHawk', points: 1890, avatar: '🦅' },
      { rank: 7, name: 'DiamondKing', points: 1820, avatar: '💎' },
      { rank: 8, name: 'LegendaryOne', points: 1750, avatar: '⭐' },
      { rank: 9, name: 'StarPlayer', points: 1680, avatar: '🌟' },
      { rank: 10, name: 'TopGun', points: 1590, avatar: '✈️' },
      { rank: 11, name: 'ChampionAce', points: 1520, avatar: '🏆' },
      { rank: 12, name: 'SkillMaster', points: 1450, avatar: '⚡' },
    ],
  },
  {
    id: 2,
    name: 'Diamond Grinders',
    game: 'League of Legends',
    members: 20,
    description: 'Diamond+ players grinding ranked',
    icon: '💎',
    userRank: 7,
    isJoined: true,
    players: [
      { rank: 1, name: 'X-AE-A-19', points: 3280, avatar: '👑' },
      { rank: 2, name: 'Brandon Gray', points: 3190, avatar: '🎮' },
      { rank: 3, name: 'Bryson White', points: 3050, avatar: '⚔️' },
      { rank: 4, name: 'ChampionAce', points: 2940, avatar: '🏆' },
      { rank: 5, name: 'DiamondKing', points: 2850, avatar: '💎' },
      { rank: 6, name: 'LegendaryOne', points: 2760, avatar: '⭐' },
      { rank: 7, name: 'your_username', points: 2680, avatar: '👤', isCurrentUser: true },
      { rank: 8, name: 'MythicRank', points: 2590, avatar: '🌟' },
      { rank: 9, name: 'EliteGamer', points: 2480, avatar: '🔥' },
      { rank: 10, name: 'ProPlayer', points: 2390, avatar: '🎯' },
      { rank: 11, name: 'MasterRank', points: 2280, avatar: '⚡' },
      { rank: 12, name: 'TopTier', points: 2170, avatar: '✨' },
      { rank: 13, name: 'HighRoller', points: 2060, avatar: '🎲' },
      { rank: 14, name: 'VictoryKing', points: 1950, avatar: '👑' },
      { rank: 15, name: 'SkillLord', points: 1840, avatar: '⚔️' },
      { rank: 16, name: 'RankMaster', points: 1730, avatar: '🏅' },
      { rank: 17, name: 'GameChanger', points: 1620, avatar: '🎮' },
      { rank: 18, name: 'PowerPlayer', points: 1510, avatar: '💪' },
      { rank: 19, name: 'WinStreak', points: 1400, avatar: '🔥' },
      { rank: 20, name: 'ClutchKing', points: 1290, avatar: '👊' },
    ],
  },
  {
    id: 3,
    name: 'Weekend Warriors',
    game: 'Apex Legends',
    members: 8,
    description: 'Casual weekend gaming crew',
    icon: '🎮',
    userRank: 2,
    isJoined: true,
    players: [
      { rank: 1, name: 'CasualPro', points: 1890, avatar: '🎯' },
      { rank: 2, name: 'your_username', points: 1820, avatar: '👤', isCurrentUser: true },
      { rank: 3, name: 'WeekendKing', points: 1750, avatar: '👑' },
      { rank: 4, name: 'ChillGamer', points: 1680, avatar: '😎' },
      { rank: 5, name: 'FunPlayer', points: 1590, avatar: '🎮' },
      { rank: 6, name: 'RelaxedAce', points: 1520, avatar: '🌟' },
      { rank: 7, name: 'SundayBest', points: 1450, avatar: '⭐' },
      { rank: 8, name: 'EasyGoing', points: 1380, avatar: '🔥' },
    ],
  },
  {
    id: 4,
    name: 'Pro Circuit',
    game: 'Valorant',
    members: 50,
    description: 'Top tier competitive players',
    icon: '👑',
    userRank: null,
    isJoined: false,
    players: [
      { rank: 1, name: 'RadiantKing', points: 5200, avatar: '👑' },
      { rank: 2, name: 'ImmortalAce', points: 5100, avatar: '⚔️' },
      { rank: 3, name: 'ProLegende', points: 5000, avatar: '🏆' },
      { rank: 4, name: 'EliteSniper', points: 4900, avatar: '🎯' },
      { rank: 5, name: 'TopFragger', points: 4800, avatar: '🔥' },
    ],
  },
  {
    id: 5,
    name: 'CS2 Legends',
    game: 'CS2',
    members: 35,
    description: 'Counter-Strike veterans',
    icon: '⚔️',
    userRank: null,
    isJoined: false,
    players: [],
  },
  {
    id: 6,
    name: 'Overwatch Heroes',
    game: 'Overwatch 2',
    members: 18,
    description: 'Coordinated team players',
    icon: '🦸',
    userRank: null,
    isJoined: false,
    players: [],
  },
];

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
                <View
                  style={[
                    styles.summaryRankBadge,
                    { backgroundColor: item.rank <= 3 ? getRankColor(item.rank) : '#666' },
                  ]}
                >
                  <ThemedText style={styles.summaryRankText}>#{item.rank}</ThemedText>
                </View>
                <ThemedText style={styles.summaryLeaderboardName}>
                  {item.leaderboardName}
                </ThemedText>
                <ThemedText style={styles.summaryMembers}>
                  {item.totalMembers} members
                </ThemedText>
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
              <View style={styles.leaderboardIcon}>
                <ThemedText style={styles.leaderboardIconText}>{leaderboard.icon}</ThemedText>
              </View>

              <View style={styles.leaderboardInfo}>
                <View style={styles.leaderboardHeader}>
                  <ThemedText style={styles.leaderboardName}>{leaderboard.name}</ThemedText>
                  {leaderboard.isJoined && (
                    <View style={styles.joinedBadge}>
                      <ThemedText style={styles.joinedBadgeText}>Joined</ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={styles.leaderboardDescription}>
                  {leaderboard.description}
                </ThemedText>
                <View style={styles.leaderboardMeta}>
                  <View style={styles.metaItem}>
                    <IconSymbol size={14} name="gamecontroller.fill" color="#666" />
                    <ThemedText style={styles.metaText}>{leaderboard.game}</ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <IconSymbol size={14} name="person.2.fill" color="#666" />
                    <ThemedText style={styles.metaText}>{leaderboard.members} members</ThemedText>
                  </View>
                  {leaderboard.userRank && (
                    <View style={styles.metaItem}>
                      <ThemedText style={styles.userRankText}>
                        Your rank: #{leaderboard.userRank}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>

              <IconSymbol size={20} name="chevron.right" color="#666" />
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    minWidth: 120,
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
  summaryLeaderboardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.2,
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 12,
    gap: 12,
  },
  leaderboardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardIconText: {
    fontSize: 24,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.3,
  },
  joinedBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  joinedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leaderboardDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  leaderboardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '400',
  },
  userRankText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});