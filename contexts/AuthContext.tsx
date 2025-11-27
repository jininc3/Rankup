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
  provider: 'email' | 'google' | 'discord' | 'instagram';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
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
            setUser({
              id: userProfile.id,
              username: userProfile.username,
              email: userProfile.email,
              avatar: userProfile.avatar,
              provider: userProfile.provider,
            });
          } else {
            // Fallback if profile doesn't exist
            setUser({
              id: firebaseUser.uid,
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              avatar: firebaseUser.photoURL || undefined,
              provider: 'email',
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
        signOut: handleSignOut,
        isAuthenticated: !!user,
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
