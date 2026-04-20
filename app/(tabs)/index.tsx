import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedSkeleton } from '@/components/ui/Skeleton';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowing } from '@/services/followService';
import { likePost, unlikePost, isPostLiked } from '@/services/likeService';
import { createOrGetChat, subscribeToUserChats } from '@/services/chatService';
import CommentModal from '@/app/components/commentModal';
import PostContent from '@/app/components/postContent';
import PostDuoCard from '@/app/components/postDuoCard';
import { DuoCardData } from '@/app/(tabs)/duoFinder';
import { collection, getDocs, orderBy, query, Timestamp, where, onSnapshot, limit, startAfter, QueryDocumentSnapshot, DocumentData, doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View, Alert, RefreshControl, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { width, height: screenHeight } = Dimensions.get('window');

// Format timestamp for comments
const formatTimeAgo = (timestamp: any): string => {
  const now = new Date();
  const date = timestamp.toDate();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInDays = Math.floor(diffInSeconds / 86400);

  // Within the last minute
  if (diffInSeconds < 60) {
    return 'now';
  }

  // Check if it's today (same calendar day)
  const isToday = date.getDate() === now.getDate() &&
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear();

  if (isToday) {
    // Show time for today's posts
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  // Within a week (1-7 days ago)
  if (diffInDays < 7) {
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
  }

  // More than a week ago - show date
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const currentYear = now.getFullYear();

  if (year === currentYear) {
    return `${day} ${month}`;
  } else {
    const shortYear = year.toString().slice(-2);
    return `${day} ${month} ${shortYear}`;
  }
};

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
  leagueRank?: string;
  valorantRank?: string;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    user: currentUser,
    preloadedPosts,
    preloadedFollowingIds,
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
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
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
  const [showNewClip, setShowNewClip] = useState(false);

  // Duo card state for posting
  const [valorantCard, setValorantCard] = useState<DuoCardData | null>(null);
  const [leagueCard, setLeagueCard] = useState<DuoCardData | null>(null);
  const [valorantInGameIcon, setValorantInGameIcon] = useState<string | undefined>(undefined);
  const [valorantInGameName, setValorantInGameName] = useState<string | undefined>(undefined);
  const [valorantWinRate, setValorantWinRate] = useState<number | undefined>(undefined);
  const [leagueInGameIcon, setLeagueInGameIcon] = useState<string | undefined>(undefined);
  const [leagueInGameName, setLeagueInGameName] = useState<string | undefined>(undefined);
  const [leagueWinRate, setLeagueWinRate] = useState<number | undefined>(undefined);

  const currentPosts = activeTab === 'forYou' ? forYouPosts : followingPosts;

  const POSTS_PER_PAGE = 8;

  // Callback to register video players
  const handlePlayerReady = useCallback((postId: string, player: any) => {
    videoPlayers.current[postId] = player;
  }, []);


  // Reset feed state when user changes (e.g. sign out → sign in with different account)
  const prevUserIdRef = useRef<string | undefined>(currentUser?.id);
  useEffect(() => {
    if (currentUser?.id && currentUser.id !== prevUserIdRef.current) {
      setFollowingPosts([]);
      setForYouPosts([]);
      setFollowingUserIds([]);
      setLikedPosts(new Set());
      setLastDoc(null);
      setHasMore(true);
      setHasConsumedPreload(false);
      setLoading(true);
      setSelectedGameFilter(null);
    }
    prevUserIdRef.current = currentUser?.id;
  }, [currentUser?.id]);

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

  // Listen for unread messages count in real-time
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToUserChats(currentUser.id, (chats) => {
      const total = chats.reduce((sum, chat) => {
        return sum + (chat.unreadCount?.[currentUser.id] || 0);
      }, 0);
      setUnreadMessageCount(total);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Use preloaded following IDs if available, otherwise fetch
  useEffect(() => {
    if (preloadedFollowingIds) {
      setFollowingUserIds(preloadedFollowingIds);
      return;
    }

    const fetchFollowingUsers = async () => {
      if (!currentUser?.id) return;

      try {
        const followingData = await getFollowing(currentUser.id);
        let userIds = followingData.map(follow => follow.followingId);
        userIds = userIds.filter(id => id !== currentUser.id);
        setFollowingUserIds(userIds);
      } catch (error) {
        console.error('Error fetching following:', error);
      }
    };

    fetchFollowingUsers();
  }, [currentUser?.id, preloadedFollowingIds]);

  // Consume preloaded posts from AuthContext (already enriched with rank data)
  useEffect(() => {
    if (preloadedPosts && !hasConsumedPreload) {
      setFollowingPosts(preloadedPosts);
      setLoading(false);
      setHasConsumedPreload(true);
      clearPreloadedPosts();
    }
  }, [preloadedPosts, hasConsumedPreload, clearPreloadedPosts]);

  // Smart merge logic for newly followed user posts
  useEffect(() => {
    const enrichAndMergeNewPosts = async () => {
      if (!newlyFollowedUserPosts || !newlyFollowedUserId) return;

      console.log(`✅ Merging ${newlyFollowedUserPosts.length} posts from newly followed user:`, newlyFollowedUserId);

      // Enrich newly followed user posts with rank data
      const enrichedNewPosts = await Promise.all(
        newlyFollowedUserPosts.map(async (post) => {
          try {
            const userQuery = query(
              collection(db, 'users'),
              where('__name__', '==', post.userId)
            );
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();

              let leagueRank = undefined;
              let valorantRank = undefined;

              if (userData.riotStats?.rankedSolo) {
                leagueRank = `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`;
              }
              if (userData.valorantStats?.currentRank) {
                valorantRank = userData.valorantStats.currentRank;
              }

              return {
                ...post,
                avatar: userData.avatar || post.avatar || null,
                leagueRank,
                valorantRank
              };
            }
          } catch (error) {
            console.error(`Error enriching newly followed post ${post.id}:`, error);
          }

          return post;
        })
      );

      // Only merge if we're on the following tab
      if (activeTab === 'following') {
        setFollowingPosts(currentPosts => {
          // Combine new posts with existing posts
          const combined = [...currentPosts, ...enrichedNewPosts];

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
    };

    enrichAndMergeNewPosts();
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

      // Filter out archived posts
      allBatchPosts = allBatchPosts.filter(post => !(post as any).archived);

      // Apply game filter if selected
      let filteredPosts = allBatchPosts;
      if (selectedGameFilter) {
        filteredPosts = filteredPosts.filter(post => post.taggedGame === selectedGameFilter);
      }

      // Take only the number we need
      const postsToShow = filteredPosts.slice(0, POSTS_PER_PAGE);

      // Fetch user avatars and rank data for posts
      const postsWithAvatars = await Promise.all(
        postsToShow.map(async (post) => {
          try {
            const userQuery = query(
              collection(db, 'users'),
              where('__name__', '==', post.userId)
            );
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();

              // Get rank data for tier border
              let leagueRank = undefined;
              let valorantRank = undefined;

              if (userData.riotStats?.rankedSolo) {
                leagueRank = `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`;
              }
              if (userData.valorantStats?.currentRank) {
                valorantRank = userData.valorantStats.currentRank;
              }

              return {
                ...post,
                avatar: userData.avatar || post.avatar || null,
                leagueRank,
                valorantRank
              };
            }
          } catch (error) {
            console.error(`Error fetching data for user ${post.userId}:`, error);
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
    } else if (activeTab === 'following') {
      // No one followed — nothing to load, show empty state
      setLoading(false);
    } else if (preloadedPosts !== null && preloadedPosts.length === 0) {
      setLoading(false);
    }
  }, [currentUser?.id, followingUserIds, activeTab, selectedGameFilter, hasConsumedPreload, preloadedPosts]);

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

  // Fetch user's duo cards and in-game stats for posting
  useEffect(() => {
    const fetchDuoCards = async () => {
      if (!currentUser?.id) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.id);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Extract in-game stats
          if (userData.valorantStats?.card?.small) {
            setValorantInGameIcon(userData.valorantStats.card.small);
          }
          if (userData.valorantStats?.gameName) {
            const tagLine = userData.valorantAccount?.tag || '';
            setValorantInGameName(tagLine ? `${userData.valorantStats.gameName}#${tagLine}` : userData.valorantStats.gameName);
          }
          if (userData.valorantStats?.winRate !== undefined) {
            setValorantWinRate(userData.valorantStats.winRate);
          }
          if (userData.riotStats?.profileIconId) {
            setLeagueInGameIcon(`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${userData.riotStats.profileIconId}.png`);
          }
          if (userData.riotAccount?.gameName) {
            const tagLine = userData.riotAccount.tagLine || '';
            setLeagueInGameName(`${userData.riotAccount.gameName}#${tagLine}`);
          }
          if (userData.riotStats?.rankedSolo?.winRate !== undefined) {
            setLeagueWinRate(userData.riotStats.rankedSolo.winRate);
          }
        }

        // Load Valorant card
        const valorantCardDoc = await getDoc(doc(db, 'duoCards', `${currentUser.id}_valorant`));
        if (valorantCardDoc.exists()) {
          const cardData = valorantCardDoc.data();
          setValorantCard({
            game: 'valorant',
            username: cardData.username,
            currentRank: cardData.currentRank,
            region: cardData.region,
            mainRole: cardData.mainRole,
            peakRank: cardData.peakRank,
            mainAgent: cardData.mainAgent,
            lookingFor: cardData.lookingFor || 'Any',
          });
        }

        // Load League card
        const leagueCardDoc = await getDoc(doc(db, 'duoCards', `${currentUser.id}_league`));
        if (leagueCardDoc.exists()) {
          const cardData = leagueCardDoc.data();
          setLeagueCard({
            game: 'league',
            username: cardData.username,
            currentRank: cardData.currentRank,
            region: cardData.region,
            mainRole: cardData.mainRole,
            peakRank: cardData.peakRank,
            mainAgent: cardData.mainAgent,
            lookingFor: cardData.lookingFor || 'Any',
          });
        }
      } catch (error) {
        console.error('Error fetching duo cards:', error);
      }
    };

    fetchDuoCards();
  }, [currentUser?.id]);

  // Handle add new clip button
  const handleAddClip = () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to create a clip');
      return;
    }

    // Mark screen as unfocused to prevent videos from auto-playing
    setIsScreenFocused(false);

    // Stop all videos immediately by setting state
    setPlayingVideoId(null);

    // Pause all videos before opening modal
    Object.values(videoPlayers.current).forEach((player) => {
      if (player) {
        try {
          player.pause();
        } catch (error) {
          // Video already paused or unmounted
        }
      }
    });

    router.push('/postPages/createPostVideo');
  };

  // Handle when a new post is created
  const handlePostCreated = async (newPost: Post) => {
    // Enrich the new post with rank data for the current user
    try {
      if (currentUser?.id) {
        const userQuery = query(
          collection(db, 'users'),
          where('__name__', '==', currentUser.id)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();

          let leagueRank = undefined;
          let valorantRank = undefined;

          if (userData.riotStats?.rankedSolo) {
            leagueRank = `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`;
          }
          if (userData.valorantStats?.currentRank) {
            valorantRank = userData.valorantStats.currentRank;
          }

          newPost = {
            ...newPost,
            leagueRank,
            valorantRank
          };
        }
      }
    } catch (error) {
      console.error('Error enriching new post with rank data:', error);
    }

    // Add new post to the beginning of the following posts array (most recent first)
    setFollowingPosts(prevPosts => [newPost, ...prevPosts]);
    console.log('New post added to feed:', newPost.id);

    // Restore screen focus after post is created
    setIsScreenFocused(true);
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
      {/* Ambient background glow */}
      <View style={styles.backgroundGlow} pointerEvents="none">
        {/* Fixed shimmer band — diagonal gleam */}
        <View style={styles.shimmerBand} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.03)',
              'rgba(255, 255, 255, 0.065)',
              'rgba(255, 255, 255, 0.03)',
              'transparent',
            ]}
            locations={[0, 0.37, 0.5, 0.63, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        {/* Secondary fainter shimmer */}
        <View style={styles.shimmerBandSecondary} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.035)',
              'transparent',
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Following</ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/chatPages/chatList')}
            activeOpacity={0.7}
          >
            <IconSymbol size={27} name="bubble.left" color="#fff" />
            {unreadMessageCount > 0 && (
              <View style={styles.notificationBadge}>
                <ThemedText style={styles.notificationBadgeText}>
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <IconSymbol size={27} name="bell" color="#fff" />
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
        {/* Game Filter Buttons */}
        <View style={styles.gameFilterRow}>
          <TouchableOpacity onPress={() => setSelectedGameFilter(null)} style={styles.gameFilterBtn} activeOpacity={0.7}>
            <ThemedText style={[styles.gameFilterBtnText, selectedGameFilter === null && styles.gameFilterBtnTextActive]}>
              All
            </ThemedText>
            {selectedGameFilter === null && <View style={styles.gameFilterUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedGameFilter('valorant')} style={styles.gameFilterBtn} activeOpacity={0.7}>
            <ThemedText style={[styles.gameFilterBtnText, selectedGameFilter === 'valorant' && styles.gameFilterBtnTextActive]}>
              Valorant
            </ThemedText>
            {selectedGameFilter === 'valorant' && <View style={styles.gameFilterUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedGameFilter('league')} style={styles.gameFilterBtn} activeOpacity={0.7}>
            <ThemedText style={[styles.gameFilterBtnText, selectedGameFilter === 'league' && styles.gameFilterBtnTextActive]}>
              League
            </ThemedText>
            {selectedGameFilter === 'league' && <View style={styles.gameFilterUnderline} />}
          </TouchableOpacity>
        </View>

        {loading ? (
          <FeedSkeleton count={3} />
        ) : currentPosts.length > 0 ? (
          <>
            {currentPosts.map((post, index) => {
              const isTeaser = index === 7 && currentPosts.length === POSTS_PER_PAGE;

              const postContent = (
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
              );

              if (isTeaser) {
                return (
                  <View key={post.id} style={styles.teaserWrapper}>
                    {postContent}
                    <LinearGradient
                      colors={['rgba(30,33,36,0)', 'rgba(30,33,36,0.6)', 'rgba(30,33,36,1)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.teaserGradient}
                      pointerEvents="none"
                    />
                  </View>
                );
              }

              return postContent;
            })}
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
            <ThemedText style={styles.emptyTitle}>
              {activeTab === 'following'
                ? "Nothing here yet"
                : "No posts available"}
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {activeTab === 'following'
                ? "Follow people to see their clips"
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

      {/* Floating Add Clip Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={handleAddClip}
        activeOpacity={0.7}
      >
        <IconSymbol size={26} name="plus" color="#fff" />
      </TouchableOpacity>

      {/* Post Duo Card Modal */}
      <PostDuoCard
        visible={showNewPost}
        onClose={() => {
          setShowNewPost(false);
          setIsScreenFocused(true);
        }}
        onPostCreated={() => {
          setShowNewPost(false);
          setIsScreenFocused(true);
        }}
        valorantCard={valorantCard}
        leagueCard={leagueCard}
        userAvatar={currentUser?.avatar}
        valorantInGameIcon={valorantInGameIcon}
        valorantInGameName={valorantInGameName}
        valorantWinRate={valorantWinRate}
        leagueInGameIcon={leagueInGameIcon}
        leagueInGameName={leagueInGameName}
        leagueWinRate={leagueWinRate}
      />

      {/* Game Filter Bottom Sheet */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          style={styles.filterModalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable style={styles.filterModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.filterModalHandle} />
            <ThemedText style={styles.filterModalTitle}>FILTER BY GAME</ThemedText>

            <TouchableOpacity
              style={[styles.filterOption, selectedGameFilter === null && styles.filterOptionActive]}
              onPress={() => {
                setSelectedGameFilter(null);
                setShowFilterModal(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.filterOptionRadio}>
                {selectedGameFilter === null && <View style={styles.filterOptionRadioInner} />}
              </View>
              <ThemedText style={[styles.filterOptionText, selectedGameFilter === null && styles.filterOptionTextActive]}>
                ALL GAMES
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, selectedGameFilter === 'valorant' && styles.filterOptionActive]}
              onPress={() => {
                setSelectedGameFilter('valorant');
                setShowFilterModal(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.filterOptionRadio}>
                {selectedGameFilter === 'valorant' && <View style={styles.filterOptionRadioInner} />}
              </View>
              <ThemedText style={[styles.filterOptionText, selectedGameFilter === 'valorant' && styles.filterOptionTextActive]}>
                VALORANT
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, selectedGameFilter === 'league' && styles.filterOptionActive]}
              onPress={() => {
                setSelectedGameFilter('league');
                setShowFilterModal(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.filterOptionRadio}>
                {selectedGameFilter === 'league' && <View style={styles.filterOptionRadioInner} />}
              </View>
              <ThemedText style={[styles.filterOptionText, selectedGameFilter === 'league' && styles.filterOptionTextActive]}>
                LEAGUE
              </ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    top: -screenHeight * 0.35,
    left: -width * 0.6,
    width: width * 2.2,
    height: screenHeight * 1.7,
    transform: [{ rotate: '20deg' }],
  },
  shimmerBandSecondary: {
    position: 'absolute',
    top: -screenHeight * 0.2,
    left: -width * 0.1,
    width: width * 1.9,
    height: screenHeight * 1.5,
    transform: [{ rotate: '-15deg' }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 61,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerIconButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notificationBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 16,
  },
  tabScrollContainer: {
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },
  gameFilterRow: {
    flexDirection: 'row',
    gap: 20,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },
  gameFilterBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  gameFilterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  gameFilterBtnTextActive: {
    color: '#fff',
  },
  gameFilterUnderline: {
    marginTop: 4,
    height: 2,
    width: 20,
    borderRadius: 1,
    backgroundColor: '#C4A44E',
  },
  gameFilterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
  },
  gameFilterTabTextActive: {
    color: '#fff',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  filterModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  filterOptionActive: {},
  filterOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#2c2f33',
    borderWidth: 1,
    borderColor: '#2c2f33',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: 40,
  },
  tabActive: {
    backgroundColor: '#c42743',
    borderColor: '#c42743',
    shadowColor: '#c42743',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4.65,
    elevation: 8,
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
  gameTabShadow: {
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  gameTabShadowActive: {
    shadowColor: '#DC3D4B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  gameTab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#2c2f33',
    borderWidth: 1,
    borderColor: '#2c2f33',
    minHeight: 32,
    minWidth: 90,
    overflow: 'hidden',
  },
  gameTabActive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  gameTabGradient: {
    flex: 1,
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  gameTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  gameTabTextActive: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    paddingHorizontal: 28,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#555',
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
  teaserWrapper: {
    position: 'relative',
  },
  teaserGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    pointerEvents: 'none',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});