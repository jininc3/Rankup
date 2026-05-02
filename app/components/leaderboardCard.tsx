import React from 'react';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

const getOrdinal = (n: number): string => {
  const s = ['TH', 'ST', 'ND', 'RD'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

interface Leaderboard {
  id: string;
  name: string;
  icon: string;
  game: string;
  members: number;
  maxMembers?: number;
  userRank?: number | null;
  isJoined?: boolean;
  players?: any[];
  startDate?: any;
  endDate?: any;
  type?: 'party' | 'leaderboard';
  coverPhoto?: string;
  partyIcon?: string;
  challengeType?: 'climbing' | 'rank';
  challengeStatus?: 'none' | 'pending' | 'active';
  memberDetails?: any[];
  challengeParticipants?: string[];
}

interface LeaderboardCardProps {
  leaderboard: Leaderboard;
  onPress: (leaderboard: Leaderboard) => void;
  showDivider?: boolean;
  currentUserId?: string;
}

const calculateDaysInfo = (startDate: any, endDate: any): { currentDay: number; totalDays: number; daysLeft: number } | null => {
  if (!startDate || !endDate) return null;

  const parseDate = (date: any): Date | null => {
    if (date.toDate && typeof date.toDate === 'function') return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === 'string') {
      const parts = date.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
      }
      return new Date(date);
    }
    return null;
  };

  const startDateObj = parseDate(startDate);
  const endDateObj = parseDate(endDate);
  if (!startDateObj || !endDateObj || isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDateObj.setHours(0, 0, 0, 0);
  endDateObj.setHours(0, 0, 0, 0);

  const totalDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = Math.min(Math.ceil((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1, totalDays);
  const daysLeft = Math.max(0, totalDays - currentDay + 1);

  return { currentDay: Math.max(1, currentDay), totalDays, daysLeft };
};

function LeaderboardCard({ leaderboard, onPress, currentUserId }: LeaderboardCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const daysInfo = calculateDaysInfo(leaderboard.startDate, leaderboard.endDate);
  const gameLogo = GAME_LOGOS[leaderboard.game];
  const isActive = leaderboard.challengeStatus === 'active';

  // Use memberDetails for stacked avatars display
  const displayMembers = (leaderboard.memberDetails || leaderboard.players || []).filter(
    (m: any) => m && (m.avatar || m.photoUrl || m.username || m.displayName)
  );
  // Use sorted players (with rank data) for podium; fall back to memberDetails
  const rankedPlayers = leaderboard.players?.length && leaderboard.players[0]?.currentRank
    ? leaderboard.players
    : displayMembers;
  // Build podium: top 2 + current user (or top 3 if user is already in top 3)
  const currentUserPlayer = rankedPlayers.find((p: any) => p.userId === currentUserId);
  const currentUserInTop3 = rankedPlayers.slice(0, 3).some((p: any) => p.userId === currentUserId);
  const podiumPlayers = currentUserInTop3 || !currentUserPlayer
    ? rankedPlayers.slice(0, 3)
    : [...rankedPlayers.slice(0, 2), currentUserPlayer];

  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
      <View style={styles.cardBase}>
        <View style={styles.card}>
        <Pressable
          onPress={() => onPress(leaderboard)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          {/* Face gradient */}
          <LinearGradient
            colors={['rgba(255,255,255,0.03)', 'transparent', 'rgba(0,0,0,0.08)']}
            locations={[0, 0.55, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Top highlight bevel */}
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />

          {/* Main content */}
          <View style={styles.mainSection}>
            {leaderboard.partyIcon ? (
              <Image source={{ uri: leaderboard.partyIcon }} style={styles.icon} resizeMode="cover" />
            ) : gameLogo ? (
              <Image source={gameLogo} style={styles.icon} resizeMode="contain" />
            ) : (
              <View style={styles.iconPlaceholder}>
                <ThemedText style={styles.iconPlaceholderText}>
                  {leaderboard.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}

            <View style={styles.info}>
              <ThemedText style={styles.name} numberOfLines={1}>{leaderboard.name}</ThemedText>
              <ThemedText style={styles.meta} numberOfLines={1}>
                {leaderboard.game}
                <ThemedText style={styles.metaSep}> · </ThemedText>
                {leaderboard.members} player{leaderboard.members !== 1 ? 's' : ''}
              </ThemedText>
            </View>

            <IconSymbol size={14} name="chevron.right" color="#333" />
          </View>

          {/* Stacked member avatars */}
          {displayMembers.length > 0 && (
            <View style={styles.membersRow}>
              <View style={styles.stackedAvatarsInline}>
                {displayMembers.slice(0, 4).map((player: any, index: number) => {
                  const photo = player.avatar || player.photoUrl;
                  const name = player.username || player.displayName || '?';
                  return (
                    <View
                      key={player.userId || index}
                      style={[styles.avatarWrapInline, { marginLeft: index === 0 ? 0 : -8, zIndex: 10 - index }]}
                    >
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatarImgInline} />
                      ) : (
                        <View style={styles.avatarFallbackInline}>
                          <ThemedText style={styles.avatarFallbackTextInline}>{name.charAt(0)}</ThemedText>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
              <ThemedText style={styles.competingText}>
                {leaderboard.members} competing
              </ThemedText>
            </View>
          )}

          {/* Mini Podium Preview */}
          {podiumPlayers.length > 0 && (
            <View style={styles.podiumSection}>
              {podiumPlayers.map((player: any, index: number) => {
                const photo = player.avatar || player.photoUrl;
                const name = player.username || player.displayName || '?';
                const isCurrentUser = currentUserId && player.userId === currentUserId;
                const isFirst = index === 0;

                return (
                  <View
                    key={player.userId || index}
                    style={[styles.podiumSlot, isFirst && styles.podiumSlotFirst]}
                  >
                    <ThemedText style={[styles.podiumRank, isFirst && styles.podiumRankFirst]}>
                      {isCurrentUser
                        ? `YOU · #${player.rank || index + 1}`
                        : `${getOrdinal(player.rank || index + 1)}`}
                    </ThemedText>
                    <View style={[styles.podiumAvatarWrap, isFirst && styles.podiumAvatarFirst]}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.podiumAvatarImg} />
                      ) : (
                        <View style={styles.podiumAvatarFallback}>
                          <ThemedText style={styles.podiumAvatarText}>{name.charAt(0).toUpperCase()}</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={[styles.podiumName, isCurrentUser && styles.podiumNameYou]} numberOfLines={1}>
                      {name}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footerPanel}>
            <View style={styles.footerLeft}>
              {isActive && (
                <View style={styles.activeTag}>
                  <View style={styles.challengeDot} />
                  <ThemedText style={styles.challengeText}>Challenge</ThemedText>
                </View>
              )}
              {!isActive && (
                <ThemedText style={styles.memberCount}>
                  {leaderboard.members}/{leaderboard.maxMembers || 10}
                </ThemedText>
              )}
            </View>

            {daysInfo && isActive ? (
              <ThemedText style={[styles.daysLeft, daysInfo.daysLeft < 7 && styles.daysLeftUrgent]}>{daysInfo.daysLeft} days left</ThemedText>
            ) : (
              <View style={styles.stackedAvatars}>
                {allMembers.slice(0, 3).map((player: any, index: number) => {
                  const photo = player.avatar || player.photoUrl;
                  const name = player.username || player.displayName || '?';
                  return (
                    <View
                      key={player.userId || index}
                      style={[styles.avatarWrap, { marginLeft: index === 0 ? 0 : -8, zIndex: 5 - index }]}
                    >
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatarImg} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <ThemedText style={styles.avatarFallbackText}>{name.charAt(0)}</ThemedText>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default React.memo(LeaderboardCard);

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 12,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardBase: {
    backgroundColor: '#0a0a0a',
    borderRadius: 15,
    paddingBottom: 2,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderTopColor: 'rgba(255,255,255,0.09)',
  },
  accentLine: {
    height: 1.5,
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 12,
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholderText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#444',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  meta: {
    fontSize: 13,
    color: '#666',
  },
  metaSep: {
    color: '#333',
  },
  // Stacked avatars row
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  stackedAvatarsInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapInline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  avatarImgInline: {
    width: '100%',
    height: '100%',
  },
  avatarFallbackInline: {
    width: '100%',
    height: '100%',
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackTextInline: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
  },
  competingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  // Podium
  podiumSection: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 6,
  },
  podiumSlot: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#141414',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  podiumSlotFirst: {
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  podiumRank: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 0.5,
  },
  podiumRankFirst: {
    color: '#FFD700',
  },
  podiumAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
  },
  podiumAvatarFirst: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  podiumAvatarImg: {
    width: '100%',
    height: '100%',
  },
  podiumAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  podiumName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#888',
    maxWidth: '90%',
  },
  podiumNameYou: {
    color: '#C9A84E',
    fontWeight: '600',
  },
  // Footer
  footerPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131313',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#131313',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#555',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  challengeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D4A843',
  },
  challengeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
  },
  daysLeft: {
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
  },
  daysLeftUrgent: {
    color: '#ef4444',
  },
  memberCount: {
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
  },
});
