import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, orderBy, limit, doc, setDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTierBorderColor } from '@/utils/tierBorderUtils';

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

export default function SearchScreen() {
  const router = useRouter();
  const { user: currentUser, preloadedSearchHistory, clearPreloadedSearchHistory } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchUser[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [hasConsumedPreload, setHasConsumedPreload] = useState(false);

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
      // Don't automatically show history when clearing - only show when focused
      return;
    }

    setSearching(true);

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
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

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
        <IconSymbol size={20} name="magnifyingglass" color="#fff" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={(text) => handleSearch(text.toLowerCase())}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => {
            handleSearch('');
          }}>
            <IconSymbol size={20} name="xmark.circle.fill" color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {searchQuery.trim() === '' && loadingHistory ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#c42743" />
            <ThemedText style={styles.loadingText}>Loading...</ThemedText>
          </View>
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
                  <IconSymbol size={16} name="xmark" color="#b9bbbe" />
                </TouchableOpacity>
              </TouchableOpacity>
              );
            })}
          </View>
        ) : searchQuery.trim() === '' && searchHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol size={64} name="magnifyingglass" color="#fff" />
            <ThemedText style={styles.emptyText}>No recent searches</ThemedText>
            <ThemedText style={styles.emptySubtext}>Your search history will appear here</ThemedText>
          </View>
        ) : searching ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#c42743" />
            <ThemedText style={styles.loadingText}>Searching...</ThemedText>
          </View>
        ) : searchResults.length > 0 ? (
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
                    <Image source={{ uri: user.avatar }} style={styles.historyAvatarImage} />
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
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol size={64} name="magnifyingglass" color="#fff" />
            <ThemedText style={styles.emptyText}>No users found</ThemedText>
            <ThemedText style={styles.emptySubtext}>Try a different search term</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#c42743',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#36393e',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    padding: 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
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
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#b9bbbe',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#b9bbbe',
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#c42743',
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  historyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  historyAvatarInitial: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyUsername: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
});
