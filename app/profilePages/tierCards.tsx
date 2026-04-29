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
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth * 1.5, screenWidth * 1.5],
  });

  return (
    <View style={styles.container}>
      {/* Background shimmer */}
      <View style={styles.backgroundGlow} pointerEvents="none">
        <View style={styles.shimmerBand} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.03)',
              'rgba(255, 255, 255, 0.065)',
              'rgba(255, 255, 255, 0.03)',
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
              'rgba(255, 255, 255, 0.035)',
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
                    colors={[
                      `rgba(${rgb}, 0.9)`,
                      `rgba(${rgb}, 0.3)`,
                      `rgba(${rgb}, 0.6)`,
                      `rgba(${rgb}, 0.2)`,
                      `rgba(${rgb}, 0.8)`,
                    ]}
                    locations={[0, 0.25, 0.5, 0.75, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rankCard}
                  >
                    <View style={styles.rankCardInner}>
                      <LinearGradient
                        colors={['#1a1a1a', '#1e1e1e', '#222222']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardBackground}
                      >
                        {/* Shimmer for B+ tiers */}
                        {level >= 4 && (
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
                                `rgba(255,255,255,${level === 6 ? '0.15' : '0.10'})`,
                                `rgba(255,255,255,${level === 6 ? '0.25' : '0.20'})`,
                                `rgba(255,255,255,${level === 6 ? '0.15' : '0.10'})`,
                                'rgba(255,255,255,0.03)',
                                'transparent',
                              ]}
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
                            {
                              borderColor: `rgba(${rgb}, ${
                                level === 1 ? 0.08 : level === 2 ? 0.12 : level <= 4 ? 0.18 : level === 5 ? 0.22 : 0.28
                              })`,
                            },
                          ]}
                        />

                        {/* Glass overlay for C+ */}
                        {level >= 3 && (
                          <LinearGradient
                            colors={[
                              `rgba(${rgb}, ${level === 6 ? 0.08 : 0.05})`,
                              'rgba(0,0,0,0.1)',
                              `rgba(${rgb}, ${level === 6 ? 0.06 : 0.03})`,
                              'rgba(0,0,0,0.1)',
                            ]}
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
                            {/* Reverse lines for A+ */}
                            {level >= 5 && (
                              <>
                                <View style={[styles.crossLineReverse, { top: -20, left: 30, backgroundColor: `rgba(${rgb}, 0.06)` }]} />
                                <View style={[styles.crossLineReverse, { top: -20, left: 80, backgroundColor: `rgba(${rgb}, 0.04)` }]} />
                                <View style={[styles.crossLineReverse, { top: -20, right: 80, backgroundColor: `rgba(${rgb}, 0.04)` }]} />
                                <View style={[styles.crossLineReverse, { top: -20, right: 30, backgroundColor: `rgba(${rgb}, 0.06)` }]} />
                              </>
                            )}
                            {/* Extra dense lines for S */}
                            {level === 6 && (
                              <>
                                <View style={[styles.crossLine, { top: -20, left: 55, backgroundColor: `rgba(${rgb}, 0.05)` }]} />
                                <View style={[styles.crossLine, { top: -20, right: 55, backgroundColor: `rgba(${rgb}, 0.05)` }]} />
                                <View style={[styles.crossLineReverse, { top: -20, left: 55, backgroundColor: `rgba(${rgb}, 0.05)` }]} />
                                <View style={[styles.crossLineReverse, { top: -20, right: 55, backgroundColor: `rgba(${rgb}, 0.05)` }]} />
                              </>
                            )}
                          </View>
                        )}

                        {/* Corner accents */}
                        {level >= 2 && (
                          <>
                            <View
                              style={[
                                styles.cornerTL,
                                {
                                  borderColor: `rgba(${rgb}, ${level <= 2 ? 0.25 : level <= 4 ? 0.35 : level === 5 ? 0.4 : 0.5})`,
                                  borderTopWidth: level === 6 ? 2 : 1.5,
                                  borderLeftWidth: level === 6 ? 2 : 1.5,
                                },
                              ]}
                            />
                            {level >= 3 && (
                              <View
                                style={[
                                  styles.cornerTR,
                                  {
                                    borderColor: `rgba(${rgb}, ${level <= 4 ? 0.35 : level === 5 ? 0.4 : 0.5})`,
                                    borderTopWidth: level === 6 ? 2 : 1.5,
                                    borderRightWidth: level === 6 ? 2 : 1.5,
                                  },
                                ]}
                              />
                            )}
                            {level >= 3 && (
                              <View
                                style={[
                                  styles.cornerBL,
                                  {
                                    borderColor: `rgba(${rgb}, ${level <= 4 ? 0.35 : level === 5 ? 0.4 : 0.5})`,
                                    borderBottomWidth: level === 6 ? 2 : 1.5,
                                    borderLeftWidth: level === 6 ? 2 : 1.5,
                                  },
                                ]}
                              />
                            )}
                            <View
                              style={[
                                styles.cornerBR,
                                {
                                  borderColor: `rgba(${rgb}, ${level <= 2 ? 0.25 : level <= 4 ? 0.35 : level === 5 ? 0.4 : 0.5})`,
                                  borderBottomWidth: level === 6 ? 2 : 1.5,
                                  borderRightWidth: level === 6 ? 2 : 1.5,
                                },
                              ]}
                            />
                          </>
                        )}

                        {/* Center diamond for A+ */}
                        {level >= 5 && (
                          <View style={styles.diamondContainer}>
                            <View
                              style={[
                                styles.diamond,
                                { borderColor: `rgba(${rgb}, ${level === 6 ? 0.5 : 0.3})` },
                              ]}
                            >
                              {level === 6 && (
                                <View
                                  style={[
                                    styles.diamondDot,
                                    { backgroundColor: `rgba(${rgb}, 0.7)` },
                                  ]}
                                />
                              )}
                            </View>
                          </View>
                        )}

                        {/* Horizontal accent lines for S tier */}
                        {level === 6 && (
                          <>
                            <View style={[styles.horizLine, { top: '33%', backgroundColor: `rgba(${rgb}, 0.06)` }]} />
                            <View style={[styles.horizLine, { top: '66%', backgroundColor: `rgba(${rgb}, 0.06)` }]} />
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
});
