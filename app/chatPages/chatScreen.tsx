import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  sendMessage,
  markMessagesAsRead,
  getChat,
  getInitialMessages,
  getOlderMessages,
  subscribeToNewMessages,
  ChatMessage,
  Chat,
} from '@/services/chatService';
import { Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const hasMarkedInitialRead = useRef(false);

  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastTimestamp, setLastTimestamp] = useState<Timestamp | null>(null);

  const chatId = params.chatId as string;
  const otherUserId = params.otherUserId as string;
  const otherUsername = params.otherUsername as string;

  // Get avatar from chat data (more reliable than URL params)
  const otherUserAvatar = chat?.participantDetails?.[otherUserId]?.avatar || params.otherUserAvatar as string | undefined;

  // Load chat details
  useEffect(() => {
    const loadChat = async () => {
      if (!chatId) return;

      try {
        const chatData = await getChat(chatId);
        setChat(chatData);
      } catch (error) {
        console.error('Error loading chat:', error);
      }
    };

    loadChat();
  }, [chatId]);

  // Load initial messages and subscribe to new ones
  useEffect(() => {
    if (!chatId || !currentUser?.id) return;

    let unsubscribe: (() => void) | null = null;

    // Reset state when chatId changes
    hasMarkedInitialRead.current = false;
    setMessages([]);
    setHasMore(true);
    setLastDoc(null);
    setLastTimestamp(null);
    setLoading(true);

    const loadInitialMessages = async () => {
      try {
        // Fetch initial batch of messages
        const result = await getInitialMessages(chatId, 20);

        setMessages(result.messages);
        setHasMore(result.hasMore);
        setLastDoc(result.lastDoc);

        // Always mark messages as read when opening a chat
        // This ensures unread count is cleared even if unread messages
        // are beyond the initial batch loaded
        await markMessagesAsRead(chatId, currentUser.id);
        hasMarkedInitialRead.current = true;

        // Get the latest message timestamp for real-time subscription
        if (result.messages.length > 0) {
          const latestTimestamp = result.messages[result.messages.length - 1].timestamp;
          setLastTimestamp(latestTimestamp);

          // Subscribe to new messages after the latest loaded message
          unsubscribe = subscribeToNewMessages(chatId, latestTimestamp, (newMessages) => {
            if (newMessages.length > 0) {
              // Append new messages and update latest timestamp
              setMessages(prev => [...prev, ...newMessages]);
              setLastTimestamp(newMessages[newMessages.length - 1].timestamp);

              // Mark new messages as read immediately
              markMessagesAsRead(chatId, currentUser.id);

              // Scroll to bottom when new messages arrive (offset 0 in inverted list)
              setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
              }, 100);
            }
          });
        }

      } catch (error) {
        console.error('Error loading initial messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialMessages();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatId, currentUser?.id]);

  // Load older messages when scrolling up
  const loadOlderMessages = async () => {
    if (!hasMore || loadingMore || !lastDoc || !chatId) return;

    setLoadingMore(true);
    try {
      const result = await getOlderMessages(chatId, lastDoc, 20);

      // Prepend older messages to the beginning
      setMessages(prev => [...result.messages, ...prev]);
      setHasMore(result.hasMore);
      setLastDoc(result.lastDoc);
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !chatId || !currentUser?.id) return;

    setSending(true);
    try {
      await sendMessage(chatId, currentUser.id, messageText.trim());
      setMessageText('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Show user-friendly error for spam prevention
      if (error.message?.includes('too quickly')) {
        Alert.alert('Slow Down', error.message);
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: Timestamp): string => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
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

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isCurrentUser = item.senderId === currentUser?.id;

    // Find the chronologically previous message (older message)
    // Since FlatList data is reversed, we need to find in original messages array
    const messageIndex = messages.findIndex(msg => msg.id === item.id);
    const previousMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;

    const showTimestamp =
      !previousMessage ||
      previousMessage.senderId !== item.senderId ||
      item.timestamp.toMillis() - previousMessage.timestamp.toMillis() > 300000; // 5 minutes

    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <ThemedText style={styles.timestamp}>{formatTime(item.timestamp)}</ThemedText>
        )}
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          ]}
        >
          <ThemedText
            style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {item.text}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={-15}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUser}
          onPress={() => router.push(`/profilePages/profileView?userId=${otherUserId}`)}
        >
          <View style={styles.headerAvatar}>
            {otherUserAvatar && otherUserAvatar.startsWith('http') ? (
              <Image source={{ uri: otherUserAvatar }} style={styles.avatarImage} />
            ) : (
              <ThemedText style={styles.avatarInitial}>
                {otherUsername?.[0]?.toUpperCase() || 'U'}
              </ThemedText>
            )}
          </View>
          <ThemedText style={styles.headerUsername}>{otherUsername}</ThemedText>
        </TouchableOpacity>

        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c42743" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onEndReached={loadOlderMessages}
          onEndReachedThreshold={0.5}
          inverted={true}
          ListHeaderComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#c42743" />
                <ThemedText style={styles.loadingMoreText}>Loading older messages...</ThemedText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol size={64} name="bubble.left.and.bubble.right" color="#ccc" />
              <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Start the conversation with {otherUsername}
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <IconSymbol
              size={20}
              name="paperplane.fill"
              color={messageText.trim() ? '#fff' : '#ccc'}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#36393e',
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
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
  },
  timestamp: {
    fontSize: 11,
    color: '#72767d',
    textAlign: 'center',
    marginBottom: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  currentUserBubble: {
    backgroundColor: '#c42743',
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    backgroundColor: '#36393e',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 30,
    backgroundColor: '#1e2124',
    borderTopWidth: 1,
    borderTopColor: '#2c2f33',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#36393e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#fff',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: '#72767d',
  },
});
