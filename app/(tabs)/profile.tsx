import rankCard from '@/app/components/rankCard';

// Alias for JSX usage (React components must start with uppercase)
const RankCard = rankCard;
import NewPost from '@/app/components/newPost';
import PostViewerModal from '@/app/components/postViewerModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, query, Timestamp, where, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { getLeagueStats, getTftStats, formatRank } from '@/services/riotService';
import { getValorantStats } from '@/services/valorantService';
import { deletePostMedia } from '@/services/storageService';
import { deleteDoc } from 'firebase/firestore';
import { calculateTierBorderColor, calculateTierBorderGradient } from '@/utils/tierBorderUtils';
import { ProfilePageSkeleton } from '@/components/ui/Skeleton';
import GradientBorder from '@/components/GradientBorder';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 16;
const CARD_WIDTH = screenWidth - (CARD_PADDING * 2);

interface Post {
  id: string;
  userId: string;
  username: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video';
  mediaTypes?: string[];
  thumbnailUrl?: string;
  caption?: string;
  taggedUsers?: any[];
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
  duration?: number; // Video duration in seconds
}

// Helper function to format video duration
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams<{ refresh?: string }>();
  const { user, refreshUser, preloadedProfilePosts, preloadedRiotStats, clearPreloadedProfileData } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [achievements, setAchievements] = useState<{ partyName: string; game: string; placement: number; endDate: string }[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [tftStats, setTftStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [loadingRankCards, setLoadingRankCards] = useState(true);
  const [hasConsumedPreloadPosts, setHasConsumedPreloadPosts] = useState(false);
  const [hasConsumedPreloadRiot, setHasConsumedPreloadRiot] = useState(false);
  const [showSocialsDropdown, setShowSocialsDropdown] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Avatar loading state
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0); // Key to force image reload

  // Cover photo loading state
  const [coverPhotoLoaded, setCoverPhotoLoaded] = useState(false);
  const [coverPhotoKey, setCoverPhotoKey] = useState(0); // Key to force image reload

  // Combined loading state - all data fetched, ready to reveal everything together
  const [allContentLoaded, setAllContentLoaded] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Set avatar as loaded if it's not an image (emoji or letter)
  // Also increment avatarKey to force image reload when avatar changes
  useEffect(() => {
    if (!user?.avatar || !user.avatar.startsWith('http')) {
      setAvatarLoaded(true);
    } else {
      setAvatarLoaded(false);
      setAvatarError(false);
      setAvatarKey(prev => prev + 1); // Force image component to remount
    }
  }, [user?.avatar]);

  // Set cover photo as loaded if there's no cover photo (gradient)
  // Also increment coverPhotoKey to force image reload when cover photo changes
  useEffect(() => {
    if (!user?.coverPhoto) {
      setCoverPhotoLoaded(true);
    } else {
      setCoverPhotoLoaded(false);
      setCoverPhotoKey(prev => prev + 1); // Force image component to remount
    }
  }, [user?.coverPhoto]);

  // Coordinate all sections - reveal everything together once all data is fetched
  useEffect(() => {
    if (!loadingPosts && !loadingRankCards && !loadingAchievements) {
      console.log('✅ All profile content loaded, revealing together');
      // Small delay for images to paint
      setTimeout(() => {
        setAllContentLoaded(true);
      }, 50);
    }
  }, [loadingPosts, loadingRankCards, loadingAchievements]);

  // Timeout fallback - if data takes too long (4 seconds), reveal anyway
  useEffect(() => {
    if (!allContentLoaded && user?.id) {
      const timeout = setTimeout(() => {
        console.log('⏱️ Profile load timeout, revealing content');
        setAllContentLoaded(true);
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [allContentLoaded, user?.id]);

  // Debug logging - only when values change
  useEffect(() => {
    console.log('Profile - Riot Account:', riotAccount ? 'Set' : 'Not set');
    console.log('Profile - Valorant Account:', valorantAccount ? 'Set' : 'Not set');
    console.log('Profile - Riot Stats:', riotStats ? 'Set' : 'Not set');
    console.log('Profile - Valorant Stats:', valorantStats ? 'Set' : 'Not set');
    console.log('Profile - Enabled Rank Cards:', enabledRankCards);
  }, [riotAccount, valorantAccount, riotStats, valorantStats, enabledRankCards]);

  // Dynamic games array based on Riot data and enabled rank cards
  // Show rank cards if user has either Riot account OR Valorant account
  // Cards are ordered according to the enabledRankCards array
  const userGamesBase = (riotAccount || valorantAccount) ?
    enabledRankCards
      .map(gameType => {
        // League of Legends
        if (gameType === 'league' && riotStats) {
          return {
            id: 2,
            name: 'League of Legends',
            rank: riotStats.rankedSolo
              ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)
              : 'Unranked',
            trophies: riotStats.rankedSolo?.leaguePoints || 0,
            icon: '⚔️',
            image: require('@/assets/images/leagueoflegends.png'),
            wins: riotStats.rankedSolo?.wins || 0,
            losses: riotStats.rankedSolo?.losses || 0,
            winRate: riotStats.rankedSolo?.winRate || 0,
            recentMatches: ['+15', '-18', '+20', '+17', '-14'],
            profileIconId: riotStats.profileIconId,
          };
        }
        // TFT (Placeholder - TODO: Implement TFT API)
        if (gameType === 'tft') {
          return {
            id: 4,
            name: 'TFT',
            rank: 'Gold I',
            trophies: 45,
            icon: '♟️',
            image: require('@/assets/images/tft.png'),
            wins: 28,
            losses: 22,
            winRate: 56.0,
            recentMatches: ['+12', '-10', '+15', '+18', '-8'],
            profileIconId: riotStats?.profileIconId,
          };
        }
        // Valorant
        if (gameType === 'valorant' && valorantStats) {
          return {
            id: 3,
            name: 'Valorant',
            rank: valorantStats.currentRank || 'Unranked',
            trophies: valorantStats.rankRating || 0,
            icon: '🎯',
            image: require('@/assets/images/valorant-black.png'),
            wins: valorantStats.wins || 0,
            losses: valorantStats.losses || 0,
            winRate: valorantStats.winRate || 0,
            matchHistory: valorantStats.matchHistory || [],
            valorantCard: valorantStats.card?.small,
            peakRank: valorantStats.peakRank ? { tier: valorantStats.peakRank.tier, season: valorantStats.peakRank.season } : undefined,
            accountLevel: valorantStats.accountLevel,
            gamesPlayed: valorantStats.gamesPlayed,
            mmr: valorantStats.mmr,
            mostPlayedAgent: valorantStats.mostPlayedAgent,
          };
        }
        return null;
      })
      .filter((game): game is NonNullable<typeof game> => game !== null)
    : [];

  const userGames = userGamesBase;

  // Fetch Riot account and stats (League and TFT)
  // Lightweight function to only fetch enabled rank cards (no API calls)
  const fetchEnabledRankCards = async () => {
    if (!user?.id) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setEnabledRankCards(data.enabledRankCards || []);
      }
    } catch (error) {
      console.error('Error fetching enabled rank cards:', error);
    }
  };

  const fetchRiotData = async (forceRefresh: boolean = false) => {
    if (!user?.id) return;

    try {
      // Only show skeleton if we don't have any rank data yet
      if (!riotAccount && !valorantAccount) {
        setLoadingRankCards(true);
      }
      // Fetch Riot account info from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const data = userDoc.data();

        // Fetch enabled rank cards
        setEnabledRankCards(data.enabledRankCards || []);

        if (data.riotAccount) {
          setRiotAccount(data.riotAccount);

          // Load cached League stats from Firestore first
          if (data.riotStats) {
            console.log('Loading cached riot stats from Firestore');
            setRiotStats(data.riotStats);
          }

          // Fetch fresh League of Legends stats if account is linked
          try {
            console.log('Fetching fresh League stats, forceRefresh:', forceRefresh);
            const leagueResponse = await getLeagueStats(forceRefresh);
            console.log('League response:', leagueResponse);
            if (leagueResponse.success && leagueResponse.stats) {
              console.log('Setting fresh riot stats:', leagueResponse.stats);
              setRiotStats(leagueResponse.stats);
            } else {
              console.log('League stats not successful, using cached data');
            }
          } catch (error) {
            // Keep using cached data from Firestore
          }

          // TFT stats temporarily disabled - using placeholder data
          // TODO: Re-enable when needed
          console.log('TFT stats disabled - showing placeholder data');
        }

        // Fetch Valorant stats if account is linked
        if (data.valorantAccount) {
          setValorantAccount(data.valorantAccount);

          // Load cached Valorant stats from Firestore first
          if (data.valorantStats) {
            console.log('Loading cached valorant stats from Firestore');
            setValorantStats(data.valorantStats);
          }

          // Check if matchHistory is missing or empty from cached data - if so, force refresh
          const needsMatchHistoryRefresh = !data.valorantStats?.matchHistory ||
            !Array.isArray(data.valorantStats.matchHistory) ||
            data.valorantStats.matchHistory.length === 0;
          console.log('needsMatchHistoryRefresh:', needsMatchHistoryRefresh, 'cached matchHistory:', data.valorantStats?.matchHistory);

          try {
            const shouldForceRefresh = forceRefresh || needsMatchHistoryRefresh;
            console.log('Fetching fresh Valorant stats, forceRefresh:', shouldForceRefresh, 'needsMatchHistoryRefresh:', needsMatchHistoryRefresh);
            const valorantResponse = await getValorantStats(shouldForceRefresh);
            console.log('Valorant response:', valorantResponse);
            console.log('Match History from API:', valorantResponse.stats?.matchHistory);
            if (valorantResponse.success && valorantResponse.stats) {
              console.log('Setting fresh valorant stats:', valorantResponse.stats);
              console.log('Match History length:', valorantResponse.stats.matchHistory?.length);
              setValorantStats(valorantResponse.stats);
            } else {
              console.log('Valorant stats not successful, using cached data');
            }
          } catch (error) {
            console.error('Error fetching Valorant stats:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Riot data:', error);
    } finally {
      setLoadingRankCards(false);
    }
  };

  // Fetch user's posts from Firestore
  const fetchPosts = async () => {
    if (!user?.id) return;

    console.log('🔄 fetchPosts called');
    setLoadingPosts(true);
    try {
      // Fetch all posts with just the where clause (no orderBy in query to avoid index requirement)
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', user.id)
      );

      const querySnapshot = await getDocs(postsQuery);
      let fetchedPosts: Post[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));

      // Filter out archived posts and sort by newest first
      fetchedPosts = fetchedPosts
        .filter(post => !(post as any).archived)
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  // Consume preloaded profile posts from AuthContext (loaded during loading screen)
  useEffect(() => {
    if (preloadedProfilePosts && !hasConsumedPreloadPosts) {
      console.log('✅ Using preloaded profile posts from loading screen:', preloadedProfilePosts.length);
      // Filter out archived posts from preloaded data
      const nonArchivedPosts = preloadedProfilePosts.filter(post => !(post as any).archived);
      setPosts(nonArchivedPosts);
      setLoadingPosts(false);
      setHasConsumedPreloadPosts(true);
    }
  }, [preloadedProfilePosts, hasConsumedPreloadPosts]);

  // Consume preloaded Riot stats from AuthContext (loaded during loading screen)
  useEffect(() => {
    if (preloadedRiotStats && !hasConsumedPreloadRiot && user?.id) {
      console.log('✅ Using preloaded Riot stats from loading screen');
      setRiotStats(preloadedRiotStats);
      setHasConsumedPreloadRiot(true);

      // Also fetch and set riotAccount, valorantAccount, and enabledRankCards from Firestore so rank cards show
      (async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.id));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.riotAccount) {
              setRiotAccount(data.riotAccount);
            }
            setEnabledRankCards(data.enabledRankCards || []);

            // Load cached Valorant stats directly from Firestore (instant, no API call)
            if (data.valorantAccount) {
              setValorantAccount(data.valorantAccount);
              if (data.valorantStats) {
                console.log('Loading cached Valorant stats from Firestore');
                setValorantStats(data.valorantStats);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching riotAccount:', error);
        } finally {
          setLoadingRankCards(false);
        }
      })();
    }
  }, [preloadedRiotStats, hasConsumedPreloadRiot, user?.id]);

  // Clear preloaded data after consumption
  useEffect(() => {
    if (hasConsumedPreloadPosts && hasConsumedPreloadRiot) {
      clearPreloadedProfileData();
    }
  }, [hasConsumedPreloadPosts, hasConsumedPreloadRiot, clearPreloadedProfileData]);

  // Fetch Riot data and posts when component mounts (only if no preloaded data)
  useEffect(() => {
    if (user?.id) {
      // Only fetch Riot data if we didn't get preloaded stats
      if (!hasConsumedPreloadRiot && !preloadedRiotStats) {
        fetchRiotData();
      }
      // Only fetch posts if we didn't get preloaded posts
      if (!hasConsumedPreloadPosts && !preloadedProfilePosts) {
        fetchPosts();
      }
    }
  }, [user?.id, hasConsumedPreloadPosts, hasConsumedPreloadRiot, preloadedProfilePosts, preloadedRiotStats]);

  // Refresh user data when profile page comes into focus
  // This ensures following/followers counts and rank cards are always up-to-date
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        refreshUser();
        // Fetch rank cards and stats from Firestore cache (no API calls when forceRefresh=false)
        fetchRiotData(false);
      }
    }, [user?.id])
  );

  // Handle refresh parameter from linking pages
  // This forces a refresh of account data when returning from account linking
  useEffect(() => {
    if (refresh === 'true' && user?.id) {
      console.log('Refresh parameter detected, forcing data refresh');
      // Force refresh to get the newly linked account
      fetchRiotData(true);
      // Clear the refresh parameter by replacing the route without the param
      router.replace('/(tabs)/profile');
    }
  }, [refresh, user?.id]);

  // Fetch achievements (completed parties where user placed top 3)
  const fetchAchievements = async () => {
    if (!user?.id) return;

    setLoadingAchievements(true);
    try {
      const partiesRef = collection(db, 'parties');
      const partiesQuery = query(partiesRef, where('members', 'array-contains', user.id));
      const snapshot = await getDocs(partiesQuery);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const results: { partyName: string; game: string; placement: number; endDate: string }[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!data.endDate || !data.rankings) return;

        // Parse endDate (MM/DD/YYYY)
        const [month, day, year] = data.endDate.split('/').map(Number);
        const endDate = new Date(year, month - 1, day);
        if (endDate >= today) return; // Not completed yet

        // Find user's ranking
        const userRanking = data.rankings.find((r: any) => r.userId === user.id);
        if (userRanking && userRanking.rank >= 1 && userRanking.rank <= 3) {
          results.push({
            partyName: data.partyName,
            game: data.game,
            placement: userRanking.rank,
            endDate: data.endDate,
          });
        }
      });

      // Sort by placement (1st first), then by endDate (most recent first)
      results.sort((a, b) => a.placement - b.placement || b.endDate.localeCompare(a.endDate));
      setAchievements(results);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoadingAchievements(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchAchievements();
    }
  }, [user?.id]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset loading states to show skeletons
    setAllContentLoaded(false);
    setLoadingPosts(true);
    setLoadingRankCards(true);
    setLoadingAchievements(true);
    setAvatarLoaded(false);
    setAvatarError(false);
    setCoverPhotoLoaded(false);

    await refreshUser(); // Refresh user data from AuthContext
    await Promise.all([
      fetchRiotData(true), // Force refresh Riot data from API
      fetchPosts(), // Refresh posts
      fetchAchievements(), // Refresh achievements
    ]);
    setRefreshing(false);
  }, [user?.id]);

  const handleAddPost = () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    setShowNewPost(true);
  };

  const handlePostPress = (post: Post) => {
    const index = posts.findIndex(p => p.id === post.id);
    setSelectedPostIndex(index);
    setSelectedPost(post);
    setShowPostViewer(true);
  };

  const handleNavigatePost = (index: number) => {
    if (index >= 0 && index < posts.length) {
      setSelectedPostIndex(index);
      setSelectedPost(posts[index]);
    }
  };

  const closePostViewer = () => {
    setShowPostViewer(false);
    setSelectedPost(null);
  };

  const handleDeletePost = (post: Post) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all media files from Storage
              if (post.mediaUrls && post.mediaUrls.length > 0) {
                for (const mediaUrl of post.mediaUrls) {
                  await deletePostMedia(mediaUrl);
                }
              } else if (post.mediaUrl) {
                await deletePostMedia(post.mediaUrl);
              }

              // Delete thumbnail if exists
              if (post.thumbnailUrl) {
                await deletePostMedia(post.thumbnailUrl);
              }

              // Delete from Firestore
              await deleteDoc(doc(db, 'posts', post.id));

              // Decrement user's post count
              if (user?.id) {
                await updateDoc(doc(db, 'users', user.id), {
                  postsCount: increment(-1),
                });
                // Refresh user data to update the UI
                await refreshUser();
              }

              // Update local state
              setPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));

              Alert.alert('Success', 'Post deleted successfully');
            } catch (error: any) {
              console.error('Delete post error:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const handlePostCreated = (newPost: Post) => {
    // Add new post to the beginning of the posts array (most recent first)
    setPosts(prevPosts => [newPost, ...prevPosts]);
    console.log('New post added to local state:', newPost.id);
  };

  const handleCommentAdded = () => {
    // Update comment count locally instead of refetching all posts
    if (selectedPost) {
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === selectedPost.id
            ? { ...post, commentsCount: (post.commentsCount ?? 0) + 1 }
            : post
        )
      );
      // Also update the selected post in the modal
      setSelectedPost(prev =>
        prev ? { ...prev, commentsCount: (prev.commentsCount ?? 0) + 1 } : null
      );
    }
  };

  const handleEditCaption = async (post: Post, newCaption: string) => {
    try {
      // Update in Firestore
      await updateDoc(doc(db, 'posts', post.id), {
        caption: newCaption,
      });

      // Update local state
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === post.id ? { ...p, caption: newCaption } : p
        )
      );

      // Also update the selected post in the modal if it's the same post
      if (selectedPost?.id === post.id) {
        setSelectedPost(prev =>
          prev ? { ...prev, caption: newCaption } : null
        );
      }
    } catch (error) {
      console.error('Error updating caption:', error);
      Alert.alert('Error', 'Failed to update caption');
    }
  };

  const handleArchivePost = (post: Post) => {
    Alert.alert(
      'Archive Post',
      'This post will be hidden from your profile. You can view archived posts in your settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              // Update post in Firestore to mark as archived
              await updateDoc(doc(db, 'posts', post.id), {
                archived: true,
              });

              // Mark that we're removing a post (to prevent loading state reset)
              isRemovingPost.current = true;

              // Remove from local state (hide from profile)
              setPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));

              // Close the post viewer modal
              closePostViewer();

              Alert.alert('Success', 'Post archived successfully');
            } catch (error: any) {
              console.error('Archive post error:', error);
              Alert.alert('Error', 'Failed to archive post');
            }
          },
        },
      ]
    );
  };

  // Calculate tier border color based on current ranks
  const tierBorderColor = calculateTierBorderColor(
    riotStats?.rankedSolo ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank) : undefined,
    valorantStats?.currentRank
  );

  // Calculate tier border gradient based on current ranks
  const tierBorderGradient = calculateTierBorderGradient(
    riotStats?.rankedSolo ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank) : undefined,
    valorantStats?.currentRank
  );

  // Interpolate scroll position to create overlap effect
  const profileCardTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -60],
    extrapolate: 'clamp',
  });

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c42743"
            colors={['#c42743']}
          />
        }
      >
        {/* Header Section - New Design */}
        <View style={styles.headerSection}>
          {/* Top Header Icons */}
          <View style={styles.headerIconsRow}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.7}
            >
              <IconSymbol size={26} name="plus" color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerIconsSpacer} />
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/chatPages/chatList')}
              activeOpacity={0.7}
            >
              <IconSymbol size={22} name="paperplane.fill" color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/profilePages/settings')}
              activeOpacity={0.7}
            >
              <IconSymbol size={24} name="line.3.horizontal" color="#fff" />
            </TouchableOpacity>
          </View>

          {!allContentLoaded ? (
            <ProfilePageSkeleton />
          ) : (
          <>
          {/* Cover Photo Area */}
          <View style={styles.coverPhotoWrapper}>
            {user?.coverPhoto ? (
              <Image
                key={`cover-${coverPhotoKey}`}
                source={{ uri: `${user.coverPhoto}&t=${coverPhotoKey}` }}
                style={styles.coverPhotoImage}
                onLoad={() => setCoverPhotoLoaded(true)}
                onError={() => setCoverPhotoLoaded(true)}
              />
            ) : (
              <LinearGradient
                colors={['#2c2f33', '#0f0f0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.coverPhotoGradient}
              />
            )}
            {/* Bottom fade - subtle blend into background */}
            <LinearGradient
              colors={['transparent', 'rgba(15, 15, 15, 0.6)', '#0f0f0f']}
              locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeBottom}
            />
            {/* Username overlaid on cover photo */}
            <ThemedText style={styles.coverPhotoUsername}>{user?.username || 'User'}</ThemedText>

            {/* Profile Avatar - positioned bottom-right, half overlapping */}
            <TouchableOpacity
              style={styles.profileAvatarButton}
              onPress={() => setShowAvatarModal(true)}
              activeOpacity={0.7}
            >
              {tierBorderGradient ? (
                <GradientBorder
                  colors={tierBorderGradient}
                  borderWidth={2}
                  borderRadius={28}
                >
                  <View style={styles.profileAvatarCircleWithGradient}>
                    {user?.avatar && user.avatar.startsWith('http') && !avatarError ? (
                      <Image
                        key={`avatar-${avatarKey}`}
                        source={{ uri: `${user.avatar}&t=${avatarKey}` }}
                        style={styles.profileAvatarImage}
                        onLoad={() => setAvatarLoaded(true)}
                        onError={() => {
                          setAvatarLoaded(true);
                          setAvatarError(true);
                        }}
                      />
                    ) : (
                      <ThemedText style={styles.profileAvatarInitial}>
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                      </ThemedText>
                    )}
                  </View>
                </GradientBorder>
              ) : (
                <View style={styles.profileAvatarCircle}>
                  {user?.avatar && user.avatar.startsWith('http') && !avatarError ? (
                    <Image
                      key={`avatar-${avatarKey}`}
                      source={{ uri: `${user.avatar}&t=${avatarKey}` }}
                      style={styles.profileAvatarImage}
                      onLoad={() => setAvatarLoaded(true)}
                      onError={() => {
                        setAvatarLoaded(true);
                        setAvatarError(true);
                      }}
                    />
                  ) : (
                    <ThemedText style={styles.profileAvatarInitial}>
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Followers / Following Row */}
          <View style={styles.followStatsRow}>
            <TouchableOpacity
              style={styles.followStatItem}
              onPress={() => router.push('/profilePages/followers')}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.followStatNumber}>{user?.followersCount || 0}</ThemedText>
              <ThemedText style={styles.followStatLabel}> Followers</ThemedText>
            </TouchableOpacity>
            <View style={styles.followStatDivider} />
            <TouchableOpacity
              style={styles.followStatItem}
              onPress={() => router.push('/profilePages/following')}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.followStatNumber}>{user?.followingCount || 0}</ThemedText>
              <ThemedText style={styles.followStatLabel}> Following</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Social Icons Row with Edit Profile */}
          <View style={styles.socialIconsRow}>
            {/* Instagram */}
            <TouchableOpacity
              style={[styles.socialIconButton, !user?.instagramLink && styles.socialIconInactive]}
              onPress={async () => {
                if (user?.instagramLink) {
                  try {
                    const username = user.instagramLink.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
                    const appUrl = `instagram://user?username=${username}`;
                    const webUrl = `https://instagram.com/${username}`;
                    const supported = await Linking.canOpenURL(appUrl);
                    if (supported) {
                      await Linking.openURL(appUrl);
                    } else {
                      await Linking.openURL(webUrl);
                    }
                  } catch (error) {
                    Alert.alert('Error', 'Failed to open Instagram');
                  }
                } else {
                  Alert.alert('Not Configured', 'Add your Instagram username in Edit Profile');
                }
              }}
              activeOpacity={0.7}
            >
              <Image
                source={require('@/assets/images/instagram.png')}
                style={styles.socialIconImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Discord */}
            <TouchableOpacity
              style={[styles.socialIconButton, !user?.discordLink && styles.socialIconInactive]}
              onPress={async () => {
                if (user?.discordLink) {
                  try {
                    await Clipboard.setStringAsync(user.discordLink);
                    Alert.alert('Copied!', `Discord username "${user.discordLink}" copied to clipboard`);
                  } catch (error) {
                    Alert.alert('Error', 'Failed to copy Discord username');
                  }
                } else {
                  Alert.alert('Not Configured', 'Add your Discord username in Edit Profile');
                }
              }}
              activeOpacity={0.7}
            >
              <Image
                source={require('@/assets/images/discord.png')}
                style={styles.socialIconImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Edit Profile */}
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => router.push('/profilePages/editProfile')}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.editProfileButtonText}>Edit Profile</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Bio Section */}
          {user?.bio && (
            <View style={styles.bioSection}>
              <ThemedText style={styles.bioText}>{user.bio}</ThemedText>
            </View>
          )}

          {/* Content Section */}
          <View>
            {/* Clips Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <ThemedText style={styles.sectionHeaderTitle}>Clips</ThemedText>
              </View>
              {posts.length > 0 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => router.push('/profilePages/clips')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.viewAllButtonText}>View All</ThemedText>
                  <IconSymbol size={14} name="chevron.right" color="#666" />
                </TouchableOpacity>
              )}
            </View>

          {/* Clips Content */}
          <View style={styles.clipsSection}>
          {posts.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalClipsContainer}
            >
              {posts.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.horizontalClipItem}
                  onPress={() => handlePostPress(post)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: post.mediaType === 'video' && post.thumbnailUrl ? post.thumbnailUrl : post.mediaUrl }}
                    style={styles.horizontalClipImage}
                    resizeMode="cover"
                  />
                  {post.mediaType === 'video' && (
                    <View style={styles.videoDuration}>
                      <ThemedText style={styles.videoDurationText}>
                        {formatDuration(post.duration)}
                      </ThemedText>
                    </View>
                  )}
                  {post.mediaUrls && post.mediaUrls.length > 1 && (
                    <View style={styles.multipleIndicator}>
                      <IconSymbol size={18} name="square.on.square" color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyClipsIcons}>
                <View style={styles.emptyClipsIconCircle}>
                  <IconSymbol size={18} name="photo.fill" color="#72767d" />
                </View>
                <View style={[styles.emptyClipsIconCircle, styles.emptyClipsIconCircleCenter]}>
                  <IconSymbol size={22} name="video.fill" color="#fff" />
                </View>
                <View style={styles.emptyClipsIconCircle}>
                  <IconSymbol size={18} name="sparkles" color="#72767d" />
                </View>
              </View>
              <ThemedText style={styles.emptyStateTitle}>Share your clips</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Post your best gaming moments
              </ThemedText>
              <TouchableOpacity
                style={styles.addClipButton}
                onPress={() => setShowNewPost(true)}
                activeOpacity={0.7}
              >
                <IconSymbol size={10} name="plus" color="#666" />
                <ThemedText style={styles.addClipButtonText}>Add Clip</ThemedText>
              </TouchableOpacity>
            </View>
          )}
          </View>

          {/* Rank Cards Section Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <ThemedText style={styles.sectionHeaderTitle}>Rank Cards</ThemedText>
            </View>
          </View>

          {/* Rank Cards Content */}
          <View style={[styles.rankCardsSection, {
            marginBottom: userGames.length > 2 ? 15 : userGames.length > 1 ? 20 : 25
          }]}>
          {!riotAccount && !valorantAccount ? (
            // Empty state for new users
            <View style={styles.emptyState}>
              <View style={styles.emptyGameLogos}>
                <View style={styles.emptyGameLogoCircle}>
                  <Image
                    source={require('@/assets/images/valorant-logo.png')}
                    style={styles.emptyGameLogo}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.emptyGameLogoCircle, styles.emptyGameLogoCircleCenter]}>
                  <Image
                    source={require('@/assets/images/riotgames.png')}
                    style={styles.emptyGameLogoLarge}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.emptyGameLogoCircle}>
                  <Image
                    source={require('@/assets/images/leagueoflegends.png')}
                    style={styles.emptyGameLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <ThemedText style={styles.emptyStateTitle}>Show off your rank</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Link your Riot account to display your Valorant and League of Legends ranks on your profile
              </ThemedText>
              <TouchableOpacity
                style={styles.addRankCardEmptyButton}
                onPress={() => router.push('/profilePages/newRankCard')}
                activeOpacity={0.8}
              >
                <IconSymbol size={10} name="link" color="#666" />
                <ThemedText style={styles.addRankCardEmptyText}>Link Account</ThemedText>
              </TouchableOpacity>
            </View>
          ) : userGames.length === 1 ? (
            // Single Card View - clickable to open game stats
            <View style={styles.verticalRankCardsContainer}>
              {(() => {
                const game = userGames[0];
                let displayUsername = user?.username || 'User';

                if (game.name === 'Valorant' && valorantAccount) {
                  displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                  displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                }

                return (
                  <View
                    key={game.id}
                    style={styles.verticalCardWrapper}
                  >
                    <RankCard game={game} username={displayUsername} viewOnly={false} isFocused={true} />
                  </View>
                );
              })()}
            </View>
          ) : (
            // Multiple Cards View - Apple Wallet style stacked cards
            (() => {
              const totalCards = userGames.length;
              const CARD_HEIGHT = 240;
              const STACK_OFFSET = 50; // How much each card peeks from behind

              // Container height: just the front card height (back cards peek above with negative offset)
              const containerHeight = CARD_HEIGHT;

              // Calculate top margin to prevent cards from overlapping the title
              // Back cards have negative offsets, so we need margin to compensate
              const stackMarginTop = (totalCards - 1) * STACK_OFFSET;

              return (
                <View style={[styles.verticalRankCardsContainer, { paddingBottom: 0 }]}>
                  <View style={[styles.stackedCardsWrapper, { height: containerHeight, marginTop: stackMarginTop }]}>
                    {userGames.map((game, index) => {
                      // Use appropriate account username based on game
                      let displayUsername = user?.username || 'User';

                      if (game.name === 'Valorant' && valorantAccount) {
                        displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                      } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                        displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                      }

                      // Calculate stacking offset - cards behind peek from above
                      const reverseIndex = totalCards - 1 - index;
                      const topOffset = reverseIndex * -STACK_OFFSET;
                      const scale = 1 - (reverseIndex * 0.02);

                      // z-index: front card (last in array) has highest z-index
                      const cardZIndex = index + 1;

                      return (
                        <View
                          key={game.id}
                          style={[
                            styles.stackedCardItem,
                            {
                              bottom: 0,
                              top: topOffset,
                              transform: [{ scale }],
                              zIndex: cardZIndex,
                            }
                          ]}
                        >
                          {/* All cards can open modal directly from stacked position */}
                          <View style={{ width: '100%' }}>
                            <RankCard game={game} username={displayUsername} viewOnly={false} isFocused={true} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()
          )}
          </View>

          {/* Achievements Section Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <ThemedText style={styles.sectionHeaderTitle}>Achievements</ThemedText>
            </View>
          </View>

          {/* Achievements Content */}
          <View style={styles.achievementsSection}>
            {achievements.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalAchievementsContainer}
              >
                {achievements.map((achievement, index) => (
                  <View key={index} style={styles.achievementCard}>
                    <ThemedText style={styles.achievementMedal}>
                      {achievement.placement === 1 ? '\u{1F947}' : achievement.placement === 2 ? '\u{1F948}' : '\u{1F949}'}
                    </ThemedText>
                    <ThemedText style={styles.achievementPlacement}>
                      {achievement.placement === 1 ? '1st Place' : achievement.placement === 2 ? '2nd Place' : '3rd Place'}
                    </ThemedText>
                    <ThemedText style={styles.achievementPartyName} numberOfLines={2}>
                      {achievement.partyName}
                    </ThemedText>
                    <ThemedText style={styles.achievementGame}>
                      {achievement.game}
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol size={36} name="trophy" color="#72767d" />
                <ThemedText style={styles.emptyStateTitle}>No achievements yet</ThemedText>
                <ThemedText style={styles.emptyStateSubtext}>
                  Place top 3 in a party to earn achievements
                </ThemedText>
              </View>
            )}
          </View>

          </View>
          </>
          )}
        </View>
      </Animated.ScrollView>

      {/* Post Viewer Modal */}
      <PostViewerModal
        visible={showPostViewer}
        post={selectedPost}
        posts={posts}
        currentIndex={selectedPostIndex}
        userAvatar={user?.avatar}
        onClose={closePostViewer}
        onNavigate={handleNavigatePost}
        onCommentAdded={handleCommentAdded}
        onDelete={handleDeletePost}
        onEditCaption={handleEditCaption}
        onArchive={handleArchivePost}
      />

      {/* New Post Modal */}
      <NewPost
        visible={showNewPost}
        onClose={() => setShowNewPost(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={styles.createModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <TouchableOpacity
            style={styles.createModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View style={styles.createModalHandle} />

            {/* Title */}
            <ThemedText style={styles.createModalTitle}>Create</ThemedText>

            {/* Divider */}
            <View style={styles.createModalDivider} />

            {/* Options */}
            <TouchableOpacity
              style={styles.createModalOption}
              onPress={() => {
                setShowCreateModal(false);
                setShowNewPost(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.createModalIconWrapper}>
                <IconSymbol size={24} name="play.rectangle" color="#fff" />
              </View>
              <ThemedText style={styles.createModalOptionText}>Clip</ThemedText>
            </TouchableOpacity>

            <View style={styles.createModalOptionDivider} />

            <TouchableOpacity
              style={styles.createModalOption}
              onPress={() => {
                setShowCreateModal(false);
                router.push('/profilePages/newRankCard');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.createModalIconWrapper}>
                <IconSymbol size={24} name="rectangle.stack.badge.plus" color="#fff" />
              </View>
              <ThemedText style={styles.createModalOptionText}>Rank Card</ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Avatar Preview Modal */}
      <Modal
        visible={showAvatarModal}
        animationType="none"
        transparent={true}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <TouchableOpacity
          style={styles.avatarModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarModal(false)}
        >
          <View style={styles.avatarModalContent}>
            {tierBorderGradient ? (
              <GradientBorder
                colors={tierBorderGradient}
                borderWidth={4}
                borderRadius={100}
              >
                <View style={styles.avatarModalCircleWithGradient}>
                  {user?.avatar && user.avatar.startsWith('http') && !avatarError ? (
                    <Image
                      source={{ uri: `${user.avatar}&t=${avatarKey}` }}
                      style={styles.avatarModalImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <ThemedText style={styles.avatarModalInitial}>
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
              </GradientBorder>
            ) : (
              <View style={styles.avatarModalCircle}>
                {user?.avatar && user.avatar.startsWith('http') && !avatarError ? (
                  <Image
                    source={{ uri: `${user.avatar}&t=${avatarKey}` }}
                    style={styles.avatarModalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <ThemedText style={styles.avatarModalInitial}>
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </ThemedText>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  headerSection: {
    backgroundColor: '#0f0f0f',
    paddingTop: 50,
  },
  // Header icons row
  headerIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerIconsSpacer: {
    flex: 1,
  },
  headerIconButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIconButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Cover photo area
  coverPhotoWrapper: {
    width: '100%',
    height: 200,
    backgroundColor: '#2c2f33',
    overflow: 'visible',
    zIndex: 2,
  },
  coverPhotoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  coverPhotoGradient: {
    width: '100%',
    height: '100%',
  },
  coverPhotoFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 1,
  },
  coverPhotoUsername: {
    position: 'absolute',
    bottom: 8,
    left: 20,
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    opacity: 1,
    zIndex: 2,
    lineHeight: 34,
    includeFontPadding: false,
  },
  // Profile avatar - absolutely positioned bottom-right of cover photo, half overlapping
  profileAvatarButton: {
    position: 'absolute',
    bottom: -28,
    right: 20,
    zIndex: 4,
  },
  profileAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2c2f33',
  },
  profileAvatarCircleWithGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  profileAvatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  // Followers / Following row
  followStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  followStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followStatNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  followStatLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#72767d',
  },
  followStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#72767d',
    marginHorizontal: 12,
  },
  // Social icons row
  socialIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 6,
    gap: 12,
  },
  socialIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconInactive: {
    opacity: 0.4,
  },
  socialIconImage: {
    width: 20,
    height: 20,
  },
  editProfileButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c42743',
  },
  // Small avatar on the right
  smallAvatarButton: {
  },
  smallAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2c2f33',
  },
  smallAvatarCircleWithGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  smallAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Category tabs
  categoryTabsContainer: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  categoryTab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2c2f33',
    borderWidth: 1,
    borderColor: '#36393e',
  },
  categoryTabActive: {
    backgroundColor: 'transparent',
    borderColor: '#fff',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b9bbbe',
  },
  categoryTabTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  categoryTabIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2c2f33',
    borderWidth: 1,
    borderColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bio section
  bioSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#b9bbbe',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  walletViewButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#36393e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#424549',
  },
  addClipsButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#36393e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#424549',
  },
  clipsSection: {
    marginBottom: 20,
  },
  rankCardsSection: {
    marginBottom: 20,
  },
  horizontalClipsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  horizontalClipItem: {
    width: 200,
    height: 120,
    backgroundColor: '#36393e',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  horizontalClipImage: {
    width: '100%',
    height: '100%',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    paddingHorizontal: 0,
  },
  postItem: {
    width: (screenWidth - 4) / 3,
    height: ((screenWidth - 4) / 3) * 1.3,
    backgroundColor: '#36393e',
    position: 'relative',
    borderRadius: 4,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoDurationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  multipleIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  emptyGameLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: -8,
  },
  emptyGameLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f0f0f',
  },
  emptyGameLogoCircleCenter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#c42743',
    zIndex: 1,
  },
  emptyGameLogo: {
    width: 20,
    height: 20,
    tintColor: '#72767d',
  },
  emptyGameLogoLarge: {
    width: 26,
    height: 26,
  },
  emptyClipsIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: -8,
  },
  emptyClipsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f0f0f',
  },
  emptyClipsIconCircleCenter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#c42743',
    zIndex: 1,
  },
  addClipsEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addClipsEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#72767d',
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#b9bbbe',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 240,
  },
  addClipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  addClipButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  addRankCardEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  addRankCardEmptyText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  verticalRankCardsContainer: {
    paddingHorizontal: 6,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 16,
  },
  stackedCardsWrapper: {
    position: 'relative',
    height: 320,
    width: '100%',
  },
  stackedCardItem: {
    position: 'absolute',
    width: '100%',
    left: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 8,
      height: 12,
    },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#36393e',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#424549',
  },
  collapseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  verticalCardWrapper: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 8,
      height: 12,
    },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
  },
  addRankCardCardVertical: {
    width: '100%',
    height: 180,
    backgroundColor: '#2c2f33',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#424549',
    borderStyle: 'dashed',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 8,
      height: 12,
    },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 14,
  },
  addRankCardContent: {
    alignItems: 'center',
    gap: 12,
  },
  addRankCardText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  addRankCardSubtext: {
    fontSize: 14,
    color: '#72767d',
  },
  popoverOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 999,
  },
  socialsPopover: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    marginLeft: -100,
    marginBottom: 8,
    width: 200,
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 1000,
  },
  popoverArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2c2f33',
  },
  socialDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  socialDropdownIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  instagramIconContainer: {
    borderColor: '#E4405F',
  },
  discordIconContainer: {
    borderColor: '#5865F2',
  },
  socialDropdownIcon: {
    width: 20,
    height: 20,
  },
  socialDropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  socialDropdownSubtitle: {
    fontSize: 12,
    color: '#b9bbbe',
  },
  socialNotConfigured: {
    borderColor: '#424549',
    opacity: 0.5,
  },
  achievementsSection: {
    marginBottom: 20,
  },
  horizontalAchievementsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  achievementCard: {
    width: 140,
    height: 140,
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderTopColor: '#3a3f44',
    borderLeftColor: '#3a3f44',
    borderBottomColor: '#16191b',
    borderRightColor: '#16191b',
  },
  achievementMedal: {
    fontSize: 32,
    marginBottom: 6,
  },
  achievementPlacement: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  achievementPartyName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b9bbbe',
    textAlign: 'center',
    lineHeight: 14,
  },
  achievementGame: {
    fontSize: 10,
    fontWeight: '600',
    color: '#72767d',
    marginTop: 4,
  },
  // Create Modal styles
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  createModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  createModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  createModalDivider: {
    height: 1,
    backgroundColor: '#333',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  createModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 16,
  },
  createModalIconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createModalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  createModalOptionDivider: {
    height: 1,
    backgroundColor: '#252525',
    marginLeft: 72,
  },
  // Avatar Modal styles
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarModalCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#2c2f33',
    overflow: 'hidden',
  },
  avatarModalCircleWithGradient: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarModalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  avatarModalInitial: {
    fontSize: 72,
    fontWeight: '700',
    color: '#fff',
  },
});
