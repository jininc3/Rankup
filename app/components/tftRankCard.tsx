import { ThemedText } from '@/components/themed-text';
import { getProfileIconUrl } from '@/services/riotService';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

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

interface TftRankCardProps {
  game: Game;
  username: string;
}

// TFT rank icon mapping (using League ranks)
const TFT_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/leagueranks/iron.png'),
  bronze: require('@/assets/images/leagueranks/bronze.png'),
  silver: require('@/assets/images/leagueranks/silver.png'),
  gold: require('@/assets/images/leagueranks/gold.png'),
  platinum: require('@/assets/images/leagueranks/platinum.png'),
  diamond: require('@/assets/images/leagueranks/diamond.png'),
  master: require('@/assets/images/leagueranks/masters.png'),
  grandmaster: require('@/assets/images/leagueranks/grandmaster.png'),
  challenger: require('@/assets/images/leagueranks/challenger.png'),
  unranked: require('@/assets/images/leagueranks/unranked.png'),
};

export default function TftRankCard({ game, username }: TftRankCardProps) {
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
      return TFT_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return TFT_RANK_ICONS[tier] || TFT_RANK_ICONS.unranked;
  };

  return (
    <TouchableOpacity
      style={styles.rankCard}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.cardBackground}>
        {/* TFT logo watermark */}
        <Image
          source={require('@/assets/images/tft.png')}
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
    shadowColor: '#7C3AED',
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
    backgroundColor: '#7C3AED', // Dark purple for TFT
  },
  backgroundLogo: {
    position: 'absolute',
    width: 210,
    height: 210,
    top: '50%',
    left: '50%',
    marginTop: -105,
    marginLeft: -105,
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
    marginTop: -40,
  },
  cardRankLabel: {
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rankIcon: {
    width: 90,
    height: 90,
    marginTop: -5,
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
