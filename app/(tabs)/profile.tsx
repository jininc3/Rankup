import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import RankCard from '@/app/components/rankCard';
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Modal } from 'react-native';

const userGames = [
  {
    id: 1,
    name: 'Valorant',
    rank: 'Diamond 2',
    trophies: 1245,
    icon: '🎯',
    wins: 234,
    losses: 189,
    winRate: 55,
    recentMatches: ['+25', '+18', '-12', '+22', '+19'],
  },
  {
    id: 2,
    name: 'League of Legends',
    rank: 'Platinum 1',
    trophies: 876,
    icon: '⚔️',
    wins: 189,
    losses: 165,
    winRate: 53,
    recentMatches: ['+15', '-18', '+20', '+17', '-14'],
  },
  {
    id: 3,
    name: 'Apex Legends',
    rank: 'Diamond 3',
    trophies: 422,
    icon: '🎮',
    wins: 156,
    losses: 144,
    winRate: 52,
    recentMatches: ['+28', '+22', '-16', '-19', '+25'],
  },
];

const recentActivity = [
  {
    id: 1,
    type: 'rank_up',
    game: 'Valorant',
    message: 'Ranked up to Diamond 2',
    time: '2 hours ago',
    likes: 24,
  },
  {
    id: 2,
    type: 'trophy',
    game: 'League of Legends',
    message: 'Earned 50 trophies',
    time: '5 hours ago',
    likes: 12,
  },
  {
    id: 3,
    type: 'rank_up',
    game: 'Apex Legends',
    message: 'Promoted to Diamond 3',
    time: '1 day ago',
    likes: 31,
  },
  {
    id: 4,
    type: 'achievement',
    game: 'Valorant',
    message: 'Won 10 matches in a row',
    time: '2 days ago',
    likes: 45,
  },
];

export default function ProfileScreen() {
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const selectedGame = userGames[selectedGameIndex];

  return (
    <ThemedView style={styles.container}>
      {/* Header with notification bell */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => setShowNotifications(true)}
        >
          <IconSymbol size={24} name="bell.fill" color="#000" />
          {recentActivity.length > 0 && (
            <View style={styles.notificationBadge}>
              <ThemedText style={styles.notificationBadgeText}>{recentActivity.length}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Recent Activity</ThemedText>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <IconSymbol size={24} name="xmark" color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {recentActivity.map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityLeft}>
                      <View style={[styles.activityIcon,
                        activity.type === 'rank_up' ? styles.rankUpIcon :
                        activity.type === 'trophy' ? styles.trophyIcon :
                        styles.achievementIcon
                      ]}>
                        <IconSymbol
                          size={16}
                          name={
                            activity.type === 'rank_up' ? 'arrow.up' :
                            activity.type === 'trophy' ? 'trophy.fill' :
                            'star.fill'
                          }
                          color="#fff"
                        />
                      </View>
                      <View style={styles.activityInfo}>
                        <ThemedText style={styles.activityGame}>{activity.game}</ThemedText>
                        <ThemedText style={styles.activityMessage}>{activity.message}</ThemedText>
                        <ThemedText style={styles.activityTime}>{activity.time}</ThemedText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.activityFooter}>
                    <TouchableOpacity style={styles.likeButton}>
                      <IconSymbol size={16} name="heart" color="#ef4444" />
                      <ThemedText style={styles.likeCount}>{activity.likes}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commentButton}>
                      <IconSymbol size={16} name="bubble.left" color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          {/* Top Row: Avatar and Stats */}
          <View style={styles.topRow}>
            <View style={styles.avatarContainer}>
              <IconSymbol size={80} name="person.circle.fill" color="#3b82f6" />
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>2.5K</ThemedText>
                <ThemedText style={styles.statLabel}>Trophies</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>156</ThemedText>
                <ThemedText style={styles.statLabel}>Followers</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>89</ThemedText>
                <ThemedText style={styles.statLabel}>Following</ThemedText>
              </View>
            </View>
          </View>

          {/* Username and Bio */}
          <ThemedText style={styles.username}>your_username</ThemedText>
          <ThemedText style={styles.bio}>Competitive gamer 🎮 | Diamond player</ThemedText>

          {/* Edit Profile Button */}
          <TouchableOpacity style={styles.editProfileButton}>
            <ThemedText style={styles.editProfileText}>Edit Profile</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>My Games</ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.addButton}>+ Add Game</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Game Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gameTabs}
            contentContainerStyle={styles.gameTabsContent}
          >
            {userGames.map((game, index) => (
              <TouchableOpacity
                key={game.id}
                style={[styles.gameTab, selectedGameIndex === index && styles.gameTabActive]}
                onPress={() => setSelectedGameIndex(index)}
              >
                <ThemedText style={styles.gameTabIcon}>{game.icon}</ThemedText>
                <ThemedText style={[
                  styles.gameTabText,
                  selectedGameIndex === index && styles.gameTabTextActive
                ]}>
                  {game.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Credit Card Style Rank Card */}
          <RankCard game={selectedGame} username="your_username" />
        </View>

        <TouchableOpacity style={styles.settingsButton}>
          <IconSymbol size={20} name="gearshape.fill" color="#666" />
          <ThemedText style={styles.settingsText}>Settings</ThemedText>
        </TouchableOpacity>
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
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalScrollView: {
    paddingHorizontal: 20,
  },
  profileHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 24,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 13,
    color: '#000',
    marginTop: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#000',
    marginBottom: 16,
    lineHeight: 18,
  },
  editProfileButton: {
    backgroundColor: '#efefef',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  addButton: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  gameTabs: {
    marginBottom: 16,
  },
  gameTabsContent: {
    gap: 10,
  },
  gameTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  gameTabActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  gameTabIcon: {
    fontSize: 22,
  },
  gameTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  gameTabTextActive: {
    color: '#000',
  },
  activityCard: {
    backgroundColor: '#f8f9fa',
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityHeader: {
    marginBottom: 14,
  },
  activityLeft: {
    flexDirection: 'row',
    gap: 14,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rankUpIcon: {
    backgroundColor: '#22c55e',
  },
  trophyIcon: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  achievementIcon: {
    backgroundColor: '#a855f7',
    shadowColor: '#a855f7',
  },
  activityInfo: {
    flex: 1,
  },
  activityGame: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityMessage: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 13,
    color: '#999',
  },
  activityFooter: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  commentButton: {
    padding: 4,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginVertical: 24,
    padding: 18,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});