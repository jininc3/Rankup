import { ThemedText } from '@/components/themed-text';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  valorantCard?: string; // Valorant player card URL
}

interface ValorantRankCardProps {
  game: Game;
  username: string;
  viewOnly?: boolean; // If true, card is not clickable (for viewing other users)
  userId?: string; // ID of the user whose stats to view (for viewing other users)
  isFocused?: boolean; // If true, card is in focused/unstacked mode and can be flipped
}

// Valorant rank icon mapping - Includes subdivision ranks
const VALORANT_RANK_ICONS: { [key: string]: any } = {
  // Base ranks (fallback)
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

  // Subdivision ranks
  iron1: require('@/assets/images/valorantranks/iron1.png'),
  iron2: require('@/assets/images/valorantranks/iron2.png'),
  iron3: require('@/assets/images/valorantranks/iron3.png'),
  bronze1: require('@/assets/images/valorantranks/bronze1.png'),
  bronze2: require('@/assets/images/valorantranks/bronze2.png'),
  bronze3: require('@/assets/images/valorantranks/bronze3.png'),
  silver1: require('@/assets/images/valorantranks/silver1.png'),
  silver2: require('@/assets/images/valorantranks/silver2.png'),
  silver3: require('@/assets/images/valorantranks/silver3.png'),
  gold1: require('@/assets/images/valorantranks/gold1.png'),
  gold2: require('@/assets/images/valorantranks/gold2.png'),
  gold3: require('@/assets/images/valorantranks/gold3.png'),
  platinum1: require('@/assets/images/valorantranks/platinum1.png'),
  platinum2: require('@/assets/images/valorantranks/platinum2.png'),
  platinum3: require('@/assets/images/valorantranks/platinum3.png'),
  diamond1: require('@/assets/images/valorantranks/diamond1.png'),
  diamond2: require('@/assets/images/valorantranks/diamond2.png'),
  diamond3: require('@/assets/images/valorantranks/diamond3.png'),
  ascendant1: require('@/assets/images/valorantranks/ascendant1.png'),
  ascendant2: require('@/assets/images/valorantranks/ascendant2.png'),
  ascendant3: require('@/assets/images/valorantranks/ascendant3.png'),
  immortal1: require('@/assets/images/valorantranks/immortal1.png'),
  immortal2: require('@/assets/images/valorantranks/immortal2.png'),
  immortal3: require('@/assets/images/valorantranks/immortal3.png'),
};

