import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowing } from '@/services/followService';
import { ResizeMode, Video } from 'expo-av';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Game data
const gameData: { [key: string]: { name: string; icon: string } } = {
  valorant: { name: 'Valorant', icon: '🎯' },
  league: { name: 'League of Legends', icon: '⚔️' },
  apex: { name: 'Apex Legends', icon: '🎮' },
  fortnite: { name: 'Fortnite', icon: '🏆' },
  csgo: { name: 'CS:GO', icon: '🔫' },
  overwatch: { name: 'Overwatch', icon: '🦸' },
};

const getGameIcon = (gameId: string) => gameData[gameId]?.icon || '🎮';
const getGameName = (gameId: string) => gameData[gameId]?.name || gameId;

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('following');
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [forYouPosts, setForYouPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const postRefs = useRef<{ [key: string]: View | null }>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const currentPosts = activeTab === 'forYou' ? forYouPosts : followingPosts;

  // Fetch users that current user is following
  useEffect(() => {
    const fetchFollowingUsers = async () => {
      if (!currentUser?.id) return;

      try {
        const followingData = await getFollowing(currentUser.id);
        const userIds = followingData.map(follow => follow.followingId);
        console.log('Following user IDs:', userIds);
        setFollowingUserIds(userIds);
      } catch (error) {
        console.error('Error fetching following:', error);
      }
    };

    fetchFollowingUsers();
  }, [currentUser?.id]);

  // Fetch posts from followed users and all posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!currentUser?.id) return;

      setLoading(true);
      try {
        // Fetch all posts for "For You" tab (empty for now)
        setForYouPosts([]);

        // Fetch all posts and filter for "Following" tab
        const allPostsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc')
        );
        const allPostsSnapshot = await getDocs(allPostsQuery);
        const allPosts: Post[] = allPostsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Post));

        // Filter posts from followed users only (exclude current user's own posts)
        const followingPostsFiltered = allPosts.filter(post =>
          followingUserIds.includes(post.userId) && post.userId !== currentUser.id
        );
        console.log('All posts count:', allPosts.length);
        console.log('Following posts count:', followingPostsFiltered.length);
        console.log('Following posts:', followingPostsFiltered);
        setFollowingPosts(followingPostsFiltered);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (followingUserIds.length > 0 || activeTab === 'forYou') {
      fetchPosts();
    } else {
      setLoading(false);
    }
  }, [currentUser?.id, followingUserIds, activeTab]);

  // Pause video when navigating away from this screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Pause video when screen loses focus
        setPlayingVideoId(null);
      };
    }, [])
  );

  // Check for visible videos when posts load or tab changes
  useEffect(() => {
    if (currentPosts.length > 0 && !loading) {
      // Delay to ensure refs are set
      setTimeout(() => {
        checkVideoInView();
      }, 100);
    } else {
      // If no posts, clear playing video
      setPlayingVideoId(null);
    }
  }, [currentPosts, loading, checkVideoInView]);

  const handleVideoClick = (postId: string) => {
    setPlayingVideoId(playingVideoId === postId ? null : postId);
  };

  // Check which video is in viewport
  const checkVideoInView = useCallback(() => {
    const videoPosts = currentPosts.filter(post => post.mediaType === 'video');
    let foundVisibleVideo = false;

    videoPosts.forEach(post => {
      const ref = postRefs.current[post.id];
      if (ref) {
        ref.measureInWindow((x, y, width, height) => {
          const windowHeight = Dimensions.get('window').height;
          const headerHeight = 150; // Approximate height of header + tabs

          // Check if video is at least 50% visible in viewport
          const isVisible =
            y + height > headerHeight &&
            y < windowHeight &&
            (y + height / 2) > headerHeight &&
            (y + height / 2) < windowHeight;

          if (isVisible && !foundVisibleVideo) {
            foundVisibleVideo = true;
            if (playingVideoId !== post.id) {
              setPlayingVideoId(post.id);
            }
          } else if (!isVisible && playingVideoId === post.id) {
            setPlayingVideoId(null);
          }
        });
      }
    });
  }, [currentPosts, playingVideoId]);

  const handleScroll = () => {
    // Use requestAnimationFrame for smoother checking
    requestAnimationFrame(() => {
      checkVideoInView();
    });
  };

  const handleUserPress = (userId: string) => {
    // Check if clicking on own profile
    if (userId === currentUser?.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profilePages/profileView?userId=${userId}`);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Home</ThemedText>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forYou' && styles.tabActive]}
          onPress={() => setActiveTab('forYou')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'forYou' && styles.tabTextActive]}>
            For You
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            Following
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onScrollEndDrag={handleScroll}
        onMomentumScrollEnd={handleScroll}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
          </View>
        ) : currentPosts.length > 0 ? (
          currentPosts.map((post) => (
            <View
              key={post.id}
              style={styles.postCard}
              ref={(ref) => (postRefs.current[post.id] = ref)}
              collapsable={false}
            >
              {/* User Header */}
              <View style={styles.postHeader}>
                <TouchableOpacity
                  style={styles.userInfo}
                  onPress={() => handleUserPress(post.userId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarContainer}>
                    {post.avatar && post.avatar.startsWith('http') ? (
                      <Image source={{ uri: post.avatar }} style={styles.avatarImage} />
                    ) : (
                      <ThemedText style={styles.avatarInitial}>
                        {post.username[0].toUpperCase()}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.username}>{post.username}</ThemedText>
                </TouchableOpacity>
                {post.taggedGame && (
                  <View style={styles.gameTag}>
                    <ThemedText style={styles.gameTagText}>
                      {getGameIcon(post.taggedGame)} {getGameName(post.taggedGame)}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Caption */}
              {post.caption && (
                <View style={styles.captionContainer}>
                  <ThemedText style={styles.caption}>{post.caption}</ThemedText>
                </View>
              )}

              {/* Media Content */}
              <View style={post.mediaType === 'video' ? styles.mediaContentVideo : styles.mediaContentImage}>
                {post.mediaType === 'video' ? (
                  <Video
                    source={{ uri: post.mediaUrl }}
                    style={styles.mediaImage}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={playingVideoId === post.id}
                    isLooping
                    onPlaybackStatusUpdate={(status) => {
                      // Handle video end
                      if (status.isLoaded && status.didJustFinish) {
                        // Video will loop automatically due to isLooping prop
                      }
                    }}
                  />
                ) : (
                  <Image
                    source={{ uri: post.mediaUrl }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                )}
              </View>

              {/* Post Footer */}
              <View style={styles.postFooter}>
                <TouchableOpacity style={styles.likeButton}>
                  <IconSymbol size={28} name="heart" color="#000" />
                  <ThemedText style={styles.actionCount}>{post.likes}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.commentButton}>
                  <IconSymbol size={28} name="bubble.left" color="#000" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton}>
                  <IconSymbol size={28} name="paperplane" color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol size={64} name="person.2" color="#ccc" />
            <ThemedText style={styles.emptyText}>
              {activeTab === 'following'
                ? "No posts from people you follow yet"
                : "No posts available"}
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {activeTab === 'following'
                ? "Follow users to see their posts here"
                : "Check back later for new content"}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 0,
    marginHorizontal: 8,
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  postCard: {
    marginBottom: 24,
    backgroundColor: '#fff',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  gameTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  followText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  caption: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  mediaContentImage: {
    width: width,
    height: width, // 1:1 square aspect ratio for images
    backgroundColor: '#000',
    position: 'relative',
  },
  mediaContentVideo: {
    width: width,
    height: width * 0.5625, // 16:9 landscape aspect ratio (9/16 = 0.5625) for videos
    backgroundColor: '#000',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareButton: {
    marginLeft: 'auto',
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  videoThumbnailContainer: {
    width: '100%',
    height: '100%',
  },
});