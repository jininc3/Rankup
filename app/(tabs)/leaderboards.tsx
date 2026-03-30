import LeaderboardCard from '@/app/components/leaderboardCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LeaderboardCardSkeleton, LeaderboardsTabSkeleton } from '@/components/ui/Skeleton';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// League of Legends rank icon mapping
const LEAGUE_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/leagueranks/iron.png'),
  bronze: require('@/assets/images/leagueranks/bronze.png'),
  silver: require('@/assets/images/leagueranks/silver.png'),
  gold: require('@/assets/images/leagueranks/gold.png'),
  platinum: require('@/assets/images/leagueranks/platinum.png'),
  emerald: require('@/assets/images/leagueranks/emerald.png'),
  diamond: require('@/assets/images/leagueranks/diamond.png'),
  master: require('@/assets/images/leagueranks/masters.png'),
  grandmaster: require('@/assets/images/leagueranks/grandmaster.png'),
  challenger: require('@/assets/images/leagueranks/challenger.png'),
  unranked: require('@/assets/images/leagueranks/unranked.png'),
};

// Valorant rank icon mapping
const VALORANT_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/valorantranks/iron.png'),
  iron1: require('@/assets/images/valorantranks/iron1.png'),
  iron2: require('@/assets/images/valorantranks/iron2.png'),
  iron3: require('@/assets/images/valorantranks/iron3.png'),
  bronze: require('@/assets/images/valorantranks/bronze.png'),
  bronze1: require('@/assets/images/valorantranks/bronze1.png'),
  bronze2: require('@/assets/images/valorantranks/bronze2.png'),
  bronze3: require('@/assets/images/valorantranks/bronze3.png'),
  silver: require('@/assets/images/valorantranks/silver.png'),
  silver1: require('@/assets/images/valorantranks/silver1.png'),
  silver2: require('@/assets/images/valorantranks/silver2.png'),
  silver3: require('@/assets/images/valorantranks/silver3.png'),
  gold: require('@/assets/images/valorantranks/gold.png'),
  gold1: require('@/assets/images/valorantranks/gold1.png'),
  gold2: require('@/assets/images/valorantranks/gold2.png'),
  gold3: require('@/assets/images/valorantranks/gold3.png'),
  platinum: require('@/assets/images/valorantranks/platinum.png'),
  platinum1: require('@/assets/images/valorantranks/platinum1.png'),
  platinum2: require('@/assets/images/valorantranks/platinum2.png'),
  platinum3: require('@/assets/images/valorantranks/platinum3.png'),
  diamond: require('@/assets/images/valorantranks/diamond.png'),
  diamond1: require('@/assets/images/valorantranks/diamond1.png'),
  diamond2: require('@/assets/images/valorantranks/diamond2.png'),
  diamond3: require('@/assets/images/valorantranks/diamond3.png'),
  ascendant: require('@/assets/images/valorantranks/ascendant.png'),
  ascendant1: require('@/assets/images/valorantranks/ascendant1.png'),
  ascendant2: require('@/assets/images/valorantranks/ascendant2.png'),
  ascendant3: require('@/assets/images/valorantranks/ascendant3.png'),
  immortal: require('@/assets/images/valorantranks/immortal.png'),
  immortal1: require('@/assets/images/valorantranks/immortal1.png'),
  immortal2: require('@/assets/images/valorantranks/immortal2.png'),
  immortal3: require('@/assets/images/valorantranks/immortal3.png'),
  radiant: require('@/assets/images/valorantranks/radiant.png'),
  unranked: require('@/assets/images/valorantranks/unranked.png'),
};

const getLeagueRankIcon = (rank: string) => {
  if (!rank || rank === 'Unranked') return LEAGUE_RANK_ICONS.unranked;
  const tier = rank.split(' ')[0].toLowerCase();
  return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
};

const getValorantRankIcon = (rank: string) => {
  if (!rank || rank === 'Unranked') return VALORANT_RANK_ICONS.unranked;
  const parts = rank.split(' ');
  const tier = parts[0].toLowerCase();
  const division = parts[1];
  // Try exact match first (e.g. "platinum1"), then fall back to tier only
  const exactKey = division ? `${tier}${division}` : tier;
  return VALORANT_RANK_ICONS[exactKey] || VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
};

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
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

