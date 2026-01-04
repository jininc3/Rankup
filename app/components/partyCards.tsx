import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

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
    >
      {/* Top section with icon and title */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleSection}>
          <ThemedText style={styles.leaderboardName}>{leaderboard.name}</ThemedText>
          {leaderboard.partyId && (
            <ThemedText style={styles.partyId}>ID: {leaderboard.partyId}</ThemedText>
          )}
        </View>
        <View style={styles.leaderboardIconContainer}>
          <Image
            source={GAME_LOGOS[leaderboard.game] || GAME_LOGOS['Valorant']}
            style={styles.gameLogoImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Stats section */}
      <View style={styles.statsContainer}>
        {/* User Ranking */}
        {leaderboard.userRank && (
          <View style={[styles.statBox, { backgroundColor: '#424549' }]}>
            <ThemedText style={styles.statLabel}>Your Rank</ThemedText>
            <ThemedText style={styles.statValue}>#{leaderboard.userRank}</ThemedText>
            <ThemedText style={styles.statSubtext}>of {leaderboard.members}</ThemedText>
          </View>
        )}

        {/* Days Left */}
        {daysInfo.totalDays > 0 && (
          <View style={[styles.statBox, { backgroundColor: '#424549' }]}>
            <ThemedText style={styles.statLabel}>Days</ThemedText>
            <ThemedText style={styles.statValue}>
              {daysInfo.currentDay}/{daysInfo.totalDays}
            </ThemedText>
            <ThemedText style={styles.statSubtext}>
              {daysInfo.daysLeft} {daysInfo.daysLeft === 1 ? 'day' : 'days'} left
            </ThemedText>
          </View>
        )}
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  leaderboardCard: {
    flexDirection: 'column',
    backgroundColor: '#36393e',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: '#2c2f33',
    borderTopColor: '#40444b',
    borderLeftColor: '#40444b',
    borderBottomColor: '#202225',
    borderRightColor: '#202225',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  leaderboardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  gameLogoImage: {
    width: 48,
    height: 48,
  },
  leaderboardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  partyId: {
    fontSize: 12,
    fontWeight: '500',
    color: '#b9bbbe',
    letterSpacing: 0.2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#72767d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: '#72767d',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#2c2f33',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 3,
  },
});
