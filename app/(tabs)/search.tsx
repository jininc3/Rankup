import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { users, currentUser } from '@/app/data/userData';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

// Map users to search format with some mock trophies
const mockUsers = users.map((user, index) => ({
  id: user.id,
  username: user.username,
  rank: user.currentRank,
  trophies: 95240 - (index * 5000), // Mock trophy count
  avatar: user.avatar,
}));

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<typeof mockUsers>([]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredUsers([]);
    } else {
      const filtered = mockUsers.filter(user =>
        user.username.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
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
          <View style={styles.emptyState}>
            <IconSymbol size={64} name="magnifyingglass" color="#ccc" />
            <ThemedText style={styles.emptyText}>Search user profiles</ThemedText>
            <ThemedText style={styles.emptySubtext}>Enter a username to search</ThemedText>
          </View>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <TouchableOpacity key={user.id} style={styles.userCard}>
              <View style={styles.userLeft}>
                <View style={styles.avatar}>
                  <ThemedText style={styles.avatarEmoji}>{user.avatar}</ThemedText>
                </View>
                <View style={styles.userInfo}>
                  <ThemedText style={styles.username}>{user.username}</ThemedText>
                  <ThemedText style={styles.userRank}>{user.rank}</ThemedText>
                </View>
              </View>
              <View style={styles.userRight}>
                <View style={styles.trophyContainer}>
                  <IconSymbol size={16} name="trophy.fill" color="#FFD700" />
                  <ThemedText style={styles.trophyCount}>{user.trophies.toLocaleString()}</ThemedText>
                </View>
                <IconSymbol size={20} name="chevron.right" color="#666" />
              </View>
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
  avatarEmoji: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  userRank: {
    fontSize: 13,
    color: '#666',
  },
  userRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trophyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trophyCount: {
    fontSize: 14,
    fontWeight: '600',
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
});
