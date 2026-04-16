import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

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
  const subdivision = parts[1];
  if (subdivision) {
    const key = tier + subdivision;
    if (VALORANT_RANK_ICONS[key]) return VALORANT_RANK_ICONS[key];
  }
  return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
};

const getLeagueRankValue = (currentRank: string, lp: number): number => {
  const rankOrder: { [key: string]: number } = {
    'CHALLENGER': 10, 'GRANDMASTER': 9, 'MASTER': 8, 'DIAMOND': 7,
    'EMERALD': 6, 'PLATINUM': 5, 'GOLD': 4, 'SILVER': 3, 'BRONZE': 2, 'IRON': 1, 'UNRANKED': 0,
  };
  const divisionOrder: { [key: string]: number } = { 'I': 4, 'II': 3, 'III': 2, 'IV': 1 };
  const parts = currentRank.toUpperCase().split(' ');
  return (rankOrder[parts[0]] || 0) * 1000 + (divisionOrder[parts[1] || ''] || 0) * 100 + lp;
};

const getValorantRankValue = (currentRank: string, rr: number): number => {
  const rankOrder: { [key: string]: number } = {
    'RADIANT': 9, 'IMMORTAL': 8, 'ASCENDANT': 7, 'DIAMOND': 6,
    'PLATINUM': 5, 'GOLD': 4, 'SILVER': 3, 'BRONZE': 2, 'IRON': 1, 'UNRANKED': 0,
  };
  const parts = currentRank.toUpperCase().split(' ');
  return (rankOrder[parts[0]] || 0) * 1000 + (parseInt(parts[1]) || 0) * 100 + rr;
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
}

