import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SectionList, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator, Animated, Alert } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, where, Timestamp, getDocs, writeBatch, getDoc, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import PostViewerModal from '@/app/components/postViewerModal';
import { LinearGradient } from 'expo-linear-gradient';

interface Notification {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'tag' | 'party_invite' | 'party_complete' | 'party_ranking_change' | 'challenge_invite';
  fromUserId?: string; // Optional for system notifications like party_complete
  fromUsername?: string; // Optional for system notifications like party_complete
  fromUserAvatar?: string;
  postId?: string;
  postThumbnail?: string;
  commentText?: string;
  partyId?: string;
  partyName?: string;
  game?: string;
  winnerUserId?: string;
  winnerUsername?: string;
  isWinner?: boolean;
  finalRank?: number;
  newRank?: number; // For party_ranking_change
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
  const [partyIcons, setPartyIcons] = useState<{ [partyId: string]: string | null }>({});
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Load and listen to notifications in real-time
  useEffect(() => {
    if (!currentUser?.id) return;

    setLoading(true);

    // Set up real-time listener for notifications
    const notificationsRef = collection(db, 'users', currentUser.id, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const notifs: Notification[] = [];
      const userAvatarCache: { [userId: string]: string | undefined } = {};

      // Track last document for pagination
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      setLastDoc(lastVisible || null);
      setHasMore(snapshot.docs.length === 10);

      // First pass: collect all notifications
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

      // Second pass: fetch current avatars and filter out notifications from deleted users
      const deletedUserIds = new Set<string>();
      const existingUserIds = new Set<string>();

      for (const notif of notifs) {
        // Skip avatar fetching for notifications without a fromUserId (system notifications)
        if (!notif.fromUserId) continue;

        // Skip if we already know this user is deleted
        if (deletedUserIds.has(notif.fromUserId)) continue;

        if (!notif.fromUserAvatar || !notif.fromUserAvatar.startsWith('http') || !existingUserIds.has(notif.fromUserId)) {
          // Check cache first
          if (userAvatarCache[notif.fromUserId] !== undefined) {
            notif.fromUserAvatar = userAvatarCache[notif.fromUserId];
            existingUserIds.add(notif.fromUserId);
          } else {
            // Fetch current avatar from user document
            try {
              const userDoc = await getDoc(doc(db, 'users', notif.fromUserId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const currentAvatar = userData.avatar;
                userAvatarCache[notif.fromUserId] = currentAvatar;
                notif.fromUserAvatar = currentAvatar;
                existingUserIds.add(notif.fromUserId);
              } else {
                // User has been deleted — mark for filtering
                deletedUserIds.add(notif.fromUserId);
              }
            } catch (error) {
              console.error('Error fetching user avatar:', error);
            }
          }
        } else {
          existingUserIds.add(notif.fromUserId);
        }
      }

      // Filter out notifications from deleted users (keep system notifications without fromUserId)
      const filteredNotifs = notifs.filter(
        (notif) => !notif.fromUserId || !deletedUserIds.has(notif.fromUserId)
      );

      setNotifications(filteredNotifs);
      setLoading(false);
    });

    // Clean up old notifications (30 days) on load
    cleanupOldNotifications();

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Fetch party icons for any leaderboard notifications missing them
  useEffect(() => {
    const partyIdsToFetch = Array.from(
      new Set(
        notifications
          .map(n => n.partyId)
          .filter((pid): pid is string => !!pid && partyIcons[pid] === undefined)
      )
    );
    if (partyIdsToFetch.length === 0) return;

    let cancelled = false;
    (async () => {
      const updates: { [k: string]: string | null } = {};
      await Promise.all(
        partyIdsToFetch.map(async (pid) => {
          try {
            const partyDoc = await getDoc(doc(db, 'parties', pid));
            if (partyDoc.exists()) {
              const data = partyDoc.data();
              updates[pid] = data.partyIcon || data.icon || null;
            } else {
              updates[pid] = null;
            }
          } catch {
            updates[pid] = null;
          }
        })
      );
      if (!cancelled && Object.keys(updates).length > 0) {
        setPartyIcons(prev => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notifications, partyIcons]);

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
  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);

  const handleAcceptInvite = async (notification: Notification, event: any) => {
    event.stopPropagation();
    if (!currentUser?.id || !notification.partyId) return;

    setAcceptingInvite(notification.id);

    try {
      // Get user data for member details first (this should always succeed for own user)
      const userDoc = await getDoc(doc(db, 'users', currentUser.id));
      const userData = userDoc.data();

      // Get party document directly by ID
      const partyRef = doc(db, 'parties', notification.partyId);
      const partySnapshot = await getDoc(partyRef);

      if (!partySnapshot.exists()) {
        Alert.alert('Error', 'This leaderboard no longer exists.');
        await deleteNotification(notification.id);
        setAcceptingInvite(null);
        return;
      }

      const partyData = partySnapshot.data();

      // Check if already a member
      if (partyData.members?.includes(currentUser.id)) {
        Alert.alert('Already Joined', 'You are already a member of this leaderboard.');
        await deleteNotification(notification.id);
        setAcceptingInvite(null);
        return;
      }

      // Update party: add user to members and memberDetails, update pendingInvites
      const updatedMembers = [...(partyData.members || []), currentUser.id];
      const updatedMemberDetails = [
        ...(partyData.memberDetails || []),
        {
          userId: currentUser.id,
          username: userData?.username || 'Unknown',
          avatar: userData?.avatar || '',
          joinedAt: new Date().toISOString(),
        },
      ];

      // Remove user from pendingInvites instead of updating status
      const updatedPendingInvites = (partyData.pendingInvites || []).filter(
        (invite: any) => invite.userId !== currentUser.id
      );

      await updateDoc(partyRef, {
        members: updatedMembers,
        memberDetails: updatedMemberDetails,
        pendingInvites: updatedPendingInvites,
      });

      // Delete the notification
      await deleteNotification(notification.id);

      console.log('Successfully joined party:', notification.partyName);

      // Navigate to the appropriate detail page based on party type
      if (partyData.type === 'leaderboard') {
        router.push({
          pathname: '/partyPages/leaderboardDetail',
          params: {
            name: notification.partyName,
            id: notification.partyId,
            game: notification.game,
            members: updatedMembers.length.toString(),
            startDate: partyData.startDate || '',
            endDate: partyData.endDate || '',
          },
        });
      } else {
        // Default to leaderboard detail
        router.push({
          pathname: '/partyPages/leaderboardDetail',
          params: {
            name: notification.partyName,
            id: notification.partyId,
            game: notification.game,
          },
        });
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        Alert.alert(
          'Unable to Join',
          'There was a permissions issue joining this leaderboard. The invite may have expired or been revoked.'
        );
      } else {
        Alert.alert('Error', 'Failed to accept invitation. Please try again.');
      }
    } finally {
      setAcceptingInvite(null);
    }
  };

  // Decline party invitation
  const handleDeclineInvite = async (notification: Notification, event: any) => {
    event.stopPropagation();
    if (!currentUser?.id || !notification.partyId) return;

    try {
      // Get party document directly by ID
      const partyRef = doc(db, 'parties', notification.partyId);
      const partySnapshot = await getDoc(partyRef);

      if (partySnapshot.exists()) {
        const partyData = partySnapshot.data();

        // Update invite status to declined in pendingInvites
        const updatedPendingInvites = (partyData.pendingInvites || []).map((invite: any) =>
          invite.userId === currentUser.id ? { ...invite, status: 'declined' } : invite
        );

        await updateDoc(partyRef, {
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

  // Accept challenge invite
  const handleAcceptChallenge = async (notification: Notification, event: any) => {
    event.stopPropagation();
    if (!currentUser?.id || !notification.partyId) return;

    setAcceptingInvite(notification.id);
    try {
      const partyRef = doc(db, 'parties', notification.partyId);
      const partySnapshot = await getDoc(partyRef);

      if (!partySnapshot.exists()) {
        Alert.alert('Error', 'This leaderboard no longer exists.');
        await deleteNotification(notification.id);
        setAcceptingInvite(null);
        return;
      }

      const partyData = partySnapshot.data();

      // Update challenge invite status to accepted
      const updatedChallengeInvites = (partyData.challengeInvites || []).map((inv: any) =>
        inv.userId === currentUser.id ? { ...inv, status: 'accepted' } : inv
      );

      // Add to challenge participants
      const updatedParticipants = [...(partyData.challengeParticipants || [])];
      if (!updatedParticipants.includes(currentUser.id)) {
        updatedParticipants.push(currentUser.id);
      }

      await updateDoc(partyRef, {
        challengeInvites: updatedChallengeInvites,
        challengeParticipants: updatedParticipants,
      });

      await deleteNotification(notification.id);

      // Navigate to leaderboard detail
      router.push({
        pathname: '/partyPages/leaderboardDetail',
        params: {
          name: notification.partyName,
          id: notification.partyId,
          game: notification.game,
        },
      });
    } catch (error) {
      console.error('Error accepting challenge:', error);
      Alert.alert('Error', 'Failed to accept challenge.');
    } finally {
      setAcceptingInvite(null);
    }
  };

  // Decline challenge invite
  const handleDeclineChallenge = async (notification: Notification, event: any) => {
    event.stopPropagation();
    if (!currentUser?.id || !notification.partyId) return;

    try {
      const partyRef = doc(db, 'parties', notification.partyId);
      const partySnapshot = await getDoc(partyRef);

      if (partySnapshot.exists()) {
        const partyData = partySnapshot.data();

        const updatedChallengeInvites = (partyData.challengeInvites || []).map((inv: any) =>
          inv.userId === currentUser.id ? { ...inv, status: 'rejected' } : inv
        );

        await updateDoc(partyRef, {
          challengeInvites: updatedChallengeInvites,
        });
      }

      await deleteNotification(notification.id);
    } catch (error) {
      console.error('Error declining challenge:', error);
    }
  };

  // Navigate to user profile
  const handleUserPress = (userId: string, event: any) => {
    event.stopPropagation();
    router.push(`/profilePages/profileView?userId=${userId}`);
  };

  // Navigate to appropriate page based on notification type
  const handleNotificationPress = async (notification: Notification) => {
    if (notification.type === 'follow' && notification.fromUserId) {
      // Navigate to user profile for follow notifications
      router.push(`/profilePages/profileView?userId=${notification.fromUserId}`);
    } else if ((notification.type === 'like' || notification.type === 'comment' || notification.type === 'tag') && notification.postId) {
      // Show post viewer for like/comment/tag notifications
      fetchAndShowPost(notification.postId);
    } else if ((notification.type === 'party_invite' || notification.type === 'party_complete' || notification.type === 'party_ranking_change' || notification.type === 'challenge_invite') && notification.partyId) {
      // Fetch party to determine type, then navigate to appropriate page
      try {
        const partyRef = doc(db, 'parties', notification.partyId);
        const partySnapshot = await getDoc(partyRef);

        if (partySnapshot.exists()) {
          const partyData = partySnapshot.data();

          router.push({
            pathname: '/partyPages/leaderboardDetail',
            params: {
              id: notification.partyId,
              name: notification.partyName || 'Leaderboard',
              game: notification.game || '',
            },
          });
        }
      } catch (error) {
        console.error('Error fetching party for navigation:', error);
        // Fallback to leaderboard detail
        router.push({
          pathname: '/partyPages/leaderboardDetail',
          params: {
            id: notification.partyId,
            name: notification.partyName || 'Leaderboard',
            game: notification.game || '',
          },
        });
      }
    }
  };

  // Format time ago
  const getTimeAgo = (timestamp: Timestamp): string => {
    const now = new Date();
    const notificationDate = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    const THIRTY_DAYS = 30 * 86400;
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < THIRTY_DAYS) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = notificationDate.getDate();
    const month = months[notificationDate.getMonth()];
    const year = String(notificationDate.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  };

  // Close any previously open swipeable when a new one opens
  const previousOpenSwipe = useRef<string | null>(null);

  const onSwipeableOpen = (notificationId: string) => {
    if (previousOpenSwipe.current && previousOpenSwipe.current !== notificationId) {
      swipeableRefs.current[previousOpenSwipe.current]?.close();
    }
    previousOpenSwipe.current = notificationId;
  };

  // Render the delete action behind the swipeable
  const renderRightActions = (notificationId: string) => {
    return (
      <TouchableOpacity
        style={styles.swipeDeleteAction}
        onPress={() => {
          swipeableRefs.current[notificationId]?.close();
          deleteNotification(notificationId);
        }}
      >
        <IconSymbol size={20} name="trash" color="#fff" />
        <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
      </TouchableOpacity>
    );
  };

  // Load older notifications when scrolling
  const loadOlderNotifications = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDoc || !currentUser?.id) return;

    setLoadingMore(true);
    try {
      const notificationsRef = collection(db, 'users', currentUser.id, 'notifications');
      const q = query(
        notificationsRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(10)
      );
      const querySnapshot = await getDocs(q);

      const newNotifs: Notification[] = [];
      const userAvatarCache: { [userId: string]: string | undefined } = {};

      // Collect new notifications
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        newNotifs.push({
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

      // Fetch current avatars and filter out notifications from deleted users
      const deletedUserIds = new Set<string>();

      for (const notif of newNotifs) {
        if (!notif.fromUserId) continue;
        if (deletedUserIds.has(notif.fromUserId)) continue;

        if (!notif.fromUserAvatar || !notif.fromUserAvatar.startsWith('http')) {
          if (userAvatarCache[notif.fromUserId] !== undefined) {
            notif.fromUserAvatar = userAvatarCache[notif.fromUserId];
          } else {
            try {
              const userDoc = await getDoc(doc(db, 'users', notif.fromUserId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const currentAvatar = userData.avatar;
                userAvatarCache[notif.fromUserId] = currentAvatar;
                notif.fromUserAvatar = currentAvatar;
              } else {
                deletedUserIds.add(notif.fromUserId);
              }
            } catch (error) {
              console.error('Error fetching user avatar:', error);
            }
          }
        }
      }

      // Filter out notifications from deleted users
      const filteredNewNotifs = newNotifs.filter(
        (notif) => !notif.fromUserId || !deletedUserIds.has(notif.fromUserId)
      );

      // Append new notifications and filter out duplicates
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNewNotifs = filteredNewNotifs.filter(n => !existingIds.has(n.id));
        return [...prev, ...uniqueNewNotifs];
      });

      // Update pagination state
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastDoc(lastVisible || null);
      setHasMore(querySnapshot.docs.length === 10);
    } catch (error) {
      console.error('Error loading older notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, lastDoc, currentUser?.id]);


  // Group notifications into sections by time period
  const getNotificationSections = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of this week (Sunday)
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const today: Notification[] = [];
    const thisWeek: Notification[] = [];
    const lastWeek: Notification[] = [];
    const earlier: Notification[] = [];

    notifications.forEach((notif) => {
      const notifDate = notif.createdAt.toDate();
      if (notifDate >= todayStart) {
        today.push(notif);
      } else if (notifDate >= weekStart) {
        thisWeek.push(notif);
      } else if (notifDate >= lastWeekStart) {
        lastWeek.push(notif);
      } else {
        earlier.push(notif);
      }
    });

    const sections: { title: string; data: Notification[] }[] = [];
    if (today.length > 0) sections.push({ title: 'Today', data: today });
    if (thisWeek.length > 0) sections.push({ title: 'This Week', data: thisWeek });
    if (lastWeek.length > 0) sections.push({ title: 'Last Week', data: lastWeek });
    if (earlier.length > 0) sections.push({ title: 'Earlier', data: earlier });

    return sections;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemedView style={styles.container}>
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>Notifications</ThemedText>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications}>
            <ThemedText style={styles.clearAllButton}>Clear All</ThemedText>
          </TouchableOpacity>
        )}
        {notifications.length === 0 && <View style={styles.headerSpacer} />}
      </View>

      <SectionList
        sections={getNotificationSections()}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onEndReached={loadOlderNotifications}
        onEndReachedThreshold={0.5}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c42743" />
            <ThemedText style={styles.loadingText}>Loading notifications...</ThemedText>
          </View>
        ) : null}
        ListFooterComponent={loadingMore ? (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color="#c42743" />
            <ThemedText style={styles.loadingMoreText}>Loading more...</ThemedText>
          </View>
        ) : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyState}>
            <IconSymbol size={64} name="bell" color="#72767d" />
            <ThemedText style={styles.emptyText}>No notifications yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              When someone follows you, you'll see it here
            </ThemedText>
          </View>
        ) : null}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionHeaderText}>{title}</ThemedText>
          </View>
        )}
        renderItem={({ item: notification }) => (
              <Swipeable
                ref={(ref) => { swipeableRefs.current[notification.id] = ref; }}
                renderRightActions={() => renderRightActions(notification.id)}
                rightThreshold={40}
                overshootRight={false}
                friction={2}
                onSwipeableWillOpen={() => onSwipeableOpen(notification.id)}
              >
                <TouchableOpacity
                  style={[styles.notificationCard, !notification.read && styles.unreadNotification]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationLeft}>
                    {/* Avatar */}
                    {notification.fromUserId ? (
                      <TouchableOpacity
                        style={styles.avatar}
                        onPress={(e) => handleUserPress(notification.fromUserId, e)}
                        activeOpacity={0.7}
                      >
                        {notification.fromUserAvatar && notification.fromUserAvatar.startsWith('http') ? (
                          <Image source={{ uri: notification.fromUserAvatar }} style={styles.avatarImage} />
                        ) : (
                          <ThemedText style={styles.avatarInitial}>
                            {notification.fromUsername?.[0]?.toUpperCase() || '?'}
                          </ThemedText>
                        )}
                      </TouchableOpacity>
                    ) : notification.partyId && partyIcons[notification.partyId] ? (
                      <View style={styles.avatar}>
                        <Image
                          source={{ uri: partyIcons[notification.partyId] as string }}
                          style={styles.avatarImage}
                        />
                      </View>
                    ) : (
                      <View style={styles.avatar}>
                        <IconSymbol size={18} name="trophy.fill" color="#A08845" />
                      </View>
                    )}

                    {/* Notification content */}
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationTextRow}>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.notificationText}>
                            {notification.fromUsername && notification.fromUserId ? (
                              <ThemedText
                                style={styles.usernameText}
                                onPress={(e) => handleUserPress(notification.fromUserId, e)}
                              >
                                {notification.fromUsername}
                              </ThemedText>
                            ) : null}
                            {notification.type === 'follow' && ' started following you'}
                            {notification.type === 'like' && ' liked your post'}
                            {notification.type === 'tag' && ' tagged you in a post'}
                            {notification.type === 'comment' && ' commented: '}
                            {notification.type === 'party_invite' && (
                              <>
                                {' invited you to '}
                                <ThemedText style={styles.leaderboardNameText}>
                                  {(notification.partyName || '').toUpperCase()}
                                </ThemedText>
                              </>
                            )}
                            {notification.type === 'challenge_invite' && (
                              <>
                                {' challenged you in '}
                                <ThemedText style={styles.leaderboardNameText}>
                                  {(notification.partyName || '').toUpperCase()}
                                </ThemedText>
                              </>
                            )}
                            {notification.type === 'party_complete' && (
                              <>
                                <ThemedText style={styles.leaderboardNameText}>
                                  {(notification.partyName || '').toUpperCase()}
                                </ThemedText>
                                {notification.isWinner
                                  ? ` ended. You won! Finished #${notification.finalRank}`
                                  : ` ended. You finished #${notification.finalRank}`}
                              </>
                            )}
                            {notification.type === 'party_ranking_change' && notification.fromUsername && (
                              <>
                                {' moved to '}
                                <ThemedText style={styles.rankText}>
                                  #{notification.newRank}
                                </ThemedText>
                                {' in '}
                                <ThemedText style={styles.leaderboardNameText}>
                                  {(notification.partyName || '').toUpperCase()}
                                </ThemedText>
                              </>
                            )}
                            {notification.type === 'comment' && notification.commentText && (
                              <ThemedText style={styles.commentPreview}>
                                "{notification.commentText.length > 30
                                  ? notification.commentText.substring(0, 30) + '...'
                                  : notification.commentText}"
                              </ThemedText>
                            )}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Game tag for party/challenge invites */}
                      {(notification.type === 'party_invite' || notification.type === 'challenge_invite') && notification.game && (
                        <ThemedText style={styles.partyGameText}>{notification.game}</ThemedText>
                      )}

