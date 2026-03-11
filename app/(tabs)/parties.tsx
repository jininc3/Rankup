import PartyCards from '@/app/components/partyCards';
import LeaderboardCard from '@/app/components/leaderboardCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
  'CS2': require('@/assets/images/valorant.png'), // placeholder
  'Overwatch 2': require('@/assets/images/valorant.png'), // placeholder
};

// Helper function to calculate League rank value for sorting
const getLeagueRankValue = (currentRank: string, lp: number): number => {
  const rankOrder: { [key: string]: number } = {
    'CHALLENGER': 10, 'GRANDMASTER': 9, 'MASTER': 8, 'DIAMOND': 7,
    'EMERALD': 6, 'PLATINUM': 5, 'GOLD': 4, 'SILVER': 3,
    'BRONZE': 2, 'IRON': 1, 'UNRANKED': 0,
  };
  const divisionOrder: { [key: string]: number } = { 'I': 4, 'II': 3, 'III': 2, 'IV': 1 };

  const parts = currentRank.toUpperCase().split(' ');
  const tierValue = rankOrder[parts[0]] || 0;
  const divisionValue = divisionOrder[parts[1]] || 0;

  return tierValue * 1000 + divisionValue * 100 + lp;
};

// Helper function to calculate Valorant rank value for sorting
const getValorantRankValue = (currentRank: string, rr: number): number => {
  const rankOrder: { [key: string]: number } = {
    'RADIANT': 9, 'IMMORTAL': 8, 'ASCENDANT': 7, 'DIAMOND': 6,
    'PLATINUM': 5, 'GOLD': 4, 'SILVER': 3, 'BRONZE': 2,
    'IRON': 1, 'UNRANKED': 0,
  };

  const parts = currentRank.toUpperCase().split(' ');
  const tierValue = rankOrder[parts[0]] || 0;
  const divisionValue = parseInt(parts[1]) || 0;

  return tierValue * 1000 + divisionValue * 100 + rr;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'parties' | 'leaderboards'>('parties');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const pagerRef = useRef<ScrollView>(null);

  // Handle tab press - scroll to page
  const handleTabPress = (tab: 'parties' | 'leaderboards') => {
    setSelectedTab(tab);
    const pageIndex = tab === 'parties' ? 0 : 1;
    pagerRef.current?.scrollTo({ x: pageIndex * SCREEN_WIDTH, animated: true });
  };

  // Handle swipe - update selected tab in real-time
  const handlePageScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const progress = offsetX / SCREEN_WIDTH;
    // Switch tab when past 50% of the way
    const newTab = progress >= 0.5 ? 'leaderboards' : 'parties';
    if (newTab !== selectedTab) {
      setSelectedTab(newTab);
    }
  };

  // Fetch parties from Firestore
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Set up real-time listener for parties where user is a member
    const partiesRef = collection(db, 'parties');
    const partiesQuery = query(partiesRef, where('members', 'array-contains', user.id));

    const unsubscribe = onSnapshot(partiesQuery, (snapshot) => {
      const fetchedParties = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;
        return {
          id: docId,
          name: data.partyName,
          game: data.game,
          members: data.members?.length || 0,
          description: `Created on ${data.startDate}`,
          icon: data.game === 'Valorant' ? '🎯' : data.game === 'League of Legends' ? '💎' : '🎮',
          userRank: null, // Will be calculated based on game stats
          isJoined: true,
          players: [], // Will be populated with member details
          startDate: data.startDate,
          endDate: data.endDate,
          type: data.type || 'leaderboard', // 'party' or 'leaderboard'
          coverPhoto: data.coverPhoto || null, // Cover photo URL
          partyIcon: data.partyIcon || null, // Party icon URL
          partyId: data.partyId || docId, // Party ID for navigation
        };
      });

      setParties(fetchedParties);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Calculate user's rank in each leaderboard (not for parties)
  useEffect(() => {
    if (!user?.id || parties.length === 0) return;

    const calculateRanks = async () => {
      const updatedParties = await Promise.all(
        parties.map(async (party) => {
          try {
            // Skip rank calculation for party-type (only calculate for leaderboards)
            if (party.type === 'party') {
              return party;
            }

            // Skip if id is undefined
            if (!party.id) {
              console.warn('Party missing id, skipping rank calculation');
              return party;
            }

            // Get party document directly by ID
            const partyDocRef = doc(db, 'parties', party.id);
            const partySnapshot = await getDoc(partyDocRef);

            if (!partySnapshot.exists() || !partySnapshot.data().memberDetails) {
              return party;
            }

            const partyData = partySnapshot.data();
            const memberDetails = partyData.memberDetails;
            const isLeague = party.game === 'League of Legends';
            const gameStatsPath = isLeague ? 'league' : 'valorant';

            // Fetch stats for all members
            const memberStatsPromises = memberDetails.map(async (member: any) => {
              // Try gameStats subcollection first
              const gameStatsDoc = await getDoc(doc(db, 'users', member.userId, 'gameStats', gameStatsPath));
              let stats = gameStatsDoc.data();

              // Fallback to main stats if gameStats doesn't exist
              if (!stats || !stats.currentRank) {
                const userDoc = await getDoc(doc(db, 'users', member.userId));
                const userData = userDoc.data();

                if (isLeague && userData?.riotStats?.rankedSolo) {
                  stats = {
                    currentRank: `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`,
                    lp: userData.riotStats.rankedSolo.leaguePoints || 0,
                  };
                } else if (!isLeague && userData?.valorantStats) {
                  stats = {
                    currentRank: userData.valorantStats.currentRank || 'Unranked',
                    rr: userData.valorantStats.rankRating || 0,
                  };
                }
              }

              return {
                userId: member.userId,
                currentRank: stats?.currentRank || 'Unranked',
                lp: stats?.lp || 0,
                rr: stats?.rr || 0,
              };
            });

            const memberStats = await Promise.all(memberStatsPromises);

            // Sort members by rank
            memberStats.sort((a, b) => {
              if (isLeague) {
                return getLeagueRankValue(b.currentRank, b.lp) - getLeagueRankValue(a.currentRank, a.lp);
              } else {
                return getValorantRankValue(b.currentRank, b.rr) - getValorantRankValue(a.currentRank, a.rr);
              }
            });

            // Find user's rank
            const userRank = memberStats.findIndex(m => m.userId === user.id) + 1;

            return {
              ...party,
              userRank: userRank > 0 ? userRank : null,
            };
          } catch (error) {
            console.error(`Error calculating rank for party ${party.partyId}:`, error);
            return party;
          }
        })
      );

      setParties(updatedParties);
    };

    calculateRanks();
  }, [parties.length, user?.id]);

  // Helper function to check if a party is completed
  const isPartyCompleted = (endDate: any): boolean => {
    if (!endDate) return false;

    let endDateObj: Date | null = null;

    // Handle Firestore Timestamp
    if (endDate.toDate && typeof endDate.toDate === 'function') {
      endDateObj = endDate.toDate();
    }
    // Handle Date object
    else if (endDate instanceof Date) {
      endDateObj = endDate;
    }
    // Handle string (MM/DD/YYYY format)
    else if (typeof endDate === 'string') {
      const parts = endDate.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        endDateObj = new Date(year, month, day);
      } else {
        endDateObj = new Date(endDate);
      }
    }

    if (!endDateObj || isNaN(endDateObj.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDateObj.setHours(0, 0, 0, 0);

    return endDateObj < today;
  };

  // Filter parties by type
  const partyTypeParties = parties.filter(party => party.type === 'party');
  const leaderboardTypeParties = parties.filter(party => party.type === 'leaderboard' || !party.type);

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#666';
  };

  const handleLeaderboardPress = (leaderboard: any) => {
    console.log('Navigating to party:', leaderboard.name);
    console.log('Party ID:', leaderboard.partyId);
    console.log('Party type:', leaderboard.type);

    // Route based on party type
    if (leaderboard.type === 'party') {
      router.push({
        pathname: '/partyPages/partyDetail',
        params: {
          name: leaderboard.name,
          partyId: leaderboard.partyId,
          game: leaderboard.game,
        },
      });
    } else {
      // Leaderboard type
      router.push({
        pathname: '/partyPages/leaderboardDetail',
        params: {
          name: leaderboard.name,
          icon: leaderboard.icon,
          game: leaderboard.game,
          members: leaderboard.members.toString(),
          players: JSON.stringify(leaderboard.players),
          id: leaderboard.id,
          startDate: leaderboard.startDate,
          endDate: leaderboard.endDate,
        },
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Parties</ThemedText>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <IconSymbol size={20} name="plus" color="#fff" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c42743" />
          <ThemedText style={styles.loadingText}>Loading parties...</ThemedText>
        </View>
      ) : (
        <>
          {/* Tabs - Fixed at top */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabPress('parties')}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.tabText, selectedTab === 'parties' && styles.tabTextActive]}>
                PARTIES
              </ThemedText>
              <ThemedText style={[styles.tabCount, selectedTab === 'parties' && styles.tabCountActive]}>
                {partyTypeParties.length}
              </ThemedText>
            </TouchableOpacity>
            <View style={styles.tabDivider} />
            <TouchableOpacity
              style={styles.tab}
              onPress={() => handleTabPress('leaderboards')}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.tabText, selectedTab === 'leaderboards' && styles.tabTextActive]}>
                LEADERBOARDS
              </ThemedText>
              <ThemedText style={[styles.tabCount, selectedTab === 'leaderboards' && styles.tabCountActive]}>
                {leaderboardTypeParties.length}
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
            {/* Parties Page */}
            <ScrollView
              style={[styles.pageContainer, { width: SCREEN_WIDTH }]}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pageContent}
            >
              {partyTypeParties.length > 0 ? (
                partyTypeParties.map((leaderboard) => (
                  <PartyCards
                    key={leaderboard.id}
                    leaderboard={leaderboard}
                    onPress={handleLeaderboardPress}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>No parties yet</ThemedText>
                  <ThemedText style={styles.emptyStateSubtext}>
                    Create a party to compete with friends
                  </ThemedText>
                </View>
              )}
              <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Leaderboards Page */}
            <ScrollView
              style={[styles.pageContainer, { width: SCREEN_WIDTH }]}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pageContent}
            >
              {leaderboardTypeParties.length > 0 ? (
                leaderboardTypeParties.map((leaderboard) => (
                  <LeaderboardCard
                    key={leaderboard.id}
                    leaderboard={leaderboard}
                    onPress={handleLeaderboardPress}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>No leaderboards yet</ThemedText>
                  <ThemedText style={styles.emptyStateSubtext}>
                    Join a leaderboard to track your rank against others
                  </ThemedText>
                </View>
              )}
              <View style={styles.bottomSpacer} />
            </ScrollView>
          </ScrollView>
        </>
      )}

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>Create</ThemedText>
            <View style={styles.modalDivider} />

            {/* Party Option */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowCreateModal(false);
                router.push('/partyPages/createPartySimple');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <IconSymbol size={22} name="person.2.fill" color="#fff" />
              </View>
              <View style={styles.modalOptionText}>
                <ThemedText style={styles.modalOptionTitle}>Party</ThemedText>
                <ThemedText style={styles.modalOptionSubtitle}>Casual group for playing together</ThemedText>
              </View>
            </TouchableOpacity>

            {/* Leaderboard Option */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowCreateModal(false);
                router.push('/partyPages/createLeaderboard');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <IconSymbol size={22} name="trophy.fill" color="#fff" />
              </View>
              <View style={styles.modalOptionText}>
                <ThemedText style={styles.modalOptionTitle}>Leaderboard</ThemedText>
                <ThemedText style={styles.modalOptionSubtitle}>Compete with friends for rankings</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
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
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#b9bbbe',
  },
  pagerContainer: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
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
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabCount: {
    fontSize: 12,
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
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#b9bbbe',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  modalOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: '#888',
  },
});