export default function ValorantRankCard({ game, username, viewOnly = false, userId, isFocused = false }: ValorantRankCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [cardHidden, setCardHidden] = useState(false);
  const [cardPosition, setCardPosition] = useState({ x: 20, y: SCREEN_HEIGHT - 350, width: 0 });

  const cardRef = useRef<View>(null);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Listen to animation value to swap content at midpoint
  useEffect(() => {
    const listenerId = flipAnimation.addListener(({ value }) => {
      // Swap content when we cross the midpoint
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
            easing: Easing.out(Easing.back(1.1)), // Slight overshoot for smooth feel
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
      // Flip back to front
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 7,
        tension: 20,
        useNativeDriver: false,
      }),
      // Slide down and fade out overlay
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 350,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Modal card is now exactly over original card position
      // Show original card first
      setCardHidden(false);
      setIsFlipped(false);

      // Close modal after original card is rendered to prevent flash
      // Use setTimeout to ensure original card has painted
      setTimeout(() => {
        setModalVisible(false);
      }, 50);
    });
  };

  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return VALORANT_RANK_ICONS.unranked;
    }

    const parts = rank.split(' ');
    const tier = parts[0].toLowerCase();
    const subdivision = parts[1];

    if (subdivision) {
      const subdivisionKey = tier + subdivision;
      if (VALORANT_RANK_ICONS[subdivisionKey]) {
        return VALORANT_RANK_ICONS[subdivisionKey];
      }
    }

    return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
  };

  // Scale-based flip animation (more reliable than 3D rotation)
  const scaleY = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 1],
  });

  // Slide animation - moves card from its exact position to top
  const translateY = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [cardPosition.y, 80], // Start from measured position, slide to top
  });

  const animatedStyle = {
    transform: [{ scaleY }],
  };

  const modalCardStyle = {
    transform: [{ translateY }, { scaleY }],
  };

  // Render card content (shared between static card and modal card)
  const renderCardContent = () => (
    <LinearGradient
      colors={showBack ? ['#5C141D', '#8B1E2B', '#DC3D4B'] : ['#DC3D4B', '#8B1E2B', '#5C141D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardBackground}
    >
      {/* Inside border */}
      <View style={styles.innerBorder} />

      {showBack ? (
        /* Back content - modern techy stats display */
        <View style={styles.cardBackContent}>
          {/* Decorative tech lines */}
          <View style={styles.techLineTop} />
          <View style={styles.techLineBottom} />
          <View style={styles.techCornerTR} />
          <View style={styles.techCornerBL} />

          {/* Header - Profile and username */}
          <View style={styles.backHeader}>
            <View style={styles.profileRow}>
              {game.valorantCard && (
                <View style={styles.profileImageWrapper}>
                  <Image
                    source={{ uri: game.valorantCard }}
                    style={styles.backPlayerCard}
                  />
                  <View style={styles.profileGlow} />
                </View>
              )}
              <View style={styles.usernameContainer}>
                <ThemedText style={styles.backUsername}>{username}</ThemedText>
                <View style={styles.levelBadge}>
                  <ThemedText style={styles.backLevelText}>LVL {game.trophies || 1}</ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Center - Rank display */}
          <View style={styles.rankDisplayContainer}>
            <ThemedText style={styles.currentRankLabel}>Current Rank</ThemedText>
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
            <ThemedText style={styles.rankPoints}>{game.trophies || 0} pts</ThemedText>
          </View>

          {/* Bottom - Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <ThemedText style={styles.statColumnLabel}>Wins</ThemedText>
              <ThemedText style={styles.statColumnValue}>{game.wins}</ThemedText>
            </View>
            <View style={styles.statColumn}>
              <ThemedText style={styles.statColumnLabel}>Losses</ThemedText>
              <ThemedText style={styles.statColumnValue}>{game.losses}</ThemedText>
            </View>
            <View style={styles.statColumn}>
              <ThemedText style={styles.statColumnLabel}>Wins %</ThemedText>
              <ThemedText style={styles.statColumnValue}>{game.winRate}%</ThemedText>
            </View>
          </View>
        </View>
      ) : (
        /* Front content - enticing card front */
        <View style={styles.cardFront}>
          {/* Valorant logo - large centered background watermark */}
          <Image
            source={require('@/assets/images/valorant-black.png')}
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
  // 3D Shadow layers
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
  // Back of card styles - Modern Techy
  cardBackContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  // Decorative tech elements
  techLineTop: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  techLineBottom: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  techCornerTR: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  techCornerBL: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageWrapper: {
    position: 'relative',
  },
  backPlayerCard: {
    width: 38,
    height: 38,
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
    borderColor: 'rgba(255,100,100,0.3)',
  },
  usernameContainer: {
    marginLeft: 10,
  },
  backUsername: {
    fontSize: 13,
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
    alignSelf: 'flex-start',
  },
  backLevelText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 1,
  },
  // Rank display container - centered
  rankDisplayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentRankLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  rankIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankGlowOuter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rankGlowInner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statsRankIcon: {
    width: 70,
    height: 70,
    zIndex: 1,
  },
  rankName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  rankPoints: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    marginTop: 2,
  },
  // Stats row - horizontal layout
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statColumnLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    marginBottom: 4,
  },
  statColumnValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
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
    height: 220,
    zIndex: 2,
  },
});