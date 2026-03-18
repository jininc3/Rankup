import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, orderBy, limit, doc, setDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTierBorderColor } from '@/utils/tierBorderUtils';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';

interface SearchUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  leagueRank?: string;
  valorantRank?: string;
}

const MAX_HISTORY_ITEMS = 7;

// Skeleton item component with shimmer effect
const SkeletonItem = ({ index }: { index: number }) => {
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerValue.value,
      [0, 1],
      [-200, 200]
    );
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.left}>
        <View style={skeletonStyles.avatar}>
          <Animated.View style={[skeletonStyles.shimmerOverlay, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={skeletonStyles.gradient}
            />
          </Animated.View>
        </View>
        <View style={skeletonStyles.textContainer}>
          <View style={skeletonStyles.username}>
            <Animated.View style={[skeletonStyles.shimmerOverlay, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={skeletonStyles.gradient}
              />
            </Animated.View>
          </View>
        </View>
      </View>
      <View style={skeletonStyles.deleteButton}>
        <Animated.View style={[skeletonStyles.shimmerOverlay, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={skeletonStyles.gradient}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginBottom: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1,
  },
  username: {
    width: '60%',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  deleteButton: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
    marginRight: 8,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
    width: 200,
  },
});

const SkeletonLoader = () => {
  return (
    <View>
      <View style={styles.historyHeader}>
        <View style={{ width: 50, height: 12, borderRadius: 6, backgroundColor: '#1a1a1a' }} />
        <View style={{ width: 50, height: 12, borderRadius: 6, backgroundColor: '#1a1a1a' }} />
      </View>
      {[0, 1, 2, 3, 4].map((index) => (
        <SkeletonItem key={index} index={index} />
      ))}
    </View>
  );
};

// Search result skeleton item (no delete button)
const SearchResultSkeletonItem = ({ index }: { index: number }) => {
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerValue.value,
      [0, 1],
      [-200, 200]
    );
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.left}>
        <View style={skeletonStyles.avatar}>
          <Animated.View style={[skeletonStyles.shimmerOverlay, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={skeletonStyles.gradient}
            />
          </Animated.View>
        </View>
        <View style={skeletonStyles.textContainer}>
          <View style={[skeletonStyles.username, { width: index % 2 === 0 ? '55%' : '65%' }]}>
            <Animated.View style={[skeletonStyles.shimmerOverlay, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={skeletonStyles.gradient}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

// Search results skeleton loader
const SearchResultsSkeletonLoader = () => {
  return (
    <View>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <SearchResultSkeletonItem key={index} index={index} />
      ))}
    </View>
  );
};

export default function SearchScreen() {
  const router = useRouter();
  const { user: currentUser, preloadedSearchHistory, clearPreloadedSearchHistory } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchUser[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [hasConsumedPreload, setHasConsumedPreload] = useState(false);

  // Avatar loading coordination for search results
  const [avatarsLoadedCount, setAvatarsLoadedCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const avatarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load search history from Firestore
  const loadSearchHistory = async () => {
    if (!currentUser?.id) {
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    try {
      const historyRef = collection(db, 'users', currentUser.id, 'searchHistory');
      const q = query(historyRef, orderBy('searchedAt', 'desc'), limit(MAX_HISTORY_ITEMS));
      const querySnapshot = await getDocs(q);

      const history: SearchUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          username: data.username,
          avatar: data.avatar,
          bio: data.bio,
          followersCount: data.followersCount,
          followingCount: data.followingCount,
          postsCount: data.postsCount,
          leagueRank: data.leagueRank,
          valorantRank: data.valorantRank,
        });
      });

      setSearchHistory(history);
    } catch (error) {
      console.error('Error loading search history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Save search to Firestore
  const saveToHistory = async (user: SearchUser) => {
    if (!currentUser?.id) return;

    try {
      // Save to Firestore with user ID as document ID
      const searchDocRef = doc(db, 'users', currentUser.id, 'searchHistory', user.id);
      await setDoc(searchDocRef, {
        username: user.username,
        avatar: user.avatar || null,
        bio: user.bio || null,
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        postsCount: user.postsCount || 0,
        leagueRank: user.leagueRank || null,
        valorantRank: user.valorantRank || null,
        searchedAt: Timestamp.now(),
      });

      // Update local state instead of refetching
      // Remove user if already in history (to re-add at top)
      const filteredHistory = searchHistory.filter(item => item.id !== user.id);

      // Add to beginning (most recent)
      const newHistory = [user, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
      setSearchHistory(newHistory);
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  // Clear all search history
  const clearHistory = async () => {
    if (!currentUser?.id) return;

    try {
      const historyRef = collection(db, 'users', currentUser.id, 'searchHistory');
      const querySnapshot = await getDocs(historyRef);

      // Delete all documents in the searchHistory subcollection
      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  // Remove single item from history
  const removeFromHistory = async (userId: string, event: any) => {
    event.stopPropagation(); // Prevent navigation when clicking delete

    if (!currentUser?.id) return;

    try {
      const searchDocRef = doc(db, 'users', currentUser.id, 'searchHistory', userId);
      await deleteDoc(searchDocRef);

      // Update local state
      const newHistory = searchHistory.filter(item => item.id !== userId);
      setSearchHistory(newHistory);
    } catch (error) {
      console.error('Error removing from history:', error);
    }
  };

  // Consume preloaded search history from AuthContext (loaded during loading screen)
  useEffect(() => {
    if (preloadedSearchHistory && !hasConsumedPreload) {
      console.log('✅ Using preloaded search history from loading screen:', preloadedSearchHistory.length);
      setSearchHistory(preloadedSearchHistory);
      setLoadingHistory(false);
      setHasConsumedPreload(true);
      clearPreloadedSearchHistory();
    }
  }, [preloadedSearchHistory, hasConsumedPreload, clearPreloadedSearchHistory]);

  // Load search history once on mount (only if no preloaded data)
  useEffect(() => {
    if (currentUser?.id && !hasConsumedPreload && !preloadedSearchHistory) {
      loadSearchHistory();
    }
  }, [currentUser?.id, hasConsumedPreload, preloadedSearchHistory]);

  // Note: Removed automatic refetch on focus for instant loading
  // Search history now updates via:
  // 1. Local state updates when adding/removing items (already implemented)
  // 2. Initial mount fetch only

  const handleSearch = async (text: string) => {
    setSearchQuery(text);

    if (text.trim() === '') {
      setSearchResults([]);
      setShowResults(false);
      setAvatarsLoadedCount(0);
      if (avatarTimeoutRef.current) {
        clearTimeout(avatarTimeoutRef.current);
      }
      return;
    }

    // Reset avatar loading state for new search
    setShowResults(false);
    setAvatarsLoadedCount(0);
    setSearching(true);
    if (avatarTimeoutRef.current) {
      clearTimeout(avatarTimeoutRef.current);
    }

    try {
      // Search for users whose username starts with the search query (lowercase)
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', text.toLowerCase()),
        where('username', '<=', text.toLowerCase() + '\uf8ff'),
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      const users: SearchUser[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Don't show current user in search results
        if (doc.id !== currentUser?.id) {
          // Get rank data for tier border
          let leagueRank = undefined;
          let valorantRank = undefined;

          if (data.riotStats?.rankedSolo) {
            leagueRank = `${data.riotStats.rankedSolo.tier} ${data.riotStats.rankedSolo.rank}`;
          }
          if (data.valorantStats?.currentRank) {
            valorantRank = data.valorantStats.currentRank;
          }

          users.push({
            id: doc.id,
            username: data.username,
            avatar: data.avatar,
            bio: data.bio,
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
            leagueRank,
            valorantRank,
            postsCount: data.postsCount || 0,
          });
        }
      });

      setSearchResults(users);

      // If no results or no avatars to load, show immediately
      const usersWithAvatars = users.filter(u => u.avatar && u.avatar.startsWith('http'));
      if (users.length === 0 || usersWithAvatars.length === 0) {
        setShowResults(true);
      } else {
        // Set timeout fallback to show results after 1.5s even if avatars haven't loaded
        avatarTimeoutRef.current = setTimeout(() => {
          setShowResults(true);
        }, 1500);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      setShowResults(true);
    } finally {
      setSearching(false);
    }
  };

  // Track avatar loading and show results when all avatars are loaded
  useEffect(() => {
    if (searchResults.length > 0 && !showResults) {
      const usersWithAvatars = searchResults.filter(u => u.avatar && u.avatar.startsWith('http'));
      if (usersWithAvatars.length > 0 && avatarsLoadedCount >= usersWithAvatars.length) {
        if (avatarTimeoutRef.current) {
          clearTimeout(avatarTimeoutRef.current);
        }
        setShowResults(true);
      }
    }
  }, [avatarsLoadedCount, searchResults, showResults]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (avatarTimeoutRef.current) {
        clearTimeout(avatarTimeoutRef.current);
      }
    };
  }, []);

  const handleAvatarLoad = useCallback(() => {
    setAvatarsLoadedCount(prev => prev + 1);
  }, []);

  const handleUserClick = async (user: SearchUser) => {
    // Navigate to profile immediately
    if (user.id === currentUser?.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profilePages/profileView?userId=${user.id}`);
    }

    // Save to history in background (don't await)
    saveToHistory(user);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Search</ThemedText>
      </View>
      <View style={styles.searchContainer}>
        <IconSymbol size={18} name="magnifyingglass" color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={(text) => handleSearch(text.toLowerCase())}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => {
            handleSearch('');
          }}>
            <IconSymbol size={18} name="xmark.circle.fill" color="#555" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {searchQuery.trim() === '' && loadingHistory ? (
          <SkeletonLoader />
        ) : searchQuery.trim() === '' && searchHistory.length > 0 ? (
          <View>
            <View style={styles.historyHeader}>
              <ThemedText style={styles.historyTitle}>Recent</ThemedText>
              <TouchableOpacity onPress={clearHistory}>
                <ThemedText style={styles.clearButton}>Clear All</ThemedText>
              </TouchableOpacity>
            </View>
            {searchHistory.map((user) => {
              const tierBorderColor = calculateTierBorderColor(user.leagueRank, user.valorantRank);
              return (
              <TouchableOpacity
                key={user.id}
                style={styles.historyCard}
                onPress={() => handleUserClick(user)}
                activeOpacity={0.7}
              >
                <View style={styles.historyLeft}>
                  <View style={[
                    styles.historyAvatar,
                    tierBorderColor ? { borderWidth: 2, borderColor: tierBorderColor } : {}
                  ]}>
                    {user.avatar && user.avatar.startsWith('http') ? (
                      <Image source={{ uri: user.avatar }} style={styles.historyAvatarImage} />
                    ) : (
                      <ThemedText style={styles.historyAvatarInitial}>
                        {user.username[0].toUpperCase()}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.historyUsername}>{user.username}</ThemedText>
                </View>
                <TouchableOpacity
                  onPress={(e) => removeFromHistory(user.id, e)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol size={14} name="xmark" color="#444" />
                </TouchableOpacity>
              </TouchableOpacity>
              );
            })}
          </View>
        ) : searchQuery.trim() === '' && searchHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol size={48} name="magnifyingglass" color="#333" />
            <ThemedText style={styles.emptyText}>No recent searches</ThemedText>
            <ThemedText style={styles.emptySubtext}>Search history will appear here</ThemedText>
          </View>
        ) : searching || (searchResults.length > 0 && !showResults) ? (
          <SearchResultsSkeletonLoader />
        ) : searchResults.length > 0 && showResults ? (
          searchResults.map((user) => {
            const tierBorderColor = calculateTierBorderColor(user.leagueRank, user.valorantRank);
            return (
            <TouchableOpacity
              key={user.id}
              style={styles.historyCard}
              onPress={() => handleUserClick(user)}
              activeOpacity={0.7}
            >
              <View style={styles.historyLeft}>
                <View style={[
                  styles.historyAvatar,
                  tierBorderColor ? { borderWidth: 2, borderColor: tierBorderColor } : {}
                ]}>
                  {user.avatar && user.avatar.startsWith('http') ? (
                    <Image
                      source={{ uri: user.avatar }}
                      style={styles.historyAvatarImage}
                      onLoad={handleAvatarLoad}
                      onError={handleAvatarLoad}
                    />
                  ) : (
                    <ThemedText style={styles.historyAvatarInitial}>
                      {user.username[0].toUpperCase()}
                    </ThemedText>
                  )}
                </View>
                <ThemedText style={styles.historyUsername}>{user.username}</ThemedText>
              </View>
            </TouchableOpacity>
            );
          })
        ) : searchQuery.trim() !== '' ? (
          <View style={styles.emptyState}>
            <IconSymbol size={48} name="person.slash" color="#333" />
            <ThemedText style={styles.emptyText}>No users found</ThemedText>
            <ThemedText style={styles.emptySubtext}>Try a different search term</ThemedText>
          </View>
        ) : null}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 4,
    backgroundColor: '#0f0f0f',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    padding: 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userStats: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  userBio: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clearButton: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginBottom: 2,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  historyAvatarInitial: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  historyUsername: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
});