                      <View style={styles.bottomRow}>
                        <ThemedText style={styles.timeText}>{getTimeAgo(notification.createdAt)}</ThemedText>

                        {notification.type === 'party_invite' && (
                          <View style={styles.inviteActions}>
                            <TouchableOpacity
                              style={[styles.acceptButton, acceptingInvite === notification.id && styles.acceptButtonLoading]}
                              onPress={(e) => handleAcceptInvite(notification, e)}
                              activeOpacity={0.7}
                              disabled={acceptingInvite === notification.id}
                            >
                              {acceptingInvite === notification.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <ThemedText style={styles.acceptButtonText}>Accept</ThemedText>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.declineButton}
                              onPress={(e) => handleDeclineInvite(notification, e)}
                              activeOpacity={0.7}
                              disabled={acceptingInvite === notification.id}
                            >
                              <IconSymbol size={20} name="xmark" color="#999" />
                            </TouchableOpacity>
                          </View>
                        )}
                        {notification.type === 'challenge_invite' && (
                          <View style={styles.inviteActions}>
                            <TouchableOpacity
                              style={[styles.acceptButton, acceptingInvite === notification.id && styles.acceptButtonLoading]}
                              onPress={(e) => handleAcceptChallenge(notification, e)}
                              activeOpacity={0.7}
                              disabled={acceptingInvite === notification.id}
                            >
                              {acceptingInvite === notification.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <ThemedText style={styles.acceptButtonText}>Accept</ThemedText>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.declineButton}
                              onPress={(e) => handleDeclineChallenge(notification, e)}
                              activeOpacity={0.7}
                              disabled={acceptingInvite === notification.id}
                            >
                              <IconSymbol size={20} name="xmark" color="#999" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Post thumbnail for like/comment/tag notifications */}
                    {(notification.type === 'like' || notification.type === 'comment' || notification.type === 'tag') && notification.postThumbnail && (
                      <Image source={{ uri: notification.postThumbnail }} style={styles.postThumbnail} />
                    )}
                  </View>

                  {/* Unread indicator */}
                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              </Swipeable>
        )}
      />

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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
  },
  headerSpacer: {
    width: 60,
  },
  clearAllButton: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#b9bbbe',
  },
  swipeDeleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    gap: 4,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderRadius: 12,
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 13,
    color: '#b9bbbe',
    lineHeight: 18,
    marginBottom: 2,
  },
  usernameText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 13,
  },
  timeText: {
    fontSize: 11,
    color: '#72767d',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c42743',
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
  postThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#36393e',
    marginLeft: 6,
  },
  commentPreview: {
    fontStyle: 'italic',
    color: '#b9bbbe',
  },
  winnerText: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },
  rankText: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
  },
  notificationTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  partyGameText: {
    fontSize: 11,
    color: '#b9bbbe',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  declineButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#A08845',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonLoading: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  leaderboardNameText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  rankingChangeText: {
    color: '#b9bbbe',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
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
