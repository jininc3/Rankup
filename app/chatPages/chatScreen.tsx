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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  getChat,
  ChatMessage,
  Chat,
} from '@/services/chatService';
import { Timestamp } from 'firebase/firestore';

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

  const chatId = params.chatId as string;
  const otherUserId = params.otherUserId as string;
  const otherUsername = params.otherUsername as string;
  const otherUserAvatar = params.otherUserAvatar as string | undefined;

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

  // Subscribe to messages
  useEffect(() => {
    if (!chatId || !currentUser?.id) return;

    // Reset the flag when chatId changes
    hasMarkedInitialRead.current = false;

    const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
      // Check if there are unread messages from the other user
      const hasUnreadFromOther = newMessages.some(
        msg => msg.senderId !== currentUser.id && !msg.read
      );

      // Mark as read if:
      // 1. This is the first load (initial open), OR
      // 2. There are new unread messages from the other user
      if (hasUnreadFromOther || !hasMarkedInitialRead.current) {
        if (hasUnreadFromOther) {
          markMessagesAsRead(chatId, currentUser.id);
        }
        hasMarkedInitialRead.current = true;
      }

      setMessages(newMessages);
      setLoading(false);

      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [chatId, currentUser?.id]);

  const handleSend = async () => {
    if (!messageText.trim() || !chatId || !currentUser?.id) return;

    setSending(true);
    try {
      await sendMessage(chatId, currentUser.id, messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
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
    const showTimestamp =
      index === 0 ||
      messages[index - 1].senderId !== item.senderId ||
      item.timestamp.toMillis() - messages[index - 1].timestamp.toMillis() > 300000; // 5 minutes

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
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
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
    backgroundColor: '#f0f0f0',
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
    color: '#000',
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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
    color: '#999',
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
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    backgroundColor: '#f0f0f0',
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
    color: '#000',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 40,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#000',
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
});
