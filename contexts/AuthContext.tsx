import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { getUserProfile, signOut as authSignOut } from '@/services/authService';
import type { UserProfile } from '@/services/authService';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  discordLink?: string;
  instagramLink?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  needsUsernameSetup?: boolean;
  provider: 'email' | 'google' | 'discord' | 'instagram';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  needsUsernameSetup: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get their profile
        try {
          const userProfile = await getUserProfile(firebaseUser.uid);

          if (userProfile) {
            console.log('User profile loaded:', {
              username: userProfile.username,
              needsUsernameSetup: userProfile.needsUsernameSetup,
              provider: userProfile.provider
            });
            setUser({
              id: userProfile.id,
              username: userProfile.username,
              email: userProfile.email,
              avatar: userProfile.avatar,
              coverPhoto: userProfile.coverPhoto,
              bio: userProfile.bio,
              discordLink: userProfile.discordLink,
              instagramLink: userProfile.instagramLink,
              postsCount: userProfile.postsCount || 0,
              followersCount: userProfile.followersCount || 0,
              followingCount: userProfile.followingCount || 0,
              needsUsernameSetup: userProfile.needsUsernameSetup || false,
              provider: userProfile.provider,
            });
          } else {
            // Fallback if profile doesn't exist (new user or race condition)
            const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com');
            console.log('Using fallback user, isGoogle:', isGoogleUser);
            setUser({
              id: firebaseUser.uid,
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              avatar: firebaseUser.photoURL || undefined,
              needsUsernameSetup: isGoogleUser, // New Google users need username setup
              provider: isGoogleUser ? 'google' : 'email',
            });
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const userProfile = await getUserProfile(currentUser.uid);
      if (userProfile) {
        setUser({
          id: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          avatar: userProfile.avatar,
          coverPhoto: userProfile.coverPhoto,
          bio: userProfile.bio,
          discordLink: userProfile.discordLink,
          instagramLink: userProfile.instagramLink,
          postsCount: userProfile.postsCount || 0,
          followersCount: userProfile.followersCount || 0,
          followingCount: userProfile.followingCount || 0,
          needsUsernameSetup: userProfile.needsUsernameSetup || false,
          provider: userProfile.provider,
        });
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await authSignOut();
      setUser(null);
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        setUser,
        refreshUser,
        signOut: handleSignOut,
        isAuthenticated: !!user,
        needsUsernameSetup: !!user?.needsUsernameSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
