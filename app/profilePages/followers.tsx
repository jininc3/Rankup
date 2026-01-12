import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { FollowerData, followUser, getFollowers, isFollowing, unfollowUser } from '@/services/followService';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface Follower {
  id: string;
  username: string;
  avatar?: string;
  isFollowing: boolean;
}

export default function FollowersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFollowers();
  }, [user?.id]);

  const fetchFollowers = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const followersData = await getFollowers(user.id);
      console.log('Fetched followers data:', followersData);
      console.log('Number of followers:', followersData.length);

      // Check if current user is following each follower
      const followersWithStatus = await Promise.all(
        followersData.map(async (follower: FollowerData) => {
          const following = await isFollowing(user.id, follower.followerId);
          return {
            id: follower.followerId,
            username: follower.followerUsername,
            avatar: follower.followerAvatar,
            isFollowing: following,
          };
        })
      );

      setFollowers(followersWithStatus);
    } catch (error) {
      console.error('Error fetching followers:', error);
      Alert.alert('Error', 'Failed to load followers');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (followerId: string, currentlyFollowing: boolean) => {
    if (!user?.id) return;

    try {
      const follower = followers.find(f => f.id === followerId);
      if (!follower) return;

      if (currentlyFollowing) {
        await unfollowUser(user.id, followerId);
      } else {
        await followUser(
          user.id,
          user.username || user.email?.split('@')[0] || 'User',
          user.avatar,
          followerId,
          follower.username,
          follower.avatar
        );
      }

      // Update local state
      setFollowers(prev =>
        prev.map(f =>
          f.id === followerId ? { ...f, isFollowing: !currentlyFollowing } : f
        )
      );
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  // Filter followers based on search query
  const filteredFollowers = followers.filter(follower =>
    follower.username.toLowerCase().includes(searchQuery.toLowerCase())
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
        <ThemedText style={styles.headerTitle}>Followers</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <IconSymbol size={18} name="magnifyingglass" color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search followers..."
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
            <ThemedText style={styles.loadingText}>Loading followers...</ThemedText>
          </View>
        ) : filteredFollowers.length > 0 ? (
          <View style={styles.listContainer}>
            {filteredFollowers.map((follower) => (
              <View key={follower.id} style={styles.followerItem}>
                <TouchableOpacity
                  style={styles.followerLeft}
                  onPress={() => router.push(`/profilePages/profileView?userId=${follower.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    {follower.avatar && follower.avatar.startsWith('http') ? (
                      <Image source={{ uri: follower.avatar }} style={styles.avatarImage} />
                    ) : (
                      <ThemedText style={styles.avatarInitial}>
                        {follower.username[0].toUpperCase()}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.username}>{follower.username}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    follower.isFollowing && styles.followingButton
                  ]}
                  onPress={() => handleFollowToggle(follower.id, follower.isFollowing)}
                >
                  <ThemedText
                    style={[
                      styles.followButtonText,
                      follower.isFollowing && styles.followingButtonText
                    ]}
                  >
                    {follower.isFollowing ? 'Following' : 'Follow'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol size={64} name={searchQuery ? "magnifyingglass" : "person.2"} color="#72767d" />
            <ThemedText style={styles.emptyStateText}>
              {searchQuery ? 'No results found' : 'No followers yet'}
            </ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              {searchQuery
                ? `No followers found matching "${searchQuery}"`
                : 'When people follow you, they\'ll appear here'}
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
  followerItem: {
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
  followerLeft: {
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
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#c42743',
    borderRadius: 6,
    width: 85,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c42743',
  },
  followingButton: {
    backgroundColor: '#36393e',
    borderWidth: 1,
    borderColor: '#2c2f33',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  followingButtonText: {
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