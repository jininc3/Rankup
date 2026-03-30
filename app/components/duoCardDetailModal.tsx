import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getRecentMatches } from '@/services/riotService';

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
};

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

const VALORANT_AGENT_ICONS: { [key: string]: any } = {
  astra: require('@/assets/images/valoranticons/astra.png'),
  breach: require('@/assets/images/valoranticons/breach.png'),
  brimstone: require('@/assets/images/valoranticons/brimstone.png'),
  chamber: require('@/assets/images/valoranticons/chamber.png'),
  clove: require('@/assets/images/valoranticons/clove.png'),
  cypher: require('@/assets/images/valoranticons/cypher.png'),
  deadlock: require('@/assets/images/valoranticons/deadlock.png'),
  fade: require('@/assets/images/valoranticons/fade.png'),
  gekko: require('@/assets/images/valoranticons/gekko.png'),
  harbor: require('@/assets/images/valoranticons/harbor.png'),
  iso: require('@/assets/images/valoranticons/iso.png'),
  jett: require('@/assets/images/valoranticons/jett.png'),
  kayo: require('@/assets/images/valoranticons/kayo.png'),
  killjoy: require('@/assets/images/valoranticons/killjoy.png'),
  neon: require('@/assets/images/valoranticons/neon.png'),
  omen: require('@/assets/images/valoranticons/omen.png'),
  phoenix: require('@/assets/images/valoranticons/phoenix.png'),
  raze: require('@/assets/images/valoranticons/raze.png'),
  reyna: require('@/assets/images/valoranticons/reyna.png'),
  sage: require('@/assets/images/valoranticons/sage.png'),
  skye: require('@/assets/images/valoranticons/skye.png'),
  sova: require('@/assets/images/valoranticons/sova.png'),
  viper: require('@/assets/images/valoranticons/viper.png'),
  yoru: require('@/assets/images/valoranticons/yoru.png'),
};

const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  controller: require('@/assets/images/valorantroles/Controller.png'),
  duelist: require('@/assets/images/valorantroles/Duelist.png'),
  initiator: require('@/assets/images/valorantroles/Initiator.png'),
  sentinel: require('@/assets/images/valorantroles/Sentinel.png'),
};

const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  top: require('@/assets/images/leaguelanes/top.png'),
  jungle: require('@/assets/images/leaguelanes/jungle.png'),
  mid: require('@/assets/images/leaguelanes/mid.png'),
  middle: require('@/assets/images/leaguelanes/mid.png'),
  bottom: require('@/assets/images/leaguelanes/bottom.png'),
  bot: require('@/assets/images/leaguelanes/bottom.png'),
  adc: require('@/assets/images/leaguelanes/bottom.png'),
  support: require('@/assets/images/leaguelanes/support.png'),
};

interface MatchEntry {
  matchId?: string;
  agent?: string;
  champion?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  won: boolean;
  map?: string;
  gameStart?: number;
  score?: string;
  playedAt?: number;
}

interface DuoCardDetailModalProps {
  visible: boolean;
  onClose: () => void;
  card: {
    game: 'valorant' | 'league';
    username: string;
    avatar?: string;
    inGameIcon?: string;
    inGameName?: string;
    currentRank: string;
    peakRank: string;
    mainRole: string;
    mainAgent?: string;
    lookingFor?: string;
    winRate?: number;
    gamesPlayed?: number;
    userId: string;
  } | null;
}

const getRankIcon = (rank: string, game: 'valorant' | 'league') => {
  if (!rank || rank === 'Unranked') {
    return game === 'league' ? LEAGUE_RANK_ICONS.unranked : VALORANT_RANK_ICONS.unranked;
  }
  const tier = rank.split(' ')[0].toLowerCase();
  if (game === 'league') return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
  return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
};

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const date = new Date(timestamp);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

const getAgentIcon = (agent: string) => {
  return VALORANT_AGENT_ICONS[agent.toLowerCase().replace('/', '').replace("'", '')] || null;
};

