import React from 'react';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

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
  const daysInfo = calculateDaysInfo(leaderboard.startDate, leaderboard.endDate);
  const gameLogo = GAME_LOGOS[leaderboard.game];
  const isActive = leaderboard.challengeStatus === 'active';

  const topPlayers = (leaderboard.players || []).filter(
    (player: any) => player && (player.photoUrl || player.displayName || player.username)
  ).slice(0, 3);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(leaderboard)}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.headerSection}>
        {leaderboard.partyIcon ? (
          <Image source={{ uri: leaderboard.partyIcon }} style={styles.leaderboardIcon} resizeMode="cover" />
        ) : gameLogo ? (
          <Image source={gameLogo} style={styles.leaderboardIcon} resizeMode="contain" />
        ) : (
          <View style={styles.iconPlaceholder}>
            <ThemedText style={styles.iconPlaceholderText}>
              {leaderboard.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}

        <View style={styles.headerInfo}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {leaderboard.name.toUpperCase()}
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText style={styles.gameText}>{leaderboard.game}</ThemedText>
            {isActive && (
              <>
                <View style={styles.metaDot} />
                <View style={styles.challengeBadge}>
                  <View style={styles.challengeDot} />
                  <ThemedText style={styles.challengeText}>CHALLENGE</ThemedText>
                </View>
              </>
            )}
            {daysInfo && isActive && (
              <>
                <View style={styles.metaDot} />
                <ThemedText style={styles.daysText}>{daysInfo.daysLeft}d left</ThemedText>
              </>
            )}
          </View>
        </View>

        <IconSymbol size={16} name="chevron.right" color="#555" />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {topPlayers.length > 0 && (
            <View style={styles.stackedAvatars}>
              {topPlayers.map((player: any, index: number) => (
                <View
                  key={player.odId || index}
                  style={[styles.miniAvatarWrapper, { marginLeft: index === 0 ? 0 : -10, zIndex: 5 - index }]}
                >
                  <View style={styles.miniAvatar}>
                    {player.photoUrl ? (
                      <Image source={{ uri: player.photoUrl }} style={styles.miniAvatarImage} />
                    ) : (
                      <View style={styles.miniAvatarPlaceholder}>
                        <ThemedText style={styles.miniAvatarText}>
                          {(player.displayName || '?').charAt(0)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
          <ThemedText style={styles.playersText}>
            {leaderboard.members} player{leaderboard.members !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(LeaderboardCard);

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  leaderboardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  iconPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#555',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gameText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22C55E',
  },
  challengeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22C55E',
    letterSpacing: 0.5,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
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
  miniAvatarWrapper: {
    alignItems: 'center',
  },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#0f0f0f',
    overflow: 'hidden',
  },
  miniAvatarImage: {
    width: '100%',
    height: '100%',
  },
  miniAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
  playersText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
});
