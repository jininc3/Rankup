import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LeaderboardsTabSkeleton } from '@/components/ui/Skeleton';
import CachedImage from '@/components/ui/CachedImage';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/hooks/useRouter';
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatRankDisplay } from '@/utils/formatRankDisplay';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const [mutualIds, setMutualIds] = useState<Set<string>>(new Set());
  const [leaguePlayers, setLeaguePlayers] = useState<MutualPlayer[]>([]);
  const [valorantPlayers, setValorantPlayers] = useState<MutualPlayer[]>([]);
  const [mutualLoading, setMutualLoading] = useState(true);
  const [selectedMutualGame, setSelectedMutualGame] = useState<'league' | 'valorant'>('league');
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [updatingStats, setUpdatingStats] = useState(false);
  const [lobbyCount, setLobbyCount] = useState(0);

  // Listen for user's active lobbies count
  useEffect(() => {
    if (!user?.id) return;
    const q = query(collection(db, 'parties'), where('members', 'array-contains', user.id));
    const unsub = onSnapshot(q, (snap) => setLobbyCount(snap.size), () => {});
    return unsub;
  }, [user?.id]);

  const fetchMutualsAndStats = async (showLoading: boolean = true) => {
    if (!user?.id) return;
    if ((user.followersCount || 0) === 0 && (user.followingCount || 0) === 0) {
      setMutualLoading(false);
      return;
    }

    try {
      if (showLoading) setMutualLoading(true);
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

      leagueResults.sort((a, b) => getLeagueRankValue(b.currentRank, b.lp) - getLeagueRankValue(a.currentRank, a.lp));
      valorantResults.sort((a, b) => getValorantRankValue(b.currentRank, b.rr) - getValorantRankValue(a.currentRank, a.rr));

      setLeaguePlayers(leagueResults);
      setValorantPlayers(valorantResults);
      setSelectedMutualGame(valorantResults.length > leagueResults.length ? 'valorant' : 'league');
      setMutualLoading(false);
    } catch (error) {
      console.error('Error fetching mutual stats:', error);
      setMutualLoading(false);
    }
  };

  const handleUpdateStats = async () => {
    if (updatingStats) return;
    setUpdatingStats(true);
    try {
      await fetchMutualsAndStats(false);
    } finally {
      setUpdatingStats(false);
    }
  };

  // Fetch mutual follower IDs and their game stats
  useEffect(() => {
    fetchMutualsAndStats();
  }, [user?.id]);

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
        <View style={styles.mutualSectionHeader}>
          <TouchableOpacity
            style={styles.gameSwitchButton}
            onPress={() => otherPlayers.length > 0 && setShowGameDropdown(true)}
            activeOpacity={0.7}
          >
            <View style={styles.gameSwitchGlow} />
            <Image source={gameLogo} style={styles.gameLogoSmall} resizeMode="contain" />
            <ThemedText style={styles.mutualSectionTitle}>{title}</ThemedText>
            {otherPlayers.length > 0 && (
              <IconSymbol size={14} name="chevron.down" color="#666" />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.updateButton, updatingStats && { opacity: 0.5 }]}
            onPress={handleUpdateStats}
            disabled={updatingStats}
            activeOpacity={0.7}
          >
            {updatingStats ? (
              <ActivityIndicator size={12} color="#4da6ff" />
            ) : (
              <IconSymbol size={14} name="arrow.clockwise" color="#4da6ff" />
            )}
            <ThemedText style={styles.updateButtonText}>
              {updatingStats ? 'Updating...' : 'Update'}
            </ThemedText>
          </TouchableOpacity>
        </View>

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
              <TouchableOpacity
                key={player.userId}
                style={[
                  styles.playerRow,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow,
                  { borderLeftWidth: 4, borderLeftColor: getBorderColor(rank) },
                  rank === 1 && styles.firstPlaceRow,
                  player.isCurrentUser && styles.currentUserRow,
                ]}
                activeOpacity={player.isCurrentUser ? 1 : 0.7}
                onPress={() => {
                  if (!player.isCurrentUser) {
                    router.push({
                      pathname: '/profilePages/profileView',
                      params: {
                        userId: player.userId,
                        username: player.username,
                        avatar: player.avatar || '',
                        preloadedFollowing: 'true',
                      },
                    });
                  }
                }}
              >
                {/* Rank Number */}
                <View style={styles.rankContainer}>
                  <ThemedText style={[styles.rankNumberText, rank <= 3 && { color: getBorderColor(rank) }]}>{rank}</ThemedText>
                </View>

                {/* Player Info */}
                <View style={styles.playerInfo}>
                  <View style={[
                    styles.playerAvatarRing,
                    rank <= 3 && { borderColor: getBorderColor(rank), borderWidth: 2 },
                  ]}>
                    <View style={styles.playerAvatar}>
                      {player.avatar ? (
                        <CachedImage uri={player.avatar} style={styles.playerAvatarImage} />
                      ) : (
                        <ThemedText style={styles.avatarText}>
                          {player.username.charAt(0).toUpperCase()}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  <View style={styles.playerNameContainer}>
                    <ThemedText style={[styles.playerName, player.isCurrentUser && styles.currentUserName]} numberOfLines={1}>
                      {player.username}{player.isCurrentUser ? ' (You)' : ''}
                    </ThemedText>
                  </View>
                </View>

                {/* Current Rank with Icon and LP/RR */}
                <View style={styles.rankInfoContainer}>
                  <Image source={rankIcon} style={styles.rankIconSmall} resizeMode="contain" />
                  <View style={styles.rankTextContainer}>
                    <ThemedText style={styles.currentRankText}>
                      {formatRankDisplay(player.currentRank)}{' '}
                      <ThemedText style={styles.rankPointsText}>
                        {isLeague ? `(${player.lp || 0} LP)` : `(${player.rr || 0} RR)`}
                      </ThemedText>
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

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

      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Leaderboards</ThemedText>
        <TouchableOpacity
          style={styles.lobbiesChip}
          onPress={() => router.push('/partyPages/lobbies')}
          activeOpacity={0.7}
        >
          <IconSymbol size={16} name="hexagon" color="#e53935" />
          <ThemedText style={styles.lobbiesChipText}>Lobbies</ThemedText>
          {lobbyCount > 0 && (
            <View style={styles.lobbiesChipBadge}>
              <ThemedText style={styles.lobbiesChipBadgeText}>{lobbyCount}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pageContent}
      >
        {mutualLoading ? (
          <LeaderboardsTabSkeleton />
        ) : leaguePlayers.length + valorantPlayers.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyStateTitle}>No friends to{'\n'}rank yet</ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              Follow users who follow you back to see mutual rankings.
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
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
  },
  createButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
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
    paddingHorizontal: 6,
    paddingTop: 20,
  },
  lobbiesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  lobbiesChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  lobbiesChipBadge: {
    backgroundColor: '#e53935',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  lobbiesChipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  cardsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 8,
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
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#555',
  },
  bottomSpacer: {
    height: 40,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  updateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4da6ff',
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
  gameSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  gameSwitchGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    paddingVertical: 8,
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
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    position: 'relative',
    borderLeftWidth: 3,
  },
  firstPlaceRow: {
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
  currentUserName: {
    color: '#C9A84E',
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
  playerAvatarRing: {
    borderRadius: 18,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 1,
  },
  playerAvatar: {
    width: 28,
    height: 28,
    backgroundColor: '#252525',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
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
    width: 145,
    marginLeft: 'auto',
  },
  rankIconSmall: {
    width: 22,
    height: 22,
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
