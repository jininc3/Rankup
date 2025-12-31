import { db, auth, storage } from '@/config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { ref, deleteObject, listAll } from 'firebase/storage';
import { deleteUser } from 'firebase/auth';
import { deleteProfilePicture, deleteCoverPhoto, deletePostMedia } from './storageService';

/**
 * Deletes all data associated with a user account
 * This is a comprehensive deletion that removes:
 * - User's posts (and their likes/comments subcollections) and post media
 * - User's profile images
 * - User's followers/following subcollections
 * - User's notifications subcollection
 * - User from other users' followers/following lists
 * - User's chats and messages
 * - User from all leaderboard parties
 * - User document
 * - Firebase Auth account
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    console.log(`Starting account deletion for user: ${userId}`);

    // 1. Delete all user's posts (including their likes and comments subcollections) and media
    await deleteUserPosts(userId);

    // 2. Delete user's profile images (avatar, cover photo)
    await deleteUserProfileImages(userId);

    // 3. Remove user from all followers/following relationships (including other users' lists)
    await deleteUserFollowRelationships(userId);

    // 4. Delete user's subcollections (notifications, followers, following, searchHistory)
    await deleteUserSubcollections(userId);

    // 5. Delete all user's chats and messages
    await deleteUserChats(userId);

    // 6. Remove user from all leaderboard parties
    await deleteUserFromParties(userId);

    // 7. Delete any remaining storage files in user's folder
    await deleteUserStorageFolder(userId);

    // 8. Delete user document from Firestore
    await deleteDoc(doc(db, 'users', userId));
    console.log('User document deleted');

    // 9. Delete Firebase Auth account (must be last)
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === userId) {
      await deleteUser(currentUser);
      console.log('Firebase Auth account deleted');
    }

    console.log(`Account deletion completed for user: ${userId}`);
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw new Error('Failed to delete account. Please try again.');
  }
}

/**
 * Delete all posts created by the user, their subcollections (likes, comments), and media
 */
async function deleteUserPosts(userId: string): Promise<void> {
  try {
    const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
    const postsSnapshot = await getDocs(postsQuery);

    console.log(`Found ${postsSnapshot.size} posts to delete`);

    for (const postDoc of postsSnapshot.docs) {
      const postData = postDoc.data();
      const postId = postDoc.id;

      // 1. Delete all likes in this post's likes subcollection
      await deleteSubcollection(postId, 'posts', 'likes');

      // 2. Delete all comments in this post's comments subcollection
      await deleteSubcollection(postId, 'posts', 'comments');

      // 3. Delete all media files associated with this post
      if (postData.mediaUrls && Array.isArray(postData.mediaUrls)) {
        for (const mediaUrl of postData.mediaUrls) {
          try {
            await deletePostMedia(mediaUrl);
          } catch (error) {
            console.error(`Error deleting media: ${mediaUrl}`, error);
          }
        }
      } else if (postData.mediaUrl) {
        try {
          await deletePostMedia(postData.mediaUrl);
        } catch (error) {
          console.error(`Error deleting media: ${postData.mediaUrl}`, error);
        }
      }

      // Delete thumbnail if exists
      if (postData.thumbnailUrl) {
        try {
          await deletePostMedia(postData.thumbnailUrl);
        } catch (error) {
          console.error(`Error deleting thumbnail: ${postData.thumbnailUrl}`, error);
        }
      }

      // 4. Delete the post document itself
      await deleteDoc(postDoc.ref);
    }

    console.log('User posts deleted');
  } catch (error) {
    console.error('Error deleting user posts:', error);
    throw error;
  }
}

/**
 * Delete user's profile images (avatar and cover photo)
 */
async function deleteUserProfileImages(userId: string): Promise<void> {
  try {
    await deleteProfilePicture(userId);
    await deleteCoverPhoto(userId);
    console.log('User profile images deleted');
  } catch (error) {
    console.error('Error deleting user profile images:', error);
    // Don't throw - continue with deletion even if images don't exist
  }
}

/**
 * Delete a subcollection under a parent document
 * Used for likes/comments under posts, or followers/following/notifications under users
 */
