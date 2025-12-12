import rankCard from '@/app/components/rankCard';

// Alias for JSX usage (React components must start with uppercase)
const RankCard = rankCard;
import NewPost from '@/app/components/newPost';
import { currentUser } from '@/app/data/userData';
import PostFilterModal from '@/app/profilePages/postFilterModal';
import PostViewerModal from '@/app/profilePages/postViewerModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, Timestamp, where, doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getRiotStats, formatRank } from '@/services/riotService';

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
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState<'games' | 'posts'>('games');
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
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);

  // Dynamic games array based on Riot data
  const userGames = [
    {
      id: 1,
      name: 'Valorant',
      rank: currentUser.gamesPlayed.valorant.currentRank,
      trophies: 1243,
      icon: '🎯',
      image: require('@/assets/images/valorant.png'),
      wins: Math.floor(currentUser.gamesPlayed.valorant.gamesPlayed * (currentUser.gamesPlayed.valorant.winRate / 100)),
      losses: currentUser.gamesPlayed.valorant.gamesPlayed - Math.floor(currentUser.gamesPlayed.valorant.gamesPlayed * (currentUser.gamesPlayed.valorant.winRate / 100)),
      winRate: currentUser.gamesPlayed.valorant.winRate,
      recentMatches: ['+20', '+18', '-15', '+22', '+19'],
    },
    {
      id: 2,
      name: 'League of Legends',
      rank: riotStats?.rankedSolo
        ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)
        : currentUser.gamesPlayed.league.currentRank,
      trophies: riotStats?.rankedSolo?.leaguePoints || 876,
      icon: '⚔️',
      image: require('@/assets/images/leagueoflegends.png'),
      wins: riotStats?.rankedSolo?.wins || Math.floor(currentUser.gamesPlayed.league.gamesPlayed * (currentUser.gamesPlayed.league.winRate / 100)),
      losses: riotStats?.rankedSolo?.losses || (currentUser.gamesPlayed.league.gamesPlayed - Math.floor(currentUser.gamesPlayed.league.gamesPlayed * (currentUser.gamesPlayed.league.winRate / 100))),
      winRate: riotStats?.rankedSolo?.winRate || currentUser.gamesPlayed.league.winRate,
      recentMatches: ['+15', '-18', '+20', '+17', '-14'],
    },
  ];

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index !== selectedGameIndex && index >= 0 && index < userGames.length) {
      setSelectedGameIndex(index);
    }
  };

  const handleScrollDrag = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index !== selectedGameIndex && index >= 0 && index < userGames.length) {
      setSelectedGameIndex(index);
    }
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
    setSelectedGameIndex(index);
  };

  // Fetch Riot account and stats
  const fetchRiotData = async () => {
    if (!user?.id) return;

    try {
      // Fetch Riot account info from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.riotAccount) {
          setRiotAccount(data.riotAccount);

          // Fetch stats if account is linked
          try {
            const statsResponse = await getRiotStats(false);
            if (statsResponse.success && statsResponse.stats) {
              setRiotStats(statsResponse.stats);
            }
          } catch (error) {
            console.error('Error fetching Riot stats:', error);
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

  // Fetch Riot data and posts when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchRiotData();
      fetchPosts();
    }
  }, [user?.id]);

  // Refetch posts when filter or game filter changes
  useEffect(() => {
    if (user?.id) {
      fetchPosts();
    }
  }, [selectedFilter, selectedGameFilter]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser(); // Refresh user data from AuthContext
    await fetchRiotData(); // Refresh Riot data
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

  const handlePostCreated = () => {
    fetchPosts();
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

            {/* Socials below bio */}
            <View style={styles.socialsIconsRow}>
              <TouchableOpacity
                style={styles.socialLinkButton}
                onPress={async () => {
                  // Open Instagram link or show not configured message
                  if (user?.instagramLink) {
                    const url = user.instagramLink.startsWith('http')
                      ? user.instagramLink
                      : `https://instagram.com/${user.instagramLink}`;
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                      await Linking.openURL(url);
                    } else {
                      Alert.alert('Error', 'Cannot open Instagram link');
                    }
                  } else {
                    Alert.alert('Not Configured', 'Add your Instagram link in Edit Profile');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.instagramGradient, !user?.instagramLink && styles.socialNotConfigured]}>
                  <Image
                    source={require('@/assets/images/instagram.png')}
                    style={[styles.socialLinkIcon, !user?.instagramLink && styles.socialIconNotConfigured]}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialLinkButton}
                onPress={async () => {
                  // Open Discord link or show not configured message
                  if (user?.discordLink) {
                    const url = user.discordLink.startsWith('http')
                      ? user.discordLink
                      : `https://discord.com/users/${user.discordLink}`;
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                      await Linking.openURL(url);
                    } else {
                      Alert.alert('Error', 'Cannot open Discord link');
                    }
                  } else {
                    Alert.alert('Not Configured', 'Add your Discord link in Edit Profile');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.discordBackground, !user?.discordLink && styles.socialNotConfigured]}>
                  <Image
                    source={require('@/assets/images/discord.png')}
                    style={[styles.socialLinkIcon, !user?.discordLink && styles.socialIconNotConfigured]}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </View>
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
              <IconSymbol size={20} name="square.and.arrow.up" color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Tabs: Games and Posts */}
        <View style={styles.mainTabsContainer}>
          <View style={styles.mainTabsLeft}>
            <TouchableOpacity
              style={[styles.mainTab, activeMainTab === 'games' && styles.mainTabActive]}
              onPress={() => setActiveMainTab('games')}
            >
              <ThemedText style={[styles.mainTabText, activeMainTab === 'games' && styles.mainTabTextActive]}>
                Games
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mainTab, activeMainTab === 'posts' && styles.mainTabActive]}
              onPress={() => setActiveMainTab('posts')}
            >
              <ThemedText style={[styles.mainTabText, activeMainTab === 'posts' && styles.mainTabTextActive]}>
                Posts
              </ThemedText>
            </TouchableOpacity>
          </View>
          {activeMainTab === 'posts' && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterMenu(true)}
            >
              <IconSymbol size={20} name="line.3.horizontal.decrease.circle" color="#000" />
            </TouchableOpacity>
          )}
        </View>

        {activeMainTab === 'games' && (
        <View style={styles.section}>
          {/* Game Icon Selector */}
          <ScrollView
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
              // Use Riot account username for League of Legends if available
              const displayUsername = game.name === 'League of Legends' && riotAccount
                ? `${riotAccount.gameName}#${riotAccount.tagLine}`
                : user?.username || 'User';

              return (
                <View
                  key={game.id}
                  style={[
                    styles.cardWrapper,
                    {
                      width: CARD_WIDTH,
                      marginRight: index < userGames.length - 1 ? CARD_GAP : 0
                    }
                  ]}
                >
                  <RankCard game={game} username={displayUsername} />
                </View>
              );
            })}
          </ScrollView>
        </View>
        )}

        {/* Posts Tab Content */}
        {activeMainTab === 'posts' && (
          <View style={styles.postsSection}>
            {loadingPosts ? (
              <View style={styles.postsContainer}>
                <ActivityIndicator size="large" color="#000" />
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
                      <View style={styles.videoIndicator}>
                        <IconSymbol size={24} name="play.fill" color="#fff" />
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
                <IconSymbol size={48} name="square.stack.3d.up" color="#ccc" />
                <ThemedText style={styles.emptyStateText}>No posts yet</ThemedText>
                <ThemedText style={styles.emptyStateSubtext}>Share your gaming achievements with the community</ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Post Button - only visible on Posts tab */}
      {activeMainTab === 'posts' && (
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
        onCommentAdded={fetchPosts}
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
    color: '#000',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  statDividerText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '400',
  },
  bioSocialsContainer: {
    marginBottom: 20,
  },
  bioText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '400',
    marginBottom: 10,
  },
  emptyBioText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  socialsIconsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialLinkButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  instagramGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E4405F',
  },
  discordBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#5865F2',
  },
  socialLinkIcon: {
    width: 22,
    height: 22,
  },
  socialNotConfigured: {
    borderColor: '#e5e5e5',
    opacity: 0.5,
  },
  socialIconNotConfigured: {
    opacity: 0.4,
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
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
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gameIconCircleActive: {
    borderColor: '#000',
    backgroundColor: '#fff',
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
  mainTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  mainTabsLeft: {
    flexDirection: 'row',
  },
  mainTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 0,
    marginRight: 8,
    position: 'relative',
  },
  mainTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  mainTabTextActive: {
    color: '#000',
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
    color: '#000',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    marginTop: 0,
  },
  postItem: {
    width: (screenWidth - 2) / 3, // 3 columns, only account for 2 gaps (1px each)
    height: (screenWidth - 2) / 3, // 1:1 aspect ratio (square)
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
});