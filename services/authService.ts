import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  discordLink?: string;
  instagramLink?: string;
  provider: 'email' | 'google';
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  needsUsernameSetup?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sign up a new user with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  username: string
): Promise<UserProfile> {
  try {
    // Normalize username to lowercase
    const normalizedUsername = username.toLowerCase();

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: normalizedUsername,
    });

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      id: user.uid,
      email: user.email!,
      username: normalizedUsername,
      bio: '',
      discordLink: '',
      instagramLink: '',
      provider: 'email',
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    return userProfile;
  } catch (error: any) {
    console.error('Sign up error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserProfile> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user profile from Firestore
    const userProfile = await getUserProfile(user.uid);

    if (!userProfile) {
      // If profile doesn't exist, create it
      const newProfile: UserProfile = {
        id: user.uid,
        email: user.email!,
        username: user.displayName || user.email!.split('@')[0],
        bio: '',
        discordLink: '',
        instagramLink: '',
        provider: 'email',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(doc(db, 'users', user.uid), newProfile);
      return newProfile;
    }

    return userProfile;
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Sign in with Google using ID token from AuthSession
 * Note: This should be called after getting the ID token from Google OAuth
 */
export async function signInWithGoogleCredential(idToken: string): Promise<UserProfile> {
  try {
    // Create a Google credential with the token
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Sign in with credential
    const userCredential = await signInWithCredential(auth, googleCredential);
    const user = userCredential.user;

    // Check if user profile exists
    let userProfile = await getUserProfile(user.uid);

    if (!userProfile) {
      // Create new user profile - mark as needing username setup
      userProfile = {
        id: user.uid,
        email: user.email!,
        username: user.displayName || user.email!.split('@')[0],
        bio: '',
        discordLink: '',
        instagramLink: '',
        provider: 'google',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        needsUsernameSetup: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(doc(db, 'users', user.uid), userProfile);
    }

    return userProfile;
  } catch (error: any) {
    console.error('Google sign in error:', error);
    throw new Error('Failed to sign in with Google');
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    // Sign out from Firebase
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Delete incomplete account (used when user backs out of signup)
 * Deletes both Firebase Auth account and Firestore document
 */
export async function deleteIncompleteAccount(): Promise<void> {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.log('No user to delete');
      return;
    }

    const userId = user.uid;

    // Delete Firestore document first
    try {
      await deleteDoc(doc(db, 'users', userId));
      console.log('Deleted Firestore document for user:', userId);
    } catch (firestoreError) {
      console.error('Error deleting Firestore document:', firestoreError);
      // Continue even if Firestore deletion fails
    }

    // Delete Firebase Auth account
    await deleteUser(user);
    console.log('Deleted Firebase Auth account for user:', userId);
  } catch (error) {
    console.error('Delete incomplete account error:', error);
    throw new Error('Failed to delete account');
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProfile;
    }

    return null;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
}

/**
 * Update user profile with additional information
 */
export async function updateUserProfile(
  userId: string,
  data: {
    username?: string;
    bio?: string;
    discordLink?: string;
    instagramLink?: string;
    avatar?: string;
  }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);

    // Normalize username to lowercase if provided
    const updateData = { ...data };
    if (updateData.username) {
      updateData.username = updateData.username.toLowerCase();
    }

    await updateDoc(userRef, {
      ...updateData,
      updatedAt: new Date(),
    });
  } catch (error: any) {
    console.error('Update user profile error:', error);
    throw new Error('Failed to update profile');
  }
}

/**
 * Get current Firebase user
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Convert Firebase auth error codes to user-friendly messages
 */
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/operation-not-allowed':
      return 'Operation not allowed';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    default:
      return 'An error occurred. Please try again';
  }
}

