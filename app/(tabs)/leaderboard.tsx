import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const followersData = [
  { rank: 1, name: 'ProGamer_X', totalTrophies: 95240, level: 9, games: ['Valorant', 'CS2'], rankChange: '+1' },
  { rank: 2, name: 'ShadowNinja', totalTrophies: 87650, level: 8, games: ['League', 'Valorant'], rankChange: '+2' },
  { rank: 3, name: 'QuickShot77', totalTrophies: 76320, level: 7, games: ['Apex', 'OW2'], rankChange: '0' },
  { rank: 4, name: 'You', totalTrophies: 4878, level: 5, games: ['Valorant', 'League', 'Apex'], rankChange: '+1', isCurrentUser: true },
  { rank: 5, name: 'ElitePlayer', totalTrophies: 65430, level: 6, games: ['CS2', 'Dota 2'], rankChange: '-1' },
  { rank: 6, name: 'NightHawk', totalTrophies: 58920, level: 6, games: ['Valorant', 'Apex'], rankChange: '+3' },
];

const partyData = [
  { rank: 1, name: 'X-AE-A-19', totalTrophies: 118487, level: 10, games: ['Valorant', 'League', 'CS2'], rankChange: '+2' },
  { rank: 2, name: 'Brandon Gray', totalTrophies: 99841, level: 9, games: ['Valorant', 'Apex', 'OW2'], rankChange: '0' },
  { rank: 3, name: 'Bryson White', totalTrophies: 89234, level: 8, games: ['League', 'Dota 2', 'CS2'], rankChange: '-1' },
  { rank: 4, name: 'You', totalTrophies: 4878, level: 5, games: ['Valorant', 'League', 'Apex'], rankChange: '+1', isCurrentUser: true },
  { rank: 5, name: 'ChampionAce', totalTrophies: 78487, level: 8, games: ['CS2', 'Valorant', 'R6'], rankChange: '+3' },
  { rank: 6, name: 'DiamondKing', totalTrophies: 72401, level: 7, games: ['League', 'Apex', 'OW2'], rankChange: '-2' },
  { rank: 7, name: 'LegendaryOne', totalTrophies: 68356, level: 7, games: ['Valorant', 'CS2', 'Apex'], rankChange: '0' },
  { rank: 8, name: 'MythicRank', totalTrophies: 65298, level: 6, games: ['Dota 2', 'League', 'CS2'], rankChange: '+1' },
];

