import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowing } from '@/services/followService';
import { likePost, unlikePost, isPostLiked } from '@/services/likeService';
import { createOrGetChat } from '@/services/chatService';
import CommentModal from '@/components/CommentModal';
import { ResizeMode, Video } from 'expo-av';
import { collection, getDocs, orderBy, query, Timestamp, where, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Game data
const gameData: { [key: string]: { name: string; icon: string } } = {
  valorant: { name: 'Valorant', icon: '🎯' },
  league: { name: 'League of Legends', icon: '⚔️' },
  apex: { name: 'Apex Legends', icon: '🎮' },
  fortnite: { name: 'Fortnite', icon: '🏆' },
  csgo: { name: 'CS:GO', icon: '🔫' },
  overwatch: { name: 'Overwatch', icon: '🦸' },
};

const getGameIcon = (gameId: string) => gameData[gameId]?.icon || '🎮';
const getGameName = (gameId: string) => gameData[gameId]?.name || gameId;

// Available games for filtering
const availableGames = [
  { id: 'valorant', name: 'Valorant', icon: '🎯' },
  { id: 'league', name: 'League of Legends', icon: '⚔️' },
  { id: 'apex', name: 'Apex Legends', icon: '🎮' },
  { id: 'fortnite', name: 'Fortnite', icon: '🏆' },
  { id: 'csgo', name: 'CS:GO', icon: '🔫' },
  { id: 'overwatch', name: 'Overwatch', icon: '🦸' },
];

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('following');
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [forYouPosts, setForYouPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const postRefs = useRef<{ [key: string]: View | null }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likingInProgress, setLikingInProgress] = useState<Set<string>>(new Set());
  const [commentingPost, setCommentingPost] = useState<Post | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);

  const currentPosts = activeTab === 'forYou' ? forYouPosts : followingPosts;

  // Listen for unread notifications count in real-time
  useEffect(() => {
    if (!currentUser?.id) return;

    const notificationsRef = collection(db, 'users', currentUser.id, 'notifications');
    const q = query(notificationsRef, where('read', '==', false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotificationCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Fetch users that current user is following
  useEffect(() => {
    const fetchFollowingUsers = async () => {
      if (!currentUser?.id) return;

      try {
        const followingData = await getFollowing(currentUser.id);
        const userIds = followingData.map(follow => follow.followingId);
        console.log('Following user IDs:', userIds);
        setFollowingUserIds(userIds);
      } catch (error) {
        console.error('Error fetching following:', error);
      }
    };

    fetchFollowingUsers();
  }, [currentUser?.id]);

  // Fetch posts from followed users and all posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!currentUser?.id) return;

      setLoading(true);
      try {
        // Fetch all posts for "For You" tab (empty for now)
        setForYouPosts([]);

        // Fetch all posts and filter for "Following" tab
        const allPostsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc')
        );
        const allPostsSnapshot = await getDocs(allPostsQuery);
        const allPosts: Post[] = allPostsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Post));

        // Filter posts from followed users only (exclude current user's own posts)
        let followingPostsFiltered = allPosts.filter(post =>
          followingUserIds.includes(post.userId) && post.userId !== currentUser.id
        );

        // Apply game filter if selected
        if (selectedGameFilter) {
          followingPostsFiltered = followingPostsFiltered.filter(post => post.taggedGame === selectedGameFilter);
        }

        console.log('All posts count:', allPosts.length);
        console.log('Following posts count:', followingPostsFiltered.length);
        console.log('Following posts:', followingPostsFiltered);
        setFollowingPosts(followingPostsFiltered);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (followingUserIds.length > 0 || activeTab === 'forYou') {
      fetchPosts();
    } else {
      setLoading(false);
    }
  }, [currentUser?.id, followingUserIds, activeTab, selectedGameFilter]);

  // Check which posts are liked by the current user
  useEffect(() => {
    const checkLikedPosts = async () => {
      if (!currentUser?.id || currentPosts.length === 0) return;

      try {
        const likedPostIds = new Set<string>();
        await Promise.all(
          currentPosts.map(async (post) => {
            const isLiked = await isPostLiked(currentUser.id, post.id);
            if (isLiked) {
              likedPostIds.add(post.id);
            }
          })
        );
        setLikedPosts(likedPostIds);
      } catch (error) {
        console.error('Error checking liked posts:', error);
      }
    };

    checkLikedPosts();
  }, [currentPosts, currentUser?.id]);

  // Handle like/unlike toggle
  const handleLikeToggle = async (post: Post) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    // Prevent multiple clicks while processing
    if (likingInProgress.has(post.id)) return;

    // Add to in-progress set
    const newInProgress = new Set(likingInProgress);
    newInProgress.add(post.id);
    setLikingInProgress(newInProgress);

    const isCurrentlyLiked = likedPosts.has(post.id);

    // Optimistic update
    const newLikedPosts = new Set(likedPosts);
    if (isCurrentlyLiked) {
      newLikedPosts.delete(post.id);
    } else {
      newLikedPosts.add(post.id);
    }
    setLikedPosts(newLikedPosts);

    // Update local post count optimistically
    const updatePostLikes = (posts: Post[]) =>
      posts.map((p) =>
        p.id === post.id
          ? { ...p, likes: p.likes + (isCurrentlyLiked ? -1 : 1) }
          : p
      );

    if (activeTab === 'following') {
      setFollowingPosts(updatePostLikes(followingPosts));
    } else {
      setForYouPosts(updatePostLikes(forYouPosts));
    }

    try {
      if (isCurrentlyLiked) {
        await unlikePost(currentUser.id, post.id);
      } else {
        const postThumbnail = post.mediaType === 'video' && post.thumbnailUrl
          ? post.thumbnailUrl
          : post.mediaUrl;

        await likePost(
          currentUser.id,
          currentUser.username || currentUser.email?.split('@')[0] || 'User',
          currentUser.avatar,
          post.id,
          post.userId,
          postThumbnail
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');

      // Revert optimistic update on error
      setLikedPosts(isCurrentlyLiked ? newLikedPosts : new Set(Array.from(newLikedPosts).filter(id => id !== post.id)));

      if (activeTab === 'following') {
        setFollowingPosts(updatePostLikes(followingPosts).map((p) =>
          p.id === post.id ? { ...p, likes: p.likes + (isCurrentlyLiked ? 1 : -1) } : p
        ));
      } else {
        setForYouPosts(updatePostLikes(forYouPosts).map((p) =>
          p.id === post.id ? { ...p, likes: p.likes + (isCurrentlyLiked ? 1 : -1) } : p
        ));
      }
    } finally {
      // Remove from in-progress set
      const updatedInProgress = new Set(likingInProgress);
      updatedInProgress.delete(post.id);
      setLikingInProgress(updatedInProgress);
    }
  };

  // Handle opening comment modal
  const handleOpenComments = (post: Post) => {
    setCommentingPost(post);
    setShowCommentModal(true);
  };

  // Handle closing comment modal
  const handleCloseComments = () => {
    setShowCommentModal(false);
    setCommentingPost(null);
  };

  // Refresh posts when a comment is added
  const handleCommentAdded = () => {
    // Refetch posts to get updated comment count
    if (followingUserIds.length > 0 || activeTab === 'forYou') {
      // Re-trigger the fetch posts effect
      const fetchPosts = async () => {
        if (!currentUser?.id) return;

        try {
          const allPostsQuery = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc')
          );
          const allPostsSnapshot = await getDocs(allPostsQuery);
          const allPosts: Post[] = allPostsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Post));

          let followingPostsFiltered = allPosts.filter(post =>
            followingUserIds.includes(post.userId) && post.userId !== currentUser.id
          );

          if (selectedGameFilter) {
            followingPostsFiltered = followingPostsFiltered.filter(post => post.taggedGame === selectedGameFilter);
          }

          setFollowingPosts(followingPostsFiltered);
        } catch (error) {
          console.error('Error refreshing posts:', error);
        }
      };

      fetchPosts();
    }
  };

  // Pause video when navigating away from this screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Pause video when screen loses focus
        setPlayingVideoId(null);
      };
    }, [])
  );

  // Check for visible videos when posts load or tab changes
  useEffect(() => {
    if (currentPosts.length > 0 && !loading) {
      // Delay to ensure refs are set
      setTimeout(() => {
        checkVideoInView();
      }, 100);
    } else {
      // If no posts, clear playing video
      setPlayingVideoId(null);
    }
  }, [currentPosts, loading, checkVideoInView]);

  const handleVideoClick = (postId: string) => {
    setPlayingVideoId(playingVideoId === postId ? null : postId);
  };

  // Check which video is in viewport
  const checkVideoInView = useCallback(() => {
    const videoPosts = currentPosts.filter(post => post.mediaType === 'video');
    let foundVisibleVideo = false;

    videoPosts.forEach(post => {
      const ref = postRefs.current[post.id];
      if (ref) {
        ref.measureInWindow((x, y, width, height) => {
          const windowHeight = Dimensions.get('window').height;
          const headerHeight = 150; // Approximate height of header + tabs

          // Check if video is at least 50% visible in viewport
          const isVisible =
            y + height > headerHeight &&
            y < windowHeight &&
            (y + height / 2) > headerHeight &&
            (y + height / 2) < windowHeight;

          if (isVisible && !foundVisibleVideo) {
            foundVisibleVideo = true;
            if (playingVideoId !== post.id) {
              setPlayingVideoId(post.id);
            }
          } else if (!isVisible && playingVideoId === post.id) {
            setPlayingVideoId(null);
          }
        });
      }
    });
  }, [currentPosts, playingVideoId]);

  const handleScroll = () => {
    // Use requestAnimationFrame for smoother checking
    requestAnimationFrame(() => {
      checkVideoInView();
    });
  };

  const handleUserPress = (userId: string) => {
    // Check if clicking on own profile
    if (userId === currentUser?.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profilePages/profileView?userId=${userId}`);
    }
  };

  // Handle direct message
  const handleDirectMessage = async (post: Post) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to send messages');
      return;
    }

    // Prevent messaging yourself
    if (post.userId === currentUser.id) {
      Alert.alert('Notice', 'You cannot message yourself');
      return;
    }

    try {
      const chatId = await createOrGetChat(
        currentUser.id,
        currentUser.username || currentUser.email?.split('@')[0] || 'User',
        currentUser.avatar,
        post.userId,
        post.username,
        post.avatar
      );

      router.push({
        pathname: '/chatPages/chatScreen',
        params: {
          chatId,
          otherUserId: post.userId,
          otherUsername: post.username,
          otherUserAvatar: post.avatar || '',
        },
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Home</ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/chatPages/chatList')}
          >
            <IconSymbol size={24} name="message.fill" color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/notifications')}
          >
            <IconSymbol size={24} name="bell.fill" color="#000" />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <ThemedText style={styles.notificationBadgeText}>
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabsLeft}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'forYou' && styles.tabActive]}
            onPress={() => setActiveTab('forYou')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'forYou' && styles.tabTextActive]}>
              For You
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'following' && styles.tabActive]}
            onPress={() => setActiveTab('following')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
              Following
            </ThemedText>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterMenu(true)}
        >
          <IconSymbol size={20} name="line.3.horizontal.decrease.circle" color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onScrollEndDrag={handleScroll}
        onMomentumScrollEnd={handleScroll}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
          </View>
        ) : currentPosts.length > 0 ? (
          currentPosts.map((post) => (
            <View
              key={post.id}
              style={styles.postCard}
              ref={(ref) => (postRefs.current[post.id] = ref)}
              collapsable={false}
            >
              {/* User Header */}
              <View style={styles.postHeader}>
                <TouchableOpacity
                  style={styles.userInfo}
                  onPress={() => handleUserPress(post.userId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarContainer}>
                    {post.avatar && post.avatar.startsWith('http') ? (
                      <Image source={{ uri: post.avatar }} style={styles.avatarImage} />
                    ) : (
                      <ThemedText style={styles.avatarInitial}>
                        {post.username[0].toUpperCase()}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.username}>{post.username}</ThemedText>
                </TouchableOpacity>
                {post.taggedGame && (
                  <View style={styles.gameTag}>
                    <ThemedText style={styles.gameTagText}>
                      {getGameIcon(post.taggedGame)} {getGameName(post.taggedGame)}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Caption */}
              {post.caption && (
                <View style={styles.captionContainer}>
                  <ThemedText style={styles.caption}>{post.caption}</ThemedText>
                </View>
              )}

              {/* Media Content */}
              <View style={post.mediaType === 'video' ? styles.mediaContentVideo : styles.mediaContentImage}>
                {post.mediaType === 'video' ? (
                  <Video
                    source={{ uri: post.mediaUrl }}
                    style={styles.mediaImage}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={playingVideoId === post.id}
                    isLooping
                    onPlaybackStatusUpdate={(status) => {
                      // Handle video end
                      if (status.isLoaded && status.didJustFinish) {
                        // Video will loop automatically due to isLooping prop
                      }
                    }}
                  />
                ) : (
                  <Image
                    source={{ uri: post.mediaUrl }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                )}
              </View>

              {/* Post Footer */}
              <View style={styles.postFooter}>
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={() => handleLikeToggle(post)}
                  disabled={likingInProgress.has(post.id)}
                >
                  <IconSymbol
                    size={28}
                    name={likedPosts.has(post.id) ? "heart.fill" : "heart"}
                    color={likedPosts.has(post.id) ? "#ef4444" : "#000"}
                  />
                  <ThemedText style={styles.actionCount}>{post.likes}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.commentButton}
                  onPress={() => handleOpenComments(post)}
                >
                  <IconSymbol size={28} name="bubble.left" color="#000" />
                  {(post.commentsCount ?? 0) > 0 && (
                    <ThemedText style={styles.actionCount}>{post.commentsCount}</ThemedText>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => handleDirectMessage(post)}
                >
                  <IconSymbol size={28} name="paperplane" color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol size={64} name="person.2" color="#ccc" />
            <ThemedText style={styles.emptyText}>
              {activeTab === 'following'
                ? "No posts from people you follow yet"
                : "No posts available"}
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {activeTab === 'following'
                ? "Follow users to see their posts here"
                : "Check back later for new content"}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Filter Menu Modal */}
      <Modal
        visible={showFilterMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterMenu(false)}
      >
        <TouchableOpacity
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterMenu(false)}
        >
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <ThemedText style={styles.filterModalTitle}>Filter by Game</ThemedText>
              <TouchableOpacity onPress={() => setShowFilterMenu(false)}>
                <IconSymbol size={24} name="xmark" color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.filterModalScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.filterOptionsContainer}>
                {/* All Games option */}
                <TouchableOpacity
                  style={[styles.filterOption, selectedGameFilter === null && styles.filterOptionActive]}
                  onPress={() => {
                    setSelectedGameFilter(null);
                    setShowFilterMenu(false);
                  }}
                >
                  <View style={styles.filterOptionLeft}>
                    <IconSymbol size={22} name="square.grid.2x2" color={selectedGameFilter === null ? '#007AFF' : '#000'} />
                    <ThemedText style={[styles.filterOptionText, selectedGameFilter === null && styles.filterOptionTextActive]}>
                      All Games
                    </ThemedText>
                  </View>
                  {selectedGameFilter === null && (
                    <IconSymbol size={22} name="checkmark" color="#007AFF" />
                  )}
                </TouchableOpacity>

                {/* Individual game options */}
                {availableGames.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={[styles.filterOption, selectedGameFilter === game.id && styles.filterOptionActive]}
                    onPress={() => {
                      setSelectedGameFilter(game.id);
                      setShowFilterMenu(false);
                    }}
                  >
                    <View style={styles.filterOptionLeft}>
                      <ThemedText style={styles.gameFilterIcon}>{game.icon}</ThemedText>
                      <ThemedText style={[styles.filterOptionText, selectedGameFilter === game.id && styles.filterOptionTextActive]}>
                        {game.name}
                      </ThemedText>
                    </View>
                    {selectedGameFilter === game.id && (
                      <IconSymbol size={22} name="checkmark" color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comment Modal */}
      {commentingPost && (
        <CommentModal
          visible={showCommentModal}
          postId={commentingPost.id}
          postOwnerId={commentingPost.userId}
          postThumbnail={
            commentingPost.mediaType === 'video' && commentingPost.thumbnailUrl
              ? commentingPost.thumbnailUrl
              : commentingPost.mediaUrl
          }
          onClose={handleCloseComments}
          onCommentAdded={handleCommentAdded}
        />
      )}
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
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  tabsLeft: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 0,
    marginHorizontal: 8,
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  filterButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  postCard: {
    marginBottom: 24,
    backgroundColor: '#fff',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  gameTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  followText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  caption: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  mediaContentImage: {
    width: width,
    height: width, // 1:1 square aspect ratio for images
    backgroundColor: '#000',
    position: 'relative',
  },
  mediaContentVideo: {
    width: width,
    height: width * 0.5625, // 16:9 landscape aspect ratio (9/16 = 0.5625) for videos
    backgroundColor: '#000',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareButton: {
    marginLeft: 'auto',
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  videoThumbnailContainer: {
    width: '100%',
    height: '100%',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterModalScroll: {
    maxHeight: 500,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  filterOptionsContainer: {
    paddingVertical: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  filterOptionActive: {
    backgroundColor: '#f8f9fa',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  gameFilterIcon: {
    fontSize: 20,
  },
});