const MINIMUM_SKELETON_TIME = 800;

interface MutualPlayer {
  userId: string;
  username: string;
  avatar: string | null;
  currentRank: string;
  lp: number;
  rr: number;
  isCurrentUser?: boolean;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'myLeaderboards' | 'leaderboards'>('myLeaderboards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const pagerRef = useRef<ScrollView>(null);
  const [mutualIds, setMutualIds] = useState<Set<string>>(new Set());
  const skeletonStartTime = useRef<number>(Date.now());
  const [leaguePlayers, setLeaguePlayers] = useState<MutualPlayer[]>([]);
  const [valorantPlayers, setValorantPlayers] = useState<MutualPlayer[]>([]);
  const [mutualLoading, setMutualLoading] = useState(true);
  const [selectedMutualGame, setSelectedMutualGame] = useState<'league' | 'valorant'>('league');
  const [showGameDropdown, setShowGameDropdown] = useState(false);

  // Handle tab press - scroll to page
  const handleTabPress = (tab: 'myLeaderboards' | 'leaderboards') => {
    setSelectedTab(tab);
    const pageIndex = tab === 'myLeaderboards' ? 0 : 1;
    pagerRef.current?.scrollTo({ x: pageIndex * SCREEN_WIDTH, animated: true });
  };

  // Handle swipe - update selected tab in real-time
  const handlePageScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const progress = offsetX / SCREEN_WIDTH;
    const newTab = progress >= 0.5 ? 'leaderboards' : 'myLeaderboards';
    if (newTab !== selectedTab) {
      setSelectedTab(newTab);
    }
  };

  // Fetch leaderboards from Firestore
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const partiesRef = collection(db, 'parties');
    const partiesQuery = query(partiesRef, where('members', 'array-contains', user.id));

