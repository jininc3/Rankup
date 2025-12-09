import { ThemedText } from '@/components/themed-text';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

interface Game {
  id: number;
  name: string;
  rank: string;
  trophies: number;
  icon: string;
  wins: number;
  losses: number;
  winRate: number;
  recentMatches: string[];
}

interface RankCardProps {
  game: Game;
  username: string;
}

export default function rankCard({ game, username }: RankCardProps) {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to gameStats page with game data
    router.push({
      pathname: '/components/gameStats',
      params: {
        game: JSON.stringify(game),
      },
    });
  };

  return (
    <TouchableOpacity
      style={styles.rankCard}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Front of card - Credit card style */}
      <View style={styles.cardFront}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.cardGameIcon}>{game.icon}</ThemedText>
        </View>

        <View style={styles.cardMiddle}>
          <ThemedText style={styles.cardRankLabel}>CURRENT RANK</ThemedText>
          <ThemedText style={styles.cardRankValue}>{game.rank}</ThemedText>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.cardUserInfo}>
            <ThemedText style={styles.cardUsername}>@{username}</ThemedText>
          </View>
          <ThemedText style={styles.swipeHint}>Tap to view details →</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rankCard: {
    backgroundColor: '#1e1b4b',
    padding: 30,
    borderRadius: 24,
    height: 220,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardFront: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    marginBottom: 30,
  },
  cardGameIcon: {
    fontSize: 42,
  },
  cardMiddle: {
    marginBottom: 30,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cardRankLabel: {
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardRankValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
    paddingVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardUserInfo: {
    flex: 1,
  },
  cardUsername: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
});
