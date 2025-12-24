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
  getDoc
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
