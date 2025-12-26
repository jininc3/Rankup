import rankCard from '@/app/components/rankCard';

// Alias for JSX usage (React components must start with uppercase)
const RankCard = rankCard;
import { currentUser } from '@/app/data/userData';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp, doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { followUser, unfollowUser, isFollowing as checkIsFollowing, getUserRecentPosts } from '@/services/followService';
import { createOrGetChat } from '@/services/chatService';
import PostViewerModal from '@/app/components/postViewerModal';

interface ViewedUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  discordLink?: string;
  instagramLink?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
}

const userGames = [
  {
    id: 2,
    name: 'League of Legends',
    rank: currentUser.gamesPlayed.league.currentRank,
    trophies: 876,
    icon: '⚔️',
    image: require('@/assets/images/leagueoflegends.png'),
    wins: Math.floor(currentUser.gamesPlayed.league.gamesPlayed * (currentUser.gamesPlayed.league.winRate / 100)),
    losses: currentUser.gamesPlayed.league.gamesPlayed - Math.floor(currentUser.gamesPlayed.league.gamesPlayed * (currentUser.gamesPlayed.league.winRate / 100)),
    winRate: currentUser.gamesPlayed.league.winRate,
    recentMatches: ['+15', '-18', '+20', '+17', '-14'],
    profileIconId: 1297, // Placeholder - should be fetched from viewed user's Riot account
  },
];

const { width: screenWidth } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 16;
const CARD_WIDTH = screenWidth - (CARD_PADDING * 2);

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
  taggedPeople?: string[];
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
}

