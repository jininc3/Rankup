import { ThemedText } from '@/components/themed-text';
import { StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { getProfileIconUrl } from '@/services/riotService';
import { LinearGradient } from 'expo-linear-gradient';

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

interface LeagueRankCardProps {
  game: Game;
  username: string;
  viewOnly?: boolean; // If true, card is not clickable (for viewing other users)
  userId?: string; // ID of the user whose stats to view (for viewing other users)
}

// League of Legends rank icon mapping
const LEAGUE_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/leagueranks/iron.png'),
  bronze: require('@/assets/images/leagueranks/bronze.png'),
  silver: require('@/assets/images/leagueranks/silver.png'),
  gold: require('@/assets/images/leagueranks/gold.png'),
  platinum: require('@/assets/images/leagueranks/platinum.png'),
  emerald: require('@/assets/images/leagueranks/emerald.png'),
  diamond: require('@/assets/images/leagueranks/diamond.png'),
  master: require('@/assets/images/leagueranks/masters.png'),
  grandmaster: require('@/assets/images/leagueranks/grandmaster.png'),
  challenger: require('@/assets/images/leagueranks/challenger.png'),
  unranked: require('@/assets/images/leagueranks/unranked.png'),
};

export default function LeagueRankCard({ game, username, viewOnly = false, userId }: LeagueRankCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (viewOnly) return; // Don't navigate if view only
    router.push({
      pathname: '/components/leagueGameStats',
      params: {
        game: JSON.stringify(game),
        ...(userId && { userId }), // Only include userId if provided
      },
    });
  };

  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
  };

  const CardWrapper = viewOnly ? View : TouchableOpacity;

  return (
    <CardWrapper
      style={styles.rankCard}
      {...(!viewOnly && { onPress: handlePress, activeOpacity: 0.9 })}
    >
      <LinearGradient
        colors={['#1a3a5c', '#0f1f3d', '#091428']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardBackground}
      >
        {/* League of Legends logo watermark */}
        <Image
          source={require('@/assets/images/lol.png')}
          style={styles.backgroundLogo}
          resizeMode="contain"
        />

        {/* Front of card - Credit card style */}
        <View style={styles.cardFront}>
          {/* Game Logo - Top Left */}
          <View style={styles.cardGameLogo}>
            <Image
              source={require('@/assets/images/lol-icon.png')}
              style={styles.gameLogoLarge}
              resizeMode="contain"
            />
          </View>

          {/* Profile Icon - Top Right */}
          <View style={styles.cardHeader}>
            {game.profileIconId ? (
              <Image
                source={{ uri: getProfileIconUrl(game.profileIconId) }}
                defaultSource={require('@/assets/images/lol.png')}
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
              <ThemedText style={styles.cardUsername}>{username}</ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>
    </CardWrapper>
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
  },
  backgroundLogo: {
    position: 'absolute',
    width: 302,
    height: 302,
    top: '50%',
    left: '50%',
    marginTop: -151,
    marginLeft: -151,
    opacity: 0.08,
  },
  cardFront: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  cardGameLogo: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  gameLogo: {
    width: 32,
    height: 32,
    opacity: 0.9,
  },
  gameLogoLarge: {
    width: 38,
    height: 38,
    opacity: 0.9,
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
    marginTop: -30, // Lower position for League card
  },
  cardRankLabel: {
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rankIcon: {
    width: 100,
    height: 100,
    marginTop: -10,
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
