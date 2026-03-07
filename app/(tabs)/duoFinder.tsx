import CompactDuoCard from '@/app/components/compactDuoCard';
import AddDuoCard, { DuoCardData } from '@/app/components/addDuoCard';
import EditDuoCard from '@/app/components/editDuoCard';
import DuoFilterModal, { DuoFilterOptions } from '@/app/profilePages/duoFilterModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, RefreshControl, Dimensions, ActivityIndicator, Image } from 'react-native';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useRouter } from 'expo-router';

interface DuoCardWithId extends DuoCardData {
  id: string;
  userId: string;
  updatedAt?: any;
  avatar?: string;
}

export default function DuoFinderScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'findDuo' | 'myCard'>('findDuo');
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

      // Determine which games to fetch based on filter
      const gamesToFetch: ('valorant' | 'league')[] = filters.game
        ? [filters.game]
        : ['valorant', 'league'];

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

              // Fetch user's avatar
              let avatar = undefined;
              try {
                const userDocRef = doc(db, 'users', cardData.userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                  avatar = userDoc.data()?.avatar;
                }
              } catch (error) {
                console.error('Error fetching avatar for user:', cardData.userId, error);
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

  // Fetch duo cards when tab or filter changes
  useEffect(() => {
    if (activeTab === 'findDuo') {
      fetchDuoCards();
    }
  }, [activeTab, filters]);

  const hasCards = valorantCard !== null || leagueCard !== null;

  const handleCardPress = (game: 'valorant' | 'league') => {
    // Navigate to detail page with edit capability for own card
    const cardData = game === 'valorant' ? valorantCard : leagueCard;
    if (cardData) {
      const avatarUrl = user?.avatar || '';
      router.push({
        pathname: '/profilePages/duoCardDetail',
        params: {
          game: cardData.game,
          username: cardData.username,
          avatar: avatarUrl,
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
        <ThemedText style={styles.headerTitle}>
          {activeTab === 'myCard' ? 'My Duo Cards' : 'Duo Finder'}
        </ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerTabBtn}
            onPress={() => setActiveTab(activeTab === 'myCard' ? 'findDuo' : 'myCard')}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.headerTabBtnText}>
              {activeTab === 'myCard' ? 'Find Duo' : 'My Cards'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab === 'myCard' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c42743"
              colors={['#c42743']}
            />
          ) : undefined
        }
      >
        {activeTab === 'findDuo' ? (
          <View style={styles.findDuoContent}>
            {/* Players Section Header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <IconSymbol size={18} name="person.2.fill" color="#fff" />
                <ThemedText style={styles.sectionHeaderTitle}>Available Players</ThemedText>
              </View>
              <View style={styles.statusBadge}>
                <View style={styles.statusDotOuter}>
                  <View style={styles.statusDot} />
                </View>
                <ThemedText style={styles.statusText}>
                  {duoCards.length} {duoCards.length === 1 ? 'Player' : 'Players'}
                </ThemedText>
              </View>
            </View>

            {/* Filter Bar */}
            <TouchableOpacity
              style={styles.filterBar}
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.7}
            >
              <IconSymbol size={14} name="line.3.horizontal.decrease" color="#888" />
              <ThemedText style={styles.filterLabel}>
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </ThemedText>
              <IconSymbol size={10} name="chevron.down" color="#666" />
            </TouchableOpacity>

            {/* Content Area */}
            {loadingDuoCards || (duoCards.length > 0 && !showCards) ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#c42743" />
                <ThemedText style={styles.loadingText}>Finding players...</ThemedText>
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
                  Create your duo card to start matching with other players
                </ThemedText>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => {
                    setActiveTab('myCard');
                    if (!hasCards) {
                      setShowAddCard(true);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <IconSymbol size={18} name="plus" color="#fff" />
                  <ThemedText style={styles.emptyButtonText}>Create Duo Card</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {duoCards.map((card) => (
                  <CompactDuoCard
                    key={card.id}
                    game={card.game}
                    username={card.username}
                    avatar={card.avatar}
                    peakRank={card.peakRank}
                    mainRole={card.mainRole}
                    preferredDuoRole={card.lookingFor || 'Any'}
                    onPress={() => handleFindDuoCardPress(card)}
                    onAvatarLoad={() => setAvatarsLoadedCount(prev => prev + 1)}
                    showContent={true}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.myCardContent}>
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
              // Has cards - Show them vertically with compact cards
              <View style={styles.compactCardsContainer}>
                {/* Valorant Card */}
                {valorantCard && (
                  <View style={styles.compactCardSection}>
                    <View style={styles.cardSectionHeader}>
                      <Image
                        source={require('@/assets/images/valorant-red.png')}
                        style={styles.cardSectionIcon}
                        resizeMode="contain"
                      />
                      <ThemedText style={styles.cardSectionTitle}>Valorant</ThemedText>
                    </View>
                    <CompactDuoCard
                      game="valorant"
                      username={valorantCard.username}
                      avatar={user?.avatar}
                      peakRank={valorantCard.peakRank}
                      mainRole={valorantCard.mainRole}
                      preferredDuoRole={valorantCard.lookingFor || 'Any'}
                      onPress={() => handleCardPress('valorant')}
                    />
                  </View>
                )}

                {/* League Card */}
                {leagueCard && (
                  <View style={styles.compactCardSection}>
                    <View style={styles.cardSectionHeader}>
                      <Image
                        source={require('@/assets/images/lol.png')}
                        style={styles.cardSectionIcon}
                        resizeMode="contain"
                      />
                      <ThemedText style={styles.cardSectionTitle}>League of Legends</ThemedText>
                    </View>
                    <CompactDuoCard
                      game="league"
                      username={leagueCard.username}
                      avatar={user?.avatar}
                      peakRank={leagueCard.peakRank}
                      mainRole={leagueCard.mainRole}
                      preferredDuoRole={leagueCard.lookingFor || 'Any'}
                      onPress={() => handleCardPress('league')}
                    />
                  </View>
                )}

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
        )}
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
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
    backgroundColor: '#0f0f0f',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTabBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerTabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c42743',
  },
  // Section Headers - Profile style
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    flexGrow: 1,
  },
  // My Card Content
  myCardContent: {
    flex: 1,
    padding: 20,
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
    gap: 20,
  },
  compactCardSection: {
    gap: 16,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardSectionIcon: {
    width: 22,
    height: 22,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginLeft: 20,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#72767d',
  },
  // Empty States - Profile style
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
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
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
});
