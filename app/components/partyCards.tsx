import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
  'CS2': require('@/assets/images/valorant.png'), // placeholder
  'Overwatch 2': require('@/assets/images/valorant.png'), // placeholder
};

// Game color themes
const GAME_COLORS: { [key: string]: { light: string; border: string; progress: string } } = {
  'Valorant': {
    light: '#FFF5F5',
    border: '#FFE4E6',
    progress: '#FF4654',
  },
  'League of Legends': {
    light: '#F0FDFA',
    border: '#CCFBF1',
    progress: '#0AC8B9',
  },
  'default': {
    light: '#f8f9fa',
    border: '#e5e7eb',
    progress: '#000',
  },
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
  partyId?: string;
  startDate?: any;
  endDate?: any;
}

interface PartyCardsProps {
  leaderboard: Leaderboard;
  onPress: (leaderboard: Leaderboard) => void;
}

// Helper function to calculate days information
const calculateDaysInfo = (startDate: any, endDate: any): { currentDay: number; totalDays: number; daysLeft: number } => {
  if (!startDate || !endDate) {
    return { currentDay: 0, totalDays: 0, daysLeft: 0 };
  }

  // Parse dates
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
    return { currentDay: 0, totalDays: 0, daysLeft: 0 };
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

export default function PartyCards({ leaderboard, onPress }: PartyCardsProps) {
  const daysInfo = calculateDaysInfo(leaderboard.startDate, leaderboard.endDate);
  const colors = GAME_COLORS[leaderboard.game] || GAME_COLORS['default'];

  return (
    <TouchableOpacity
      style={styles.leaderboardCard}
      onPress={() => onPress(leaderboard)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#4a4d52', '#36393e', '#2c2f33']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          {/* Left: Icon */}
          <View style={styles.leaderboardIconContainer}>
            <Image
              source={GAME_LOGOS[leaderboard.game] || GAME_LOGOS['Valorant']}
              style={styles.gameLogoImage}
              resizeMode="contain"
            />
          </View>

          {/* Middle: Title and info */}
          <View style={styles.cardMainInfo}>
            <ThemedText style={styles.leaderboardName}>{leaderboard.name}</ThemedText>
            <View style={styles.statsRow}>
              {leaderboard.userRank && (
                <ThemedText style={styles.statText}>
                  Rank: <ThemedText style={styles.statValue}>#{leaderboard.userRank}</ThemedText>
                  <ThemedText style={styles.statLabel}> / {leaderboard.members}</ThemedText>
                </ThemedText>
              )}
              {leaderboard.userRank && daysInfo.totalDays > 0 && (
                <ThemedText style={styles.statDivider}>•</ThemedText>
              )}
              {daysInfo.totalDays > 0 && (
                <ThemedText style={styles.statText}>
                  Day <ThemedText style={styles.statValue}>{daysInfo.currentDay}/{daysInfo.totalDays}</ThemedText>
                  <ThemedText style={styles.statLabel}> ({daysInfo.daysLeft}d left)</ThemedText>
                </ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Progress bar */}
        {daysInfo.totalDays > 0 && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, (daysInfo.currentDay / daysInfo.totalDays) * 100)}%`,
                  backgroundColor: colors.progress
                }
              ]}
            />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  leaderboardCard: {
    flexDirection: 'column',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2c2f33',
    borderTopColor: '#40444b',
    borderLeftColor: '#40444b',
    borderBottomColor: '#202225',
    borderRightColor: '#202225',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: 10,
    borderRadius: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaderboardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gameLogoImage: {
    width: 28,
    height: 28,
  },
  cardMainInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#b9bbbe',
  },
  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#72767d',
  },
  statDivider: {
    fontSize: 11,
    color: '#72767d',
    marginHorizontal: 6,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: '#2c2f33',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
