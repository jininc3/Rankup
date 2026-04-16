import { ThemedText } from '@/components/themed-text';
import { getProfileIconUrl } from '@/services/riotService';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  viewOnly?: boolean; // If true, card is not clickable (for viewing other users)
  userId?: string; // ID of the user whose stats to view (for viewing other users)
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

export default function TftRankCard({ game, username, viewOnly = false, userId }: TftRankCardProps) {
  const router = useRouter();
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  // Shimmer animation loop
  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, []);

  // Shimmer translate animation
  const shimmerTranslate = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH * 1.5, SCREEN_WIDTH * 1.5],
  });

  const handlePress = () => {
    router.push({
      pathname: '/components/gameStats',
      params: {
        game: JSON.stringify(game),
        ...(userId && { userId }), // Only include userId if provided
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
    <View style={styles.cardOuter}>
      <TouchableOpacity
        style={styles.rankCard}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#2A2A2A', '#1A1A1A', '#0A0A0A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBackground}
        >
        {/* Animated metal sweep */}
        <Animated.View
          style={[
            styles.shimmerContainer,
            { transform: [{ translateX: shimmerTranslate }, { rotate: '20deg' }] },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255,255,255,0.03)',
              'rgba(255,255,255,0.10)',
              'rgba(255,255,255,0.20)',
              'rgba(255,255,255,0.10)',
              'rgba(255,255,255,0.03)',
              'transparent',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>

        {/* TFT logo watermark */}
        <Image
          source={require('@/assets/images/tft.png')}
          style={styles.backgroundLogo}
          resizeMode="contain"
        />

        {/* Inside border */}
        <View style={styles.innerBorder} />

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
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    height: 220,
  },
  // 3D Shadow layers - light from right side
  shadow3: {
    position: 'absolute',
    top: 10,
    left: -10,
    right: 14,
    bottom: -10,
    backgroundColor: '#000',
    borderRadius: 26,
    opacity: 0.2,
  },
  shadow2: {
    position: 'absolute',
    top: 6,
    left: -6,
    right: 10,
    bottom: -6,
    backgroundColor: '#000',
    borderRadius: 25,
    opacity: 0.25,
  },
  shadow1: {
    position: 'absolute',
    top: 3,
    left: -3,
    right: 5,
    bottom: -3,
    backgroundColor: '#000',
    borderRadius: 24,
    opacity: 0.3,
  },
  rankCard: {
    borderRadius: 24,
    height: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  staticShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  staticShimmerRight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
  },
  shimmerContainer: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    zIndex: 10,
  },
  shimmerGradient: {
    width: 200,
    height: '200%',
  },
  innerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
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