// In-memory match history cache (30 min TTL)
const MATCH_CACHE_TTL = 30 * 60 * 1000;
const matchHistoryCache: { [key: string]: { matches: MatchEntry[]; timestamp: number } } = {};

export default function DuoCardDetailModal({ visible, onClose, card }: DuoCardDetailModalProps) {
  const [recentMatches, setRecentMatches] = useState<MatchEntry[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    const fetchMatchHistory = async () => {
      if (!visible || !card?.userId) {
        setRecentMatches([]);
        return;
      }

      const cacheKey = `${card.userId}_${card.game}`;
      const cached = matchHistoryCache[cacheKey];

      // Return cached data if still fresh
      if (cached && Date.now() - cached.timestamp < MATCH_CACHE_TTL) {
        setRecentMatches(cached.matches);
        return;
      }

      // Show cached data immediately while fetching fresh
      if (cached) {
        setRecentMatches(cached.matches);
      }

      setLoadingMatches(!cached);
      try {
        // First try cached match history from Firestore
        const userDocRef = doc(db, 'users', card.userId);
        const userDoc = await getDoc(userDocRef);
        let matches: MatchEntry[] = [];

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (card.game === 'valorant' && userData.valorantStats?.matchHistory?.length > 0) {
            matches = userData.valorantStats.matchHistory;
          } else if (card.game === 'league' && userData.riotStats?.matchHistory?.length > 0) {
            matches = userData.riotStats.matchHistory;
          }
        }

        // If no cached data, fall back to Cloud Function
        if (matches.length === 0) {
          const result = await getRecentMatches(card.userId, card.game);
          if (result.matches?.length > 0) {
            matches = result.matches.map((m: any) => ({
              agent: m.agent,
              champion: m.champion,
              kills: m.kills,
              deaths: m.deaths,
              assists: m.assists,
              won: m.won,
              map: m.map,
              score: m.score,
              playedAt: m.playedAt,
              gameStart: m.gameStart,
            }));
          }
        }

        // Update cache
        matchHistoryCache[cacheKey] = { matches, timestamp: Date.now() };
        setRecentMatches(matches);
      } catch (error) {
        console.error('Error fetching match history:', error);
        if (!cached) setRecentMatches([]);
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchMatchHistory();
  }, [visible, card?.userId, card?.game]);

  if (!card) return null;

  const isLeague = card.game === 'league';
  const currentRankIcon = getRankIcon(card.currentRank, card.game);
  const peakRankIcon = getRankIcon(card.peakRank, card.game);
  const agentIcon = !isLeague && card.mainAgent
    ? VALORANT_AGENT_ICONS[card.mainAgent.toLowerCase()] || null
    : null;
  const roleIcon = !isLeague && card.mainRole
    ? VALORANT_ROLE_ICONS[card.mainRole.toLowerCase()] || null
    : null;
  const laneIcon = isLeague && card.mainRole
    ? LEAGUE_LANE_ICONS[card.mainRole.toLowerCase()] || null
    : null;

  // Show up to 10 most recent matches
  const recentValidMatches = recentMatches.slice(0, 10);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>DUO PROFILE</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <IconSymbol size={22} name="xmark" color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Card Container - matches duoCard outer/inner border style */}
          <View style={styles.cardContainer}>
            <LinearGradient
              colors={['#2a2a2a', '#1a1a1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.cardInner, { borderColor: isLeague ? '#1a3a5c' : '#5c1a1a' }]}
            >
              {/* Profile Header */}
              <View style={styles.profileRow}>
                <View style={styles.avatarContainer}>
                  {card.avatar ? (
                    <Image source={{ uri: card.avatar }} style={styles.avatar} />
                  ) : (
                    <ThemedText style={styles.avatarFallback}>
                      {card.username[0]?.toUpperCase()}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.profileInfo}>
                  <ThemedText style={styles.username}>{card.username}</ThemedText>
                  {card.inGameName && (
                    <ThemedText style={styles.inGameName}>{card.inGameName}</ThemedText>
                  )}
                </View>
                <Image
                  source={isLeague
                    ? require('@/assets/images/lol-icon.png')
                    : require('@/assets/images/valorant-red.png')
                  }
                  style={styles.gameLogo}
                  resizeMode="contain"
                />
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Ranks */}
              <View style={styles.ranksRow}>
                <View style={styles.rankItem}>
                  <ThemedText style={styles.rankLabel}>Current</ThemedText>
                  <Image source={currentRankIcon} style={styles.rankIcon} resizeMode="contain" />
                  <ThemedText style={styles.rankText}>{card.currentRank || 'Unranked'}</ThemedText>
                </View>
                <View style={styles.rankDivider} />
                <View style={styles.rankItem}>
                  <ThemedText style={styles.rankLabel}>Peak</ThemedText>
                  <Image source={peakRankIcon} style={styles.rankIcon} resizeMode="contain" />
                  <ThemedText style={styles.rankText}>{card.peakRank || 'Unranked'}</ThemedText>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Player Info */}
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoLabel}>{isLeague ? 'Main Champion' : 'Main Agent'}</ThemedText>
                  {!isLeague && agentIcon ? (
                    <View style={styles.infoIconRow}>
                      <Image source={agentIcon} style={styles.infoIcon} resizeMode="contain" />
                      <ThemedText style={styles.infoValue}>{card.mainAgent}</ThemedText>
                    </View>
                  ) : (
                    <ThemedText style={styles.infoValue}>{card.mainAgent || 'Any'}</ThemedText>
                  )}
                </View>
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoLabel}>Main Role</ThemedText>
                  {roleIcon || laneIcon ? (
                    <View style={styles.infoIconRow}>
                      <Image source={roleIcon || laneIcon} style={styles.infoIcon} resizeMode="contain" />
                      <ThemedText style={styles.infoValue}>{card.mainRole}</ThemedText>
                    </View>
                  ) : (
                    <ThemedText style={styles.infoValue}>{card.mainRole || 'Any'}</ThemedText>
                  )}
                </View>
                <View style={styles.infoItem}>
                  <ThemedText style={styles.infoLabel}>Looking For</ThemedText>
                  <ThemedText style={styles.infoValue}>{card.lookingFor || 'Any'}</ThemedText>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ThemedText style={styles.statLabel}>Win Rate</ThemedText>
                  <ThemedText style={[styles.statValue, card.winRate !== undefined && card.winRate >= 50 && styles.winRateGood]}>
                    {card.winRate !== undefined ? `${card.winRate}%` : 'N/A'}
                  </ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText style={styles.statLabel}>Games Played</ThemedText>
                  <ThemedText style={styles.statValue}>
                    {card.gamesPlayed !== undefined ? card.gamesPlayed : 'N/A'}
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Match History - separate card */}
          <View style={styles.cardContainer}>
            <LinearGradient
              colors={['#2a2a2a', '#1a1a1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.cardInner, { borderColor: isLeague ? '#1a3a5c' : '#5c1a1a' }]}
            >
              <ThemedText style={styles.sectionTitle}>MATCH HISTORY</ThemedText>
              <View style={styles.matchHistoryContainer}>
              {loadingMatches ? (
                <View style={styles.matchLoadingContainer}>
                  <ActivityIndicator color="#888" size="small" />
                </View>
              ) : recentValidMatches.length === 0 ? (
                <View style={styles.noMatchesContainer}>
                  <ThemedText style={styles.noMatchesText}>No recent matches</ThemedText>
                </View>
              ) : (
                <>
                  {/* Table Header */}
                  <View style={styles.matchTableHeader}>
                    <View style={styles.matchIndicatorSpacer} />
                    <ThemedText style={[styles.matchHeaderText, styles.matchColAgent]}>
                      {isLeague ? 'Champ' : 'Agent'}
                    </ThemedText>
                    <ThemedText style={[styles.matchHeaderText, styles.matchColKDA]}>KDA</ThemedText>
                    <ThemedText style={[styles.matchHeaderText, styles.matchColResult]}>Result</ThemedText>
                    <ThemedText style={[styles.matchHeaderText, styles.matchColScore]}>Score</ThemedText>
                    <ThemedText style={[styles.matchHeaderText, styles.matchColDate]}>Date</ThemedText>
                  </View>

                  {/* Match Rows */}
                  {recentValidMatches.map((match, index) => {
                    const rawTs = match.gameStart || match.playedAt || 0;
                    const timestamp = rawTs < 10000000000 ? rawTs * 1000 : rawTs;
                    const agentName = match.agent || match.champion || '';
                    const matchAgentIcon = !isLeague ? getAgentIcon(agentName) : null;

                    return (
                      <View key={index} style={styles.matchItem}>
                        <View style={[styles.matchIndicator, match.won ? styles.matchWin : styles.matchLoss]} />
                        <View style={styles.matchColAgent}>
                          {matchAgentIcon ? (
                            <Image source={matchAgentIcon} style={styles.matchAgentIcon} resizeMode="contain" />
                          ) : (
                            <ThemedText style={styles.matchCellText} numberOfLines={1}>
                              {agentName || '-'}
                            </ThemedText>
                          )}
                        </View>
                        <ThemedText style={[styles.matchCellText, styles.matchColKDA]}>
                          {match.kills ?? 0}/{match.deaths ?? 0}/{match.assists ?? 0}
                        </ThemedText>
                        <ThemedText style={[
                          styles.matchCellText,
                          styles.matchColResult,
                          match.won ? styles.matchResultWin : styles.matchResultLoss
                        ]}>
                          {match.won ? 'Victory' : 'Defeat'}
                        </ThemedText>
                        <ThemedText style={[styles.matchCellText, styles.matchColScore]}>
                          {match.score || '-'}
                        </ThemedText>
                        <ThemedText style={[styles.matchCellText, styles.matchColDate, styles.matchDateText]}>
                          {timestamp ? formatTimeAgo(timestamp) : '-'}
                        </ThemedText>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
            </LinearGradient>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
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
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  // Card container - matches duoCard outer style
  cardContainer: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
  cardInner: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 2,
  },
  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  inGameName: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  gameLogo: {
    width: 24,
    height: 24,
    opacity: 0.7,
  },
  // Section title
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  // Ranks
  ranksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rankItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  rankDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#2a2a2a',
  },
  rankLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankIcon: {
    width: 36,
    height: 36,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  // Player Info
  infoGrid: {
    gap: 12,
    paddingVertical: 2,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  infoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2a2a2a',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  winRateGood: {
    color: '#4ade80',
  },
  // Match History
  matchHistoryContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  matchLoadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  noMatchesContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noMatchesText: {
    fontSize: 12,
    color: '#555',
  },
  matchTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingLeft: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  matchHeaderText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  matchIndicatorSpacer: {
    width: 16,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  matchIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  matchWin: {
    backgroundColor: '#4CAF50',
  },
  matchLoss: {
    backgroundColor: '#DC3D4B',
  },
  matchColAgent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchAgentIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  matchColKDA: {
    flex: 1.2,
    textAlign: 'center',
  },
  matchColResult: {
    flex: 1.2,
    textAlign: 'center',
  },
  matchColScore: {
    flex: 1,
    textAlign: 'center',
  },
  matchColDate: {
    flex: 1.3,
    textAlign: 'right',
  },
  matchCellText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  matchResultWin: {
    color: '#4CAF50',
  },
  matchResultLoss: {
    color: '#DC3D4B',
  },
  matchDateText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
});
