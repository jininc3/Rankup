import { db } from '@/config/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  getDoc,
  where,
  limit
} from 'firebase/firestore';

export interface FollowerData {
  followerId: string;
  followerUsername: string;
  followerAvatar?: string;
  createdAt: Timestamp;
}

export interface FollowingData {
  followingId: string;
  followingUsername: string;
  followingAvatar?: string;
  createdAt: Timestamp;
}

/**
 * Follow a user
 * Creates two documents:
 * 1. In target user's followers subcollection
 * 2. In current user's following subcollection
 */
export const followUser = async (
  currentUserId: string,
  currentUsername: string,
  currentUserAvatar: string | undefined,
  targetUserId: string,
  targetUsername: string,
  targetUserAvatar: string | undefined
): Promise<void> => {
  if (currentUserId === targetUserId) {
    throw new Error('You cannot follow yourself');
  }

  // Block check
  const { isBlocked, isBlockedBy } = await import('./blockService');
  const [blockedByTarget, hasBlockedTarget] = await Promise.all([
    isBlockedBy(currentUserId, targetUserId),
    isBlocked(currentUserId, targetUserId),
  ]);
  if (blockedByTarget || hasBlockedTarget) {
    throw new Error('Unable to follow this user');
  }

  const now = Timestamp.now();

  // Add to target user's followers subcollection
  const followerDocRef = doc(db, `users/${targetUserId}/followers/${currentUserId}`);
  const followerData: any = {
    followerId: currentUserId,
    followerUsername: currentUsername,
    createdAt: now,
  };
  if (currentUserAvatar) {
    followerData.followerAvatar = currentUserAvatar;
  }
  await setDoc(followerDocRef, followerData);

  // Add to current user's following subcollection
  const followingDocRef = doc(db, `users/${currentUserId}/following/${targetUserId}`);
  const followingData: any = {
    followingId: targetUserId,
    followingUsername: targetUsername,
    createdAt: now,
  };
  if (targetUserAvatar) {
    followingData.followingAvatar = targetUserAvatar;
  }
  await setDoc(followingDocRef, followingData);

  // Counts are now automatically updated by Cloud Functions
  // Cloud Function triggers on follower document creation

  // Create notification for the target user
  const notificationDocRef = doc(db, `users/${targetUserId}/notifications/${currentUserId}_follow_${Date.now()}`);
  await setDoc(notificationDocRef, {
    type: 'follow',
    fromUserId: currentUserId,
    fromUsername: currentUsername,
    fromUserAvatar: currentUserAvatar || null,
    read: false,
    createdAt: now,
  });
};

/**
 * Unfollow a user
 * Deletes two documents:
 * 1. From target user's followers subcollection
 * 2. From current user's following subcollection
 */
export const unfollowUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  // Remove from target user's followers subcollection
  const followerDocRef = doc(db, `users/${targetUserId}/followers/${currentUserId}`);
  await deleteDoc(followerDocRef);

  // Remove from current user's following subcollection
  const followingDocRef = doc(db, `users/${currentUserId}/following/${targetUserId}`);
  await deleteDoc(followingDocRef);

  // Counts are now automatically updated by Cloud Functions
  // Cloud Function triggers on follower document deletion
};

/**
 * Get a user's followers
 */
export const getFollowers = async (userId: string): Promise<FollowerData[]> => {
  const followersRef = collection(db, `users/${userId}/followers`);
  const q = query(followersRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => doc.data() as FollowerData);
};

/**
 * Get users that a user is following
 */
export const getFollowing = async (userId: string): Promise<FollowingData[]> => {
  const followingRef = collection(db, `users/${userId}/following`);
  const q = query(followingRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => doc.data() as FollowingData);
};

/**
 * Check if current user is following target user
 */
export const isFollowing = async (
  currentUserId: string,
  targetUserId: string
): Promise<boolean> => {
  const followingDocRef = doc(db, `users/${currentUserId}/following/${targetUserId}`);
  const docSnap = await getDoc(followingDocRef);
  return docSnap.exists();
};

/**
 * Get follower count for a user
 */
export const getFollowerCount = async (userId: string): Promise<number> => {
  const followersRef = collection(db, `users/${userId}/followers`);
  const querySnapshot = await getDocs(followersRef);
  return querySnapshot.size;
};

/**
 * Get following count for a user
 */
export const getFollowingCount = async (userId: string): Promise<number> => {
  const followingRef = collection(db, `users/${userId}/following`);
  const querySnapshot = await getDocs(followingRef);
  return querySnapshot.size;
};

