import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

// Game logo mapping
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
  memberDetails?: any[];
}

interface LeaderboardCardProps {
  leaderboard: Leaderboard;
  onPress: (leaderboard: Leaderboard) => void;
  showDivider?: boolean;
}

// Helper function to calculate days information
const calculateDaysInfo = (startDate: any, endDate: any): { currentDay: number; totalDays: number; daysLeft: number } | null => {
  if (!startDate || !endDate) return null;

  const parseDate = (date: any): Date | null => {
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate();
    } else if (date instanceof Date) {
      return date;
    } else if (typeof date === 'string') {
      const parts = date.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
      return new Date(date);
    }
    return null;
  };

  const startDateObj = parseDate(startDate);
  const endDateObj = parseDate(endDate);

  if (!startDateObj || !endDateObj || isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDateObj.setHours(0, 0, 0, 0);
  endDateObj.setHours(0, 0, 0, 0);

  const totalDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = Math.min(
    Math.ceil((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    totalDays
  );
  const daysLeft = Math.max(0, totalDays - currentDay + 1);

  return { currentDay: Math.max(1, currentDay), totalDays, daysLeft };
};

export default function LeaderboardCard({ leaderboard, onPress }: LeaderboardCardProps) {
  const daysInfo = calculateDaysInfo(leaderboard.startDate, leaderboard.endDate);
  const gameLogo = GAME_LOGOS[leaderboard.game];
  const maxMembers = leaderboard.maxMembers ?? 10;

  // Get challenge type display text
  const getChallengeTypeText = (): string => {
    if (leaderboard.challengeType === 'rank') return 'Highest Rank';
    return 'LP Climbing';
  };

  // Get top 3 players for ranking rows
  const topPlayers = (leaderboard.players || []).filter(
    (player: any) => player && (player.photoUrl || player.displayName || player.username)
  ).slice(0, 3);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(leaderboard)}
      style={styles.container}
    >
      {/* Header Section */}
      <View style={styles.headerSection}>
        {leaderboard.partyIcon ? (
          <Image
            source={{ uri: leaderboard.partyIcon }}
            style={styles.leaderboardIcon}
            resizeMode="cover"
          />
        ) : gameLogo ? (
          <Image
            source={gameLogo}
            style={styles.leaderboardIcon}
            resizeMode="contain"
          />
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
            <ThemedText style={styles.metaText}>{getChallengeTypeText()}</ThemedText>
            <View style={styles.metaDot} />
            <ThemedText style={styles.metaText}>
              {leaderboard.members}/{maxMembers}
            </ThemedText>
            {daysInfo && (
              <>
                <View style={styles.metaDot} />
                <ThemedText style={styles.metaText}>{daysInfo.daysLeft}d left</ThemedText>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Summary Footer */}
      <View style={styles.summaryFooter}>
        <View style={styles.summaryLeft}>
          {topPlayers.length > 0 && (
            <View style={styles.stackedAvatars}>
              {topPlayers.map((player: any, index: number) => (
                <View
                  key={player.odId || index}
                  style={[styles.miniAvatarWrapper, { marginLeft: index === 0 ? 0 : -8, zIndex: 5 - index }]}
                >
                  {index === 0 && (
                    <View style={styles.crownContainer}>
                      <IconSymbol size={9} name="crown.fill" color="#FFD700" />
                    </View>
                  )}
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
          <ThemedText style={styles.summaryText}>
            {leaderboard.members} player{leaderboard.members !== 1 ? 's' : ''}
          </ThemedText>
        </View>
        {leaderboard.userRank && (
          <View style={styles.yourRankBadge}>
            <ThemedText style={styles.yourRankText}>#{leaderboard.userRank}</ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    backgroundColor: '#141414',
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  leaderboardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#444',
  },
  // Summary Footer
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  summaryLeft: {
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
  crownContainer: {
    position: 'absolute',
    top: -8,
    zIndex: 10,
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
  },
  miniAvatarImage: {
    width: '100%',
    height: '100%',
  },
  miniAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
  },
  yourRankBadge: {
    backgroundColor: '#252525',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  yourRankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