    const unsubscribe = onSnapshot(partiesQuery, (snapshot) => {
      setLeaderboards((prev) => {
        return snapshot.docs
          .map((docSnapshot) => {
            const data = docSnapshot.data();
            const docId = docSnapshot.id;
            // Only include leaderboard-type entries
            if (data.type === 'party') return null;

            const existing = prev.find(p => p.id === docId);

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
              userRank: existing?.userRank ?? null,
              isJoined: true,
              players: existing?.players || [],
              startDate: data.startDate,
              endDate: data.endDate,
              type: data.type || 'leaderboard',
              coverPhoto: data.coverPhoto || null,
              partyIcon: data.partyIcon || null,
              partyId: data.partyId || docId,
              challengeStatus: data.challengeStatus || 'active',
              challengeParticipants: data.challengeParticipants || [],
            };
          })
          .filter(Boolean);
      });

      const elapsedTime = Date.now() - skeletonStartTime.current;
      const remainingTime = Math.max(0, MINIMUM_SKELETON_TIME - elapsedTime);
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Calculate user's rank in each leaderboard
  useEffect(() => {
    if (!user?.id || leaderboards.length === 0) return;

    const calculateRanks = async () => {
      const updated = await Promise.all(
        leaderboards.map(async (lb) => {
          try {
            if (!lb.id) return lb;

            const partyDocRef = doc(db, 'parties', lb.id);
            const partySnapshot = await getDoc(partyDocRef);

            if (!partySnapshot.exists() || !partySnapshot.data().memberDetails) {
              return lb;
            }

            const partyData = partySnapshot.data();
            const memberDetails = partyData.memberDetails;
            const isLeague = lb.game === 'League of Legends';
            const gameStatsPath = isLeague ? 'league' : 'valorant';

            const memberStatsPromises = memberDetails.map(async (member: any) => {
              const gameStatsDoc = await getDoc(doc(db, 'users', member.userId, 'gameStats', gameStatsPath));
              let stats = gameStatsDoc.data();

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

            const allMemberStats = await Promise.all(memberStatsPromises);

            // When challenge is active, rank only among challenge participants
            const challengeParticipants: string[] = partyData.challengeParticipants || [];
            const isActiveChallenge = partyData.challengeStatus === 'active' && challengeParticipants.length > 0;

            const memberStats = isActiveChallenge
              ? allMemberStats.filter(m => challengeParticipants.includes(m.userId))
              : allMemberStats;

            memberStats.sort((a, b) => {
              if (isLeague) {
                return getLeagueRankValue(b.currentRank, b.lp) - getLeagueRankValue(a.currentRank, a.lp);
              } else {
                return getValorantRankValue(b.currentRank, b.rr) - getValorantRankValue(a.currentRank, a.rr);
              }
            });

            const userRank = memberStats.findIndex(m => m.userId === user.id) + 1;

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
                } catch {
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
              ...lb,
              userRank: userRank > 0 ? userRank : null,
              players: topPlayers,
            };
          } catch (error) {
            console.error(`Error calculating rank for leaderboard ${lb.partyId}:`, error);
            return lb;
          }
        })
      );

      setLeaderboards(updated);
    };

    calculateRanks();
  }, [leaderboards.length, user?.id]);

  // Fetch mutual follower IDs and their game stats
  useEffect(() => {
    if (!user?.id) return;

    const fetchMutualsAndStats = async () => {
      try {
        setMutualLoading(true);
        const followersRef = collection(db, 'users', user.id, 'followers');
        const followingRef = collection(db, 'users', user.id, 'following');

        const [followersSnapshot, followingSnapshot] = await Promise.all([
          getDocs(followersRef),
          getDocs(followingRef),
        ]);

        const followerIds = new Set(followersSnapshot.docs.map(d => d.data().followerId));
        const followingIds = new Set(followingSnapshot.docs.map(d => d.data().followingId));

        const mutuals = new Set([...followerIds].filter(id => followingIds.has(id)));
        setMutualIds(mutuals);

        // Fetch game stats for all mutuals + current user
        const allUserIds = [...mutuals, user.id];

        const leagueResults: MutualPlayer[] = [];
        const valorantResults: MutualPlayer[] = [];

        await Promise.all(
          allUserIds.map(async (userId) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              const userData = userDoc.data();
              const username = userData?.username || 'User';
              const avatar = userData?.avatar || null;

              // League stats
              const leagueStatsDoc = await getDoc(doc(db, 'users', userId, 'gameStats', 'league'));
              let leagueStats = leagueStatsDoc.data();

              if (!leagueStats?.currentRank && userData?.riotStats?.rankedSolo) {
                leagueStats = {
                  currentRank: `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`,
                  lp: userData.riotStats.rankedSolo.leaguePoints || 0,
                };
              }

              if (leagueStats?.currentRank && leagueStats.currentRank !== 'Unranked') {
                leagueResults.push({
                  userId,
                  username,
                  avatar,
                  currentRank: leagueStats.currentRank,
                  lp: leagueStats.lp || 0,
                  rr: 0,
                  isCurrentUser: userId === user.id,
                });
              }

              // Valorant stats
              const valStatsDoc = await getDoc(doc(db, 'users', userId, 'gameStats', 'valorant'));
              let valStats = valStatsDoc.data();

              if (!valStats?.currentRank && userData?.valorantStats) {
                valStats = {
                  currentRank: userData.valorantStats.currentRank || 'Unranked',
                  rr: userData.valorantStats.rankRating || 0,
                };
              }

              if (valStats?.currentRank && valStats.currentRank !== 'Unranked') {
                valorantResults.push({
                  userId,
                  username,
                  avatar,
                  currentRank: valStats.currentRank,
                  lp: 0,
                  rr: valStats.rr || 0,
                  isCurrentUser: userId === user.id,
                });
              }
            } catch (error) {
              console.error(`Error fetching stats for user ${userId}:`, error);
            }
          })
        );

        // Sort by rank
        leagueResults.sort((a, b) => getLeagueRankValue(b.currentRank, b.lp) - getLeagueRankValue(a.currentRank, a.lp));
        valorantResults.sort((a, b) => getValorantRankValue(b.currentRank, b.rr) - getValorantRankValue(a.currentRank, a.rr));

        setLeaguePlayers(leagueResults);
        setValorantPlayers(valorantResults);
        // Default to whichever game has more players
        setSelectedMutualGame(valorantResults.length > leagueResults.length ? 'valorant' : 'league');
        setMutualLoading(false);
      } catch (error) {
        console.error('Error fetching mutual stats:', error);
        setMutualLoading(false);
      }
    };

    fetchMutualsAndStats();
  }, [user?.id]);

  const handleLeaderboardPress = (leaderboard: any) => {
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
  };

