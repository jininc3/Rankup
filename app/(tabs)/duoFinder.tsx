import CompactDuoCard from '@/app/components/compactDuoCard';
import AddDuoCard, { DuoCardData } from '@/app/components/addDuoCard';
import EditDuoCard from '@/app/components/editDuoCard';
import DuoFilterModal, { DuoFilterOptions } from '@/app/profilePages/duoFilterModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DuoCardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, RefreshControl, Dimensions, Image } from 'react-native';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useRouter } from 'expo-router';

interface DuoCardWithId extends DuoCardData {
  id: string;
  userId: string;
  updatedAt?: any;
  avatar?: string;
  inGameIcon?: string;
  inGameName?: string;
  winRate?: number;
  gamesPlayed?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DuoFinderScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const pagerRef = useRef<ScrollView>(null);
  const [selectedTab, setSelectedTab] = useState<'findDuo' | 'myCards'>('findDuo');
  const [showAddCard, setShowAddCard] = useState(false);
  const [valorantCard, setValorantCard] = useState<DuoCardData | null>(null);
  const [leagueCard, setLeagueCard] = useState<DuoCardData | null>(null);
  const [hasValorantAccount, setHasValorantAccount] = useState(false);
  const [hasLeagueAccount, setHasLeagueAccount] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Find Duo state
  const [duoCards, setDuoCards] = useState<DuoCardWithId[]>([]);
  const [loadingDuoCards, setLoadingDuoCards] = useState(false);

  // Filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<DuoFilterOptions>({
    game: null,
    role: null,
    minRank: null,
    maxRank: null,
    language: null,
  });

  // Game filter state (both selected by default to show all)
  const [selectedGames, setSelectedGames] = useState<{ valorant: boolean; league: boolean }>({
    valorant: true,
    league: true,
  });

  // Toggle game selection
  const toggleGameFilter = (game: 'valorant' | 'league') => {
    setSelectedGames(prev => ({
      ...prev,
      [game]: !prev[game],
    }));
  };

  // Handle tab press - scroll to page
  const handleTabPress = (tab: 'findDuo' | 'myCards') => {
    setSelectedTab(tab);
    const pageIndex = tab === 'findDuo' ? 0 : 1;
    pagerRef.current?.scrollTo({ x: pageIndex * SCREEN_WIDTH, animated: true });
  };

  // Handle swipe - update selected tab in real-time
  const handlePageScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const progress = offsetX / SCREEN_WIDTH;
    const newTab = progress >= 0.5 ? 'myCards' : 'findDuo';
    if (newTab !== selectedTab) {
      setSelectedTab(newTab);
    }
  };

  // Count active filters
  const activeFilterCount = [
    filters.game,
    filters.role,
    filters.minRank,
    filters.maxRank,
    filters.language,
  ].filter(Boolean).length;

  // Avatar loading coordination
  const [avatarsLoadedCount, setAvatarsLoadedCount] = useState(0);
  const [allAvatarsLoaded, setAllAvatarsLoaded] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGame, setEditingGame] = useState<'valorant' | 'league' | null>(null);

  // User's in-game icons, names, and stats for their own cards
  const [valorantInGameIcon, setValorantInGameIcon] = useState<string | undefined>(undefined);
  const [valorantInGameName, setValorantInGameName] = useState<string | undefined>(undefined);
  const [valorantWinRate, setValorantWinRate] = useState<number | undefined>(undefined);
  const [valorantGamesPlayed, setValorantGamesPlayed] = useState<number | undefined>(undefined);
  const [leagueInGameIcon, setLeagueInGameIcon] = useState<string | undefined>(undefined);
  const [leagueInGameName, setLeagueInGameName] = useState<string | undefined>(undefined);
  const [leagueWinRate, setLeagueWinRate] = useState<number | undefined>(undefined);
  const [leagueGamesPlayed, setLeagueGamesPlayed] = useState<number | undefined>(undefined);

  // Function to sync duo cards with rank stats
  const syncDuoCardsWithStats = async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    }
    if (!user?.id) return;

    try {
      // Get user's current stats from their profile
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Extract in-game icons, names, and stats from user stats
        if (userData.valorantStats?.card?.small) {
          setValorantInGameIcon(userData.valorantStats.card.small);
        }
        if (userData.valorantStats?.gameName) {
          setValorantInGameName(userData.valorantStats.gameName);
        }
        if (userData.valorantStats?.winRate !== undefined) {
          setValorantWinRate(userData.valorantStats.winRate);
        }
        if (userData.valorantStats?.gamesPlayed !== undefined) {
          setValorantGamesPlayed(userData.valorantStats.gamesPlayed);
        }
        // League stores profileIconId, need to construct URL
        if (userData.riotStats?.profileIconId) {
          setLeagueInGameIcon(`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${userData.riotStats.profileIconId}.png`);
        }
        if (userData.riotAccount?.gameName) {
          const tagLine = userData.riotAccount.tagLine || '';
          setLeagueInGameName(`${userData.riotAccount.gameName}#${tagLine}`);
        }
        // League ranked stats
        if (userData.riotStats?.rankedSolo) {
          const rankedSolo = userData.riotStats.rankedSolo;
          if (rankedSolo.winRate !== undefined) {
            setLeagueWinRate(rankedSolo.winRate);
          }
          const wins = rankedSolo.wins || 0;
          const losses = rankedSolo.losses || 0;
          if (wins > 0 || losses > 0) {
            setLeagueGamesPlayed(wins + losses);
          }
        }

        // Load and sync Valorant card
        const valorantCardRef = doc(db, 'duoCards', `${user.id}_valorant`);
        const valorantCardDoc = await getDoc(valorantCardRef);
        if (valorantCardDoc.exists()) {
          const cardData = valorantCardDoc.data();

          // Check if we have newer stats from user profile (updated within last 6 hours)
          const valorantStats = userData.valorantStats;
          if (valorantStats?.lastUpdated) {
            const statsUpdatedAt = valorantStats.lastUpdated.toDate().getTime();
            const cardUpdatedAt = cardData.updatedAt?.toDate()?.getTime() || 0;

            // If stats are newer than card, update the card
            if (statsUpdatedAt > cardUpdatedAt) {
              console.log('Syncing Valorant duo card with updated stats...');

              // Get peak rank from valorantStats (it's an object with tier and season)
              const peakRankTier = valorantStats.peakRank?.tier || cardData.peakRank || valorantStats.currentRank;

              const updatedCardData = {
                ...cardData,
                currentRank: valorantStats.currentRank || cardData.currentRank,
                peakRank: peakRankTier,
                updatedAt: serverTimestamp(),
              };

              await setDoc(valorantCardRef, updatedCardData);

              setValorantCard({
                game: 'valorant',
                username: updatedCardData.username,
                currentRank: updatedCardData.currentRank,
                region: updatedCardData.region,
                mainRole: updatedCardData.mainRole,
                peakRank: updatedCardData.peakRank,
                mainAgent: updatedCardData.mainAgent,
                lookingFor: updatedCardData.lookingFor || 'Any',
              });
            } else {
              // Use existing card data
              setValorantCard({
                game: 'valorant',
                username: cardData.username,
                currentRank: cardData.currentRank,
                region: cardData.region,
                mainRole: cardData.mainRole,
                peakRank: cardData.peakRank,
                mainAgent: cardData.mainAgent,
                lookingFor: cardData.lookingFor || 'Any',
              });
            }
          } else {
            // No stats available, just use card data
            setValorantCard({
              game: 'valorant',
              username: cardData.username,
              currentRank: cardData.currentRank,
              region: cardData.region,
              mainRole: cardData.mainRole,
              peakRank: cardData.peakRank,
              mainAgent: cardData.mainAgent,
              lookingFor: cardData.lookingFor || 'Any',
            });
          }
        }

        // Load and sync League card
        const leagueCardRef = doc(db, 'duoCards', `${user.id}_league`);
        const leagueCardDoc = await getDoc(leagueCardRef);
        if (leagueCardDoc.exists()) {
          const cardData = leagueCardDoc.data();

          // Check if we have newer stats from user profile
          const riotStats = userData.riotStats;
          if (riotStats?.lastUpdated) {
            const statsUpdatedAt = riotStats.lastUpdated.toDate().getTime();
            const cardUpdatedAt = cardData.updatedAt?.toDate()?.getTime() || 0;

            // If stats are newer than card, update the card
            if (statsUpdatedAt > cardUpdatedAt) {
              console.log('Syncing League duo card with updated stats...');

              // Format current rank from riot stats
              let currentRank = 'Unranked';
              if (riotStats.rankedSolo) {
                const tier = riotStats.rankedSolo.tier || 'UNRANKED';
                const rank = riotStats.rankedSolo.rank || '';
                currentRank = tier === 'UNRANKED' ? 'Unranked' : `${tier.charAt(0) + tier.slice(1).toLowerCase()} ${rank}`;
              }

              const updatedCardData = {
                ...cardData,
                currentRank: currentRank,
                peakRank: currentRank,
                updatedAt: serverTimestamp(),
              };

              await setDoc(leagueCardRef, updatedCardData);

              setLeagueCard({
                game: 'league',
                username: updatedCardData.username,
                currentRank: updatedCardData.currentRank,
                region: updatedCardData.region,
                mainRole: updatedCardData.mainRole,
                peakRank: updatedCardData.peakRank,
                mainAgent: updatedCardData.mainAgent,
                lookingFor: updatedCardData.lookingFor || 'Any',
              });
            } else {
              // Use existing card data
              setLeagueCard({
                game: 'league',
                username: cardData.username,
                currentRank: cardData.currentRank,
                region: cardData.region,
                mainRole: cardData.mainRole,
                peakRank: cardData.peakRank,
                mainAgent: cardData.mainAgent,
                lookingFor: cardData.lookingFor || 'Any',
              });
            }
          } else {
            // No stats available, just use card data
            setLeagueCard({
              game: 'league',
              username: cardData.username,
              currentRank: cardData.currentRank,
              region: cardData.region,
              mainRole: cardData.mainRole,
              peakRank: cardData.peakRank,
              mainAgent: cardData.mainAgent,
              lookingFor: cardData.lookingFor || 'Any',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error syncing duo cards:', error);
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  };

  const handleSaveCard = async (data: DuoCardData) => {
    if (!user?.id) return;

    try {
      // Save to Firebase duoCards collection
      const duoCardRef = doc(db, 'duoCards', `${user.id}_${data.game}`);
      await setDoc(duoCardRef, {
        userId: user.id,
        game: data.game,
        username: data.username,
        currentRank: data.currentRank,
        region: data.region,
        mainRole: data.mainRole,
        peakRank: data.peakRank,
        mainAgent: data.mainAgent,
        lookingFor: data.lookingFor || 'Any',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
      });

      // Update local state
      if (data.game === 'valorant') {
        setValorantCard(data);
      } else {
        setLeagueCard(data);
      }

      Alert.alert('Success', 'Your duo card has been saved!');
    } catch (error) {
      console.error('Error saving duo card:', error);
      Alert.alert('Error', 'Failed to save your duo card. Please try again.');
    }
  };


  // Track when all avatars are loaded
  useEffect(() => {
    if (duoCards.length > 0 && avatarsLoadedCount >= duoCards.length) {
      setAllAvatarsLoaded(true);
      setShowCards(true);
    } else if (duoCards.length === 0) {
      setAllAvatarsLoaded(true);
      setShowCards(false);
    }
  }, [avatarsLoadedCount, duoCards.length]);

  // Reset avatar loading when duo cards change
  useEffect(() => {
    setAvatarsLoadedCount(0);
    setAllAvatarsLoaded(false);
    setShowCards(false);
  }, [duoCards]);

  // Timeout fallback - if avatars take too long (3 seconds), reveal anyway
  useEffect(() => {
    if (duoCards.length > 0 && !allAvatarsLoaded) {
      const timeout = setTimeout(() => {
        setAllAvatarsLoaded(true);
        setShowCards(true);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [duoCards.length, allAvatarsLoaded]);

  // Check if user has Valorant or League accounts (RankCards)
  useEffect(() => {
    const checkLinkedAccounts = async () => {
      if (!user?.id) return;

      try {
        // Get user's document to check their linked accounts
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Check if user has riotAccount (League of Legends)
          const hasLeague = !!userData.riotAccount;

          // Check if user has valorantAccount
          const hasValorant = !!userData.valorantAccount;

          setHasValorantAccount(hasValorant);
          setHasLeagueAccount(hasLeague);

          console.log('Linked accounts check:', { hasValorant, hasLeague });
        }
      } catch (error) {
        console.error('Error checking linked accounts:', error);
      }
    };

    checkLinkedAccounts();
  }, [user?.id]);

  // Load duo cards once on mount
  useEffect(() => {
    syncDuoCardsWithStats(false);
  }, [user?.id]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    syncDuoCardsWithStats(true);
  }, [user?.id]);

  // Helper to get rank tier from full rank string
  const getRankTier = (rank: string): string => {
    if (!rank) return '';
    const tier = rank.split(' ')[0];
    return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  };

  // Helper to compare ranks
  const VALORANT_RANK_ORDER = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];
  const LEAGUE_RANK_ORDER = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];

  const isRankInRange = (rank: string, game: 'valorant' | 'league', minRank: string | null, maxRank: string | null): boolean => {
    if (!minRank && !maxRank) return true;

    const tier = getRankTier(rank);
    const rankOrder = game === 'valorant' ? VALORANT_RANK_ORDER : LEAGUE_RANK_ORDER;
    const rankIndex = rankOrder.findIndex(r => r.toLowerCase() === tier.toLowerCase());

    if (rankIndex === -1) return true; // Unknown rank, include it

    const minIndex = minRank ? rankOrder.findIndex(r => r.toLowerCase() === minRank.toLowerCase()) : 0;
    const maxIndex = maxRank ? rankOrder.findIndex(r => r.toLowerCase() === maxRank.toLowerCase()) : rankOrder.length - 1;

    return rankIndex >= minIndex && rankIndex <= maxIndex;
  };

  // Fetch duo cards from Firebase
  const fetchDuoCards = async () => {
    if (!user?.id) return;

    setLoadingDuoCards(true);
    try {
      const duoCardsRef = collection(db, 'duoCards');

      // Determine which games to fetch based on selected game buttons
      const gamesToFetch: ('valorant' | 'league')[] = [];
      if (selectedGames.valorant) gamesToFetch.push('valorant');
      if (selectedGames.league) gamesToFetch.push('league');

      // If no games selected, don't fetch any cards
      if (gamesToFetch.length === 0) {
        setDuoCards([]);
        setLoadingDuoCards(false);
        return;
      }

      let allCards: DuoCardWithId[] = [];

      for (const game of gamesToFetch) {
        // Fetch all active duo cards for this game
        const q = query(
          duoCardsRef,
          where('game', '==', game),
          where('status', '==', 'active'),
          orderBy('updatedAt', 'desc'),
          limit(50) // Fetch more than 5 to account for filtering out own card
        );

        const snapshot = await getDocs(q);
        const cards = await Promise.all(
          snapshot.docs
            .filter(docSnapshot => docSnapshot.data().userId !== user.id) // Exclude own card
            .map(async (docSnapshot) => {
              const cardData = docSnapshot.data();

              // Fetch user's avatar, in-game icon, in-game name, and stats
              let avatar = undefined;
              let inGameIcon = undefined;
              let inGameName = undefined;
              let winRate = undefined;
              let gamesPlayed = undefined;
              try {
                const userDocRef = doc(db, 'users', cardData.userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  avatar = userData?.avatar;
                  // Get in-game icon, name, and stats based on game type
                  if (cardData.game === 'valorant') {
                    if (userData?.valorantStats?.card?.small) {
                      inGameIcon = userData.valorantStats.card.small;
                    }
                    if (userData?.valorantStats?.gameName) {
                      inGameName = userData.valorantStats.gameName;
                    }
                    // Get win rate and games played for Valorant
                    if (userData?.valorantStats?.winRate !== undefined) {
                      winRate = userData.valorantStats.winRate;
                    }
                    if (userData?.valorantStats?.gamesPlayed !== undefined) {
                      gamesPlayed = userData.valorantStats.gamesPlayed;
                    }
                  } else if (cardData.game === 'league') {
                    // League stores profileIconId, need to construct URL
                    if (userData?.riotStats?.profileIconId) {
                      inGameIcon = `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/${userData.riotStats.profileIconId}.png`;
                    }
                    if (userData?.riotAccount?.gameName) {
                      const tagLine = userData.riotAccount.tagLine || '';
                      inGameName = `${userData.riotAccount.gameName}#${tagLine}`;
                    }
                    // Get win rate and games played for League (from rankedSolo)
                    if (userData?.riotStats?.rankedSolo) {
                      const rankedSolo = userData.riotStats.rankedSolo;
                      if (rankedSolo.winRate !== undefined) {
                        winRate = rankedSolo.winRate;
                      }
                      // Calculate games played from wins + losses
                      const wins = rankedSolo.wins || 0;
                      const losses = rankedSolo.losses || 0;
                      if (wins > 0 || losses > 0) {
                        gamesPlayed = wins + losses;
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Error fetching user data for:', cardData.userId, error);
              }

              return {
                id: docSnapshot.id,
                userId: cardData.userId,
                game: cardData.game,
                username: cardData.username,
                currentRank: cardData.currentRank,
                region: cardData.region,
                mainRole: cardData.mainRole,
                peakRank: cardData.peakRank,
                mainAgent: cardData.mainAgent,
                lookingFor: cardData.lookingFor || 'Any',
                updatedAt: cardData.updatedAt,
                avatar: avatar,
                inGameIcon: inGameIcon,
                inGameName: inGameName,
                winRate: winRate,
                gamesPlayed: gamesPlayed,
              };
            })
        ) as DuoCardWithId[];

        // Apply client-side filters
        const filteredCards = cards.filter(card => {
          // Role filter
          if (filters.role && card.mainRole !== filters.role) return false;

          // Rank filter
          if (!isRankInRange(card.currentRank, card.game, filters.minRank, filters.maxRank)) return false;

          return true;
        });

        allCards = [...allCards, ...filteredCards];
      }

      // Limit to 10 cards
      setDuoCards(allCards.slice(0, 10));
    } catch (error) {
      console.error('Error fetching duo cards:', error);
      Alert.alert('Error', 'Failed to load duo cards. Please try again.');
    } finally {
      setLoadingDuoCards(false);
    }
  };

  // Fetch duo cards on mount and when filters or selected games change
  useEffect(() => {
    fetchDuoCards();
  }, [filters, selectedGames]);

  // Manual refresh for duo cards
  const handleRefreshDuoCards = () => {
    fetchDuoCards();
  };

  const hasCards = valorantCard !== null || leagueCard !== null;

  const handleCardPress = (game: 'valorant' | 'league') => {
    // Navigate to detail page with edit capability for own card
    const cardData = game === 'valorant' ? valorantCard : leagueCard;
    if (cardData) {
      const avatarUrl = user?.avatar || '';
      const inGameIcon = game === 'valorant' ? valorantInGameIcon : leagueInGameIcon;
      const inGameName = game === 'valorant' ? valorantInGameName : leagueInGameName;
      const winRate = game === 'valorant' ? valorantWinRate : leagueWinRate;
      const gamesPlayed = game === 'valorant' ? valorantGamesPlayed : leagueGamesPlayed;
      router.push({
        pathname: '/profilePages/duoCardDetail',
        params: {
          game: cardData.game,
          username: cardData.username,
          avatar: avatarUrl,
          inGameIcon: inGameIcon || '',
          inGameName: inGameName || '',
          winRate: winRate !== undefined ? String(winRate) : '',
          gamesPlayed: gamesPlayed !== undefined ? String(gamesPlayed) : '',
          peakRank: cardData.peakRank,
          currentRank: cardData.currentRank,
          region: cardData.region,
          mainRole: cardData.mainRole,
          mainAgent: cardData.mainAgent,
          lookingFor: cardData.lookingFor || 'Any',
          userId: user?.id || '',
          isOwnCard: 'true',
        },
      });
    }
  };

  const handleFindDuoCardPress = (card: DuoCardWithId) => {
    const avatarUrl = card.avatar || '';
    console.log('Navigating with card avatar:', avatarUrl);
    console.log('Full card object:', card);
    router.push({
      pathname: '/profilePages/duoCardDetail',
      params: {
        game: card.game,
        username: card.username,
        avatar: avatarUrl,
        inGameIcon: card.inGameIcon || '',
        inGameName: card.inGameName || '',
        winRate: card.winRate !== undefined ? String(card.winRate) : '',
        gamesPlayed: card.gamesPlayed !== undefined ? String(card.gamesPlayed) : '',
        peakRank: card.peakRank,
        currentRank: card.currentRank,
        region: card.region,
        mainRole: card.mainRole,
        mainAgent: card.mainAgent || '',
        userId: card.userId,
      },
    });
  };

  const handleSaveEdit = async (mainRole: string, mainAgent: string, lookingFor: string) => {
    if (!user?.id || !editingGame) return;

    try {
      // Update in Firebase
      const duoCardRef = doc(db, 'duoCards', `${user.id}_${editingGame}`);
      await setDoc(duoCardRef, {
        mainRole,
        mainAgent,
        lookingFor,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Update local state
      if (editingGame === 'valorant') {
        setValorantCard(prev => prev ? { ...prev, mainRole, mainAgent, lookingFor } : null);
      } else {
        setLeagueCard(prev => prev ? { ...prev, mainRole, mainAgent, lookingFor } : null);
      }

      Alert.alert('Success', 'Your duo card has been updated!');
      setShowEditModal(false);
      setEditingGame(null);
    } catch (error) {
      console.error('Error updating duo card:', error);
      Alert.alert('Error', 'Failed to update your duo card. Please try again.');
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!user?.id || !editingGame) return;

    try {
      // Delete from Firebase
      const duoCardRef = doc(db, 'duoCards', `${user.id}_${editingGame}`);
      await deleteDoc(duoCardRef);

      // Update local state
      if (editingGame === 'valorant') {
        setValorantCard(null);
      } else {
        setLeagueCard(null);
      }

      Alert.alert('Success', 'Your duo card has been deleted.');
      setShowEditModal(false);
      setEditingGame(null);
    } catch (error) {
      console.error('Error deleting duo card:', error);
      Alert.alert('Error', 'Failed to delete your duo card. Please try again.');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingGame(null);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>DUO FINDER</ThemedText>
      </View>

      {/* Tabs - Fixed at top */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress('findDuo')}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.tabText, selectedTab === 'findDuo' && styles.tabTextActive]}>
            FIND DUO
          </ThemedText>
          <ThemedText style={[styles.tabCount, selectedTab === 'findDuo' && styles.tabCountActive]}>
            {duoCards.length}
          </ThemedText>
        </TouchableOpacity>
        <View style={styles.tabDivider} />
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress('myCards')}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.tabText, selectedTab === 'myCards' && styles.tabTextActive]}>
            MY CARDS
          </ThemedText>
          <ThemedText style={[styles.tabCount, selectedTab === 'myCards' && styles.tabCountActive]}>
            {(valorantCard ? 1 : 0) + (leagueCard ? 1 : 0)}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Swipeable Pages */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handlePageScroll}
        scrollEventThrottle={16}
        style={styles.pagerContainer}
      >
        {/* Find Duo Page */}
        <ScrollView
          style={[styles.pageContainer, { width: SCREEN_WIDTH }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pageContent}
        >
          <View style={styles.findDuoContent}>
            {/* Game Filter Buttons */}
            <View style={styles.gameFilterContainer}>
              <TouchableOpacity
                style={[
                  styles.gameFilterButton,
                  selectedGames.league && styles.gameFilterButtonSelected,
                ]}
                onPress={() => toggleGameFilter('league')}
                activeOpacity={0.7}
              >
                <Image
                  source={require('@/assets/images/lol.png')}
                  style={[
                    styles.gameFilterLogo,
                    !selectedGames.league && styles.gameFilterLogoInactive,
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.gameFilterButton,
                  selectedGames.valorant && styles.gameFilterButtonSelected,
                ]}
                onPress={() => toggleGameFilter('valorant')}
                activeOpacity={0.7}
              >
                <Image
                  source={require('@/assets/images/valorant-red.png')}
                  style={[
                    styles.gameFilterLogo,
                    !selectedGames.valorant && styles.gameFilterLogoInactive,
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Find Duo Cards Container */}
            <View style={styles.findDuoContainer}>
              {/* Players Section Header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <ThemedText style={styles.sectionHeaderTitle}>AVAILABLE PLAYERS</ThemedText>
                  <ThemedText style={styles.playerCount}>
                    {duoCards.length}
                  </ThemedText>
                </View>
                <View style={styles.headerRightSection}>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDotOuter}>
                      <View style={styles.statusDot} />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowFilterModal(true)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={16} name="line.3.horizontal.decrease" color={activeFilterCount > 0 ? '#c42743' : '#888'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefreshDuoCards}
                    activeOpacity={0.7}
                    disabled={loadingDuoCards}
                  >
                    <IconSymbol size={14} name="arrow.clockwise" color={loadingDuoCards ? '#444' : '#888'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Content Area */}
              {loadingDuoCards || (duoCards.length > 0 && !showCards) ? (
                <View style={styles.cardsList}>
                  <DuoCardSkeleton />
                  <DuoCardSkeleton />
                </View>
              ) : duoCards.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconsRow}>
                    <View style={styles.emptyIconCircle}>
                      <Image
                        source={require('@/assets/images/valorant-logo.png')}
                        style={styles.emptyGameLogo}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={[styles.emptyIconCircle, styles.emptyIconCircleCenter]}>
                      <IconSymbol size={32} name="person.2.fill" color="#fff" />
                    </View>
                    <View style={styles.emptyIconCircle}>
                      <Image
                        source={require('@/assets/images/leagueoflegends.png')}
                        style={styles.emptyGameLogo}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                  <ThemedText style={styles.emptyTitle}>No players found</ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    {hasCards
                      ? 'No other players are looking for a duo right now. Check back later!'
                      : 'Create your duo card to start matching with other players'}
                  </ThemedText>
                  {!hasCards && (
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={() => {
                        handleTabPress('myCards');
                        setShowAddCard(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <IconSymbol size={18} name="plus" color="#fff" />
                      <ThemedText style={styles.emptyButtonText}>Create Duo Card</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.cardsList}>
                  {duoCards.map((card) => (
                    <CompactDuoCard
                      key={card.id}
                      game={card.game}
                      username={card.username}
                      inGameName={card.inGameName || card.username}
                      inGameIcon={card.inGameIcon}
                      currentRank={card.currentRank}
                      mainRole={card.mainRole}
                      mainAgent={card.mainAgent}
                      onPress={() => handleFindDuoCardPress(card)}
                      onViewProfile={() => handleFindDuoCardPress(card)}
                      onAvatarLoad={() => setAvatarsLoadedCount(prev => prev + 1)}
                      showContent={true}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* My Cards Page */}
        <ScrollView
          style={[styles.pageContainer, { width: SCREEN_WIDTH }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pageContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c42743"
              colors={['#c42743']}
            />
          }
        >
          <View style={styles.myCardContent}>
            <View style={styles.myCardsContainer}>
              {!hasCards ? (
                // No cards - Show add button
                <View style={styles.emptyCardState}>
                  <View style={styles.emptyIconsRow}>
                    <View style={styles.emptyIconCircle}>
                      <Image
                        source={require('@/assets/images/valorant-logo.png')}
                        style={styles.emptyGameLogo}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={[styles.emptyIconCircle, styles.emptyIconCircleCenter]}>
                      <IconSymbol size={36} name="person.crop.rectangle.stack.fill" color="#fff" />
                    </View>
                    <View style={styles.emptyIconCircle}>
                      <Image
                        source={require('@/assets/images/leagueoflegends.png')}
                        style={styles.emptyGameLogo}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                  <ThemedText style={styles.emptyCardTitle}>Create Your Duo Card</ThemedText>
                  <ThemedText style={styles.emptyCardText}>
                    Share your rank and find teammates who match your skill level
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.addCardButton}
                    onPress={() => setShowAddCard(true)}
                  >
                    <IconSymbol size={20} name="plus" color="#fff" />
                    <ThemedText style={styles.addCardButtonText}>Create Duo Card</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                // Has cards - Show them in a row
                <View style={styles.compactCardsContainer}>
                  <ThemedText style={styles.myCardsTitle}>MY DUO CARDS</ThemedText>
                  <View style={styles.myCardsRow}>
                    {/* Valorant Card */}
                    {valorantCard && (
                      <CompactDuoCard
                        game="valorant"
                        username={valorantCard.username}
                        inGameName={valorantInGameName || valorantCard.username}
                        inGameIcon={valorantInGameIcon}
                        currentRank={valorantCard.currentRank}
                        mainRole={valorantCard.mainRole}
                        mainAgent={valorantCard.mainAgent}
                        onPress={() => handleCardPress('valorant')}
                        onViewProfile={() => handleCardPress('valorant')}
                      />
                    )}

                    {/* League Card */}
                    {leagueCard && (
                      <CompactDuoCard
                        game="league"
                        username={leagueCard.username}
                        inGameName={leagueInGameName || leagueCard.username}
                        inGameIcon={leagueInGameIcon}
                        currentRank={leagueCard.currentRank}
                        mainRole={leagueCard.mainRole}
                        mainAgent={leagueCard.mainAgent}
                        onPress={() => handleCardPress('league')}
                        onViewProfile={() => handleCardPress('league')}
                      />
                    )}
                  </View>

                  {/* Add Another Card Button */}
                  {(valorantCard === null || leagueCard === null) && (
                    <TouchableOpacity
                      style={styles.addAnotherButtonCompact}
                      onPress={() => setShowAddCard(true)}
                    >
                      <IconSymbol size={24} name="plus.circle.fill" color="#c42743" />
                      <View style={styles.addAnotherContent}>
                        <ThemedText style={styles.addAnotherButtonText}>
                          {valorantCard ? 'Add League Card' : 'Add Valorant Card'}
                        </ThemedText>
                        <ThemedText style={styles.addAnotherSubtext}>Connect another game</ThemedText>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </ScrollView>

      {/* Add Duo Card Modal */}
      <AddDuoCard
        visible={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSave={handleSaveCard}
        hasValorantAccount={hasValorantAccount}
        hasLeagueAccount={hasLeagueAccount}
        hasValorantDuoCard={valorantCard !== null}
        hasLeagueDuoCard={leagueCard !== null}
      />

      {/* Edit Duo Card Modal */}
      {editingGame && (
        <EditDuoCard
          visible={showEditModal}
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
          onDelete={handleDeleteFromEdit}
          game={editingGame}
          username={editingGame === 'valorant' ? (valorantCard?.username || '') : (leagueCard?.username || '')}
          currentRank={editingGame === 'valorant' ? (valorantCard?.currentRank || 'Unranked') : (leagueCard?.currentRank || 'Unranked')}
          region={editingGame === 'valorant' ? (valorantCard?.region || 'NA') : (leagueCard?.region || 'NA')}
          peakRank={editingGame === 'valorant' ? (valorantCard?.peakRank || 'Unranked') : (leagueCard?.peakRank || 'Unranked')}
          initialMainRole={editingGame === 'valorant' ? (valorantCard?.mainRole || '') : (leagueCard?.mainRole || '')}
          initialMainAgent={editingGame === 'valorant' ? (valorantCard?.mainAgent || '') : (leagueCard?.mainAgent || '')}
          initialLookingFor={editingGame === 'valorant' ? (valorantCard?.lookingFor || 'Any') : (leagueCard?.lookingFor || 'Any')}
        />
      )}

      {/* Duo Filter Modal */}
      <DuoFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={setFilters}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  // Header - matching leaderboard style
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 4,
    backgroundColor: '#0f0f0f',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabCount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
  },
  tabCountActive: {
    color: '#888',
  },
  tabDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#333',
  },
  // Pager
  pagerContainer: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    flexGrow: 1,
  },
  bottomSpacer: {
    height: 40,
  },
  // Game Filter Buttons
  gameFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingTop: 14,
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  gameFilterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    // 3D Shadow effect
    shadowColor: '#000',
    shadowOffset: {
      width: -3,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
  gameFilterButtonSelected: {
    borderColor: '#444',
    backgroundColor: '#252525',
  },
  gameFilterLogo: {
    width: 24,
    height: 24,
  },
  gameFilterLogoInactive: {
    opacity: 0.35,
  },
  // Section Headers - Parties style
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
  playerCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  // My Card Content
  myCardContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  myCardsContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  emptyCardState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  emptyCardText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#c42743',
    borderRadius: 12,
  },
  addCardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  compactCardsContainer: {
    gap: 16,
    alignItems: 'center',
    padding: 16,
  },
  myCardsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  myCardsRow: {
    gap: 20,
    alignItems: 'center',
  },
  addAnotherButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#424549',
    borderStyle: 'dashed',
    backgroundColor: '#2c2f33',
  },
  addAnotherContent: {
    flex: 1,
  },
  addAnotherButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  addAnotherSubtext: {
    fontSize: 13,
    color: '#72767d',
    marginTop: 2,
  },
  // Find Duo Content
  findDuoContent: {
    flex: 1,
  },
  findDuoContainer: {
    flex: 1,
    marginHorizontal: 8,
    marginTop: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  filterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  // Empty States - Profile style
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: -12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0f0f0f',
  },
  emptyIconCircleCenter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#c42743',
    zIndex: 1,
  },
  emptyGameLogo: {
    width: 28,
    height: 28,
    tintColor: '#72767d',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#72767d',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#c42743',
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardsList: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 16,
  },
});
