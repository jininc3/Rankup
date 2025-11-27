import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  provider: 'email' | 'google';
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
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: username,
    });

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      id: user.uid,
      email: user.email!,
      username,
      provider: 'email',
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
        provider: 'email',
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
      // Create new user profile
      userProfile = {
        id: user.uid,
        email: user.email!,
        username: user.displayName || user.email!.split('@')[0],
        avatar: user.photoURL || undefined,
        provider: 'google',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(doc(db, 'users', user.uid), userProfile);
    } else {
      // Update avatar if it changed
      if (user.photoURL && user.photoURL !== userProfile.avatar) {
        userProfile.avatar = user.photoURL;
        await setDoc(doc(db, 'users', user.uid), {
          ...userProfile,
          updatedAt: new Date(),
        });
      }
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
