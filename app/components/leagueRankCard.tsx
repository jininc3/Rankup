import { ThemedText } from '@/components/themed-text';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getProfileIconUrl } from '@/services/riotService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [modalVisible, setModalVisible] = useState(false);
  const [cardHidden, setCardHidden] = useState(false);
  const [cardPosition, setCardPosition] = useState({ x: 20, y: SCREEN_HEIGHT - 350, width: 0 });

  const cardRef = useRef<View>(null);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const startY = useRef(new Animated.Value(SCREEN_HEIGHT - 350)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  // Shimmer animation loop
  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
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

    // Measure card position before opening modal
    cardRef.current?.measureInWindow((x, y, width, height) => {
      setCardPosition({ x, y, width });
      startY.setValue(y); // Set immediately for animation
      setCardHidden(true);

      // Open modal and animate
      setModalVisible(true);

      // Animation: brief pause, then smooth slide up with blur, then flip
      Animated.sequence([
        // Brief pause for anticipation
        Animated.delay(150),
        // Blur/overlay fades in and card slides up together
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnimation, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(1.1)),
            useNativeDriver: false,
          }),
        ]),
        // Small pause before flip
        Animated.delay(50),
        // Then flip the card
        Animated.spring(flipAnimation, {
          toValue: 1,
          friction: 8,
          tension: 10,
          useNativeDriver: false,
        }),
      ]).start();

      setIsFlipped(true);
    });
  };

  const handleCloseModal = () => {
    // Reverse: flip first, then smooth slide down + fade out
    Animated.sequence([
      // Flip back to front - use timing for predictable completion
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Slide down and fade out overlay - use linear easing to prevent overshoot
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 400,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Reset all animation values to ensure clean state
      slideAnimation.setValue(0);
      flipAnimation.setValue(0);
      setCardHidden(false);
      setIsFlipped(false);
      setTimeout(() => {
        setModalVisible(false);
      }, 50);
    });
  };

  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
  };

  // Scale-based flip animation
  const scaleY = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 1],
  });

  // Slide animation - moves card from its exact position to top
  // translateY = startY * (1 - slide) + 80 * slide
  const inverseSlide = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const translateY = Animated.add(
    Animated.multiply(startY, inverseSlide),
    Animated.multiply(slideAnimation, 80)
  );

  const animatedStyle = {
    transform: [{ scaleY }],
  };

  const modalCardStyle = {
    transform: [{ translateY }, { scaleY }],
  };

  // Render card content (shared between static card and modal card)
  const renderCardContent = () => (
    <LinearGradient
      colors={showBack ? ['#091428', '#0f1f3d', '#1a3a5c'] : ['#1a3a5c', '#0f1f3d', '#091428']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardBackground}
    >
      {/* Static shimmer/gloss effect - left */}
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.15)',
          'rgba(255,255,255,0.05)',
          'transparent',
          'transparent',
          'rgba(255,255,255,0.03)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.staticShimmer}
        pointerEvents="none"
      />

      {/* Static shimmer/gloss effect - right */}
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.12)',
          'rgba(255,255,255,0.04)',
          'transparent',
          'transparent',
        ]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.staticShimmerRight}
        pointerEvents="none"
      />

      {/* Animated shimmer effect overlay */}
      <Animated.View
        style={[
          styles.shimmerContainer,
          {
            transform: [{ translateX: shimmerTranslate }, { rotate: '25deg' }],
          },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.03)',
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0.15)',
            'rgba(255,255,255,0.08)',
            'rgba(255,255,255,0.03)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>

      {/* Inside border */}
      <View style={styles.innerBorder} />

      {showBack ? (
        /* Back content - modern stats display */
        <View style={styles.cardBackContent}>
          {/* Decorative corner accents */}
          <View style={styles.techCornerTL} />
          <View style={styles.techCornerBR} />

          {/* Profile section - Top Left */}
          <View style={styles.profileSection}>
            {game.profileIconId ? (
              <View style={styles.profileImageWrapper}>
                <Image
                  source={{ uri: getProfileIconUrl(game.profileIconId) }}
                  defaultSource={require('@/assets/images/lol.png')}
                  style={styles.backPlayerCard}
                />
                <View style={styles.profileGlow} />
              </View>
            ) : null}
            <View style={styles.usernameContainer}>
              <ThemedText style={styles.backUsername}>{username}</ThemedText>
              <View style={styles.levelBadge}>
                <ThemedText style={styles.backLevelText}>LVL {game.trophies || 1}</ThemedText>
              </View>
            </View>
          </View>

          {/* Rank section - Right side */}
          <View style={styles.rankSection}>
            <ThemedText style={styles.rankLabel}>CURRENT</ThemedText>
            <View style={styles.rankIconWrapper}>
              <View style={styles.rankGlowOuter} />
              <View style={styles.rankGlowInner} />
              <Image
                source={getRankIcon(game.rank)}
                style={styles.statsRankIcon}
                resizeMode="contain"
              />
            </View>
            <ThemedText style={styles.rankName}>{game.rank || 'Unranked'}</ThemedText>
            <ThemedText style={styles.rankPoints}>{game.trophies} LP</ThemedText>
          </View>

          {/* Stats - Bottom Left */}
          <View style={styles.statsSection}>
            <View style={styles.statColumn}>
              <ThemedText style={styles.statColumnValue}>{game.wins}</ThemedText>
              <ThemedText style={styles.statColumnLabel}>Wins</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <ThemedText style={styles.statColumnValue}>{game.winRate}%</ThemedText>
              <ThemedText style={styles.statColumnLabel}>Win Rate</ThemedText>
            </View>
          </View>
        </View>
      ) : (
        /* Front content - clean card front */
        <View style={styles.cardFront}>
          {/* Subtle glass overlay */}
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.12)',
              'rgba(255,255,255,0.05)',
              'rgba(255,255,255,0.02)',
              'rgba(255,255,255,0.05)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassOverlay}
          />

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
  );

  return (
    <>
      <TouchableOpacity
        ref={cardRef as any}
        style={[styles.cardOuter, cardHidden && styles.cardHidden]}
        onPress={handlePress}
        activeOpacity={isFocused ? 0.9 : 1}
        disabled={!isFocused && viewOnly}
      >
        {/* 3D Shadow layers */}
        <View style={styles.shadow3} />
        <View style={styles.shadow2} />
        <View style={styles.shadow1} />

        {/* Single animated card that swaps content at midpoint */}
        <Animated.View style={[styles.rankCard, animatedStyle]}>
          {renderCardContent()}
        </Animated.View>
      </TouchableOpacity>

      {/* Modal for expanded card view */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        {/* Blurred overlay - tappable to close */}
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <Animated.View
            style={[styles.overlayBackground, { opacity: overlayOpacity }]}
          >
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            {/* Dark tint over blur */}
            <View style={styles.blurTint} />
          </Animated.View>
        </Pressable>

        {/* Animated card in modal - positioned exactly over original */}
        <Animated.View
          style={[
            styles.modalCard,
            { left: cardPosition.x, width: cardPosition.width || undefined },
            modalCardStyle
          ]}
          pointerEvents="none"
        >
          {/* 3D Shadow layers */}
          <View style={styles.shadow3} />
          <View style={styles.shadow2} />
          <View style={styles.shadow1} />

          <View style={styles.rankCard}>
            {renderCardContent()}
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    height: 220,
  },
  cardHidden: {
    opacity: 0,
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
    width: 120,
    height: '200%',
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
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
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
  // Back of card styles - Modern Techy
  cardBackContent: {
    flex: 1,
    padding: 16,
  },
  // Decorative corner accents (matching front style)
  techCornerTL: {
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
  techCornerBR: {
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
  // Profile section - Top Left (inside corner border)
  profileSection: {
    position: 'absolute',
    top: 20,
    left: 30,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  backPlayerCard: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  profileGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(100,150,255,0.3)',
  },
  usernameContainer: {
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  backUsername: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  levelBadge: {
    marginTop: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  backLevelText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 1,
  },
  // Rank section - Right side, vertically centered
  rankSection: {
    position: 'absolute',
    right: 40,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rankGlowOuter: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rankGlowInner: {
    position: 'absolute',
    width: 75,
    height: 75,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statsRankIcon: {
    width: 85,
    height: 85,
    zIndex: 1,
  },
  rankLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8e9297',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  rankName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  rankPoints: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5c6066',
    marginTop: 2,
  },
  // Stats section - Bottom Left (inside border)
  statsSection: {
    position: 'absolute',
    bottom: 28,
    left: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statColumn: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 14,
  },
  statColumnLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statColumnValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blurTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalCard: {
    position: 'absolute',
    top: 0,
    height: 220,
    zIndex: 2,
  },
});
