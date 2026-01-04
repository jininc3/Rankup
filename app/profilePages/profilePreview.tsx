import rankCard from '@/app/components/rankCard';

// Alias for JSX usage (React components must start with uppercase)
const RankCard = rankCard;
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp, doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { followUser, unfollowUser, isFollowing as checkIsFollowing } from '@/services/followService';

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
  gamesPlayed?: {
    valorant?: {
      currentRank: string;
      gamesPlayed: number;
      winRate: number;
    };
    league?: {
      currentRank: string;
      gamesPlayed: number;
      winRate: number;
    };
    apex?: {
      currentRank: string;
      gamesPlayed: number;
      winRate: number;
    };
  };
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 16;
const CARD_WIDTH = screenWidth - (CARD_PADDING * 2);

interface Post {
  id: string;
  userId: string;
  username: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
  taggedPeople?: string[];
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
}

export default function ProfilePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser, refreshUser } = useAuth();
  const [viewedUser, setViewedUser] = useState<ViewedUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState<'games' | 'posts'>('games');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Create userGames array based on viewedUser data
  const userGames = viewedUser?.gamesPlayed ? [
    {
      id: 1,
      name: 'Valorant',
      rank: viewedUser.gamesPlayed.valorant?.currentRank || 'Unranked',
      trophies: 1245,
      icon: '🎯',
      wins: Math.floor((viewedUser.gamesPlayed.valorant?.gamesPlayed || 0) * ((viewedUser.gamesPlayed.valorant?.winRate || 0) / 100)),
      losses: (viewedUser.gamesPlayed.valorant?.gamesPlayed || 0) - Math.floor((viewedUser.gamesPlayed.valorant?.gamesPlayed || 0) * ((viewedUser.gamesPlayed.valorant?.winRate || 0) / 100)),
      winRate: viewedUser.gamesPlayed.valorant?.winRate || 0,
      recentMatches: ['+25', '+18', '-12', '+22', '+19'],
    },
    {
      id: 2,
      name: 'League of Legends',
      rank: viewedUser.gamesPlayed.league?.currentRank || 'Unranked',
      trophies: 876,
      icon: '⚔️',
      wins: Math.floor((viewedUser.gamesPlayed.league?.gamesPlayed || 0) * ((viewedUser.gamesPlayed.league?.winRate || 0) / 100)),
      losses: (viewedUser.gamesPlayed.league?.gamesPlayed || 0) - Math.floor((viewedUser.gamesPlayed.league?.gamesPlayed || 0) * ((viewedUser.gamesPlayed.league?.winRate || 0) / 100)),
      winRate: viewedUser.gamesPlayed.league?.winRate || 0,
      recentMatches: ['+15', '-18', '+20', '+17', '-14'],
    },
    {
      id: 3,
      name: 'Apex Legends',
      rank: viewedUser.gamesPlayed.apex?.currentRank || 'Unranked',
      trophies: 422,
      icon: '🎮',
      wins: Math.floor((viewedUser.gamesPlayed.apex?.gamesPlayed || 0) * ((viewedUser.gamesPlayed.apex?.winRate || 0) / 100)),
      losses: (viewedUser.gamesPlayed.apex?.gamesPlayed || 0) - Math.floor((viewedUser.gamesPlayed.apex?.gamesPlayed || 0) * ((viewedUser.gamesPlayed.apex?.winRate || 0) / 100)),
      winRate: viewedUser.gamesPlayed.apex?.winRate || 0,
      recentMatches: ['+28', '+22', '-16', '-19', '+25'],
    },
  ] : [];

  const selectedGame = userGames[selectedGameIndex];

  // Get userId from params, or use current user's id
  const userId = params.userId as string || currentUser?.id;

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

  // Fetch viewed user's profile data
  const fetchUserProfile = async () => {
    if (!userId) return;

    setLoadingUser(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
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
          gamesPlayed: data.gamesPlayed,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  // Fetch user's posts from Firestore
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

  // Fetch user profile and posts when component mounts
  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchPosts();
    }
  }, [userId]);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchUserProfile();
        fetchPosts();
      }
    }, [userId])
  );

  const handlePostPress = (post: Post) => {
    setSelectedPost(post);
    setShowPostViewer(true);
  };

  const closePostViewer = () => {
    setShowPostViewer(false);
    setSelectedPost(null);
  };

  // Check if current user is following this profile
  const checkFollowStatus = async () => {
    if (!currentUser?.id || !userId) return;

    try {
      const following = await checkIsFollowing(currentUser.id, userId);
      setIsFollowing(following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
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

  // Check follow status on mount
  useEffect(() => {
    checkFollowStatus();
  }, [currentUser?.id, userId]);

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
              <View style={styles.avatarCircle}>
                {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                  <Image source={{ uri: viewedUser.avatar }} style={styles.avatarImage} />
                ) : (
                  <ThemedText style={styles.avatarInitial}>
                    {viewedUser?.avatar || viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Username and Stats on the right */}
            <View style={styles.profileInfoRight}>
              {/* Username */}
              <ThemedText style={styles.username}>{viewedUser?.username || 'User'}</ThemedText>

              {/* Stats in One Line */}
              <View style={styles.statsRow}>
                <ThemedText style={styles.statText}>{viewedUser?.postsCount || 0} Posts</ThemedText>
                <ThemedText style={styles.statDividerText}> | </ThemedText>
                <ThemedText style={styles.statText}>{viewedUser?.followersCount || 0} Followers</ThemedText>
                <ThemedText style={styles.statDividerText}> | </ThemedText>
                <ThemedText style={styles.statText}>{viewedUser?.followingCount || 0} Following</ThemedText>
              </View>
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

          {/* Follow Button - Only show when viewing other users */}
          {userId !== currentUser?.id && (
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.unfollowButton]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              <ThemedText style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
                {followLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
              </ThemedText>
            </TouchableOpacity>
          )}
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
                <RankCard game={game} username={viewedUser?.username || 'User'} />
              </View>
            ))}
          </ScrollView>
        </View>
        )}

        {/* Posts Tab Content */}
        {activeMainTab === 'posts' && (
          <View style={styles.postsSection}>
            {loadingPosts ? (
              <View style={styles.postsContainer}>
                <ActivityIndicator size="large" color="#c42743" />
                <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
              </View>
            ) : posts.length > 0 ? (
              <View style={styles.postsGrid}>
                {posts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.postItem}
                    onPress={() => handlePostPress(post)}
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
        )}
      </ScrollView>

      {/* Post Viewer Modal */}
      <Modal
        visible={showPostViewer}
        animationType="fade"
        transparent={true}
        onRequestClose={closePostViewer}
      >
        <View style={styles.postViewerOverlay}>
          <TouchableOpacity
            style={styles.postViewerCloseArea}
            activeOpacity={1}
            onPress={closePostViewer}
          />
          <View style={styles.postViewerContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.postViewerCloseButton}
              onPress={closePostViewer}
            >
              <IconSymbol size={28} name="xmark.circle.fill" color="#fff" />
            </TouchableOpacity>

            {selectedPost && (
              <>
                {/* Media */}
                <View style={styles.postViewerMediaContainer}>
                  {selectedPost.mediaType === 'video' ? (
                    <Video
                      source={{ uri: selectedPost.mediaUrl }}
                      style={styles.postViewerImage}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                    />
                  ) : (
                    <Image
                      source={{ uri: selectedPost.mediaUrl }}
                      style={styles.postViewerImage}
                      resizeMode="contain"
                    />
                  )}
                </View>

                {/* Post Info */}
                <View style={styles.postViewerInfo}>
                  <View style={styles.postViewerHeader}>
                    <View style={styles.postViewerUserInfo}>
                      <View style={styles.postViewerAvatar}>
                        {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                          <Image source={{ uri: viewedUser.avatar }} style={styles.postViewerAvatarImage} />
                        ) : (
                          <ThemedText style={styles.postViewerAvatarInitial}>
                            {viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText style={styles.postViewerUsername}>
                        {selectedPost.username}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.postViewerDate}>
                      {selectedPost.createdAt?.toDate().toLocaleDateString()}
                    </ThemedText>
                  </View>

                  {selectedPost.caption && (
                    <View style={styles.postViewerCaptionContainer}>
                      <ThemedText style={styles.postViewerCaption}>
                        {selectedPost.caption}
                      </ThemedText>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.postViewerActions}>
                    <TouchableOpacity style={styles.postViewerActionButton}>
                      <IconSymbol size={28} name="heart" color="#fff" />
                      <ThemedText style={styles.postViewerActionText}>
                        {selectedPost.likes}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.postViewerActionButton}>
                      <IconSymbol size={28} name="bubble.left" color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.postViewerActionButton}>
                      <IconSymbol size={28} name="paperplane" color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
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
    backgroundColor: '#1e2124',
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
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e2124',
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
    color: '#fff',
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
    color: '#b9bbbe',
    fontWeight: '400',
  },
  statDividerText: {
    fontSize: 14,
    color: '#72767d',
    fontWeight: '400',
  },
  bioContainer: {
    marginBottom: 0,
  },
  bioText: {
    fontSize: 14,
    color: '#dcddde',
    lineHeight: 20,
    fontWeight: '400',
  },
  followButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#000',
    marginTop: 12,
  },
  unfollowButton: {
    backgroundColor: '#36393e',
    borderWidth: 1,
    borderColor: '#2c2f33',
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  unfollowButtonText: {
    color: '#fff',
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
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E4405F',
  },
  discordBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#36393e',
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
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
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
    borderBottomColor: '#c42743',
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#72767d',
    letterSpacing: -0.2,
  },
  mainTabTextActive: {
    color: '#fff',
    fontWeight: '600',
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
    borderBottomColor: '#c42743',
  },
  gameTabText: {
    fontSize: 14,
    color: '#72767d',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  gameTabTextActive: {
    color: '#fff',
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
    color: '#fff',
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#b9bbbe',
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
  postViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  postViewerCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  postViewerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  postViewerCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 100,
  },
  postViewerMediaContainer: {
    width: '100%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postViewerImage: {
    width: '100%',
    height: '100%',
  },
  postViewerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  postViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  postViewerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postViewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postViewerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  postViewerAvatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  postViewerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  postViewerDate: {
    fontSize: 14,
    color: '#999',
  },
  postViewerCaptionContainer: {
    marginBottom: 20,
  },
  postViewerCaption: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  postViewerActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  postViewerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postViewerActionText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
});
