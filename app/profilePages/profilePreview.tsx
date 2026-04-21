import rankCard from '@/app/components/rankCard';

// Alias for JSX usage (React components must start with uppercase)
const RankCard = rankCard;
import PostViewerModal from '@/app/components/postViewerModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, Alert, Linking, LayoutAnimation, Platform, UIManager } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { followUser, unfollowUser, isFollowing as checkIsFollowing } from '@/services/followService';
import { calculateTierBorderColor, calculateTierBorderGradient } from '@/utils/tierBorderUtils';
import { formatCount } from '@/utils/formatCount';
import GradientBorder from '@/components/GradientBorder';
import { LinearGradient } from 'expo-linear-gradient';

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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
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
  duration?: number;
}

// Helper function to format video duration
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to format rank
const formatRank = (tier: string, rank: string) => {
  return `${tier.charAt(0).toUpperCase()}${tier.slice(1).toLowerCase()} ${rank}`;
};

export default function ProfilePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser, refreshUser } = useAuth();
  const [viewedUser, setViewedUser] = useState<ViewedUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<{ partyName: string; game: string; placement: number; endDate: string }[]>([]);
  const [cardsExpanded, setCardsExpanded] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'clips' | 'rankCards' | 'achievements'>('clips');
  const tabs: ('clips' | 'rankCards' | 'achievements')[] = ['clips', 'rankCards', 'achievements'];
  const tabScrollRef = useRef<ScrollView>(null);

  const handleTabScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    const tab = tabs[index];
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  const scrollToTab = useCallback((tab: 'clips' | 'rankCards' | 'achievements') => {
    const index = tabs.indexOf(tab);
    tabScrollRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  }, []);

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Get userId from params
  const userId = params.userId as string || currentUser?.id;

  // Dynamic games array based on Riot data and enabled rank cards
  const userGames = (riotAccount || valorantAccount) ?
    enabledRankCards
      .map(gameType => {
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
            summonerLevel: riotStats.summonerLevel,
          };
        }
        if (gameType === 'tft' && riotStats) {
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

        // Fetch riot and valorant stats for tier border and rank cards
        if (data.riotStats) {
          setRiotStats(data.riotStats);
        }
        if (data.valorantStats) {
          setValorantStats(data.valorantStats);
        }
        if (data.riotAccount) {
          setRiotAccount(data.riotAccount);
        }
        if (data.valorantAccount) {
          setValorantAccount(data.valorantAccount);
        }
        if (data.enabledRankCards) {
          setEnabledRankCards(data.enabledRankCards);
        }
      } else {
        setUserNotFound(true);
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
        where('userId', '==', userId)
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
    } finally {
      setLoadingPosts(false);
    }
  };

  // Fetch achievements
  const fetchAchievements = async () => {
    if (!userId) return;
    try {
      const partiesRef = collection(db, 'parties');
      const partiesQuery = query(partiesRef, where('members', 'array-contains', userId));
      const snapshot = await getDocs(partiesQuery);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const results: { partyName: string; game: string; placement: number; endDate: string }[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.endDate || !data.rankings) return;
        const [month, day, year] = data.endDate.split('/').map(Number);
        const endDate = new Date(year, month - 1, day);
        if (endDate >= today) return;
        const userRanking = data.rankings.find((r: any) => r.userId === userId);
        if (userRanking && userRanking.rank >= 1 && userRanking.rank <= 3) {
          results.push({ partyName: data.partyName, game: data.game, placement: userRanking.rank, endDate: data.endDate });
        }
      });
      results.sort((a, b) => a.placement - b.placement || b.endDate.localeCompare(a.endDate));
      setAchievements(results);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  // Fetch user profile and posts when component mounts
  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchPosts();
      fetchAchievements();
    }
  }, [userId]);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchUserProfile();
        fetchPosts();
        fetchAchievements();
      }
    }, [userId])
  );

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
        await unfollowUser(currentUser.id, userId);
        setIsFollowing(false);
        setViewedUser({
          ...viewedUser,
          followersCount: (viewedUser.followersCount || 0) - 1,
        });
      } else {
        await followUser(
          currentUser.id,
          currentUser.username || currentUser.email?.split('@')[0] || 'User',
          currentUser.avatar,
          userId,
          viewedUser.username,
          viewedUser.avatar
        );
        setIsFollowing(true);
        setViewedUser({
          ...viewedUser,
          followersCount: (viewedUser.followersCount || 0) + 1,
        });
      }
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

  // Calculate tier border color based on current ranks
  const tierBorderColor = calculateTierBorderColor(
    riotStats?.rankedSolo ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank) : undefined,
    valorantStats?.currentRank
  );

  // Calculate tier border gradient with fallback
  const tierBorderGradient = calculateTierBorderGradient(
    riotStats?.rankedSolo ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank) : undefined,
    valorantStats?.currentRank
  ) || ['#333', '#333', '#333'];

  // Show "user not found" screen for deleted accounts
  if (userNotFound) {
    return (
      <ThemedView style={styles.container}>
        {/* Background shimmer — matches tabs pages */}
        <View style={styles.backgroundGlow} pointerEvents="none">
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
        <View style={{ paddingTop: 70, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
            <IconSymbol size={20} name="chevron.left" color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 100 }}>
          <IconSymbol size={64} name="person.crop.circle.badge.xmark" color="#72767d" />
          <ThemedText style={{ fontSize: 20, fontWeight: '600', color: '#fff', marginTop: 16 }}>
            Account Not Found
          </ThemedText>
          <ThemedText style={{ fontSize: 14, color: '#b9bbbe', textAlign: 'center', marginTop: 8 }}>
            This account may have been deleted or is no longer available.
          </ThemedText>
          <TouchableOpacity
            style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#c42743', borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <ThemedText style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Background shimmer — matches tabs pages */}
      <View style={styles.backgroundGlow} pointerEvents="none">
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          {/* Cover Photo Area */}
          <View style={styles.coverPhotoWrapper}>
            {viewedUser?.coverPhoto ? (
              <Image
                source={{ uri: viewedUser.coverPhoto }}
                style={styles.coverPhotoImage}
              />
            ) : (
              <LinearGradient
                colors={['#2c2f33', '#1a1a1a', '#0f0f0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.coverPhotoGradient}
              />
            )}
            {/* Bottom fade */}
            <LinearGradient
              colors={['transparent', 'rgba(15, 15, 15, 0.15)', 'rgba(15, 15, 15, 0.45)', 'rgba(15, 15, 15, 0.75)', '#0f0f0f']}
              locations={[0, 0.25, 0.5, 0.75, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeBottom}
            />

            {/* Header Icons overlaid on cover photo */}
            <View style={styles.headerIconsRow}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <IconSymbol size={20} name="chevron.left" color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerIconsSpacer} />
            </View>
          </View>

          {/* Profile Info Section - overlaps cover photo */}
          <View style={styles.profileInfoSection}>
            {/* Row: Avatar+Username group (left) + Stats (right) */}
            <View style={styles.avatarStatsRow}>
              <View style={styles.avatarUsernameGroup}>
                {tierBorderGradient ? (
                  <GradientBorder
                    colors={tierBorderGradient}
                    borderWidth={2.5}
                    borderRadius={38}
                  >
                    <View style={styles.profileAvatarCircleWithGradient}>
                      {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                        <Image source={{ uri: viewedUser.avatar }} style={styles.profileAvatarImage} />
                      ) : (
                        <ThemedText style={styles.profileAvatarInitial}>
                          {viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                        </ThemedText>
                      )}
                    </View>
                  </GradientBorder>
                ) : (
                  <View style={styles.profileAvatarCircle}>
                    {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                      <Image source={{ uri: viewedUser.avatar }} style={styles.profileAvatarImage} />
                    ) : (
                      <ThemedText style={styles.profileAvatarInitial}>
                        {viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                      </ThemedText>
                    )}
                  </View>
                )}
                <ThemedText style={styles.profileUsername} numberOfLines={1}>{viewedUser?.username || 'User'}</ThemedText>
              </View>

              {/* Stats columns */}
              <View style={styles.statsColumns}>
                <View style={styles.statColumn}>
                  <ThemedText style={styles.statNumber}>{formatCount(viewedUser?.followersCount)}</ThemedText>
                  <ThemedText style={styles.statLabel}>Followers</ThemedText>
                </View>
                <View style={styles.statColumn}>
                  <ThemedText style={styles.statNumber}>{formatCount(viewedUser?.followingCount)}</ThemedText>
                  <ThemedText style={styles.statLabel}>Following</ThemedText>
                </View>
                <View style={styles.statColumn}>
                  <ThemedText style={styles.statNumber}>{formatCount(posts.length)}</ThemedText>
                  <ThemedText style={styles.statLabel}>Posts</ThemedText>
                </View>
              </View>
            </View>

            {/* Bio */}
            {viewedUser?.bio && (
              <View style={styles.bioSection}>
                <ThemedText style={styles.bioText}>{viewedUser.bio}</ThemedText>
              </View>
            )}

            {/* Action Row: Follow Button + Social Icons */}
            <View style={styles.actionRow}>
              {userId !== currentUser?.id && (
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={handleFollowToggle}
                  disabled={followLoading}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.followButtonText}>
                    {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </ThemedText>
                </TouchableOpacity>
              )}

              <View style={styles.socialIconsGroup}>
                {/* Instagram */}
                <TouchableOpacity
                  style={[styles.socialIconButton, !viewedUser?.instagramLink && styles.socialIconInactive]}
                  onPress={async () => {
                    if (viewedUser?.instagramLink) {
                      try {
                        const username = viewedUser.instagramLink.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
                        await Linking.openURL(`https://instagram.com/${username}`);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to open Instagram');
                      }
                    }
                  }}
                  disabled={!viewedUser?.instagramLink}
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
                  style={[styles.socialIconButton, !viewedUser?.discordLink && styles.socialIconInactive]}
                  onPress={async () => {
                    if (viewedUser?.discordLink) {
                      try {
                        await Clipboard.setStringAsync(viewedUser.discordLink);
                        Alert.alert('Copied!', `Discord username "${viewedUser.discordLink}" copied to clipboard`);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to copy Discord username');
                      }
                    }
                  }}
                  disabled={!viewedUser?.discordLink}
                  activeOpacity={0.7}
                >
                  <Image
                    source={require('@/assets/images/discord.png')}
                    style={styles.socialIconImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Tab Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => scrollToTab('clips')}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.tabText, activeTab === 'clips' && styles.tabTextActive]}>CLIPS</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => scrollToTab('rankCards')}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.tabText, activeTab === 'rankCards' && styles.tabTextActive]}>RANKS</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => scrollToTab('achievements')}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.tabText, activeTab === 'achievements' && styles.tabTextActive]}>ACHIEVEMENTS</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView
            ref={tabScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleTabScroll}
            scrollEventThrottle={16}
            nestedScrollEnabled
          >
          {/* Clips Tab */}
          <View style={{ width: screenWidth }}>
          <View style={styles.sectionContainer}>
          <View style={styles.clipsSection}>
            {posts.length > 0 ? (
              <View style={styles.gridClipsContainer}>
                {posts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.gridClipItem}
                    onPress={() => handlePostPress(post)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: post.mediaType === 'video' && post.thumbnailUrl ? post.thumbnailUrl : post.mediaUrl }}
                      style={styles.gridClipImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.75)']}
                      locations={[0.5, 1]}
                      style={styles.gridClipBottomGradient}
                      pointerEvents="none"
                    />
                    {post.mediaType === 'video' && (
                      <View style={styles.gridClipMeta}>
                        <IconSymbol size={10} name="play.fill" color="#fff" />
                        <ThemedText style={styles.gridClipMetaText}>
                          {formatDuration(post.duration)}
                        </ThemedText>
                      </View>
                    )}
                    {post.mediaUrls && post.mediaUrls.length > 1 && (
                      <View style={styles.gridClipMultiple}>
                        <IconSymbol size={13} name="square.on.square" color="#fff" />
                      </View>
                    )}
                    {post.likes > 0 && (
                      <View style={styles.gridClipLikes}>
                        <IconSymbol size={10} name="heart.fill" color="#fff" />
                        <ThemedText style={styles.gridClipMetaText}>
                          {formatCount(post.likes)}
                        </ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyStateTitle}>No clips yet</ThemedText>
                <ThemedText style={styles.emptyStateSubtext}>
                  This user hasn't posted any clips
                </ThemedText>
              </View>
            )}
          </View>
          </View>
          </View>

          {/* Rank Cards Tab */}
          <View style={{ width: screenWidth }}>
          <View style={[styles.sectionContainer, {
            paddingBottom: userGames.length > 2 ? 10 : userGames.length > 1 ? 8 : 4
          }]}>
          <View style={styles.rankCardsSection}>
            {!riotAccount && !valorantAccount ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyStateTitle}>No rank cards yet</ThemedText>
                <ThemedText style={styles.emptyStateSubtext}>
                  This user hasn't linked any gaming accounts
                </ThemedText>
              </View>
            ) : userGames.length === 1 ? (
              <View style={styles.verticalRankCardsContainer}>
                {(() => {
                  const game = userGames[0];
                  let displayUsername = viewedUser?.username || 'User';

                  if (game.name === 'Valorant' && valorantAccount) {
                    displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                  } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                    displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                  }

                  return (
                    <View key={game.id} style={styles.verticalCardWrapper}>
                      <RankCard game={game} username={displayUsername} viewOnly={true} />
                    </View>
                  );
                })()}
              </View>
            ) : (
              (() => {
                const totalCards = userGames.length;
                const CARD_HEIGHT = 240;
                const STACK_OFFSET = 50;
                const containerHeight = CARD_HEIGHT;
                const stackMarginTop = (totalCards - 1) * STACK_OFFSET;

                return (
                  <View style={[styles.verticalRankCardsContainer, { paddingBottom: 0 }]}>
                    <View style={[styles.stackedCardsWrapper, { height: containerHeight, marginTop: stackMarginTop }]}>
                      {userGames.map((game, index) => {
                        let displayUsername = viewedUser?.username || 'User';

                        if (game.name === 'Valorant' && valorantAccount) {
                          displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                        } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                          displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                        }

                        const reverseIndex = totalCards - 1 - index;
                        const topOffset = reverseIndex * -STACK_OFFSET;
                        const scale = 1 - (reverseIndex * 0.02);
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
                            <View style={{ width: '100%' }}>
                              <RankCard game={game} username={displayUsername} viewOnly={true} />
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
          </View>
          </View>

          {/* Achievements Tab */}
          <View style={{ width: screenWidth }}>
          <View style={styles.sectionContainer}>
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
                  Place top 3 in a leaderboard to earn achievements
                </ThemedText>
              </View>
            )}
          </View>
          </View>
          </View>

          </ScrollView>
        </View>
      </ScrollView>

      {/* Post Viewer Modal */}
      <PostViewerModal
        visible={showPostViewer}
        post={selectedPost}
        posts={posts}
        currentIndex={selectedPostIndex}
        userAvatar={viewedUser?.avatar}
        onClose={closePostViewer}
        onNavigate={handleNavigatePost}
      />
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
    left: -screenWidth * 0.6,
    width: screenWidth * 2.2,
    height: screenHeight * 1.7,
    transform: [{ rotate: '20deg' }],
  },
  shimmerBandSecondary: {
    position: 'absolute',
    top: -screenHeight * 0.2,
    left: -screenWidth * 0.1,
    width: screenWidth * 1.9,
    height: screenHeight * 1.5,
    transform: [{ rotate: '-15deg' }],
  },
  headerSection: {},
  // Header icons row - overlaid on cover photo
  headerIconsRow: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerIconsSpacer: {
    flex: 1,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Cover photo area - reaches top of screen
  coverPhotoWrapper: {
    width: '100%',
    height: 170,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  coverPhotoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.8,
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
    height: '60%',
    zIndex: 1,
  },
  // Profile info section below cover
  profileInfoSection: {
    marginTop: -38,
    paddingHorizontal: 20,
    zIndex: 3,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  avatarUsernameGroup: {
    alignItems: 'flex-start',
  },
  profileUsername: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginTop: 6,
  },
  profileAvatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0f0f0f',
  },
  profileAvatarCircleWithGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  profileAvatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  // Stats columns beside avatar
  statsColumns: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    paddingBottom: 6,
  },
  statColumn: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#72767d',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  // Bio section
  bioSection: {
    marginTop: 10,
  },
  bioText: {
    fontSize: 13,
    color: '#b9bbbe',
    lineHeight: 19,
  },
  // Action row: Follow Button + Social icons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  followButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  socialIconsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  socialIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconInactive: {
    opacity: 0.35,
  },
  socialIconImage: {
    width: 18,
    height: 18,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#fff',
  },
  sectionContainer: {
    marginHorizontal: 0,
    marginBottom: 4,
  },
  clipsSection: {
    marginBottom: 8,
  },
  rankCardsSection: {
    marginBottom: 8,
  },
  gridClipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 6,
  },
  gridClipItem: {
    width: (screenWidth - 30) / 2,
    aspectRatio: 16 / 9,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  gridClipImage: {
    width: '100%',
    height: '100%',
  },
  gridClipBottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  gridClipMeta: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  gridClipMetaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  gridClipMultiple: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 5,
    borderRadius: 6,
  },
  gridClipLikes: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#72767d',
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 240,
  },
  verticalRankCardsContainer: {
    paddingHorizontal: 16,
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
  achievementsSection: {
    marginBottom: 8,
  },
  horizontalAchievementsContainer: {
    paddingHorizontal: 20,
    gap: 6,
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
});
