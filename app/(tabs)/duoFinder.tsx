import ValorantDuoCard from '@/app/components/valorantDuoCard';
import LeagueDuoCard from '@/app/components/leagueDuoCard';
import AddDuoCard, { DuoCardData } from '@/app/components/addDuoCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, RefreshControl } from 'react-native';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getAllowedRanks, sortByRankProximity, getRankRangeText } from '@/utils/rankFilters';

interface DuoCardWithId extends DuoCardData {
  id: string;
  userId: string;
  updatedAt?: any;
}

export default function DuoFinderScreen() {
  const { user } = useAuth();
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
  const [userCurrentRank, setUserCurrentRank] = useState<{ valorant?: string; league?: string }>({});

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
              const updatedCardData = {
                ...cardData,
                currentRank: valorantStats.currentRank || cardData.currentRank,
                peakRank: valorantStats.currentRank || cardData.peakRank,
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

  const handleRemoveCard = (game: 'valorant' | 'league') => {
    Alert.alert(
      'Remove Duo Card',
      `Are you sure you want to remove your ${game === 'valorant' ? 'Valorant' : 'League of Legends'} duo card?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;

            try {
              // Delete from Firebase
              const duoCardRef = doc(db, 'duoCards', `${user.id}_${game}`);
              await deleteDoc(duoCardRef);

              // Update local state
              if (game === 'valorant') {
                setValorantCard(null);
              } else {
                setLeagueCard(null);
              }

              Alert.alert('Success', 'Your duo card has been removed.');
            } catch (error) {
              console.error('Error removing duo card:', error);
              Alert.alert('Error', 'Failed to remove your duo card. Please try again.');
            }
          },
        },
      ]
    );
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

  // Fetch user's current rank for filtering
  useEffect(() => {
    const fetchUserRank = async () => {
      if (!user?.id) return;

      try {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const ranks: { valorant?: string; league?: string } = {};

          // Get Valorant rank
          if (userData.valorantStats?.currentRank) {
            ranks.valorant = userData.valorantStats.currentRank;
          }

          // Get League rank
          if (userData.riotStats?.rankedSolo) {
            const tier = userData.riotStats.rankedSolo.tier || 'UNRANKED';
            const rank = userData.riotStats.rankedSolo.rank || '';
            ranks.league = tier === 'UNRANKED' ? 'Unranked' : `${tier.charAt(0) + tier.slice(1).toLowerCase()} ${rank}`;
          }

          setUserCurrentRank(ranks);
        }
      } catch (error) {
        console.error('Error fetching user rank:', error);
      }
    };

    fetchUserRank();
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
          limit(100)
        );

        const snapshot = await getDocs(q);
        const cards = snapshot.docs
          .filter(doc => doc.data().userId !== user.id) // Exclude own card
          .map(doc => ({
            id: doc.id,
            userId: doc.data().userId,
            game: doc.data().game,
            username: doc.data().username,
            currentRank: doc.data().currentRank,
            region: doc.data().region,
            mainRole: doc.data().mainRole,
            peakRank: doc.data().peakRank,
            mainAgent: doc.data().mainAgent,
            updatedAt: doc.data().updatedAt,
          })) as DuoCardWithId[];

        // Filter by allowed ranks
        const userRank = game === 'valorant' ? userCurrentRank.valorant : userCurrentRank.league;
        if (userRank && userRank !== 'Unranked') {
          const allowedRanks = getAllowedRanks(game, userRank);
          const filteredCards = cards.filter(card =>
            allowedRanks.includes(card.currentRank)
          );

          // Sort by rank proximity
          const sortedCards = sortByRankProximity(filteredCards, game, userRank);
          allCards = [...allCards, ...sortedCards];
        } else {
          // If user is unranked or no rank found, show all
          allCards = [...allCards, ...cards];
        }
      }

      setDuoCards(allCards);
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
  }, [activeTab, selectedGameFilter, userCurrentRank]);

  const hasCards = valorantCard !== null || leagueCard !== null;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Duo Finder</ThemedText>
      </View>

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
            {loadingDuoCards ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={styles.loadingText}>Finding duo partners...</ThemedText>
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
                    {card.game === 'valorant' ? (
                      <ValorantDuoCard
                        username={card.username}
                        currentRank={card.currentRank}
                        region={card.region}
                        mainRole={card.mainRole}
                        peakRank={card.peakRank}
                        mainAgent={card.mainAgent}
                      />
                    ) : (
                      <LeagueDuoCard
                        username={card.username}
                        currentRank={card.currentRank}
                        region={card.region}
                        mainRole={card.mainRole}
                        peakRank={card.peakRank}
                        mainChampion={card.mainAgent}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.myCardContent}>
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
              // Has cards - Show them
              <View style={styles.cardsContainer}>
                {/* Valorant Card */}
                {valorantCard && (
                  <View style={styles.cardSection}>
                    <View style={styles.cardHeader}>
                      <ThemedText style={styles.cardSectionTitle}>Valorant</ThemedText>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveCard('valorant')}
                      >
                        <IconSymbol size={16} name="trash.fill" color="#ff4444" />
                        <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
                      </TouchableOpacity>
                    </View>
                    <ValorantDuoCard
                      username={valorantCard.username}
                      currentRank={valorantCard.currentRank}
                      region={valorantCard.region}
                      mainRole={valorantCard.mainRole}
                      peakRank={valorantCard.peakRank}
                      mainAgent={valorantCard.mainAgent}
                    />
                  </View>
                )}

                {/* League Card */}
                {leagueCard && (
                  <View style={styles.cardSection}>
                    <View style={styles.cardHeader}>
                      <ThemedText style={styles.cardSectionTitle}>League of Legends</ThemedText>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveCard('league')}
                      >
                        <IconSymbol size={16} name="trash.fill" color="#ff4444" />
                        <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
                      </TouchableOpacity>
                    </View>
                    <LeagueDuoCard
                      username={leagueCard.username}
                      currentRank={leagueCard.currentRank}
                      region={leagueCard.region}
                      mainRole={leagueCard.mainRole}
                      peakRank={leagueCard.peakRank}
                      mainChampion={leagueCard.mainAgent}
                    />
                  </View>
                )}

                {/* Add Another Card Button */}
                {(valorantCard === null || leagueCard === null) && (
                  <TouchableOpacity
                    style={styles.addAnotherButton}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
    backgroundColor: '#1e2124',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
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
    padding: 20,
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
  cardsContainer: {
    gap: 24,
  },
  cardSection: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff4444',
  },
  addAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c42743',
    borderStyle: 'dashed',
    marginTop: 8,
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
    padding: 20,
    gap: 16,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    fontSize: 13,
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  duoCardItem: {
    width: '100%',
  },
});