export default function ChallengeDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const id = params.id as string;
  const game = params.game as string;
  const isLeague = game === 'League of Legends' || game === 'League';

  const [partyData, setPartyData] = useState<any>(null);
  const [participants, setParticipants] = useState<Player[]>([]);
  const [spectators, setSpectators] = useState<Player[]>([]);
  const [startingChallenge, setStartingChallenge] = useState(false);

  const isCreator = partyData?.createdBy === user?.id;
  const challengeStatus = partyData?.challengeStatus || 'none';
  const isPending = challengeStatus === 'pending';
  const isActive = challengeStatus === 'active';
  const challengeParticipants: string[] = partyData?.challengeParticipants || [];
  const challengeInvites: any[] = partyData?.challengeInvites || [];

  // Convert date helper
  const convertToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue.toDate && typeof dateValue.toDate === 'function') return dateValue.toDate();
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string') {
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
        if (!isNaN(d.getTime())) return d;
      }
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const formatDisplayDate = (dateValue: any): string => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = convertToDate(dateValue);
    if (!d) return String(dateValue);
    return `${d.getDate()}${months[d.getMonth()]}${String(d.getFullYear()).slice(-2)}`;
  };

  const calculateDaysRemaining = () => {
    const start = convertToDate(partyData?.startDate);
    const end = convertToDate(partyData?.endDate);
    if (!start || !end) return null;
    const today = new Date();
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const msLeft = Math.max(0, end.getTime() - today.getTime());
    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    return { currentDay: Math.max(1, Math.min(currentDay, totalDays)), totalDays, daysLeft, hoursLeft };
  };

  const daysInfo = calculateDaysRemaining();
  const progress = daysInfo ? (daysInfo.currentDay / daysInfo.totalDays) * 100 : 0;

  // Real-time listener
  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'parties', id), async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      setPartyData(data);

      const activeParticipants: string[] = data.challengeParticipants || [];
      const memberDetails: any[] = data.memberDetails || [];
      const allMemberIds: string[] = data.members || [];

      // Fetch stats for all members
      const fetchPlayer = async (userId: string): Promise<Player> => {
        const member = memberDetails.find((m: any) => m.userId === userId);
        try {
          const gameStatsPath = isLeague ? 'league' : 'valorant';
          const statsDoc = await getDoc(doc(db, 'users', userId, 'gameStats', gameStatsPath));
          const stats = statsDoc.data();

          let currentRank = stats?.currentRank || 'Unranked';
          let lp = stats?.lp || 0;
          let rr = stats?.rr || 0;

          if (!stats?.currentRank) {
            const userDoc = await getDoc(doc(db, 'users', userId));
            const userData = userDoc.data();
            if (isLeague && userData?.riotStats?.rankedSolo) {
              currentRank = `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`;
              lp = userData.riotStats.rankedSolo.leaguePoints || 0;
            } else if (!isLeague && userData?.valorantStats) {
              currentRank = userData.valorantStats.currentRank || 'Unranked';
              rr = userData.valorantStats.rankRating || 0;
            }
          }

          return { rank: 0, userId, username: member?.username || 'Unknown', avatar: member?.avatar || '', isCurrentUser: userId === user?.id, currentRank, lp, rr };
        } catch {
          return { rank: 0, userId, username: member?.username || 'Unknown', avatar: member?.avatar || '', isCurrentUser: userId === user?.id, currentRank: 'Unranked', lp: 0, rr: 0 };
        }
      };

      const sortPlayers = (players: Player[]) => {
        players.sort((a, b) => {
          if (isLeague) return getLeagueRankValue(b.currentRank, b.lp || 0) - getLeagueRankValue(a.currentRank, a.lp || 0);
          return getValorantRankValue(b.currentRank, b.rr || 0) - getValorantRankValue(a.currentRank, a.rr || 0);
        });
      };

      // Fetch participants
      const participantPlayers = await Promise.all(activeParticipants.map(fetchPlayer));
      sortPlayers(participantPlayers);
      participantPlayers.forEach((p, i) => { p.rank = i + 1; });
      setParticipants(participantPlayers);

      // Fetch spectators (members not in challenge)
      const spectatorIds = allMemberIds.filter((uid: string) => !activeParticipants.includes(uid));
      const spectatorPlayers = await Promise.all(spectatorIds.map(fetchPlayer));
      sortPlayers(spectatorPlayers);
      setSpectators(spectatorPlayers);
    });
    return () => unsubscribe();
  }, [id, user?.id]);

  const handleStartChallenge = async () => {
    if (!id || !isCreator) return;
    if (challengeParticipants.length < 2) {
      Alert.alert('Not Enough Participants', 'At least 2 people must accept the challenge before you can start.');
      return;
    }

    Alert.alert('Start Challenge', `Start with ${challengeParticipants.length} participants? The timer will begin.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: async () => {
        setStartingChallenge(true);
        try {
          const partyRef = doc(db, 'parties', id);
          const duration = partyData?.duration || 30;
          const now = new Date();
          const end = new Date(now);
          end.setDate(end.getDate() + duration);
          const fmt = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

          let startingStats: any[] = [];
          if ((partyData?.challengeType || 'climbing') === 'climbing') {
            const gameStatsPath = isLeague ? 'league' : 'valorant';
            startingStats = await Promise.all(challengeParticipants.map(async (userId: string) => {
              try {
                const statsDoc = await getDoc(doc(db, 'users', userId, 'gameStats', gameStatsPath));
                const stats = statsDoc.data();
                return { userId, lp: isLeague ? (stats?.lp || 0) : 0, rr: !isLeague ? (stats?.rr || 0) : 0 };
              } catch { return { userId, lp: 0, rr: 0 }; }
            }));
          }

          await updateDoc(partyRef, {
            challengeStatus: 'active',
            startDate: fmt(now),
            endDate: fmt(end),
            pendingInvites: [],
            startingStats,
          });
        } catch (error) {
          console.error('Error starting challenge:', error);
          Alert.alert('Error', 'Failed to start challenge');
        } finally {
          setStartingChallenge(false);
        }
      }},
    ]);
  };

  const getBorderColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#333';
  };

  const handlePlayerPress = (player: Player) => {
    if (player.isCurrentUser) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profilePages/profileView?userId=${player.userId}`);
    }
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol size={20} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Challenge</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        {/* Info Grid */}
        <View style={styles.infoSection}>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <ThemedText style={styles.gridLabel}>TYPE</ThemedText>
              <View style={styles.gridValueRow}>
                <IconSymbol size={14} name={partyData?.challengeType === 'rank' ? 'trophy.fill' : 'chart.line.uptrend.xyaxis'} color="#fff" />
                <ThemedText style={styles.gridValue}>
                  {partyData?.challengeType === 'rank' ? 'Highest Rank' : isLeague ? 'LP Climbing' : 'RR Climbing'}
                </ThemedText>
              </View>
            </View>
            <View style={styles.gridItem}>
              <ThemedText style={styles.gridLabel}>DURATION</ThemedText>
              <ThemedText style={styles.gridValue}>{partyData?.duration || 30} days</ThemedText>
            </View>
            <View style={styles.gridItem}>
              <ThemedText style={styles.gridLabel}>STARTED</ThemedText>
              <ThemedText style={styles.gridValue}>
                {isActive && partyData?.startDate ? formatDisplayDate(partyData.startDate) : '—'}
              </ThemedText>
            </View>
            <View style={styles.gridItem}>
              <ThemedText style={styles.gridLabel}>PARTICIPANTS</ThemedText>
              <ThemedText style={styles.gridValue}>{challengeParticipants.length}</ThemedText>
            </View>
          </View>

          {/* Progress bar */}
          {isActive && daysInfo && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <ThemedText style={styles.progressLabel}>Progress</ThemedText>
                <ThemedText style={styles.progressDays}>
                  {daysInfo.daysLeft <= 1 ? `${daysInfo.hoursLeft}h left` : `${daysInfo.daysLeft}d left`}
                </ThemedText>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}

          {/* Start button for pending */}
          {isPending && isCreator && (
            <TouchableOpacity
              style={[styles.startButton, startingChallenge && { opacity: 0.5 }]}
              onPress={handleStartChallenge}
              disabled={startingChallenge}
              activeOpacity={0.8}
            >
              {startingChallenge ? (
                <ActivityIndicator size={14} color="#000" />
              ) : (
                <IconSymbol size={14} name="play.fill" color="#000" />
              )}
              <ThemedText style={styles.startButtonText}>
                {startingChallenge ? 'Starting...' : 'Start Challenge'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Participants Table */}
        {participants.length > 0 && (
          <>
            <View style={styles.columnHeaders}>
              <ThemedText style={[styles.columnHeaderText, { width: 40 }]}>RANK</ThemedText>
              <ThemedText style={[styles.columnHeaderText, { flex: 1, paddingLeft: 40 }]}>PLAYER</ThemedText>
              <ThemedText style={[styles.columnHeaderText, { width: 130, marginLeft: 'auto', textAlign: 'center' }]}>
                CURRENT RANK
              </ThemedText>
            </View>

            <View style={styles.playerList}>
              {participants.map((player, index) => {
                const rankIcon = isLeague ? getLeagueRankIcon(player.currentRank) : getValorantRankIcon(player.currentRank);
                return (
                  <TouchableOpacity
                    key={player.userId}
                    style={[
                      styles.playerRow,
                      index % 2 === 0 ? styles.evenRow : styles.oddRow,
                      player.isCurrentUser && styles.currentUserRow,
                      { borderLeftWidth: 4, borderLeftColor: getBorderColor(player.rank) },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handlePlayerPress(player)}
                  >
                    <View style={styles.rankContainer}>
                      <ThemedText style={styles.rankText}>{player.rank}</ThemedText>
                    </View>
                    <View style={styles.playerInfo}>
                      <View style={styles.playerAvatar}>
                        {player.avatar && player.avatar.startsWith('http') ? (
                          <Image source={{ uri: player.avatar }} style={styles.playerAvatarImage} />
                        ) : (
                          <ThemedText style={styles.avatarText}>{player.username?.[0]?.toUpperCase()}</ThemedText>
                        )}
                      </View>
                      <ThemedText style={styles.playerName} numberOfLines={1}>{player.username}</ThemedText>
                    </View>
                    <View style={styles.rankInfoContainer}>
                      <Image source={rankIcon} style={styles.rankIconSmall} resizeMode="contain" />
                      <View style={styles.rankTextContainer}>
                        <ThemedText style={styles.currentRankText}>
                          {player.currentRank}{' '}
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
          </>
        )}

        {/* Spectators Section */}
        {spectators.length > 0 && isActive && (
          <View style={styles.spectatorsSection}>
            <View style={styles.spectatorsHeaderRow}>
              <IconSymbol size={14} name="eye.fill" color="#555" />
              <ThemedText style={styles.spectatorsHeaderText}>Spectators</ThemedText>
            </View>
            {spectators.map((spectator, index) => {
              const rankIcon = isLeague ? getLeagueRankIcon(spectator.currentRank) : getValorantRankIcon(spectator.currentRank);
              return (
                <View
                  key={spectator.userId}
                  style={[
                    styles.playerRow,
                    index % 2 === 0 ? styles.evenRow : styles.oddRow,
                    spectator.isCurrentUser && styles.currentUserRow,
                    { borderLeftWidth: 4, borderLeftColor: '#333', marginHorizontal: 16 },
                  ]}
                >
                  <View style={styles.rankContainer}>
                    <ThemedText style={[styles.rankText, { color: '#444' }]}>—</ThemedText>
                  </View>
                  <View style={styles.playerInfo}>
                    <View style={styles.playerAvatar}>
                      {spectator.avatar && spectator.avatar.startsWith('http') ? (
                        <Image source={{ uri: spectator.avatar }} style={styles.playerAvatarImage} />
                      ) : (
                        <ThemedText style={styles.avatarText}>{spectator.username?.[0]?.toUpperCase()}</ThemedText>
                      )}
                    </View>
                    <ThemedText style={[styles.playerName, { color: '#666' }]} numberOfLines={1}>{spectator.username}</ThemedText>
                  </View>
                  <View style={styles.rankInfoContainer}>
                    <Image source={rankIcon} style={[styles.rankIconSmall, { opacity: 0.5 }]} resizeMode="contain" />
                    <View style={styles.rankTextContainer}>
                      <ThemedText style={[styles.currentRankText, { color: '#555' }]}>{spectator.currentRank}</ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Invited (pending challenge) */}
        {isPending && challengeInvites.filter((inv: any) => inv.status !== 'accepted').length > 0 && (
          <View style={styles.invitedSection}>
            <ThemedText style={styles.sectionLabel}>INVITED</ThemedText>
            {challengeInvites
              .filter((inv: any) => inv.status !== 'accepted')
              .map((inv: any) => (
                <View key={inv.userId} style={styles.invitedRow}>
                  <View style={styles.invitedInfo}>
                    {inv.avatar && inv.avatar.startsWith('http') ? (
                      <Image source={{ uri: inv.avatar }} style={styles.invitedAvatar} />
                    ) : (
                      <View style={styles.invitedAvatarPlaceholder}>
                        <ThemedText style={styles.invitedAvatarText}>{inv.username?.[0]?.toUpperCase()}</ThemedText>
                      </View>
                    )}
                    <ThemedText style={styles.invitedName}>{inv.username}</ThemedText>
                  </View>
                  <ThemedText style={[styles.inviteStatus, inv.status === 'rejected' && { color: '#666' }]}>
                    {inv.status === 'pending' ? 'Pending' : 'Declined'}
                  </ThemedText>
                </View>
              ))}
          </View>
        )}

        <View style={{ height: 40 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    paddingVertical: 12,
    gap: 4,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
  },
  gridValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4A843',
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dateDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressSection: {
    gap: 6,
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  progressDays: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  progressBarBg: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D4A843',
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 16,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
  },
  evenRow: { backgroundColor: '#141414' },
  oddRow: { backgroundColor: '#1a1a1a' },
  currentUserRow: { backgroundColor: '#252525' },
  rankContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  rankText: {
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
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  rankInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginLeft: 'auto',
  },
  rankIconSmall: {
    width: 26,
    height: 26,
  },
  rankTextContainer: {
    alignItems: 'flex-end',
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
  spectatorsSection: {
    marginTop: 16,
  },
  spectatorsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  spectatorsHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  invitedSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  invitedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  invitedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invitedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  invitedAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitedAvatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  invitedName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ccc',
  },
  inviteStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
});
