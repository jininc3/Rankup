import { db } from '@/config/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { unfollowUser } from './followService';

export interface BlockedUserData {
  blockedUserId: string;
  blockedUsername: string;
  blockedUserAvatar?: string;
  createdAt: Timestamp;
}

/**
 * Block a user
 * 1. Creates doc in current user's blockedUsers subcollection
 * 2. Creates doc in target user's blockedByUsers subcollection
 * 3. Auto-unfollows both directions
 */
export const blockUser = async (
  currentUserId: string,
  targetUserId: string,
  targetUsername: string,
  targetUserAvatar: string | undefined
): Promise<void> => {
  if (currentUserId === targetUserId) {
    throw new Error('You cannot block yourself');
  }

  const now = Timestamp.now();

  // Add to current user's blockedUsers subcollection
  const blockedDocRef = doc(db, `users/${currentUserId}/blockedUsers/${targetUserId}`);
  const blockedData: any = {
    blockedUserId: targetUserId,
    blockedUsername: targetUsername,
    createdAt: now,
  };
  if (targetUserAvatar) {
    blockedData.blockedUserAvatar = targetUserAvatar;
  }
  await setDoc(blockedDocRef, blockedData);

  // Add to target user's blockedByUsers subcollection
  const blockedByDocRef = doc(db, `users/${targetUserId}/blockedByUsers/${currentUserId}`);
  await setDoc(blockedByDocRef, {
    blockerUserId: currentUserId,
    createdAt: now,
  });

  // Auto-unfollow both directions (silently ignore errors if not following)
  try { await unfollowUser(currentUserId, targetUserId); } catch {}
  try { await unfollowUser(targetUserId, currentUserId); } catch {}
};

/**
 * Unblock a user
 * Removes docs from both subcollections
 */
export const unblockUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  const blockedDocRef = doc(db, `users/${currentUserId}/blockedUsers/${targetUserId}`);
  await deleteDoc(blockedDocRef);

  const blockedByDocRef = doc(db, `users/${targetUserId}/blockedByUsers/${currentUserId}`);
  await deleteDoc(blockedByDocRef);
};

/**
 * Check if current user has blocked target
 */
export const isBlocked = async (
  currentUserId: string,
  targetUserId: string
): Promise<boolean> => {
  const docRef = doc(db, `users/${currentUserId}/blockedUsers/${targetUserId}`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
};

/**
 * Check if current user is blocked by target
 */
export const isBlockedBy = async (
  currentUserId: string,
  targetUserId: string
): Promise<boolean> => {
  const docRef = doc(db, `users/${currentUserId}/blockedByUsers/${targetUserId}`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
};

/**
 * Get all users blocked by the current user (for settings screen)
 */
export const getBlockedUsers = async (userId: string): Promise<BlockedUserData[]> => {
  const blockedRef = collection(db, `users/${userId}/blockedUsers`);
  const snapshot = await getDocs(blockedRef);
  return snapshot.docs.map(d => d.data() as BlockedUserData);
};

/**
 * Get all user IDs who have blocked the current user
 */
export const getBlockedByUserIds = async (userId: string): Promise<string[]> => {
  const blockedByRef = collection(db, `users/${userId}/blockedByUsers`);
  const snapshot = await getDocs(blockedByRef);
  return snapshot.docs.map(d => d.id);
};
