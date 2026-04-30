import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatRankDisplay } from '@/utils/formatRankDisplay';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

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
  bronze: require('@/assets/images/valorantranks/bronze.png'),
  silver: require('@/assets/images/valorantranks/silver.png'),
  gold: require('@/assets/images/valorantranks/gold.png'),
  platinum: require('@/assets/images/valorantranks/platinum.png'),
  diamond: require('@/assets/images/valorantranks/diamond.png'),
  ascendant: require('@/assets/images/valorantranks/ascendant.png'),
  immortal: require('@/assets/images/valorantranks/immortal.png'),
  radiant: require('@/assets/images/valorantranks/radiant.png'),
  unranked: require('@/assets/images/valorantranks/unranked.png'),
  iron1: require('@/assets/images/valorantranks/iron1.png'),
  iron2: require('@/assets/images/valorantranks/iron2.png'),
  iron3: require('@/assets/images/valorantranks/iron3.png'),
  bronze1: require('@/assets/images/valorantranks/bronze1.png'),
  bronze2: require('@/assets/images/valorantranks/bronze2.png'),
  bronze3: require('@/assets/images/valorantranks/bronze3.png'),
  silver1: require('@/assets/images/valorantranks/silver1.png'),
  silver2: require('@/assets/images/valorantranks/silver2.png'),
  silver3: require('@/assets/images/valorantranks/silver3.png'),
  gold1: require('@/assets/images/valorantranks/gold1.png'),
  gold2: require('@/assets/images/valorantranks/gold2.png'),
  gold3: require('@/assets/images/valorantranks/gold3.png'),
  platinum1: require('@/assets/images/valorantranks/platinum1.png'),
  platinum2: require('@/assets/images/valorantranks/platinum2.png'),
  platinum3: require('@/assets/images/valorantranks/platinum3.png'),
  diamond1: require('@/assets/images/valorantranks/diamond1.png'),
  diamond2: require('@/assets/images/valorantranks/diamond2.png'),
  diamond3: require('@/assets/images/valorantranks/diamond3.png'),
  ascendant1: require('@/assets/images/valorantranks/ascendant1.png'),
  ascendant2: require('@/assets/images/valorantranks/ascendant2.png'),
  ascendant3: require('@/assets/images/valorantranks/ascendant3.png'),
  immortal1: require('@/assets/images/valorantranks/immortal1.png'),
  immortal2: require('@/assets/images/valorantranks/immortal2.png'),
  immortal3: require('@/assets/images/valorantranks/immortal3.png'),
};

interface Player {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  isCurrentUser?: boolean;
  currentRank: string;
  lp?: number;
  rr?: number;
  totalGain?: number;
}

// Helper function to get League rank icon
const getLeagueRankIcon = (rank: string) => {
  if (!rank || rank === 'Unranked') {
    return LEAGUE_RANK_ICONS.unranked;
  }
  const tier = rank.split(' ')[0].toLowerCase();
  return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
};

// Helper function to get Valorant rank icon
const getValorantRankIcon = (rank: string) => {
  if (!rank || rank === 'Unranked') {
    return VALORANT_RANK_ICONS.unranked;
  }

  const parts = rank.split(' ');
  const tier = parts[0].toLowerCase();
  const subdivision = parts[1];

  if (subdivision) {
    const subdivisionKey = tier + subdivision;
    if (VALORANT_RANK_ICONS[subdivisionKey]) {
      return VALORANT_RANK_ICONS[subdivisionKey];
    }
  }

  return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
};

// Helper function to calculate League rank value for sorting
const getLeagueRankValue = (currentRank: string, lp: number): number => {
  const rankOrder: { [key: string]: number } = {
    'CHALLENGER': 10,
    'GRANDMASTER': 9,
    'MASTER': 8,
    'DIAMOND': 7,
    'EMERALD': 6,
    'PLATINUM': 5,
    'GOLD': 4,
    'SILVER': 3,
    'BRONZE': 2,
    'IRON': 1,
    'UNRANKED': 0,
  };

  const divisionOrder: { [key: string]: number } = {
    'I': 4,
    'II': 3,
    'III': 2,
    'IV': 1,
  };

  const parts = currentRank.toUpperCase().split(' ');
  const tier = parts[0];
  const division = parts[1] || '';

  const tierValue = rankOrder[tier] || 0;
  const divisionValue = divisionOrder[division] || 0;

  return tierValue * 1000 + divisionValue * 100 + lp;
};

