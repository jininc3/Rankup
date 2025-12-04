import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SearchUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

const SEARCH_HISTORY_KEY = '@search_history';
const MAX_HISTORY_ITEMS = 10;

export default function SearchScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchUser[]>([]);

  // Load search history from AsyncStorage
  const loadSearchHistory = async () => {
    try {
      const historyJson = await AsyncStorage.getItem(`${SEARCH_HISTORY_KEY}_${currentUser?.id}`);
      if (historyJson) {
        const history = JSON.parse(historyJson);
        setSearchHistory(history);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  // Save search history to AsyncStorage
  const saveToHistory = async (user: SearchUser) => {
    try {
      // Remove user if already in history
      const filteredHistory = searchHistory.filter(item => item.id !== user.id);

      // Add to beginning of history
      const newHistory = [user, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);

      setSearchHistory(newHistory);
      await AsyncStorage.setItem(
        `${SEARCH_HISTORY_KEY}_${currentUser?.id}`,
        JSON.stringify(newHistory)
      );
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  // Clear search history
  const clearHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem(`${SEARCH_HISTORY_KEY}_${currentUser?.id}`);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  // Remove single item from history
  const removeFromHistory = async (userId: string, event: any) => {
    event.stopPropagation(); // Prevent navigation when clicking delete
    try {
      const newHistory = searchHistory.filter(item => item.id !== userId);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem(
        `${SEARCH_HISTORY_KEY}_${currentUser?.id}`,
        JSON.stringify(newHistory)
      );
    } catch (error) {
      console.error('Error removing from history:', error);
    }
  };

  // Load history when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSearchHistory();
      // Clear search query when returning to search page
      setSearchQuery('');
      setSearchResults([]);
    }, [currentUser?.id])
  );

  const handleSearch = async (text: string) => {
    setSearchQuery(text);

    if (text.trim() === '') {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    try {
      // Search for users whose username starts with the search query
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', text),
        where('username', '<=', text + '\uf8ff'),
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      const users: SearchUser[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Don't show current user in search results
        if (doc.id !== currentUser?.id) {
          users.push({
            id: doc.id,
            username: data.username,
            avatar: data.avatar,
            bio: data.bio,
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
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
    await saveToHistory(user);
    router.push(`/profilePages/profileView?userId=${user.id}`);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Search Users</ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <IconSymbol size={20} name="magnifyingglass" color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <IconSymbol size={20} name="xmark.circle.fill" color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {searchQuery.trim() === '' ? (
          searchHistory.length > 0 ? (
            <View>
              <View style={styles.historyHeader}>
                <ThemedText style={styles.historyTitle}>Recent Searches</ThemedText>
                <TouchableOpacity onPress={clearHistory}>
                  <ThemedText style={styles.clearButton}>Clear All</ThemedText>
                </TouchableOpacity>
              </View>
              {searchHistory.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.historyCard}
                  onPress={() => handleUserClick(user)}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyLeft}>
                    <IconSymbol size={16} name="clock" color="#999" />
                    <View style={styles.historyAvatar}>
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
                    <IconSymbol size={16} name="xmark" color="#999" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol size={64} name="magnifyingglass" color="#ccc" />
              <ThemedText style={styles.emptyText}>Search user profiles</ThemedText>
              <ThemedText style={styles.emptySubtext}>Enter a username to search</ThemedText>
            </View>
          )
        ) : searching ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#000" />
            <ThemedText style={styles.loadingText}>Searching...</ThemedText>
          </View>
        ) : searchResults.length > 0 ? (
          searchResults.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userCard}
              onPress={() => handleUserClick(user)}
            >
              <View style={styles.userLeft}>
                <View style={styles.avatar}>
                  {user.avatar && user.avatar.startsWith('http') ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarInitial}>
                      {user.username[0].toUpperCase()}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.userInfo}>
                  <ThemedText style={styles.username}>{user.username}</ThemedText>
                  <ThemedText style={styles.userStats}>
                    {user.postsCount} Posts • {user.followersCount} Followers
                  </ThemedText>
                  {user.bio && (
                    <ThemedText style={styles.userBio} numberOfLines={1}>
                      {user.bio}
                    </ThemedText>
                  )}
                </View>
              </View>
              <IconSymbol size={20} name="chevron.right" color="#666" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol size={64} name="magnifyingglass" color="#ccc" />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
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
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
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
    color: '#000',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: '#fafafa',
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
    color: '#000',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
});
