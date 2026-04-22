import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { getBlockedUsers, unblockUser, BlockedUserData } from '@/services/blockService';
import { useRouter } from '@/hooks/useRouter';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { user, removeBlockedUser } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlocked = async () => {
      if (!user?.id) return;
      try {
        const data = await getBlockedUsers(user.id);
        setBlockedUsers(data);
      } catch (error) {
        console.error('Error fetching blocked users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlocked();
  }, [user?.id]);

  const handleUnblock = (blocked: BlockedUserData) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${blocked.blockedUsername}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            if (!user?.id) return;
            try {
              await unblockUser(user.id, blocked.blockedUserId);
              removeBlockedUser(blocked.blockedUserId);
              setBlockedUsers(prev => prev.filter(b => b.blockedUserId !== blocked.blockedUserId));
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Blocked Accounts</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.centered}>
          <ThemedText style={styles.emptyText}>No blocked accounts</ThemedText>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {blockedUsers.map((blocked) => (
            <View key={blocked.blockedUserId} style={styles.row}>
              <View style={styles.avatarWrap}>
                {blocked.blockedUserAvatar ? (
                  <Image source={{ uri: blocked.blockedUserAvatar }} style={styles.avatar} />
                ) : (
                  <ThemedText style={styles.avatarLetter}>
                    {blocked.blockedUsername[0]?.toUpperCase()}
                  </ThemedText>
                )}
              </View>
              <ThemedText style={styles.username} numberOfLines={1}>
                {blocked.blockedUsername}
              </ThemedText>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(blocked)}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.unblockText}>Unblock</ThemedText>
              </TouchableOpacity>
            </View>
          ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#888',
  },
  username: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  unblockButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
