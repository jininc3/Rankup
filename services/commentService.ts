import { db } from '@/config/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  increment,
  Timestamp,
  query,
  orderBy,
  addDoc,
} from 'firebase/firestore';

export interface CommentData {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  createdAt: Timestamp;
}

/**
 * Add a comment to a post
 * Creates a document in the post's comments subcollection and increments the comment count
 */
export const addComment = async (
  userId: string,
  username: string,
  userAvatar: string | undefined,
  postId: string,
  postOwnerId: string,
  text: string,
  postThumbnail?: string
): Promise<string> => {
  const now = Timestamp.now();

  // Add to post's comments subcollection (auto-generate ID)
  const commentsRef = collection(db, `posts/${postId}/comments`);
  const commentData: any = {
    userId,
    username,
    text,
    createdAt: now,
  };
  if (userAvatar) {
    commentData.userAvatar = userAvatar;
  }

  const docRef = await addDoc(commentsRef, commentData);

  // Increment comment count on the post
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    commentsCount: increment(1),
  });

  // Create notification for post owner (don't notify yourself)
  if (userId !== postOwnerId) {
    const notificationDocRef = doc(
      db,
      `users/${postOwnerId}/notifications/${userId}_comment_${postId}_${Date.now()}`
    );
    await setDoc(notificationDocRef, {
      type: 'comment',
      fromUserId: userId,
      fromUsername: username,
      fromUserAvatar: userAvatar || null,
      postId,
      postThumbnail: postThumbnail || null,
      commentText: text,
      read: false,
      createdAt: now,
    });
  }

  return docRef.id;
};

/**
 * Delete a comment from a post
 * Removes the document from the post's comments subcollection and decrements the comment count
 */
export const deleteComment = async (
  commentId: string,
  postId: string
): Promise<void> => {
  // Remove from post's comments subcollection
  const commentDocRef = doc(db, `posts/${postId}/comments/${commentId}`);
  await deleteDoc(commentDocRef);

  // Decrement comment count on the post
  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    commentsCount: increment(-1),
  });

  // Note: We're keeping the notification for history
  // Optionally, you could delete it here if preferred
};

/**
 * Get all comments for a post
 */
export const getComments = async (postId: string): Promise<CommentData[]> => {
  const commentsRef = collection(db, `posts/${postId}/comments`);
  const q = query(commentsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CommentData));
};

/**
 * Get comment count for a post
 */
export const getCommentCount = async (postId: string): Promise<number> => {
  const commentsRef = collection(db, `posts/${postId}/comments`);
  const querySnapshot = await getDocs(commentsRef);
  return querySnapshot.size;
};
