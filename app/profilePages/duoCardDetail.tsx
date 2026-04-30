import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, StyleSheet, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getRecentMatches, RecentMatchResult } from '@/services/riotService';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { formatRankDisplay } from '@/utils/formatRankDisplay';

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

// Role options
const VALORANT_ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];
const LEAGUE_ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

// Valorant agents grouped by role
const VALORANT_AGENTS: { [key: string]: string[] } = {
  'Duelist': ['Jett', 'Reyna', 'Raze', 'Phoenix', 'Yoru', 'Neon', 'Iso'],
  'Initiator': ['Sova', 'Breach', 'Skye', 'KAY/O', 'Fade', 'Gekko'],
  'Controller': ['Brimstone', 'Omen', 'Viper', 'Astra', 'Harbor', 'Clove'],
  'Sentinel': ['Sage', 'Cypher', 'Killjoy', 'Chamber', 'Deadlock', 'Vyse'],
};

// League champions grouped by role
const LEAGUE_CHAMPIONS: { [key: string]: string[] } = {
  'Top': ['Aatrox', 'Darius', 'Garen', 'Jax', 'Fiora', 'Camille', 'Ornn', 'Sett'],
  'Jungle': ['Lee Sin', 'Kha\'Zix', 'Graves', 'Elise', 'Vi', 'Rek\'Sai', 'Hecarim'],
  'Mid': ['Ahri', 'Zed', 'Yasuo', 'Syndra', 'Orianna', 'Viktor', 'LeBlanc'],
  'ADC': ['Jinx', 'Caitlyn', 'Kai\'Sa', 'Jhin', 'Vayne', 'Ezreal', 'Ashe'],
  'Support': ['Thresh', 'Leona', 'Lulu', 'Nami', 'Braum', 'Nautilus', 'Soraka'],
};

// Valorant agent icon mapping
const AGENT_ICONS: { [key: string]: any } = {
  'jett': require('@/assets/images/valorantagents/jett.png'),
  'reyna': require('@/assets/images/valorantagents/reyna.png'),
  'raze': require('@/assets/images/valorantagents/raze.png'),
  'phoenix': require('@/assets/images/valorantagents/phoenix.png'),
  'yoru': require('@/assets/images/valorantagents/yoru.png'),
  'neon': require('@/assets/images/valorantagents/neon.png'),
  'iso': require('@/assets/images/valorantagents/iso.png'),
  'sova': require('@/assets/images/valorantagents/sova.png'),
  'breach': require('@/assets/images/valorantagents/breach.png'),
  'skye': require('@/assets/images/valorantagents/skye.png'),
  'kay/o': require('@/assets/images/valorantagents/kayo.png'),
  'kayo': require('@/assets/images/valorantagents/kayo.png'),
  'fade': require('@/assets/images/valorantagents/fade.png'),
  'gekko': require('@/assets/images/valorantagents/gekko.png'),
  'brimstone': require('@/assets/images/valorantagents/brimstone.png'),
  'omen': require('@/assets/images/valorantagents/omen.png'),
  'viper': require('@/assets/images/valorantagents/viper.png'),
  'astra': require('@/assets/images/valorantagents/astra.png'),
  'harbor': require('@/assets/images/valorantagents/harbor.png'),
  'clove': require('@/assets/images/valorantagents/clove.png'),
  'sage': require('@/assets/images/valorantagents/sage.png'),
  'cypher': require('@/assets/images/valorantagents/cypher.png'),
  'killjoy': require('@/assets/images/valorantagents/killjoy.png'),
  'chamber': require('@/assets/images/valorantagents/chamber.png'),
  'deadlock': require('@/assets/images/valorantagents/deadlock.png'),
  'vyse': require('@/assets/images/valorantagents/vyse.png'),
  'tejo': require('@/assets/images/valorantagents/tejo.png'),
  'waylay': require('@/assets/images/valorantagents/waylay.png'),
  'miks': require('@/assets/images/valorantagents/miks.png'),
  'veto': require('@/assets/images/valorantagents/veto.png'),
};

const getAgentIcon = (agentName: string) => {
  if (!agentName) return null;
  return AGENT_ICONS[agentName.toLowerCase()] || null;
};

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

