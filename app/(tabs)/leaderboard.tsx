import PartyCards from '@/app/components/partyCards';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant.png'),
  'League of Legends': require('@/assets/images/leagueoflegends.png'),
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

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'current' | 'completed'>('current');

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
      const fetchedParties = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.partyId,
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
          partyId: data.partyId,
        };
      });

      setParties(fetchedParties);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Calculate user's rank in each party
  useEffect(() => {
    if (!user?.id || parties.length === 0) return;

    const calculateRanks = async () => {
      const updatedParties = await Promise.all(
        parties.map(async (party) => {
          try {
            // Get party document to fetch memberDetails
            const partiesRef = collection(db, 'parties');
            const partyQuery = query(partiesRef, where('partyId', '==', party.partyId), limit(1));
            const partySnapshot = await getDocs(partyQuery);

            if (partySnapshot.empty || !partySnapshot.docs[0].data().memberDetails) {
              return party;
            }

            const partyData = partySnapshot.docs[0].data();
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

  // Filter parties by tab
  const currentParties = parties.filter(party => !isPartyCompleted(party.endDate));
  const completedParties = parties.filter(party => isPartyCompleted(party.endDate));
  const displayedParties = selectedTab === 'current' ? currentParties : completedParties;

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#666';
  };

  const handleLeaderboardPress = (leaderboard: any) => {
    console.log('Navigating to party:', leaderboard.name);
    console.log('Party ID:', leaderboard.partyId);
    console.log('Full leaderboard data:', leaderboard);

    const params = {
      name: leaderboard.name,
      icon: leaderboard.icon,
      game: leaderboard.game,
      members: leaderboard.members.toString(),
      players: JSON.stringify(leaderboard.players),
      partyId: leaderboard.partyId,
      startDate: leaderboard.startDate,
      endDate: leaderboard.endDate,
    };

    console.log('Navigation params:', params);

    // Route to unified leaderboard detail page
    const pathname = '/leaderboardPages/leaderboardDetail';

    console.log('Navigating to:', pathname);
    router.push({ pathname, params });
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Leaderboards</ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/chatPages/chatList')}
          >
            <IconSymbol size={24} name="paperplane.fill" color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => router.push('/leaderboardPages/joinParty')}
          >
            <IconSymbol size={26} name="ticket" color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c42743" />
          <ThemedText style={styles.loadingText}>Loading parties...</ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'current' && styles.tabActive]}
              onPress={() => setSelectedTab('current')}
            >
              <ThemedText style={[styles.tabText, selectedTab === 'current' && styles.tabTextActive]}>
                Current ({currentParties.length})
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
              onPress={() => setSelectedTab('completed')}
            >
              <ThemedText style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>
                Completed ({completedParties.length})
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Parties List */}
          <View style={styles.leaderboardsSection}>
            {displayedParties.length > 0 ? (
              displayedParties.map((leaderboard) => (
                <PartyCards
                  key={leaderboard.id}
                  leaderboard={leaderboard}
                  onPress={handleLeaderboardPress}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>
                  {selectedTab === 'current' ? 'No current parties' : 'No completed parties'}
                </ThemedText>
                <ThemedText style={styles.emptyStateSubtext}>
                  {selectedTab === 'current'
                    ? 'Create a new party or join one with an invite code'
                    : 'Completed parties will appear here after their end date'}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Floating Add Party Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push('/leaderboardPages/addParty')}
        activeOpacity={0.8}
      >
        <IconSymbol size={28} name="plus" color="#fff" />
      </TouchableOpacity>
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
  joinButton: {
    padding: 4,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c42743',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#c42743',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b9bbbe',
    letterSpacing: -0.2,
  },
  tabTextActive: {
    color: '#fff',
  },
  leaderboardsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});