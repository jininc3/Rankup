import { db } from '@/config/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  updateDoc,
  increment,
  Timestamp,
  getDocs,
} from 'firebase/firestore';

export interface LikeData {
  userId: string;
  username: string;
  userAvatar?: string;
  likedAt: Timestamp;
}

/**
 * Like a post
 * Creates a document in the post's likes subcollection and increments the like count
 */
export const likePost = async (
  userId: string,
  username: string,
  userAvatar: string | undefined,
  postId: string,
  postOwnerId: string,
  postThumbnail?: string
): Promise<void> => {
  const now = Timestamp.now();

  // Add to post's likes subcollection
  const likeDocRef = doc(db, `posts/${postId}/likes/${userId}`);
  const likeData: any = {
    userId,
    username,
    likedAt: now,
  };
  if (userAvatar) {
    likeData.userAvatar = userAvatar;
  }
  await setDoc(likeDocRef, likeData);

  // Increment like count on the post
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    likes: increment(1),
  });

  // Create notification for post owner (don't notify yourself)
  if (userId !== postOwnerId) {
    const notificationDocRef = doc(
      db,
      `users/${postOwnerId}/notifications/${userId}_like_${postId}_${Date.now()}`
    );
    await setDoc(notificationDocRef, {
      type: 'like',
      fromUserId: userId,
      fromUsername: username,
      fromUserAvatar: userAvatar || null,
      postId,
      postThumbnail: postThumbnail || null,
      read: false,
      createdAt: now,
    });
  }
};

/**
 * Unlike a post
 * Deletes the document from the post's likes subcollection and decrements the like count
 */
export const unlikePost = async (
  userId: string,
  postId: string
): Promise<void> => {
  // Remove from post's likes subcollection
  const likeDocRef = doc(db, `posts/${postId}/likes/${userId}`);
  await deleteDoc(likeDocRef);

  // Decrement like count on the post
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    likes: increment(-1),
  });

  // Note: We're keeping the notification for history
  // Optionally, you could delete it here if preferred
};

/**
 * Check if a user has liked a post
 */
export const isPostLiked = async (
  userId: string,
  postId: string
): Promise<boolean> => {
  const likeDocRef = doc(db, `posts/${postId}/likes/${userId}`);
  const docSnap = await getDoc(likeDocRef);
  return docSnap.exists();
};

/**
 * Get like count for a post
 */
export const getLikeCount = async (postId: string): Promise<number> => {
  const likesRef = collection(db, `posts/${postId}/likes`);
  const querySnapshot = await getDocs(likesRef);
  return querySnapshot.size;
};

/**
 * Get all users who liked a post
 */
export const getPostLikes = async (postId: string): Promise<LikeData[]> => {
  const likesRef = collection(db, `posts/${postId}/likes`);
  const querySnapshot = await getDocs(likesRef);

  return querySnapshot.docs.map(doc => doc.data() as LikeData);
};
