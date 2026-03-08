import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
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
  partyId?: string;
  startDate?: any;
  endDate?: any;
  type?: 'party' | 'leaderboard';
}

interface PartyCardsProps {
  leaderboard: Leaderboard;
  onPress: (leaderboard: Leaderboard) => void;
}

// Helper function to calculate days information
const calculateDaysInfo = (startDate: any, endDate: any): { currentDay: number; totalDays: number; daysLeft: number } | null => {
  if (!startDate || !endDate) {
    return null;
  }

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

export default function PartyCards({ leaderboard, onPress }: PartyCardsProps) {
  const daysInfo = calculateDaysInfo(leaderboard.startDate, leaderboard.endDate);
  const isLeaderboard = leaderboard.type !== 'party' && daysInfo !== null;
  const progressPercentage = daysInfo && daysInfo.totalDays > 0
    ? Math.min(100, (daysInfo.currentDay / daysInfo.totalDays) * 100)
    : 0;

  const getAccentColor = () => {
    if (leaderboard.game === 'Valorant') return '#FF4655';
    if (leaderboard.game === 'League of Legends') return '#C89B3C';
    return '#888';
  };

  const accentColor = getAccentColor();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(leaderboard)}
      style={styles.card}
    >
      {/* Left Section - Game Icon */}
      <View style={[styles.iconSection, { backgroundColor: accentColor + '15' }]}>
        {GAME_LOGOS[leaderboard.game] ? (
          <Image
            source={GAME_LOGOS[leaderboard.game]}
            style={styles.gameIcon}
            resizeMode="contain"
          />
        ) : (
          <IconSymbol size={28} name="gamecontroller.fill" color={accentColor} />
        )}
      </View>

      {/* Middle Section - Info */}
      <View style={styles.infoSection}>
        {/* Party Name */}
        <ThemedText style={styles.partyName} numberOfLines={1}>
          {leaderboard.name}
        </ThemedText>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <IconSymbol size={12} name="person.2.fill" color="#666" />
            <ThemedText style={styles.metaText}>{leaderboard.members}</ThemedText>
          </View>

          {isLeaderboard && daysInfo && (
            <View style={styles.metaItem}>
              <IconSymbol size={12} name="clock" color="#666" />
              <ThemedText style={styles.metaText}>{daysInfo.daysLeft}d</ThemedText>
            </View>
          )}

          {leaderboard.userRank && (
            <View style={[styles.rankBadge, { backgroundColor: accentColor + '20' }]}>
              <ThemedText style={[styles.rankText, { color: accentColor }]}>
                #{leaderboard.userRank}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Progress Bar (for leaderboards) */}
        {isLeaderboard && daysInfo && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercentage}%`, backgroundColor: accentColor }
              ]}
            />
          </View>
        )}
      </View>

      {/* Right Section - Arrow */}
      <View style={styles.arrowSection}>
        <IconSymbol size={16} name="chevron.right" color="#444" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  iconSection: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginVertical: 12,
    borderRadius: 10,
  },
  gameIcon: {
    width: 30,
    height: 30,
  },
  infoSection: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  partyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  rankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#252525',
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  arrowSection: {
    paddingRight: 14,
  },
});
