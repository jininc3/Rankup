import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { getUserProfile, signOut as authSignOut } from '@/services/authService';
import type { UserProfile } from '@/services/authService';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getFollowing } from '@/services/followService';
import { Image } from 'react-native';
import { registerForPushNotificationsAsync, unregisterPushNotifications } from '@/services/notificationService';

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

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video';
  mediaTypes?: string[];
  thumbnailUrl?: string;
  caption?: string;
  taggedPeople?: any[];
  taggedGame?: string;
  createdAt: Timestamp;
  likes: number;
  commentsCount?: number;
}

interface SearchUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  preloadedPosts: Post[] | null;
  preloadedSearchHistory: SearchUser[] | null;
  preloadedProfilePosts: Post[] | null;
  preloadedRiotStats: any | null;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  needsUsernameSetup: boolean;
  clearPreloadedPosts: () => void;
  clearPreloadedSearchHistory: () => void;
  clearPreloadedProfileData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadedPosts, setPreloadedPosts] = useState<Post[] | null>(null);
  const [preloadedSearchHistory, setPreloadedSearchHistory] = useState<SearchUser[] | null>(null);
  const [preloadedProfilePosts, setPreloadedProfilePosts] = useState<Post[] | null>(null);
  const [preloadedRiotStats, setPreloadedRiotStats] = useState<any | null>(null);

  // Preload feed posts while loading screen is shown
  const preloadFeed = async (userId: string) => {
    try {
      const POSTS_PER_PAGE = 8;

      // Get following users
      const followingData = await getFollowing(userId);
      let userIds = followingData.map(follow => follow.followingId);

      // Remove current user from the list
      userIds = userIds.filter(id => id !== userId);

      if (userIds.length === 0) {
        setPreloadedPosts([]);
        return;
      }

      // Batch queries (Firestore 'in' limited to 10 items)
      const batchSize = 10;
      const batches: string[][] = [];
      for (let i = 0; i < userIds.length; i += batchSize) {
        batches.push(userIds.slice(i, i + batchSize));
      }

      let allBatchPosts: any[] = [];

      // Fetch posts from each batch
      for (const batch of batches) {
        const q = query(
          collection(db, 'posts'),
          where('userId', 'in', batch),
          orderBy('createdAt', 'desc'),
          limit(POSTS_PER_PAGE * 2)
        );

        const snapshot = await getDocs(q);
        const batchPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Post));

        allBatchPosts = [...allBatchPosts, ...batchPosts];
      }

      // Sort all posts by date
      allBatchPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      // Take only what we need (8 posts)
      const postsToShow = allBatchPosts.slice(0, POSTS_PER_PAGE);

      setPreloadedPosts(postsToShow);
      console.log(`✅ Preloaded ${postsToShow.length} posts`);

      // Prefetch feed images for instant rendering
      const imageUrls: string[] = [];
      postsToShow.forEach(post => {
        // Add user avatar
        if (post.avatar) {
          imageUrls.push(post.avatar);
        }
        // Add thumbnail for videos, or main image for images
        if (post.mediaType === 'video' && post.thumbnailUrl) {
          imageUrls.push(post.thumbnailUrl);
        } else if (post.mediaUrl) {
          imageUrls.push(post.mediaUrl);
        }
        // Also prefetch additional media if present
        if (post.mediaUrls && post.mediaUrls.length > 1) {
          post.mediaUrls.forEach(url => imageUrls.push(url));
        }
      });

      // Prefetch all images in parallel (don't await - run in background)
      if (imageUrls.length > 0) {
        Promise.all(
          imageUrls.map(url => Image.prefetch(url).catch(() => {}))
        );
      }
    } catch (error) {
      console.error('Error preloading feed:', error);
      setPreloadedPosts([]);
    }
  };

  // Preload search history while loading screen is shown
  const preloadSearchHistory = async (userId: string) => {
    try {
      const MAX_HISTORY_ITEMS = 7;

      const historyRef = collection(db, 'users', userId, 'searchHistory');
      const q = query(historyRef, orderBy('searchedAt', 'desc'), limit(MAX_HISTORY_ITEMS));
      const querySnapshot = await getDocs(q);

      const history: SearchUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          username: data.username,
          avatar: data.avatar,
          bio: data.bio,
          followersCount: data.followersCount,
          followingCount: data.followingCount,
          postsCount: data.postsCount,
        });
      });

      setPreloadedSearchHistory(history);

      // Prefetch avatar images for instant rendering
      const avatarUrls: string[] = [];
      history.forEach(user => {
        if (user.avatar) {
          avatarUrls.push(user.avatar);
        }
      });

      if (avatarUrls.length > 0) {
        Promise.all(
          avatarUrls.map(url => Image.prefetch(url).catch(() => {}))
        );
      }
    } catch (error) {
      console.error('Error preloading search history:', error);
      setPreloadedSearchHistory([]);
    }
  };

  // Preload profile posts and Riot stats while loading screen is shown
  const preloadProfileData = async (userId: string, userProfile?: any) => {
    try {
      // Prefetch user's avatar and cover photo first for instant header (CRITICAL - blocks loading)
      const headerImages: string[] = [];
      if (userProfile?.avatar) {
        headerImages.push(userProfile.avatar);
      }
      if (userProfile?.coverPhoto) {
        headerImages.push(userProfile.coverPhoto);
      }
      if (headerImages.length > 0) {
        await Promise.all(
          headerImages.map(url => Image.prefetch(url).catch(() => {}))
        );
      }

      // Preload user's posts
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(postsQuery);
      const fetchedPosts: Post[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));

      // Sort by newest first
      fetchedPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setPreloadedProfilePosts(fetchedPosts);
      console.log(`✅ Preloaded ${fetchedPosts.length} profile posts`);

      // Prefetch images for instant rendering
      const imageUrls: string[] = [];
      fetchedPosts.forEach(post => {
        // Add thumbnail for videos, or main image for images
        if (post.mediaType === 'video' && post.thumbnailUrl) {
          imageUrls.push(post.thumbnailUrl);
        } else if (post.mediaUrl) {
          imageUrls.push(post.mediaUrl);
        }
        // Also prefetch additional media if present
        if (post.mediaUrls && post.mediaUrls.length > 1) {
          post.mediaUrls.forEach(url => imageUrls.push(url));
        }
      });

      // Prefetch all images in parallel (don't await - run in background)
      if (imageUrls.length > 0) {
        Promise.all(
          imageUrls.map(url => Image.prefetch(url).catch(() => {}))
        );
      }

      // Preload Riot stats (import getLeagueStats at top)
      try {
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          if (userData.riotAccount) {
            // Dynamically import to avoid circular dependency
            const { getLeagueStats } = await import('@/services/riotService');
            const leagueResponse = await getLeagueStats(false);
            if (leagueResponse.success && leagueResponse.stats) {
              setPreloadedRiotStats(leagueResponse.stats);
            }
          }
        }
      } catch (error) {
        setPreloadedRiotStats(null);
      }
    } catch (error) {
      console.error('Error preloading profile data:', error);
      setPreloadedProfilePosts([]);
    }
  };

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

            // Preload all data if user doesn't need username setup
            // Keep loading screen visible until preload completes
            if (!userProfile.needsUsernameSetup) {
              // Run all preloads in parallel for faster loading
              await Promise.all([
                preloadFeed(userProfile.id),
                preloadSearchHistory(userProfile.id),
                preloadProfileData(userProfile.id, userProfile),
              ]);
            }

            // Register for push notifications (run in background, don't block loading)
            registerForPushNotificationsAsync(userProfile.id).catch(error => {
              console.error('Error registering for push notifications:', error);
            });
          } else {
            // Fallback if profile doesn't exist (new user or race condition)
            const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com');
            setUser({
              id: firebaseUser.uid,
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              avatar: firebaseUser.photoURL || undefined,
              needsUsernameSetup: isGoogleUser, // New Google users need username setup
              provider: isGoogleUser ? 'google' : 'email',
            });

            // Preload all data if user doesn't need username setup
            // Keep loading screen visible until preload completes
            if (!isGoogleUser) {
              // Run all preloads in parallel for faster loading
              await Promise.all([
                preloadFeed(firebaseUser.uid),
                preloadSearchHistory(firebaseUser.uid),
                preloadProfileData(firebaseUser.uid, {
                  avatar: firebaseUser.photoURL,
                  coverPhoto: undefined,
                }),
              ]);
            }

            // Register for push notifications (run in background, don't block loading)
            registerForPushNotificationsAsync(firebaseUser.uid).catch(error => {
              console.error('Error registering for push notifications:', error);
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
      // Unregister push notifications before signing out
      if (user?.id) {
        await unregisterPushNotifications(user.id).catch(error => {
          console.error('Error unregistering push notifications:', error);
        });
      }

      await authSignOut();
      setUser(null);
      setPreloadedPosts(null);
      setPreloadedSearchHistory(null);
      setPreloadedProfilePosts(null);
      setPreloadedRiotStats(null);
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
    }
  };

  const clearPreloadedPosts = () => {
    setPreloadedPosts(null);
  };

  const clearPreloadedSearchHistory = () => {
    setPreloadedSearchHistory(null);
  };

  const clearPreloadedProfileData = () => {
    setPreloadedProfilePosts(null);
    setPreloadedRiotStats(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        preloadedPosts,
        preloadedSearchHistory,
        preloadedProfilePosts,
        preloadedRiotStats,
        setUser,
        refreshUser,
        signOut: handleSignOut,
        isAuthenticated: !!user,
        needsUsernameSetup: !!user?.needsUsernameSetup,
        clearPreloadedPosts,
        clearPreloadedSearchHistory,
        clearPreloadedProfileData,
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
