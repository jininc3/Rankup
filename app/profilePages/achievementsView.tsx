import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
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

interface RankingEntry {
  userId: string;
  username: string;
  rank: number;
  currentRank: string;
  lp?: number;
  rr?: number;
  avatar?: string;
}

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

const getMedalColor = (rank: number) => {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return '#333';
};

const getMedalEmoji = (rank: number) => {
  if (rank === 1) return '\u{1F947}';
  if (rank === 2) return '\u{1F948}';
  if (rank === 3) return '\u{1F949}';
  return '';
};

export default function AchievementsView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const partyId = params.partyId as string;
  const game = (params.game as string) || 'Valorant';
  const isLeague = game === 'League of Legends' || game === 'League';

  const [loading, setLoading] = useState(true);
  const [partyData, setPartyData] = useState<any>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);

  useEffect(() => {
    if (!partyId) return;

    const fetchPartyData = async () => {
      try {
        const partyRef = doc(db, 'parties', partyId);
        const partySnap = await getDoc(partyRef);

        if (!partySnap.exists()) {
          setLoading(false);
          return;
        }

        const data = partySnap.data();
        setPartyData(data);

        if (data.rankings && data.rankings.length > 0) {
          // Enrich rankings with avatars from memberDetails
          const avatarMap: { [userId: string]: string } = {};
          if (data.memberDetails) {
            data.memberDetails.forEach((m: any) => {
              avatarMap[m.userId] = m.avatar || '';
            });
          }

          const enriched: RankingEntry[] = data.rankings
            .sort((a: any, b: any) => a.rank - b.rank)
            .map((r: any) => ({
              ...r,
              avatar: avatarMap[r.userId] || '',
            }));

          setRankings(enriched);
        }
      } catch (error) {
        console.error('Error fetching party data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartyData();
  }, [partyId]);

  const handlePlayerPress = (entry: RankingEntry) => {
    if (entry.userId === user?.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profilePages/profileView?userId=${entry.userId}`);
    }
  };

  const convertToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue.toDate && typeof dateValue.toDate === 'function') return dateValue.toDate();
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string') {
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
      return new Date(dateValue);
    }
    return null;
  };

  const formatDate = (dateValue: any): string => {
    const date = convertToDate(dateValue);
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const leaderboardName = partyData?.partyName || '';
  const memberCount = partyData?.members?.length || 0;
  const coverPhoto = partyData?.coverPhoto;
  const leaderboardIcon = partyData?.partyIcon;
  const gameLogo = GAME_LOGOS[game];
  const startDate = partyData?.startDate;
  const endDate = partyData?.endDate;

  const topThree = rankings.filter(r => r.rank <= 3);
  const remaining = rankings.filter(r => r.rank > 3);

  if (loading) {
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#c42743" />
        </View>
      </ThemedView>
    );
  }

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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        <View style={styles.coverSection}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol size={20} name="chevron.left" color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.coverWrapper}>
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={styles.coverImage} />
            ) : (
              <LinearGradient
                colors={['#252525', '#1a1a1a', '#0f0f0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.coverGradient}
              />
            )}
            <LinearGradient
              colors={['rgba(15, 15, 15, 0.25)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverFadeTop}
            />
            <LinearGradient
              colors={['transparent', '#0f0f0f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverFadeBottom}
            />
          </View>
        </View>

        {/* Leaderboard Info */}
        <View style={styles.infoSection}>
          <View style={styles.completedBadge}>
            <IconSymbol size={14} name="checkmark.circle.fill" color="#4CAF50" />
            <ThemedText style={styles.completedBadgeText}>Challenge Complete</ThemedText>
          </View>

          <View style={styles.iconWrapper}>
            {leaderboardIcon ? (
              <Image source={{ uri: leaderboardIcon }} style={styles.leaderboardIcon} />
            ) : gameLogo ? (
              <View style={styles.iconPlaceholder}>
                <Image source={gameLogo} style={styles.iconGameLogo} resizeMode="contain" />
              </View>
            ) : (
              <View style={styles.iconPlaceholder}>
                <ThemedText style={styles.iconInitial}>{leaderboardName?.[0]?.toUpperCase()}</ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={styles.leaderboardName}>{leaderboardName}</ThemedText>

          <View style={styles.meta}>
            {gameLogo && <Image source={gameLogo} style={styles.metaGameLogo} resizeMode="contain" />}
            <ThemedText style={styles.metaText}>{game}</ThemedText>
            <View style={styles.metaDot} />
            <ThemedText style={styles.metaText}>{memberCount} {memberCount === 1 ? 'Player' : 'Players'}</ThemedText>
          </View>

          {startDate && endDate && (
            <View style={styles.durationInfo}>
              <ThemedText style={styles.durationText}>
                {formatDate(startDate)} - {formatDate(endDate)}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Top 3 Standings */}
        {topThree.length > 0 && (
          <View style={styles.standingsSection}>
            <ThemedText style={styles.sectionTitle}>Final Standings</ThemedText>

            <View style={styles.topCardsContainer}>
              {topThree.map((entry) => {
                const rankIcon = isLeague
                  ? getLeagueRankIcon(entry.currentRank)
                  : getValorantRankIcon(entry.currentRank);
                const suffix = entry.rank === 1 ? 'st' : entry.rank === 2 ? 'nd' : 'rd';
                const medalColor = getMedalColor(entry.rank);
                const isCurrentUser = entry.userId === user?.id;

                return (
                  <TouchableOpacity
                    key={entry.userId}
                    style={[styles.topCard, { borderLeftColor: medalColor }, isCurrentUser && styles.currentUserCard]}
                    onPress={() => handlePlayerPress(entry)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.topCardLeft}>
                      <View style={styles.topCardNameRow}>
                        <ThemedText style={styles.topCardName} numberOfLines={1}>{entry.username}</ThemedText>
                        {isCurrentUser && (
                          <View style={styles.youBadge}>
                            <ThemedText style={styles.youBadgeText}>YOU</ThemedText>
                          </View>
                        )}
                      </View>

                      <View style={styles.topCardRankRow}>
                        <Image source={rankIcon} style={styles.topCardRankIcon} resizeMode="contain" />
                        <ThemedText style={styles.topCardRankText}>{entry.currentRank}</ThemedText>
                        <View style={styles.topCardDot} />
                        <ThemedText style={styles.topCardPoints}>
                          {isLeague ? `${entry.lp || 0} LP` : `${entry.rr || 0} RR`}
                        </ThemedText>
                      </View>

                      <View style={styles.topCardPositionRow}>
                        <ThemedText style={[styles.topCardPositionNumber, { color: medalColor }]}>
                          {entry.rank}
                        </ThemedText>
                        <ThemedText style={[styles.topCardPositionSuffix, { color: medalColor }]}>
                          {suffix}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.topCardRight}>
                      <View style={[styles.topCardAvatar, { borderColor: medalColor }]}>
                        {entry.avatar && entry.avatar.startsWith('http') ? (
                          <Image source={{ uri: entry.avatar }} style={styles.topCardAvatarImage} />
                        ) : (
                          <ThemedText style={styles.topCardAvatarText}>
                            {entry.username[0].toUpperCase()}
                          </ThemedText>
                        )}
                      </View>
                      {entry.rank === 1 && (
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

        {/* Remaining Participants */}
        {remaining.length > 0 && (
          <View style={styles.participantsSection}>
            <ThemedText style={styles.sectionTitle}>All Participants</ThemedText>

            <View style={styles.participantsList}>
              {remaining.map((entry) => {
                const rankIcon = isLeague
                  ? getLeagueRankIcon(entry.currentRank)
                  : getValorantRankIcon(entry.currentRank);
                const isCurrentUser = entry.userId === user?.id;

                return (
                  <TouchableOpacity
                    key={entry.userId}
                    style={[styles.participantRow, isCurrentUser && styles.currentUserRow]}
                    onPress={() => handlePlayerPress(entry)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.participantRankContainer}>
                      <ThemedText style={styles.participantRankNum}>{entry.rank}</ThemedText>
                    </View>

                    <View style={styles.participantInfo}>
                      <View style={styles.participantAvatar}>
                        {entry.avatar && entry.avatar.startsWith('http') ? (
                          <Image source={{ uri: entry.avatar }} style={styles.participantAvatarImage} />
                        ) : (
                          <ThemedText style={styles.participantAvatarText}>
                            {entry.username[0].toUpperCase()}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText style={styles.participantName} numberOfLines={1}>
                        {entry.username}
                      </ThemedText>
                      {isCurrentUser && (
                        <View style={styles.youBadgeSmall}>
                          <ThemedText style={styles.youBadgeSmallText}>YOU</ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.participantRankInfo}>
                      <Image source={rankIcon} style={styles.participantRankIcon} resizeMode="contain" />
                      <View style={styles.participantRankTextContainer}>
                        <ThemedText style={styles.participantCurrentRank}>{entry.currentRank}</ThemedText>
                        <ThemedText style={styles.participantPoints}>
                          {isLeague ? `${entry.lp || 0} LP` : `${entry.rr || 0} RR`}
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {rankings.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <IconSymbol size={36} name="trophy" color="#72767d" />
            <ThemedText style={styles.emptyTitle}>No rankings available</ThemedText>
            <ThemedText style={styles.emptySubtext}>Results for this challenge are not available</ThemedText>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Cover
  coverSection: {
    position: 'relative',
  },
  headerRow: {
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
  coverWrapper: {
    width: '100%',
    height: 180,
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
  },
  coverFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 1,
  },
  coverFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 1,
  },
  // Info Section
  infoSection: {
    alignItems: 'center',
    marginTop: -44,
    paddingHorizontal: 20,
    zIndex: 2,
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
  iconWrapper: {
    marginBottom: 14,
  },
  leaderboardIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#0f0f0f',
  },
  iconPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    borderWidth: 4,
    borderColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGameLogo: {
    width: 40,
    height: 40,
    opacity: 0.8,
  },
  iconInitial: {
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
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  metaGameLogo: {
    width: 16,
    height: 16,
    opacity: 0.6,
  },
  metaText: {
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
  },
  // Standings
  standingsSection: {
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
  currentUserCard: {
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#333',
  },
  topCardLeft: {
    flex: 1,
  },
  topCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  topCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: 'rgba(196, 39, 67, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c42743',
    letterSpacing: 0.5,
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
  topCardPositionRow: {
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
  // Participants
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
  participantRankNum: {
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
  youBadgeSmall: {
    backgroundColor: 'rgba(196, 39, 67, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  youBadgeSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#c42743',
    letterSpacing: 0.5,
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
  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#72767d',
    marginTop: 4,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
