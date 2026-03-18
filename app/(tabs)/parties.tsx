import PartyCards from '@/app/components/partyCards';
import LeaderboardCard from '@/app/components/leaderboardCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PartyCardSkeleton, LeaderboardCardSkeleton } from '@/components/ui/Skeleton';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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

// Minimum time to show skeleton for smooth UX transition
const MINIMUM_SKELETON_TIME = 800;

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'parties' | 'leaderboards'>('parties');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const pagerRef = useRef<ScrollView>(null);
  const [mutualIds, setMutualIds] = useState<Set<string>>(new Set());
  const skeletonStartTime = useRef<number>(Date.now());

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
      setParties((prevParties) => {
        const fetchedParties = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          const docId = docSnapshot.id;

          // Check if we already have this party with player data
          const existingParty = prevParties.find(p => p.id === docId);

          return {
            id: docId,
            name: data.partyName,
            game: data.game,
            members: data.members?.length || 0,
            maxMembers: data.maxMembers || 10,
            memberIds: data.members || [],
            memberDetails: data.memberDetails || [],
            description: `Created on ${data.startDate}`,
            icon: data.game === 'Valorant' ? '🎯' : data.game === 'League of Legends' ? '💎' : '🎮',
            userRank: existingParty?.userRank ?? null,
            isJoined: true,
            players: existingParty?.players || [],
            startDate: data.startDate,
            endDate: data.endDate,
            type: data.type || 'leaderboard',
            coverPhoto: data.coverPhoto || null,
            partyIcon: data.partyIcon || null,
            partyId: data.partyId || docId,
            mutualFollowers: existingParty?.mutualFollowers || [],
            challengeStatus: data.challengeStatus || 'active',
          };
        });

        return fetchedParties;
      });

      // Ensure skeleton shows for minimum time for smooth transition
      const elapsedTime = Date.now() - skeletonStartTime.current;
      const remainingTime = Math.max(0, MINIMUM_SKELETON_TIME - elapsedTime);
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
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

            // Get top 3 players with their profile photos for the stacked avatars
            const topPlayers = await Promise.all(
              memberStats.slice(0, 3).map(async (member) => {
                try {
                  const userDoc = await getDoc(doc(db, 'users', member.userId));
                  const userData = userDoc.data();
                  return {
                    odId: member.userId,
                    displayName: userData?.displayName || userData?.username || 'User',
                    username: userData?.username || '',
                    photoUrl: userData?.avatar || null,
                  };
                } catch (error) {
                  // Handle permission errors gracefully - return placeholder data
                  return {
                    odId: member.userId,
                    displayName: 'User',
                    username: '',
                    photoUrl: null,
                  };
                }
              })
            );

            return {
              ...party,
              userRank: userRank > 0 ? userRank : null,
              players: topPlayers,
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

  // Fetch mutual follower IDs once
  useEffect(() => {
    if (!user?.id) return;

    const fetchMutualIds = async () => {
      try {
        const followersRef = collection(db, 'users', user.id, 'followers');
        const followingRef = collection(db, 'users', user.id, 'following');

        const [followersSnapshot, followingSnapshot] = await Promise.all([
          getDocs(followersRef),
          getDocs(followingRef),
        ]);

        const followerIds = new Set(followersSnapshot.docs.map(doc => doc.data().followerId));
        const followingIds = new Set(followingSnapshot.docs.map(doc => doc.data().followingId));

        // Find mutual followers (intersection)
        const mutuals = new Set([...followerIds].filter(id => followingIds.has(id)));
        setMutualIds(mutuals);
      } catch (error) {
        console.error('Error fetching mutual IDs:', error);
      }
    };

    fetchMutualIds();
  }, [user?.id]);

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

  // Filter parties by type and add mutual followers for party-type
  const partyTypeParties = parties
    .filter(party => party.type === 'party')
    .map(party => {
      const memberDetails = party.memberDetails || [];
      const mutualFollowersInParty = memberDetails
        .filter((member: any) => member.userId !== user?.id && mutualIds.has(member.userId))
        .slice(0, 3)
        .map((member: any) => ({
          odId: member.userId,
          displayName: member.username || 'User',
          username: member.username || '',
          photoUrl: member.avatar || null,
        }));
      return {
        ...party,
        mutualFollowers: mutualFollowersInParty,
      };
    });
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
      // Leaderboard type - check if challenge is completed
      if (leaderboard.challengeStatus === 'completed') {
        router.push({
          pathname: '/partyPages/leaderboardResults',
          params: {
            name: leaderboard.name,
            icon: leaderboard.icon,
            game: leaderboard.game,
            members: leaderboard.members.toString(),
            id: leaderboard.id,
            startDate: leaderboard.startDate,
            endDate: leaderboard.endDate,
          },
        });
      } else {
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
      {/* Tabs - Always visible */}
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
            {loading ? '-' : partyTypeParties.length}
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
            {loading ? '-' : leaderboardTypeParties.length}
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
          {loading ? (
            <View style={styles.cardsContainer}>
              {[1, 2, 3].map((i) => (
                <PartyCardSkeleton key={i} />
              ))}
            </View>
          ) : partyTypeParties.length > 0 ? (
            <View style={styles.cardsContainer}>
              {partyTypeParties.map((leaderboard, index) => (
                <PartyCards
                  key={leaderboard.id}
                  leaderboard={leaderboard}
                  onPress={handleLeaderboardPress}
                  showDivider={index < partyTypeParties.length - 1}
                />
              ))}
            </View>
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
          {loading ? (
            <View style={styles.cardsContainer}>
              {[1, 2, 3].map((i) => (
                <LeaderboardCardSkeleton key={i} />
              ))}
            </View>
          ) : leaderboardTypeParties.length > 0 ? (
            <View style={styles.cardsContainer}>
              {leaderboardTypeParties.map((leaderboard, index) => (
                <LeaderboardCard
                  key={leaderboard.id}
                  leaderboard={leaderboard}
                  onPress={handleLeaderboardPress}
                  showDivider={index < leaderboardTypeParties.length - 1}
                />
              ))}
            </View>
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
            <ThemedText style={styles.modalTitle}>CREATE</ThemedText>
            <View style={styles.modalDivider} />

            {/* Party Option */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowCreateModal(false);
                router.push('/partyPages/createParty');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <IconSymbol size={22} name="person.2.fill" color="#fff" />
              </View>
              <View style={styles.modalOptionText}>
                <ThemedText style={styles.modalOptionTitle}>PARTY</ThemedText>
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
                <ThemedText style={styles.modalOptionTitle}>LEADERBOARD</ThemedText>
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
  pagerContainer: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: '95%',
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