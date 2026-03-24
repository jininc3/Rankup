import { db } from '@/config/firebase';
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

export interface DuoQueueEntry {
  userId: string;
  game: 'valorant' | 'league';
  status: 'searching' | 'matched' | 'expired';
  matchedWith: string | null;
  matchId: string | null;
  createdAt: any;
  username: string;
  avatar?: string;
  inGameIcon?: string;
  inGameName?: string;
  currentRank?: string;
  mainRole?: string;
  mainAgent?: string;
}

export interface DuoMatchCardData {
  userId: string;
  username: string;
  avatar?: string | null;
  inGameIcon?: string | null;
  inGameName?: string | null;
  currentRank?: string | null;
  mainRole?: string | null;
  mainAgent?: string | null;
}

export interface DuoMatch {
  game: 'valorant' | 'league';
  user1Id: string;
  user2Id: string;
  user1Card: DuoMatchCardData;
  user2Card: DuoMatchCardData;
  status: 'active' | 'dismissed';
  createdAt: any;
}

/**
 * Join the duo matching queue
 */
export const joinDuoQueue = async (
  userId: string,
  game: 'valorant' | 'league',
  cardData: {
    username: string;
    avatar?: string;
    inGameIcon?: string;
    inGameName?: string;
    currentRank?: string;
    mainRole?: string;
    mainAgent?: string;
  }
): Promise<void> => {
  const queueDocRef = doc(db, 'duoQueue', `${userId}_${game}`);
  await setDoc(queueDocRef, {
    userId,
    game,
    status: 'searching',
    matchedWith: null,
    matchId: null,
    createdAt: serverTimestamp(),
    username: cardData.username,
    avatar: cardData.avatar || null,
    inGameIcon: cardData.inGameIcon || null,
    inGameName: cardData.inGameName || null,
    currentRank: cardData.currentRank || null,
    mainRole: cardData.mainRole || null,
    mainAgent: cardData.mainAgent || null,
  });
};

/**
 * Leave the duo matching queue
 */
export const leaveDuoQueue = async (
  userId: string,
  game: 'valorant' | 'league'
): Promise<void> => {
  const queueDocRef = doc(db, 'duoQueue', `${userId}_${game}`);
  try {
    await deleteDoc(queueDocRef);
  } catch (error) {
    console.error('Error leaving duo queue:', error);
  }
};

/**
 * Subscribe to duo queue status changes (searching -> matched)
 */
export const subscribeToDuoQueue = (
  userId: string,
  game: 'valorant' | 'league',
  callback: (data: DuoQueueEntry | null) => void
): (() => void) => {
  const queueDocRef = doc(db, 'duoQueue', `${userId}_${game}`);
  return onSnapshot(queueDocRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as DuoQueueEntry);
    } else {
      callback(null);
    }
  });
};

/**
 * Get a duo match by ID
 */
export const getDuoMatch = async (matchId: string): Promise<DuoMatch | null> => {
  const matchDocRef = doc(db, 'duoMatches', matchId);
  const matchDoc = await getDoc(matchDocRef);
  if (matchDoc.exists()) {
    return matchDoc.data() as DuoMatch;
  }
  return null;
};
