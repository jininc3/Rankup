import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, Modal, StyleSheet, TouchableOpacity, View, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { getRecentMatches, RecentMatchResult } from '@/services/riotService';

interface DuoCardProfileProps {
  visible: boolean;
  onClose: () => void;
  game: 'valorant' | 'league';
  username: string;
  avatar?: string;
  inGameIcon?: string;
  inGameName?: string;
  winRate?: number;
  gamesPlayed?: number;
  peakRank: string;
  currentRank: string;
  region: string;
  mainRole: string;
  mainAgent: string;
  userId?: string;
  onUserPress?: () => void;
}

// Helper function to format relative time
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return `${Math.floor(days / 7)}w ago`;
  }
};

// Check if most recent match is within 3 months
const isMatchesRecent = (matches: RecentMatchResult[]): boolean => {
  if (matches.length === 0) return false;
  const mostRecentMatch = matches[0];
  if (!mostRecentMatch.playedAt) return true; // Show if no timestamp available

  const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  return mostRecentMatch.playedAt > threeMonthsAgo;
};

// League rank icon mapping
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
};

// League lane icons
const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  'Top': require('@/assets/images/leaguelanes/top.png'),
  'Jungle': require('@/assets/images/leaguelanes/jungle.png'),
  'Mid': require('@/assets/images/leaguelanes/mid.png'),
  'ADC': require('@/assets/images/leaguelanes/bottom.png'),
  'Support': require('@/assets/images/leaguelanes/support.png'),
};

// Valorant role icons
const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  'Duelist': require('@/assets/images/valorantroles/Duelist.png'),
  'Initiator': require('@/assets/images/valorantroles/Initiator.png'),
  'Controller': require('@/assets/images/valorantroles/Controller.png'),
  'Sentinel': require('@/assets/images/valorantroles/Sentinel.png'),
};

