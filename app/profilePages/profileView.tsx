import rankCard from '@/app/components/rankCard';

// Alias for JSX usage (React components must start with uppercase)
const RankCard = rankCard;
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, Alert, Linking, Modal } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { followUser, unfollowUser, isFollowing as checkIsFollowing, getUserRecentPosts } from '@/services/followService';
import { createOrGetChat } from '@/services/chatService';
import PostViewerModal from '@/app/components/postViewerModal';
import PostFilterModal from '@/app/profilePages/postFilterModal';
import { calculateTierBorderColor, calculateTierBorderGradient } from '@/utils/tierBorderUtils';
import GradientBorder from '@/components/GradientBorder';

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
  const [activeMainTab, setActiveMainTab] = useState<'rankCards' | 'clips'>('clips'); // Default to clips tab
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
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'newest' | 'oldest' | 'most_viewed' | 'most_liked'>('newest');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null);

  // Dynamic games array based on Riot data and enabled rank cards
  const userGames = (riotAccount || valorantAccount) ? [
    // League of Legends - only show if enabled and has stats
    ...(enabledRankCards.includes('league') && riotStats ? [{
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
    }] : []),
    // Valorant - only show if enabled and has stats
    ...(enabledRankCards.includes('valorant') && valorantStats ? [{
      id: 3,
      name: 'Valorant',
      rank: valorantStats.currentRank || 'Unranked',
      trophies: 654,
      icon: '🎯',
      image: require('@/assets/images/valorant-black.png'),
      wins: valorantStats.wins || 0,
      losses: valorantStats.losses || 0,
      winRate: valorantStats.winRate || 0,
      recentMatches: [],
      valorantCard: valorantStats.card?.small,
    }] : []),
  ] : [];

  // Get userId from params - this is required for profileView
  const userId = params.userId as string;

  // Get optional preloaded data from params for instant display
  const preloadedUsername = params.username as string | undefined;
  const preloadedAvatar = params.avatar as string | undefined;

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

      // Update posts
      let fetchedPosts: Post[] = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));

      // Filter by game if a game filter is selected
      if (selectedGameFilter) {
        fetchedPosts = fetchedPosts.filter(post => post.taggedGame === selectedGameFilter);
      }

      // Sort based on selected filter
      if (selectedFilter === 'newest') {
        fetchedPosts = fetchedPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      } else if (selectedFilter === 'oldest') {
        fetchedPosts = fetchedPosts.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
      } else if (selectedFilter === 'most_liked') {
        fetchedPosts = fetchedPosts.sort((a, b) => b.likes - a.likes);
      } else if (selectedFilter === 'most_viewed') {
        fetchedPosts = fetchedPosts.sort((a, b) => b.likes - a.likes);
      }

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

  // Refetch posts when filter changes
  useEffect(() => {
    if (userId) {
      fetchPosts();
    }
  }, [selectedFilter, selectedGameFilter]);

  const handlePostPress = (post: Post, index: number) => {
    setSelectedPost(post);
    setSelectedPostIndex(index);
    setShowPostViewer(true);
  };

  const closePostViewer = () => {
    setShowPostViewer(false);
    setSelectedPost(null);
  };

  const handleFilterChange = (filter: 'newest' | 'oldest' | 'most_viewed' | 'most_liked', gameFilter: string | null) => {
    setSelectedFilter(filter);
    setSelectedGameFilter(gameFilter);
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
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Post Filter Modal */}
      <PostFilterModal
        visible={showFilterMenu}
        onClose={() => setShowFilterMenu(false)}
        selectedFilter={selectedFilter}
        selectedGameFilter={selectedGameFilter}
        onFilterChange={handleFilterChange}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        <View style={styles.coverPhotoContainer}>
          <View style={styles.coverPhoto}>
            {viewedUser?.coverPhoto ? (
              <Image source={{ uri: viewedUser.coverPhoto }} style={styles.coverPhotoImage} />
            ) : null}
          </View>
        </View>

        {/* Profile Content */}
        <View style={styles.profileContentWrapper}>
          {/* Top Row: Avatar and Username/Stats */}
          <View style={styles.profileTopRow}>
            {/* Avatar on the left, overlapping cover */}
            <View style={styles.avatarContainer}>
              {loadingUser && !viewedUser ? (
                <View style={[styles.avatarCircle, styles.skeletonAvatar]} />
              ) : tierBorderGradient ? (
                <GradientBorder
                  colors={tierBorderGradient}
                  borderWidth={4}
                  borderRadius={40}
                >
                  <View style={styles.avatarCircleWithGradient}>
                    {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                      <Image source={{ uri: viewedUser.avatar }} style={styles.avatarImage} />
                    ) : (
                      <ThemedText style={styles.avatarInitial}>
                        {viewedUser?.avatar || viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                      </ThemedText>
                    )}
                  </View>
                </GradientBorder>
              ) : (
                <View style={styles.avatarCircle}>
                  {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                    <Image source={{ uri: viewedUser.avatar }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarInitial}>
                      {viewedUser?.avatar || viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
              )}
            </View>

            {/* Username and Stats on the right */}
            <View style={styles.profileInfoRight}>
              {/* Username */}
              {loadingUser && !viewedUser ? (
                <View style={[styles.skeletonText, { width: 120, height: 24, marginBottom: 12 }]} />
              ) : (
                <ThemedText style={styles.username}>{viewedUser?.username || 'User'}</ThemedText>
              )}

              {/* Stats in One Line */}
              {loadingUser && !viewedUser ? (
                <View style={[styles.skeletonText, { width: 200, height: 16 }]} />
              ) : (
                <View style={styles.statsRow}>
                  <ThemedText style={styles.statText}>{viewedUser?.postsCount || 0} Posts</ThemedText>
                  <ThemedText style={styles.statDividerText}> | </ThemedText>
                  <ThemedText style={styles.statText}>{viewedUser?.followersCount || 0} Followers</ThemedText>
                  <ThemedText style={styles.statDividerText}> | </ThemedText>
                  <ThemedText style={styles.statText}>{viewedUser?.followingCount || 0} Following</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Bio */}
          {viewedUser?.bio && (
            <View style={styles.bioContainer}>
              <ThemedText style={styles.bioText}>{viewedUser.bio}</ThemedText>
            </View>
          )}

          {/* Socials button */}
          {(viewedUser?.discordLink || viewedUser?.instagramLink) && (
            <TouchableOpacity
              style={styles.socialsButton}
              onPress={() => setShowSocialsSheet(true)}
              activeOpacity={0.7}
            >
              <IconSymbol size={18} name="link" color="#666" />
              <ThemedText style={styles.socialsButtonText}>Socials</ThemedText>
              <IconSymbol size={14} name="chevron.right" color="#999" />
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.unfollowButton]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              <ThemedText style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
                {followLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
              <IconSymbol size={18} name="bubble.left.fill" color="#000" />
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
        </View>

        <View style={[styles.postsSection, { display: activeMainTab === 'clips' ? 'flex' : 'none' }]}>
          {loadingPosts ? (
            <View style={styles.postsContainer}>
              <ActivityIndicator size="large" color="#000" />
              <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
            </View>
          ) : posts.length > 0 ? (
            <View style={styles.postsGrid}>
              {posts.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() => handlePostPress(post, index)}
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
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.postsContainer}>
              <IconSymbol size={48} name="square.stack.3d.up" color="#ccc" />
              <ThemedText style={styles.emptyStateText}>No posts yet</ThemedText>
            </View>
          )}
        </View>

        {/* RankCards Tab Content */}
        <View style={[styles.section, { display: activeMainTab === 'rankCards' ? 'flex' : 'none' }]}>
          {!riotAccount && !valorantAccount ? (
            // Empty state when user has no gaming accounts linked
            <View style={styles.emptyRankCardsContainer}>
              <IconSymbol size={48} name="gamecontroller" color="#ccc" />
              <ThemedText style={styles.emptyStateText}>No RankCards</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>This user hasn't linked any gaming accounts yet</ThemedText>
            </View>
          ) : userGames.length === 0 ? (
            // User has accounts but no enabled rank cards
            <View style={styles.emptyRankCardsContainer}>
              <IconSymbol size={48} name="gamecontroller" color="#ccc" />
              <ThemedText style={styles.emptyStateText}>No RankCards</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>This user hasn't added any rank cards yet</ThemedText>
            </View>
          ) : (
            <View style={styles.verticalRankCardsContainer}>
              {/* Vertical Stack of Rank Cards */}
              {userGames.map((game) => {
                // Use appropriate account username based on game
                let displayUsername = viewedUser?.username || 'User';

                if (game.name === 'Valorant' && valorantAccount) {
                  displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                  displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                }

                return (
                  <View key={game.id} style={styles.verticalCardWrapper}>
                    <RankCard game={game} username={displayUsername} viewOnly={false} userId={viewedUser?.id} />
                  </View>
                );
              })}
            </View>
          )}
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
        onCommentAdded={fetchPosts}
        enableVideoScrubber={true}
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
                      <View>
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
                      <View>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSpacer: {
    width: 32,
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
    paddingBottom: 8,
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
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e2124',
  },
  avatarCircleWithGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  bioContainer: {
    marginBottom: 0,
  },
  bioText: {
    fontSize: 14,
    color: '#dcddde',
    lineHeight: 20,
    fontWeight: '400',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  followButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  unfollowButton: {
    backgroundColor: '#36393e',
    borderWidth: 1,
    borderColor: '#2c2f33',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  unfollowButtonText: {
    color: '#fff',
  },
  messageButton: {
    width: 40,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#36393e',
    borderWidth: 1,
    borderColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
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
  mainTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
    paddingHorizontal: 20,
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
    letterSpacing: -0.2,
  },
  mainTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterButton: {
    padding: 8,
  },
  verticalRankCardsContainer: {
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
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
    marginTop: 8,
  },
  emptyRankCardsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 12,
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
});
