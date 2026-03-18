import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MatchHistoryEntry {
  matchId: string;
  agent: string;
  kills: number;
  deaths: number;
  assists: number;
  won: boolean;
  map: string;
  gameStart: number; // Unix timestamp
  score: string; // e.g., "13-7"
}

interface Game {
  id: number;
  name: string;
  rank: string;
  trophies: number;
  icon: string;
  wins: number;
  losses: number;
  winRate: number;
  matchHistory?: MatchHistoryEntry[];
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
  const [showMatchHistory, setShowMatchHistory] = useState(false);

  const cardRef = useRef<View>(null);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const startY = useRef(new Animated.Value(SCREEN_HEIGHT - 350)).current;
  const matchHistoryAnimation = useRef(new Animated.Value(0)).current;

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
    // If match history is open, close it first
    if (showMatchHistory) {
      Animated.timing(matchHistoryAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setShowMatchHistory(false);
      });
      return;
    }

    // Reverse: flip first, then smooth slide down + fade out
    Animated.sequence([
      // Flip back to front
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 7,
        tension: 20,
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
      setCardHidden(false);
      setIsFlipped(false);
      matchHistoryAnimation.setValue(0);
      setShowMatchHistory(false);
      setTimeout(() => {
        setModalVisible(false);
      }, 50);
    });
  };

  const handleMatchHistoryPress = () => {
    if (showMatchHistory) {
      // Collapse match history
      Animated.timing(matchHistoryAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setShowMatchHistory(false);
      });
    } else {
      // Expand match history
      setShowMatchHistory(true);
      Animated.timing(matchHistoryAnimation, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.05)),
        useNativeDriver: false,
      }).start();
    }
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
  // translateY = startY * (1 - slide) + 80 * slide
  const inverseSlide = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const translateY = Animated.add(
    Animated.multiply(startY, inverseSlide),
    Animated.multiply(slideAnimation, 80)
  );

  // Match history container height animation - expands upward from bottom
  // When expanded, it should go to just below the rank card (card is at y=80, height=220, so bottom is 300 + 16px gap = 316)
  const expandedHeight = SCREEN_HEIGHT - 316;
  const matchHistoryHeight = matchHistoryAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [90, expandedHeight], // From peek height to just below the card
  });

  // Chevron rotation
  const chevronRotation = matchHistoryAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Match history opacity for content (fade in when expanded)
  const matchHistoryContentOpacity = matchHistoryAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
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
          {/* Decorative corner accents */}
          <View style={styles.techCornerTL} />
          <View style={styles.techCornerBR} />

          {/* Profile section - Top Left */}
          <View style={styles.profileSection}>
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
            <ThemedText style={styles.rankPoints}>{game.trophies} RR</ThemedText>
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
        /* Front content - enticing card front */
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

        {/* Match History Container - Fixed at bottom of screen */}
        <Animated.View
          style={[
            styles.matchHistoryContainer,
            { height: matchHistoryHeight }
          ]}
        >
          <TouchableOpacity
            style={styles.matchHistoryHeader}
            onPress={handleMatchHistoryPress}
            activeOpacity={0.8}
          >
            <View style={styles.matchHistoryHeaderLeft}>
              <View style={styles.matchHistoryIcon}>
                <IconSymbol size={18} name="clock.arrow.circlepath" color="#DC3D4B" />
              </View>
              <ThemedText style={styles.matchHistoryTitle}>Match History</ThemedText>
            </View>
            <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
              <IconSymbol size={20} name="chevron.up" color="rgba(255,255,255,0.6)" />
            </Animated.View>
          </TouchableOpacity>

          {/* Match History Content */}
          <Animated.View style={[styles.matchHistoryContentWrapper, { opacity: matchHistoryContentOpacity }]}>
            {/* Table Header */}
            <View style={styles.matchTableHeader}>
              <ThemedText style={[styles.matchTableHeaderText, styles.matchColAgent]}>Agent</ThemedText>
              <ThemedText style={[styles.matchTableHeaderText, styles.matchColKDA]}>KDA</ThemedText>
              <ThemedText style={[styles.matchTableHeaderText, styles.matchColResult]}>Result</ThemedText>
              <ThemedText style={[styles.matchTableHeaderText, styles.matchColDate]}>Date</ThemedText>
            </View>
            <ScrollView
              style={styles.matchHistoryContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.matchHistoryScrollContent}
            >
              {game.matchHistory && game.matchHistory.length > 0 ? (
                game.matchHistory.map((match, index) => {
                  const date = new Date(match.gameStart);
                  const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                  return (
                    <View key={match.matchId || index} style={styles.matchItem}>
                      <View style={[styles.matchIndicator, match.won ? styles.matchWin : styles.matchLoss]} />
                      <ThemedText style={[styles.matchCellText, styles.matchColAgent]} numberOfLines={1}>
                        {match.agent}
                      </ThemedText>
                      <ThemedText style={[styles.matchCellText, styles.matchColKDA]}>
                        {match.kills}/{match.deaths}/{match.assists}
                      </ThemedText>
                      <ThemedText style={[
                        styles.matchCellText,
                        styles.matchColResult,
                        match.won ? styles.matchResultWin : styles.matchResultLoss
                      ]}>
                        {match.won ? 'Victory' : 'Defeat'}
                      </ThemedText>
                      <ThemedText style={[styles.matchCellText, styles.matchColDate, styles.matchDateText]}>
                        {formattedDate}
                      </ThemedText>
                    </View>
                  );
                })
              ) : (
                <View style={styles.noMatchesContainer}>
                  <ThemedText style={styles.noMatchesText}>No recent matches</ThemedText>
                </View>
              )}
            </ScrollView>
          </Animated.View>
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
    borderColor: 'rgba(255,100,100,0.3)',
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
    zIndex: 2,
  },
  // Match History styles
  matchHistoryContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1d21',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  matchHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  matchHistoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchHistoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 61, 75, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  matchHistoryContentWrapper: {
    flex: 1,
  },
  matchTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingLeft: 34, // Account for indicator
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  matchTableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#72767d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchHistoryContent: {
    flex: 1,
  },
  matchHistoryScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  matchIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 14,
  },
  matchWin: {
    backgroundColor: '#4CAF50',
  },
  matchLoss: {
    backgroundColor: '#DC3D4B',
  },
  // Column widths
  matchColAgent: {
    width: 80,
  },
  matchColKDA: {
    width: 70,
    textAlign: 'center',
  },
  matchColResult: {
    width: 65,
    textAlign: 'center',
  },
  matchColDate: {
    flex: 1,
    textAlign: 'right',
  },
  matchCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  matchResultWin: {
    color: '#4CAF50',
  },
  matchResultLoss: {
    color: '#DC3D4B',
  },
  matchDateText: {
    color: '#72767d',
  },
  noMatchesContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noMatchesText: {
    fontSize: 14,
    color: '#72767d',
  },
});