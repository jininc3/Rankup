import RankCard from '@/app/components/rankCard';
import { currentUser } from '@/app/data/userData';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

const userGames = [
  {
    id: 1,
    name: 'Valorant',
    rank: currentUser.gamesPlayed.valorant.currentRank,
    trophies: 1245,
    icon: '🎯',
    wins: Math.floor(currentUser.gamesPlayed.valorant.gamesPlayed * (currentUser.gamesPlayed.valorant.winRate / 100)),
    losses: currentUser.gamesPlayed.valorant.gamesPlayed - Math.floor(currentUser.gamesPlayed.valorant.gamesPlayed * (currentUser.gamesPlayed.valorant.winRate / 100)),
    winRate: currentUser.gamesPlayed.valorant.winRate,
    recentMatches: ['+25', '+18', '-12', '+22', '+19'],
  },
  {
    id: 2,
    name: 'League of Legends',
    rank: currentUser.gamesPlayed.league.currentRank,
    trophies: 876,
    icon: '⚔️',
    wins: Math.floor(currentUser.gamesPlayed.league.gamesPlayed * (currentUser.gamesPlayed.league.winRate / 100)),
    losses: currentUser.gamesPlayed.league.gamesPlayed - Math.floor(currentUser.gamesPlayed.league.gamesPlayed * (currentUser.gamesPlayed.league.winRate / 100)),
    winRate: currentUser.gamesPlayed.league.winRate,
    recentMatches: ['+15', '-18', '+20', '+17', '-14'],
  },
  {
    id: 3,
    name: 'Apex Legends',
    rank: currentUser.gamesPlayed.apex.currentRank,
    trophies: 422,
    icon: '🎮',
    wins: Math.floor(currentUser.gamesPlayed.apex.gamesPlayed * (currentUser.gamesPlayed.apex.winRate / 100)),
    losses: currentUser.gamesPlayed.apex.gamesPlayed - Math.floor(currentUser.gamesPlayed.apex.gamesPlayed * (currentUser.gamesPlayed.apex.winRate / 100)),
    winRate: currentUser.gamesPlayed.apex.winRate,
    recentMatches: ['+28', '+22', '-16', '-19', '+25'],
  },
];

const recentActivity = [
  {
    id: 1,
    type: 'rank_up',
    game: 'Valorant',
    message: `Ranked up to ${currentUser.gamesPlayed.valorant.currentRank}`,
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
    message: `Promoted to ${currentUser.gamesPlayed.apex.currentRank}`,
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
  const router = useRouter();
  const { user } = useAuth();
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'games' | 'posts'>('games');
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
        <View style={styles.headerSpacer} />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/profilePages/settings')}
          >
            <IconSymbol size={28} name="gearshape.fill" color="#fff" />
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
        {/* Cover Photo */}
        <View style={styles.coverPhotoContainer}>
          <View style={styles.coverPhoto}>
            {user?.coverPhoto ? (
              <Image source={{ uri: user.coverPhoto }} style={styles.coverPhotoImage} />
            ) : null}
          </View>
        </View>

        {/* Social Icons - positioned on the right below cover */}
        {(user?.discordLink || user?.instagramLink) && (
          <View style={styles.socialIconsContainer}>
            {user?.discordLink && (
              <TouchableOpacity style={styles.socialIconButton}>
                <Image
                  source={require('@/assets/images/discord.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
            {user?.instagramLink && (
              <TouchableOpacity style={styles.socialIconButton}>
                <Image
                  source={require('@/assets/images/instagram.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Profile Content */}
        <View style={styles.profileContentWrapper}>
          {/* Avatar on the left, overlapping cover */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              {user?.avatar && user.avatar.startsWith('http') ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <ThemedText style={styles.avatarInitial}>
                  {user?.avatar || user?.username?.[0]?.toUpperCase() || 'U'}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            {/* Username */}
            <ThemedText style={styles.username}>{user?.username || 'User'}</ThemedText>

            {/* Stats in One Line */}
            <View style={styles.statsRow}>
              <ThemedText style={styles.statText}>0 Clips</ThemedText>
              <ThemedText style={styles.statDividerText}> | </ThemedText>
              <ThemedText style={styles.statText}>0 Followers</ThemedText>
              <ThemedText style={styles.statDividerText}> | </ThemedText>
              <ThemedText style={styles.statText}>0 Following</ThemedText>
            </View>

            {/* Bio */}
            {user?.bio && (
              <View style={styles.bioContainer}>
                <ThemedText style={styles.bioText}>{user.bio}</ThemedText>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => router.push('/profilePages/editProfile')}
              >
                <ThemedText style={styles.editProfileText}>Edit Profile</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareProfileButton}>
                <IconSymbol size={20} name="square.and.arrow.up" color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Tabs: Games and Posts */}
        <View style={styles.mainTabsContainer}>
          <TouchableOpacity
            style={[styles.mainTab, activeMainTab === 'games' && styles.mainTabActive]}
            onPress={() => setActiveMainTab('games')}
          >
            <ThemedText style={[styles.mainTabText, activeMainTab === 'games' && styles.mainTabTextActive]}>
              Games
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, activeMainTab === 'posts' && styles.mainTabActive]}
            onPress={() => setActiveMainTab('posts')}
          >
            <ThemedText style={[styles.mainTabText, activeMainTab === 'posts' && styles.mainTabTextActive]}>
              Posts
            </ThemedText>
          </TouchableOpacity>
        </View>

        {activeMainTab === 'games' && (
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
                <RankCard game={game} username={user?.username || 'User'} />
              </View>
            ))}
          </ScrollView>
        </View>
        )}

        {/* Posts Tab Content */}
        {activeMainTab === 'posts' && (
          <View style={styles.section}>
            <View style={styles.postsContainer}>
              <IconSymbol size={48} name="square.stack.3d.up" color="#ccc" />
              <ThemedText style={styles.emptyStateText}>No posts yet</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>Share your gaming achievements with the community</ThemedText>
            </View>
          </View>
        )}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerSpacer: {
    width: 32,
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
  coverPhotoContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#f5f5f5',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#667eea',
  },
  coverPhotoImage: {
    width: '100%',
    height: '100%',
  },
  profileContentWrapper: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 24,
  },
  avatarContainer: {
    marginTop: -40,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarInitial: {
    fontSize: 40,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  profileInfo: {
    width: '100%',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  statDividerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '400',
  },
  bioContainer: {
    marginBottom: 20,
  },
  bioText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '400',
  },
  socialIconsContainer: {
    position: 'absolute',
    top: 240,
    right: 10,
    flexDirection: 'row',
    gap: 4,
    zIndex: 5,
  },
  socialIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  socialIcon: {
    width: 28,
    height: 28,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  editProfileButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  shareProfileButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  shareProfileText: {
    fontSize: 14,
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
  mainTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingHorizontal: 20,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabActive: {
    borderBottomColor: '#000',
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
    letterSpacing: -0.2,
  },
  mainTabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  postsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});