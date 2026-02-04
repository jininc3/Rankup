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
  const progressPercentage = daysInfo.totalDays > 0
    ? Math.min(100, (daysInfo.currentDay / daysInfo.totalDays) * 100)
    : 0;

  const getAccentColor = () => {
    if (leaderboard.game === 'Valorant') return '#FF4655';
    if (leaderboard.game === 'League of Legends') return '#0AC8B9';
    return '#666';
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(leaderboard)}
      activeOpacity={0.8}
    >
      <View style={[styles.accentStrip, { backgroundColor: getAccentColor() }]} />

      <View style={styles.cardContent}>
        {/* Title Row */}
        <View style={styles.titleRow}>
          <ThemedText style={styles.title} numberOfLines={1}>{leaderboard.name}</ThemedText>
          {GAME_LOGOS[leaderboard.game] && (
            <Image
              source={GAME_LOGOS[leaderboard.game]}
              style={styles.gameLogo}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {/* Rank */}
          {leaderboard.userRank && (
            <View style={styles.stat}>
              <ThemedText style={[styles.statValue, { color: getAccentColor() }]}>
                #{leaderboard.userRank}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Rank</ThemedText>
            </View>
          )}

          {/* Members */}
          <View style={styles.stat}>
            <ThemedText style={styles.statValue}>{leaderboard.members}</ThemedText>
            <ThemedText style={styles.statLabel}>Players</ThemedText>
          </View>

          {/* Days */}
          {daysInfo.totalDays > 0 && (
            <View style={styles.stat}>
              <ThemedText style={styles.statValue}>
                {daysInfo.currentDay}/{daysInfo.totalDays}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Day</ThemedText>
            </View>
          )}

          {/* Days Left */}
          {daysInfo.daysLeft > 0 && (
            <View style={styles.stat}>
              <ThemedText style={styles.statValue}>{daysInfo.daysLeft}</ThemedText>
              <ThemedText style={styles.statLabel}>Left</ThemedText>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {daysInfo.totalDays > 0 && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor: getAccentColor(),
                }
              ]}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#40444b',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  accentStrip: {
    height: 3,
    width: '100%',
  },
  cardContent: {
    padding: 14,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    flex: 1,
  },
  gameLogo: {
    width: 20,
    height: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
