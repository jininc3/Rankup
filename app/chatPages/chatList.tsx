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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToUserChats, Chat } from '@/services/chatService';
import { Timestamp } from 'firebase/firestore';

export default function ChatListScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to user's chats
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToUserChats(currentUser.id, (userChats) => {
      setChats(userChats);
      setFilteredChats(userChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Filter chats based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter((chat) => {
        const otherUser = getOtherUser(chat);
        if (!otherUser) return false;
        return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

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
          <IconSymbol size={24} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{currentUser?.username || 'User'}</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <IconSymbol size={18} name="magnifyingglass" color="#72767d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#72767d"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol size={18} name="xmark.circle.fill" color="#72767d" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c42743" />
          <ThemedText style={styles.loadingText}>Loading chats...</ThemedText>
        </View>
      ) : chats.length > 0 ? (
        <FlatList
          data={filteredChats}
          renderItem={renderChat}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatList}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ThemedText style={styles.listHeaderText}>Messages</ThemedText>
            </View>
          }
          ListEmptyComponent={
            searchQuery.trim() !== '' ? (
              <View style={styles.emptySearchState}>
                <IconSymbol size={48} name="magnifyingglass" color="#72767d" />
                <ThemedText style={styles.emptySearchText}>No results found</ThemedText>
                <ThemedText style={styles.emptySearchSubtext}>
                  Try searching for a different username
                </ThemedText>
              </View>
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol size={64} name="bubble.left.and.bubble.right" color="#72767d" />
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
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
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
    color: '#fff',
  },
  headerSpacer: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2f33',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    padding: 0,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#72767d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#b9bbbe',
  },
  chatList: {
    paddingBottom: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  unreadChatItem: {
    backgroundColor: '#36393e',
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#36393e',
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
    color: '#fff',
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
    color: '#fff',
  },
  timestamp: {
    fontSize: 13,
    color: '#72767d',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#b9bbbe',
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
    color: '#fff',
  },
  unreadBadge: {
    backgroundColor: '#c42743',
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
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#b9bbbe',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptySearchState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptySearchText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: '#b9bbbe',
    textAlign: 'center',
    marginTop: 4,
  },
});