export default function ProfileViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser, refreshUser, setNewlyFollowedUserPosts, setNewlyUnfollowedUserId } = useAuth();
  const [viewedUser, setViewedUser] = useState<ViewedUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState<'rankCards' | 'clips'>('clips'); // Default to clips tab
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const selectedGame = userGames[selectedGameIndex];
  const scrollViewRef = useRef<ScrollView>(null);

  // Get userId from params - this is required for profileView
  const userId = params.userId as string;

  // Get optional preloaded data from params for instant display
  const preloadedUsername = params.username as string | undefined;
  const preloadedAvatar = params.avatar as string | undefined;

  // Redirect to own profile if trying to view yourself
  useEffect(() => {
    if (userId && currentUser?.id && userId === currentUser.id) {
      router.replace('/(tabs)/profile');
    }
  }, [userId, currentUser?.id]);

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

  // Parallel data fetching - fetch all data at once for faster load
  const fetchAllData = async () => {
    if (!userId || !currentUser?.id) return;

    try {
      // Fetch user profile, posts, and follow status in parallel
      const [userDoc, postsSnapshot, followStatus] = await Promise.all([
        getDoc(doc(db, 'users', userId)),
        getDocs(query(
          collection(db, 'posts'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        )),
        checkIsFollowing(currentUser.id, userId)
      ]);

      // Update user profile
      if (userDoc.exists()) {
        const data = userDoc.data();
        setViewedUser({
          id: userDoc.id,
          username: data.username,
          email: data.email,
          avatar: data.avatar,
          coverPhoto: data.coverPhoto,
          bio: data.bio,
          discordLink: data.discordLink,
          instagramLink: data.instagramLink,
          postsCount: data.postsCount || 0,
          followersCount: data.followersCount || 0,
          followingCount: data.followingCount || 0,
        });
        setLoadingUser(false);
      }

      // Update posts
      const fetchedPosts: Post[] = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));
      setPosts(fetchedPosts);
      setLoadingPosts(false);

      // Update follow status
      setIsFollowing(followStatus);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setLoadingUser(false);
      setLoadingPosts(false);
    }
  };

  // Fetch posts only (for refresh)
  const fetchPosts = async () => {
    if (!userId) return;

    setLoadingPosts(true);
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(postsQuery);
      const fetchedPosts: Post[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));

      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Set preloaded data immediately for instant display
  useEffect(() => {
    if (preloadedUsername || preloadedAvatar) {
      setViewedUser({
        id: userId,
        username: preloadedUsername || 'User',
        email: '',
        avatar: preloadedAvatar,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
      });
      setLoadingUser(false); // Show immediately, will update when real data arrives
    }
  }, [userId, preloadedUsername, preloadedAvatar]);

  // Fetch all data when component mounts (only once)
  useEffect(() => {
    if (userId && currentUser?.id) {
      fetchAllData();
    }
  }, [userId, currentUser?.id]);

  const handlePostPress = (post: Post, index: number) => {
    setSelectedPost(post);
    setSelectedPostIndex(index);
    setShowPostViewer(true);
  };

  const closePostViewer = () => {
    setShowPostViewer(false);
    setSelectedPost(null);
  };

  // Follow/Unfollow handler
  const handleFollowToggle = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to follow users');
      return;
    }

    if (!userId || !viewedUser) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        await unfollowUser(currentUser.id, userId);

        setIsFollowing(false);

        // Update local viewed user state
        setViewedUser({
          ...viewedUser,
          followersCount: (viewedUser.followersCount || 0) - 1,
        });

        // Signal to remove this user's posts from feed
        setNewlyUnfollowedUserId(userId);
      } else {
        // Follow
        await followUser(
          currentUser.id,
          currentUser.username || currentUser.email?.split('@')[0] || 'User',
          currentUser.avatar,
          userId,
          viewedUser.username,
          viewedUser.avatar
        );

        setIsFollowing(true);

        // Update local viewed user state
        setViewedUser({
          ...viewedUser,
          followersCount: (viewedUser.followersCount || 0) + 1,
        });

        // Fetch newly followed user's recent posts and store in context
        try {
          const recentPosts = await getUserRecentPosts(userId);
          setNewlyFollowedUserPosts(recentPosts, userId);
        } catch (error) {
          console.error('Error fetching newly followed user posts:', error);
          // Don't block the follow operation if fetching posts fails
        }
      }

      // Refresh current user data
      await refreshUser();
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle message button
  const handleMessage = async () => {
    if (!currentUser?.id || !viewedUser) {
      Alert.alert('Error', 'Unable to start chat');
      return;
    }

    try {
      const chatId = await createOrGetChat(
        currentUser.id,
        currentUser.username || currentUser.email?.split('@')[0] || 'User',
        currentUser.avatar,
        viewedUser.id,
        viewedUser.username,
        viewedUser.avatar
      );

      router.push({
        pathname: '/chatPages/chatScreen',
        params: {
          chatId,
          otherUserId: viewedUser.id,
          otherUsername: viewedUser.username,
          otherUserAvatar: viewedUser.avatar || '',
        },
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        <View style={styles.coverPhotoContainer}>
          <View style={styles.coverPhoto}>
            {viewedUser?.coverPhoto ? (
              <Image source={{ uri: viewedUser.coverPhoto }} style={styles.coverPhotoImage} />
            ) : null}
          </View>
        </View>

        {/* Profile Content */}
        <View style={styles.profileContentWrapper}>
          {/* Top Row: Avatar and Username/Stats */}
          <View style={styles.profileTopRow}>
            {/* Avatar on the left, overlapping cover */}
            <View style={styles.avatarContainer}>
              {loadingUser && !viewedUser ? (
                <View style={[styles.avatarCircle, styles.skeletonAvatar]} />
              ) : (
                <View style={styles.avatarCircle}>
                  {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                    <Image source={{ uri: viewedUser.avatar }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarInitial}>
                      {viewedUser?.avatar || viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
              )}
            </View>

            {/* Username and Stats on the right */}
            <View style={styles.profileInfoRight}>
              {/* Username */}
              {loadingUser && !viewedUser ? (
                <View style={[styles.skeletonText, { width: 120, height: 24, marginBottom: 12 }]} />
              ) : (
                <ThemedText style={styles.username}>{viewedUser?.username || 'User'}</ThemedText>
              )}

              {/* Stats in One Line */}
              {loadingUser && !viewedUser ? (
                <View style={[styles.skeletonText, { width: 200, height: 16 }]} />
              ) : (
                <View style={styles.statsRow}>
                  <ThemedText style={styles.statText}>{viewedUser?.postsCount || 0} Posts</ThemedText>
                  <ThemedText style={styles.statDividerText}> | </ThemedText>
                  <ThemedText style={styles.statText}>{viewedUser?.followersCount || 0} Followers</ThemedText>
                  <ThemedText style={styles.statDividerText}> | </ThemedText>
                  <ThemedText style={styles.statText}>{viewedUser?.followingCount || 0} Following</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Bio */}
          {viewedUser?.bio && (
            <View style={styles.bioContainer}>
              <ThemedText style={styles.bioText}>{viewedUser.bio}</ThemedText>
            </View>
          )}

          {/* Socials below bio */}
          {(viewedUser?.discordLink || viewedUser?.instagramLink) && (
            <View style={styles.socialsIconsRow}>
              <TouchableOpacity
                style={styles.socialLinkButton}
                onPress={async () => {
                  // Open Instagram link
                  if (viewedUser?.instagramLink) {
                    try {
                      const username = viewedUser.instagramLink.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
                      const appUrl = `instagram://user?username=${username}`;
                      const webUrl = `https://instagram.com/${username}`;

                      const supported = await Linking.canOpenURL(appUrl);
                      if (supported) {
                        await Linking.openURL(appUrl);
                      } else {
                        await Linking.openURL(webUrl);
                      }
                    } catch (error) {
                      console.error('Error opening Instagram:', error);
                      Alert.alert('Error', 'Failed to open Instagram');
                    }
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.instagramGradient, !viewedUser?.instagramLink && styles.socialNotConfigured]}>
                  <Image
                    source={require('@/assets/images/instagram.png')}
                    style={[styles.socialLinkIcon, !viewedUser?.instagramLink && styles.socialIconNotConfigured]}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialLinkButton}
                onPress={async () => {
                  // Copy Discord username to clipboard
                  if (viewedUser?.discordLink) {
                    try {
                      await Clipboard.setStringAsync(viewedUser.discordLink);
                      Alert.alert(
                        'Copied!',
                        `Discord username "${viewedUser.discordLink}" copied to clipboard`,
                        [{ text: 'OK' }]
                      );
                    } catch (error) {
                      console.error('Error copying to clipboard:', error);
                      Alert.alert('Error', 'Failed to copy Discord username');
                    }
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.discordBackground, !viewedUser?.discordLink && styles.socialNotConfigured]}>
                  <Image
                    source={require('@/assets/images/discord.png')}
                    style={[styles.socialLinkIcon, !viewedUser?.discordLink && styles.socialIconNotConfigured]}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.unfollowButton]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              <ThemedText style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
                {followLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
              <IconSymbol size={18} name="bubble.left.fill" color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Tabs: Clips and RankCards */}
        <View style={styles.mainTabsContainer}>
          <TouchableOpacity
            style={styles.mainTab}
            onPress={() => setActiveMainTab('clips')}
          >
            <ThemedText style={[styles.mainTabText, activeMainTab === 'clips' && styles.mainTabTextActive]}>
              Clips
            </ThemedText>
            {activeMainTab === 'clips' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mainTab}
            onPress={() => setActiveMainTab('rankCards')}
          >
            <ThemedText style={[styles.mainTabText, activeMainTab === 'rankCards' && styles.mainTabTextActive]}>
              RankCards
            </ThemedText>
            {activeMainTab === 'rankCards' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        <View style={[styles.postsSection, { display: activeMainTab === 'clips' ? 'flex' : 'none' }]}>
          {loadingPosts ? (
            <View style={styles.postsContainer}>
              <ActivityIndicator size="large" color="#000" />
              <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
            </View>
          ) : posts.length > 0 ? (
            <View style={styles.postsGrid}>
              {posts.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() => handlePostPress(post, index)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: post.mediaType === 'video' && post.thumbnailUrl ? post.thumbnailUrl : post.mediaUrl }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                  {post.mediaType === 'video' && (
                    <View style={styles.videoIndicator}>
                      <IconSymbol size={24} name="play.fill" color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.postsContainer}>
              <IconSymbol size={48} name="square.stack.3d.up" color="#ccc" />
              <ThemedText style={styles.emptyStateText}>No posts yet</ThemedText>
            </View>
          )}
        </View>

        {/* RankCards Tab Content */}
        <View style={[styles.section, { display: activeMainTab === 'rankCards' ? 'flex' : 'none' }]}>
          {/* Game Icon Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gameIconScroller}
            contentContainerStyle={styles.gameIconScrollerContent}
          >
            {userGames.map((game, index) => (
              <TouchableOpacity
                key={game.id}
                style={styles.gameIconContainer}
                onPress={() => scrollToIndex(index)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.gameIconCircle,
                  selectedGameIndex === index && styles.gameIconCircleActive
                ]}>
                  <Image
                    source={game.image}
                    style={styles.gameIconImage}
                    resizeMode="contain"
                  />
                </View>
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
                <RankCard game={game} username={viewedUser?.username || 'User'} />
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Post Viewer Modal */}
      <PostViewerModal
        visible={showPostViewer}
        post={selectedPost}
        posts={posts}
        currentIndex={selectedPostIndex}
        userAvatar={viewedUser?.avatar}
        onClose={closePostViewer}
        onCommentAdded={fetchPosts}
      />
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSpacer: {
    width: 32,
  },
  coverPhotoContainer: {
    width: '100%',
    height: 180,
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
    paddingBottom: 8,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  avatarContainer: {
    marginTop: -40,
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
  profileInfoRight: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 8,
    paddingRight: 4,
    alignItems: 'flex-start',
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
    marginBottom: 4,
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
    marginBottom: 0,
  },
  bioText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '400',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  followButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  unfollowButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  unfollowButtonText: {
    color: '#000',
  },
  messageButton: {
    width: 40,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialsIconsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialLinkButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  instagramGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E4405F',
  },
  discordBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#5865F2',
  },
  socialLinkIcon: {
    width: 22,
    height: 22,
  },
  socialNotConfigured: {
    borderColor: '#e5e5e5',
    opacity: 0.5,
  },
  socialIconNotConfigured: {
    opacity: 0.4,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  postsSection: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
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
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: 30,
    backgroundColor: '#000',
    borderRadius: 1,
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
  gameIconScroller: {
    marginBottom: 16,
  },
  gameIconScrollerContent: {
    paddingVertical: 6,
    gap: 12,
  },
  gameIconContainer: {
    alignItems: 'center',
  },
  gameIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gameIconCircleActive: {
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  gameIconImage: {
    width: 32,
    height: 32,
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
  postsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    marginTop: 0,
  },
  postItem: {
    width: (screenWidth - 2) / 3,
    height: ((screenWidth - 2) / 3) * 1.25,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonAvatar: {
    backgroundColor: '#e5e5e5',
  },
  skeletonText: {
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
  },
});
