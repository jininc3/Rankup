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

  return (
    <ThemedView style={styles.container}>
      {/* Header with settings */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/profilePages/settings')}
          >
            <IconSymbol size={28} name="gearshape.fill" color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

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
            tintColor="#000"
            colors={['#000']}
          />
        }
      >
        {/* Cover Photo */}
        <View style={styles.coverPhotoContainer}>
          <View style={styles.coverPhoto}>
            {user?.coverPhoto ? (
              <Image source={{ uri: user.coverPhoto }} style={styles.coverPhotoImage} />
            ) : null}
          </View>
        </View>

        {/* Profile Content */}
        <View style={styles.profileContentWrapper}>
          {/* Top Row: Avatar and Username */}
          <View style={styles.profileTopRow}>
            {/* Avatar on the left, overlapping cover */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                {user?.avatar && user.avatar.startsWith('http') ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <ThemedText style={styles.avatarInitial}>
                    {user?.avatar || user?.username?.[0]?.toUpperCase() || 'U'}
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Username on the right */}
            <View style={styles.profileInfoRight}>
              <ThemedText style={styles.username}>{user?.username || 'User'}</ThemedText>
            </View>
          </View>

          {/* Stats Row - aligned with bio */}
          <View style={styles.statsRow}>
            <ThemedText style={styles.statText}>{posts.length} Posts</ThemedText>
            <ThemedText style={styles.statDividerText}> | </ThemedText>
            <TouchableOpacity onPress={() => router.push('/profilePages/followers')}>
              <ThemedText style={styles.statText}>{user?.followersCount || 0} Followers</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.statDividerText}> | </ThemedText>
            <TouchableOpacity onPress={() => router.push('/profilePages/following')}>
              <ThemedText style={styles.statText}>{user?.followingCount || 0} Following</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Bio & Socials Section */}
          <View style={styles.bioSocialsContainer}>
            {/* Bio */}
            {user?.bio ? (
              <ThemedText style={styles.bioText}>{user.bio}</ThemedText>
            ) : (
              <ThemedText style={styles.emptyBioText}>No bio added yet</ThemedText>
            )}

            {/* Socials button */}
            <TouchableOpacity
              style={styles.socialsButton}
              onPress={() => setShowSocialsSheet(true)}
              activeOpacity={0.7}
            >
              <IconSymbol size={18} name="link" color="#b9bbbe" />
              <ThemedText style={styles.socialsButtonText}>Socials</ThemedText>
              <IconSymbol size={14} name="chevron.right" color="#72767d" />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => router.push('/profilePages/editProfile')}
            >
              <ThemedText style={styles.editProfileText}>Edit Profile</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareProfileButton}>
              <IconSymbol size={20} name="square.and.arrow.up" color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Tabs: Clips and RankCards */}
        <View style={styles.mainTabsContainer}>
          <View style={styles.mainTabsLeft}>
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
          {activeMainTab === 'clips' && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterMenu(true)}
            >
              <IconSymbol size={20} name="line.3.horizontal.decrease.circle" color="#fff" />
            </TouchableOpacity>
          )}
          {activeMainTab === 'rankCards' && (riotAccount || valorantAccount) && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => router.push('/profilePages/rankCardWallet')}
            >
              <IconSymbol size={20} name="square.stack.3d.up.fill" color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.postsSection, { display: activeMainTab === 'clips' ? 'flex' : 'none' }]}>
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
                    <View style={styles.videoDuration}>
                      <ThemedText style={styles.videoDurationText}>
                        {formatDuration(post.duration)}
                      </ThemedText>
                    </View>
                  )}
                  {post.mediaUrls && post.mediaUrls.length > 1 && (
                    <View style={styles.multiplePostsIndicator}>
                      <IconSymbol size={20} name="square.on.square" color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.postsContainer}>
              <IconSymbol size={48} name="square.stack.3d.up" color="#fff" />
              <ThemedText style={styles.emptyStateText}>No posts yet</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>Share your gaming achievements with the community</ThemedText>
            </View>
          )}
        </View>

        {/* RankCards Tab Content */}
        <View style={[styles.section, { display: activeMainTab === 'rankCards' ? 'flex' : 'none' }]}>
          {!riotAccount && !valorantAccount ? (
            // Empty state for new users without any gaming account - show add icon and add card
            <>
              {/* Add RankCard Icon */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.gameIconScroller}
                contentContainerStyle={styles.gameIconScrollerContent}
              >
                <TouchableOpacity
                  style={styles.gameIconContainer}
                  onPress={() => router.push('/profilePages/newRankCard')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.gameIconCircle, styles.gameIconCircleActive]}>
                    <IconSymbol
                      size={24}
                      name="plus.circle.fill"
                      color="#fff"
                    />
                  </View>
                </TouchableOpacity>
              </ScrollView>

              {/* Add Rank Card */}
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
                snapToInterval={CARD_WIDTH + CARD_GAP}
                decelerationRate="fast"
                contentContainerStyle={styles.cardsContainer}
              >
                <TouchableOpacity
                  style={[styles.cardWrapper, styles.addRankCardCard, { width: CARD_WIDTH }]}
                  onPress={() => router.push('/profilePages/newRankCard')}
                  activeOpacity={0.7}
                >
                  <View style={styles.addRankCardCardContent}>
                    <IconSymbol size={48} name="plus.circle.fill" color="#fff" />
                    <ThemedText style={styles.addRankCardCardText}>Add Rank Card</ThemedText>
                    <ThemedText style={styles.addRankCardCardSubtext}>Connect another game</ThemedText>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </>
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
                  <View style={styles.addRankCardCardContent}>
                    <IconSymbol size={48} name="plus.circle.fill" color="#fff" />
                    <ThemedText style={styles.addRankCardCardText}>Add Rank Card</ThemedText>
                    <ThemedText style={styles.addRankCardCardSubtext}>Connect another game</ThemedText>
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
          activeOpacity={0.8}
        >
          <IconSymbol size={28} name="plus" color="#fff" />
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
  headerSpacer: {
    width: 32,
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
    paddingBottom: 12,
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
    color: '#fff',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  bioSocialsContainer: {
    marginBottom: 20,
  },
  bioText: {
    fontSize: 14,
    color: '#dcddde',
    lineHeight: 20,
    fontWeight: '400',
    marginBottom: 10,
  },
  emptyBioText: {
    fontSize: 14,
    color: '#72767d',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  socialsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#36393e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c2f33',
    marginTop: 12,
  },
  socialsButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#dcddde',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  socialLinksContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  socialOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  socialOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  instagramIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E4405F',
  },
  discordIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5865F2',
  },
  socialOptionIcon: {
    width: 26,
    height: 26,
  },
  socialOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  socialOptionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  socialNotConfigured: {
    borderColor: '#e5e5e5',
    opacity: 0.5,
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  editProfileButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  shareProfileButton: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#36393e',
    borderWidth: 1,
    borderColor: '#2c2f33',
  },
  shareProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#000',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#36393e',
    borderWidth: 2,
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
    width: 32,
    height: 32,
  },
  cardsContainer: {
    paddingBottom: 4,
  },
  cardWrapper: {
    paddingHorizontal: 0,
  },
  addRankCardCard: {
    height: 220,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  addRankCardCardContent: {
    alignItems: 'center',
    gap: 12,
  },
  addRankCardCardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.3,
  },
  addRankCardCardSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
    letterSpacing: -0.2,
  },
  mainTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e2124',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  mainTabsLeft: {
    flexDirection: 'row',
  },
  mainTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginRight: 8,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: 30,
    backgroundColor: '#c42743',
    borderRadius: 1,
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#72767d',
  },
  mainTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterButton: {
    padding: 8,
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
  emptyStateSubtext: {
    fontSize: 14,
    color: '#b9bbbe',
    textAlign: 'center',
    paddingHorizontal: 40,
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
  videoDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  videoDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.2,
  },
  multiplePostsIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
  addRankCardButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  addRankCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
});