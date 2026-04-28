import DuoSearchingAnimation from '@/app/components/duoSearchingAnimation';
import DuoMatchResult from '@/app/components/duoMatchResult';
import DuoAcceptScreen from '@/app/components/duoAcceptScreen';
import DuoCardDetailModal from '@/app/components/duoCardProfile';
import LiveSearchIdle from '@/app/components/liveSearchIdle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View, ScrollView, AppState } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useRouter } from '@/hooks/useRouter';
import { joinDuoQueue, leaveDuoQueue, subscribeToDuoQueue, getDuoMatch, acceptMatch, declineMatch, subscribeToMatch, DuoMatchCardData, DuoMatch } from '@/services/duoMatchService';
import { DuoCardData } from '@/app/(tabs)/duoFinder';

export default function LiveSearchScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [valorantCard, setValorantCard] = useState<DuoCardData | null>(null);
  const [leagueCard, setLeagueCard] = useState<DuoCardData | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showDuoProfile, setShowDuoProfile] = useState(false);

  // In-game info
  const [valorantInGameIcon, setValorantInGameIcon] = useState<string | undefined>(undefined);
  const [valorantInGameName, setValorantInGameName] = useState<string | undefined>(undefined);
  const [leagueInGameIcon, setLeagueInGameIcon] = useState<string | undefined>(undefined);
  const [leagueInGameName, setLeagueInGameName] = useState<string | undefined>(undefined);

  // Live search state
  const [matchState, setMatchState] = useState<'idle' | 'searching' | 'accepting' | 'matched'>('idle');
  const [searchGame, setSearchGame] = useState<'valorant' | 'league' | null>(null);
  const [searchGamePick, setSearchGamePick] = useState<'valorant' | 'league' | null>(null);
  const [searchModePick, setSearchModePick] = useState<'lfg' | 'duo' | null>(null);
  const [searchMode, setSearchMode] = useState<'lfg' | 'duo' | null>(null);
  const [matchedUserCard, setMatchedUserCard] = useState<DuoMatchCardData | null>(null);
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [matchExpiresAt, setMatchExpiresAt] = useState<Date | null>(null);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [otherAccepted, setOtherAccepted] = useState(false);
  const unsubscribeQueueRef = useRef<(() => void) | null>(null);
  const unsubscribeMatchRef = useRef<(() => void) | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track card data for re-queue after other user declines
  const lastCardDataRef = useRef<{ username: string; avatar?: string; inGameIcon?: string; inGameName?: string; currentRank?: string; mainRole?: string; mainAgent?: string } | null>(null);

  const hasCards = valorantCard !== null || leagueCard !== null;

  // Load duo cards
  useEffect(() => {
    const loadCards = async () => {
      if (!user?.id) return;

      try {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          if (userData.valorantStats?.card?.small) {
            setValorantInGameIcon(userData.valorantStats.card.small);
          }
          if (userData.valorantStats?.gameName) {
            const tagLine = userData.valorantAccount?.tag || userData.valorantAccount?.tagLine || '';
            setValorantInGameName(tagLine ? `${userData.valorantStats.gameName}#${tagLine}` : userData.valorantStats.gameName);
          }
          if (userData.riotStats?.profileIconId) {
            setLeagueInGameIcon(`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${userData.riotStats.profileIconId}.png`);
          }
          if (userData.riotAccount?.gameName) {
            setLeagueInGameName(`${userData.riotAccount.gameName}#${userData.riotAccount.tagLine || ''}`);
          }
        }

        // Load Valorant card
        const valorantCardRef = doc(db, 'duoCards', `${user.id}_valorant`);
        const valorantCardDoc = await getDoc(valorantCardRef);
        if (valorantCardDoc.exists()) {
          setValorantCard(valorantCardDoc.data() as DuoCardData);
        }

        // Load League card
        const leagueCardRef = doc(db, 'duoCards', `${user.id}_league`);
        const leagueCardDoc = await getDoc(leagueCardRef);
        if (leagueCardDoc.exists()) {
          setLeagueCard(leagueCardDoc.data() as DuoCardData);
        }
      } catch (error) {
        console.error('Error loading duo cards:', error);
      }
    };

    loadCards();
  }, [user?.id]);

  const cleanupSearch = useCallback(() => {
    if (unsubscribeQueueRef.current) {
      unsubscribeQueueRef.current();
      unsubscribeQueueRef.current = null;
    }
    if (unsubscribeMatchRef.current) {
      unsubscribeMatchRef.current();
      unsubscribeMatchRef.current = null;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, []);

  const startLiveSearch = async (game: 'valorant' | 'league', mode: 'lfg' | 'duo' = 'duo') => {
    if (!user?.id) return;

    const cardData = game === 'valorant' ? valorantCard : leagueCard;
    if (!cardData) return;

    setSearchGame(game);
    setSearchMode(mode);
    setMatchState('searching');
    setMatchedUserCard(null);
    setMatchedUserId(null);
    setCurrentMatchId(null);
    setHasAccepted(false);
    setOtherAccepted(false);

    const inGameIcon = game === 'valorant' ? valorantInGameIcon : leagueInGameIcon;
    const inGameName = game === 'valorant' ? valorantInGameName : leagueInGameName;

    const queueCardData = {
      username: cardData.username,
      avatar: user.avatar || undefined,
      inGameIcon,
      inGameName,
      currentRank: cardData.currentRank,
      mainRole: cardData.mainRole,
      mainAgent: cardData.mainAgent,
    };
    lastCardDataRef.current = queueCardData;

    try {
      await joinDuoQueue(user.id, game, mode, queueCardData);

      const unsubscribe = subscribeToDuoQueue(user.id, game, async (data) => {
        if (data?.status === 'matched' && data.matchId) {
          // Stop the search timeout
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
          }
          if (unsubscribeQueueRef.current) {
            unsubscribeQueueRef.current();
            unsubscribeQueueRef.current = null;
          }

          const match = await getDuoMatch(data.matchId);
          if (match) {
            const otherCard = match.user1Id === user.id ? match.user2Card : match.user1Card;
            setMatchedUserCard(otherCard);
            setMatchedUserId(match.user1Id === user.id ? match.user2Id : match.user1Id);
            setCurrentMatchId(data.matchId);
            setMatchExpiresAt(match.expiresAt?.toDate ? match.expiresAt.toDate() : new Date(Date.now() + 60000));
            setHasAccepted(false);
            setOtherAccepted(false);
            setMatchState('accepting');

            // Subscribe to match document for accept/decline updates
            const matchUnsub = subscribeToMatch(data.matchId, (updatedMatch) => {
              if (!updatedMatch) return;

              const isUser1 = updatedMatch.user1Id === user.id;
              const myAccepted = isUser1 ? updatedMatch.user1Accepted : updatedMatch.user2Accepted;
              const theirAccepted = isUser1 ? updatedMatch.user2Accepted : updatedMatch.user1Accepted;

              setHasAccepted(myAccepted === true);
              setOtherAccepted(theirAccepted === true);

              if (updatedMatch.status === 'active') {
                // Both accepted!
                if (unsubscribeMatchRef.current) {
                  unsubscribeMatchRef.current();
                  unsubscribeMatchRef.current = null;
                }
                setMatchState('matched');
              } else if (updatedMatch.status === 'declined' || updatedMatch.status === 'expired') {
                if (unsubscribeMatchRef.current) {
                  unsubscribeMatchRef.current();
                  unsubscribeMatchRef.current = null;
                }

                // If the OTHER user declined/expired and I had accepted, I get re-queued by Cloud Function
                // The queue listener will pick up the new searching status
                if (theirAccepted === 'declined' && myAccepted !== 'declined') {
                  // Re-queued by Cloud Function — go back to searching
                  setMatchState('searching');
                  setMatchedUserCard(null);
                  setCurrentMatchId(null);

                  // Re-subscribe to queue for new matches
                  const requeueUnsub = subscribeToDuoQueue(user.id!, game, async (requeueData) => {
                    if (requeueData?.status === 'matched' && requeueData.matchId) {
                      if (unsubscribeQueueRef.current) {
                        unsubscribeQueueRef.current();
                        unsubscribeQueueRef.current = null;
                      }
                      if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current);
                        searchTimeoutRef.current = null;
                      }
                      const newMatch = await getDuoMatch(requeueData.matchId);
                      if (newMatch) {
                        const newOtherCard = newMatch.user1Id === user.id ? newMatch.user2Card : newMatch.user1Card;
                        setMatchedUserCard(newOtherCard);
                        setMatchedUserId(newMatch.user1Id === user.id ? newMatch.user2Id : newMatch.user1Id);
                        setCurrentMatchId(requeueData.matchId);
                        setMatchExpiresAt(newMatch.expiresAt?.toDate ? newMatch.expiresAt.toDate() : new Date(Date.now() + 60000));
                        setHasAccepted(false);
                        setOtherAccepted(false);
                        setMatchState('accepting');

                        // Subscribe to the new match for accept/decline updates
                        const newMatchUnsub = subscribeToMatch(requeueData.matchId, (updatedNewMatch) => {
                          if (!updatedNewMatch) return;

                          const isUser1 = updatedNewMatch.user1Id === user.id;
                          const myAcc = isUser1 ? updatedNewMatch.user1Accepted : updatedNewMatch.user2Accepted;
                          const theirAcc = isUser1 ? updatedNewMatch.user2Accepted : updatedNewMatch.user1Accepted;

                          setHasAccepted(myAcc === true);
                          setOtherAccepted(theirAcc === true);

                          if (updatedNewMatch.status === 'active') {
                            if (unsubscribeMatchRef.current) {
                              unsubscribeMatchRef.current();
                              unsubscribeMatchRef.current = null;
                            }
                            setMatchState('matched');
                          } else if (updatedNewMatch.status === 'declined' || updatedNewMatch.status === 'expired') {
                            if (unsubscribeMatchRef.current) {
                              unsubscribeMatchRef.current();
                              unsubscribeMatchRef.current = null;
                            }
                            // Other user declined again — go to idle
                            setMatchState('idle');
                            setSearchGame(null);
                            setSearchMode(null);
                            setMatchedUserCard(null);
                            setCurrentMatchId(null);
                          }
                        });
                        unsubscribeMatchRef.current = newMatchUnsub;
                      }
                    }
                  });
                  unsubscribeQueueRef.current = requeueUnsub;

                  // Set new timeout for re-queue
                  searchTimeoutRef.current = setTimeout(() => {
                    cancelSearch();
                    Alert.alert('No Players Found', 'No one is searching right now. Try again later!');
                  }, 30000);
                } else {
                  // I declined or timed out — go to idle
                  setMatchState('idle');
                  setSearchGame(null);
                  setSearchMode(null);
                  setMatchedUserCard(null);
                  setCurrentMatchId(null);
                }
              }
            });
            unsubscribeMatchRef.current = matchUnsub;
          }
        }
      });
      unsubscribeQueueRef.current = unsubscribe;

      searchTimeoutRef.current = setTimeout(() => {
        cancelSearch();
        Alert.alert('No Players Found', 'No one is searching right now. Try again later!');
      }, 30000);
    } catch (error) {
      console.error('Error starting live search:', error);
      setMatchState('idle');
      setSearchGame(null);
      setSearchMode(null);
      Alert.alert('Error', 'Failed to start searching. Please try again.');
    }
  };

  const cancelSearch = useCallback(() => {
    cleanupSearch();
    if (user?.id && searchGame) {
      leaveDuoQueue(user.id, searchGame);
    }
    setMatchState('idle');
    setSearchGame(null);
    setSearchMode(null);
  }, [user?.id, searchGame, cleanupSearch]);

  const handleAccept = async () => {
    if (!currentMatchId || !user?.id) return;
    setHasAccepted(true);
    try {
      await acceptMatch(currentMatchId, user.id);
    } catch (error) {
      console.error('Error accepting match:', error);
    }
  };

  const handleDecline = async () => {
    if (!currentMatchId || !user?.id) return;
    try {
      await declineMatch(currentMatchId, user.id);
    } catch (error) {
      console.error('Error declining match:', error);
    }
    // Cloud Function re-queues the other user; reset local state to idle
    cleanupSearch();
    setMatchState('idle');
    setSearchGame(null);
    setSearchMode(null);
    setMatchedUserCard(null);
    setMatchedUserId(null);
    setCurrentMatchId(null);
  };

  const handleAcceptTimeout = async () => {
    // Timer expired — treat as decline and reset to idle
    if (!currentMatchId || !user?.id) return;
    try {
      await declineMatch(currentMatchId, user.id);
    } catch (error) {
      console.error('Error on timeout decline:', error);
    }
    cleanupSearch();
    setMatchState('idle');
    setSearchGame(null);
    setSearchMode(null);
    setMatchedUserCard(null);
    setMatchedUserId(null);
    setCurrentMatchId(null);
    Alert.alert('Match Expired', 'The match timed out. Try searching again!');
  };

  const handleSearchAgain = () => {
    if (searchGame && searchMode) {
      setMatchState('idle');
      setMatchedUserCard(null);
      setMatchedUserId(null);
      setCurrentMatchId(null);
      setTimeout(() => startLiveSearch(searchGame, searchMode), 300);
    }
  };

  const handleMatchViewProfile = () => {
    if (!matchedUserCard) return;
    setShowDuoProfile(true);
  };

  const handleSendUsername = () => {
    if (!user?.id || !matchedUserCard || !searchGame) return;

    const myInGameName = searchGame === 'valorant' ? valorantInGameName : leagueInGameName;
    const gameLabel = searchGame === 'valorant' ? 'Valorant' : 'League';
    const autoMessage = myInGameName ? `My ${gameLabel} username: ${myInGameName}` : '';

    router.push({
      pathname: '/chatPages/chatScreen',
      params: {
        otherUserId: matchedUserCard.userId,
        otherUsername: matchedUserCard.username,
        otherUserAvatar: matchedUserCard.avatar || '',
        autoMessage,
      },
    });
  };

  // Auto-decline when accept timer expires
  useEffect(() => {
    if (matchState !== 'accepting' || !matchExpiresAt || hasAccepted) return;

    const checkExpiry = setInterval(() => {
      if (new Date() >= matchExpiresAt) {
        clearInterval(checkExpiry);
        handleAcceptTimeout();
      }
    }, 500);

    return () => clearInterval(checkExpiry);
  }, [matchState, matchExpiresAt, hasAccepted]);

  // Cleanup on unmount or app background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active' && matchState === 'searching') {
        cancelSearch();
      }
    });

    return () => {
      subscription.remove();
      cleanupSearch();
      if (user?.id && searchGame && matchState === 'searching') {
        leaveDuoQueue(user.id, searchGame);
      }
    };
  }, [matchState, searchGame, user?.id]);

  const handleAddCardSave = async (data: DuoCardData) => {
    if (!user?.id) return;
    try {
      const { setDoc } = await import('firebase/firestore');
      const duoCardRef = doc(db, 'duoCards', `${user.id}_${data.game}`);
      await setDoc(duoCardRef, { ...data, userId: user.id, updatedAt: new Date() });
      if (data.game === 'valorant') setValorantCard(data);
      else setLeagueCard(data);
      setShowAddCard(false);
    } catch (error) {
      console.error('Error saving duo card:', error);
      Alert.alert('Error', 'Failed to save duo card');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Live Search</ThemedText>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {matchState === 'searching' && searchGame ? (
          <DuoSearchingAnimation game={searchGame} onCancel={cancelSearch} />
        ) : matchState === 'accepting' && matchedUserCard && searchGame && matchExpiresAt ? (
          <DuoAcceptScreen
            matchedUser={matchedUserCard}
            game={searchGame}
            expiresAt={matchExpiresAt}
            hasAccepted={hasAccepted}
            otherAccepted={otherAccepted}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onViewProfile={() => setShowDuoProfile(true)}
          />
        ) : matchState === 'matched' && matchedUserCard && searchGame ? (
          <DuoMatchResult
            game={searchGame}
            matchedUser={matchedUserCard}
            myInGameName={searchGame === 'valorant' ? valorantInGameName : leagueInGameName}
            onSendUsername={handleSendUsername}
            onViewProfile={handleMatchViewProfile}
            onSearchAgain={handleSearchAgain}
          />
        ) : (
          <LiveSearchIdle
            hasCards={hasCards}
            valorantCard={valorantCard}
            leagueCard={leagueCard}
            searchModePick={searchModePick}
            onPickMode={(mode) => setSearchModePick(mode)}
            searchGamePick={searchGamePick}
            onPickGame={(game) => setSearchGamePick(game)}
            onSearch={() => searchGamePick && searchModePick && startLiveSearch(searchGamePick, searchModePick)}
            onCreateCard={() => setShowAddCard(true)}
          />
        )}
      </ScrollView>

      <DuoCardDetailModal
        visible={showDuoProfile}
        onClose={() => setShowDuoProfile(false)}
        expiresAt={matchState === 'accepting' && matchExpiresAt ? matchExpiresAt : undefined}
        card={matchedUserCard && searchGame ? {
          game: searchGame,
          username: matchedUserCard.username,
          avatar: matchedUserCard.avatar || undefined,
          inGameIcon: matchedUserCard.inGameIcon || undefined,
          inGameName: matchedUserCard.inGameName || undefined,
          currentRank: matchedUserCard.currentRank || 'Unranked',
          peakRank: '',
          mainRole: matchedUserCard.mainRole || '',
          mainAgent: matchedUserCard.mainAgent || undefined,
          userId: matchedUserCard.userId,
        } : null}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
