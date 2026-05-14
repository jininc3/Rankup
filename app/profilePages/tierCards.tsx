import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from '@/hooks/useRouter';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { TIER_COLORS } from '@/utils/tierBorderUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

const TIER_PREVIEW_DATA: { tier: string; color: string; level: number }[] = [
  { tier: 'F', color: TIER_COLORS.F, level: 1 },
  { tier: 'D', color: TIER_COLORS.D, level: 2 },
  { tier: 'C', color: TIER_COLORS.C, level: 3 },
  { tier: 'B', color: TIER_COLORS.B, level: 4 },
  { tier: 'A', color: TIER_COLORS.A, level: 5 },
  { tier: 'S', color: TIER_COLORS.S, level: 6 },
];

export default function TierCardsScreen() {
  const router = useRouter();

  // Shared shimmer animation
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  // Second shimmer for S tier (crosses the first)
  const shimmerAnim2 = useRef(new Animated.Value(0)).current;
  // Glow pulse for S tier
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();

    // Second shimmer — offset timing, opposite direction
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(shimmerAnim2, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmerAnim2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop2.start();

    // Slow glow pulse
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    glowLoop.start();

    return () => { loop.stop(); loop2.stop(); glowLoop.stop(); };
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth * 1.5, screenWidth * 1.5],
  });

  const shimmerTranslate2 = shimmerAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 1.5, -screenWidth * 1.5],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* Background shimmer */}
      <View style={styles.backgroundGlow} pointerEvents="none">
        <View style={styles.shimmerBand} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(139, 127, 232, 0.03)',
              'rgba(139, 127, 232, 0.06)',
              'rgba(139, 127, 232, 0.03)',
              'transparent',
            ]}
            locations={[0, 0.37, 0.5, 0.63, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.shimmerBandSecondary} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(139, 127, 232, 0.035)',
              'transparent',
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol size={22} name="chevron.left" color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.step}>Rank Cards</ThemedText>
          <ThemedText style={styles.title}>Tier Designs</ThemedText>
          <ThemedText style={styles.description}>
            Card designs scale with your rank. Higher tiers unlock more intricate visual effects.
          </ThemedText>
        </View>

        {/* Tier Cards */}
        <View style={styles.cardsContainer}>
          {TIER_PREVIEW_DATA.map((data) => {
            const rgb = hexToRgb(data.color);
            const { level } = data;
            return (
              <View key={data.tier} style={styles.cardSection}>
                {/* Tier label */}
                <View style={styles.tierLabel}>
                  <ThemedText style={[styles.tierLetter, { color: data.color }]}>
                    {data.tier} Tier
                  </ThemedText>
                </View>

                {/* Card */}
                <View style={styles.cardWrapper}>
                  <LinearGradient
                    colors={
                      level === 6
                        ? [`rgba(${rgb}, 1)`, `rgba(${rgb}, 0.5)`, `rgba(${rgb}, 0.8)`, `rgba(${rgb}, 0.4)`, `rgba(${rgb}, 1)`]
                        : [`rgba(${rgb}, 0.9)`, `rgba(${rgb}, 0.3)`, `rgba(${rgb}, 0.6)`, `rgba(${rgb}, 0.2)`, `rgba(${rgb}, 0.8)`]
                    }
                    locations={[0, 0.25, 0.5, 0.75, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.rankCard, level === 6 && { padding: 2 }]}
                  >
                    <View style={styles.rankCardInner}>
                      <LinearGradient
                        colors={level === 6 ? ['#1c1a14', '#1e1c16', '#201e18', '#1e1c16', '#1c1a14'] : ['#1a1a1a', '#1e1e1e', '#222222']}
                        locations={level === 6 ? [0, 0.25, 0.5, 0.75, 1] : undefined}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardBackground}
                      >
                        {/* === S TIER: Completely unique design === */}
                        {level === 6 ? (
                          <>
                            {/* Primary shimmer sweep */}
                            <Animated.View
                              style={[styles.shimmerContainer, { transform: [{ translateX: shimmerTranslate }, { rotate: '20deg' }] }]}
                              pointerEvents="none"
                            >
                              <LinearGradient
                                colors={['transparent', `rgba(${rgb}, 0.04)`, `rgba(${rgb}, 0.18)`, 'rgba(255,255,255,0.30)', `rgba(${rgb}, 0.18)`, `rgba(${rgb}, 0.04)`, 'transparent']}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={styles.shimmerGradient}
                              />
                            </Animated.View>

                            {/* Second crossing shimmer */}
                            <Animated.View
                              style={[styles.shimmerContainer, { transform: [{ translateX: shimmerTranslate2 }, { rotate: '-25deg' }] }]}
                              pointerEvents="none"
                            >
                              <LinearGradient
                                colors={['transparent', `rgba(${rgb}, 0.03)`, `rgba(${rgb}, 0.12)`, 'rgba(255,255,255,0.18)', `rgba(${rgb}, 0.12)`, `rgba(${rgb}, 0.03)`, 'transparent']}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={styles.shimmerGradient}
                              />
                            </Animated.View>

                            {/* Radial glow from center */}
                            <Animated.View style={[styles.radialGlow, { opacity: glowOpacity }]} pointerEvents="none">
                              <LinearGradient
                                colors={[`rgba(${rgb}, 0.12)`, `rgba(${rgb}, 0.04)`, 'transparent']}
                                start={{ x: 0.5, y: 0.5 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                              />
                            </Animated.View>

                            {/* Rich glass overlay */}
                            <LinearGradient
                              colors={[`rgba(${rgb}, 0.10)`, 'rgba(0,0,0,0.05)', `rgba(${rgb}, 0.08)`, 'rgba(0,0,0,0.05)', `rgba(${rgb}, 0.06)`]}
                              locations={[0, 0.25, 0.5, 0.75, 1]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.glassOverlay}
                            />

                            {/* Outer inner border */}
                            <View style={[styles.innerBorder, { top: 6, left: 6, right: 6, bottom: 6, borderRadius: 11, borderColor: `rgba(${rgb}, 0.12)` }]} />
                            {/* Inner inner border */}
                            <View style={[styles.innerBorder, { borderColor: `rgba(${rgb}, 0.30)` }]} />

                            {/* Concentric diamond rings radiating from center */}
                            {[72, 110, 160, 220, 300].map((size, i) => (
                              <View
                                key={`ring${i}`}
                                style={[
                                  styles.concentricRing,
                                  {
                                    width: size,
                                    height: size,
                                    marginTop: -size / 2,
                                    marginLeft: -size / 2,
                                    borderColor: `rgba(${rgb}, ${[0.14, 0.10, 0.07, 0.05, 0.03][i]})`,
                                  },
                                ]}
                              />
                            ))}

                            {/* Large corner brackets */}
                            <View style={[styles.cornerTL, { width: 28, height: 28, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderColor: `rgba(${rgb}, 0.55)` }]} />
                            <View style={[styles.cornerTR, { width: 28, height: 28, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: `rgba(${rgb}, 0.55)` }]} />
                            <View style={[styles.cornerBL, { width: 28, height: 28, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderColor: `rgba(${rgb}, 0.55)` }]} />
                            <View style={[styles.cornerBR, { width: 28, height: 28, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderColor: `rgba(${rgb}, 0.55)` }]} />

                            {/* Corner accent dots */}
                            <View style={[styles.accentDot, { top: 20, left: 42, backgroundColor: `rgba(${rgb}, 0.35)` }]} />
                            <View style={[styles.accentDot, { top: 42, left: 20, backgroundColor: `rgba(${rgb}, 0.35)` }]} />
                            <View style={[styles.accentDot, { top: 20, right: 42, backgroundColor: `rgba(${rgb}, 0.35)` }]} />
                            <View style={[styles.accentDot, { top: 42, right: 20, backgroundColor: `rgba(${rgb}, 0.35)` }]} />
                            <View style={[styles.accentDot, { bottom: 20, left: 42, backgroundColor: `rgba(${rgb}, 0.35)` }]} />
                            <View style={[styles.accentDot, { bottom: 42, left: 20, backgroundColor: `rgba(${rgb}, 0.35)` }]} />
                            <View style={[styles.accentDot, { bottom: 20, right: 42, backgroundColor: `rgba(${rgb}, 0.35)` }]} />
                            <View style={[styles.accentDot, { bottom: 42, right: 20, backgroundColor: `rgba(${rgb}, 0.35)` }]} />

                            {/* Edge midpoint dots */}
                            <Animated.View style={[styles.edgeDot, { top: 8, left: '50%', marginLeft: -3, backgroundColor: `rgba(${rgb}, 0.5)`, opacity: glowOpacity }]} />
                            <Animated.View style={[styles.edgeDot, { bottom: 8, left: '50%', marginLeft: -3, backgroundColor: `rgba(${rgb}, 0.5)`, opacity: glowOpacity }]} />
                            <Animated.View style={[styles.edgeDot, { left: 8, top: '50%', marginTop: -3, backgroundColor: `rgba(${rgb}, 0.5)`, opacity: glowOpacity }]} />
                            <Animated.View style={[styles.edgeDot, { right: 8, top: '50%', marginTop: -3, backgroundColor: `rgba(${rgb}, 0.5)`, opacity: glowOpacity }]} />

                            {/* Nested center diamond */}
                            <View style={styles.sDiamondContainer}>
                              {/* Outer diamond */}
                              <Animated.View style={[styles.sDiamondOuter, { borderColor: `rgba(${rgb}, 0.25)`, opacity: glowOpacity }]} />
                              {/* Middle diamond */}
                              <View style={[styles.sDiamondMiddle, { borderColor: `rgba(${rgb}, 0.45)` }]}>
                                {/* Inner glowing dot */}
                                <Animated.View style={[styles.sDiamondDot, { backgroundColor: `rgba(${rgb}, 0.8)`, opacity: glowOpacity }]} />
                              </View>
                            </View>
                          </>
                        ) : (
                          <>
                            {/* === TIERS F–A === */}
                            {/* Shimmer for B+ tiers */}
                            {level >= 4 && (
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
                            )}

                            {/* Inner border */}
                            <View
                              style={[
                                styles.innerBorder,
                                { borderColor: `rgba(${rgb}, ${level === 1 ? 0.08 : level === 2 ? 0.12 : level <= 4 ? 0.18 : 0.22})` },
                              ]}
                            />

                            {/* Glass overlay for C+ */}
                            {level >= 3 && (
                              <LinearGradient
                                colors={[`rgba(${rgb}, 0.05)`, 'rgba(0,0,0,0.1)', `rgba(${rgb}, 0.03)`, 'rgba(0,0,0,0.1)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.glassOverlay}
                              />
                            )}

                            {/* Crosshatch pattern for B+ */}
                            {level >= 4 && (
                              <View style={styles.patternContainer}>
                                <View style={[styles.crossLine, { top: -20, left: 30, backgroundColor: `rgba(${rgb}, 0.06)` }]} />
                                <View style={[styles.crossLine, { top: -20, left: 80, backgroundColor: `rgba(${rgb}, 0.04)` }]} />
                                <View style={[styles.crossLine, { top: -20, right: 80, backgroundColor: `rgba(${rgb}, 0.04)` }]} />
                                <View style={[styles.crossLine, { top: -20, right: 30, backgroundColor: `rgba(${rgb}, 0.06)` }]} />
                                {level >= 5 && (
                                  <>
                                    <View style={[styles.crossLineReverse, { top: -20, left: 30, backgroundColor: `rgba(${rgb}, 0.06)` }]} />
                                    <View style={[styles.crossLineReverse, { top: -20, left: 80, backgroundColor: `rgba(${rgb}, 0.04)` }]} />
                                    <View style={[styles.crossLineReverse, { top: -20, right: 80, backgroundColor: `rgba(${rgb}, 0.04)` }]} />
                                    <View style={[styles.crossLineReverse, { top: -20, right: 30, backgroundColor: `rgba(${rgb}, 0.06)` }]} />
                                  </>
                                )}
                              </View>
                            )}

                            {/* Horizontal accent lines for B+ */}
                            {level >= 4 && (
                              <>
                                <View style={[styles.horizLine, { top: '30%', backgroundColor: `rgba(${rgb}, 0.05)` }]} />
                                <View style={[styles.horizLine, { top: '70%', backgroundColor: `rgba(${rgb}, 0.05)` }]} />
                              </>
                            )}

                            {/* Corner accents */}
                            {level >= 2 && (
                              <>
                                <View style={[styles.cornerTL, { borderColor: `rgba(${rgb}, ${level <= 2 ? 0.25 : level <= 4 ? 0.35 : 0.4})`, borderTopWidth: 1.5, borderLeftWidth: 1.5 }]} />
                                {level >= 3 && <View style={[styles.cornerTR, { borderColor: `rgba(${rgb}, ${level <= 4 ? 0.35 : 0.4})`, borderTopWidth: 1.5, borderRightWidth: 1.5 }]} />}
                                {level >= 3 && <View style={[styles.cornerBL, { borderColor: `rgba(${rgb}, ${level <= 4 ? 0.35 : 0.4})`, borderBottomWidth: 1.5, borderLeftWidth: 1.5 }]} />}
                                <View style={[styles.cornerBR, { borderColor: `rgba(${rgb}, ${level <= 2 ? 0.25 : level <= 4 ? 0.35 : 0.4})`, borderBottomWidth: 1.5, borderRightWidth: 1.5 }]} />
                              </>
                            )}

                            {/* Corner tick dots for B+ */}
                            {level >= 4 && (
                              <>
                                <View style={[styles.accentDot, { top: 19, left: 38, backgroundColor: `rgba(${rgb}, 0.3)` }]} />
                                <View style={[styles.accentDot, { top: 19, right: 38, backgroundColor: `rgba(${rgb}, 0.3)` }]} />
                                <View style={[styles.accentDot, { bottom: 19, left: 38, backgroundColor: `rgba(${rgb}, 0.3)` }]} />
                                <View style={[styles.accentDot, { bottom: 19, right: 38, backgroundColor: `rgba(${rgb}, 0.3)` }]} />
                              </>
                            )}

                            {/* Center dot for B */}
                            {level === 4 && (
                              <View style={styles.centerDotContainer}>
                                <View style={[styles.centerDot, { backgroundColor: `rgba(${rgb}, 0.25)` }]} />
                              </View>
                            )}

                            {/* Center diamond for A */}
                            {level === 5 && (
                              <View style={styles.diamondContainer}>
                                <View style={[styles.diamond, { borderColor: `rgba(${rgb}, 0.3)` }]} />
                              </View>
                            )}
                          </>
                        )}
                      </LinearGradient>
                    </View>
                  </LinearGradient>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    top: -screenHeight * 0.35,
    left: -screenWidth * 0.6,
    width: screenWidth * 2.2,
    height: screenHeight * 1.7,
    transform: [{ rotate: '20deg' }],
  },
  shimmerBandSecondary: {
    position: 'absolute',
    top: -screenHeight * 0.2,
    left: -screenWidth * 0.1,
    width: screenWidth * 1.9,
    height: screenHeight * 1.5,
    transform: [{ rotate: '-15deg' }],
  },
  scrollView: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  step: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 24,
  },
  cardSection: {},
  tierLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  tierLetter: {
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 1,
  },
  cardWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
  },
  rankCard: {
    borderRadius: 16,
    height: 220,
    padding: 1.5,
    overflow: 'hidden',
  },
  rankCardInner: {
    flex: 1,
    borderRadius: 14.5,
    overflow: 'hidden',
  },
  cardBackground: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
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
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  crossLine: {
    position: 'absolute',
    width: 1,
    height: 300,
    transform: [{ rotate: '45deg' }],
  },
  crossLineReverse: {
    position: 'absolute',
    width: 1,
    height: 300,
    transform: [{ rotate: '-45deg' }],
  },
  cornerTL: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 20,
    height: 20,
    borderTopLeftRadius: 3,
    zIndex: 2,
  },
  cornerTR: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 20,
    height: 20,
    borderTopRightRadius: 3,
    zIndex: 2,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 20,
    height: 20,
    borderBottomLeftRadius: 3,
    zIndex: 2,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 20,
    height: 20,
    borderBottomRightRadius: 3,
    zIndex: 2,
  },
  diamondContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  diamond: {
    width: 30,
    height: 30,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  horizLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 1,
  },
  // B Tier center dot
  centerDotContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -5,
    marginLeft: -5,
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  centerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  // S Tier exclusive styles
  concentricRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
  },
  radialGlow: {
    position: 'absolute',
    top: '20%',
    left: '20%',
    right: '20%',
    bottom: '20%',
    borderRadius: 100,
    zIndex: 1,
  },
  accentDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    zIndex: 4,
  },
  edgeDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 4,
  },
  sDiamondContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -28,
    marginLeft: -28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  sDiamondOuter: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  sDiamondMiddle: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sDiamondDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
