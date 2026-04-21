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

function LeaderboardCard({ leaderboard, onPress }: LeaderboardCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const daysInfo = calculateDaysInfo(leaderboard.startDate, leaderboard.endDate);
  const gameLogo = GAME_LOGOS[leaderboard.game];
  const isActive = leaderboard.challengeStatus === 'active';

  // Use memberDetails (has avatar/username) with fallback to players (has photoUrl/displayName)
  const members = leaderboard.memberDetails?.length ? leaderboard.memberDetails : leaderboard.players || [];
  const topPlayers = members.filter(
    (m: any) => m && (m.avatar || m.photoUrl || m.username || m.displayName)
  ).slice(0, 3);

  // Count how many remote images need to load (partyIcon + avatar URLs)
  const avatarUrls = topPlayers.map((p: any) => p.avatar || p.photoUrl).filter(Boolean);
  const remoteImageCount = (leaderboard.partyIcon ? 1 : 0) + avatarUrls.length;
  const loadedCount = React.useRef(0);
  const fadeAnim = React.useRef(new Animated.Value(remoteImageCount > 0 ? 0 : 1)).current;

  const onRemoteImageLoad = React.useCallback(() => {
    loadedCount.current += 1;
    if (loadedCount.current >= remoteImageCount) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeAnim, remoteImageCount]);

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
          {/* Face gradient — subtle curved lighting top→bottom */}
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
            <Image source={{ uri: leaderboard.partyIcon }} style={styles.icon} resizeMode="cover" onLoad={onRemoteImageLoad} />
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

        {/* Recessed footer panel — always shown for consistent card size */}
        <View style={styles.footerPanel}>
          <View style={styles.footerLeft}>
            {topPlayers.length > 0 && (
              <View style={styles.stackedAvatars}>
                {topPlayers.map((player: any, index: number) => {
                  const photo = player.avatar || player.photoUrl;
                  const name = player.username || player.displayName || '?';
                  return (
                    <View
                      key={player.userId || player.odId || index}
                      style={[styles.avatarWrap, { marginLeft: index === 0 ? 0 : -8, zIndex: 5 - index }]}
                    >
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatarImg} onLoad={onRemoteImageLoad} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <ThemedText style={styles.avatarFallbackText}>
                            {name.charAt(0)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
            {isActive && (
              <View style={styles.activeTag}>
                <View style={styles.challengeDot} />
                <ThemedText style={styles.challengeText}>Challenge</ThemedText>
              </View>
            )}
          </View>

          {daysInfo && isActive ? (
            <ThemedText style={[styles.daysLeft, daysInfo.daysLeft < 7 && styles.daysLeftUrgent]}>{daysInfo.daysLeft} days left</ThemedText>
          ) : (
            <ThemedText style={styles.memberCount}>
              {leaderboard.members}/{leaderboard.maxMembers || 10}
            </ThemedText>
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
  noMembersText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#444',
  },
  memberCount: {
    fontSize: 11,
    fontWeight: '500',
    color: '#fff',
  },
});
