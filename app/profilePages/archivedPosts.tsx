import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, Image, Alert, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Timestamp } from 'firebase/firestore';
import { deletePostMedia } from '@/services/storageService';

interface ArchivedPost {
  id: string;
  userId: string;
  username: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video';
  mediaTypes?: string[];
  thumbnailUrl?: string;
  caption?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
  archived: boolean;
}

// Helper function to format video duration
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ArchivedPostsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [archivedPosts, setArchivedPosts] = useState<ArchivedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ArchivedPost | null>(null);

  const fetchArchivedPosts = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', user.id),
        where('archived', '==', true)
      );

      const querySnapshot = await getDocs(postsQuery);
      let fetchedPosts: ArchivedPost[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ArchivedPost));

      // Sort by newest first
      fetchedPosts = fetchedPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      setArchivedPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching archived posts:', error);
      Alert.alert('Error', 'Failed to load archived posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedPosts();
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchArchivedPosts();
    setRefreshing(false);
  }, [user?.id]);

  const handlePostPress = (post: ArchivedPost) => {
    setSelectedPost(post);
    showPostOptions(post);
  };

  const showPostOptions = (post: ArchivedPost) => {
    Alert.alert(
      'Post Options',
      'What would you like to do with this post?',
      [
        {
          text: 'Unarchive',
          onPress: () => handleUnarchive(post),
        },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => handleDeletePermanently(post),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleUnarchive = async (post: ArchivedPost) => {
    try {
      // Update post in Firestore to remove archived flag
      await updateDoc(doc(db, 'posts', post.id), {
        archived: false,
      });

      // Remove from local state
      setArchivedPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));

      Alert.alert('Success', 'Post restored to your profile');
    } catch (error) {
      console.error('Unarchive post error:', error);
      Alert.alert('Error', 'Failed to unarchive post');
    }
  };

  const handleDeletePermanently = (post: ArchivedPost) => {
    Alert.alert(
      'Delete Permanently',
      'Are you sure you want to permanently delete this post? This action cannot be undone.',
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

              // Remove from local state
              setArchivedPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));

              Alert.alert('Success', 'Post deleted permanently');
            } catch (error) {
              console.error('Delete post error:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Archived Posts</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c42743" />
          <ThemedText style={styles.loadingText}>Loading archived posts...</ThemedText>
        </View>
      ) : archivedPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol size={64} name="archivebox" color="#333" />
          <ThemedText style={styles.emptyTitle}>No Archived Posts</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Posts you archive will appear here. They won't be visible on your profile until you unarchive them.
          </ThemedText>
        </View>
      ) : (
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
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <IconSymbol size={16} name="info.circle" color="#666" />
            <ThemedText style={styles.infoBannerText}>
              Tap a post to unarchive or delete it permanently
            </ThemedText>
          </View>

          {/* Archived Posts Count */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              {archivedPosts.length} {archivedPosts.length === 1 ? 'Post' : 'Posts'}
            </ThemedText>
          </View>

          {/* Posts Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalClipsContainer}
          >
            {archivedPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.horizontalClipItem}
                onPress={() => handlePostPress(post)}
                activeOpacity={0.9}
              >
                <Image
                  source={{
                    uri: post.mediaType === 'video' && post.thumbnailUrl
                      ? post.thumbnailUrl
                      : post.mediaUrl
                  }}
                  style={styles.horizontalClipImage}
                  resizeMode="cover"
                />
                {/* Video duration indicator */}
                {post.mediaType === 'video' && (
                  <View style={styles.videoDuration}>
                    <ThemedText style={styles.videoDurationText}>
                      {formatDuration((post as any).duration)}
                    </ThemedText>
                  </View>
                )}
                {/* Multiple media indicator */}
                {post.mediaUrls && post.mediaUrls.length > 1 && (
                  <View style={styles.multipleIndicator}>
                    <IconSymbol size={14} name="square.on.square" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
    backgroundColor: '#0f0f0f',
  },
  backButton: {
    padding: 4,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  bottomSpacer: {
    height: 40,
  },
});
