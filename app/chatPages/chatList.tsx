import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToUserChats, Chat } from '@/services/chatService';
import { Timestamp } from 'firebase/firestore';

export default function ChatListScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to user's chats
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToUserChats(currentUser.id, (userChats) => {
      setChats(userChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  const getOtherUser = (chat: Chat) => {
    const otherUserId = chat.participants.find((id) => id !== currentUser?.id);
    return otherUserId ? chat.participantDetails[otherUserId] : null;
  };

  const formatTime = (timestamp: Timestamp): string => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      // Less than an hour - show minutes
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffInMinutes < 1) return 'Just now';
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      // Today - show time
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 48) {
      // Yesterday
      return 'Yesterday';
    } else if (diffInHours < 168) {
      // This week - show day
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      // Older - show date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handleChatPress = (chat: Chat) => {
    const otherUser = getOtherUser(chat);
    if (!otherUser) return;

    const otherUserId = chat.participants.find((id) => id !== currentUser?.id);

    router.push({
      pathname: '/chatPages/chatScreen',
      params: {
        chatId: chat.id,
        otherUserId: otherUserId || '',
        otherUsername: otherUser.username,
        otherUserAvatar: otherUser.avatar || '',
      },
    });
  };

  const renderChat = ({ item }: { item: Chat }) => {
    const otherUser = getOtherUser(item);
    if (!otherUser) return null;

    const unreadCount = currentUser?.id ? item.unreadCount[currentUser.id] || 0 : 0;
    const isUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.chatItem, isUnread && styles.unreadChatItem]}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.chatAvatar}>
          {otherUser.avatar && otherUser.avatar.startsWith('http') ? (
            <Image source={{ uri: otherUser.avatar }} style={styles.avatarImage} />
          ) : (
            <ThemedText style={styles.avatarInitial}>
              {otherUser.username?.[0]?.toUpperCase() || 'U'}
            </ThemedText>
          )}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <ThemedText style={[styles.username, isUnread && styles.unreadText]}>
              {otherUser.username}
            </ThemedText>
            <ThemedText style={styles.timestamp}>
              {item.lastMessageTimestamp && formatTime(item.lastMessageTimestamp)}
            </ThemedText>
          </View>

          <View style={styles.messageRow}>
            <ThemedText
              style={[styles.lastMessage, isUnread && styles.unreadText]}
              numberOfLines={1}
            >
              {item.lastMessageSenderId === currentUser?.id && 'You: '}
              {item.lastMessage || 'Start a conversation'}
            </ThemedText>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <ThemedText style={styles.unreadBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Messages</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <ThemedText style={styles.loadingText}>Loading chats...</ThemedText>
        </View>
      ) : chats.length > 0 ? (
        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatList}
        />
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol size={64} name="bubble.left.and.bubble.right" color="#ccc" />
          <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Start a conversation by visiting a user's profile
          </ThemedText>
        </View>
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerSpacer: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  chatList: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  unreadChatItem: {
    backgroundColor: '#f8f9ff',
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  timestamp: {
    fontSize: 13,
    color: '#999',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
