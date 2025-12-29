import { ThemedText } from '@/components/themed-text';
import { StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { getProfileIconUrl } from '@/services/riotService';

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
  profileIconId?: number;
}

interface ValorantRankCardProps {
  game: Game;
  username: string;
}

// Valorant rank icon mapping
const VALORANT_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/valorantranks/iron.png'),
  bronze: require('@/assets/images/valorantranks/bronze.png'),
  silver: require('@/assets/images/valorantranks/silver.png'),
  gold: require('@/assets/images/valorantranks/gold.png'),
  platinum: require('@/assets/images/valorantranks/platinum.png'),
  diamond: require('@/assets/images/valorantranks/diamond.png'),
  ascendant: require('@/assets/images/valorantranks/ascendant.png'),
  immortal: require('@/assets/images/valorantranks/immortal.png'),
  radiant: require('@/assets/images/valorantranks/radiant.png'),
  unranked: require('@/assets/images/valorantranks/unranked.png'),
};

export default function ValorantRankCard({ game, username }: ValorantRankCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/components/gameStats',
      params: {
        game: JSON.stringify(game),
      },
    });
  };

  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return VALORANT_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
  };

  return (
    <TouchableOpacity
      style={styles.rankCard}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.cardBackground}>
        {/* Valorant logo watermark */}
        <Image
          source={require('@/assets/images/valorant-logo.png')}
          style={styles.backgroundLogo}
          resizeMode="contain"
        />

        {/* Front of card - Credit card style */}
        <View style={styles.cardFront}>
          {/* Profile Icon - Top Right */}
          <View style={styles.cardHeader}>
            {game.profileIconId ? (
              <Image
                source={{ uri: getProfileIconUrl(game.profileIconId) }}
                style={styles.cardProfileIcon}
              />
            ) : (
              <ThemedText style={styles.cardGameIcon}>{game.icon}</ThemedText>
            )}
          </View>

          {/* Current Rank - Centered */}
          <View style={styles.cardMiddle}>
            <ThemedText style={styles.cardRankLabel}>CURRENT RANK</ThemedText>
            <ThemedText style={styles.cardRankValue}>{game.rank}</ThemedText>
            <Image
              source={getRankIcon(game.rank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
          </View>

          {/* Footer - Bottom */}
          <View style={styles.cardFooter}>
            <View style={styles.cardUserInfo}>
              <ThemedText style={styles.cardUsername}>@{username}</ThemedText>
            </View>
            <ThemedText style={styles.swipeHint}>Tap to view details →</ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rankCard: {
    borderRadius: 24,
    height: 220,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#B2313B', // Dark Valorant red
  },
  backgroundLogo: {
    position: 'absolute',
    width: 500,
    height: 500,
    top: '50%',
    left: '50%',
    marginTop: -250,
    marginLeft: -250,
    opacity: 0.08,
  },
  cardFront: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  cardHeader: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  cardGameIcon: {
    fontSize: 42,
  },
  cardProfileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardMiddle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40, // Position for Valorant card
  },
  cardRankLabel: {
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rankIcon: {
    width: 70,
    height: 70,
    marginTop: 5,
    marginBottom: 2,
  },
  cardRankValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
    marginTop: 0,
    lineHeight: 28,
    includeFontPadding: false,
  },
  cardFooter: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardUserInfo: {
    flex: 1,
  },
  cardUsername: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
});
