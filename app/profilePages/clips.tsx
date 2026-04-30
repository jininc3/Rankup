import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import PostViewerModal from '@/app/components/postViewerModal';
import ManageCategoriesModal from '@/app/components/manageCategoriesModal';
import AssignCategoryModal from '@/app/components/assignCategoryModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCount } from '@/utils/formatCount';
import { ClipsGridSkeleton, ClipsListSkeleton } from '@/components/ui/Skeleton';

const { width: screenWidth } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;

// Module-level cache so data persists across navigations
const clipsCache: Record<string, { posts: Post[]; clipCategories: string[] }> = {};

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
  categories?: string[];
}

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ClipsPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const userId = params.userId || currentUser?.id;
  const isOwnProfile = userId === currentUser?.id;

  const cached = userId ? clipsCache[userId] : undefined;
  const [posts, setPosts] = useState<Post[]>(cached?.posts ?? []);
  const [loading, setLoading] = useState(!cached);
  const [clipCategories, setClipCategories] = useState<string[]>(cached?.clipCategories ?? []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPostViewer, setShowPostViewer] = useState(false);

  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showAssignCategory, setShowAssignCategory] = useState(false);
  const [categorizingPost, setCategorizingPost] = useState<Post | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [thumbnailsReady, setThumbnailsReady] = useState(!!cached);
  const loadedCountRef = useRef(0);
  const expectedCountRef = useRef(0);

  const onThumbnailLoadOrError = useCallback(() => {
    loadedCountRef.current += 1;
    if (loadedCountRef.current >= expectedCountRef.current) {
      setThumbnailsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (clipsCache[userId]) {
      // Already showing cached data, refresh in background
      fetchData(true);
    } else {
      fetchData();
    }
  }, [userId]);

  const fetchData = async (background = false) => {
    if (!userId) return;
    if (!background) {
      setLoading(true);
      setThumbnailsReady(false);
      loadedCountRef.current = 0;
    }
    try {
      const [postsSnapshot, userDoc] = await Promise.all([
        getDocs(query(collection(db, 'posts'), where('userId', '==', userId))),
        getDoc(doc(db, 'users', userId)),
      ]);

      let fetchedPosts: Post[] = postsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post));
      fetchedPosts = fetchedPosts
        .filter(p => !(p as any).archived)
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      const categories = userDoc.exists() ? (userDoc.data().clipCategories || []) : [];

      // Prefetch all thumbnails before rendering
      const thumbUrls = fetchedPosts.map(p =>
        p.mediaType === 'video' && p.thumbnailUrl ? p.thumbnailUrl : p.mediaUrl
      ).filter(Boolean);
      await Promise.all(thumbUrls.map(url => Image.prefetch(url).catch(() => {})));

      if (!background) {
        expectedCountRef.current = fetchedPosts.length;
        if (fetchedPosts.length === 0) {
          setThumbnailsReady(true);
        }
      }
      setPosts(fetchedPosts);
      setClipCategories(categories);

      // Update cache
      clipsCache[userId] = { posts: fetchedPosts, clipCategories: categories };
    } catch (error) {
      console.error('Error fetching clips:', error);
      if (!background) setThumbnailsReady(true);
    } finally {
      if (!background) setLoading(false);
    }
  };

  const filteredPosts = selectedCategory
    ? posts.filter(p => p.categories?.includes(selectedCategory))
    : posts;

  const handlePostPress = (post: Post) => {
    const index = filteredPosts.findIndex(p => p.id === post.id);
    setSelectedPost(post);
    setSelectedPostIndex(index >= 0 ? index : 0);
    setShowPostViewer(true);
  };

  const handleCategorize = (post: Post) => {
    setCategorizingPost(post);
    setShowAssignCategory(true);
  };

  const handleSavePostCategories = async (newCategories: string[]) => {
    if (!categorizingPost) return;
    try {
      await updateDoc(doc(db, 'posts', categorizingPost.id), { categories: newCategories });
      setPosts(prev => {
        const updated = prev.map(p => p.id === categorizingPost.id ? { ...p, categories: newCategories } : p);
        if (userId) clipsCache[userId] = { posts: updated, clipCategories };
        return updated;
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update categories');
    }
  };

  const handleSaveCategoriesWithPosts = async (
    newCategories: string[],
    postUpdates: { postId: string; categories: string[] }[]
  ) => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId), { clipCategories: newCategories });
      setClipCategories(newCategories);
      if (selectedCategory && !newCategories.includes(selectedCategory)) {
        setSelectedCategory(null);
      }
      for (const update of postUpdates) {
        await updateDoc(doc(db, 'posts', update.postId), { categories: update.categories });
      }
      if (postUpdates.length > 0) {
        const updateMap = new Map(postUpdates.map(u => [u.postId, u.categories]));
        setPosts(prev => {
          const updated = prev.map(p => updateMap.has(p.id) ? { ...p, categories: updateMap.get(p.id) } : p);
          if (userId) clipsCache[userId] = { posts: updated, clipCategories: newCategories };
          return updated;
        });
      } else if (userId) {
        clipsCache[userId] = { ...clipsCache[userId], clipCategories: newCategories };
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update categories');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>Clips</ThemedText>
        </View>
        <View style={styles.headerRight}>
          {isOwnProfile && (
            <TouchableOpacity style={styles.newClipButton} onPress={() => router.push('/postPages/createPostVideo')}>
              <IconSymbol size={14} name="plus" color="#fff" />
              <ThemedText style={styles.newClipButtonText}>New Clip</ThemedText>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.viewToggle} onPress={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}>
            <IconSymbol size={18} name={viewMode === 'grid' ? 'list.bullet' : 'square.grid.2x2'} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12 }}>
          {viewMode === 'grid' ? <ClipsGridSkeleton count={4} /> : <ClipsListSkeleton count={6} />}
        </ScrollView>
      ) : posts.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Skeleton overlay while thumbnails decode from cache */}
          {!thumbnailsReady && (
            <View style={styles.skeletonOverlay} pointerEvents="none">
              {viewMode === 'grid' ? <ClipsGridSkeleton count={4} /> : <ClipsListSkeleton count={6} />}
            </View>
          )}
          <View style={{ opacity: thumbnailsReady ? 1 : 0 }}>
          {/* Category Filter */}
          {clipCategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              <TouchableOpacity
                style={[styles.categoryPill, selectedCategory === null && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(null)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.categoryPillText, selectedCategory === null && styles.categoryPillTextActive]}>All</ThemedText>
              </TouchableOpacity>
              {clipCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>{cat}</ThemedText>
                </TouchableOpacity>
              ))}
              {isOwnProfile && (
                <TouchableOpacity
                  style={styles.addCategoryPill}
                  onPress={() => setShowManageCategories(true)}
                  activeOpacity={0.7}
                >
                  <IconSymbol size={14} name="plus" color="#666" />
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
          {filteredPosts.length > 0 ? (
            viewMode === 'grid' ? (
              <View style={styles.grid}>
                {filteredPosts.map((post) => {
                  const thumbUri = post.mediaType === 'video' && post.thumbnailUrl ? post.thumbnailUrl : post.mediaUrl;
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.gridItem}
                      onPress={() => handlePostPress(post)}
                      onLongPress={isOwnProfile ? () => handleCategorize(post) : undefined}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: thumbUri }} style={styles.gridImage} resizeMode="cover" onLoad={onThumbnailLoadOrError} onError={onThumbnailLoadOrError} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        locations={[0.4, 1]}
                        style={styles.gridItemGradient}
                        pointerEvents="none"
                      />
                      <View style={styles.gridItemBorder} pointerEvents="none" />
                      {post.mediaType === 'video' && (
                        <View style={styles.durationBadge}>
                          <IconSymbol size={9} name="play.fill" color="#fff" />
                          <ThemedText style={styles.durationText}>{formatDuration(post.duration)}</ThemedText>
                        </View>
                      )}
                      {post.mediaUrls && post.mediaUrls.length > 1 && (
                        <View style={styles.multiBadge}>
                          <IconSymbol size={12} name="square.on.square" color="#fff" />
                        </View>
                      )}
                      {post.likes > 0 && (
                        <View style={styles.likesBadge}>
                          <IconSymbol size={9} name="heart.fill" color="#fff" />
                          <ThemedText style={styles.likesText}>{formatCount(post.likes)}</ThemedText>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredPosts.map((post) => {
                  const thumbUri = post.mediaType === 'video' && post.thumbnailUrl ? post.thumbnailUrl : post.mediaUrl;
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.listItem}
                      onPress={() => handlePostPress(post)}
                      onLongPress={isOwnProfile ? () => handleCategorize(post) : undefined}
                      activeOpacity={0.85}
                    >
                      <View style={styles.listThumbWrap}>
                        <Image source={{ uri: thumbUri }} style={styles.listThumb} resizeMode="cover" onLoad={onThumbnailLoadOrError} onError={onThumbnailLoadOrError} />
                        {post.mediaType === 'video' && (
                          <View style={styles.listPlayBadge}>
                            <IconSymbol size={8} name="play.fill" color="#fff" />
                            <ThemedText style={styles.listPlayText}>{formatDuration(post.duration)}</ThemedText>
                          </View>
                        )}
                      </View>
                      <View style={styles.listInfo}>
                        <ThemedText style={styles.listCaption} numberOfLines={2}>
                          {post.caption || 'No caption'}
                        </ThemedText>
                        <View style={styles.listMeta}>
                          {post.likes > 0 && (
                            <View style={styles.listMetaItem}>
                              <IconSymbol size={10} name="heart.fill" color="#666" />
                              <ThemedText style={styles.listMetaText}>{formatCount(post.likes)}</ThemedText>
                            </View>
                          )}
                          {(post.commentsCount ?? 0) > 0 && (
                            <View style={styles.listMetaItem}>
                              <IconSymbol size={10} name="bubble.left.fill" color="#666" />
                              <ThemedText style={styles.listMetaText}>{post.commentsCount}</ThemedText>
                            </View>
                          )}
                        </View>
                      </View>
                      <IconSymbol size={14} name="chevron.right" color="#444" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          ) : (
            <View style={styles.emptyCategoryState}>
              <ThemedText style={styles.emptyCategoryText}>
                No clips in "{selectedCategory}"
              </ThemedText>
              <ThemedText style={styles.emptyCategorySubtext}>
                Try a different category
              </ThemedText>
            </View>
          )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <IconSymbol size={32} name="video" color="#555" />
          </View>
          <ThemedText style={styles.emptyTitle}>No clips yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {isOwnProfile
              ? 'Your gaming highlights will appear here'
              : "This user hasn't posted any clips"}
          </ThemedText>
        </View>
      )}

      {/* Post Viewer Modal */}
      <PostViewerModal
        visible={showPostViewer}
        post={selectedPost}
        posts={filteredPosts}
        currentIndex={selectedPostIndex}
        onClose={() => { setShowPostViewer(false); setSelectedPost(null); }}
        onCategorize={isOwnProfile ? handleCategorize : undefined}
      />

      {/* Manage Categories Modal */}
      {isOwnProfile && (
        <ManageCategoriesModal
          visible={showManageCategories}
          categories={clipCategories}
          posts={posts}
          onClose={() => setShowManageCategories(false)}
          onSave={handleSaveCategoriesWithPosts}
        />
      )}

      {/* Assign Category Modal */}
      {isOwnProfile && categorizingPost && (
        <AssignCategoryModal
          visible={showAssignCategory}
          categories={clipCategories}
          selectedCategories={categorizingPost.categories || []}
          onClose={() => { setShowAssignCategory(false); setCategorizingPost(null); }}
          onSave={handleSavePostCategories}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },

  // Header — matches signup page style
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    width: 36,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggle: {
    padding: 8,
  },
  newClipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  newClipButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Category filter pills — glassmorphic
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 4,
  },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryPillActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  categoryPillTextActive: {
    color: '#0f0f0f',
  },
  addCategoryPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingTop: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Grid — refined with glassmorphic cards
  scrollContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 40,
  },
  grid: {
    gap: GRID_GAP,
  },
  gridItem: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#161616',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridItemGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  gridItemBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  multiBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 4,
    borderRadius: 6,
  },
  likesBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  likesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty state — matches signup page minimal feel
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Empty category state (inside ScrollView, below pills)
  emptyCategoryState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyCategoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  emptyCategorySubtext: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },

  // List view
  listContainer: {
    gap: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  listThumbWrap: {
    width: 110,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#161616',
  },
  listThumb: {
    width: '100%',
    height: '100%',
  },
  listPlayBadge: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listPlayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  listInfo: {
    flex: 1,
    gap: 6,
  },
  listCaption: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    lineHeight: 19,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listMetaText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
});
