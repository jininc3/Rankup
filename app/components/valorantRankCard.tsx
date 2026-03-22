import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  peakRank?: { tier: string; season: string };
  gamesPlayed?: number;
  mmr?: number;
  accountLevel?: number;
  mostPlayedAgent?: string; // Most played agent from recent matches
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

// Valorant agent small icons (for match history)
const VALORANT_AGENT_SMALL_ICONS: { [key: string]: any } = {
  astra: require('@/assets/images/valoranticons/astra.png'),
  breach: require('@/assets/images/valoranticons/breach.png'),
  brimstone: require('@/assets/images/valoranticons/brimstone.png'),
  chamber: require('@/assets/images/valoranticons/chamber.png'),
  clove: require('@/assets/images/valoranticons/clove.png'),
  cypher: require('@/assets/images/valoranticons/cypher.png'),
  deadlock: require('@/assets/images/valoranticons/deadlock.png'),
  fade: require('@/assets/images/valoranticons/fade.png'),
  gekko: require('@/assets/images/valoranticons/gekko.png'),
  harbor: require('@/assets/images/valoranticons/harbor.png'),
  iso: require('@/assets/images/valoranticons/iso.png'),
  jett: require('@/assets/images/valoranticons/jett.png'),
  kayo: require('@/assets/images/valoranticons/kayo.png'),
  killjoy: require('@/assets/images/valoranticons/killjoy.png'),
  miks: require('@/assets/images/valoranticons/miks.png'),
  neon: require('@/assets/images/valoranticons/neon.png'),
  omen: require('@/assets/images/valoranticons/omen.png'),
  phoenix: require('@/assets/images/valoranticons/phoenix.png'),
  raze: require('@/assets/images/valoranticons/raze.png'),
  reyna: require('@/assets/images/valoranticons/reyna.png'),
  sage: require('@/assets/images/valoranticons/sage.png'),
  skye: require('@/assets/images/valoranticons/skye.png'),
  sova: require('@/assets/images/valoranticons/sova.png'),
  tejo: require('@/assets/images/valoranticons/tejo.png'),
  veto: require('@/assets/images/valoranticons/veto.png'),
  viper: require('@/assets/images/valoranticons/viper.png'),
  vyse: require('@/assets/images/valoranticons/vyse.png'),
  waylay: require('@/assets/images/valoranticons/waylay.png'),
  yoru: require('@/assets/images/valoranticons/yoru.png'),
};

// Valorant agent image mapping (large, for statistics card)
const VALORANT_AGENT_ICONS: { [key: string]: any } = {
  astra: require('@/assets/images/valorantagents/astra.png'),
  breach: require('@/assets/images/valorantagents/breach.png'),
  brimstone: require('@/assets/images/valorantagents/brimstone.png'),
  chamber: require('@/assets/images/valorantagents/chamber.png'),
  clove: require('@/assets/images/valorantagents/clove.png'),
  cypher: require('@/assets/images/valorantagents/cypher.png'),
  deadlock: require('@/assets/images/valorantagents/deadlock.png'),
  fade: require('@/assets/images/valorantagents/fade.png'),
  gekko: require('@/assets/images/valorantagents/gekko.png'),
  harbor: require('@/assets/images/valorantagents/harbor.png'),
  iso: require('@/assets/images/valorantagents/iso.png'),
  jett: require('@/assets/images/valorantagents/jett.png'),
  kayo: require('@/assets/images/valorantagents/kayo.png'),
  killjoy: require('@/assets/images/valorantagents/killjoy.png'),
  miks: require('@/assets/images/valorantagents/miks.png'),
  neon: require('@/assets/images/valorantagents/neon.png'),
  omen: require('@/assets/images/valorantagents/omen.png'),
  phoenix: require('@/assets/images/valorantagents/phoenix.png'),
  raze: require('@/assets/images/valorantagents/raze.png'),
  reyna: require('@/assets/images/valorantagents/reyna.png'),
  sage: require('@/assets/images/valorantagents/sage.png'),
  skye: require('@/assets/images/valorantagents/skye.png'),
  sova: require('@/assets/images/valorantagents/sova.png'),
  tejo: require('@/assets/images/valorantagents/tejo.png'),
  veto: require('@/assets/images/valorantagents/veto.png'),
  viper: require('@/assets/images/valorantagents/viper.png'),
  vyse: require('@/assets/images/valorantagents/vyse.png'),
  waylay: require('@/assets/images/valorantagents/waylay.png'),
  yoru: require('@/assets/images/valorantagents/yoru.png'),
};

