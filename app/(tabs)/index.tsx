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
import NewPost from '@/app/components/newPost';
import { collection, getDocs, orderBy, query, Timestamp, where, onSnapshot, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View, Alert, RefreshControl } from 'react-native';
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
  { id: 'valorant', name: 'Valorant', image: require('@/assets/images/valorant-text.png') },
  { id: 'league', name: 'League of Legends', image: require('@/assets/images/lol.png') },
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
  const {
    user: currentUser,
    preloadedPosts,
    clearPreloadedPosts,
    newlyFollowedUserPosts,
    newlyFollowedUserId,
    clearNewlyFollowedUserPosts,
    newlyUnfollowedUserId,
    clearNewlyUnfollowedUserId
  } = useAuth();
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
  const [showNewPost, setShowNewPost] = useState(false);

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

  // Smart merge logic for newly followed user posts
  useEffect(() => {
    if (!newlyFollowedUserPosts || !newlyFollowedUserId) return;

    console.log(`✅ Merging ${newlyFollowedUserPosts.length} posts from newly followed user:`, newlyFollowedUserId);

    // Only merge if we're on the following tab
    if (activeTab === 'following') {
      setFollowingPosts(currentPosts => {
        // Combine new posts with existing posts
        const combined = [...currentPosts, ...newlyFollowedUserPosts];

        // Remove duplicates by ID
        const uniqueMap = new Map();
        combined.forEach(post => {
          if (!uniqueMap.has(post.id)) {
            uniqueMap.set(post.id, post);
          }
        });
        const unique = Array.from(uniqueMap.values());

        // Sort by timestamp descending (most recent first)
        unique.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        // Take only top 8 most recent posts
        const top8 = unique.slice(0, POSTS_PER_PAGE);

        console.log(`✅ Feed updated: ${currentPosts.length} → ${top8.length} posts (showing top 8 most recent)`);
        return top8;
      });
    }

    // Add the newly followed user to the following list
    setFollowingUserIds(prev => {
      if (!prev.includes(newlyFollowedUserId)) {
        return [...prev, newlyFollowedUserId];
      }
      return prev;
    });

    // Clear the newly followed posts from context
    clearNewlyFollowedUserPosts();
  }, [newlyFollowedUserPosts, newlyFollowedUserId, activeTab, clearNewlyFollowedUserPosts, POSTS_PER_PAGE]);

  // Smart removal logic for unfollowed user posts
  useEffect(() => {
    if (!newlyUnfollowedUserId) return;

    console.log(`✅ Removing posts from unfollowed user:`, newlyUnfollowedUserId);

    // Only remove if we're on the following tab
    if (activeTab === 'following') {
      setFollowingPosts(currentPosts => {
        const filtered = currentPosts.filter(post => post.userId !== newlyUnfollowedUserId);
        console.log(`✅ Feed updated: ${currentPosts.length} → ${filtered.length} posts (removed unfollowed user's posts)`);
        return filtered;
      });
    }

    // Remove the unfollowed user from the following list
    setFollowingUserIds(prev => prev.filter(id => id !== newlyUnfollowedUserId));

    // Clear the unfollowed userId from context
    clearNewlyUnfollowedUserId();
  }, [newlyUnfollowedUserId, activeTab, clearNewlyUnfollowedUserId]);

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

  // Handle add new post button
  const handleAddPost = () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }
    setShowNewPost(true);
  };

  // Handle when a new post is created
  const handlePostCreated = (newPost: Post) => {
    // Add new post to the beginning of the following posts array (most recent first)
    setFollowingPosts(prevPosts => [newPost, ...prevPosts]);
    console.log('New post added to feed:', newPost.id);
  };

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
            <IconSymbol size={24} name="paperplane.fill" color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/notifications')}
          >
            <IconSymbol size={24} name="bell.fill" color="#fff" />
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
        <View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterMenu(!showFilterMenu)}
          >
            <IconSymbol
              size={20}
              name="line.3.horizontal.decrease.circle"
              color={selectedGameFilter ? "#c42743" : "#fff"}
            />
          </TouchableOpacity>

          {/* Filter Dropdown */}
          {showFilterMenu && (
            <View style={styles.filterDropdown}>
              <TouchableOpacity
                style={[styles.filterDropdownOption, selectedGameFilter === null && styles.filterDropdownOptionActive]}
                onPress={() => {
                  setSelectedGameFilter(null);
                  setShowFilterMenu(false);
                }}
              >
                <IconSymbol size={18} name="square.grid.2x2" color="#fff" />
                <ThemedText style={[styles.filterDropdownText, selectedGameFilter === null && styles.filterDropdownTextActive]}>
                  All Games
                </ThemedText>
                {selectedGameFilter === null && (
                  <IconSymbol size={16} name="checkmark" color="#c42743" />
                )}
              </TouchableOpacity>

              {availableGames.map((game, index) => (
                <TouchableOpacity
                  key={game.id}
                  style={[
                    styles.filterDropdownOption,
                    selectedGameFilter === game.id && styles.filterDropdownOptionActive,
                    index === availableGames.length - 1 && styles.filterDropdownOptionLast
                  ]}
                  onPress={() => {
                    setSelectedGameFilter(game.id);
                    setShowFilterMenu(false);
                  }}
                >
                  <ThemedText style={[styles.filterDropdownText, selectedGameFilter === game.id && styles.filterDropdownTextActive]}>
                    {game.name}
                  </ThemedText>
                  {selectedGameFilter === game.id && (
                    <IconSymbol size={16} name="checkmark" color="#c42743" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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
            <IconSymbol size={64} name="person.2" color="#fff" />
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

      {/* Transparent Overlay for Filter Menu */}
      {showFilterMenu && (
        <TouchableOpacity
          style={styles.filterOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterMenu(false)}
        />
      )}

      {/* Floating Add Post Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={handleAddPost}
        activeOpacity={0.8}
      >
        <IconSymbol size={28} name="plus" color="#fff" />
      </TouchableOpacity>

      {/* New Post Modal */}
      <NewPost
        visible={showNewPost}
        onClose={() => setShowNewPost(false)}
        onPostCreated={handlePostCreated}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
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
    backgroundColor: '#1e2124',
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
    borderBottomColor: '#c42743',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterButton: {
    padding: 8,
    position: 'relative',
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  filterDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    overflow: 'hidden',
  },
  filterDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2124',
  },
  filterDropdownOptionActive: {
    backgroundColor: '#1e2124',
  },
  filterDropdownOptionLast: {
    borderBottomWidth: 0,
  },
  filterDropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  filterDropdownTextActive: {
    color: '#c42743',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  scrollViewContent: {
    paddingBottom: 100,
    backgroundColor: '#1e2124',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
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
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
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
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});