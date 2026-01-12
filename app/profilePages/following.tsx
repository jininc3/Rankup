import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Image, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowing, unfollowUser, FollowingData } from '@/services/followService';

interface Following {
  id: string;
  username: string;
  avatar?: string;
}

export default function FollowingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFollowing();
  }, [user?.id]);

  const fetchFollowing = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const followingData = await getFollowing(user.id);
      console.log('Fetched following data:', followingData);
      console.log('Number of following:', followingData.length);

      const followingList = followingData.map((followingUser: FollowingData) => ({
        id: followingUser.followingId,
        username: followingUser.followingUsername,
        avatar: followingUser.followingAvatar,
      }));

      setFollowing(followingList);
    } catch (error) {
      console.error('Error fetching following:', error);
      Alert.alert('Error', 'Failed to load following');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user?.id) return;

    try {
      await unfollowUser(user.id, userId);
      setFollowing(prev => prev.filter(f => f.id !== userId));
    } catch (error) {
      console.error('Error unfollowing user:', error);
      Alert.alert('Error', 'Failed to unfollow user');
    }
  };

  // Filter following based on search query
  const filteredFollowing = following.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <ThemedText style={styles.headerTitle}>Following</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <IconSymbol size={18} name="magnifyingglass" color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search following..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol size={18} name="xmark.circle.fill" color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#c42743" />
            <ThemedText style={styles.loadingText}>Loading following...</ThemedText>
          </View>
        ) : filteredFollowing.length > 0 ? (
          <View style={styles.listContainer}>
            {filteredFollowing.map((user) => (
              <View key={user.id} style={styles.userItem}>
                <TouchableOpacity
                  style={styles.userLeft}
                  onPress={() => router.push(`/profilePages/profileView?userId=${user.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    {user.avatar && user.avatar.startsWith('http') ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                    ) : (
                      <ThemedText style={styles.avatarInitial}>
                        {user.username[0].toUpperCase()}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.username}>{user.username}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.followingButton}
                  onPress={() => handleUnfollow(user.id)}
                >
                  <ThemedText style={styles.followingButtonText}>Following</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol size={64} name={searchQuery ? "magnifyingglass" : "person.2"} color="#72767d" />
            <ThemedText style={styles.emptyStateText}>
              {searchQuery ? 'No results found' : 'Not following anyone yet'}
            </ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              {searchQuery
                ? `No users found matching "${searchQuery}"`
                : 'When you follow people, they\'ll appear here'}
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
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 16,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  backButton: {
    padding: 4,
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2c2f33',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    paddingVertical: 0,
  },
  listContainer: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c2f33',
    backgroundColor: '#36393e',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  username: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  followingButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#36393e',
    borderWidth: 1,
    borderColor: '#2c2f33',
    borderRadius: 6,
    minWidth: 75,
    alignItems: 'center',
  },
  followingButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b9bbbe',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#b9bbbe',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#b9bbbe',
    marginTop: 12,
  },
});