export default function DuoCardProfile({
  visible,
  onClose,
  game,
  username,
  avatar,
  inGameIcon,
  inGameName,
  winRate,
  gamesPlayed,
  peakRank,
  currentRank,
  region,
  mainRole,
  mainAgent,
  userId,
  onUserPress,
}: DuoCardProfileProps) {
  const [recentMatches, setRecentMatches] = useState<RecentMatchResult[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Fetch recent matches when modal opens
  useEffect(() => {
    if (visible && userId && game === 'valorant') {
      const fetchMatches = async () => {
        setLoadingMatches(true);
        try {
          const result = await getRecentMatches(userId, game);
          setRecentMatches(result.matches);
        } catch (error) {
          console.error('Error fetching matches:', error);
          setRecentMatches([]);
        } finally {
          setLoadingMatches(false);
        }
      };
      fetchMatches();
    } else {
      setRecentMatches([]);
    }
  }, [visible, userId, game]);

  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return game === 'valorant' ? VALORANT_RANK_ICONS.unranked : LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return game === 'valorant'
      ? (VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked)
      : (LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked);
  };

  const getRoleIcon = (role: string) => {
    if (game === 'valorant') {
      return VALORANT_ROLE_ICONS[role] || VALORANT_ROLE_ICONS['Duelist'];
    } else {
      return LEAGUE_LANE_ICONS[role] || LEAGUE_LANE_ICONS['Mid'];
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <IconSymbol size={24} name="xmark" color="#fff" />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentContainer}
          >
          {/* Profile Section */}
          <TouchableOpacity
            style={styles.profileSection}
            onPress={onUserPress}
            activeOpacity={onUserPress ? 0.7 : 1}
            disabled={!onUserPress}
          >
            <View style={styles.avatarContainer}>
              {inGameIcon && inGameIcon.startsWith('http') ? (
                <Image source={{ uri: inGameIcon }} style={styles.avatar} />
              ) : avatar && avatar.startsWith('http') ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <IconSymbol size={40} name="person.fill" color="#fff" />
                </View>
              )}
            </View>
            <ThemedText style={styles.username}>{username}</ThemedText>
            {inGameName && inGameName !== username && (
              <ThemedText style={styles.inGameName}>{inGameName}</ThemedText>
            )}
          </TouchableOpacity>

          {/* Ranks Section */}
          <View style={styles.ranksSection}>
            <View style={styles.rankBox}>
              <Image
                source={getRankIcon(peakRank)}
                style={styles.rankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankLabel}>Peak Rank</ThemedText>
              <ThemedText style={styles.rankValue}>{peakRank}</ThemedText>
            </View>

            <View style={styles.rankBox}>
              <Image
                source={getRankIcon(currentRank)}
                style={styles.rankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankLabel}>Current Rank</ThemedText>
              <ThemedText style={styles.rankValue}>{currentRank}</ThemedText>
            </View>
          </View>

          {/* Stats Section */}
          {(winRate !== undefined || gamesPlayed !== undefined) && (
            <View style={styles.statsSection}>
              {winRate !== undefined && (
                <View style={styles.statBox}>
                  <IconSymbol size={20} name="chart.bar.fill" color="#4ade80" />
                  <ThemedText style={styles.statValue}>
                    {winRate.toFixed(1)}%
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>Win Rate</ThemedText>
                </View>
              )}
              {gamesPlayed !== undefined && (
                <View style={styles.statBox}>
                  <IconSymbol size={20} name="gamecontroller.fill" color="#60a5fa" />
                  <ThemedText style={styles.statValue}>{gamesPlayed}</ThemedText>
                  <ThemedText style={styles.statLabel}>Games</ThemedText>
                </View>
              )}
            </View>
          )}

          {/* Recent Matches Section - Valorant Only, if played within 3 months */}
          {game === 'valorant' && userId && !loadingMatches && isMatchesRecent(recentMatches) && (
            <View style={styles.matchesSection}>
              <ThemedText style={styles.matchesSectionLabel}>RECENT MATCHES</ThemedText>
              <View style={styles.matchList}>
                {recentMatches.slice(0, 5).map((match, i) => (
                  <View key={i} style={[styles.matchRow, match.won ? styles.matchRowWin : styles.matchRowLoss]}>
                    <View style={[styles.matchResultBadge, match.won ? styles.matchResultWin : styles.matchResultLoss]}>
                      <ThemedText style={styles.matchResultText}>{match.won ? 'W' : 'L'}</ThemedText>
                    </View>
                    <View style={styles.matchInfo}>
                      <ThemedText style={styles.matchAgent} numberOfLines={1}>
                        {match.agent || 'Unknown'}
                      </ThemedText>
                      <ThemedText style={styles.matchKda}>
                        {match.kills ?? 0}/{match.deaths ?? 0}/{match.assists ?? 0}
                      </ThemedText>
                    </View>
                    <View style={styles.matchMeta}>
                      {match.map && (
                        <ThemedText style={styles.matchMap} numberOfLines={1}>{match.map}</ThemedText>
                      )}
                      {match.playedAt && (
                        <ThemedText style={styles.matchTime}>{formatTimeAgo(match.playedAt)}</ThemedText>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Details Section */}
          <View style={styles.detailsSection}>
            {/* Region and Main Role - Split Row */}
            <View style={styles.splitRow}>
              <View style={styles.detailRowHalf}>
                <IconSymbol size={20} name="globe" color="#94a3b8" />
                <View style={styles.detailTextContainer}>
                  <ThemedText style={styles.detailLabel}>Region</ThemedText>
                  <ThemedText style={styles.detailValue}>{region}</ThemedText>
                </View>
              </View>

              <View style={styles.detailRowHalf}>
                <Image
                  source={getRoleIcon(mainRole)}
                  style={styles.roleIcon}
                  resizeMode="contain"
                />
                <View style={styles.detailTextContainer}>
                  <ThemedText style={styles.detailLabel}>Main Role</ThemedText>
                  <ThemedText style={styles.detailValue}>{mainRole}</ThemedText>
                </View>
              </View>
            </View>

            {/* Main Agent - Full Width */}
            <View style={styles.detailRow}>
              <IconSymbol size={20} name="star.fill" color="#94a3b8" />
              <View style={styles.detailTextContainer}>
                <ThemedText style={styles.detailLabel}>
                  {game === 'valorant' ? 'Main Agent' : 'Main Champion'}
                </ThemedText>
                <ThemedText style={styles.detailValue}>{mainAgent}</ThemedText>
              </View>
            </View>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f0f0f',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    paddingBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  inGameName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 4,
  },
  ranksSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  rankBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  rankIcon: {
    width: 60,
    height: 60,
  },
  rankLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Match List Styles
  matchesSection: {
    marginBottom: 24,
  },
  matchesSectionLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  matchesLoading: {
    padding: 20,
    alignItems: 'center',
  },
  matchList: {
    gap: 8,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    borderLeftWidth: 3,
  },
  matchRowWin: {
    borderLeftColor: '#4ade80',
  },
  matchRowLoss: {
    borderLeftColor: '#ef4444',
  },
  matchResultBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchResultWin: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  matchResultLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  matchResultText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  matchInfo: {
    flex: 1,
    gap: 2,
  },
  matchAgent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  matchKda: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
  matchMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  matchMap: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    maxWidth: 60,
  },
  matchTime: {
    fontSize: 9,
    color: '#64748b',
  },
  noMatchesText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    padding: 16,
  },
  detailsSection: {
    gap: 12,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
  },
  detailRowHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
  },
  roleIcon: {
    width: 20,
    height: 20,
  },
  detailTextContainer: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});
