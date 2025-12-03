import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Video, ResizeMode } from 'expo-av';
import { getFollowing } from '@/services/followService';

const { width } = Dimensions.get('window');

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
  createdAt: Timestamp;
  likes: number;
}

export default function HomeScreen() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('following');
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [forYouPosts, setForYouPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);

  const currentPosts = activeTab === 'forYou' ? forYouPosts : followingPosts;

  // Fetch users that current user is following
  useEffect(() => {
    const fetchFollowingUsers = async () => {
      if (!currentUser?.id) return;

      try {
        const followingData = await getFollowing(currentUser.id);
        const userIds = followingData.map(follow => follow.followingId);
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
          </View>
        ) : currentPosts.length > 0 ? (
          currentPosts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              {/* User Header */}
              <View style={styles.postHeader}>
                <View style={styles.userInfo}>
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
                </View>
              </View>

              {/* Caption */}
              {post.caption && (
                <View style={styles.captionContainer}>
                  <ThemedText style={styles.caption}>{post.caption}</ThemedText>
                </View>
              )}

              {/* Media Content */}
              <View style={styles.mediaContent}>
                {post.mediaType === 'video' ? (
                  post.thumbnailUrl ? (
                    <Image
                      source={{ uri: post.thumbnailUrl }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={{ uri: post.mediaUrl }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                  )
                ) : (
                  <Image
                    source={{ uri: post.mediaUrl }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                )}
                {post.mediaType === 'video' && (
                  <View style={styles.playIconOverlay}>
                    <IconSymbol size={60} name="play.circle.fill" color="rgba(255,255,255,0.9)" />
                  </View>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#000',
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
  mediaContent: {
    width: width,
    height: width * 1.25,
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
});