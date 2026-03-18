import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, Image, ScrollView, ActivityIndicator, RefreshControl, Dimensions, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Timestamp } from 'firebase/firestore';
import PostViewerModal from '@/app/components/postViewerModal';

const { width: screenWidth } = Dimensions.get('window');
const COLUMN_GAP = 12;
const HORIZONTAL_PADDING = 16;
const COLUMN_WIDTH = (screenWidth - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / 2;
const ITEM_HEIGHT = COLUMN_WIDTH * 0.6; // Same aspect ratio as profile clips (120/200)

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video';
  mediaTypes?: string[];
  thumbnailUrl?: string;
  caption?: string;
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
  duration?: number;
}

type GameFilter = 'all' | 'valorant' | 'league' | 'apex' | 'fortnite' | 'csgo' | 'overwatch';

const GAME_FILTERS: { id: GameFilter; label: string; icon?: any }[] = [
  { id: 'all', label: 'All Games' },
  { id: 'valorant', label: 'Valorant' },
  { id: 'league', label: 'League of Legends' },
  { id: 'apex', label: 'Apex Legends' },
  { id: 'fortnite', label: 'Fortnite' },
  { id: 'csgo', label: 'CS:GO' },
  { id: 'overwatch', label: 'Overwatch' },
];

// Helper function to format video duration
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ClipsScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<GameFilter>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [viewedUsername, setViewedUsername] = useState<string>('');

  // Determine which user's clips to show
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const fetchPosts = async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user data if viewing another user's clips
      let username = user?.username || '';
      let avatar = user?.avatar;

      if (!isOwnProfile && userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          username = userData.username || '';
          avatar = userData.avatar;
          setViewedUsername(username);
        }
      } else {
        setViewedUsername(user?.username || '');
      }

      // Fetch all posts with just the where clause (no orderBy in query to avoid index requirement)
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', targetUserId)
      );

      const querySnapshot = await getDocs(postsQuery);
      let fetchedPosts: Post[] = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        avatar: avatar,
        username: username,
      } as Post));

      // Filter out archived posts and sort by newest first
      fetchedPosts = fetchedPosts
        .filter(post => !(post as any).archived)
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [targetUserId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [user?.id]);

  const filteredPosts = posts.filter(post => {
    if (selectedFilter === 'all') return true;
    return post.taggedGame?.toLowerCase() === selectedFilter;
  });

  const handlePostPress = (index: number) => {
    setSelectedPostIndex(index);
  };

  const getFilterLabel = () => {
    const filter = GAME_FILTERS.find(f => f.id === selectedFilter);
    return filter?.label || 'All Games';
  };

  // Split posts into two columns for masonry-like layout
  const leftColumn: Post[] = [];
  const rightColumn: Post[] = [];
  filteredPosts.forEach((post, index) => {
    if (index % 2 === 0) {
      leftColumn.push(post);
    } else {
      rightColumn.push(post);
    }
  });

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
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {isOwnProfile ? 'My Clips' : `${viewedUsername}'s Clips`}
        </ThemedText>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}
        >
          <IconSymbol size={20} name="line.3.horizontal.decrease" color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Active Filter Indicator */}
      {selectedFilter !== 'all' && (
        <View style={styles.activeFilterContainer}>
          <View style={styles.activeFilterBadge}>
            <ThemedText style={styles.activeFilterText}>{getFilterLabel()}</ThemedText>
            <TouchableOpacity
              onPress={() => setSelectedFilter('all')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol size={14} name="xmark" color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c42743" />
          <ThemedText style={styles.loadingText}>Loading clips...</ThemedText>
        </View>
      ) : filteredPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol size={64} name="video.slash" color="#333" />
          <ThemedText style={styles.emptyTitle}>
            {selectedFilter !== 'all' ? 'No clips found' : 'No clips yet'}
          </ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            {selectedFilter !== 'all'
              ? isOwnProfile
                ? `You don't have any ${getFilterLabel()} clips`
                : `${viewedUsername} doesn't have any ${getFilterLabel()} clips`
              : isOwnProfile
                ? 'Your gaming clips will appear here'
                : `${viewedUsername} hasn't posted any clips yet`}
          </ThemedText>
          {selectedFilter !== 'all' && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => setSelectedFilter('all')}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.clearFilterButtonText}>Clear Filter</ThemedText>
            </TouchableOpacity>
          )}
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
          contentContainerStyle={styles.scrollContent}
        >
          {/* Clips Count */}
          <View style={styles.countHeader}>
            <ThemedText style={styles.countText}>
              {filteredPosts.length} {filteredPosts.length === 1 ? 'Clip' : 'Clips'}
            </ThemedText>
          </View>

          {/* Two Column Grid */}
          <View style={styles.gridContainer}>
            {/* Left Column */}
            <View style={styles.column}>
              {leftColumn.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  onPress={() => handlePostPress(index * 2)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{
                      uri: post.mediaType === 'video' && post.thumbnailUrl
                        ? post.thumbnailUrl
                        : post.mediaUrl
                    }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  {/* Video duration */}
                  {post.mediaType === 'video' && (
                    <View style={styles.videoDuration}>
                      <ThemedText style={styles.videoDurationText}>
                        {formatDuration(post.duration)}
                      </ThemedText>
                    </View>
                  )}
                  {/* Multiple media indicator */}
                  {post.mediaUrls && post.mediaUrls.length > 1 && (
                    <View style={styles.multipleIndicator}>
                      <IconSymbol size={14} name="square.on.square" color="#fff" />
                    </View>
                  )}
                  {/* Game tag */}
                  {post.taggedGame && (
                    <View style={styles.gameTag}>
                      <ThemedText style={styles.gameTagText}>
                        {post.taggedGame.charAt(0).toUpperCase() + post.taggedGame.slice(1)}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Right Column */}
            <View style={styles.column}>
              {rightColumn.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  onPress={() => handlePostPress(index * 2 + 1)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{
                      uri: post.mediaType === 'video' && post.thumbnailUrl
                        ? post.thumbnailUrl
                        : post.mediaUrl
                    }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  {/* Video duration */}
                  {post.mediaType === 'video' && (
                    <View style={styles.videoDuration}>
                      <ThemedText style={styles.videoDurationText}>
                        {formatDuration(post.duration)}
                      </ThemedText>
                    </View>
                  )}
                  {/* Multiple media indicator */}
                  {post.mediaUrls && post.mediaUrls.length > 1 && (
                    <View style={styles.multipleIndicator}>
                      <IconSymbol size={14} name="square.on.square" color="#fff" />
                    </View>
                  )}
                  {/* Game tag */}
                  {post.taggedGame && (
                    <View style={styles.gameTag}>
                      <ThemedText style={styles.gameTagText}>
                        {post.taggedGame.charAt(0).toUpperCase() + post.taggedGame.slice(1)}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Filter by Game</ThemedText>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol size={24} name="xmark" color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOptions}>
              {GAME_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterOption,
                    selectedFilter === filter.id && styles.filterOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedFilter(filter.id);
                    setShowFilterModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[
                    styles.filterOptionText,
                    selectedFilter === filter.id && styles.filterOptionTextSelected
                  ]}>
                    {filter.label}
                  </ThemedText>
                  {selectedFilter === filter.id && (
                    <IconSymbol size={18} name="checkmark" color="#c42743" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Post Viewer Modal */}
      {selectedPostIndex !== null && (
        <PostViewerModal
          posts={filteredPosts}
          initialIndex={selectedPostIndex}
          visible={selectedPostIndex !== null}
          onClose={() => setSelectedPostIndex(null)}
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
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  activeFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: '#c42743',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
  clearFilterButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  clearFilterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  countHeader: {
    paddingVertical: 8,
  },
  countText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
  },
  column: {
    flex: 1,
    gap: COLUMN_GAP,
  },
  gridItem: {
    width: COLUMN_WIDTH,
    height: ITEM_HEIGHT,
    backgroundColor: '#36393e',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
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
  gameTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  gameTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  filterOptions: {
    paddingTop: 8,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  filterOptionSelected: {
    backgroundColor: 'rgba(196, 39, 67, 0.1)',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#b9bbbe',
  },
  filterOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
