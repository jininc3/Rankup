import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/config/firebase';

/**
 * Upload a profile picture to Firebase Storage
 * @param userId - The user's ID
 * @param uri - Local URI of the image
 * @returns Download URL of the uploaded image
 */
export async function uploadProfilePicture(userId: string, uri: string): Promise<string> {
  try {
    // Convert URI to blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create a reference to the storage location
    const storageRef = ref(storage, `profile-pictures/${userId}/avatar.jpg`);

    // Upload the file
    await uploadBytes(storageRef, blob);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error: any) {
    console.error('Upload profile picture error:', error);
    throw new Error('Failed to upload profile picture');
  }
}

/**
 * Delete a profile picture from Firebase Storage
 * @param userId - The user's ID
 */
export async function deleteProfilePicture(userId: string): Promise<void> {
  try {
    const storageRef = ref(storage, `profile-pictures/${userId}/avatar.jpg`);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.error('Delete profile picture error:', error);
    // Don't throw error if file doesn't exist
    if (error.code !== 'storage/object-not-found') {
      throw new Error('Failed to delete profile picture');
    }
  }
}

/**
 * Upload a cover photo to Firebase Storage
 * @param userId - The user's ID
 * @param uri - Local URI of the image
 * @returns Download URL of the uploaded image
 */
export async function uploadCoverPhoto(userId: string, uri: string): Promise<string> {
  try {
    // Convert URI to blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create a reference to the storage location
    const storageRef = ref(storage, `cover-photos/${userId}/cover.jpg`);

    // Upload the file
    await uploadBytes(storageRef, blob);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error: any) {
    console.error('Upload cover photo error:', error);
    throw new Error('Failed to upload cover photo');
  }
}

/**
 * Delete a cover photo from Firebase Storage
 * @param userId - The user's ID
 */
export async function deleteCoverPhoto(userId: string): Promise<void> {
  try {
    const storageRef = ref(storage, `cover-photos/${userId}/cover.jpg`);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.error('Delete cover photo error:', error);
    // Don't throw error if file doesn't exist
    if (error.code !== 'storage/object-not-found') {
      throw new Error('Failed to delete cover photo');
    }
  }
}