export default function DuoCardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse params
  const game = params.game as 'valorant' | 'league';
  const username = params.username as string;
  const rawAvatar = params.avatar;
  let avatar = Array.isArray(rawAvatar) ? rawAvatar[0] : rawAvatar;

  // Fix: Re-encode the Firebase Storage URL path if it got decoded during navigation
  if (avatar && avatar.includes('firebasestorage.googleapis.com')) {
    const [urlWithPath, queryString] = avatar.split('?');
    const [baseUrl, ...pathParts] = urlWithPath.split('/o/');
    if (pathParts.length > 0) {
      const encodedPath = pathParts.join('/o/').split('/').map(encodeURIComponent).join('%2F');
      avatar = `${baseUrl}/o/${encodedPath}${queryString ? '?' + queryString : ''}`;
    }
  }

  // Parse new stats params
  const rawInGameIcon = params.inGameIcon;
  const inGameIcon = Array.isArray(rawInGameIcon) ? rawInGameIcon[0] : rawInGameIcon;
  const rawInGameName = params.inGameName;
  const inGameName = Array.isArray(rawInGameName) ? rawInGameName[0] : rawInGameName;
  const rawWinRate = params.winRate;
  const winRateStr = Array.isArray(rawWinRate) ? rawWinRate[0] : rawWinRate;
  const winRate = winRateStr ? parseFloat(winRateStr) : undefined;
  const rawGamesPlayed = params.gamesPlayed;
  const gamesPlayedStr = Array.isArray(rawGamesPlayed) ? rawGamesPlayed[0] : rawGamesPlayed;
  const gamesPlayed = gamesPlayedStr ? parseInt(gamesPlayedStr, 10) : undefined;

  const peakRank = params.peakRank as string;
  const currentRank = params.currentRank as string;
  const region = params.region as string;
  const initialMainRole = params.mainRole as string;
  const initialMainAgent = params.mainAgent as string;
  const initialLookingFor = (params.lookingFor as string) || 'Any';
  const userId = params.userId as string | undefined;
  const isOwnCard = params.isOwnCard === 'true';

  const [recentMatches, setRecentMatches] = useState<RecentMatchResult[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [rankUpUsername, setRankUpUsername] = useState<string | null>(null);

  // Editable state for own card
  const [mainRole, setMainRole] = useState(initialMainRole);
  const [mainAgent, setMainAgent] = useState(initialMainAgent);
  const [lookingFor, setLookingFor] = useState(initialLookingFor);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showLookingForDropdown, setShowLookingForDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Track if user has made changes
  const hasChanges = mainRole !== initialMainRole ||
                     mainAgent !== initialMainAgent ||
                     lookingFor !== initialLookingFor;

  const gameAccentColor = game === 'valorant' ? '#8b3d47' : '#3d6a70';

  const roles = game === 'valorant' ? VALORANT_ROLES : LEAGUE_ROLES;
  const agents = mainRole
    ? (game === 'valorant' ? VALORANT_AGENTS[mainRole] : LEAGUE_CHAMPIONS[mainRole])
    : [];

  const handleSaveChanges = async () => {
    if (!userId || !mainRole || !mainAgent) {
      Alert.alert('Missing Information', 'Please select your main role and main agent/champion');
      return;
    }

    setIsSaving(true);
    try {
      const duoCardRef = doc(db, 'duoCards', `${userId}_${game}`);
      await setDoc(duoCardRef, {
        mainRole,
        mainAgent,
        lookingFor,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      Alert.alert('Success', 'Your duo card has been updated!');
    } catch (error) {
      console.error('Error updating duo card:', error);
      Alert.alert('Error', 'Failed to update your duo card. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const fetchUsername = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setRankUpUsername(userDoc.data().username || null);
        }
      } catch {}
    };
    fetchUsername();
  }, [userId]);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!userId || userId.trim() === '') {
        setLoadingMatches(false);
        return;
      }
      setLoadingMatches(true);

      if (game === 'valorant') {
        // Read from Firestore cache instead of calling Cloud Function
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const matchHistory = userDoc.data().valorantStats?.matchHistory;
            if (matchHistory && Array.isArray(matchHistory) && matchHistory.length > 0) {
              const mapped: RecentMatchResult[] = matchHistory.map((m: any) => ({
                won: m.won,
                agent: m.agent,
                kills: m.kills,
                deaths: m.deaths,
                assists: m.assists,
                map: m.map,
                score: m.score,
                playedAt: m.playedAt || (m.gameStart ? m.gameStart * 1000 : undefined),
                placement: m.placement,
              }));
              setRecentMatches(mapped);
            } else {
              setRecentMatches([]);
            }
          } else {
            setRecentMatches([]);
          }
        } catch (error) {
          console.error('Error fetching Valorant matches from Firestore:', error);
          setRecentMatches([]);
        }
      } else {
        // League: use Cloud Function
        const result = await getRecentMatches(userId, game);
        setRecentMatches(result.matches);
      }

      setLoadingMatches(false);
    };

    fetchMatches();
  }, [userId, game]);

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

  const handleUserPress = () => {
    if (userId) {
      router.push({ pathname: '/profilePages/profileView', params: { userId, username: username || '', avatar: avatar || '' } });
    }
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <IconSymbol size={22} name="xmark" color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Profile Section */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={!isOwnCard ? handleUserPress : undefined}
          activeOpacity={!isOwnCard ? 0.7 : 1}
          disabled={isOwnCard}
        >
          <View style={styles.avatarContainer}>
            {inGameIcon && inGameIcon.startsWith('http') ? (
              <Image source={{ uri: inGameIcon }} style={styles.avatar} />
            ) : avatar && avatar.startsWith('http') ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <IconSymbol size={36} name="person.fill" color="#888" />
              </View>
            )}
          </View>
          <ThemedText style={styles.username}>{rankUpUsername || username}</ThemedText>
          {inGameName && (
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
            <ThemedText style={styles.rankValue} numberOfLines={1}>{peakRank}</ThemedText>
            <ThemedText style={styles.rankLabel}>PEAK RANK</ThemedText>
          </View>

          <View style={styles.rankBox}>
            <Image
              source={getRankIcon(currentRank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.rankValue} numberOfLines={1}>{formatRankDisplay(currentRank)}</ThemedText>
            <ThemedText style={styles.rankLabel}>CURRENT RANK</ThemedText>
          </View>
        </View>

        {/* Stats Section — inline win rate + games */}
        {(winRate !== undefined || gamesPlayed !== undefined) && (
          <View style={styles.statsSection}>
            {winRate !== undefined && (
              <ThemedText style={styles.statInline}>
                <ThemedText style={styles.statInlineValue}>{winRate.toFixed(1)}% </ThemedText>
                <ThemedText style={styles.statInlineLabel}>WIN RATE</ThemedText>
              </ThemedText>
            )}
            {gamesPlayed !== undefined && (
              <ThemedText style={styles.statInline}>
                <ThemedText style={styles.statInlineValue}>{gamesPlayed} </ThemedText>
                <ThemedText style={styles.statInlineLabel}>GAMES</ThemedText>
              </ThemedText>
            )}
          </View>
        )}

        {/* Recent Matches Section — rank-card style table rows */}
        {!loadingMatches && isMatchesRecent(recentMatches) && (
          <View style={styles.matchesSection}>
            <ThemedText style={styles.matchesSectionLabel}>RECENT MATCHES</ThemedText>
            <View style={styles.matchList}>
              {recentMatches.slice(0, 5).map((match, i, arr) => {
                const isLast = i === arr.length - 1;
                const rawTime = match.playedAt;
                let formattedDate = '';
                if (rawTime) {
                  const timestamp = rawTime < 10000000000 ? rawTime * 1000 : rawTime;
                  const date = new Date(timestamp);
                  const now = Date.now();
                  const diffMs = now - timestamp;
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  if (diffHours < 1) formattedDate = 'Just now';
                  else if (diffHours < 24) formattedDate = diffHours === 1 ? '1 hr ago' : `${diffHours} hrs ago`;
                  else if (diffDays === 1) formattedDate = '1 day ago';
                  else if (diffDays < 30) formattedDate = `${diffDays} days ago`;
                  else {
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    formattedDate = `${date.getDate()}${months[date.getMonth()]}`;
                  }
                }
                return (
                  <View key={i} style={[styles.matchItem, isLast && styles.matchItemLast]}>
                    <View style={[styles.matchIndicator, match.won ? styles.matchWin : styles.matchLoss]} />
                    <View style={styles.matchColAgent}>
                      {getAgentIcon(match.agent || '') ? (
                        <Image
                          source={getAgentIcon(match.agent || '')}
                          style={styles.matchAgentIcon}
                          resizeMode="contain"
                        />
                      ) : (
                        <ThemedText style={styles.matchCellText} numberOfLines={1}>
                          {match.agent || '?'}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.matchColRank}>
                      <View style={[
                        styles.matchRankPill,
                        match.placement === 1 && styles.matchRankPill1st,
                        match.placement === 2 && styles.matchRankPill2nd,
                        match.placement === 3 && styles.matchRankPill3rd,
                      ]}>
                        <ThemedText style={[
                          styles.matchRankText,
                          match.placement === 1 && styles.matchRank1st,
                          match.placement === 2 && styles.matchRank2nd,
                          match.placement === 3 && styles.matchRank3rd,
                        ]}>
                          {match.placement
                            ? (match.placement === 1
                                ? 'MVP'
                                : `${match.placement}${match.placement === 2 ? 'nd' : match.placement === 3 ? 'rd' : 'th'}`)
                            : '-'}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={[styles.matchCellText, styles.matchColKDA]}>
                      {match.kills ?? 0}/{match.deaths ?? 0}/{match.assists ?? 0}
                    </ThemedText>
                    <ThemedText style={[
                      styles.matchCellText,
                      styles.matchColResult,
                      match.won ? styles.matchResultWin : styles.matchResultLoss,
                    ]}>
                      {match.won ? 'Victory' : 'Defeat'}
                    </ThemedText>
                    <ThemedText style={[styles.matchCellText, styles.matchColScore]}>
                      {match.score || '-'}
                    </ThemedText>
                    <ThemedText style={[styles.matchCellText, styles.matchColDate, styles.matchDateText]}>
                      {formattedDate}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Details Section — Region only (other users) */}
        {!isOwnCard && region ? (
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <IconSymbol size={20} name="globe" color="#94a3b8" />
              <View style={styles.detailTextContainer}>
                <ThemedText style={styles.detailLabel}>Region</ThemedText>
                <ThemedText style={styles.detailValue}>{region}</ThemedText>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  // Profile Section
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  inGameName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
    marginTop: 4,
  },
  // Ranks Section — two matte panels, uppercase rank names (matches duoCard rankName)
  ranksSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  rankBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  rankIcon: {
    width: 56,
    height: 56,
  },
  rankValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rankLabel: {
    fontSize: 9,
    color: '#888',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  // Stats Section — inline two-stat row (matches duoCard statsBottomRow)
  statsSection: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  statInline: {
    fontSize: 13,
    color: '#888',
  },
  statInlineValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  statInlineLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.6,
  },
  // Match List Styles
  matchesSection: {
    marginBottom: 24,
  },
  matchesSectionLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  matchList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  matchItemLast: {
    borderBottomWidth: 0,
  },
  matchIndicator: {
    width: 4,
    height: 36,
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
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  matchColRank: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchRankPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  matchRankPill1st: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  matchRankPill2nd: {
    backgroundColor: 'rgba(192, 192, 192, 0.15)',
  },
  matchRankPill3rd: {
    backgroundColor: 'rgba(205, 127, 50, 0.15)',
  },
  matchRankText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textAlign: 'center',
  },
  matchRank1st: {
    color: '#FFD700',
    fontWeight: '900',
  },
  matchRank2nd: {
    color: '#C0C0C0',
    fontWeight: '900',
  },
  matchRank3rd: {
    color: '#CD7F32',
    fontWeight: '900',
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
    flex: 1.5,
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
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  // Details Section — Region row only
  detailsSection: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  detailTextContainer: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 9,
    color: '#888',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  // Edit Fields
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  editRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  editFieldHalf: {
    flex: 1,
    position: 'relative',
  },
  editFieldFull: {
    marginBottom: 4,
  },
  dropdownCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  dropdownDisabled: {
    opacity: 0.5,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dropdownIconSmall: {
    width: 18,
    height: 18,
  },
  dropdownTextCompact: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  dropdownPlaceholderCompact: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  dropdownListAbsolute: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    zIndex: 100,
  },
  dropdownList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  dropdownScrollCompact: {
    maxHeight: 150,
  },
  dropdownOptionCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownOptionIconSmall: {
    width: 18,
    height: 18,
  },
  dropdownOptionTextCompact: {
    fontSize: 14,
    color: '#94a3b8',
  },
  // Save Button
  saveButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  saveButtonTextInactive: {
    color: '#64748b',
  },
});
