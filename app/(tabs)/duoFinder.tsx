import DuoCard from '@/app/components/duoCard';
import { LinearGradient } from 'expo-linear-gradient';
import AddDuoCard, { DuoCardData } from '@/app/components/addDuoCard';
import EditDuoCard from '@/app/components/editDuoCard';
import DuoFilterModal, { DuoFilterOptions } from '@/app/profilePages/duoFilterModal';
import DuoCardDetailModal from '@/app/components/duoCardDetailModal';
import PostDuoCard from '@/app/components/postDuoCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DuoCardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Dimensions, ScrollView, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, View, RefreshControl, Image, Modal, Animated, Easing } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useRouter } from 'expo-router';
import { createOrGetChat } from '@/services/chatService';

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

interface DuoPostWithId {
  id: string;
  userId: string;
  username: string;
  game: 'valorant' | 'league';
  currentRank: string;
  peakRank: string;
  mainRole: string;
  mainAgent: string;
  region: string;
  lookingFor: string;
  avatar?: string;
  inGameIcon?: string;
  inGameName?: string;
  winRate?: number;
  gamesPlayed?: number;
  message: string;
  createdAt: any;
  expiresAt: any;
}


export default function DuoFinderScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Pulse animation for live search banner
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const [showMyCards, setShowMyCards] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [valorantCard, setValorantCard] = useState<DuoCardData | null>(null);
  const [leagueCard, setLeagueCard] = useState<DuoCardData | null>(null);
  const [hasValorantAccount, setHasValorantAccount] = useState(false);
  const [hasLeagueAccount, setHasLeagueAccount] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Find Duo state (legacy cards still used for live search)
  const [duoCards, setDuoCards] = useState<DuoCardWithId[]>([]);
  const [loadingDuoCards, setLoadingDuoCards] = useState(false);

  // Duo Posts feed state
  const [duoPosts, setDuoPosts] = useState<DuoPostWithId[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<DuoPostWithId[]>([]);
  const [loadingDuoPosts, setLoadingDuoPosts] = useState(false);
  const [refreshingPosts, setRefreshingPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showPostDuoCard, setShowPostDuoCard] = useState(false);
  const POSTS_PER_PAGE = 10;

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

  // Count active filters
  const activeFilterCount = [
    filters.game,
    filters.role,
    filters.minRank,
    filters.maxRank,
    filters.language,
  ].filter(Boolean).length;

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDuoCard, setSelectedDuoCard] = useState<DuoCardWithId | null>(null);
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
  const [hasActiveValorantPost, setHasActiveValorantPost] = useState(false);
  const [hasActiveLeaguePost, setHasActiveLeaguePost] = useState(false);

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
          const tagLine = userData.valorantAccount?.tag || userData.valorantAccount?.tagLine || '';
          setValorantInGameName(tagLine ? `${userData.valorantStats.gameName}#${tagLine}` : userData.valorantStats.gameName);
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

        // Check if user has active duo posts in the feed
        const valorantPostRef = doc(db, 'duoPosts', `${user.id}_valorant`);
        const leaguePostRef = doc(db, 'duoPosts', `${user.id}_league`);
        const [valorantPostDoc, leaguePostDoc] = await Promise.all([
          getDoc(valorantPostRef),
          getDoc(leaguePostRef),
        ]);
        setHasActiveValorantPost(valorantPostDoc.exists());
        setHasActiveLeaguePost(leaguePostDoc.exists());
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

    // Only show skeleton on initial load when no cards are cached
    if (duoCards.length === 0) {
      setLoadingDuoCards(true);
    }
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
                      const tagLine = userData?.valorantAccount?.tag || userData?.valorantAccount?.tagLine || '';
                      inGameName = tagLine ? `${userData.valorantStats.gameName}#${tagLine}` : userData.valorantStats.gameName;
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

  // Fetch duo posts for the feed
  const fetchDuoPosts = async (showLoading: boolean = true) => {
    if (!user?.id) return;

    if (showLoading) setLoadingDuoPosts(true);
    try {
      const postsRef = collection(db, 'duoPosts');
      const now = Timestamp.now();

      // Determine which games to fetch
      const gamesToFetch: string[] = [];
      if (selectedGames.valorant) gamesToFetch.push('valorant');
      if (selectedGames.league) gamesToFetch.push('league');

      if (gamesToFetch.length === 0) {
        setDuoPosts([]);
        setLoadingDuoPosts(false);
        return;
      }

      let allPosts: DuoPostWithId[] = [];

      for (const game of gamesToFetch) {
        const q = query(
          postsRef,
          where('status', '==', 'active'),
          where('game', '==', game),
          orderBy('createdAt', 'desc'),
          limit(20)
        );

        const snapshot = await getDocs(q);
        const posts = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as DuoPostWithId))
          .filter(post => {
            // Filter out expired posts client-side
            if (post.expiresAt && post.expiresAt.toDate() < new Date()) return false;
            return true;
          });

        allPosts = [...allPosts, ...posts];
      }

      // Sort all posts by createdAt desc
      allPosts.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });

      // Apply client-side filters
      const filtered = allPosts.filter(post => {
        if (filters.role && post.mainRole !== filters.role) return false;
        if (!isRankInRange(post.currentRank, post.game, filters.minRank, filters.maxRank)) return false;
        return true;
      });

      setDuoPosts(filtered);
      setDisplayedPosts(filtered.slice(0, POSTS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching duo posts:', error);
    } finally {
      setLoadingDuoPosts(false);
    }
  };

  // Refresh posts (for refresh button and pull-to-refresh)
  const refreshPosts = async () => {
    setRefreshingPosts(true);
    await fetchDuoPosts(false);
    setRefreshingPosts(false);
  };

  // Load more posts when user scrolls to bottom
  const loadMorePosts = () => {
    if (loadingMore || displayedPosts.length >= duoPosts.length) return;
    setLoadingMore(true);
    const nextPosts = duoPosts.slice(0, displayedPosts.length + POSTS_PER_PAGE);
    setDisplayedPosts(nextPosts);
    setLoadingMore(false);
  };

  // Fetch duo posts when filters or games change
  useEffect(() => {
    fetchDuoPosts();
  }, [filters, selectedGames, user?.id]);

  // Delete a duo post
  const handleDeletePost = (post: DuoPostWithId) => {
    Alert.alert('Remove Post', 'Remove your duo post from the feed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'duoPosts', post.id));
            setDuoPosts(prev => prev.filter(p => p.id !== post.id));
            setDisplayedPosts(prev => prev.filter(p => p.id !== post.id));
            if (post.id === `${user?.id}_valorant`) setHasActiveValorantPost(false);
            if (post.id === `${user?.id}_league`) setHasActiveLeaguePost(false);
          } catch (error) {
            console.error('Error deleting post:', error);
          }
        },
      },
    ]);
  };

  // Message a duo post user
  const handleDuoPostMessage = async (post: DuoPostWithId) => {
    if (!user?.id) return;
    try {
      const chatId = await createOrGetChat(user.id, post.userId);
      router.push({
        pathname: '/chatPages/chatScreen',
        params: { chatId, otherUserId: post.userId, otherUsername: post.username },
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
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
    setSelectedDuoCard(card);
  };

  const handleDuoCardMessage = async (card: DuoCardWithId) => {
    if (!user?.id) return;
    try {
      const chatId = await createOrGetChat(
        user.id,
        user.username || '',
        user.avatar,
        card.userId,
        card.username,
        card.avatar,
      );
      router.push({
        pathname: '/chatPages/chatScreen',
        params: {
          chatId,
          otherUserId: card.userId,
          otherUsername: card.username,
          otherUserAvatar: card.avatar || '',
          focusInput: 'true',
        },
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
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

  // --- Live Search Functions ---
  return (
    <ThemedView style={styles.container}>
      {/* Background shimmer */}
      <View style={styles.backgroundGlow} pointerEvents="none">
        {/* Fixed shimmer band — diagonal gleam */}
        <View style={styles.shimmerBand} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.03)',
              'rgba(255, 255, 255, 0.065)',
              'rgba(255, 255, 255, 0.03)',
              'transparent',
            ]}
            locations={[0, 0.37, 0.5, 0.63, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        {/* Secondary fainter shimmer */}
        <View style={styles.shimmerBandSecondary} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.035)',
              'transparent',
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>DUO FINDER</ThemedText>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => hasCards ? setShowPostDuoCard(true) : setShowAddCard(true)}
            activeOpacity={0.7}
          >
            <IconSymbol size={16} name="plus" color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerTextButton}
            onPress={() => setShowMyCards(true)}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.headerTextButtonLabel}>My Cards</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Find Duo Feed */}
      <FlatList
            data={displayedPosts}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.feedContent}
            nestedScrollEnabled
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color="#A08845" style={{ paddingVertical: 16 }} />
              ) : null
            }
            ListHeaderComponent={
              <View>
                {/* Live Search Banner */}
                <TouchableOpacity
                  style={styles.liveSearchBanner}
                  onPress={() => router.push('/partyPages/liveSearch')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(180, 155, 70, 0.08)', 'rgba(180, 155, 70, 0.02)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.liveSearchBannerGradient}
                  >
                    <View style={styles.liveSearchBannerText}>
                      <ThemedText style={styles.liveSearchBannerTitle}>LIVE SEARCH</ThemedText>
                      <ThemedText style={styles.liveSearchBannerSubtitle}>
                        Find your duo in real-time
                      </ThemedText>
                    </View>
                    <IconSymbol size={16} name="chevron.right" color="rgba(180, 155, 70, 0.5)" />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <ThemedText style={styles.sectionHeaderTitle}>FEED</ThemedText>
                  <ThemedText style={styles.playerCount}>{duoPosts.length}</ThemedText>
                </View>
                <View style={styles.headerRightSection}>
                  <TouchableOpacity
                    onPress={() => setShowFilterModal(true)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol size={16} name="line.3.horizontal.decrease" color={activeFilterCount > 0 ? '#A08845' : '#555'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={refreshPosts}
                    activeOpacity={0.7}
                    disabled={refreshingPosts || loadingDuoPosts}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {refreshingPosts ? (
                      <ActivityIndicator size="small" color="#A08845" style={{ width: 16, height: 16 }} />
                    ) : (
                      <IconSymbol size={16} name="arrow.clockwise" color={loadingDuoPosts ? '#333' : '#555'} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              </View>
            }
            ListEmptyComponent={
              !loadingDuoPosts ? (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyTitle}>No duo posts{'\n'}yet</ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    {hasCards
                      ? 'Be the first to post your duo card to the feed!'
                      : 'Create your duo card to start posting and matching.'}
                  </ThemedText>
                  {!hasCards && (
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={() => setShowAddCard(true)}
                      activeOpacity={0.8}
                    >
                      <ThemedText style={styles.emptyButtonText}>Create Duo Card</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
            renderItem={({ item: post }) => {
              const isOwn = post.userId === user?.id;
              return (
                <View style={styles.feedCardWrapper}>
                  <DuoCard
                    duo={{
                      id: 0,
                      username: post.username,
                      status: 'active',
                      matchPercentage: 0,
                      currentRank: post.currentRank,
                      peakRank: post.peakRank,
                      favoriteAgent: post.mainAgent || '',
                      favoriteRole: post.mainRole || '',
                      winRate: post.winRate || 0,
                      gamesPlayed: post.gamesPlayed || 0,
                      game: post.game === 'valorant' ? 'Valorant' : 'League of Legends',
                      avatar: post.avatar,
                      inGameIcon: post.inGameIcon,
                      inGameName: post.inGameName,
                      message: post.message || undefined,
                      isOwnPost: isOwn,
                      createdAt: post.createdAt,
                    }}
                    onPress={() => !isOwn ? handleFindDuoCardPress({
                      ...post,
                      mainAgent: post.mainAgent,
                      lookingFor: post.lookingFor,
                    } as DuoCardWithId) : undefined}
                    onMessage={!isOwn ? () => handleDuoPostMessage(post) : undefined}
                    onViewProfile={!isOwn ? () => router.push({
                      pathname: '/profilePages/profileView',
                      params: { userId: post.userId, username: post.username, avatar: post.avatar || '' },
                    }) : undefined}
                    onDelete={undefined}
                  />
                </View>
              );
            }}
            ListFooterComponent={<View style={styles.bottomSpacer} />}
          />

      {/* My Cards Modal */}
      <Modal
        visible={showMyCards}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMyCards(false)}
      >
        <View style={styles.myCardsModal}>
          <View style={styles.myCardsModalHeader}>
            <ThemedText style={styles.myCardsModalTitle}>MY CARDS</ThemedText>
            <TouchableOpacity
              onPress={() => setShowMyCards(false)}
              activeOpacity={0.7}
              style={styles.myCardsCloseButton}
            >
              <IconSymbol size={22} name="xmark" color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.myCardsModalContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#c42743"
                colors={['#c42743']}
              />
            }
          >
            {!hasCards ? (
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
                  onPress={() => {
                    setShowMyCards(false);
                    setShowAddCard(true);
                  }}
                >
                  <IconSymbol size={20} name="plus" color="#fff" />
                  <ThemedText style={styles.addCardButtonText}>Create Duo Card</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.compactCardsContainer}>
                <View style={styles.myCardsRow}>
                  {valorantCard && (
                    <DuoCard
                      duo={{
                        id: 0,
                        username: valorantCard.username,
                        status: 'active',
                        matchPercentage: 0,
                        currentRank: valorantCard.currentRank,
                        peakRank: valorantCard.peakRank,
                        favoriteAgent: valorantCard.mainAgent || '',
                        favoriteRole: valorantCard.mainRole || '',
                        winRate: valorantWinRate || 0,
                        gamesPlayed: valorantGamesPlayed || 0,
                        game: 'Valorant',
                        avatar: user?.avatar,
                        inGameIcon: valorantInGameIcon,
                        inGameName: valorantInGameName,
                        isOwnPost: true,
                      }}
                      onPress={() => {
                        setShowMyCards(false);
                        handleCardPress('valorant');
                      }}
                      onDelete={hasActiveValorantPost ? () => {
                        Alert.alert('Remove Post', 'Remove your Valorant duo post from the feed?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await deleteDoc(doc(db, 'duoPosts', `${user?.id}_valorant`));
                                setDuoPosts(prev => prev.filter(p => p.id !== `${user?.id}_valorant`));
                                setDisplayedPosts(prev => prev.filter(p => p.id !== `${user?.id}_valorant`));
                                setHasActiveValorantPost(false);
                              } catch (error) {
                                console.error('Error deleting post:', error);
                              }
                            },
                          },
                        ]);
                      } : undefined}
                    />
                  )}
                  {leagueCard && (
                    <DuoCard
                      duo={{
                        id: 0,
                        username: leagueCard.username,
                        status: 'active',
                        matchPercentage: 0,
                        currentRank: leagueCard.currentRank,
                        peakRank: leagueCard.peakRank,
                        favoriteAgent: leagueCard.mainAgent || '',
                        favoriteRole: leagueCard.mainRole || '',
                        winRate: leagueWinRate || 0,
                        gamesPlayed: leagueGamesPlayed || 0,
                        game: 'League of Legends',
                        avatar: user?.avatar,
                        inGameIcon: leagueInGameIcon,
                        inGameName: leagueInGameName,
                        isOwnPost: true,
                      }}
                      onPress={() => {
                        setShowMyCards(false);
                        handleCardPress('league');
                      }}
                      onDelete={hasActiveLeaguePost ? () => {
                        Alert.alert('Remove Post', 'Remove your League duo post from the feed?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await deleteDoc(doc(db, 'duoPosts', `${user?.id}_league`));
                                setDuoPosts(prev => prev.filter(p => p.id !== `${user?.id}_league`));
                                setDisplayedPosts(prev => prev.filter(p => p.id !== `${user?.id}_league`));
                                setHasActiveLeaguePost(false);
                              } catch (error) {
                                console.error('Error deleting post:', error);
                              }
                            },
                          },
                        ]);
                      } : undefined}
                    />
                  )}
                </View>
                {(valorantCard === null || leagueCard === null) && (
                  <TouchableOpacity
                    style={styles.addAnotherButtonCompact}
                    onPress={() => {
                      setShowMyCards(false);
                      setShowAddCard(true);
                    }}
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
          </ScrollView>
        </View>
      </Modal>

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

      {/* Duo Card Detail Modal */}
      <DuoCardDetailModal
        visible={selectedDuoCard !== null}
        onClose={() => setSelectedDuoCard(null)}
        card={selectedDuoCard ? {
          game: selectedDuoCard.game,
          username: selectedDuoCard.username,
          avatar: selectedDuoCard.avatar,
          inGameIcon: selectedDuoCard.inGameIcon,
          inGameName: selectedDuoCard.inGameName,
          currentRank: selectedDuoCard.currentRank,
          peakRank: selectedDuoCard.peakRank,
          mainRole: selectedDuoCard.mainRole,
          mainAgent: selectedDuoCard.mainAgent,
          lookingFor: selectedDuoCard.lookingFor,
          winRate: selectedDuoCard.winRate,
          gamesPlayed: selectedDuoCard.gamesPlayed,
          userId: selectedDuoCard.userId,
        } : null}
      />

      {/* Post Duo Card Modal */}
      <PostDuoCard
        visible={showPostDuoCard}
        onClose={() => setShowPostDuoCard(false)}
        onPostCreated={() => {
          fetchDuoPosts();
          // Refresh active post state
          syncDuoCardsWithStats();
        }}
        valorantCard={valorantCard}
        leagueCard={leagueCard}
        userAvatar={user?.avatar}
        valorantInGameIcon={valorantInGameIcon}
        valorantInGameName={valorantInGameName}
        valorantWinRate={valorantWinRate}
        leagueInGameIcon={leagueInGameIcon}
        leagueInGameName={leagueInGameName}
        leagueWinRate={leagueWinRate}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    top: -screenHeight * 0.35,
    left: -screenWidth * 0.6,
    width: screenWidth * 2.2,
    height: screenHeight * 1.7,
    transform: [{ rotate: '20deg' }],
  },
  shimmerBandSecondary: {
    position: 'absolute',
    top: -screenHeight * 0.2,
    left: -screenWidth * 0.1,
    width: screenWidth * 1.9,
    height: screenHeight * 1.5,
    transform: [{ rotate: '-15deg' }],
  },
  // Header - matching leaderboard style
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 61,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTextButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
  },
  headerTextButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  liveSearchBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(180, 155, 70, 0.2)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  liveSearchBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  liveSearchBannerText: {
    flex: 1,
  },
  liveSearchBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4A843',
    letterSpacing: 1,
  },
  liveSearchBannerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  feedCardWrapper: {
    marginBottom: 4,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section Headers - Parties style
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
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
    color: '#555',
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
    gap: 10,
    paddingHorizontal: 0,
    paddingVertical: 16,
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
    gap: 12,
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
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  emptyState: {
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#555',
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f0f0f',
  },
  cardsList: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 10,
  },
  // My Cards Modal
  myCardsModal: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  myCardsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  myCardsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  myCardsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myCardsModalContent: {
    padding: 16,
    flexGrow: 1,
  },
});
