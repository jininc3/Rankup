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
  const [cardsExpanded, setCardsExpanded] = useState(false);

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

      // Sort by newest first
      fetchedPosts = fetchedPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Fetch user profile and posts when component mounts
  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchPosts();
    }
  }, [userId]);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchUserProfile();
        fetchPosts();
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

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          {/* Top Header Icons */}
          <View style={styles.headerIconsRow}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <IconSymbol size={24} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerIconsSpacer} />
          </View>

          {/* Cover Photo Area */}
          <View style={styles.coverPhotoWrapper}>
            {viewedUser?.coverPhoto ? (
              <Image
                source={{ uri: viewedUser.coverPhoto }}
                style={styles.coverPhotoImage}
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
          </View>

          {/* Username Row with Profile Avatar on Right */}
          <View style={styles.usernameRow}>
            <ThemedText style={styles.largeUsername}>{viewedUser?.username || 'User'}</ThemedText>

            {/* Profile Avatar */}
            <View style={styles.profileAvatarButton}>
              {tierBorderGradient ? (
                <GradientBorder
                  colors={tierBorderGradient}
                  borderWidth={2}
                  borderRadius={28}
                >
                  <View style={styles.profileAvatarCircleWithGradient}>
                    {viewedUser?.avatar && viewedUser.avatar.startsWith('http') ? (
                      <Image
                        source={{ uri: viewedUser.avatar }}
                        style={styles.profileAvatarImage}
                      />
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
                    <Image
                      source={{ uri: viewedUser.avatar }}
                      style={styles.profileAvatarImage}
                    />
                  ) : (
                    <ThemedText style={styles.profileAvatarInitial}>
                      {viewedUser?.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Followers / Following Row */}
          <View style={styles.followStatsRow}>
            <View style={styles.followStatItem}>
              <ThemedText style={styles.followStatNumber}>{viewedUser?.followersCount || 0}</ThemedText>
              <ThemedText style={styles.followStatLabel}> Followers</ThemedText>
            </View>
            <View style={styles.followStatDivider} />
            <View style={styles.followStatItem}>
              <ThemedText style={styles.followStatNumber}>{viewedUser?.followingCount || 0}</ThemedText>
              <ThemedText style={styles.followStatLabel}> Following</ThemedText>
            </View>
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

            {/* Follow Button - replaces Edit Profile */}
            {userId !== currentUser?.id && (
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollowToggle}
                disabled={followLoading}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Bio Section */}
          {viewedUser?.bio && (
            <View style={styles.bioSection}>
              <ThemedText style={styles.bioText}>{viewedUser.bio}</ThemedText>
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
                      <IconSymbol size={28} name="photo.fill" color="#72767d" />
                    </View>
                    <View style={[styles.emptyClipsIconCircle, styles.emptyClipsIconCircleCenter]}>
                      <IconSymbol size={36} name="video.fill" color="#fff" />
                    </View>
                    <View style={styles.emptyClipsIconCircle}>
                      <IconSymbol size={28} name="sparkles" color="#72767d" />
                    </View>
                  </View>
                  <ThemedText style={styles.emptyStateTitle}>No clips yet</ThemedText>
                  <ThemedText style={styles.emptyStateSubtext}>
                    This user hasn't posted any clips
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Rank Cards Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <IconSymbol size={18} name="star.fill" color="#fff" />
                <ThemedText style={styles.sectionHeaderTitle}>Rank Cards</ThemedText>
              </View>
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
            </View>

            {/* Rank Cards Content */}
            <View style={[styles.rankCardsSection, { marginBottom: (userGames.length > 1 && cardsExpanded) ? 20 : 4 }]}>
              {!riotAccount && !valorantAccount ? (
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
                  <ThemedText style={styles.emptyStateTitle}>No rank cards yet</ThemedText>
                  <ThemedText style={styles.emptyStateSubtext}>
                    This user hasn't linked any gaming accounts
                  </ThemedText>
                </View>
              ) : userGames.length === 1 ? (
                // Single Card View
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
                // Multiple Cards View - stacked/expandable
                <View style={[styles.verticalRankCardsContainer, !cardsExpanded && { paddingBottom: 0 }]}>
                  {!cardsExpanded ? (
                    // Stacked Cards View
                    <TouchableOpacity
                      style={[styles.stackedCardsWrapper, { height: 240 }]}
                      onPress={toggleCardExpansion}
                      activeOpacity={0.9}
                    >
                      {userGames.map((game, index) => {
                        let displayUsername = viewedUser?.username || 'User';

                        if (game.name === 'Valorant' && valorantAccount) {
                          displayUsername = `${valorantAccount.gameName}#${valorantAccount.tag}`;
                        } else if ((game.name === 'League of Legends' || game.name === 'TFT') && riotAccount) {
                          displayUsername = `${riotAccount.gameName}#${riotAccount.tagLine}`;
                        }

                        const totalCards = userGames.length;
                        const reverseIndex = totalCards - 1 - index;
                        const topOffset = reverseIndex * -50;
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
                                zIndex: index + 1,
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
                      {userGames.map((game) => {
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
                      })}
                    </>
                  )}
                </View>
              )}
            </View>
          </View>
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
  headerSection: {
    backgroundColor: '#0f0f0f',
    paddingTop: 50,
  },
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
  coverPhotoFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
    zIndex: 1,
  },
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
  followButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#c42743',
  },
  followingButton: {
    backgroundColor: '#2c2f33',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  followingButtonText: {
    color: '#fff',
  },
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
    borderColor: '#0f0f0f',
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
    borderColor: '#0f0f0f',
  },
  emptyClipsIconCircleCenter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#c42743',
    zIndex: 1,
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
});
