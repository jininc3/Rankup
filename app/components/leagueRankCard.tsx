import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getProfileIconUrl } from '@/services/riotService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MatchHistoryEntry {
  matchId: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  won: boolean;
  gameMode: string;
  gameStart: number;
  lpChange?: number;
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
  recentMatches: string[];
  profileIconId?: number;
  matchHistory?: MatchHistoryEntry[];
  gamesPlayed?: number;
  peakRank?: { tier: string; season: string };
}

interface LeagueRankCardProps {
  game: Game;
  username: string;
  viewOnly?: boolean;
  userId?: string;
  isFocused?: boolean;
  isBackOfStack?: boolean;
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

export default function LeagueRankCard({ game, username, viewOnly = false, userId, isFocused = false, isBackOfStack = false }: LeagueRankCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [cardPosition, setCardPosition] = useState({ x: 20, y: SCREEN_HEIGHT - 350, width: 0 });
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [matchHistoryExpanded, setMatchHistoryExpanded] = useState(false);

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
  const dragY = useRef(new Animated.Value(0)).current;

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
      startY.setValue(y);

      // Open modal and animate
      setModalVisible(true);
      modalCardOpacity.setValue(1); // Reset modal card opacity
      dragY.setValue(0); // Reset drag offset
      setShowMatchHistory(true);
      setMatchHistoryExpanded(false);

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
        // Blur/overlay fades in, card slides up, cards container expands, and flip all together
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
          Animated.timing(matchHistoryAnimation, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(1.05)),
            useNativeDriver: false,
          }),
          // Flip during slide-up so it shows back by the time it reaches the top
          Animated.sequence([
            Animated.delay(150),
            Animated.timing(flipAnimation, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
        ]),
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
      // Flip back to front first
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
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
      slideAnimation.setValue(0);
      flipAnimation.setValue(0);
      setModalVisible(false);
      setIsFlipped(false);
    });
  };

  // Handle clicking on the rank card back - closes everything and flips card
  const handleCardBackPress = () => {
    // Run flip + slide down + collapse all simultaneously
    Animated.parallel([
      // Flip back to front
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Collapse match history and statistics
      Animated.timing(matchHistoryAnimation, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(matchHistoryExpandAnimation, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Slide down
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Fade out overlay
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Crossfade modal card with stack card — earlier for back cards so they slot behind the front card
      Animated.sequence([
        Animated.delay(isBackOfStack ? 50 : 200),
        Animated.timing(modalCardOpacity, {
          toValue: 0,
          duration: isBackOfStack ? 150 : 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.delay(isBackOfStack ? 50 : 200),
        Animated.timing(stackCardOpacity, {
          toValue: 1,
          duration: isBackOfStack ? 150 : 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
      // Reset drag offset
      Animated.timing(dragY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setModalVisible(false);
      setIsFlipped(false);
      setShowMatchHistory(false);
      setMatchHistoryExpanded(false);
    });
  };

  // Ref to always have access to latest handleCardBackPress
  const handleCardBackPressRef = useRef(handleCardBackPress);
  handleCardBackPressRef.current = handleCardBackPress;

  const dragYRef = useRef(dragY);
  const flipAnimationRef = useRef(flipAnimation);

  // Pan responder for swipe down to close modal (on statistics card)
  const statisticsSwipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          dragYRef.current.setValue(gestureState.dy);
          const flipProgress = Math.max(0, 1 - gestureState.dy / (SCREEN_HEIGHT / 4));
          flipAnimationRef.current.setValue(flipProgress);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SCREEN_HEIGHT / 4) {
          handleCardBackPressRef.current();
        } else {
          Animated.spring(dragYRef.current, {
            toValue: 0,
            useNativeDriver: false,
            tension: 200,
            friction: 20,
          }).start();
          Animated.spring(flipAnimationRef.current, {
            toValue: 1,
            useNativeDriver: false,
            tension: 200,
            friction: 20,
          }).start();
        }
      },
    })
  ).current;

  // Pan responder for swipe down on rank card back to close modal
  const rankCardSwipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          dragYRef.current.setValue(gestureState.dy);
          const flipProgress = Math.max(0, 1 - gestureState.dy / (SCREEN_HEIGHT / 4));
          flipAnimationRef.current.setValue(flipProgress);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SCREEN_HEIGHT / 4) {
          handleCardBackPressRef.current();
        } else {
          Animated.spring(dragYRef.current, {
            toValue: 0,
            useNativeDriver: false,
            tension: 200,
            friction: 20,
          }).start();
          Animated.spring(flipAnimationRef.current, {
            toValue: 1,
            useNativeDriver: false,
            tension: 200,
            friction: 20,
          }).start();
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
        return !matchHistoryExpandedRef.current && gestureState.dy < -10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
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
        return matchHistoryExpandedRef.current && gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
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

  // Slide animation
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
    transform: [{ translateY: Animated.add(translateY, dragY) }, { scaleY }],
  };

  // Statistics card animations
  const statisticsTop = matchHistoryAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 310],
  });

  const cardsContentOpacity = matchHistoryAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  const statisticsContentOpacity = matchHistoryAnimation.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0, 1],
  });

  // Match history height animation - expands to just below statistics header
  const MATCH_HISTORY_HEADER_HEIGHT = 76;
  const RANK_CARD_BOTTOM = 316; // Rank card is at y=80, height=220, plus 16px gap
  const STATS_CARD_HEADER_HEIGHT = 60;
  const matchHistoryExpandedHeight = SCREEN_HEIGHT - RANK_CARD_BOTTOM - STATS_CARD_HEADER_HEIGHT - 8;
  const matchHistoryHeight = matchHistoryExpandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [MATCH_HISTORY_HEADER_HEIGHT, matchHistoryExpandedHeight],
  });

  // Match history chevron rotation
  const matchHistoryChevronRotation = matchHistoryExpandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Render card content
  const renderCardContent = () => (
    <LinearGradient
      colors={showBack ? ['#091428', '#0f1f3d', '#1a3a5c'] : ['#1a3a5c', '#0f1f3d', '#091428']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardBackground}
    >
      {/* Animated metal sweep */}
      <Animated.View
        style={[styles.shimmerContainer, { transform: [{ translateX: shimmerTranslate }, { rotate: '20deg' }] }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.20)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>

      <View style={styles.innerBorder} />

      {showBack ? (
        <View style={styles.cardBackContent}>
          <View style={styles.techCornerTL} />
          <View style={styles.techCornerBR} />

          {/* Header Row - Profile */}
          <View style={styles.heroHeader}>
            <View style={styles.heroProfileSection}>
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
              <ThemedText style={styles.rankBoxSub}>{game.trophies} LP</ThemedText>
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
        <View style={styles.cardFront}>
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassOverlay}
          />
          <Image source={require('@/assets/images/lol.png')} style={styles.backgroundLogo} resizeMode="contain" />
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
          <Animated.View style={[styles.rankCard, animatedStyle]}>
            {renderCardContent()}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={handleCloseModal}>
        {/* Blurred overlay */}
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.overlayBackground, { opacity: overlayOpacity }]}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.blurTint} />
          </Animated.View>
        </View>

        {/* Animated card in modal */}
        <Animated.View
          style={[styles.modalCard, { left: cardPosition.x, width: cardPosition.width || undefined, opacity: modalCardOpacity }, modalCardStyle]}
          {...rankCardSwipePanResponder.panHandlers}
        >
          <View style={styles.shadow3} />
          <View style={styles.shadow2} />
          <View style={styles.shadow1} />
          <TouchableOpacity style={styles.rankCard} onPress={handleCardFlip} activeOpacity={0.95}>
            {renderCardContent()}
          </TouchableOpacity>
        </Animated.View>

        {/* Statistics Card */}
        <Animated.View
          style={[styles.statisticsCard, { top: Animated.add(statisticsTop, dragY), bottom: 0, opacity: cardsContentOpacity }]}
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

            <Animated.View style={[styles.statisticsContent, { opacity: statisticsContentOpacity }]}>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxValue}>{game.winRate}%</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Win Rate</ThemedText>
                </View>
                <View style={styles.statBoxDivider} />
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxValue}>{game.wins}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Wins</ThemedText>
                </View>
                <View style={styles.statBoxDivider} />
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxValue}>{game.losses}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Losses</ThemedText>
                </View>
              </View>

              {/* Rank Icon */}
              <Image source={getRankIcon(game.rank)} style={styles.recentlyPlayingImage} resizeMode="contain" />
            </Animated.View>
          </Pressable>
        </Animated.View>

        {/* Match History Card */}
        <Animated.View
          style={[styles.matchHistoryCard, { height: matchHistoryHeight, opacity: cardsContentOpacity }]}
          {...matchHistorySwipeUpPanResponder.panHandlers}
        >
          <View style={styles.matchHistoryHeader} {...matchHistorySwipeDownPanResponder.panHandlers}>
            <TouchableOpacity style={styles.matchHistoryHeaderContent} onPress={handleMatchHistoryToggle} activeOpacity={0.8}>
              <View style={styles.matchHistoryHeaderLeft}>
                <ThemedText style={styles.matchHistoryTitle}>Match History</ThemedText>
              </View>
              <Animated.View style={{ transform: [{ rotate: matchHistoryChevronRotation }] }}>
                <IconSymbol size={16} name="chevron.up" color="rgba(255,255,255,0.6)" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {matchHistoryExpanded && (
            <View style={styles.matchHistoryContentWrapper}>
              <View style={styles.matchTableHeader}>
                <View style={styles.matchIndicatorSpacer} />
                <ThemedText style={[styles.matchTableHeaderText, styles.matchColChamp]}>Champ</ThemedText>
                <ThemedText style={[styles.matchTableHeaderText, styles.matchColKDA]}>KDA</ThemedText>
                <ThemedText style={[styles.matchTableHeaderText, styles.matchColResult]}>Result</ThemedText>
                <ThemedText style={[styles.matchTableHeaderText, styles.matchColLP]}>LP</ThemedText>
              </View>
              <ScrollView style={styles.matchHistoryContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.matchHistoryScrollContent}>
                {game.matchHistory && game.matchHistory.length > 0 ? (
                  game.matchHistory.map((match, index) => (
                    <View key={match.matchId || index} style={styles.matchItem}>
                      <View style={[styles.matchIndicator, match.won ? styles.matchWin : styles.matchLoss]} />
                      <ThemedText style={[styles.matchCellText, styles.matchColChamp]} numberOfLines={1}>
                        {match.champion}
                      </ThemedText>
                      <ThemedText style={[styles.matchCellText, styles.matchColKDA]}>
                        {match.kills}/{match.deaths}/{match.assists}
                      </ThemedText>
                      <ThemedText style={[styles.matchCellText, styles.matchColResult, match.won ? styles.matchResultWin : styles.matchResultLoss]}>
                        {match.won ? 'Victory' : 'Defeat'}
                      </ThemedText>
                      <ThemedText style={[styles.matchCellText, styles.matchColLP, match.lpChange && match.lpChange > 0 ? styles.matchResultWin : styles.matchResultLoss]}>
                        {match.lpChange ? (match.lpChange > 0 ? `+${match.lpChange}` : match.lpChange) : '-'}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <View style={styles.noMatchesContainer}>
                    <ThemedText style={styles.noMatchesText}>No match history available</ThemedText>
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
  cardOuter: { position: 'relative', height: 220 },
  shadow3: { position: 'absolute', top: 10, left: -10, right: 14, bottom: -10, backgroundColor: '#000', borderRadius: 18, opacity: 0.2 },
  shadow2: { position: 'absolute', top: 6, left: -6, right: 10, bottom: -6, backgroundColor: '#000', borderRadius: 17, opacity: 0.25 },
  shadow1: { position: 'absolute', top: 3, left: -3, right: 5, bottom: -3, backgroundColor: '#000', borderRadius: 16, opacity: 0.3 },
  rankCard: { borderRadius: 16, height: 220, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  cardBackground: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  staticShimmer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },
  staticShimmerRight: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 6 },
  shimmerContainer: { position: 'absolute', top: -100, left: -100, right: -100, bottom: -100, zIndex: 10 },
  shimmerGradient: { width: 200, height: '200%' },
  innerBorder: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  cardFront: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  glassOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  cornerAccentTL: { position: 'absolute', top: 16, left: 16, width: 24, height: 24, borderTopWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopLeftRadius: 4 },
  cornerAccentTR: { position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderTopWidth: 2, borderRightWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopRightRadius: 4 },
  cornerAccentBL: { position: 'absolute', bottom: 16, left: 16, width: 24, height: 24, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderBottomLeftRadius: 4 },
  cornerAccentBR: { position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderBottomWidth: 2, borderRightWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderBottomRightRadius: 4 },
  backgroundLogo: { position: 'absolute', width: 250, height: 250, top: '50%', left: '50%', marginTop: -125, marginLeft: -125, opacity: 0.08 },
  cardBackContent: { flex: 1, padding: 16 },
  techCornerTL: { position: 'absolute', top: 16, left: 16, width: 24, height: 24, borderTopWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopLeftRadius: 4 },
  techCornerBR: { position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderBottomWidth: 2, borderRightWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderBottomRightRadius: 4 },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageWrapper: { position: 'relative' },
  backPlayerCard: { width: 24, height: 24, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  profileGlow: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(100,150,255,0.3)' },
  backUsername: { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginLeft: 6 },
  ranksRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
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
    marginBottom: 6,
  },
  rankBoxIcon: {
    width: 64,
    height: 64,
    marginBottom: 6,
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
  ranksDivider: {
    width: 1,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  overlayBackground: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blurTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  modalCard: { position: 'absolute', top: 0, height: 220, zIndex: 2 },
  // Statistics Card
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
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  statisticsHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  statisticsTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  statisticsContent: { paddingHorizontal: 20, paddingVertical: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statBox: { alignItems: 'center', flex: 1 },
  statBoxDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  statBoxValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statBoxLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  recentlyPlayingImage: { position: 'absolute', right: -30, top: -40, width: 200, height: 300, opacity: 0.15 },
  // Match History Card
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
  matchHistoryHeader: { borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)' },
  matchHistoryHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  matchHistoryHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  matchHistoryTitle: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  matchHistoryContentWrapper: { flex: 1 },
  matchTableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, paddingLeft: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  matchTableHeaderText: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  matchHistoryContent: { flex: 1 },
  matchHistoryScrollContent: { paddingHorizontal: 12, paddingBottom: 30 },
  matchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  matchIndicator: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  matchIndicatorSpacer: { width: 16 },
  matchWin: { backgroundColor: '#4CAF50' },
  matchLoss: { backgroundColor: '#DC3D4B' },
  matchColChamp: { flex: 1.2, textAlign: 'center' },
  matchColKDA: { flex: 1.2, textAlign: 'center' },
  matchColResult: { flex: 1.2, textAlign: 'center' },
  matchColLP: { flex: 1, textAlign: 'right' },
  matchCellText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  matchResultWin: { color: '#4CAF50' },
  matchResultLoss: { color: '#DC3D4B' },
  noMatchesContainer: { paddingVertical: 24, alignItems: 'center' },
  noMatchesText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});
