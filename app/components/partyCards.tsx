import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

// Neutral gradient colors for all cards
const CARD_GRADIENT: [string, string, string] = ['#1e1e1e', '#181818', '#121212'];

// Game accent colors for progress bar and highlights
const GAME_ACCENT_COLORS: { [key: string]: string } = {
  'Valorant': '#FF4655',
  'League of Legends': '#C89B3C',
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
  partyIcon?: string;
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
  const isLeaderboard = leaderboard.type === 'leaderboard';
  const isParty = leaderboard.type === 'party';
  const progressPercentage = daysInfo && daysInfo.totalDays > 0
    ? Math.min(100, (daysInfo.currentDay / daysInfo.totalDays) * 100)
    : 0;

  const accentColor = GAME_ACCENT_COLORS[leaderboard.game] || GAME_ACCENT_COLORS['default'];
  const gameLogo = GAME_LOGOS[leaderboard.game];

  const renderCardContent = () => (
    <>
      {/* Inside border */}
      <View style={styles.innerBorder} />

      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Header Row - Party Icon and Game Logo */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {/* Party Icon */}
            {leaderboard.partyIcon ? (
              <View style={styles.partyIconContainer}>
                <Image
                  source={{ uri: leaderboard.partyIcon }}
                  style={styles.partyIcon}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={styles.partyIconPlaceholder}>
                <ThemedText style={styles.partyIconPlaceholderText}>
                  {leaderboard.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
          </View>
          {/* Game Logo */}
          <View style={styles.gameLogoContainer}>
            {gameLogo ? (
              <Image
                source={gameLogo}
                style={styles.gameLogo}
                resizeMode="contain"
              />
            ) : (
              <IconSymbol size={20} name="gamecontroller.fill" color="#fff" />
            )}
          </View>
        </View>

        {/* Body - Party Name & Meta */}
        <View style={styles.cardBody}>
          <ThemedText style={styles.partyName} numberOfLines={1}>
            {leaderboard.name}
          </ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={1}>
            {leaderboard.game}
            {isLeaderboard && daysInfo && ` • ${daysInfo.daysLeft} days left`}
            {isParty && ` • ${leaderboard.members} members`}
          </ThemedText>
        </View>

        {/* Footer - Progress Bar & Rank (only for leaderboard) */}
        <View style={styles.cardFooter}>
          {isLeaderboard && daysInfo ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[accentColor, accentColor + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                />
              </View>
              <ThemedText style={styles.progressText}>
                Day {daysInfo.currentDay}/{daysInfo.totalDays}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.progressContainer} />
          )}

          {/* Only show rank for leaderboards */}
          {isLeaderboard && leaderboard.userRank && (
            <View style={[styles.rankBadge, { borderColor: accentColor + '40' }]}>
              <ThemedText style={[styles.rankText, { color: accentColor }]}>#{leaderboard.userRank}</ThemedText>
            </View>
          )}
        </View>
      </View>
    </>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(leaderboard)}
      style={styles.cardOuter}
    >
      {/* 3D Shadow layers - light from right side */}
      <View style={styles.shadow3} />
      <View style={styles.shadow2} />
      <View style={styles.shadow1} />

      <View style={styles.card}>
        <LinearGradient
          colors={CARD_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBackground}
        >
          {renderCardContent()}
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
  // 3D Shadow layers - light from right side
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
  cardContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#252525',
  },
  partyIcon: {
    width: '100%',
    height: '100%',
  },
  partyIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyIconPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  gameLogoContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameLogo: {
    width: 24,
    height: 24,
    opacity: 0.7,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  partyName: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginRight: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  rankBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
