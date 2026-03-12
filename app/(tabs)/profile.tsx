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
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);
  const cardAnimations = useRef<Animated.Value[]>([]).current;
  const [achievements, setAchievements] = useState<{ partyName: string; game: string; placement: number; endDate: string }[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
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
  const [avatarError, setAvatarError] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0); // Key to force image reload

  // Cover photo loading state
  const [coverPhotoLoaded, setCoverPhotoLoaded] = useState(false);
  const [coverPhotoKey, setCoverPhotoKey] = useState(0); // Key to force image reload

  // Combined loading state - avatar, cover photo, and posts all loaded
  const [allContentLoaded, setAllContentLoaded] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

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
            recentMatches: ['+18', '+22', '-16', '+20', '-15'],
            valorantCard: valorantStats.card?.small,
            peakRank: valorantStats.peakRank?.tier,
          };
        }
        return null;
      })
      .filter((game): game is NonNullable<typeof game> => game !== null)
    : [];

  const userGames = userGamesBase;

  // Initialize card animations when userGames changes
  useEffect(() => {
    // Ensure we have the right number of animation values
    while (cardAnimations.length < userGames.length) {
      cardAnimations.push(new Animated.Value(0));
    }
    // Reset animations when games change
    cardAnimations.forEach(anim => anim.setValue(0));
  }, [userGames.length]);

  // Handle card press - Apple Wallet style focus
  const handleCardPress = (pressedIndex: number) => {
    const totalCards = userGames.length;

    if (focusedCardIndex !== null) {
      if (pressedIndex === focusedCardIndex) {
        // Clicking the focused card - navigate to game stats
        const game = userGames[pressedIndex];
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
      } else {
        // Clicking a non-focused card - collapse back to stack
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            300,
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity
          )
        );

        // Animate all cards back to original position
        const animations = cardAnimations.slice(0, totalCards).map(anim =>
          Animated.spring(anim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          })
        );
        Animated.parallel(animations).start();
        setFocusedCardIndex(null);
      }
    } else {
      // Clicking a new card - focus on it
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          300,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        )
      );

      // Focused card moves to back card position, others stack below
      const CARD_HEIGHT = 220;
      const STACK_OFFSET = 50;
      const GAP = 20; // Gap between focused card and pushed cards

      // Back card position (top of stack, closest to title)
      const backCardTopOffset = (totalCards - 1) * -STACK_OFFSET;

      // Focused card will move to back card position
      const focusedTargetTop = backCardTopOffset;
      const focusedBottomEdge = focusedTargetTop + CARD_HEIGHT;

      // Get all pushed card indices (sorted by index to maintain stack order)
      const pushedCardIndices: number[] = [];
      for (let i = 0; i < totalCards; i++) {
        if (i !== pressedIndex) pushedCardIndices.push(i);
      }

      const animations = cardAnimations.slice(0, totalCards).map((anim, index) => {
        // Current position of this card
        const thisReverseIndex = totalCards - 1 - index;
        const thisTopOffset = thisReverseIndex * -STACK_OFFSET;

        if (index === pressedIndex) {
          // Focused card moves to the back card's position (top)
          const moveAmount = focusedTargetTop - thisTopOffset;
          return Animated.spring(anim, {
            toValue: moveAmount,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          });
        } else {
          // Find this card's position in the pushed stack (0 = back/top, higher = front/bottom)
          const positionInPushedStack = pushedCardIndices.indexOf(index);

          // Target position: stacked below focused card with proper offsets
          const targetTop = focusedBottomEdge + GAP + (positionInPushedStack * STACK_OFFSET);
          const pushAmount = targetTop - thisTopOffset;

          return Animated.spring(anim, {
            toValue: pushAmount,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          });
        }
      });

      Animated.parallel(animations).start();
      setFocusedCardIndex(pressedIndex);
    }
  };

  // Collapse cards (for wallet button)
  const collapseCards = () => {
    if (focusedCardIndex !== null) {
      handleCardPress(focusedCardIndex);
    }
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

  // Fetch achievements (completed parties where user placed top 3)
  useEffect(() => {
    if (!user?.id) return;

    const fetchAchievements = async () => {
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

    fetchAchievements();
  }, [user?.id]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset all image loading states
    setPostImagesLoadedCount(0);
    setAllPostImagesLoaded(false);
    setAvatarLoaded(false);
    setAvatarError(false);
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
              onPress={() => router.push('/profilePages/settings')}
              activeOpacity={0.7}
            >
              <IconSymbol size={24} name="line.3.horizontal" color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Cover Photo Area */}
          <View style={styles.coverPhotoWrapper}>
            {user?.coverPhoto ? (
              <Image
                key={`cover-${coverPhotoKey}`}
                source={{ uri: `${user.coverPhoto}&t=${coverPhotoKey}` }}
                style={[styles.coverPhotoImage, { opacity: allContentLoaded ? 1 : 0 }]}
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
            {/* Top fade */}
            <LinearGradient
              colors={['rgba(15, 15, 15, 0.75)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeTop}
            />
            {/* Bottom fade */}
            <LinearGradient
              colors={['transparent', '#0f0f0f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeBottom}
            />
          </View>

          {/* Username Row with Profile Avatar on Right */}
          <View style={styles.usernameRow}>
            <ThemedText style={styles.largeUsername}>{user?.username || 'User'}</ThemedText>

            {/* Profile Avatar */}
            <TouchableOpacity
              style={styles.profileAvatarButton}
              onPress={() => router.push('/profilePages/settings')}
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
                        style={[styles.profileAvatarImage, { opacity: allContentLoaded ? 1 : 0 }]}
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
                      style={[styles.profileAvatarImage, { opacity: allContentLoaded ? 1 : 0 }]}
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

            {/* Messages */}
            <TouchableOpacity
              style={styles.socialIconButton}
              onPress={() => router.push('/chatPages/chatList')}
              activeOpacity={0.7}
            >
              <IconSymbol size={20} name="envelope.fill" color="#fff" />
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
                <IconSymbol size={18} name="play.rectangle.fill" color="#fff" />
                <ThemedText style={styles.sectionHeaderTitle}>Clips</ThemedText>
              </View>
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
              <IconSymbol size={18} name="star.fill" color="#fff" />
              <ThemedText style={styles.sectionHeaderTitle}>Rank Cards</ThemedText>
            </View>
          </View>

          {/* Rank Cards Content */}
          <View style={[styles.rankCardsSection, {
            marginBottom: focusedCardIndex !== null
              ? (userGames.length > 2 ? -60 : userGames.length > 1 ? -50 : 0)
              : (userGames.length > 2 ? 15 : userGames.length > 1 ? 20 : 25)
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
            </View>
          ) : (
            // Multiple Cards View - Apple Wallet style stacked cards
            (() => {
              const totalCards = userGames.length;
              const CARD_HEIGHT = 220;
              const STACK_OFFSET = 50; // How much each card peeks from behind
              const GAP = 20; // Gap between focused card and pushed cards

              // Calculate dynamic height based on focus state
              // When collapsed: just the front card height (back cards peek above with negative offset)
              // When focused: focused card + gap + pushed cards stacked below
              let containerHeight = CARD_HEIGHT; // Just the front card height when collapsed
              if (focusedCardIndex !== null) {
                // Focused card at top + gap + pushed cards (maintaining their stack peek)
                const pushedCardsCount = totalCards - 1;
                // Pushed cards: one full card height + peeking offsets for others
                const pushedStackHeight = pushedCardsCount > 0
                  ? CARD_HEIGHT + ((pushedCardsCount - 1) * STACK_OFFSET)
                  : 0;

                // Total: focused card + gap + pushed stack
                containerHeight = CARD_HEIGHT + GAP + pushedStackHeight;
              }

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

                      // Get animation value for this card (or create a default)
                      const animatedTranslateY = cardAnimations[index] || new Animated.Value(0);

                      // Calculate z-index: when focused, pushed cards need higher z-index to be tappable
                      let cardZIndex = index + 1;
                      if (focusedCardIndex !== null) {
                        if (index === focusedCardIndex) {
                          // Focused card gets lowest z-index (it's at top, doesn't need to be above others)
                          cardZIndex = 1;
                        } else {
                          // Pushed cards get higher z-index to ensure they're tappable
                          cardZIndex = totalCards + 1;
                        }
                      }

                      return (
                        <Animated.View
                          key={game.id}
                          style={[
                            styles.stackedCardItem,
                            {
                              bottom: 0,
                              top: topOffset,
                              transform: [
                                { scale },
                                { translateY: animatedTranslateY }
                              ],
                              zIndex: cardZIndex,
                            }
                          ]}
                        >
                          <TouchableOpacity
                            onPress={() => handleCardPress(index)}
                            activeOpacity={0.9}
                            style={{ width: '100%' }}
                          >
                            <RankCard game={game} username={displayUsername} viewOnly={true} />
                          </TouchableOpacity>
                        </Animated.View>
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
              <IconSymbol size={18} name="trophy.fill" color="#fff" />
              <ThemedText style={styles.sectionHeaderTitle}>Achievements</ThemedText>
            </View>
          </View>

          {/* Achievements Content */}
          <View style={styles.achievementsSection}>
            {loadingAchievements ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#c42743" />
                <ThemedText style={styles.emptyStateText}>Loading achievements...</ThemedText>
              </View>
            ) : achievements.length > 0 ? (
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
        enableVideoScrubber={false}
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
  },
  coverPhotoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  coverPhotoGradient: {
    width: '100%',
    height: '100%',
  },
  coverPhotoFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 1,
  },
  coverPhotoFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  // Username row with avatar
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  largeUsername: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    flex: 1,
    lineHeight: 36,
    paddingTop: 4,
  },
  // Profile avatar (next to username)
  profileAvatarButton: {
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
    marginBottom: 16,
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
    marginBottom: 20,
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
    paddingHorizontal: 12,
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
});