/**
 * Get a user's recent posts (for when following someone new)
 * Returns up to 8 most recent posts
 */
export const getUserRecentPosts = async (userId: string): Promise<any[]> => {
  const postsRef = collection(db, 'posts');
  const q = query(
    postsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(8)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// ─── Follow Requests (Private Accounts) ──────────────────────────────────

/**
 * Send a follow request to a private account
 */
export const sendFollowRequest = async (
  currentUserId: string,
  currentUsername: string,
  currentUserAvatar: string | undefined,
  targetUserId: string,
): Promise<void> => {
  if (currentUserId === targetUserId) {
    throw new Error('You cannot follow yourself');
  }

  // Block check
  const { isBlocked, isBlockedBy } = await import('./blockService');
  const [blockedByTarget, hasBlockedTarget] = await Promise.all([
    isBlockedBy(currentUserId, targetUserId),
    isBlocked(currentUserId, targetUserId),
  ]);
  if (blockedByTarget || hasBlockedTarget) {
    throw new Error('Unable to follow this user');
  }

  // Check if already following
  const followingDoc = await getDoc(doc(db, `users/${currentUserId}/following/${targetUserId}`));
  if (followingDoc.exists()) return;

  // Check if request already exists
  const requestDoc = await getDoc(doc(db, `users/${targetUserId}/followRequests/${currentUserId}`));
  if (requestDoc.exists()) return;

  const now = Timestamp.now();

  // Create follow request
  const requestRef = doc(db, `users/${targetUserId}/followRequests/${currentUserId}`);
  await setDoc(requestRef, {
    requesterId: currentUserId,
    requesterUsername: currentUsername,
    requesterAvatar: currentUserAvatar || null,
    createdAt: now,
  });

  // Create follow_request notification
  const notifRef = doc(db, `users/${targetUserId}/notifications/${currentUserId}_follow_request_${Date.now()}`);
  await setDoc(notifRef, {
    type: 'follow_request',
    fromUserId: currentUserId,
    fromUsername: currentUsername,
    fromUserAvatar: currentUserAvatar || null,
    read: false,
    createdAt: now,
  });
};

/**
 * Cancel a pending follow request
 */
export const cancelFollowRequest = async (
  currentUserId: string,
  targetUserId: string,
): Promise<void> => {
  // Delete the follow request doc
  await deleteDoc(doc(db, `users/${targetUserId}/followRequests/${currentUserId}`));

  // Delete follow_request notifications from this user
  const notifsRef = collection(db, `users/${targetUserId}/notifications`);
  const q = query(notifsRef, where('type', '==', 'follow_request'), where('fromUserId', '==', currentUserId));
  const snapshot = await getDocs(q);
  for (const notifDoc of snapshot.docs) {
    await deleteDoc(notifDoc.ref);
  }
};

/**
 * Accept a follow request — converts it into a real follow
 */
export const acceptFollowRequest = async (
  currentUserId: string,
  currentUsername: string,
  currentUserAvatar: string | undefined,
  requesterId: string,
  requesterUsername: string,
  requesterAvatar: string | undefined,
): Promise<void> => {
  const now = Timestamp.now();

  // Delete the follow request doc
  await deleteDoc(doc(db, `users/${currentUserId}/followRequests/${requesterId}`));

  // Create the actual follow relationship (requester follows current user)
  const followerRef = doc(db, `users/${currentUserId}/followers/${requesterId}`);
  const followerData: any = {
    followerId: requesterId,
    followerUsername: requesterUsername,
    createdAt: now,
  };
  if (requesterAvatar) followerData.followerAvatar = requesterAvatar;
  await setDoc(followerRef, followerData);

  const followingRef = doc(db, `users/${requesterId}/following/${currentUserId}`);
  const followingData: any = {
    followingId: currentUserId,
    followingUsername: currentUsername,
    createdAt: now,
  };
  if (currentUserAvatar) followingData.followingAvatar = currentUserAvatar;
  await setDoc(followingRef, followingData);

  // Counts are automatically updated by Cloud Functions
};

/**
 * Decline a follow request
 */
export const declineFollowRequest = async (
  currentUserId: string,
  requesterId: string,
): Promise<void> => {
  // Delete the follow request doc
  await deleteDoc(doc(db, `users/${currentUserId}/followRequests/${requesterId}`));
};

/**
 * Check if a follow request is pending
 */
export const hasFollowRequest = async (
  currentUserId: string,
  targetUserId: string,
): Promise<boolean> => {
  const requestDoc = await getDoc(doc(db, `users/${targetUserId}/followRequests/${currentUserId}`));
  return requestDoc.exists();
};
