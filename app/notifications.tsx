import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator, Animated, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, where, Timestamp, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import PostViewerModal from '@/app/components/postViewerModal';

interface Notification {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'tag' | 'party_invite';
  fromUserId: string;
  fromUsername: string;
  fromUserAvatar?: string;
  postId?: string;
  postThumbnail?: string;
  commentText?: string;
  partyId?: string;
  partyName?: string;
  game?: string;
  read: boolean;
  createdAt: Timestamp;
}

interface Post {
  id: string;
  userId: string;
  username: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video';
  mediaTypes?: string[];
  thumbnailUrl?: string;
  caption?: string;
  taggedPeople?: string[];
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const swipeAnimations = useRef<{ [key: string]: Animated.Value }>({});

  // Load and listen to notifications in real-time
  useEffect(() => {
    if (!currentUser?.id) return;

    setLoading(true);

    // Set up real-time listener for notifications
    const notificationsRef = collection(db, 'users', currentUser.id, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({
          id: doc.id,
          type: data.type,
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername,
          fromUserAvatar: data.fromUserAvatar || data.fromAvatar,
          postId: data.postId,
          postThumbnail: data.postThumbnail,
          commentText: data.commentText,
          partyId: data.partyId,
          partyName: data.partyName,
          game: data.game,
          read: data.read,
          createdAt: data.createdAt,
        });
      });
      setNotifications(notifs);
      setLoading(false);
    });

    // Clean up old notifications (30 days) on load
    cleanupOldNotifications();

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Mark all notifications as read when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id && notifications.length > 0) {
        markAllAsRead();
      }
    }, [currentUser?.id, notifications])
  );

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser?.id) return;

    try {
      const batch = writeBatch(db);
      const unreadNotifications = notifications.filter(n => !n.read);

      unreadNotifications.forEach((notification) => {
        const notifRef = doc(db, 'users', currentUser.id, 'notifications', notification.id);
        batch.update(notifRef, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Delete a single notification
  const deleteNotification = async (notificationId: string, event?: any) => {
    if (event) {
      event.stopPropagation();
    }

    if (!currentUser?.id) return;

    try {
      await deleteDoc(doc(db, 'users', currentUser.id, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!currentUser?.id) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach((notification) => {
        const notifRef = doc(db, 'users', currentUser.id, 'notifications', notification.id);
        batch.delete(notifRef);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Clean up notifications older than 30 days
  const cleanupOldNotifications = async () => {
    if (!currentUser?.id) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffTimestamp = Timestamp.fromDate(thirtyDaysAgo);

      const notificationsRef = collection(db, 'users', currentUser.id, 'notifications');
      const q = query(notificationsRef, where('createdAt', '<', cutoffTimestamp));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return;

      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  };

  // Fetch post data and show post viewer
  const fetchAndShowPost = async (postId: string) => {
    setLoadingPost(true);
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        const postData = postSnap.data();
        const post: Post = {
          id: postSnap.id,
          userId: postData.userId,
          username: postData.username,
          mediaUrl: postData.mediaUrl,
          mediaUrls: postData.mediaUrls,
          mediaType: postData.mediaType,
          mediaTypes: postData.mediaTypes,
          thumbnailUrl: postData.thumbnailUrl,
          caption: postData.caption,
          taggedPeople: postData.taggedPeople,
          taggedGame: postData.taggedGame,
          createdAt: postData.createdAt,
          likes: postData.likes || 0,
          commentsCount: postData.commentsCount || 0,
        };
        setSelectedPost(post);
        setShowPostViewer(true);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoadingPost(false);
    }
  };

  // Accept party invitation
  const handleAcceptInvite = async (notification: Notification, event: any) => {
    event.stopPropagation();
    if (!currentUser?.id || !notification.partyId) return;

    try {
      // Find the party
      const partiesRef = collection(db, 'parties');
      const partyQuery = query(partiesRef, where('partyId', '==', notification.partyId), limit(1));
      const partySnapshot = await getDocs(partyQuery);

      if (partySnapshot.empty) {
        console.error('Party not found');
        return;
      }

      const partyDoc = partySnapshot.docs[0];
      const partyData = partyDoc.data();

      // Get user data for member details
      const userDoc = await getDoc(doc(db, 'users', currentUser.id));
      const userData = userDoc.data();

      // Update party: add user to members and memberDetails, update pendingInvites
      const updatedMembers = [...(partyData.members || []), currentUser.id];
      const updatedMemberDetails = [
        ...(partyData.memberDetails || []),
        {
          userId: currentUser.id,
          username: userData?.username || 'Unknown',
          avatar: userData?.avatar || '👤',
          joinedAt: new Date().toISOString(),
        },
      ];

      // Update invite status in pendingInvites
      const updatedPendingInvites = (partyData.pendingInvites || []).map((invite: any) =>
        invite.userId === currentUser.id ? { ...invite, status: 'accepted' } : invite
      );

      await updateDoc(partyDoc.ref, {
        members: updatedMembers,
        memberDetails: updatedMemberDetails,
        pendingInvites: updatedPendingInvites,
      });

      // Delete the notification
      await deleteNotification(notification.id);

      console.log('Successfully joined party:', notification.partyName);

      // Navigate to the leaderboard detail page
      router.push({
        pathname: '/leaderboardPages/leaderboardDetail',
        params: {
          name: notification.partyName,
          partyId: notification.partyId,
          game: notification.game,
          members: updatedMembers.length.toString(),
          startDate: partyData.startDate || '',
          endDate: partyData.endDate || '',
          players: JSON.stringify([]),
        },
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  // Decline party invitation
  const handleDeclineInvite = async (notification: Notification, event: any) => {
    event.stopPropagation();
    if (!currentUser?.id || !notification.partyId) return;

    try {
      // Find the party
      const partiesRef = collection(db, 'parties');
      const partyQuery = query(partiesRef, where('partyId', '==', notification.partyId), limit(1));
      const partySnapshot = await getDocs(partyQuery);

      if (!partySnapshot.empty) {
        const partyDoc = partySnapshot.docs[0];
        const partyData = partyDoc.data();

        // Update invite status to declined in pendingInvites
        const updatedPendingInvites = (partyData.pendingInvites || []).map((invite: any) =>
          invite.userId === currentUser.id ? { ...invite, status: 'declined' } : invite
        );

        await updateDoc(partyDoc.ref, {
          pendingInvites: updatedPendingInvites,
        });
      }

      // Delete the notification
      await deleteNotification(notification.id);

      console.log('Declined party invitation:', notification.partyName);
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  // Navigate to user profile
  const handleUserPress = (userId: string, event: any) => {
    event.stopPropagation();
    router.push(`/profilePages/profileView?userId=${userId}`);
  };

  // Navigate to appropriate page based on notification type
  const handleNotificationPress = (notification: Notification) => {
    if (notification.type === 'follow') {
      // Navigate to user profile for follow notifications
      router.push(`/profilePages/profileView?userId=${notification.fromUserId}`);
    } else if ((notification.type === 'like' || notification.type === 'comment' || notification.type === 'tag') && notification.postId) {
      // Show post viewer for like/comment/tag notifications
      fetchAndShowPost(notification.postId);
    }
  };

  // Format time ago
  const getTimeAgo = (timestamp: Timestamp): string => {
    const now = new Date();
    const notificationDate = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notificationDate.toLocaleDateString();
  };

  // Get or create animated value for notification
  const getSwipeAnimation = (notificationId: string): Animated.Value => {
    if (!swipeAnimations.current[notificationId]) {
      swipeAnimations.current[notificationId] = new Animated.Value(0);
    }
    return swipeAnimations.current[notificationId];
  };

  // Create pan responder for swipe left
  const createPanResponder = (notificationId: string) => {
    const translateX = getSwipeAnimation(notificationId);

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        // Start gesture
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative dx)
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped more than 60px to the left, open delete button
        const shouldOpen = gestureState.dx < -60 || gestureState.vx < -0.3;

        if (shouldOpen) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            friction: 8,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications}>
            <ThemedText style={styles.clearAllButton}>Clear All</ThemedText>
          </TouchableOpacity>
        )}
        {notifications.length === 0 && <View style={styles.headerSpacer} />}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <ThemedText style={styles.loadingText}>Loading notifications...</ThemedText>
          </View>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => {
            const translateX = getSwipeAnimation(notification.id);
            const panResponder = createPanResponder(notification.id);

            return (
              <View key={notification.id} style={styles.notificationWrapper}>
                {/* Delete button (behind the card) */}
                <View style={styles.deleteButtonBehind}>
                  <TouchableOpacity
                    onPress={() => {
                      // Animate back first, then delete
                      Animated.timing(translateX, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                      }).start(() => {
                        deleteNotification(notification.id);
                      });
                    }}
                    style={styles.deleteButtonTouchable}
                  >
                    <IconSymbol size={24} name="trash" color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Swipeable notification card */}
                <Animated.View
                  style={[
                    styles.notificationAnimatedWrapper,
                    { transform: [{ translateX }] }
                  ]}
                  {...panResponder.panHandlers}
                >
                  <TouchableOpacity
                    style={[styles.notificationCard, !notification.read && styles.unreadNotification]}
                    onPress={() => handleNotificationPress(notification)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.notificationLeft}>
                      {/* Avatar */}
                      <TouchableOpacity
                        style={styles.avatar}
                        onPress={(e) => handleUserPress(notification.fromUserId, e)}
                        activeOpacity={0.7}
                      >
                        {notification.fromUserAvatar && notification.fromUserAvatar.startsWith('http') ? (
                          <Image source={{ uri: notification.fromUserAvatar }} style={styles.avatarImage} />
                        ) : (
                          <ThemedText style={styles.avatarInitial}>
                            {notification.fromUsername[0].toUpperCase()}
                          </ThemedText>
                        )}
                      </TouchableOpacity>

                      {/* Notification content */}
                      <View style={styles.notificationContent}>
                        <View style={styles.notificationTextRow}>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={styles.notificationText}>
                              <ThemedText
                                style={styles.usernameText}
                                onPress={(e) => handleUserPress(notification.fromUserId, e)}
                              >
                                {notification.fromUsername}
                              </ThemedText>
                              {notification.type === 'follow' && ' started following you'}
                              {notification.type === 'like' && ' liked your post'}
                              {notification.type === 'tag' && ' tagged you in a post'}
                              {notification.type === 'comment' && ' commented: '}
                              {notification.type === 'party_invite' && ` invited you to "${notification.partyName}"`}
                              {notification.type === 'comment' && notification.commentText && (
                                <ThemedText style={styles.commentPreview}>
                                  "{notification.commentText.length > 30
                                    ? notification.commentText.substring(0, 30) + '...'
                                    : notification.commentText}"
                                </ThemedText>
                              )}
                            </ThemedText>
                          </View>

                          {/* Accept/Decline buttons for party invites - inline */}
                          {notification.type === 'party_invite' && (
                            <View style={styles.inviteActionsInline}>
                              <TouchableOpacity
                                style={styles.acceptButtonCompact}
                                onPress={(e) => handleAcceptInvite(notification, e)}
                                activeOpacity={0.7}
                              >
                                <IconSymbol size={26} name="checkmark.circle.fill" color="#22c55e" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.declineButtonCompact}
                                onPress={(e) => handleDeclineInvite(notification, e)}
                                activeOpacity={0.7}
                              >
                                <IconSymbol size={26} name="xmark.circle.fill" color="#999" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>

                        {/* Game tag for party invites */}
                        {notification.type === 'party_invite' && notification.game && (
                          <ThemedText style={styles.partyGameText}>{notification.game}</ThemedText>
                        )}

                        <ThemedText style={styles.timeText}>{getTimeAgo(notification.createdAt)}</ThemedText>
                      </View>

                      {/* Post thumbnail for like/comment/tag notifications */}
                      {(notification.type === 'like' || notification.type === 'comment' || notification.type === 'tag') && notification.postThumbnail && (
                        <Image source={{ uri: notification.postThumbnail }} style={styles.postThumbnail} />
                      )}
                    </View>

                    {/* Unread indicator */}
                    {!notification.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol size={64} name="bell" color="#ccc" />
            <ThemedText style={styles.emptyText}>No notifications yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              When someone follows you, you'll see it here
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Post Viewer Modal */}
      {selectedPost && (
        <PostViewerModal
          visible={showPostViewer}
          post={selectedPost}
          posts={[selectedPost]}
          currentIndex={0}
          userAvatar={currentUser?.avatar}
          onClose={() => {
            setShowPostViewer(false);
            setSelectedPost(null);
          }}
          onCommentAdded={() => {
            // Optionally refresh data if needed
          }}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerSpacer: {
    width: 60,
  },
  clearAllButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  notificationWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteButtonBehind: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationAnimatedWrapper: {
    backgroundColor: '#fff',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    backgroundColor: '#fff',
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
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
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 13,
    color: '#000',
    lineHeight: 18,
    marginBottom: 2,
  },
  usernameText: {
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#999',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
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
  postThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginLeft: 6,
  },
  commentPreview: {
    fontStyle: 'italic',
    color: '#666',
  },
  notificationTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  partyGameText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 1,
  },
  inviteActionsInline: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  acceptButtonCompact: {
    padding: 0,
  },
  declineButtonCompact: {
    padding: 0,
  },
});