// Helper function to calculate Valorant rank value for sorting
const getValorantRankValue = (currentRank: string, rr: number): number => {
  const rankOrder: { [key: string]: number } = {
    'RADIANT': 9,
    'IMMORTAL': 8,
    'ASCENDANT': 7,
    'DIAMOND': 6,
    'PLATINUM': 5,
    'GOLD': 4,
    'SILVER': 3,
    'BRONZE': 2,
    'IRON': 1,
    'UNRANKED': 0,
  };

  const parts = currentRank.toUpperCase().split(' ');
  const tier = parts[0];
  const division = parts[1] || '0';

  const tierValue = rankOrder[tier] || 0;
  const divisionValue = parseInt(division) || 0;

  return tierValue * 1000 + divisionValue * 100 + rr;
};

// Mock data for preview mode
const MOCK_PLAYERS: Player[] = [
  { rank: 1, userId: 'mock1', username: 'ProGamer123', avatar: '', currentRank: 'Diamond 2', rr: 87, isCurrentUser: false },
  { rank: 2, userId: 'mock2', username: 'xShadowStrike', avatar: '', currentRank: 'Diamond 1', rr: 45, isCurrentUser: true },
  { rank: 3, userId: 'mock3', username: 'NightHawk', avatar: '', currentRank: 'Platinum 3', rr: 92, isCurrentUser: false },
  { rank: 4, userId: 'mock4', username: 'CyberWolf', avatar: '', currentRank: 'Platinum 2', rr: 34, isCurrentUser: false },
  { rank: 5, userId: 'mock5', username: 'PhoenixRising', avatar: '', currentRank: 'Platinum 1', rr: 78, isCurrentUser: false },
];

const MOCK_PARTY_DATA = {
  partyName: 'RANKED GRIND',
  game: 'Valorant',
  members: ['mock1', 'mock2', 'mock3', 'mock4', 'mock5'],
  startDate: '02/15/2026',
  endDate: '03/15/2026',
  challengeStatus: 'completed',
};

