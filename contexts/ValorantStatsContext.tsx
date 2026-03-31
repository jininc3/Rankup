import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  getValorantStats as fetchValorantStatsFromService,
  clearValorantStatsCache,
  type ValorantStats,
} from '@/services/valorantService';

interface ValorantStatsContextType {
  valorantStats: ValorantStats | null;
  isLoading: boolean;
  error: string | null;
  fetchStats: (forceRefresh?: boolean) => Promise<void>;
  clearStats: () => void;
}

const ValorantStatsContext = createContext<ValorantStatsContextType>({
  valorantStats: null,
  isLoading: false,
  error: null,
  fetchStats: async () => {},
  clearStats: () => {},
});

export const useValorantStats = () => useContext(ValorantStatsContext);

export function ValorantStatsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [valorantStats, setValorantStats] = useState<ValorantStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Clear all caches and reset state when user changes (logout or account switch)
  useEffect(() => {
    // Always clear the service-level module cache on user change
    // so the new user doesn't see stale data from the previous account
    clearValorantStatsCache();
    setValorantStats(null);
    setError(null);
    setInitialized(false);

    if (!user?.id) {
      return;
    }

    const loadInitialData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (!userDoc.exists()) return;

        const data = userDoc.data();

        // Only proceed if the user has a Valorant account linked
        if (!data.valorantAccount) return;

        // Load cached stats for instant display
        if (data.valorantStats) {
          setValorantStats(data.valorantStats);
        }

        setInitialized(true);

        // Fetch fresh stats (leverages 30-min client cache + 3h server cache)
        try {
          const response = await fetchValorantStatsFromService();
          if (response.success && response.stats) {
            setValorantStats(response.stats);
          }
        } catch (fetchError: any) {
          console.error('ValorantStatsContext: Error fetching fresh stats:', fetchError);
          // Keep cached data on error — don't clear what we already have
        }
      } catch (err) {
        console.error('ValorantStatsContext: Error loading initial data:', err);
      }
    };

    loadInitialData();
  }, [user?.id]);

  const fetchStats = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchValorantStatsFromService(forceRefresh);
      if (response.success && response.stats) {
        setValorantStats(response.stats);
      }
    } catch (err: any) {
      console.error('ValorantStatsContext: Error fetching stats:', err);
      setError(err.message || 'Failed to fetch Valorant stats');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const clearStats = useCallback(() => {
    clearValorantStatsCache();
    setValorantStats(null);
    setError(null);
    setInitialized(false);
  }, []);

  return (
    <ValorantStatsContext.Provider
      value={{
        valorantStats,
        isLoading,
        error,
        fetchStats,
        clearStats,
      }}
    >
      {children}
    </ValorantStatsContext.Provider>
  );
}
