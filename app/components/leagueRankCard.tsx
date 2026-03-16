import { ThemedText } from '@/components/themed-text';
import { StyleSheet, TouchableOpacity, View, Image, Animated } from 'react-native';
import { getProfileIconUrl } from '@/services/riotService';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useRef, useEffect } from 'react';

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
  viewOnly?: boolean;
  userId?: string;
  isFocused?: boolean;
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

export default function LeagueRankCard({ game, username, viewOnly = false, userId, isFocused = false }: LeagueRankCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  // Listen to animation value to swap content at midpoint
  useEffect(() => {
    const listenerId = flipAnimation.addListener(({ value }) => {
      if (value >= 0.5 && !showBack) {
        setShowBack(true);
      } else if (value < 0.5 && showBack) {
        setShowBack(false);
      }
    });
    return () => flipAnimation.removeListener(listenerId);
  }, [showBack]);

  const handlePress = () => {
    if (viewOnly) return;

    const toValue = isFlipped ? 0 : 1;
    Animated.spring(flipAnimation, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: false,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
  };

  const scaleY = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 1],
  });

  const animatedStyle = {
    transform: [{ scaleY }],
  };

  return (
    <TouchableOpacity
      style={styles.cardOuter}
      onPress={handlePress}
      activeOpacity={isFocused ? 0.9 : 1}
      disabled={!isFocused && viewOnly}
    >
      {/* 3D Shadow layers */}
      <View style={styles.shadow3} />
      <View style={styles.shadow2} />
      <View style={styles.shadow1} />

      <Animated.View style={[styles.rankCard, animatedStyle]}>
        <LinearGradient
          colors={showBack ? ['#091428', '#0f1f3d', '#1a3a5c'] : ['#1a3a5c', '#0f1f3d', '#091428']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBackground}
        >
          {/* Inside border */}
          <View style={styles.innerBorder} />

          {showBack ? (
            /* Back content - player card style */
            <View style={styles.cardBackContent}>
              {/* Background logo watermark */}
              <Image
                source={require('@/assets/images/lol.png')}
                style={styles.backgroundLogo}
                resizeMode="contain"
              />

              {/* Profile Icon - centered */}
              {game.profileIconId ? (
                <Image
                  source={{ uri: getProfileIconUrl(game.profileIconId) }}
                  defaultSource={require('@/assets/images/lol.png')}
                  style={styles.backPlayerCard}
                />
              ) : null}

              {/* Rank icon */}
              <Image
                source={getRankIcon(game.rank)}
                style={styles.backRankIcon}
                resizeMode="contain"
              />

              {/* Player info at bottom */}
              <View style={styles.backFooter}>
                <ThemedText style={styles.backUsername}>{username}</ThemedText>
                <ThemedText style={styles.backRankText}>{game.rank || 'Unranked'}</ThemedText>
              </View>
            </View>
          ) : (
            /* Front content - clean card back */
            <View style={styles.cardFront}>
              {/* LoL logo - large centered background watermark */}
              <Image
                source={require('@/assets/images/lol.png')}
                style={styles.backgroundLogo}
                resizeMode="contain"
              />

              {/* Corner accents for visual interest */}
              <View style={styles.cornerAccentTL} />
              <View style={styles.cornerAccentTR} />
              <View style={styles.cornerAccentBL} />
              <View style={styles.cornerAccentBR} />
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    height: 220,
  },
  shadow3: {
    position: 'absolute',
    top: 10,
    left: -10,
    right: 14,
    bottom: -10,
    backgroundColor: '#000',
    borderRadius: 18,
    opacity: 0.2,
  },
  shadow2: {
    position: 'absolute',
    top: 6,
    left: -6,
    right: 10,
    bottom: -6,
    backgroundColor: '#000',
    borderRadius: 17,
    opacity: 0.25,
  },
  shadow1: {
    position: 'absolute',
    top: 3,
    left: -3,
    right: 5,
    bottom: -3,
    backgroundColor: '#000',
    borderRadius: 16,
    opacity: 0.3,
  },
  rankCard: {
    borderRadius: 16,
    height: 220,
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    borderRadius: 12,
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cardFront: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerAccentTL: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopLeftRadius: 4,
  },
  cornerAccentTR: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopRightRadius: 4,
  },
  cornerAccentBL: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderBottomLeftRadius: 4,
  },
  cornerAccentBR: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderBottomRightRadius: 4,
  },
  backgroundLogo: {
    position: 'absolute',
    width: 250,
    height: 250,
    top: '50%',
    left: '50%',
    marginTop: -125,
    marginLeft: -125,
    opacity: 0.08,
  },
  // Back of card styles
  cardBackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backPlayerCard: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 8,
  },
  backRankIcon: {
    width: 60,
    height: 60,
    position: 'absolute',
    top: 18,
    right: 18,
  },
  backFooter: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  backUsername: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  backRankText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
});
