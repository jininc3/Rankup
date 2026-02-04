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
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLeagueStats, getTftStats, formatRank } from '@/services/riotService';
import { getValorantStats } from '@/services/valorantService';
import { deletePostMedia } from '@/services/storageService';
import { deleteDoc } from 'firebase/firestore';
import { calculateTierBorderColor, calculateTierBorderGradient } from '@/utils/tierBorderUtils';
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
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cardsExpanded, setCardsExpanded] = useState(false);
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [tftStats, setTftStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [hasConsumedPreloadPosts, setHasConsumedPreloadPosts] = useState(false);
  const [hasConsumedPreloadRiot, setHasConsumedPreloadRiot] = useState(false);
  const [showSocialsDropdown, setShowSocialsDropdown] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Post images loading state
  const [postImagesLoadedCount, setPostImagesLoadedCount] = useState(0);
  const [allPostImagesLoaded, setAllPostImagesLoaded] = useState(false);

  // Avatar loading state
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  // Cover photo loading state
  const [coverPhotoLoaded, setCoverPhotoLoaded] = useState(false);

  // Combined loading state - avatar, cover photo, and posts all loaded
  const [allContentLoaded, setAllContentLoaded] = useState(false);

  // Track if this is the first time loading the profile
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [hasCheckedFirstLoad, setHasCheckedFirstLoad] = useState(false);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Check if this is the first load
  useEffect(() => {
    const checkFirstLoad = async () => {
      try {
        const hasLoadedBefore = await AsyncStorage.getItem('profile_loaded_before');
        if (hasLoadedBefore === 'true') {
          setIsFirstLoad(false);
          setAllContentLoaded(true); // Show content instantly if not first load
        }
        setHasCheckedFirstLoad(true);
      } catch (error) {
        console.error('Error checking first load:', error);
        setHasCheckedFirstLoad(true);
      }
    };

    checkFirstLoad();
  }, []);

  // Mark profile as loaded after first successful load
  useEffect(() => {
    if (allContentLoaded && isFirstLoad && hasCheckedFirstLoad) {
      AsyncStorage.setItem('profile_loaded_before', 'true').catch(error => {
        console.error('Error saving first load flag:', error);
      });
    }
  }, [allContentLoaded, isFirstLoad, hasCheckedFirstLoad]);

  // Track when all post images are loaded
  useEffect(() => {
    if (posts.length > 0 && postImagesLoadedCount >= posts.length) {
      setAllPostImagesLoaded(true);
    } else if (posts.length === 0) {
      setAllPostImagesLoaded(true);
    }
  }, [postImagesLoadedCount, posts.length]);

  // Reset all loading states when posts change
  useEffect(() => {
    setPostImagesLoadedCount(0);
    setAllPostImagesLoaded(false);
    setAllContentLoaded(false);
  }, [posts]);

  // Set avatar as loaded if it's not an image (emoji or letter)
  useEffect(() => {
    if (!user?.avatar || !user.avatar.startsWith('http')) {
      setAvatarLoaded(true);
    } else {
      setAvatarLoaded(false);
    }
  }, [user?.avatar]);

  // Set cover photo as loaded if there's no cover photo (gradient)
  useEffect(() => {
    if (!user?.coverPhoto) {
      setCoverPhotoLoaded(true);
    } else {
      setCoverPhotoLoaded(false);
    }
  }, [user?.coverPhoto]);

  // Coordinate avatar, cover photo, and posts loading - reveal together (only on first load)
  useEffect(() => {
    if (!hasCheckedFirstLoad) return; // Wait until we've checked first load status

    // If not first load, show content immediately
    if (!isFirstLoad) {
      setAllContentLoaded(true);
      return;
    }

    // On first load, wait for all content to load
    console.log('Loading status - Avatar:', avatarLoaded, 'Cover:', coverPhotoLoaded, 'Posts:', allPostImagesLoaded);
    if (avatarLoaded && coverPhotoLoaded && allPostImagesLoaded) {
      console.log('✅ All content loaded, revealing together');
      setTimeout(() => {
        setAllContentLoaded(true);
      }, 50);
    }
  }, [avatarLoaded, coverPhotoLoaded, allPostImagesLoaded, isFirstLoad, hasCheckedFirstLoad]);

  // Timeout fallback - if images take too long (3 seconds), reveal anyway (only on first load)
  useEffect(() => {
    if (!allContentLoaded && user?.id && isFirstLoad && hasCheckedFirstLoad) {
      const timeout = setTimeout(() => {
        setAllContentLoaded(true);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [allContentLoaded, user?.id, isFirstLoad, hasCheckedFirstLoad]);

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
  const userGames = (riotAccount || valorantAccount) ?
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
            recentMatches: ['+18', '+22', '-16', '+20', '-15'],
            valorantCard: valorantStats.card?.small,
            peakRank: valorantStats.peakRank?.tier,
          };
        }
        return null;
      })
      .filter((game): game is NonNullable<typeof game> => game !== null)
    : [];

  // Toggle card stack expansion
  const toggleCardExpansion = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setCardsExpanded(!cardsExpanded);
  };

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
            console.error('Error fetching League stats, using cached data:', error);
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

          try {
            console.log('Fetching fresh Valorant stats, forceRefresh:', forceRefresh);
            const valorantResponse = await getValorantStats(forceRefresh);
            console.log('Valorant response:', valorantResponse);
            if (valorantResponse.success && valorantResponse.stats) {
              console.log('Setting fresh valorant stats:', valorantResponse.stats);
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

      // Sort by newest first
      fetchedPosts = fetchedPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

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
      setPosts(preloadedProfilePosts);
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

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset all image loading states
    setPostImagesLoadedCount(0);
    setAllPostImagesLoaded(false);
    setAvatarLoaded(false);
    setCoverPhotoLoaded(false);
    setAllContentLoaded(false);
    // Treat pull-to-refresh like a first load (wait for images)
    setIsFirstLoad(true);

    await refreshUser(); // Refresh user data from AuthContext
    await fetchRiotData(true); // Force refresh Riot data from API
    await fetchPosts(); // Refresh posts
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
              setPosts(posts.filter(p => p.id !== post.id));

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
        {/* Header Section with Cover Photo */}
        <View style={styles.headerSection}>
          {/* Cover Photo with Gradient Overlay */}
          <View style={styles.coverPhotoWrapper}>
            {user?.coverPhoto ? (
              <Image
                source={{ uri: user.coverPhoto }}
                style={[styles.coverPhotoImage, { opacity: allContentLoaded ? 1 : 0 }]}
                onLoad={() => setCoverPhotoLoaded(true)}
                onError={() => setCoverPhotoLoaded(true)}
              />
            ) : (
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coverPhotoGradient}
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(30, 33, 36, 0.8)']}
              style={styles.coverPhotoOverlay}
            />
          </View>

          {/* Header Icons */}
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/chatPages/chatList')}
            >
              <View style={styles.iconButtonBg}>
                <IconSymbol size={22} name="paperplane.fill" color="#fff" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/profilePages/settings')}
            >
              <View style={styles.iconButtonBg}>
                <IconSymbol size={24} name="gearshape.fill" color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Animated Content Wrapper - slides over cover photo on scroll */}
          <Animated.View
            style={{
              transform: [{ translateY: profileCardTranslateY }],
            }}
          >
            {/* Profile Info Card */}
            <View style={styles.profileCard}>
            {/* Top Row: Avatar on Left, Username + Stats on Right */}
            <View style={styles.profileTopRow}>
              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                {tierBorderGradient ? (
                  <GradientBorder
                    colors={tierBorderGradient}
                    borderWidth={2}
                    borderRadius={35}
                  >
                    <View style={styles.avatarCircleWithGradient}>
                      {user?.avatar && user.avatar.startsWith('http') ? (
                        <Image
                          source={{ uri: user.avatar }}
                          style={[styles.avatarImage, { opacity: allContentLoaded ? 1 : 0 }]}
                          onLoad={() => setAvatarLoaded(true)}
                          onError={() => setAvatarLoaded(true)}
                        />
                      ) : (
                        <ThemedText style={styles.avatarInitial}>
                          {user?.avatar || user?.username?.[0]?.toUpperCase() || 'U'}
                        </ThemedText>
                      )}
                    </View>
                  </GradientBorder>
                ) : (
                  <View style={styles.avatarCircle}>
                    {user?.avatar && user.avatar.startsWith('http') ? (
                      <Image
                        source={{ uri: user.avatar }}
                        style={[styles.avatarImage, { opacity: allContentLoaded ? 1 : 0 }]}
                        onLoad={() => setAvatarLoaded(true)}
                        onError={() => setAvatarLoaded(true)}
                      />
                    ) : (
                      <ThemedText style={styles.avatarInitial}>
                        {user?.avatar || user?.username?.[0]?.toUpperCase() || 'U'}
                      </ThemedText>
                    )}
                  </View>
                )}
              </View>

              {/* Right Side: Username and Stats */}
              <View style={styles.profileRightSide}>
                <ThemedText style={styles.username}>{user?.username || 'User'}</ThemedText>

                {/* Stats in individual cards */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statNumber}>{posts.length}</ThemedText>
                    <ThemedText style={styles.statLabel}>Posts</ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() => router.push('/profilePages/followers')}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.statNumber}>{user?.followersCount || 0}</ThemedText>
                    <ThemedText style={styles.statLabel}>Followers</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() => router.push('/profilePages/following')}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.statNumber}>{user?.followingCount || 0}</ThemedText>
                    <ThemedText style={styles.statLabel}>Following</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Bio Row */}
            {user?.bio ? (
              <ThemedText style={styles.bioText}>{user.bio}</ThemedText>
            ) : (
              <ThemedText style={styles.emptyBioText}>No bio added yet</ThemedText>
            )}

            {/* Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push('/profilePages/editProfile')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#D64350', '#C42743', '#B22038']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.editButtonGradient}
                >
                  <IconSymbol size={14} name="pencil" color="#fff" />
                  <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.socialsButtonContainer}>
                <TouchableOpacity
                  style={styles.socialsButton}
                  onPress={() => setShowSocialsDropdown(!showSocialsDropdown)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#40444b', '#36393e', '#32353a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.socialsButtonGradient}
                  >
                    <IconSymbol size={14} name="link" color="#fff" />
                    <ThemedText style={styles.socialsButtonText}>Socials</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Socials Popover */}
                {showSocialsDropdown && (
                  <>
                    {/* Dismiss overlay */}
                    <TouchableOpacity
                      style={styles.popoverOverlay}
                      activeOpacity={1}
                      onPress={() => setShowSocialsDropdown(false)}
                    />
                    <View style={styles.socialsPopover}>
                      {/* Arrow pointing down */}
                      <View style={styles.popoverArrow} />
                {/* Instagram */}
                <TouchableOpacity
                  style={styles.socialDropdownOption}
                  onPress={async () => {
                    setShowSocialsDropdown(false);
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
                        console.error('Error opening Instagram:', error);
                        Alert.alert('Error', 'Failed to open Instagram');
                      }
                    } else {
                      Alert.alert('Not Configured', 'Add your Instagram username in Edit Profile');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.socialDropdownIconContainer, styles.instagramIconContainer, !user?.instagramLink && styles.socialNotConfigured]}>
                    <Image
                      source={require('@/assets/images/instagram.png')}
                      style={styles.socialDropdownIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.socialDropdownTitle}>Instagram</ThemedText>
                    <ThemedText style={styles.socialDropdownSubtitle}>
                      {user?.instagramLink
                        ? user.instagramLink.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
                        : 'Not configured'}
                    </ThemedText>
                  </View>
                </TouchableOpacity>

                {/* Discord */}
                <TouchableOpacity
                  style={styles.socialDropdownOption}
                  onPress={async () => {
                    setShowSocialsDropdown(false);
                    if (user?.discordLink) {
                      try {
                        await Clipboard.setStringAsync(user.discordLink);
                        Alert.alert(
                          'Copied!',
                          `Discord username "${user.discordLink}" copied to clipboard`,
                          [{ text: 'OK' }]
                        );
                      } catch (error) {
                        console.error('Error copying to clipboard:', error);
                        Alert.alert('Error', 'Failed to copy Discord username');
                      }
                    } else {
                      Alert.alert('Not Configured', 'Add your Discord username in Edit Profile');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.socialDropdownIconContainer, styles.discordIconContainer, !user?.discordLink && styles.socialNotConfigured]}>
                    <Image
                      source={require('@/assets/images/discord.png')}
                      style={styles.socialDropdownIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.socialDropdownTitle}>Discord</ThemedText>
                    <ThemedText style={styles.socialDropdownSubtitle}>
                      {user?.discordLink || 'Not configured'}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={styles.shareButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#40444b', '#36393e', '#32353a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.shareButtonGradient}
                >
                  <IconSymbol size={16} name="square.and.arrow.up" color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

            {/* Clips Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <IconSymbol size={18} name="play.rectangle.fill" color="#fff" />
                <ThemedText style={styles.sectionHeaderTitle}>Clips</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.addClipsButton}
                onPress={handleAddPost}
                activeOpacity={0.7}
              >
                <IconSymbol size={20} name="plus" color="#fff" />
              </TouchableOpacity>
            </View>

          {/* Clips Content */}
          <View style={styles.clipsSection}>
          {loadingPosts ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#c42743" />
              <ThemedText style={styles.emptyStateText}>Loading posts...</ThemedText>
            </View>
          ) : posts.length > 0 ? (
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
                    style={[
                      styles.horizontalClipImage,
                      { opacity: allContentLoaded ? 1 : 0 }
                    ]}
                    resizeMode="cover"
                    onLoad={() => setPostImagesLoadedCount(prev => prev + 1)}
                    onError={() => setPostImagesLoadedCount(prev => prev + 1)}
                  />
                  {allContentLoaded && post.mediaType === 'video' && (
                    <View style={styles.videoDuration}>
                      <ThemedText style={styles.videoDurationText}>
                        {formatDuration(post.duration)}
                      </ThemedText>
                    </View>
                  )}
                  {allContentLoaded && post.mediaUrls && post.mediaUrls.length > 1 && (
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
                  <IconSymbol size={28} name="photo.fill" color="#72767d" />
                </View>
                <View style={[styles.emptyClipsIconCircle, styles.emptyClipsIconCircleCenter]}>
                  <IconSymbol size={36} name="video.fill" color="#fff" />
                </View>
                <View style={styles.emptyClipsIconCircle}>
                  <IconSymbol size={28} name="sparkles" color="#72767d" />
                </View>
              </View>
              <ThemedText style={styles.emptyStateTitle}>Share your clips</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Post your best gaming moments, highlights, and achievements
              </ThemedText>
              <TouchableOpacity
                style={styles.addClipsEmptyButton}
                onPress={() => setShowNewPost(true)}
                activeOpacity={0.8}
              >
                <IconSymbol size={20} name="plus" color="#fff" />
                <ThemedText style={styles.addClipsEmptyText}>Create Post</ThemedText>
              </TouchableOpacity>
            </View>
          )}
          </View>

          {/* Rank Cards Section Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <IconSymbol size={18} name="star.fill" color="#fff" />
              <ThemedText style={styles.sectionHeaderTitle}>Rank Cards</ThemedText>
            </View>
            <View style={styles.sectionHeaderRight}>
              {/* Wallet View button - shown when cards are expanded */}
              {cardsExpanded && userGames.length > 1 && (
                <TouchableOpacity
                  style={styles.walletViewButton}
                  onPress={toggleCardExpansion}
                  activeOpacity={0.7}
                >
                  <IconSymbol size={20} name="creditcard.fill" color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.addClipsButton}
                onPress={() => router.push('/profilePages/newRankCard')}
                activeOpacity={0.7}
              >
                <IconSymbol size={20} name="plus" color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Rank Cards Content */}
          <View style={styles.rankCardsSection}>
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
                <IconSymbol size={20} name="link" color="#fff" />
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

                const handleSingleCardPress = () => {
                  if (game.name === 'Valorant') {
                    router.push({
                      pathname: '/components/valorantGameStats',
                      params: { game: JSON.stringify(game) },
                    });
                  } else if (game.name === 'League of Legends' || game.name === 'TFT') {
                    router.push({
                      pathname: '/components/leagueGameStats',
                      params: { game: JSON.stringify(game) },
                    });
                  }
                };

                return (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.verticalCardWrapper}
                    onPress={handleSingleCardPress}
                    activeOpacity={0.9}
                  >
                    <RankCard game={game} username={displayUsername} viewOnly={true} />
                  </TouchableOpacity>
                );
              })()}

              {/* Add Rank Card Button */}
              <TouchableOpacity
                style={styles.addRankCardCardVertical}
                onPress={() => router.push('/profilePages/newRankCard')}
                activeOpacity={0.7}
              >
                <View style={styles.addRankCardContent}>
                  <IconSymbol size={56} name="plus.circle.fill" color="#c42743" />
                  <ThemedText style={styles.addRankCardText}>Add Rank Card</ThemedText>
                  <ThemedText style={styles.addRankCardSubtext}>Connect another game</ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            // Multiple Cards View - stacked/expandable
            <View style={styles.verticalRankCardsContainer}>
              {!cardsExpanded ? (
                // Stacked Cards View (Apple Wallet style)
                <TouchableOpacity
                  style={styles.stackedCardsWrapper}
                  onPress={toggleCardExpansion}
                  activeOpacity={0.9}
                >
                  {userGames.map((game, index) => {
                    // Use appropriate account username based on game
                    let displayUsername = user?.username || 'User';

                    if (game.name === 'Valorant' && valorantAccount) {
                      displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                    } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                      displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                    }

                    // Calculate stacking offset - stack downwards (cards behind peek from above)
                    const totalCards = userGames.length;
                    const reverseIndex = totalCards - 1 - index;
                    const topOffset = reverseIndex * -50; // Negative to stack upwards from bottom, increased spacing
                    const scale = 1 - (reverseIndex * 0.02);

                    return (
                      <View
                        key={game.id}
                        style={[
                          styles.stackedCardItem,
                          {
                            bottom: 0,
                            top: topOffset,
                            transform: [{ scale }],
                            zIndex: index + 1, // First card has lowest z-index, last card highest
                          }
                        ]}
                        pointerEvents="none"
                      >
                        <RankCard game={game} username={displayUsername} viewOnly={true} />
                      </View>
                    );
                  })}
                </TouchableOpacity>
              ) : (
                // Expanded Cards View
                <>
                  {/* Individual Cards */}
                  {userGames.map((game) => {
                    // Use appropriate account username based on game
                    let displayUsername = user?.username || 'User';

                    if (game.name === 'Valorant' && valorantAccount) {
                      displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                    } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                      displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                    }

                    return (
                      <View key={game.id} style={styles.verticalCardWrapper}>
                        <RankCard game={game} username={displayUsername} viewOnly={false} />
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          )}
          </View>
          </Animated.View>
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
        enableVideoScrubber={false}
      />

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
  headerSection: {
    position: 'relative',
  },
  coverPhotoWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  coverPhotoImage: {
    width: '100%',
    height: '100%',
  },
  coverPhotoGradient: {
    width: '100%',
    height: '100%',
  },
  coverPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  headerIcons: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  headerIconButton: {
    position: 'relative',
  },
  walletViewButtonInTab: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#36393e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#424549',
    marginBottom: 4,
  },
  iconButtonBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  profileCard: {
    marginTop: -24,
    marginHorizontal: 0,
    backgroundColor: '#1e2124',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 12,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  avatarWrapper: {
    marginTop: 0,
  },
  profileRightSide: {
    flex: 1,
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2c2f33',
  },
  avatarCircleWithGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  statDivider: {
    display: 'none',
  },
  bioText: {
    fontSize: 12,
    color: '#b9bbbe',
    textAlign: 'left',
    lineHeight: 16,
    marginBottom: 10,
  },
  emptyBioText: {
    fontSize: 12,
    color: '#72767d',
    textAlign: 'left',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#b9bbbe',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 6,
  },
  editButton: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  socialsButtonContainer: {
    flex: 1,
    position: 'relative',
  },
  socialsButton: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  socialsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 6,
  },
  socialsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  shareButton: {
    width: 33,
    height: 33,
    borderRadius: 6,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
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
    width: 160,
    height: 160,
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
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyGameLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: -12,
  },
  emptyGameLogoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e2124',
  },
  emptyGameLogoCircleCenter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#c42743',
    zIndex: 1,
  },
  emptyGameLogo: {
    width: 32,
    height: 32,
    tintColor: '#72767d',
  },
  emptyGameLogoLarge: {
    width: 40,
    height: 40,
  },
  emptyClipsIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: -12,
  },
  emptyClipsIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e2124',
  },
  emptyClipsIconCircleCenter: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    backgroundColor: '#c42743',
    borderRadius: 12,
  },
  addClipsEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#b9bbbe',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  addRankCardEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#c42743',
    borderRadius: 12,
  },
  addRankCardEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  verticalRankCardsContainer: {
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 16,
  },
  stackedCardsWrapper: {
    position: 'relative',
    height: 320,
    width: '100%',
    marginTop: 46,
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
});
