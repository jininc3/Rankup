import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';

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

  const totalDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
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

  // Get gradient colors based on game
  const getGradientColors = (): [string, string, string] => {
    if (leaderboard.game === 'Valorant') return ['#c42743', '#ff6b6b', '#c42743'];
    if (leaderboard.game === 'League of Legends' || leaderboard.game === 'League') return ['#0a84ff', '#00d4ff', '#0a84ff'];
    return ['#333', '#555', '#333'];
  };

  // Get top 3 players for stacked avatars (only show if we have real player data)
  const topPlayers = (leaderboard.players || []).filter(
    (player: any) => player && (player.photoUrl || player.displayName || player.username)
  ).slice(0, 3);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(leaderboard)}
        style={styles.container}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={styles.innerContent}>
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
                  <IconSymbol size={14} name="person.2.fill" color="#fff" />
                  <ThemedText style={styles.statText}>{leaderboard.members}</ThemedText>
                </View>
                {daysInfo && (
                  <View style={styles.statItem}>
                    <IconSymbol size={14} name="hourglass" color="#fff" />
                    <ThemedText style={styles.statText}>{daysInfo.daysLeft}d</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Right Side - Stacked Profile Avatars */}
          {topPlayers.length > 0 && (
          <View style={styles.stackedAvatars}>
            {topPlayers.map((player, index) => (
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
          )}
        </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: -3,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  gradientBorder: {
    borderRadius: 12,
    padding: 1.5,
  },
  innerContent: {
    backgroundColor: '#252525',
    borderRadius: 10,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  leaderboardIcon: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#444',
  },
  info: {
    flex: 1,
    gap: 6,
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
    width: 16,
    height: 16,
    opacity: 0.8,
  },
  meta: {
    fontSize: 14,
    color: '#fff',
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
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stackedAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#252525',
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
    backgroundColor: '#333',
    marginVertical: 10,
    width: '30%',
    alignSelf: 'center',
  },
});
