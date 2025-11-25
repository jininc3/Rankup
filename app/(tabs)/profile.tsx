import RankCard from '@/app/components/rankCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useRef } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';

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

const { width: screenWidth } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 16;
const CARD_WIDTH = screenWidth - (CARD_PADDING * 2);

export default function ProfileScreen() {
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const selectedGame = userGames[selectedGameIndex];
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index !== selectedGameIndex && index >= 0 && index < userGames.length) {
      setSelectedGameIndex(index);
    }
  };

  const handleScrollDrag = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index !== selectedGameIndex && index >= 0 && index < userGames.length) {
      setSelectedGameIndex(index);
    }
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
    setSelectedGameIndex(index);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with notification bell and settings */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowNotifications(true)}
          >
            <IconSymbol size={24} name="bell.fill" color="#000" />
            {recentActivity.length > 0 && (
              <View style={styles.notificationBadge}>
                <ThemedText style={styles.notificationBadgeText}>{recentActivity.length}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <IconSymbol size={24} name="gearshape.fill" color="#000" />
          </TouchableOpacity>
        </View>
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
        {/* Enhanced Profile Header */}
        <View style={styles.profileHeaderWrapper}>
          <View style={styles.profileHeader}>
            {/* Avatar and Username Section */}
            <View style={styles.profileMainSection}>
              <View style={styles.avatarCircle}>
                <ThemedText style={styles.avatarInitial}>Y</ThemedText>
              </View>
              <View style={styles.userInfo}>
                <ThemedText style={styles.username}>your_username</ThemedText>
                <ThemedText style={styles.bio}>Competitive gamer • Diamond player</ThemedText>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <ThemedText style={styles.statValue}>3</ThemedText>
                <ThemedText style={styles.statLabel}>Games</ThemedText>
              </View>
              <View style={styles.statCard}>
                <ThemedText style={styles.statValue}>156</ThemedText>
                <ThemedText style={styles.statLabel}>Followers</ThemedText>
              </View>
              <View style={styles.statCard}>
                <ThemedText style={styles.statValue}>89</ThemedText>
                <ThemedText style={styles.statLabel}>Following</ThemedText>
              </View>
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity style={styles.editProfileButton}>
              <ThemedText style={styles.editProfileText}>Edit Profile</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          {/* Minimal Game Tabs */}
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
                onPress={() => scrollToIndex(index)}
              >
                <ThemedText style={[
                  styles.gameTabText,
                  selectedGameIndex === index && styles.gameTabTextActive
                ]}>
                  {game.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Scrollable Rank Cards */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScrollDrag}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.cardsContainer}
          >
            {userGames.map((game, index) => (
              <View
                key={game.id}
                style={[
                  styles.cardWrapper,
                  {
                    width: CARD_WIDTH,
                    marginRight: index < userGames.length - 1 ? CARD_GAP : 0
                  }
                ]}
              >
                <RankCard game={game} username="your_username" />
              </View>
            ))}
          </ScrollView>
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.3,
  },
  modalScrollView: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  profileHeaderWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  profileHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  profileMainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 0,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  bio: {
    fontSize: 12,
    color: '#666',
    letterSpacing: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 1,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    color: '#666',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  editProfileButton: {
    width: '100%',
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#000',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTabs: {
    marginBottom: 20,
  },
  gameTabsContent: {
    gap: 10,
    paddingBottom: 4,
  },
  gameTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  gameTabActive: {
    borderBottomColor: '#000',
  },
  gameTabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  gameTabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  cardsContainer: {
    paddingBottom: 4,
  },
  cardWrapper: {
    paddingHorizontal: 0,
  },
  activityCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  activityHeader: {
    marginBottom: 14,
  },
  activityLeft: {
    flexDirection: 'row',
    gap: 14,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },
  rankUpIcon: {
    backgroundColor: '#0a0a0a',
  },
  trophyIcon: {
    backgroundColor: '#0a0a0a',
  },
  achievementIcon: {
    backgroundColor: '#0a0a0a',
  },
  activityInfo: {
    flex: 1,
  },
  activityGame: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 6,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  activityFooter: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  commentButton: {
    padding: 4,
  },
});