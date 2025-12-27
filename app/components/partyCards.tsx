import { ThemedText } from '@/components/themed-text';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant.png'),
  'League of Legends': require('@/assets/images/leagueoflegends.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
  'CS2': require('@/assets/images/valorant.png'), // placeholder
  'Overwatch 2': require('@/assets/images/valorant.png'), // placeholder
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
}

interface PartyCardsProps {
  leaderboard: Leaderboard;
  onPress: (leaderboard: Leaderboard) => void;
}

export default function PartyCards({ leaderboard, onPress }: PartyCardsProps) {
  return (
    <TouchableOpacity
      style={styles.leaderboardCard}
      onPress={() => onPress(leaderboard)}
    >
      {/* Top section with icon and title */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleSection}>
          <ThemedText style={styles.leaderboardName}>{leaderboard.name}</ThemedText>
        </View>
        <View style={styles.leaderboardIconContainer}>
          <Image
            source={GAME_LOGOS[leaderboard.game] || GAME_LOGOS['Valorant']}
            style={styles.gameLogoImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Progress section */}
      {leaderboard.userRank && (
        <View style={styles.progressSection}>
          <ThemedText style={styles.progressText}>
            {Math.round((leaderboard.userRank / leaderboard.members) * 100)}%
          </ThemedText>
          <ThemedText style={styles.endTimeText}>
            Rank #{leaderboard.userRank} of {leaderboard.members}
          </ThemedText>
        </View>
      )}

      {/* Progress bar */}
      {leaderboard.userRank && (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(leaderboard.userRank / leaderboard.members) * 100}%` }
            ]}
          />
        </View>
      )}

      {/* Bottom meta info */}
      <View style={styles.cardFooter}>
        {leaderboard.isJoined && (
          <View style={styles.joinedBadge}>
            <ThemedText style={styles.joinedBadgeText}>Joined</ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  leaderboardCard: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
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
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameLogoImage: {
    width: 48,
    height: 48,
  },
  leaderboardName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  endTimeText: {
    fontSize: 13,
    color: '#666',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinedBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  joinedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
