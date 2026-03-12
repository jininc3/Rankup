import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
  userRank?: number | null;
  isJoined?: boolean;
  players?: any[];
  startDate?: any;
  endDate?: any;
  type?: 'party' | 'leaderboard';
  coverPhoto?: string;
  partyIcon?: string;
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

  const totalDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const currentDay = Math.min(
    Math.ceil((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    totalDays
  );
  const daysLeft = Math.max(0, totalDays - currentDay + 1);

  return { currentDay: Math.max(1, currentDay), totalDays, daysLeft };
};

export default function LeaderboardCard({ leaderboard, onPress, showDivider = true }: LeaderboardCardProps) {
  const daysInfo = calculateDaysInfo(leaderboard.startDate, leaderboard.endDate);
  const gameLogo = GAME_LOGOS[leaderboard.game];

  // Get top 3 players for stacked avatars
  const topPlayers = (leaderboard.players || []).slice(0, 3);

  // If no players data yet, create placeholders based on member count
  const displayPlayers = topPlayers.length > 0
    ? topPlayers
    : Array.from({ length: Math.min(leaderboard.members || 0, 3) }, (_, i) => ({
        odId: `placeholder-${i}`,
        displayName: '',
        photoUrl: null,
      }));

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(leaderboard)}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Leaderboard Icon */}
          {leaderboard.partyIcon ? (
            <View style={styles.iconContainer}>
              <Image
                source={{ uri: leaderboard.partyIcon }}
                style={styles.leaderboardIcon}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={styles.iconPlaceholder}>
              <ThemedText style={styles.iconPlaceholderText}>
                {leaderboard.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}

          {/* Info */}
          <View style={styles.info}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {leaderboard.name}
            </ThemedText>
            <View style={styles.metaRow}>
              {gameLogo && (
                <Image source={gameLogo} style={styles.gameLogo} resizeMode="contain" />
              )}
              <ThemedText style={styles.meta}>
                {leaderboard.game}
              </ThemedText>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <IconSymbol size={12} name="person.2.fill" color="#666" />
                  <ThemedText style={styles.statText}>{leaderboard.members}</ThemedText>
                </View>
                {daysInfo && (
                  <View style={styles.statItem}>
                    <IconSymbol size={12} name="hourglass" color="#666" />
                    <ThemedText style={styles.statText}>{daysInfo.daysLeft}d</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Right Side - Stacked Profile Avatars */}
          <View style={styles.stackedAvatars}>
            {displayPlayers.map((player, index) => (
              <View
                key={player.odId || index}
                style={[
                  styles.stackedAvatarContainer,
                  { zIndex: 5 - index, marginLeft: index === 0 ? 0 : -10 }
                ]}
              >
                {player.photoUrl ? (
                  <Image
                    source={{ uri: player.photoUrl }}
                    style={styles.stackedAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.stackedAvatarPlaceholder}>
                    <ThemedText style={styles.stackedAvatarText}>
                      {(player.displayName || player.username || '?').charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 4,
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  leaderboardIcon: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholderText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#444',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gameLogo: {
    width: 14,
    height: 14,
    opacity: 0.6,
  },
  meta: {
    fontSize: 13,
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
  },
  stackedAvatar: {
    width: '100%',
    height: '100%',
  },
  stackedAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 20,
  },
});