const diamondPlusData = [
  { rank: 1, name: 'X-AE-A-19', totalTrophies: 118487, level: 10, games: ['Valorant', 'League', 'CS2'], rankChange: '+2' },
  { rank: 2, name: 'Brandon Gray', totalTrophies: 99841, level: 9, games: ['Valorant', 'Apex', 'OW2'], rankChange: '0' },
  { rank: 3, name: 'Bryson White', totalTrophies: 89234, level: 8, games: ['League', 'Dota 2', 'CS2'], rankChange: '-1' },
  { rank: 4, name: 'ChampionAce', totalTrophies: 78487, level: 8, games: ['CS2', 'Valorant', 'R6'], rankChange: '+3' },
  { rank: 5, name: 'DiamondKing', totalTrophies: 72401, level: 7, games: ['League', 'Apex', 'OW2'], rankChange: '-2' },
  { rank: 6, name: 'LegendaryOne', totalTrophies: 68356, level: 7, games: ['Valorant', 'CS2', 'Apex'], rankChange: '0' },
  { rank: 7, name: 'ImmortalRank', totalTrophies: 125600, level: 10, games: ['Valorant', 'CS2'], rankChange: '+5' },
  { rank: 8, name: 'RadiantKing', totalTrophies: 132450, level: 10, games: ['Valorant', 'League'], rankChange: '+4' },
];

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState('Party');

  const getLeaderboardData = () => {
    switch (activeTab) {
      case 'Followers':
        return followersData;
      case 'Party':
        return partyData;
      case 'Diamond+':
        return diamondPlusData;
      default:
        return partyData;
    }
  };

  const leaderboardData = getLeaderboardData();
  const topPlayer = leaderboardData[0]; // Get the #1 ranked player
  const remainingPlayers = leaderboardData.slice(1); // Remove #1 from the list

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#3b82f6'; // Blue
  };

  const getAvatarColors = (name: string) => {
    const colors = [
      '#ef4444', // red
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#ec4899', // pink
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Leaderboard</ThemedText>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Followers' && styles.activeTab]}
          onPress={() => setActiveTab('Followers')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'Followers' && styles.activeTabText]}>
            Followers
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Party' && styles.activeTab]}
          onPress={() => setActiveTab('Party')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'Party' && styles.activeTabText]}>
            Party
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Diamond+' && styles.activeTab]}
          onPress={() => setActiveTab('Diamond+')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'Diamond+' && styles.activeTabText]}>
            Diamond+
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Stats Section */}
        <View style={styles.userStatsSection}>
          <View style={styles.statsIcons}>
            <View style={[styles.userAvatar, { backgroundColor: getAvatarColors(topPlayer.name) }]}>
              <ThemedText style={styles.userAvatarText}>
                {topPlayer.name.substring(0, 1).toUpperCase()}
              </ThemedText>
            </View>
          </View>
          
          <ThemedText style={styles.userPoints}>
            {topPlayer.totalTrophies.toLocaleString()}pt
          </ThemedText>
          
          <View style={styles.userAchievements}>
            <ThemedText style={styles.achievementText}>{topPlayer.name}</ThemedText>
            <ThemedText style={styles.achievementSeparator}>•</ThemedText>
            <ThemedText style={styles.placeText}>⭐ 1st Place</ThemedText>
          </View>
          
          <TouchableOpacity style={styles.viewStatsButton}>
            <ThemedText style={styles.viewStatsButtonText}>📊 View Stats</ThemedText>
          </TouchableOpacity>
        </View>

        {/* All Leaderboards Header */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>All Leaderboards</ThemedText>
          <TouchableOpacity>
            <ThemedText style={styles.seeAllText}>See All</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Leaderboard List */}
        {remainingPlayers.map((player) => (
          <View
            key={player.rank}
            style={styles.playerCard}
          >
            <View style={styles.playerLeft}>
              {/* Rank Badge */}
              <View style={[styles.rankBadge, { backgroundColor: getRankBadgeColor(player.rank) }]}>
                <ThemedText style={styles.rankBadgeText}>{player.rank}</ThemedText>
              </View>

              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: getAvatarColors(player.name) }]}>
                <ThemedText style={styles.avatarText}>
                  {player.isCurrentUser ? '👤' : player.name.substring(0, 1).toUpperCase()}
                </ThemedText>
              </View>

              <View style={styles.playerInfo}>
                <ThemedText style={styles.playerName}>
                  {player.name}
                </ThemedText>
                <View style={styles.playerStats}>
                  <ThemedText style={styles.pointsSmallText}>
                    {player.totalTrophies.toLocaleString()}pts
                  </ThemedText>
                  <ThemedText style={styles.levelText}>Lvl {player.level}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.playerRight}>
              <ThemedText style={styles.trophyIcon}>🏆</ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
    color: '#000',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    justifyContent: 'center',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  userStatsSection: {
    backgroundColor: 'transparent',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  statsIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2c3e50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconText: {
    fontSize: 24,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 40,
  },
  userPoints: {
    fontSize: 40,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: -1,
    paddingVertical: 15,
  },
  userAchievements: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  achievementText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  achievementSeparator: {
    fontSize: 14,
    color: '#666',
  },
  placeText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
  },
  viewStatsButton: {
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  viewStatsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: '#000',
    marginBottom: 2,
  },
  playerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsSmallText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  levelText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  playerRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyIcon: {
    fontSize: 24,
  },
});