async function deleteSubcollection(
  parentDocId: string,
  parentCollection: string,
  subcollectionName: string
): Promise<void> {
  try {
    const subcollectionRef = collection(db, parentCollection, parentDocId, subcollectionName);
    const snapshot = await getDocs(subcollectionRef);

    console.log(`Deleting ${snapshot.size} documents from ${parentCollection}/${parentDocId}/${subcollectionName}`);

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let batch = writeBatch(db);
    let operationCount = 0;

    for (const docSnapshot of snapshot.docs) {
      batch.delete(docSnapshot.ref);
      operationCount++;

      if (operationCount >= batchSize) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error(`Error deleting subcollection ${subcollectionName}:`, error);
    // Don't throw - continue with deletion
  }
}

/**
 * Delete all user's subcollections (notifications, followers, following, searchHistory)
 */
async function deleteUserSubcollections(userId: string): Promise<void> {
  try {
    await deleteSubcollection(userId, 'users', 'notifications');
    await deleteSubcollection(userId, 'users', 'followers');
    await deleteSubcollection(userId, 'users', 'following');
    await deleteSubcollection(userId, 'users', 'searchHistory');
    console.log('User subcollections deleted');
  } catch (error) {
    console.error('Error deleting user subcollections:', error);
    // Don't throw - continue with deletion
  }
}

/**
 * Remove user from all followers/following relationships
 * This involves deleting from both the user's own subcollections AND other users' subcollections
 */
async function deleteUserFollowRelationships(userId: string): Promise<void> {
  try {
    // 1. Get all users that THIS user is following
    const followingRef = collection(db, `users/${userId}/following`);
    const followingSnapshot = await getDocs(followingRef);

    console.log(`User is following ${followingSnapshot.size} users`);

    // For each user that THIS user follows, remove THIS user from their followers list
    for (const followingDoc of followingSnapshot.docs) {
      const targetUserId = followingDoc.id;
      try {
        // Delete from target user's followers list
        await deleteDoc(doc(db, `users/${targetUserId}/followers/${userId}`));

        // Decrement target user's follower count
        await updateDoc(doc(db, 'users', targetUserId), {
          followersCount: increment(-1),
        });
      } catch (error) {
        console.error(`Error removing user from ${targetUserId}'s followers:`, error);
      }
    }

    // 2. Get all users that follow THIS user
    const followersRef = collection(db, `users/${userId}/followers`);
    const followersSnapshot = await getDocs(followersRef);

    console.log(`User has ${followersSnapshot.size} followers`);

    // For each follower, remove THIS user from their following list
    for (const followerDoc of followersSnapshot.docs) {
      const followerId = followerDoc.id;
      try {
        // Delete from follower's following list
        await deleteDoc(doc(db, `users/${followerId}/following/${userId}`));

        // Decrement follower's following count
        await updateDoc(doc(db, 'users', followerId), {
          followingCount: increment(-1),
        });
      } catch (error) {
        console.error(`Error removing user from ${followerId}'s following:`, error);
      }
    }

    console.log('User follow relationships deleted');
  } catch (error) {
    console.error('Error deleting user follow relationships:', error);
    // Don't throw - continue with deletion
  }
}

/**
 * Remove user from all leaderboard parties they're in
 * This removes them from members, memberDetails, and pendingInvites arrays
 */
async function deleteUserFromParties(userId: string): Promise<void> {
  try {
    // Find all parties where user is a member
    const partiesQuery = query(
      collection(db, 'parties'),
      where('members', 'array-contains', userId)
    );
    const partiesSnapshot = await getDocs(partiesQuery);

    console.log(`Found ${partiesSnapshot.size} parties to remove user from`);

    for (const partyDoc of partiesSnapshot.docs) {
      const partyData = partyDoc.data();

      // Remove user from members array
      const updatedMembers = partyData.members.filter((id: string) => id !== userId);

      // Remove user from memberDetails array
      const updatedMemberDetails = partyData.memberDetails.filter(
        (member: any) => member.userId !== userId
      );

      // Remove user from pendingInvites if present
      const updatedPendingInvites = partyData.pendingInvites
        ? partyData.pendingInvites.filter((invite: any) => invite.userId !== userId)
        : [];

      // Update the party document
      await updateDoc(partyDoc.ref, {
        members: updatedMembers,
        memberDetails: updatedMemberDetails,
        pendingInvites: updatedPendingInvites,
      });

      console.log(`Removed user from party: ${partyData.partyName}`);
    }

    console.log('User removed from all parties');
  } catch (error) {
    console.error('Error removing user from parties:', error);
    // Don't throw - continue with deletion
  }
}

/**
 * Delete all chats and messages involving the user
 */
async function deleteUserChats(userId: string): Promise<void> {
  try {
    // Find all chats where user is a participant
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );
    const chatsSnapshot = await getDocs(chatsQuery);

    console.log(`Found ${chatsSnapshot.size} chats to delete`);

    for (const chatDoc of chatsSnapshot.docs) {
      // Delete all messages in the chat
      const messagesQuery = query(
        collection(db, 'chats', chatDoc.id, 'messages')
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      const batch = writeBatch(db);
      messagesSnapshot.docs.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
      await batch.commit();

      // Delete the chat document
      await deleteDoc(chatDoc.ref);
    }

    console.log('User chats and messages deleted');
  } catch (error) {
    console.error('Error deleting user chats:', error);
    throw error;
  }
}

/**
 * Delete all remaining files in the user's storage folder
 * This is a cleanup step to ensure no orphaned files remain
 */
async function deleteUserStorageFolder(userId: string): Promise<void> {
  try {
    // Delete from posts folder
    const postsRef = ref(storage, `posts/${userId}`);
    await deleteAllFilesInFolder(postsRef);

    // Delete from profile-pictures folder
    const profilePicsRef = ref(storage, `profile-pictures/${userId}`);
    await deleteAllFilesInFolder(profilePicsRef);

    // Delete from cover-photos folder
    const coverPhotosRef = ref(storage, `cover-photos/${userId}`);
    await deleteAllFilesInFolder(coverPhotosRef);

    console.log('User storage folders cleaned up');
  } catch (error) {
    console.error('Error deleting user storage folder:', error);
    // Don't throw - this is a cleanup step
  }
}

/**
 * Helper function to delete all files in a storage folder
 */
async function deleteAllFilesInFolder(folderRef: any): Promise<void> {
  try {
    const listResult = await listAll(folderRef);

    // Delete all files
    const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
    await Promise.all(deletePromises);

    // Recursively delete subfolders
    const folderDeletePromises = listResult.prefixes.map((prefixRef) =>
      deleteAllFilesInFolder(prefixRef)
    );
    await Promise.all(folderDeletePromises);
  } catch (error: any) {
    // Ignore errors for non-existent folders
    if (error.code !== 'storage/object-not-found') {
      console.error('Error deleting folder:', error);
    }
  }
}
