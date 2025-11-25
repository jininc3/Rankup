import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, Image } from 'react-native';

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

export default function RankCard({ game, username }: RankCardProps) {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to the game stats screen with game data
    router.push({
      pathname: '/components/gameStats',
      params: {
        game: JSON.stringify(game),
      },
    });
  };

  // Define pastel colors for each game
  const getGameColor = () => {
    switch (game.name) {
      case 'Valorant':
        return '#e8a5a5'; // Dark pastel red
      case 'League of Legends':
        return '#b3d9ff'; // Pastel blue
      case 'Apex Legends':
        return '#fff4b3'; // Pastel yellow
      default:
        return '#e0e0e0'; // Default gray
    }
  };

  // Get game image
  const getGameImage = () => {
    switch (game.name) {
      case 'Valorant':
        return require('@/assets/images/valorant.png');
      case 'League of Legends':
        return require('@/assets/images/leagueoflegends.png');
      case 'Apex Legends':
        return require('@/assets/images/apex.png');
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.rankCard, { backgroundColor: getGameColor() }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.cardFront}>
        <View style={styles.cardHeader}>
          <Image source={getGameImage()} style={styles.cardGameImage} resizeMode="contain" />
        </View>

        <View style={styles.cardMiddle}>
          <ThemedText style={styles.cardRankLabel}>CURRENT RANK</ThemedText>
          <ThemedText style={styles.cardRankValue}>{game.rank}</ThemedText>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.cardUserInfo}>
            <ThemedText style={styles.cardUsername}>@{username}</ThemedText>
          </View>
          <ThemedText style={styles.swipeHint}>Tap to view stats →</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rankCard: {
    padding: 20,
    borderRadius: 16,
    height: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardFront: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'flex-start',
  },
  cardGameImage: {
    width: 40,
    height: 40,
  },
  cardMiddle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cardRankLabel: {
    fontSize: 11,
    color: '#666',
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardRankValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -1,
    paddingVertical: 10,
  },
  cardFooter: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 5,
    paddingBottom: 0,
  },
  cardUserInfo: {
    flex: 1,
  },
  cardUsername: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 9,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});