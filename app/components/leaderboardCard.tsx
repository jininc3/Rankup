import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

// Game watermark logos
const GAME_WATERMARKS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

// Game-specific gradient colors
const GAME_GRADIENTS: { [key: string]: [string, string, string] } = {
  'Valorant': ['#2a1a1c', '#1f1214', '#151010'],
  'League of Legends': ['#1a1c2a', '#12141f', '#0d0e15'],
  'Apex Legends': ['#2a1818', '#1f1212', '#150e0e'],
  'default': ['#252525', '#1c1c1c', '#141414'],
};

// Game accent colors
const GAME_ACCENT_COLORS: { [key: string]: string } = {
  'Valorant': '#FF4655',
  'League of Legends': '#4A90D9',
  'Apex Legends': '#DA292A',
  'default': '#888',
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
  coverPhoto?: string;
}

interface LeaderboardCardProps {
  leaderboard: Leaderboard;
  onPress: (leaderboard: Leaderboard) => void;
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

export default function LeaderboardCard({ leaderboard, onPress }: LeaderboardCardProps) {
  const daysInfo = calculateDaysInfo(leaderboard.startDate, leaderboard.endDate);
  const progressPercentage = daysInfo && daysInfo.totalDays > 0
    ? Math.min(100, (daysInfo.currentDay / daysInfo.totalDays) * 100)
    : 0;

  const gradientColors = GAME_GRADIENTS[leaderboard.game] || GAME_GRADIENTS['default'];
  const accentColor = GAME_ACCENT_COLORS[leaderboard.game] || GAME_ACCENT_COLORS['default'];
  const watermarkLogo = GAME_WATERMARKS[leaderboard.game];
  const gameLogo = GAME_LOGOS[leaderboard.game];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(leaderboard)}
      style={styles.cardOuter}
    >
      {/* 3D Shadow layers */}
      <View style={styles.shadow3} />
      <View style={styles.shadow2} />
      <View style={styles.shadow1} />

      <View style={styles.card}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBackground}
        >
          {/* Background watermark logo */}
          {watermarkLogo && (
            <Image
              source={watermarkLogo}
              style={styles.backgroundLogo}
              resizeMode="contain"
            />
          )}

          {/* Inside border */}
          <View style={styles.innerBorder} />

          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Header - Game Logo */}
            <View style={styles.cardHeader}>
              <View style={styles.gameLogoContainer}>
                {gameLogo ? (
                  <Image
                    source={gameLogo}
                    style={styles.gameLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <IconSymbol size={24} name="gamecontroller.fill" color="#fff" />
                )}
              </View>

              {/* Rank Badge - Top Right */}
              {leaderboard.userRank && (
                <View style={styles.rankBadge}>
                  <ThemedText style={[styles.rankHash, { color: accentColor }]}>#</ThemedText>
                  <ThemedText style={[styles.rankNumber, { color: accentColor }]}>
                    {leaderboard.userRank}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Body - Name & Meta */}
            <View style={styles.cardBody}>
              <ThemedText style={styles.leaderboardName} numberOfLines={1}>
                {leaderboard.name}
              </ThemedText>
              <ThemedText style={styles.subtitle} numberOfLines={1}>
                {leaderboard.game} • {leaderboard.members} players
              </ThemedText>
            </View>

            {/* Footer - Progress Bar */}
            <View style={styles.cardFooter}>
              {daysInfo ? (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={[accentColor, accentColor + 'AA']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                    />
                  </View>
                  <View style={styles.progressMeta}>
                    <ThemedText style={styles.progressText}>
                      Day {daysInfo.currentDay}/{daysInfo.totalDays}
                    </ThemedText>
                    <ThemedText style={[styles.daysLeftText, { color: accentColor }]}>
                      {daysInfo.daysLeft}d left
                    </ThemedText>
                  </View>
                </View>
              ) : (
                <View style={styles.progressContainer} />
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    height: 150,
    marginBottom: 16,
  },
  // 3D Shadow layers
  shadow3: {
    position: 'absolute',
    top: 8,
    left: -8,
    right: 12,
    bottom: -8,
    backgroundColor: '#000',
    borderRadius: 20,
    opacity: 0.2,
  },
  shadow2: {
    position: 'absolute',
    top: 5,
    left: -5,
    right: 9,
    bottom: -5,
    backgroundColor: '#000',
    borderRadius: 19,
    opacity: 0.25,
  },
  shadow1: {
    position: 'absolute',
    top: 2,
    left: -2,
    right: 4,
    bottom: -2,
    backgroundColor: '#000',
    borderRadius: 18,
    opacity: 0.3,
  },
  card: {
    borderRadius: 18,
    height: 150,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    borderRadius: 18,
  },
  innerBorder: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backgroundLogo: {
    position: 'absolute',
    width: 140,
    height: 140,
    top: '50%',
    left: '50%',
    marginTop: -70,
    marginLeft: -70,
    opacity: 0.04,
    tintColor: '#fff',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 32,
    marginBottom: 8,
  },
  gameLogoContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameLogo: {
    width: 28,
    height: 28,
    opacity: 0.9,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  rankHash: {
    fontSize: 14,
    fontWeight: '300',
    fontStyle: 'italic',
    marginRight: 1,
    marginBottom: 4,
  },
  rankNumber: {
    fontSize: 26,
    fontWeight: '300',
    fontStyle: 'italic',
    letterSpacing: -1,
    lineHeight: 28,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  leaderboardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 10,
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  daysLeftText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
