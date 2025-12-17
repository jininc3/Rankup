import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { addComment, deleteComment, getComments, CommentData } from '@/services/commentService';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';

interface CommentModalProps {
  visible: boolean;
  postId: string;
  postOwnerId: string;
  postThumbnail?: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function CommentModal({
  visible,
  postId,
  postOwnerId,
  postThumbnail,
  onClose,
  onCommentAdded,
}: CommentModalProps) {
  const { user: currentUser } = useAuth();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const panY = useRef(new Animated.Value(0)).current;

  // Fetch comments when modal opens
  useEffect(() => {
    if (visible && postId) {
      // Reset pan animation when opening
      panY.setValue(0);
      fetchComments();
      setIsInputFocused(false);
    } else if (!visible) {
      setIsInputFocused(false);
    }
  }, [visible, postId]);

  // Pan responder for swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Close modal if dragged down enough
          Animated.timing(panY, {
            toValue: 500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          // Snap back
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const fetchComments = async () => {
    setLoading(true);
    try {
      const fetchedComments = await getComments(postId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }

    const trimmedText = commentText.trim();
    if (!trimmedText) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    if (trimmedText.length > 500) {
      Alert.alert('Error', 'Comment is too long (max 500 characters)');
      return;
    }

    setSubmitting(true);

    try {
      await addComment(
        currentUser.id,
        currentUser.username || currentUser.email?.split('@')[0] || 'User',
        currentUser.avatar,
        postId,
        postOwnerId,
        trimmedText,
        postThumbnail
      );

      // Clear input and refresh comments
      setCommentText('');
      await fetchComments();

      // Notify parent component
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment(commentId, postId);
              await fetchComments();

              // Notify parent component
              if (onCommentAdded) {
                onCommentAdded();
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (timestamp: any): string => {
    const now = new Date();
    const commentDate = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return commentDate.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              height: isInputFocused ? '95%' : '70%',
              transform: [{ translateY: panY }],
            },
          ]}
        >
          <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 40}
          >
            {/* Drag Handle and Header - swipeable area */}
            <View {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.header}>
                <ThemedText style={styles.headerTitle}>Comments</ThemedText>
              </View>
            </View>

        {/* Comments List */}
        <ScrollView
          style={styles.commentsList}
          contentContainerStyle={styles.commentsListContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000" />
              <ThemedText style={styles.loadingText}>Loading comments...</ThemedText>
            </View>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  {comment.userAvatar && comment.userAvatar.startsWith('http') ? (
                    <Image source={{ uri: comment.userAvatar }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarInitial}>
                      {comment.username[0].toUpperCase()}
                    </ThemedText>
                  )}
                </View>

                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentHeaderLeft}>
                      <ThemedText style={styles.commentUsername}>{comment.username}</ThemedText>
                      <ThemedText style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</ThemedText>
                    </View>
                    {/* Delete button (only for own comments) */}
                    {currentUser?.id === comment.userId && (
                      <TouchableOpacity
                        style={styles.deleteCommentButton}
                        onPress={() => handleDeleteComment(comment.id)}
                      >
                        <ThemedText style={styles.deleteCommentText}>Delete</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ThemedText style={styles.commentText}>{comment.text}</ThemedText>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol size={64} name="bubble.left" color="#ccc" />
              <ThemedText style={styles.emptyText}>No comments yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>Be the first to comment!</ThemedText>
            </View>
          )}
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputAvatar}>
            {currentUser?.avatar && currentUser.avatar.startsWith('http') ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.inputAvatarImage} />
            ) : (
              <ThemedText style={styles.inputAvatarInitial}>
                {currentUser?.username?.[0]?.toUpperCase() || 'U'}
              </ThemedText>
            )}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#999"
            value={commentText}
            onChangeText={setCommentText}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            multiline
            maxLength={500}
            editable={!submitting}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <IconSymbol size={24} name="paperplane.fill" color={commentText.trim() ? "#007AFF" : "#ccc"} />
            )}
          </TouchableOpacity>
        </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
  },
  container: {
    flex: 1,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 32,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  commentTime: {
    fontSize: 10,
    color: '#999',
  },
  commentText: {
    fontSize: 12,
    color: '#000',
    lineHeight: 18,
  },
  deleteCommentButton: {
    padding: 4,
  },
  deleteCommentText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fff',
    gap: 12,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  inputAvatarInitial: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 36,
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: '#000',
  },
  sendButton: {
    padding: 6,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
