import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface RankHistoryEntry {
  value: number;
  rank: string;
  timestamp: Date;
}

/**
 * Fetch rank history for a user and game (last 14 entries = 2 weeks)
 */
export const getRankHistory = async (
  userId: string,
  game: 'league' | 'valorant',
  maxEntries: number = 14
): Promise<RankHistoryEntry[]> => {
  try {
    const rankHistoryRef = collection(db, 'users', userId, 'rankHistory');
    const q = query(
      rankHistoryRef,
      where('game', '==', game),
      orderBy('timestamp', 'desc'),
      limit(maxEntries)
    );

    const snapshot = await getDocs(q);
    const entries: RankHistoryEntry[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        value: data.value,
        rank: data.rank,
        timestamp: data.timestamp?.toDate() || new Date(),
      };
    });

    // Reverse so oldest is first (for left-to-right chart rendering)
    return entries.reverse();
  } catch (error) {
    console.log('Error fetching rank history:', error);
    return [];
  }
};

/**
 * Fetch rank history for a user starting from a specific date
 */
export const getRankHistorySince = async (
  userId: string,
  game: 'league' | 'valorant',
  since: Date
): Promise<RankHistoryEntry[]> => {
  try {
    const rankHistoryRef = collection(db, 'users', userId, 'rankHistory');
    const q = query(
      rankHistoryRef,
      where('game', '==', game),
      where('timestamp', '>=', Timestamp.fromDate(since)),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        value: data.value,
        rank: data.rank,
        timestamp: data.timestamp?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.log('Error fetching rank history since date:', error);
    return [];
  }
};
