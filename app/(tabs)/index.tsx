import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowing } from '@/services/followService';
import { likePost, unlikePost, isPostLiked } from '@/services/likeService';
import { createOrGetChat } from '@/services/chatService';
import CommentModal from '@/app/components/commentModal';
import PostContent from '@/app/components/postContent';
import { collection, getDocs, orderBy, query, Timestamp, where, onSnapshot, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Format timestamp for comments
const formatTimeAgo = (timestamp: any): string => {
  const now = new Date();
  const date = timestamp.toDate();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

// Available games for filtering
const availableGames = [
  { id: 'valorant', name: 'Valorant', image: require('@/assets/images/valorantText.png') },
  { id: 'league', name: 'League of Legends', image: require('@/assets/images/leagueoflegends.png') },
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
  const { user: currentUser, preloadedPosts, clearPreloadedPosts } = useAuth();
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('following');
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [forYouPosts, setForYouPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const postRefs = useRef<{ [key: string]: View | null }>({});
  const videoPlayers = useRef<{ [key: string]: any }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likingInProgress, setLikingInProgress] = useState<Set<string>>(new Set());
  const [commentingPost, setCommentingPost] = useState<Post | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasConsumedPreload, setHasConsumedPreload] = useState(false);

  const currentPosts = activeTab === 'forYou' ? forYouPosts : followingPosts;

  const POSTS_PER_PAGE = 8;

  // Callback to register video players
  const handlePlayerReady = useCallback((postId: string, player: any) => {
    videoPlayers.current[postId] = player;
  }, []);

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
        let userIds = followingData.map(follow => follow.followingId);

        // Remove current user from the list to avoid fetching own posts
        userIds = userIds.filter(id => id !== currentUser.id);

        setFollowingUserIds(userIds);
      } catch (error) {
        console.error('Error fetching following:', error);
      }
    };

    fetchFollowingUsers();
  }, [currentUser?.id]);

  // Consume preloaded posts from AuthContext (loaded during loading screen)
  useEffect(() => {
    if (preloadedPosts && preloadedPosts.length > 0 && !hasConsumedPreload) {
      console.log('✅ Using preloaded posts from loading screen:', preloadedPosts.length);
      setFollowingPosts(preloadedPosts);
      setLoading(false);
      setHasConsumedPreload(true);
      // Clear preloaded posts to prevent reuse
      clearPreloadedPosts();
    } else if (preloadedPosts && preloadedPosts.length === 0 && !hasConsumedPreload) {
      // Preload returned empty array (no following users)
      console.log('✅ Preload returned no posts (no following)');
      setFollowingPosts([]);
      setLoading(false);
      setHasConsumedPreload(true);
      clearPreloadedPosts();
    }
  }, [preloadedPosts, hasConsumedPreload, clearPreloadedPosts]);

  // Fetch posts with pagination
  const fetchPostsWithPagination = useCallback(async (isLoadMore: boolean = false) => {
    if (!currentUser?.id) return;
    if (isLoadMore && (!hasMore || loadingMore)) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setLastDoc(null);
      setHasMore(true);
    }

    try {
      // Fetch all posts for "For You" tab (empty for now)
      if (activeTab === 'forYou') {
        setForYouPosts([]);
        setLoading(false);
        return;
      }

      // If no following users, show empty state
      if (followingUserIds.length === 0) {
        setFollowingPosts([]);
        setLoading(false);
        return;
      }

      // Batch queries for users following more than 10 people
      const batchSize = 10;
      const batches: string[][] = [];
      for (let i = 0; i < followingUserIds.length; i += batchSize) {
        batches.push(followingUserIds.slice(i, i + batchSize));
      }

      let allBatchPosts: Post[] = [];

      // Fetch posts from each batch
      for (const batch of batches) {
        let q = query(
          collection(db, 'posts'),
          where('userId', 'in', batch),
          orderBy('createdAt', 'desc'),
          limit(POSTS_PER_PAGE * 2) // Fetch more to account for filtering
        );

        if (isLoadMore && lastDoc) {
          q = query(
            collection(db, 'posts'),
            where('userId', 'in', batch),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(POSTS_PER_PAGE * 2)
          );
        }

        const snapshot = await getDocs(q);
        const batchPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Post));

        allBatchPosts = [...allBatchPosts, ...batchPosts];
      }

      // Sort all posts by createdAt
      allBatchPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      // Apply game filter if selected
      let filteredPosts = allBatchPosts;
      if (selectedGameFilter) {
        filteredPosts = filteredPosts.filter(post => post.taggedGame === selectedGameFilter);
      }

      // Take only the number we need
      const postsToShow = filteredPosts.slice(0, POSTS_PER_PAGE);

      // Fetch user avatars for posts that don't have them
      const postsWithAvatars = await Promise.all(
        postsToShow.map(async (post) => {
          if (post.avatar) {
            return post;
          }

          try {
            const userQuery = query(
              collection(db, 'users'),
              where('__name__', '==', post.userId)
            );
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              return {
                ...post,
                avatar: userData.avatar || null
              };
            }
          } catch (error) {
            console.error(`Error fetching avatar for user ${post.userId}:`, error);
          }

          return post;
        })
      );

      if (isLoadMore) {
        setFollowingPosts(prev => {
          // Filter out duplicates by checking if post ID already exists
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = postsWithAvatars.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      } else {
        setFollowingPosts(postsWithAvatars);
      }

      // Update pagination state - if we got fewer posts than requested, there are no more
      setHasMore(postsWithAvatars.length === POSTS_PER_PAGE);
      if (postsWithAvatars.length > 0) {
        // Find the last document for pagination
        const lastPost = postsWithAvatars[postsWithAvatars.length - 1];
        const lastPostQuery = query(
          collection(db, 'posts'),
          where('__name__', '==', lastPost.id)
        );
        const lastPostSnapshot = await getDocs(lastPostQuery);
        if (!lastPostSnapshot.empty) {
          setLastDoc(lastPostSnapshot.docs[0]);
        }
      }

    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUser?.id, followingUserIds, activeTab, selectedGameFilter, hasMore, loadingMore, lastDoc]);

  // Initial fetch when dependencies change
  // Note: Don't fetch if we just consumed preloaded posts (hasConsumedPreload && no filter)
  useEffect(() => {
    // Skip initial fetch if we have preloaded posts and no filters applied
    if (hasConsumedPreload && selectedGameFilter === null && activeTab === 'following') {
      return;
    }

    // Reset hasConsumedPreload when switching tabs or filters (so subsequent changes fetch fresh data)
    if (activeTab === 'forYou' || selectedGameFilter !== null) {
      setHasConsumedPreload(false);
    }

    if (followingUserIds.length > 0 || activeTab === 'forYou') {
      fetchPostsWithPagination(false);
    } else {
      setLoading(false);
    }
  }, [currentUser?.id, followingUserIds, activeTab, selectedGameFilter, hasConsumedPreload]);

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

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPostsWithPagination(false);
    setRefreshing(false);
  }, [fetchPostsWithPagination]);

  // Load more posts when scrolling to bottom
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      fetchPostsWithPagination(true);
    }
  }, [hasMore, loadingMore, loading, fetchPostsWithPagination]);

  // Detect when user scrolls to bottom
  const handleScrollEnd = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  // Update comment count when a comment is added (without refetching all posts)
  const handleCommentAdded = useCallback(() => {
    if (!commentingPost) return;

    // Update the comment count for the specific post locally
    const updatePostCommentCount = (posts: Post[]) =>
      posts.map((p) =>
        p.id === commentingPost.id
          ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 }
          : p
      );

    if (activeTab === 'following') {
      setFollowingPosts(updatePostCommentCount(followingPosts));
    } else {
      setForYouPosts(updatePostCommentCount(forYouPosts));
    }
  }, [commentingPost, activeTab, followingPosts, forYouPosts]);

  // Handle screen focus/blur for video playback
  useFocusEffect(
    useCallback(() => {
      // Screen is focused
      setIsScreenFocused(true);

      return () => {
        // Screen lost focus - pause all videos
        setIsScreenFocused(false);
        setPlayingVideoId(null);
        Object.values(videoPlayers.current).forEach((player) => {
          if (player) {
            try {
              player.pause();
            } catch (error) {
              // Video already paused or unmounted
            }
          }
        });
      };
    }, [])
  );

  // Check for visible videos when posts load or tab changes (only when screen is focused)
  useEffect(() => {
    if (currentPosts.length > 0 && !loading && isScreenFocused) {
      // Delay to ensure refs are set
      setTimeout(() => {
        checkVideoInView();
      }, 100);
    } else {
      // If no posts or screen not focused, clear playing video
      setPlayingVideoId(null);
    }
  }, [currentPosts, loading, isScreenFocused, checkVideoInView]);

  const handleVideoClick = (postId: string) => {
    setPlayingVideoId(playingVideoId === postId ? null : postId);
  };

  // Check which video is in viewport (only auto-play when screen is focused)
  const checkVideoInView = useCallback(() => {
    // Don't auto-play videos if screen is not focused
    if (!isScreenFocused) {
      return;
    }

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
  }, [currentPosts, playingVideoId, isScreenFocused]);

  const handleScroll = () => {
    // Use requestAnimationFrame for smoother checking
    requestAnimationFrame(() => {
      checkVideoInView();
    });
  };

  const handleUserPress = async (userId: string) => {
    // Mark screen as unfocused to prevent videos from auto-playing
    setIsScreenFocused(false);

    // Stop all videos immediately by setting state
    setPlayingVideoId(null);

    // Pause all videos before navigating
    try {
      Object.values(videoPlayers.current).forEach((player) => {
        if (player) {
          try {
            player.pause();
          } catch (error) {
            // Video already paused or unmounted
          }
        }
      });
    } catch (error) {
      // Video cleanup error
    }

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
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          handleScroll();
          handleScrollEnd(e);
        }}
        scrollEventThrottle={100}
        onScrollEndDrag={handleScroll}
        onMomentumScrollEnd={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#000"
            colors={['#000']}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
          </View>
        ) : currentPosts.length > 0 ? (
          <>
            {currentPosts.map((post) => (
              <PostContent
                key={post.id}
                post={post}
                playingVideoId={playingVideoId}
                postRefs={postRefs}
                onOpenComments={handleOpenComments}
                onDirectMessage={handleDirectMessage}
                onLikeToggle={handleLikeToggle}
                onUserPress={handleUserPress}
                formatTimeAgo={formatTimeAgo}
                currentUserId={currentUser?.id}
                isLiked={likedPosts.has(post.id)}
                likeCount={post.likes}
                isLiking={likingInProgress.has(post.id)}
                onPlayerReady={handlePlayerReady}
                showRecentComments={true}
              />
            ))}
            {loadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#000" />
                <ThemedText style={styles.loadingMoreText}>Loading more posts...</ThemedText>
              </View>
            )}
            {!hasMore && currentPosts.length > 0 && (
              <View style={styles.endOfFeedContainer}>
                <ThemedText style={styles.endOfFeedText}>You're all caught up!</ThemedText>
              </View>
            )}
          </>
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
        <View style={styles.filterModalContainer}>
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
                    <IconSymbol size={22} name="square.grid.2x2" color={selectedGameFilter === null ? '#000' : '#666'} />
                    <ThemedText style={[styles.filterOptionText, selectedGameFilter === null && styles.filterOptionTextActive]}>
                      All Games
                    </ThemedText>
                  </View>
                  {selectedGameFilter === null && (
                    <IconSymbol size={20} name="checkmark.circle.fill" color="#000" />
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
                      {game.image ? (
                        <Image
                          source={game.image}
                          style={styles.gameFilterImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <ThemedText style={styles.gameFilterIcon}>{game.icon}</ThemedText>
                      )}
                      <ThemedText style={[styles.filterOptionText, selectedGameFilter === game.id && styles.filterOptionTextActive]}>
                        {game.name}
                      </ThemedText>
                    </View>
                    {selectedGameFilter === game.id && (
                      <IconSymbol size={20} name="checkmark.circle.fill" color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
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
  scrollViewContent: {
    paddingBottom: 100,
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
  filterModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    height: '70%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterModalScroll: {
    maxHeight: 500,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },
  filterOptionsContainer: {
    paddingVertical: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  filterOptionActive: {
    backgroundColor: '#fafafa',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  filterOptionTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  gameFilterIcon: {
    fontSize: 20,
  },
  gameFilterImage: {
    height: 24,
    width: 80,
    marginRight: 8,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#666',
  },
  endOfFeedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  endOfFeedText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});