export default function LeaderboardResults() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const id = params.id as string;
  const previewMode = params.preview === 'true' || !id;
  const game = (params.game as string) || (previewMode ? 'Valorant' : '');
  const isLeague = game === 'League of Legends' || game === 'League';

  const [partyData, setPartyData] = useState<any>(previewMode ? MOCK_PARTY_DATA : null);
  const [players, setPlayers] = useState<Player[]>(previewMode ? MOCK_PLAYERS : []);
  const [refreshing, setRefreshing] = useState(false);

  // Set up real-time listener
  useEffect(() => {
    if (!id || previewMode) return;

    let unsubscribe: (() => void) | undefined;

    const setupRealtimeListener = async () => {
      try {
        const partyRef = doc(db, 'parties', id);

        unsubscribe = onSnapshot(partyRef, async (docSnapshot) => {
          if (!docSnapshot.exists()) {
            console.log('Leaderboard document no longer exists');
            return;
          }

          const partyDoc = docSnapshot.data();
          setPartyData(partyDoc);

          if (!partyDoc.memberDetails || partyDoc.memberDetails.length === 0) {
            setPlayers([]);
            setRefreshing(false);
            return;
          }

          const gameStatsPath = isLeague ? 'league' : 'valorant';

          const memberPromises = partyDoc.memberDetails.map(async (member: any, index: number) => {
            let stats: any = null;

            try {
              const userStatsDoc = await getDoc(doc(db, 'users', member.userId, 'gameStats', gameStatsPath));
              stats = userStatsDoc.data();

              if (!stats || !stats.currentRank) {
                const userDoc = await getDoc(doc(db, 'users', member.userId));
                const userData = userDoc.data();

                if (isLeague && userData?.riotStats?.rankedSolo) {
                  stats = {
                    currentRank: `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`,
                    lp: userData.riotStats.rankedSolo.leaguePoints || 0,
                    totalGain: 0,
                  };
                } else if (!isLeague && userData?.valorantStats) {
                  stats = {
                    currentRank: userData.valorantStats.currentRank || 'Unranked',
                    rr: userData.valorantStats.rankRating || 0,
                    totalGain: 0,
                  };
                }
              }
            } catch (error) {
              console.log(`Could not fetch stats for member ${member.userId}:`, error);
            }

            return {
              rank: index + 1,
              userId: member.userId,
              username: member.username,
              avatar: member.avatar,
              currentRank: stats?.currentRank || 'Unranked',
              lp: isLeague ? (stats?.lp || 0) : undefined,
              rr: !isLeague ? (stats?.rr || 0) : undefined,
              totalGain: stats?.totalGain || 0,
              isCurrentUser: member.userId === user?.id,
            };
          });

          const fetchedPlayers = await Promise.all(memberPromises);

          fetchedPlayers.sort((a, b) => {
            if (isLeague) {
              const aValue = getLeagueRankValue(a.currentRank, a.lp || 0);
              const bValue = getLeagueRankValue(b.currentRank, b.lp || 0);
              return bValue - aValue;
            } else {
              const aValue = getValorantRankValue(a.currentRank, a.rr || 0);
              const bValue = getValorantRankValue(b.currentRank, b.rr || 0);
              return bValue - aValue;
            }
          });

          fetchedPlayers.forEach((player, index) => {
            player.rank = index + 1;
          });

          setPlayers(fetchedPlayers);
          setRefreshing(false);
        }, (error) => {
          console.error('Error in real-time listener:', error);
          setRefreshing(false);
        });
      } catch (error) {
        console.error('Error setting up real-time listener:', error);
      }
    };

    setupRealtimeListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id, game, isLeague, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const leaderboardName = partyData?.partyName || params.name as string;
  const memberCount = partyData?.members?.length || Number(params.members);

  // Convert to Date helper
  const convertToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    if (dateValue instanceof Date) {
      return dateValue;
    }
    if (typeof dateValue === 'string') {
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const startDate = partyData?.startDate || params.startDate;
  const endDate = partyData?.endDate || params.endDate;

  const formatDate = (dateValue: any): string => {
    const date = convertToDate(dateValue);
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateDuration = (): number | null => {
    const start = convertToDate(startDate);
    const end = convertToDate(endDate);
    if (!start || !end) return null;
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const duration = calculateDuration();
  const coverPhoto = partyData?.coverPhoto;
  const leaderboardIcon = partyData?.partyIcon;
  const gameLogo = GAME_LOGOS[game];

  // Get top 3 players for podium
  const topThree = players.slice(0, 3);
  const remainingPlayers = players.slice(3);

  const handlePlayerPress = (player: Player) => {
    if (previewMode) return; // Don't navigate in preview mode
    if (player.userId === user?.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push({ pathname: '/profilePages/profileView', params: { userId: player.userId, username: player.username || '', avatar: player.avatar || '' } });
    }
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#333';
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c42743" />
        }
      >
        {/* Cover Photo Section */}
        <View style={styles.coverPhotoSection}>
          {/* Header Icons */}
          <View style={styles.headerIconsRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol size={20} name="chevron.left" color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Cover Photo */}
          <View style={styles.coverPhotoWrapper}>
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={styles.coverPhotoImage} />
            ) : (
              <LinearGradient
                colors={['#252525', '#1a1a1a', '#0f0f0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.coverPhotoGradient}
              />
            )}
            <LinearGradient
              colors={['rgba(15, 15, 15, 0.25)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeTop}
            />
            <LinearGradient
              colors={['transparent', '#0f0f0f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeBottom}
            />
          </View>
        </View>

        {/* Preview Banner */}
        {previewMode && (
          <View style={styles.previewBanner}>
            <IconSymbol size={14} name="eye.fill" color="#fff" />
            <ThemedText style={styles.previewBannerText}>Preview Mode - Sample Data</ThemedText>
          </View>
        )}

        {/* Leaderboard Info Section */}
        <View style={styles.leaderboardInfoSection}>
          {/* Completed Badge */}
          <View style={styles.completedBadge}>
            <IconSymbol size={14} name="checkmark.circle.fill" color="#4CAF50" />
            <ThemedText style={styles.completedBadgeText}>Challenge Complete</ThemedText>
          </View>

          {/* Leaderboard Icon */}
          <View style={styles.leaderboardIconWrapper}>
            {leaderboardIcon ? (
              <Image source={{ uri: leaderboardIcon }} style={styles.leaderboardIcon} />
            ) : gameLogo ? (
              <View style={styles.leaderboardIconPlaceholder}>
                <Image source={gameLogo} style={styles.leaderboardIconGameLogo} resizeMode="contain" />
              </View>
            ) : (
              <View style={styles.leaderboardIconPlaceholder}>
                <ThemedText style={styles.leaderboardIconInitial}>{leaderboardName?.[0]?.toUpperCase()}</ThemedText>
              </View>
            )}
          </View>

          {/* Leaderboard Name */}
          <ThemedText style={styles.leaderboardName}>{leaderboardName}</ThemedText>

          {/* Game & Members */}
          <View style={styles.leaderboardMeta}>
            {gameLogo && (
              <Image source={gameLogo} style={styles.gameLogoSmall} resizeMode="contain" />
            )}
            <ThemedText style={styles.leaderboardMetaText}>{game}</ThemedText>
            <View style={styles.metaDot} />
            <ThemedText style={styles.leaderboardMetaText}>{memberCount} {memberCount === 1 ? 'Player' : 'Players'}</ThemedText>
          </View>

          {/* Duration Info */}
          {duration && (
            <View style={styles.durationInfo}>
              <ThemedText style={styles.durationText}>
                {formatDate(startDate)} - {formatDate(endDate)}
              </ThemedText>
              <ThemedText style={styles.durationDays}>{duration} day challenge</ThemedText>
            </View>
          )}
        </View>

        {/* Top 3 Cards Section */}
        {topThree.length > 0 && (
          <View style={styles.topCardsSection}>
            <ThemedText style={styles.sectionTitle}>Final Standings</ThemedText>

            <View style={styles.topCardsContainer}>
              {topThree.map((player, index) => {
                const rankIcon = isLeague
                  ? getLeagueRankIcon(player.currentRank)
                  : getValorantRankIcon(player.currentRank);
                const position = index + 1;
                const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : 'rd';

                return (
                  <TouchableOpacity
                    key={player.userId}
                    style={[
                      styles.topCard,
                      { borderLeftColor: getMedalColor(position) },
                    ]}
                    onPress={() => handlePlayerPress(player)}
                    activeOpacity={0.8}
                  >
                    {/* Left Content */}
                    <View style={styles.topCardLeft}>
                      {/* Player Name */}
                      <ThemedText style={styles.topCardName} numberOfLines={1}>
                        {player.username}
                      </ThemedText>

                      {/* Rank Info Row */}
                      <View style={styles.topCardRankRow}>
                        <Image source={rankIcon} style={styles.topCardRankIcon} resizeMode="contain" />
                        <ThemedText style={styles.topCardRankText}>{formatRankDisplay(player.currentRank)}</ThemedText>
                        <View style={styles.topCardDot} />
                        <ThemedText style={styles.topCardPoints}>
                          {isLeague ? `${player.lp || 0} LP` : `${player.rr || 0} RR`}
                        </ThemedText>
                      </View>

                      {/* Position Number */}
                      <View style={styles.topCardPositionContainer}>
                        <ThemedText style={[styles.topCardPositionNumber, { color: getMedalColor(position) }]}>
                          {position}
                        </ThemedText>
                        <ThemedText style={[styles.topCardPositionSuffix, { color: getMedalColor(position) }]}>
                          {suffix}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Right Content - Avatar */}
                    <View style={styles.topCardRight}>
                      <View style={[styles.topCardAvatar, { borderColor: getMedalColor(position) }]}>
                        {player.avatar && player.avatar.startsWith('http') ? (
                          <Image source={{ uri: player.avatar }} style={styles.topCardAvatarImage} />
                        ) : (
                          <ThemedText style={styles.topCardAvatarText}>
                            {player.username[0].toUpperCase()}
                          </ThemedText>
                        )}
                      </View>
                      {position === 1 && (
                        <View style={styles.topCardCrown}>
                          <IconSymbol size={16} name="crown.fill" color="#FFD700" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* All Participants Section */}
        {remainingPlayers.length > 0 && (
          <View style={styles.participantsSection}>
            <ThemedText style={styles.sectionTitle}>All Participants</ThemedText>

            <View style={styles.participantsList}>
              {remainingPlayers.map((player) => {
                const rankIcon = isLeague
                  ? getLeagueRankIcon(player.currentRank)
                  : getValorantRankIcon(player.currentRank);

                return (
                  <View
                    key={player.userId}
                    style={[
                      styles.participantRow,
                      player.isCurrentUser && styles.currentUserRow,
                    ]}
                  >
                    {/* Rank Number */}
                    <View style={styles.participantRankContainer}>
                      <ThemedText style={styles.participantRankText}>{player.rank}</ThemedText>
                    </View>

                    {/* Player Info */}
                    <TouchableOpacity
                      style={styles.participantInfo}
                      onPress={() => handlePlayerPress(player)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.participantAvatar}>
                        {player.avatar && player.avatar.startsWith('http') ? (
                          <Image source={{ uri: player.avatar }} style={styles.participantAvatarImage} />
                        ) : (
                          <ThemedText style={styles.participantAvatarText}>
                            {player.username[0].toUpperCase()}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText style={styles.participantName} numberOfLines={1}>
                        {player.username}
                      </ThemedText>
                    </TouchableOpacity>

                    {/* Current Rank */}
                    <View style={styles.participantRankInfo}>
                      <Image source={rankIcon} style={styles.participantRankIcon} resizeMode="contain" />
                      <View style={styles.participantRankTextContainer}>
                        <ThemedText style={styles.participantCurrentRank}>
                          {formatRankDisplay(player.currentRank)}
                        </ThemedText>
                        <ThemedText style={styles.participantPoints}>
                          {isLeague ? `${player.lp || 0} LP` : `${player.rr || 0} RR`}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  scrollView: {
    flex: 1,
  },
  // Cover Photo Section
  coverPhotoSection: {
    position: 'relative',
  },
  headerIconsRow: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoWrapper: {
    width: '100%',
    height: 180,
  },
  coverPhotoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  coverPhotoGradient: {
    width: '100%',
    height: '100%',
  },
  coverPhotoFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 1,
  },
  coverPhotoFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 1,
  },
  // Leaderboard Info Section
  leaderboardInfoSection: {
    alignItems: 'center',
    marginTop: -44,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c42743',
    paddingVertical: 8,
    marginBottom: 8,
  },
  previewBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  leaderboardIconWrapper: {
    marginBottom: 14,
  },
  leaderboardIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#0f0f0f',
  },
  leaderboardIconPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    borderWidth: 4,
    borderColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardIconGameLogo: {
    width: 40,
    height: 40,
    opacity: 0.8,
  },
  leaderboardIconInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
  },
  leaderboardName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  leaderboardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  gameLogoSmall: {
    width: 16,
    height: 16,
    opacity: 0.6,
  },
  leaderboardMetaText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#333',
  },
  durationInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  durationText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  durationDays: {
    fontSize: 12,
    color: '#555',
  },
  // Top Cards Section
  topCardsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topCardsContainer: {
    gap: 12,
  },
  topCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    alignItems: 'center',
  },
  topCardLeft: {
    flex: 1,
  },
  topCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  topCardRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  topCardRankIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  topCardRankText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  topCardDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    marginHorizontal: 8,
  },
  topCardPoints: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  topCardPositionContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  topCardPositionNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  topCardPositionSuffix: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 2,
  },
  topCardRight: {
    position: 'relative',
    marginLeft: 16,
  },
  topCardAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
  },
  topCardAvatarImage: {
    width: '100%',
    height: '100%',
  },
  topCardAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#666',
  },
  topCardCrown: {
    position: 'absolute',
    top: -8,
    right: -4,
    backgroundColor: '#0f0f0f',
    borderRadius: 10,
    padding: 2,
  },
  // Participants Section
  participantsSection: {
    paddingHorizontal: 20,
  },
  participantsList: {
    gap: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  currentUserRow: {
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#333',
  },
  participantRankContainer: {
    width: 28,
    alignItems: 'center',
  },
  participantRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  participantAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  participantAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  participantRankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantRankIcon: {
    width: 24,
    height: 24,
  },
  participantRankTextContainer: {
    alignItems: 'flex-end',
  },
  participantCurrentRank: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  participantPoints: {
    fontSize: 10,
    color: '#666',
  },
  bottomSpacer: {
    height: 40,
  },
});
