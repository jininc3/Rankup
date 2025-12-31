import { leaderboards } from '@/app/data/userData';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import PartyCards from '@/app/components/partyCards';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, limit } from 'firebase/firestore';

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

  // User's rank summary data
  const userRankSummary = parties
    .filter(lb => lb.userRank !== null)
    .map(lb => ({
      leaderboardName: lb.name,
      partyId: lb.partyId,
      rank: lb.userRank!,
      totalMembers: lb.members,
      game: lb.game,
    }));

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
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => router.push('/leaderboardPages/joinParty')}
        >
          <IconSymbol size={26} name="ticket" color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <ThemedText style={styles.loadingText}>Loading parties...</ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Your Rankings Summary */}
        {userRankSummary.length > 0 && (
          <View style={styles.summarySection}>
            <ThemedText style={styles.sectionTitle}>Your Rankings</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryScroll}
            >
              {userRankSummary.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.summaryCard}
                  onPress={() => {
                    const party = parties.find(p => p.partyId === item.partyId);
                    if (party) handleLeaderboardPress(party);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rankBadge, { backgroundColor: getRankColor(item.rank) }]}>
                    <ThemedText style={styles.rankBadgeText}>#{item.rank}</ThemedText>
                  </View>
                  <View style={styles.summaryCardBody}>
                    <View style={styles.summaryCardLeft}>
                      <View style={styles.summaryIconContainer}>
                        <Image
                          source={GAME_LOGOS[item.game] || GAME_LOGOS['Valorant']}
                          style={styles.summaryGameLogo}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                    <View style={styles.summaryCardRight}>
                      <ThemedText style={styles.summaryPartyId} numberOfLines={1}>
                        {item.partyId}
                      </ThemedText>
                      <ThemedText style={styles.summaryGameText}>
                        {item.game}
                      </ThemedText>
                      <ThemedText style={styles.summaryTotalMembers}>
                        {item.totalMembers} players
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Leaderboards */}
        <View style={styles.leaderboardsSection}>
          <ThemedText style={styles.sectionTitle}>Your Parties</ThemedText>

          {parties.length > 0 ? (
            parties.map((leaderboard) => (
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
                Create a new party or join one with an invite code
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
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
    color: '#666',
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
  summarySection: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  summaryScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 180,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rankBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  summaryCardBody: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    alignItems: 'center',
  },
  summaryCardLeft: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCardRight: {
    flex: 1,
    gap: 2,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGameLogo: {
    width: 30,
    height: 30,
  },
  summaryPartyId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },
  summaryGameText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    letterSpacing: -0.1,
  },
  summaryTotalMembers: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
  },
  leaderboardsSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#999',
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