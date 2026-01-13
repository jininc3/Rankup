import rankCard from '@/app/components/rankCard';

// Alias for JSX usage (React components must start with uppercase)
const RankCard = rankCard;
import NewPost from '@/app/components/newPost';
import PostFilterModal from '@/app/profilePages/postFilterModal';
import PostViewerModal from '@/app/components/postViewerModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, query, Timestamp, where, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, LayoutAnimation, Platform, UIManager } from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
  const { user, refreshUser, preloadedProfilePosts, preloadedRiotStats, clearPreloadedProfileData } = useAuth();
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState<'rankCards' | 'clips'>('clips');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'newest' | 'oldest' | 'most_viewed' | 'most_liked'>('newest');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null); // null means "All Games"
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const iconScrollViewRef = useRef<ScrollView>(null);
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [tftStats, setTftStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [hasConsumedPreloadPosts, setHasConsumedPreloadPosts] = useState(false);
  const [hasConsumedPreloadRiot, setHasConsumedPreloadRiot] = useState(false);
  const [showSocialsSheet, setShowSocialsSheet] = useState(false);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

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
  const userGames = (riotAccount || valorantAccount) ? [
    // League of Legends - only show if enabled and has stats
    ...(enabledRankCards.includes('league') && riotStats ? [{
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
    }] : []),
    // TFT - only show if enabled (Placeholder - TODO: Implement TFT API)
    ...(enabledRankCards.includes('tft') ? [{
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
    }] : []),
    // Valorant - only show if enabled and has stats
    ...(enabledRankCards.includes('valorant') && valorantStats ? [{
      id: 3,
      name: 'Valorant',
      rank: valorantStats.currentRank || 'Unranked',
      trophies: valorantStats.rankRating || 0,
      icon: '🎯',
      image: require('@/assets/images/valorant.png'),
      wins: valorantStats.wins || 0,
      losses: valorantStats.losses || 0,
      winRate: valorantStats.winRate || 0,
      recentMatches: ['+18', '+22', '-16', '+20', '-15'],
      valorantCard: valorantStats.card?.small, // Valorant player card URL
      peakRank: valorantStats.peakRank?.tier,
    }] : []),
  ] : [];

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    // Allow scrolling to add rank card (userGames.length is the index of the add card)
    if (index !== selectedGameIndex && index >= 0 && index <= userGames.length) {
      setSelectedGameIndex(index);
    }
  };

  const handleScrollDrag = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    // Allow scrolling to add rank card (userGames.length is the index of the add card)
    if (index !== selectedGameIndex && index >= 0 && index <= userGames.length) {
      setSelectedGameIndex(index);
    }
  };

  const scrollToIndex = (index: number) => {
    // Configure smooth layout animation for border transition
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    // Update state for smooth border transition
    setSelectedGameIndex(index);

    // Scroll the cards view
    scrollViewRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });

    // Scroll the icon view to center the selected icon
    const ICON_WIDTH = 48 + 12; // icon circle (48) + gap (12)
    const ICON_OFFSET = index * ICON_WIDTH - (screenWidth / 2) + (ICON_WIDTH / 2);
    iconScrollViewRef.current?.scrollTo({
      x: Math.max(0, ICON_OFFSET),
      animated: true,
    });
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

      // Filter by game if a game filter is selected
      if (selectedGameFilter) {
        fetchedPosts = fetchedPosts.filter(post => post.taggedGame === selectedGameFilter);
      }

      // Sort client-side based on selected filter
      if (selectedFilter === 'newest') {
        fetchedPosts = fetchedPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      } else if (selectedFilter === 'oldest') {
        fetchedPosts = fetchedPosts.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
      } else if (selectedFilter === 'most_liked') {
        fetchedPosts = fetchedPosts.sort((a, b) => b.likes - a.likes);
      } else if (selectedFilter === 'most_viewed') {
        // Placeholder: would need a views field in the future
        fetchedPosts = fetchedPosts.sort((a, b) => b.likes - a.likes);
      }

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

  // Refetch posts when filter or game filter changes
  useEffect(() => {
    if (user?.id) {
      console.log('📊 Filter changed - selectedFilter:', selectedFilter, 'selectedGameFilter:', selectedGameFilter);
      // Reset preload flag when filters change so we fetch fresh data
      setHasConsumedPreloadPosts(false);
      fetchPosts();
    }
  }, [selectedFilter, selectedGameFilter]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
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

  const handleFilterChange = (filter: 'newest' | 'oldest' | 'most_viewed' | 'most_liked', gameFilter: string | null) => {
    setSelectedFilter(filter);
    setSelectedGameFilter(gameFilter);
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

  return (
    <ThemedView style={styles.container}>
      {/* Post Filter Modal */}
      <PostFilterModal
        visible={showFilterMenu}
        onClose={() => setShowFilterMenu(false)}
        selectedFilter={selectedFilter}
        selectedGameFilter={selectedGameFilter}
        onFilterChange={handleFilterChange}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
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
              <Image source={{ uri: user.coverPhoto }} style={styles.coverPhotoImage} />
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

          {/* Profile Info Card */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              {tierBorderGradient ? (
                <GradientBorder
                  colors={tierBorderGradient}
                  borderWidth={4}
                  borderRadius={50}
                >
                  <View style={styles.avatarCircleWithGradient}>
                    {user?.avatar && user.avatar.startsWith('http') ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
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
                    <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarInitial}>
                      {user?.avatar || user?.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
              )}
            </View>

            {/* Username */}
            <ThemedText style={styles.username}>{user?.username || 'User'}</ThemedText>

            {/* Bio */}
            {user?.bio ? (
              <ThemedText style={styles.bioText}>{user.bio}</ThemedText>
            ) : (
              <ThemedText style={styles.emptyBioText}>No bio added yet</ThemedText>
            )}

            {/* Stats Cards Row */}
            <View style={styles.statsCardsRow}>
              <View style={styles.statCard}>
                <ThemedText style={styles.statNumber}>{posts.length}</ThemedText>
                <ThemedText style={styles.statLabel}>Posts</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => router.push('/profilePages/followers')}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.statNumber}>{user?.followersCount || 0}</ThemedText>
                <ThemedText style={styles.statLabel}>Followers</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statCard}
                onPress={() => router.push('/profilePages/following')}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.statNumber}>{user?.followingCount || 0}</ThemedText>
                <ThemedText style={styles.statLabel}>Following</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push('/profilePages/editProfile')}
                activeOpacity={0.8}
              >
                <IconSymbol size={18} name="pencil" color="#fff" />
                <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialsButton}
                onPress={() => setShowSocialsSheet(true)}
                activeOpacity={0.8}
              >
                <IconSymbol size={18} name="link" color="#fff" />
                <ThemedText style={styles.socialsButtonText}>Socials</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                activeOpacity={0.8}
              >
                <IconSymbol size={20} name="square.and.arrow.up" color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeMainTab === 'clips' && styles.tabActive]}
            onPress={() => setActiveMainTab('clips')}
            activeOpacity={0.7}
          >
            <IconSymbol
              size={20}
              name="play.rectangle.fill"
              color={activeMainTab === 'clips' ? '#c42743' : '#72767d'}
            />
            <ThemedText style={[styles.tabText, activeMainTab === 'clips' && styles.tabTextActive]}>
              Clips
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeMainTab === 'rankCards' && styles.tabActive]}
            onPress={() => setActiveMainTab('rankCards')}
            activeOpacity={0.7}
          >
            <IconSymbol
              size={20}
              name="star.fill"
              color={activeMainTab === 'rankCards' ? '#c42743' : '#72767d'}
            />
            <ThemedText style={[styles.tabText, activeMainTab === 'rankCards' && styles.tabTextActive]}>
              Rank Cards
            </ThemedText>
          </TouchableOpacity>

          {activeMainTab === 'clips' && (
            <TouchableOpacity
              style={styles.filterIconButton}
              onPress={() => setShowFilterMenu(true)}
              activeOpacity={0.7}
            >
              <IconSymbol size={20} name="line.3.horizontal.decrease.circle" color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Clips Tab Content */}
        <View style={[styles.tabContent, { display: activeMainTab === 'clips' ? 'flex' : 'none' }]}>
          {loadingPosts ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#c42743" />
              <ThemedText style={styles.emptyStateText}>Loading posts...</ThemedText>
            </View>
          ) : posts.length > 0 ? (
            <View style={styles.postsGrid}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() => handlePostPress(post)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: post.mediaType === 'video' && post.thumbnailUrl ? post.thumbnailUrl : post.mediaUrl }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                  {post.mediaType === 'video' && (
                    <>
                      <View style={styles.playIconOverlay}>
                        <IconSymbol size={32} name="play.fill" color="#fff" />
                      </View>
                      <View style={styles.videoDuration}>
                        <ThemedText style={styles.videoDurationText}>
                          {formatDuration(post.duration)}
                        </ThemedText>
                      </View>
                    </>
                  )}
                  {post.mediaUrls && post.mediaUrls.length > 1 && (
                    <View style={styles.multipleIndicator}>
                      <IconSymbol size={18} name="square.on.square" color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <IconSymbol size={48} name="photo.stack" color="#72767d" />
              </View>
              <ThemedText style={styles.emptyStateTitle}>No clips yet</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Share your best gaming moments with the community
              </ThemedText>
            </View>
          )}
        </View>

        {/* RankCards Tab Content */}
        <View style={[styles.tabContent, { display: activeMainTab === 'rankCards' ? 'flex' : 'none' }]}>
          {!riotAccount && !valorantAccount ? (
            // Empty state for new users
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <IconSymbol size={48} name="star.fill" color="#72767d" />
              </View>
              <ThemedText style={styles.emptyStateTitle}>No rank cards yet</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Connect your gaming accounts to display your ranks
              </ThemedText>
              <TouchableOpacity
                style={styles.addRankCardEmptyButton}
                onPress={() => router.push('/profilePages/newRankCard')}
                activeOpacity={0.8}
              >
                <IconSymbol size={20} name="plus.circle.fill" color="#fff" />
                <ThemedText style={styles.addRankCardEmptyText}>Add Rank Card</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Game Icon Selector */}
              <ScrollView
                ref={iconScrollViewRef}
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
                {/* Add Rank Card Icon */}
                <TouchableOpacity
                  style={styles.gameIconContainer}
                  onPress={() => scrollToIndex(userGames.length)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.gameIconCircle,
                    selectedGameIndex === userGames.length && styles.gameIconCircleActive
                  ]}>
                    <IconSymbol
                      size={24}
                      name="plus.circle.fill"
                      color={selectedGameIndex === userGames.length ? "#c42743" : "#72767d"}
                    />
                  </View>
                </TouchableOpacity>
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
                {userGames.map((game, index) => {
                  // Use appropriate account username based on game
                  let displayUsername = user?.username || 'User';

                  if (game.name === 'Valorant' && valorantAccount) {
                    displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                  } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                    displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                  }

                  return (
                    <View
                      key={game.id}
                      style={[
                        styles.cardWrapper,
                        {
                          width: CARD_WIDTH,
                          marginRight: CARD_GAP
                        }
                      ]}
                    >
                      <RankCard game={game} username={displayUsername} />
                    </View>
                  );
                })}
                {/* Add Rank Card Button */}
                <TouchableOpacity
                  style={[styles.cardWrapper, styles.addRankCardCard, { width: CARD_WIDTH }]}
                  onPress={() => router.push('/profilePages/newRankCard')}
                  activeOpacity={0.7}
                >
                  <View style={styles.addRankCardContent}>
                    <IconSymbol size={56} name="plus.circle.fill" color="#c42743" />
                    <ThemedText style={styles.addRankCardText}>Add Rank Card</ThemedText>
                    <ThemedText style={styles.addRankCardSubtext}>Connect another game</ThemedText>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Add Post Button - only visible on Clips tab */}
      {activeMainTab === 'clips' && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleAddPost}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#c42743', '#a81f35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <IconSymbol size={30} name="plus" color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

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

      {/* Socials Bottom Sheet */}
      <Modal
        visible={showSocialsSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSocialsSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSocialsSheet(false)}
        >
          <View style={styles.bottomSheet}>
            <TouchableOpacity activeOpacity={1}>
              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHandle} />
                <ThemedText style={styles.sheetTitle}>Socials</ThemedText>
              </View>

              {/* Social Links */}
              <View style={styles.socialLinksContainer}>
                {/* Instagram */}
                <TouchableOpacity
                  style={styles.socialOption}
                  onPress={async () => {
                    setShowSocialsSheet(false);
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
                  <View style={styles.socialOptionLeft}>
                    <View style={[styles.instagramIconContainer, !user?.instagramLink && styles.socialNotConfigured]}>
                      <Image
                        source={require('@/assets/images/instagram.png')}
                        style={styles.socialOptionIcon}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.socialOptionTitle}>Instagram</ThemedText>
                      <ThemedText style={styles.socialOptionSubtitle}>
                        {user?.instagramLink
                          ? user.instagramLink.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
                          : 'Not configured'}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Discord */}
                <TouchableOpacity
                  style={styles.socialOption}
                  onPress={async () => {
                    setShowSocialsSheet(false);
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
                  <View style={styles.socialOptionLeft}>
                    <View style={[styles.discordIconContainer, !user?.discordLink && styles.socialNotConfigured]}>
                      <Image
                        source={require('@/assets/images/discord.png')}
                        style={styles.socialOptionIcon}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.socialOptionTitle}>Discord</ThemedText>
                      <ThemedText style={styles.socialOptionSubtitle}>
                        {user?.discordLink || 'Not configured'}
                      </ThemedText>
                    </View>
                  </View>
                  {user?.discordLink && (
                    <IconSymbol size={20} name="doc.on.doc" color="#999" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSocialsSheet(false)}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    height: 200,
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
    height: 100,
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
    marginTop: -60,
    marginHorizontal: 16,
    backgroundColor: '#2c2f33',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarWrapper: {
    marginTop: -50,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#2c2f33',
  },
  avatarCircleWithGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarInitial: {
    fontSize: 44,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  bioText: {
    fontSize: 14,
    color: '#b9bbbe',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emptyBioText: {
    fontSize: 14,
    color: '#72767d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  statsCardsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#36393e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#424549',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#72767d',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#5865F2',
    borderRadius: 10,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  socialsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#424549',
    borderRadius: 10,
  },
  socialsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  shareButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#424549',
    borderRadius: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#36393e',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#72767d',
  },
  tabTextActive: {
    color: '#c42743',
    fontWeight: '700',
  },
  filterIconButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    marginTop: 16,
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
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 32,
    height: 32,
    opacity: 0.9,
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
    paddingVertical: 80,
    paddingHorizontal: 40,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#b9bbbe',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#72767d',
    textAlign: 'center',
    lineHeight: 20,
  },
  addRankCardEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#5865F2',
    borderRadius: 12,
  },
  addRankCardEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  gameIconScroller: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  gameIconScrollerContent: {
    gap: 12,
    paddingVertical: 8,
  },
  gameIconContainer: {
    alignItems: 'center',
  },
  gameIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2c2f33',
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gameIconCircleActive: {
    borderColor: '#c42743',
    backgroundColor: '#36393e',
  },
  gameIconImage: {
    width: 36,
    height: 36,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  cardWrapper: {
    paddingHorizontal: 0,
  },
  addRankCardCard: {
    height: 220,
    backgroundColor: '#2c2f33',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#424549',
    borderStyle: 'dashed',
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
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 32,
    shadowColor: '#c42743',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#2c2f33',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#424549',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#72767d',
    borderRadius: 2,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  socialLinksContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  socialOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#424549',
  },
  socialOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  instagramIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E4405F',
  },
  discordIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5865F2',
  },
  socialOptionIcon: {
    width: 28,
    height: 28,
  },
  socialOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  socialOptionSubtitle: {
    fontSize: 13,
    color: '#b9bbbe',
  },
  socialNotConfigured: {
    borderColor: '#424549',
    opacity: 0.5,
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    backgroundColor: '#424549',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