export default function ValorantRankCard({ game, username, viewOnly = false, userId, isFocused = false }: ValorantRankCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [cardPosition, setCardPosition] = useState({ x: 20, y: SCREEN_HEIGHT - 350, width: 0 });
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [matchHistoryExpanded, setMatchHistoryExpanded] = useState(false);

  // Calculate most played agent from match history if not provided
  const mostPlayedAgent = game.mostPlayedAgent || (() => {
    if (!game.matchHistory || game.matchHistory.length === 0) return null;
    const agentCounts: { [agent: string]: number } = {};
    game.matchHistory.forEach((match) => {
      if (match.agent) {
        agentCounts[match.agent] = (agentCounts[match.agent] || 0) + 1;
      }
    });
    let topAgent: string | null = null;
    let maxCount = 0;
    for (const [agent, count] of Object.entries(agentCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topAgent = agent;
      }
    }
    return topAgent;
  })();

  const cardRef = useRef<View>(null);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const startY = useRef(new Animated.Value(SCREEN_HEIGHT - 350)).current;
  const matchHistoryAnimation = useRef(new Animated.Value(0)).current;
  const matchHistoryExpandAnimation = useRef(new Animated.Value(0)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const stackCardOpacity = useRef(new Animated.Value(1)).current;
  const modalCardOpacity = useRef(new Animated.Value(1)).current;

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

      // Open modal and animate
      setModalVisible(true);
      modalCardOpacity.setValue(1); // Reset modal card opacity
      setShowMatchHistory(true); // Show cards container
      setMatchHistoryExpanded(false); // Start with match history collapsed

      // Animation: wait for modal to render, hide stack card, then slide up
      Animated.sequence([
        // Wait for modal to render first
        Animated.delay(50),
        // Hide stack card (modal card is now covering it)
        Animated.timing(stackCardOpacity, {
          toValue: 0,
          duration: 1,
          useNativeDriver: false,
        }),
        // Brief pause for anticipation
        Animated.delay(100),
        // Blur/overlay fades in, card slides up, and cards container expands together
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
          Animated.timing(matchHistoryAnimation, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(1.05)), // Match the card slide timing
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

  const handleMatchHistoryToggle = () => {
    const toValue = matchHistoryExpanded ? 0 : 1;
    setMatchHistoryExpanded(!matchHistoryExpanded);
    Animated.timing(matchHistoryExpandAnimation, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  // Just flip the card without closing the modal
  const handleCardFlip = () => {
    const toValue = isFlipped ? 0 : 1;
    Animated.timing(flipAnimation, {
      toValue,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleCloseModal = () => {
    // If match history is open, close it first
    if (showMatchHistory) {
      Animated.parallel([
        Animated.timing(matchHistoryAnimation, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(matchHistoryExpandAnimation, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(() => {
        setShowMatchHistory(false);
        setMatchHistoryExpanded(false);
      });
      return;
    }

    // Reverse: flip first, then smooth slide down + crossfade
    Animated.sequence([
      // Flip back to front
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 7,
        tension: 20,
        useNativeDriver: false,
      }),
      // Slide down, fade out overlay, crossfade modal card with stack card
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
        // Fade out modal card
        Animated.timing(modalCardOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        // Fade in stack card
        Animated.timing(stackCardOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      // Both cards have crossfaded - safe to close modal
      setModalVisible(false);
      setIsFlipped(false);
      matchHistoryAnimation.setValue(0);
      setShowMatchHistory(false);
    });
  };

  // Handle clicking on the rank card back - closes everything and flips card
  const handleCardBackPress = () => {
    Animated.sequence([
      // First: Collapse match history/statistics and flip card together
      Animated.parallel([
        // Collapse match history and statistics
        Animated.timing(matchHistoryAnimation, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(matchHistoryExpandAnimation, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        // Flip back to front
        Animated.timing(flipAnimation, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
      // Then: Slide down, fade out overlay, crossfade modal card with stack card
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Fade out modal card
        Animated.timing(modalCardOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        // Fade in stack card
        Animated.timing(stackCardOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      // Both cards have crossfaded - safe to close modal
      setModalVisible(false);
      setIsFlipped(false);
      setShowMatchHistory(false);
      setMatchHistoryExpanded(false);
    });
  };

  // Ref to always have access to latest handleCardBackPress
  const handleCardBackPressRef = useRef(handleCardBackPress);
  handleCardBackPressRef.current = handleCardBackPress;

  // Pan responder for swipe down to close modal (on statistics card)
  const statisticsSwipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes (down)
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 50px, close the modal
        if (gestureState.dy > 50) {
          handleCardBackPressRef.current();
        }
      },
    })
  ).current;

  // Pan responder for swipe down on rank card back to close modal
  const rankCardSwipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes (down)
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 50px, close the modal
        if (gestureState.dy > 50) {
          handleCardBackPressRef.current();
        }
      },
    })
  ).current;

  // Refs for match history expand/collapse state
  const matchHistoryExpandedRef = useRef(matchHistoryExpanded);
  matchHistoryExpandedRef.current = matchHistoryExpanded;

  // Pan responder for swipe up on collapsed match history to expand
  const matchHistorySwipeUpPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes (up) when collapsed
        return !matchHistoryExpandedRef.current && gestureState.dy < -10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped up more than 30px, expand
        if (gestureState.dy < -30) {
          setMatchHistoryExpanded(true);
          Animated.timing(matchHistoryExpandAnimation, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Pan responder for swipe down on match history header to collapse
  const matchHistorySwipeDownPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes (down) when expanded
        return matchHistoryExpandedRef.current && gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 30px, collapse
        if (gestureState.dy > 30) {
          setMatchHistoryExpanded(false);
          Animated.timing(matchHistoryExpandAnimation, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

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

  const getAgentIcon = (agent: string) => {
    if (!agent) return null;
    const agentKey = agent.toLowerCase();
    return VALORANT_AGENT_ICONS[agentKey] || null;
  };

  const getAgentSmallIcon = (agent: string) => {
    if (!agent) return null;
    const agentKey = agent.toLowerCase();
    return VALORANT_AGENT_SMALL_ICONS[agentKey] || null;
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

  // Statistics card slides up from bottom to just below rank card
  const STATS_CARD_HEADER_HEIGHT = 58;
  const STATS_CARD_FULL_HEIGHT = 220;
  const MATCH_HISTORY_HEADER_HEIGHT = 76;
  const RANK_CARD_BOTTOM = 316; // Rank card is at y=80, height=220, plus 16px gap

  // Statistics card top position - slides up to just below rank card
  const statisticsTop = matchHistoryAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, RANK_CARD_BOTTOM], // Start off-screen, end just below rank card
  });

  // Statistics card height - shrinks when match history expands
  const statisticsHeight = matchHistoryExpandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [STATS_CARD_FULL_HEIGHT, STATS_CARD_HEADER_HEIGHT], // Full height to just header
  });

  // Statistics content opacity - fades out when match history expands
  const statisticsContentOpacity = matchHistoryExpandAnimation.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
  });

  // Match history height - expands when clicked, stops below Statistics header divider
  const matchHistoryExpandedHeight = SCREEN_HEIGHT - RANK_CARD_BOTTOM - STATS_CARD_HEADER_HEIGHT - 8; // 8px below the divider
  const matchHistoryHeight = matchHistoryExpandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [MATCH_HISTORY_HEADER_HEIGHT, matchHistoryExpandedHeight], // From header only to below stats header divider
  });

  // Match history chevron rotation
  const matchHistoryChevronRotation = matchHistoryExpandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Statistics/cards visibility (fade in when modal opens)
  const cardsContentOpacity = matchHistoryAnimation.interpolate({
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
        /* Back content - Hero Rank layout */
        <View style={styles.cardBackContent}>
          {/* Decorative corner accents */}
          <View style={styles.techCornerTL} />
          <View style={styles.techCornerBR} />

          {/* Header Row - Profile */}
          <View style={styles.heroHeader}>
            <View style={styles.heroProfileSection}>
              {game.valorantCard && (
                <View style={styles.profileImageWrapper}>
                  <Image
                    source={{ uri: game.valorantCard }}
                    style={styles.backPlayerCard}
                  />
                  <View style={styles.profileGlow} />
                </View>
              )}
              <ThemedText style={styles.backUsername}>{username}</ThemedText>
            </View>
          </View>

          {/* Center Area - Both Ranks Equal Size */}
          <View style={styles.ranksRow}>
            {/* Current Rank */}
            <View style={styles.rankBox}>
              <ThemedText style={styles.rankBoxLabel}>CURRENT</ThemedText>
              <Image
                source={getRankIcon(game.rank)}
                style={styles.rankBoxIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankBoxName}>{game.rank || 'Unranked'}</ThemedText>
              <ThemedText style={styles.rankBoxSub}>{game.trophies} RR</ThemedText>
            </View>

            <View style={styles.ranksDivider} />

            {/* Peak Rank */}
            <View style={styles.rankBox}>
              <ThemedText style={styles.rankBoxLabel}>PEAK</ThemedText>
              <Image
                source={getRankIcon(game.peakRank?.tier || 'Unranked')}
                style={styles.rankBoxIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankBoxName}>{game.peakRank?.tier || 'N/A'}</ThemedText>
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
      <Animated.View style={{ opacity: stackCardOpacity }}>
        <TouchableOpacity
          ref={cardRef as any}
          style={styles.cardOuter}
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
      </Animated.View>

      {/* Modal for expanded card view */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        {/* Blurred overlay - not tappable, only swipe down on cards closes modal */}
        <View style={styles.modalOverlay}>
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
        </View>

        {/* Animated card in modal - positioned exactly over original */}
        <Animated.View
          style={[
            styles.modalCard,
            { left: cardPosition.x, width: cardPosition.width || undefined, opacity: modalCardOpacity },
            modalCardStyle
          ]}
          {...rankCardSwipePanResponder.panHandlers}
        >
          {/* 3D Shadow layers */}
          <View style={styles.shadow3} />
          <View style={styles.shadow2} />
          <View style={styles.shadow1} />

          <TouchableOpacity
            style={styles.rankCard}
            onPress={handleCardFlip}
            activeOpacity={0.95}
          >
            {renderCardContent()}
          </TouchableOpacity>
        </Animated.View>

        {/* Statistics Card - Slides up to just below rank card, stretches to bottom */}
        <Animated.View
          style={[
            styles.statisticsCard,
            {
              top: statisticsTop,
              bottom: 0,
              opacity: cardsContentOpacity,
            }
          ]}
          {...statisticsSwipePanResponder.panHandlers}
        >
          <Pressable
            onPress={() => {
              if (matchHistoryExpanded) {
                setMatchHistoryExpanded(false);
                Animated.timing(matchHistoryExpandAnimation, {
                  toValue: 0,
                  duration: 300,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: false,
                }).start();
              }
            }}
          >
            <View style={styles.statisticsHeader}>
              <View style={styles.statisticsHeaderLeft}>
                <ThemedText style={styles.statisticsTitle}>Statistics</ThemedText>
              </View>
            </View>

            {/* Statistics Content */}
            <Animated.View style={[styles.statisticsContent, { opacity: statisticsContentOpacity }]}>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxValue}>{game.winRate}%</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Win Rate</ThemedText>
                </View>
                <View style={styles.statBoxDivider} />
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxValue}>{game.gamesPlayed || 0}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Games</ThemedText>
                </View>
                <View style={styles.statBoxDivider} />
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxValue}>{game.mmr || 0}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>MMR</ThemedText>
                </View>
              </View>

              {/* Recently Playing Section */}
              {mostPlayedAgent && (
                <View style={styles.recentlyPlayingSection}>
                  <View style={styles.recentlyPlayingDivider} />
                  <View style={styles.recentlyPlayingContent}>
                    <View style={styles.recentlyPlayingInfo}>
                      <ThemedText style={styles.recentlyPlayingLabel}>Recently Playing</ThemedText>
                      <ThemedText style={styles.recentlyPlayingAgent}>{mostPlayedAgent}</ThemedText>
                    </View>
                    {getAgentIcon(mostPlayedAgent) && (
                      <Image
                        source={getAgentIcon(mostPlayedAgent)}
                        style={styles.recentlyPlayingImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </View>
              )}
            </Animated.View>
          </Pressable>
        </Animated.View>

        {/* Match History Card - Fixed at bottom, expands upward */}
        <Animated.View
          style={[
            styles.matchHistoryCard,
            {
              height: matchHistoryHeight,
              opacity: cardsContentOpacity,
            }
          ]}
          {...matchHistorySwipeUpPanResponder.panHandlers}
        >
          <View
            style={styles.matchHistoryHeader}
            {...matchHistorySwipeDownPanResponder.panHandlers}
          >
            <TouchableOpacity
              style={styles.matchHistoryHeaderContent}
              onPress={handleMatchHistoryToggle}
              activeOpacity={0.8}
            >
              <View style={styles.matchHistoryHeaderLeft}>
                <ThemedText style={styles.matchHistoryTitle}>Match History</ThemedText>
              </View>
              <Animated.View style={{ transform: [{ rotate: matchHistoryChevronRotation }] }}>
                <IconSymbol size={16} name="chevron.up" color="rgba(255,255,255,0.6)" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Match History Content */}
          {matchHistoryExpanded && (
            <View style={styles.matchHistoryContentWrapper}>
              {/* Table Header */}
              <View style={styles.matchTableHeader}>
                <View style={styles.matchIndicatorSpacer} />
                <ThemedText style={[styles.matchTableHeaderText, styles.matchColAgent]}>Agent</ThemedText>
                <ThemedText style={[styles.matchTableHeaderText, styles.matchColKDA]}>KDA</ThemedText>
                <ThemedText style={[styles.matchTableHeaderText, styles.matchColResult]}>Result</ThemedText>
                <ThemedText style={[styles.matchTableHeaderText, styles.matchColScore]}>Score</ThemedText>
                <ThemedText style={[styles.matchTableHeaderText, styles.matchColDate]}>Date</ThemedText>
              </View>
              <ScrollView
                style={styles.matchHistoryContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.matchHistoryScrollContent}
              >
                {game.matchHistory && game.matchHistory.length > 0 ? (
                  game.matchHistory.map((match, index) => {
                    // gameStart could be in seconds or milliseconds - handle both
                    const timestamp = match.gameStart < 10000000000 ? match.gameStart * 1000 : match.gameStart;
                    const date = new Date(timestamp);
                    const now = Date.now();
                    const diffMs = now - timestamp;
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    let formattedDate: string;
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    if (diffHours < 1) {
                      formattedDate = 'Just now';
                    } else if (diffHours < 24) {
                      formattedDate = diffHours === 1 ? '1 hr ago' : `${diffHours} hrs ago`;
                    } else if (diffDays === 1) {
                      formattedDate = '1 day ago';
                    } else if (diffDays < 30) {
                      formattedDate = `${diffDays} days ago`;
                    } else {
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      formattedDate = `${date.getDate()}${months[date.getMonth()]}`;
                    }
                    return (
                      <View key={match.matchId || index} style={styles.matchItem}>
                        <View style={[styles.matchIndicator, match.won ? styles.matchWin : styles.matchLoss]} />
                        <View style={styles.matchColAgent}>
                          {getAgentSmallIcon(match.agent) ? (
                            <Image
                              source={getAgentSmallIcon(match.agent)}
                              style={styles.matchAgentIcon}
                              resizeMode="contain"
                            />
                          ) : (
                            <ThemedText style={styles.matchCellText} numberOfLines={1}>
                              {match.agent}
                            </ThemedText>
                          )}
                        </View>
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
                        <ThemedText style={[styles.matchCellText, styles.matchColScore]}>
                          {match.score || '-'}
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
            </View>
          )}
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
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
  // Hero Rank Layout - Header
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageWrapper: {
    position: 'relative',
  },
  backPlayerCard: {
    width: 24,
    height: 24,
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
  backUsername: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  // Center Area - Both Ranks Row
  ranksRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  ranksDivider: {
    width: 1,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  rankBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rankBoxIcon: {
    width: 64,
    height: 64,
    marginBottom: 4,
  },
  rankBoxName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  rankBoxSub: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  // Bottom Stats Bar
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  statsBarItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsBarValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  statsBarLabel: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  statsBarDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  // Stats Layout (legacy)
  statsLayout: {
    position: 'absolute',
    top: 58,
    left: 16,
    right: 16,
    bottom: 14,
    justifyContent: 'space-between',
  },
  // Main Stats (Current & Peak Rank)
  mainStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainStatLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  mainRankIcon: {
    width: 48,
    height: 48,
    marginBottom: 4,
  },
  mainStatValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  mainStatSubtext: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  mainStatDivider: {
    width: 1,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
  },
  // Side Stats (Win Rate, Games, MMR)
  sideStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  sideStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideStatLabel: {
    fontSize: 6,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  sideStatValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  sideStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
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
  // Statistics Card styles - stretches from below rank card to bottom, behind match history
  statisticsCard: {
    position: 'absolute',
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
  statisticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  statisticsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statisticsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statisticsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statBoxDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // Recently Playing styles
  recentlyPlayingSection: {
    marginTop: 12,
  },
  recentlyPlayingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  recentlyPlayingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'visible',
  },
  recentlyPlayingInfo: {
    flex: 1,
  },
  recentlyPlayingLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentlyPlayingAgent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  recentlyPlayingImage: {
    position: 'absolute',
    right: -30,
    top: -40,
    width: 260,
    height: 400,
    opacity: 0.9,
  },
  // Match History Card styles - fixed at bottom, expands upward
  matchHistoryCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#22262b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 25,
  },
  matchHistoryHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  matchHistoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  matchHistoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  matchHistoryContentWrapper: {
    flex: 1,
  },
  matchTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingLeft: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  matchTableHeaderText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  matchHistoryContent: {
    flex: 1,
  },
  matchHistoryScrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  matchIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  matchIndicatorSpacer: {
    width: 16,
  },
  matchWin: {
    backgroundColor: '#4CAF50',
  },
  matchLoss: {
    backgroundColor: '#DC3D4B',
  },
  // Column widths
  matchColAgent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchAgentIcon: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  matchColKDA: {
    flex: 1.2,
    textAlign: 'center',
  },
  matchColResult: {
    flex: 1.2,
    textAlign: 'center',
  },
  matchColScore: {
    flex: 1,
    textAlign: 'center',
  },
  matchColDate: {
    flex: 1.5,
    textAlign: 'right',
  },
  matchCellText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  matchResultWin: {
    color: '#4CAF50',
  },
  matchResultLoss: {
    color: '#DC3D4B',
  },
  matchDateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  noMatchesContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noMatchesText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
});