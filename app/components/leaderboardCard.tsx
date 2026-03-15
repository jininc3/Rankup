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
  maxMembers?: number;
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
  const maxMembers = leaderboard.maxMembers ?? 10;

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
    <TouchableOpacity
      activeOpacity={0.8}
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
          {/* Left Section - Leaderboard Icon */}
          <View style={styles.leftSection}>
            {leaderboard.partyIcon ? (
              <Image
                source={{ uri: leaderboard.partyIcon }}
                style={styles.leaderboardIcon}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.iconPlaceholder}>
                <ThemedText style={styles.iconPlaceholderText}>
                  {leaderboard.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Center Section - Name & Game */}
          <View style={styles.centerSection}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {leaderboard.name.toUpperCase()}
            </ThemedText>
            <View style={styles.gameRow}>
              <ThemedText style={styles.gameName}>{leaderboard.game}</ThemedText>
              {gameLogo && (
                <>
                  <View style={styles.gameDivider} />
                  <Image source={gameLogo} style={styles.gameLogoInline} resizeMode="contain" />
                </>
              )}
            </View>
            {/* Top players indicator */}
            {topPlayers.length > 0 && (
              <View style={styles.playersRow}>
                <View style={styles.stackedAvatars}>
                  {topPlayers.map((player, index) => (
                    <View
                      key={player.odId || index}
                      style={[
                        styles.miniAvatar,
                        { marginLeft: index === 0 ? 0 : -6, zIndex: 5 - index }
                      ]}
                    >
                      {player.photoUrl ? (
                        <Image
                          source={{ uri: player.photoUrl }}
                          style={styles.miniAvatarImage}
                        />
                      ) : (
                        <View style={styles.miniAvatarPlaceholder}>
                          <ThemedText style={styles.miniAvatarText}>
                            {(player.displayName || '?').charAt(0)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
                {daysInfo && (
                  <ThemedText style={styles.daysLeftText}>
                    {daysInfo.daysLeft}d left
                  </ThemedText>
                )}
              </View>
            )}
          </View>

          {/* Right Section - Member Count */}
          <View style={styles.rightSection}>
            <View style={styles.memberCount}>
              <IconSymbol size={16} name="person.2.fill" color="#888" />
              <ThemedText style={styles.memberText}>
                <ThemedText style={styles.currentMembers}>{leaderboard.members}</ThemedText>
                <ThemedText style={styles.maxMembers}>/{maxMembers}</ThemedText>
              </ThemedText>
            </View>
          </View>

          {/* Enter Arrow */}
          <View style={styles.enterArrow}>
            <IconSymbol size={18} name="chevron.right" color="#555" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  gradientBorder: {
    borderRadius: 0,
    padding: 2,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  leftSection: {
    marginRight: 14,
  },
  leaderboardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2a2a',
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  iconPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 72,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  gameName: {
    fontSize: 13,
    color: '#888',
  },
  gameDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#555',
    marginHorizontal: 8,
  },
  gameLogoInline: {
    width: 16,
    height: 16,
    opacity: 0.8,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
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
    fontSize: 8,
    fontWeight: '600',
    color: '#888',
  },
  daysLeftText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  rightSection: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberText: {
    fontSize: 14,
  },
  currentMembers: {
    color: '#fff',
    fontWeight: '600',
  },
  maxMembers: {
    color: '#666',
    fontWeight: '400',
  },
  enterArrow: {
    paddingLeft: 4,
  },
});