  const getBorderColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#333';
  };

  const renderMutualLeaderboard = (players: MutualPlayer[], game: 'league' | 'valorant') => {
    if (players.length === 0) return null;

    const isLeague = game === 'league';
    const title = isLeague ? 'League of Legends' : 'Valorant';
    const gameLogo = isLeague ? GAME_LOGOS['League of Legends'] : GAME_LOGOS['Valorant'];
    const otherGame = isLeague ? 'valorant' : 'league';
    const otherTitle = isLeague ? 'Valorant' : 'League of Legends';
    const otherLogo = isLeague ? GAME_LOGOS['Valorant'] : GAME_LOGOS['League of Legends'];
    const otherPlayers = isLeague ? valorantPlayers : leaguePlayers;

    return (
      <View style={styles.mutualSection}>
        <TouchableOpacity
          style={styles.mutualSectionHeader}
          onPress={() => otherPlayers.length > 0 && setShowGameDropdown(true)}
          activeOpacity={0.7}
        >
          <Image source={gameLogo} style={styles.gameLogoSmall} resizeMode="contain" />
          <ThemedText style={styles.mutualSectionTitle}>{title}</ThemedText>
          {otherPlayers.length > 0 && (
            <IconSymbol size={18} name="chevron.down" color="#888" style={{ marginRight: 10 }} />
          )}
        </TouchableOpacity>

        {/* Column Headers */}
        <View style={styles.columnHeaders}>
          <ThemedText style={[styles.columnHeaderText, { width: 40 }]}>RANK</ThemedText>
          <ThemedText style={[styles.columnHeaderText, { flex: 1, paddingLeft: 40 }]}>PLAYER</ThemedText>
          <ThemedText style={[styles.columnHeaderText, { width: 130, marginLeft: 'auto', textAlign: 'center' }]}>
            CURRENT RANK
          </ThemedText>
        </View>

        {/* Player Rows */}
        <View style={styles.playerList}>
          {players.map((player, index) => {
            const rankIcon = isLeague
              ? getLeagueRankIcon(player.currentRank)
              : getValorantRankIcon(player.currentRank);
            const rank = index + 1;

            return (
              <View
                key={player.userId}
                style={[
                  styles.playerRow,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow,
                  player.isCurrentUser && styles.currentUserRow,
                  { borderLeftWidth: 4, borderLeftColor: getBorderColor(rank) },
                ]}
              >
                {/* Rank Number */}
                <View style={styles.rankContainer}>
                  <ThemedText style={styles.rankNumberText}>{rank}</ThemedText>
                </View>

                {/* Player Info */}
                <View style={styles.playerInfo}>
                  <View style={styles.playerAvatar}>
                    {player.avatar ? (
                      <Image source={{ uri: player.avatar }} style={styles.playerAvatarImage} />
                    ) : (
                      <ThemedText style={styles.avatarText}>
                        {player.username.charAt(0).toUpperCase()}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.playerNameContainer}>
                    <ThemedText style={styles.playerName} numberOfLines={1}>
                      {player.username}{player.isCurrentUser ? ' (You)' : ''}
                    </ThemedText>
                  </View>
                </View>

                {/* Current Rank with Icon and LP/RR */}
                <View style={styles.rankInfoContainer}>
                  <Image source={rankIcon} style={styles.rankIconSmall} resizeMode="contain" />
                  <View style={styles.rankTextContainer}>
                    <ThemedText style={styles.currentRankText}>
                      {player.currentRank}
                    </ThemedText>
                    <ThemedText style={styles.rankPointsText}>
                      {isLeague ? `${player.lp || 0} lp` : `${player.rr || 0} rr`}
                    </ThemedText>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Leaderboards</ThemedText>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <IconSymbol size={20} name="plus" color="#fff" />
        </TouchableOpacity>
      </View>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress('myLeaderboards')}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.tabText, selectedTab === 'myLeaderboards' && styles.tabTextActive]}>
            LEADERBOARDS
          </ThemedText>
        </TouchableOpacity>
        <View style={styles.tabDivider} />
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress('leaderboards')}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.tabText, selectedTab === 'leaderboards' && styles.tabTextActive]}>
            MY LEADERBOARDS
          </ThemedText>
          <ThemedText style={[styles.tabCount, selectedTab === 'leaderboards' && styles.tabCountActive]}>
            {loading ? '-' : leaderboards.length}
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
        {/* Leaderboards Page (mutual followers) */}
        <ScrollView
          style={[styles.pageContainer, { width: SCREEN_WIDTH }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pageContent}
        >
          {/* Spacer where game filters used to be */}
          <View style={{ height: 10 }} />

          {mutualLoading ? (
            <LeaderboardsTabSkeleton />
          ) : leaguePlayers.length + valorantPlayers.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>No friends to rank</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Follow users who follow you back to see mutual rankings
              </ThemedText>
            </View>
          ) : (
            <View>
              {(() => {
                const activePlayers = selectedMutualGame === 'league' ? leaguePlayers : valorantPlayers;
                const fallbackGame = selectedMutualGame === 'league' ? 'valorant' : 'league';
                const fallbackPlayers = selectedMutualGame === 'league' ? valorantPlayers : leaguePlayers;
                if (activePlayers.length > 0) {
                  return renderMutualLeaderboard(activePlayers, selectedMutualGame);
                }
                return renderMutualLeaderboard(fallbackPlayers, fallbackGame);
              })()}
            </View>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* My Leaderboards Page (competitive) */}
        <ScrollView
          style={[styles.pageContainer, { width: SCREEN_WIDTH }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pageContent}
        >
          {loading ? (
            <View>
              {[1, 2, 3].map((i) => (
                <LeaderboardCardSkeleton key={i} />
              ))}
            </View>
          ) : leaderboards.length > 0 ? (
            <View>
              {leaderboards.map((leaderboard, index) => (
                <LeaderboardCard
                  key={leaderboard.id}
                  leaderboard={leaderboard}
                  onPress={handleLeaderboardPress}
                  showDivider={index < leaderboards.length - 1}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>No leaderboards yet</ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Create a leaderboard to compete with friends
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

      {/* Game Switcher Modal */}
      <Modal
        visible={showGameDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGameDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGameDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>SWITCH GAME</ThemedText>
            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.gameSwitchOption}
              onPress={() => {
                setSelectedMutualGame('league');
                setShowGameDropdown(false);
              }}
              activeOpacity={0.7}
            >
              <Image source={GAME_LOGOS['League of Legends']} style={styles.gameSwitchLogo} resizeMode="contain" />
              <ThemedText style={[styles.gameSwitchText, selectedMutualGame === 'league' && styles.gameSwitchTextActive]}>
                League of Legends
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gameSwitchOption}
              onPress={() => {
                setSelectedMutualGame('valorant');
                setShowGameDropdown(false);
              }}
              activeOpacity={0.7}
            >
              <Image source={GAME_LOGOS['Valorant']} style={styles.gameSwitchLogo} resizeMode="contain" />
              <ThemedText style={[styles.gameSwitchText, selectedMutualGame === 'valorant' && styles.gameSwitchTextActive]}>
                Valorant
              </ThemedText>
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
  createButtonPlaceholder: {
    width: 36,
    height: 36,
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
    paddingTop: 2,
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
  // Mutual leaderboard styles
  mutualSection: {
    marginBottom: 20,
  },
  mutualSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  gameLogoSmall: {
    width: 24,
    height: 24,
  },
  mutualSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
    flex: 1,
  },
  gameSwitchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  gameSwitchLogo: {
    width: 28,
    height: 28,
  },
  gameSwitchText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    flex: 1,
  },
  gameSwitchTextActive: {
    color: '#fff',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 0,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  columnHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  alignRight: {
    textAlign: 'right',
  },
  playerList: {
    paddingHorizontal: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    position: 'relative',
    borderLeftWidth: 3,
  },
  evenRow: {
    backgroundColor: '#141414',
  },
  oddRow: {
    backgroundColor: '#1a1a1a',
  },
  currentUserRow: {
    backgroundColor: '#252525',
  },
  rankContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  rankNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    backgroundColor: '#252525',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  avatarText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#888',
  },
  playerNameContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  rankInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 130,
    marginLeft: 'auto',
  },
  rankIconSmall: {
    width: 26,
    height: 26,
  },
  rankTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  currentRankText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 14,
  },
  rankPointsText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
    lineHeight: 13,
  },
  // Modal styles
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
