import rankCard from '@/app/components/rankCard';

// Alias for JSX usage (React components must start with uppercase)
const RankCard = rankCard;
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, Alert, Linking, Modal, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { followUser, unfollowUser, isFollowing as checkIsFollowing, getUserRecentPosts } from '@/services/followService';
import { createOrGetChat } from '@/services/chatService';
import PostViewerModal from '@/app/components/postViewerModal';
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
}

// Helper function to format rank display
const formatRank = (tier: string, rank: string) => {
  return `${tier.charAt(0).toUpperCase()}${tier.slice(1).toLowerCase()} ${rank}`;
};

// Helper function to format video duration
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const { width: screenWidth } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_GAP = 16;
const CARD_WIDTH = screenWidth - (CARD_PADDING * 2);

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
  taggedPeople?: string[];
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
  duration?: number; // Video duration in seconds
}

export default function ProfileViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser, refreshUser, setNewlyFollowedUserPosts, setNewlyUnfollowedUserId } = useAuth();
  const [viewedUser, setViewedUser] = useState<ViewedUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [showSocialsSheet, setShowSocialsSheet] = useState(false);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);
  const cardAnimations = useRef<Animated.Value[]>([]).current;
  const [achievements, setAchievements] = useState<{ partyName: string; game: string; placement: number; endDate: string }[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [achievementsError, setAchievementsError] = useState(false);

  // Dynamic games array based on Riot data and enabled rank cards
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
            trophies: 876,
            icon: '⚔️',
            image: require('@/assets/images/leagueoflegends.png'),
            wins: riotStats.rankedSolo?.wins || 0,
            losses: riotStats.rankedSolo?.losses || 0,
            winRate: riotStats.rankedSolo ? Math.round((riotStats.rankedSolo.wins / (riotStats.rankedSolo.wins + riotStats.rankedSolo.losses)) * 100) : 0,
            recentMatches: [],
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
            recentMatches: [],
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
            recentMatches: [],
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

  // Get userId from params - this is required for profileView
  const userId = params.userId as string;

  // Get optional preloaded data from params for instant display
  const preloadedUsername = params.username as string | undefined;
  const preloadedAvatar = params.avatar as string | undefined;

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

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

  // Redirect to own profile if trying to view yourself
  useEffect(() => {
    if (userId && currentUser?.id && userId === currentUser.id) {
      router.replace('/(tabs)/profile');
    }
  }, [userId, currentUser?.id]);


  // Parallel data fetching - fetch all data at once for faster load
  const fetchAllData = async () => {
    if (!userId || !currentUser?.id) return;

    try {
      // Fetch user profile, posts, and follow status in parallel
      const [userDoc, postsSnapshot, followStatus] = await Promise.all([
        getDoc(doc(db, 'users', userId)),
        getDocs(query(
          collection(db, 'posts'),
          where('userId', '==', userId)
        )),
        checkIsFollowing(currentUser.id, userId)
      ]);

      // Update user profile
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
        });

        // Set account data
        setRiotAccount(data.riotAccount || null);
        setValorantAccount(data.valorantAccount || null);
        setRiotStats(data.riotStats || null);
        setValorantStats(data.valorantStats || null);
        setEnabledRankCards(data.enabledRankCards || []);

        setLoadingUser(false);
      }

      // Update posts - sort by newest first
      let fetchedPosts: Post[] = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));

      fetchedPosts = fetchedPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      setPosts(fetchedPosts);
      setLoadingPosts(false);

      // Update follow status
      setIsFollowing(followStatus);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setLoadingUser(false);
      setLoadingPosts(false);
    }
  };

  // Fetch posts only (for refresh)
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

      // Sort by newest first
      fetchedPosts = fetchedPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Set preloaded data immediately for instant display
  useEffect(() => {
    if (preloadedUsername || preloadedAvatar) {
      setViewedUser({
        id: userId,
        username: preloadedUsername || 'User',
        email: '',
        avatar: preloadedAvatar,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
      });
      setLoadingUser(false); // Show immediately, will update when real data arrives
    }
  }, [userId, preloadedUsername, preloadedAvatar]);

  // Fetch all data when component mounts (only once)
  useEffect(() => {
    if (userId && currentUser?.id) {
      fetchAllData();
    }
  }, [userId, currentUser?.id]);

  // Fetch achievements (completed parties where viewed user placed top 3)
  useEffect(() => {
    if (!userId) return;

    const fetchAchievements = async () => {
      setLoadingAchievements(true);
      setAchievementsError(false);
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

          // Parse endDate (MM/DD/YYYY)
          const [month, day, year] = data.endDate.split('/').map(Number);
          const endDate = new Date(year, month - 1, day);
          if (endDate >= today) return; // Not completed yet

          // Find user's ranking
          const userRanking = data.rankings.find((r: any) => r.userId === userId);
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
      } catch (error: any) {
        // Handle permission errors gracefully - this happens when viewing other users' profiles
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
          setAchievementsError(true);
        } else {
          console.error('Error fetching achievements:', error);
        }
      } finally {
        setLoadingAchievements(false);
      }
    };

    fetchAchievements();
  }, [userId]);

  const handlePostPress = (post: Post, index: number) => {
    setSelectedPost(post);
    setSelectedPostIndex(index);
    setShowPostViewer(true);
  };

  const closePostViewer = () => {
    setShowPostViewer(false);
    setSelectedPost(null);
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
        // Unfollow
        await unfollowUser(currentUser.id, userId);

        setIsFollowing(false);

        // Update local viewed user state
        setViewedUser({
          ...viewedUser,
          followersCount: (viewedUser.followersCount || 0) - 1,
        });

        // Signal to remove this user's posts from feed
        setNewlyUnfollowedUserId(userId);
      } else {
        // Follow
        await followUser(
          currentUser.id,
          currentUser.username || currentUser.email?.split('@')[0] || 'User',
          currentUser.avatar,
          userId,
          viewedUser.username,
          viewedUser.avatar
        );

        setIsFollowing(true);

        // Update local viewed user state
        setViewedUser({
          ...viewedUser,
          followersCount: (viewedUser.followersCount || 0) + 1,
        });

        // Fetch newly followed user's recent posts and store in context
        try {
          const recentPosts = await getUserRecentPosts(userId);
          setNewlyFollowedUserPosts(recentPosts, userId);
        } catch (error) {
          console.error('Error fetching newly followed user posts:', error);
          // Don't block the follow operation if fetching posts fails
        }
      }

      // Refresh current user data
      await refreshUser();
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle message button
  const handleMessage = async () => {
    if (!currentUser?.id || !viewedUser) {
      Alert.alert('Error', 'Unable to start chat');
      return;
    }

    try {
      const chatId = await createOrGetChat(
        currentUser.id,
        currentUser.username || currentUser.email?.split('@')[0] || 'User',
        currentUser.avatar,
        viewedUser.id,
        viewedUser.username,
        viewedUser.avatar
      );

      router.push({
        pathname: '/chatPages/chatScreen',
        params: {
          chatId,
          otherUserId: viewedUser.id,
          otherUsername: viewedUser.username,
          otherUserAvatar: viewedUser.avatar || '',
        },
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to start chat');
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

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} decelerationRate="fast">
        {/* Header Section */}
        <View style={styles.headerSection}>
          {/* Top Header Icon - Back Button */}
          <View style={styles.headerIconsRow}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <IconSymbol size={20} name="chevron.left" color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Cover Photo Area */}
          <View style={styles.coverPhotoWrapper}>
            {viewedUser?.coverPhoto ? (
              <Image source={{ uri: viewedUser.coverPhoto }} style={styles.coverPhotoImage} />
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
            {loadingUser && !viewedUser ? (
              <View style={[styles.coverPhotoUsername, styles.skeletonText, { width: 120, height: 28 }]} />
            ) : (
              <ThemedText style={styles.coverPhotoUsername}>{viewedUser?.username || 'User'}</ThemedText>
            )}

            {/* Profile Avatar - positioned bottom-right, half overlapping */}
            {loadingUser && !viewedUser ? (
              <View style={[styles.profileAvatarButton, styles.profileAvatarCircle, styles.skeletonAvatar]} />
            ) : tierBorderGradient ? (
              <View style={styles.profileAvatarButton}>
                <GradientBorder
                  colors={tierBorderGradient}
                  borderWidth={2}
                  borderRadius={28}
                >
                  <View style={styles.profileAvatarCircleWithGradient}>
                    {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                      <Image source={{ uri: viewedUser.avatar }} style={styles.profileAvatarImage} />
                    ) : (
                      <ThemedText style={styles.profileAvatarInitial}>
                        {viewedUser?.avatar || viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                      </ThemedText>
                    )}
                  </View>
                </GradientBorder>
              </View>
            ) : (
              <View style={styles.profileAvatarButton}>
                <View style={styles.profileAvatarCircle}>
                  {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                    <Image source={{ uri: viewedUser.avatar }} style={styles.profileAvatarImage} />
                  ) : (
                    <ThemedText style={styles.profileAvatarInitial}>
                      {viewedUser?.avatar || viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Followers / Following Row */}
          <View style={styles.followStatsRow}>
            <TouchableOpacity
              style={styles.followStatItem}
              onPress={() => router.push({
                pathname: '/profilePages/followers',
                params: { userId: viewedUser?.id }
              })}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.followStatNumber}>{formatCount(viewedUser?.followersCount)}</ThemedText>
              <ThemedText style={styles.followStatLabel}> Followers</ThemedText>
            </TouchableOpacity>
            <View style={styles.followStatDivider} />
            <TouchableOpacity
              style={styles.followStatItem}
              onPress={() => router.push({
                pathname: '/profilePages/following',
                params: { userId: viewedUser?.id }
              })}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.followStatNumber}>{formatCount(viewedUser?.followingCount)}</ThemedText>
              <ThemedText style={styles.followStatLabel}> Following</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Social Icons Row with Follow Button */}
          <View style={styles.socialIconsRow}>
            {/* Instagram */}
            <TouchableOpacity
              style={[styles.socialIconButton, !viewedUser?.instagramLink && styles.socialIconInactive]}
              onPress={async () => {
                if (viewedUser?.instagramLink) {
                  try {
                    const username = viewedUser.instagramLink.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
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
                }
              }}
              activeOpacity={0.7}
              disabled={!viewedUser?.instagramLink}
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
              activeOpacity={0.7}
              disabled={!viewedUser?.discordLink}
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
              onPress={handleMessage}
              activeOpacity={0.7}
            >
              <IconSymbol size={20} name="envelope.fill" color="#fff" />
            </TouchableOpacity>

            {/* Follow Button */}
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followButtonFollowing]}
              onPress={handleFollowToggle}
              disabled={followLoading}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.followButtonText}>
                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Bio Section */}
          {viewedUser?.bio && (
            <View style={styles.bioSection}>
              <ThemedText style={styles.bioText}>{viewedUser.bio}</ThemedText>
            </View>
          )}
        </View>

        {/* Clips Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <IconSymbol size={18} name="play.rectangle.fill" color="#fff" />
            <ThemedText style={styles.sectionHeaderTitle}>Clips</ThemedText>
          </View>
          {posts.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push(`/profilePages/clips?userId=${userId}`)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.viewAllButtonText}>View All</ThemedText>
              <IconSymbol size={14} name="chevron.right" color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Clips Content */}
        <View style={styles.clipsSection}>
          {loadingPosts ? (
            <View style={styles.postsContainer}>
              <ActivityIndicator size="large" color="#000" />
              <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
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
                  onPress={() => handlePostPress(post, index)}
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
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateSimple}>
              <ThemedText style={styles.emptyStateSimpleText}>No clips yet</ThemedText>
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
            // Empty state when user has no gaming accounts linked
            <View style={styles.emptyStateSimple}>
              <ThemedText style={styles.emptyStateSimpleText}>No rank cards yet</ThemedText>
            </View>
          ) : userGames.length === 0 ? (
            // User has accounts but no enabled rank cards
            <View style={styles.emptyStateSimple}>
              <ThemedText style={styles.emptyStateSimpleText}>No rank cards yet</ThemedText>
            </View>
          ) : userGames.length === 1 ? (
            // Single Card View - clickable to open game stats
            <View style={styles.verticalRankCardsContainer}>
              {(() => {
                const game = userGames[0];
                let displayUsername = viewedUser?.username || 'User';

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
                    <RankCard game={game} username={displayUsername} viewOnly={true} userId={viewedUser?.id} />
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
                      let displayUsername = viewedUser?.username || 'User';

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
                            <RankCard game={game} username={displayUsername} viewOnly={true} userId={viewedUser?.id} />
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

        {/* Achievements Section - Hide if permissions error */}
        {!achievementsError && (
          <>
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
          </>
        )}
      </ScrollView>

      {/* Post Viewer Modal */}
      <PostViewerModal
        visible={showPostViewer}
        post={selectedPost}
        posts={posts}
        currentIndex={selectedPostIndex}
        userAvatar={viewedUser?.avatar}
        onClose={closePostViewer}
        onCommentAdded={fetchPosts}
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
                {viewedUser?.instagramLink && (
                  <TouchableOpacity
                    style={styles.socialOption}
                    onPress={async () => {
                      setShowSocialsSheet(false);
                      try {
                        const username = viewedUser.instagramLink.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
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
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.socialOptionLeft}>
                      <View style={styles.instagramIconContainer}>
                        <Image
                          source={require('@/assets/images/instagram.png')}
                          style={styles.socialOptionIcon}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.socialOptionTitle}>Instagram</ThemedText>
                        <ThemedText style={styles.socialOptionSubtitle}>
                          {viewedUser.instagramLink.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Discord */}
                {viewedUser?.discordLink && (
                  <TouchableOpacity
                    style={styles.socialOption}
                    onPress={async () => {
                      setShowSocialsSheet(false);
                      try {
                        await Clipboard.setStringAsync(viewedUser.discordLink);
                        Alert.alert(
                          'Copied!',
                          `Discord username "${viewedUser.discordLink}" copied to clipboard`,
                          [{ text: 'OK' }]
                        );
                      } catch (error) {
                        console.error('Error copying to clipboard:', error);
                        Alert.alert('Error', 'Failed to copy Discord username');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.socialOptionLeft}>
                      <View style={styles.discordIconContainer}>
                        <Image
                          source={require('@/assets/images/discord.png')}
                          style={styles.socialOptionIcon}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.socialOptionTitle}>Discord</ThemedText>
                        <ThemedText style={styles.socialOptionSubtitle}>
                          {viewedUser.discordLink}
                        </ThemedText>
                      </View>
                    </View>
                    <IconSymbol size={20} name="doc.on.doc" color="#999" />
                  </TouchableOpacity>
                )}
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
    backgroundColor: '#0f0f0f',
  },
  headerSection: {
    backgroundColor: '#0f0f0f',
  },
  // Header icons row
  headerIconsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerIconButton: {
    padding: 8,
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
  followButton: {
    height: 36,
    paddingHorizontal: 16,
    backgroundColor: '#c42743',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonFollowing: {
    backgroundColor: '#2c2f33',
    borderWidth: 1,
    borderColor: '#36393e',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
  section: {
    paddingHorizontal: 12,
    paddingTop: 12,
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionHeaderLeft: {
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
  postsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
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
    color: '#b9bbbe',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyRankCardsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyStateSimple: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyStateSimpleText: {
    fontSize: 14,
    color: '#72767d',
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
    backgroundColor: '#36393e',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  videoDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  skeletonAvatar: {
    backgroundColor: '#e5e5e5',
  },
  skeletonText: {
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
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
});
