import CompactDuoCard from '@/app/components/compactDuoCard';
import AddDuoCard, { DuoCardData } from '@/app/components/addDuoCard';
import EditDuoCard from '@/app/components/editDuoCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
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
  const [selectedGameFilter, setSelectedGameFilter] = useState<'valorant' | 'league' | 'both'>('both');
  const [duoCards, setDuoCards] = useState<DuoCardWithId[]>([]);
  const [loadingDuoCards, setLoadingDuoCards] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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

  // Fetch duo cards from Firebase
  const fetchDuoCards = async () => {
    if (!user?.id) return;

    setLoadingDuoCards(true);
    try {
      const duoCardsRef = collection(db, 'duoCards');

      // Determine which games to fetch
      const gamesToFetch: ('valorant' | 'league')[] =
        selectedGameFilter === 'both' ? ['valorant', 'league'] : [selectedGameFilter];

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

        // No rank filtering - show all cards
        allCards = [...allCards, ...cards];
      }

      // Limit to 5 cards
      setDuoCards(allCards.slice(0, 5));
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
  }, [activeTab, selectedGameFilter]);

  const hasCards = valorantCard !== null || leagueCard !== null;

  const handleEditButtonPress = () => {
    setIsEditMode(!isEditMode);
  };

  const handleCardPress = (game: 'valorant' | 'league') => {
    if (isEditMode) {
      // Open edit modal
      setEditingGame(game);
      setShowEditModal(true);
    } else {
      // Navigate to detail page
      const cardData = game === 'valorant' ? valorantCard : leagueCard;
      if (cardData) {
        const avatarUrl = user?.avatar || '';
        console.log('Navigating with user avatar:', avatarUrl);
        console.log('User object:', user);
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
            userId: user?.id || '',
          },
        });
      }
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
      // Exit edit mode after saving
      setIsEditMode(false);
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
      // Exit edit mode after deleting
      setIsEditMode(false);
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
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'findDuo' && styles.tabActive]}
          onPress={() => setActiveTab('findDuo')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'findDuo' && styles.tabTextActive]}>
            Find Duo
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myCard' && styles.tabActive]}
          onPress={() => setActiveTab('myCard')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'myCard' && styles.tabTextActive]}>
            My Duo Card
          </ThemedText>
        </TouchableOpacity>
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
            {/* Filter Section */}
            <View style={styles.filterSection}>
              {/* Game Filter Toggles */}
              <View style={styles.gameFilterContainer}>
                <TouchableOpacity
                  style={[styles.gameFilterButton, selectedGameFilter === 'both' && styles.gameFilterButtonActive]}
                  onPress={() => setSelectedGameFilter('both')}
                >
                  <ThemedText style={[styles.gameFilterText, selectedGameFilter === 'both' && styles.gameFilterTextActive]}>
                    All Games
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.gameFilterButton, selectedGameFilter === 'valorant' && styles.gameFilterButtonActive]}
                  onPress={() => setSelectedGameFilter('valorant')}
                >
                  <ThemedText style={[styles.gameFilterText, selectedGameFilter === 'valorant' && styles.gameFilterTextActive]}>
                    Valorant
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.gameFilterButton, selectedGameFilter === 'league' && styles.gameFilterButtonActive]}
                  onPress={() => setSelectedGameFilter('league')}
                >
                  <ThemedText style={[styles.gameFilterText, selectedGameFilter === 'league' && styles.gameFilterTextActive]}>
                    League
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Count */}
              <ThemedText style={styles.duoCountText}>
                {duoCards.length} {duoCards.length === 1 ? 'player' : 'players'} looking for duo
              </ThemedText>
            </View>

            {/* Duo Cards List */}
            {loadingDuoCards || (duoCards.length > 0 && !showCards) ? (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingContent}>
                  {/* Animated dots */}
                  <View style={styles.loadingDotsContainer}>
                    <View style={[styles.loadingDot, styles.loadingDot1]} />
                    <View style={[styles.loadingDot, styles.loadingDot2]} />
                    <View style={[styles.loadingDot, styles.loadingDot3]} />
                  </View>
                  <ActivityIndicator size="large" color="#c42743" style={styles.loadingSpinner} />
                  <ThemedText style={styles.loadingTitle}>Finding Duo Partners</ThemedText>
                  <ThemedText style={styles.loadingSubtext}>Searching for players in your skill range...</ThemedText>
                </View>
              </View>
            ) : duoCards.length === 0 ? (
              <View style={styles.emptyDuoState}>
                <IconSymbol size={64} name="person.2.fill" color="#666" />
                <ThemedText style={styles.emptyDuoTitle}>No Duo Partners Found</ThemedText>
                <ThemedText style={styles.emptyDuoText}>
                  No players in your rank range right now.{'\n'}Create a duo card to get matched!
                </ThemedText>
                <TouchableOpacity
                  style={styles.createCardButton}
                  onPress={() => {
                    setActiveTab('myCard');
                    if (!hasCards) {
                      setShowAddCard(true);
                    }
                  }}
                >
                  <ThemedText style={styles.createCardButtonText}>Create Duo Card</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.duoCardsContainer}>
                {duoCards.map((card) => (
                  <View key={card.id} style={styles.duoCardItem}>
                    <CompactDuoCard
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
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.myCardContent}>
            {hasCards && (
              <View style={styles.myCardHeader}>
                <ThemedText style={styles.myCardHeaderTitle}>
                  {isEditMode ? 'Tap a card to edit' : 'My Duo Cards'}
                </ThemedText>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditButtonPress}
                >
                  <ThemedText style={isEditMode ? styles.doneButtonText : styles.editButtonText}>
                    {isEditMode ? 'Done' : 'Edit'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
            {!hasCards ? (
              // No cards - Show add button
              <View style={styles.emptyCardState}>
                <IconSymbol size={64} name="person.crop.circle.badge.plus" color="#666" />
                <ThemedText style={styles.emptyCardTitle}>Create Your Duo Card</ThemedText>
                <ThemedText style={styles.emptyCardText}>
                  Share your rank and find teammates who match your skill level
                </ThemedText>
                <TouchableOpacity
                  style={styles.addCardButton}
                  onPress={() => setShowAddCard(true)}
                >
                  <IconSymbol size={20} name="plus.circle.fill" color="#fff" />
                  <ThemedText style={styles.addCardButtonText}>Create Duo Card</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              // Has cards - Show them vertically with compact cards
              <View style={styles.compactCardsContainer}>
                {/* Valorant Card */}
                {valorantCard && (
                  <View style={styles.compactCardSection}>
                    <ThemedText style={styles.cardSectionTitle}>Valorant</ThemedText>
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
                    <ThemedText style={styles.cardSectionTitle}>League of Legends</ThemedText>
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
                {!isEditMode && (valorantCard === null || leagueCard === null) && (
                  <TouchableOpacity
                    style={styles.addAnotherButtonCompact}
                    onPress={() => setShowAddCard(true)}
                  >
                    <IconSymbol size={20} name="plus.circle" color="#c42743" />
                    <ThemedText style={styles.addAnotherButtonText}>
                      {valorantCard ? 'Add League Card' : 'Add Valorant Card'}
                    </ThemedText>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerIconButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 68,
    paddingBottom: 0,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
    backgroundColor: '#1e2124',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#c42743',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  myCardContent: {
    flex: 1,
    padding: 20,
  },
  myCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  myCardHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c42743',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c42743',
  },
  emptyCardState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    gap: 12,
  },
  emptyCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  emptyCardText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#c42743',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  addCardButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  compactCardsContainer: {
    gap: 10,
  },
  compactCardSection: {
    gap: 8,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  addAnotherButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c42743',
    borderStyle: 'dashed',
  },
  addAnotherButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c42743',
  },
  findDuoContent: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
    backgroundColor: '#1a1d1f',
  },
  gameFilterContainer: {
    flexDirection: 'row',
    gap: 6,
    padding: 3,
    backgroundColor: '#2c2f33',
    borderRadius: 10,
  },
  gameFilterButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameFilterButtonActive: {
    backgroundColor: '#c42743',
    shadowColor: '#c42743',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gameFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.2,
  },
  gameFilterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  duoCountText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingContent: {
    alignItems: 'center',
    gap: 20,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#c42743',
  },
  loadingDot1: {
    opacity: 0.3,
  },
  loadingDot2: {
    opacity: 0.6,
  },
  loadingDot3: {
    opacity: 1,
  },
  loadingSpinner: {
    marginVertical: 8,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 280,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  emptyDuoState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyDuoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  emptyDuoText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  createCardButton: {
    backgroundColor: '#c42743',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  createCardButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  duoCardsContainer: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  duoCardItem: {
    width: '100%',
  },
});
