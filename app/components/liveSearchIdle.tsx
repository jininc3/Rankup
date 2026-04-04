import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface LiveSearchIdleProps {
  hasCards: boolean;
  valorantCard: any;
  leagueCard: any;
  searchGamePick: 'valorant' | 'league' | null;
  onPickGame: (game: 'valorant' | 'league') => void;
  onSearch: () => void;
  onCreateCard: () => void;
}

export default function LiveSearchIdle({
  hasCards,
  valorantCard,
  leagueCard,
  searchGamePick,
  onPickGame,
  onSearch,
  onCreateCard,
}: LiveSearchIdleProps) {
  // Ambient pulse for center orb
  const orbPulse = useSharedValue(1);
  const orbGlow = useSharedValue(0.15);
  // Stagger fade-in for content
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(12);
  const subtitleOpacity = useSharedValue(0);
  const pickerOpacity = useSharedValue(0);
  const pickerTranslateY = useSharedValue(16);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  // Button pulse when ready
  const btnPulse = useSharedValue(1);

  useEffect(() => {
    // Orb gentle pulse
    orbPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
    orbGlow.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );

    // Staggered content reveal
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(200, withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }));
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    pickerOpacity.value = withDelay(550, withTiming(1, { duration: 500 }));
    pickerTranslateY.value = withDelay(550, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
    buttonOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    buttonTranslateY.value = withDelay(700, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
  }, []);

  // Button pulse when game is picked
  useEffect(() => {
    if (searchGamePick) {
      btnPulse.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false
      );
    } else {
      btnPulse.value = withTiming(1, { duration: 300 });
    }
  }, [searchGamePick]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbPulse.value }],
  }));

  const orbGlowStyle = useAnimatedStyle(() => ({
    opacity: orbGlow.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const pickerStyle = useAnimatedStyle(() => ({
    opacity: pickerOpacity.value,
    transform: [{ translateY: pickerTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }, { scale: btnPulse.value }],
  }));

  const accentColor = searchGamePick === 'league' ? '#1a6baa' : '#c42743';
  const accentColorFaint = searchGamePick === 'league' ? 'rgba(26, 107, 170, 0.12)' : 'rgba(196, 39, 67, 0.12)';

  return (
    <View style={styles.container}>
      {/* Orb Section */}
      <View style={styles.orbSection}>
        {/* Glow behind orb */}
        <Animated.View style={[styles.orbGlow, orbGlowStyle, { backgroundColor: accentColor }]} />

        {/* Center orb */}
        <Animated.View style={[styles.orb, orbStyle]}>
          <LinearGradient
            colors={['#1e1e1e', '#141414', '#0a0a0a']}
            style={styles.orbGradient}
          >
            <Image
              source={searchGamePick === 'league'
                ? require('@/assets/images/lol-icon.png')
                : require('@/assets/images/valorant-red.png')}
              style={styles.centerLogo}
              resizeMode="contain"
            />
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Title */}
      <Animated.View style={[styles.titleContainer, titleStyle]}>
        <ThemedText style={styles.title}>Ready Up</ThemedText>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={subtitleStyle}>
        <ThemedText style={styles.subtitle}>
          Queue up and get matched with a duo{'\n'}searching in your rank range
        </ThemedText>
      </Animated.View>

      {/* Game Picker */}
      {hasCards && (
        <Animated.View style={[styles.gamePicker, pickerStyle]}>
          {valorantCard && (
            <TouchableOpacity
              style={[
                styles.gameCard,
                searchGamePick === 'valorant' && styles.gameCardActiveValorant,
                !leagueCard && styles.gameCardOnly,
              ]}
              onPress={() => onPickGame('valorant')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={searchGamePick === 'valorant'
                  ? ['rgba(196, 39, 67, 0.15)', 'rgba(196, 39, 67, 0.04)']
                  : ['rgba(40, 40, 40, 0.6)', 'rgba(26, 26, 26, 0.6)']}
                style={styles.gameCardGradient}
              >
                <Image
                  source={require('@/assets/images/valorant-red.png')}
                  style={[
                    styles.gameCardIcon,
                    searchGamePick !== 'valorant' && { opacity: 0.4 },
                  ]}
                  resizeMode="contain"
                />
                <ThemedText style={[
                  styles.gameCardText,
                  searchGamePick === 'valorant' && styles.gameCardTextActive,
                ]}>VALORANT</ThemedText>
                {searchGamePick === 'valorant' && (
                  <View style={styles.gameCardIndicatorWrap}>
                    <View style={[styles.gameCardIndicator, { backgroundColor: '#c42743' }]} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
          {leagueCard && (
            <TouchableOpacity
              style={[
                styles.gameCard,
                searchGamePick === 'league' && styles.gameCardActiveLeague,
                !valorantCard && styles.gameCardOnly,
              ]}
              onPress={() => onPickGame('league')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={searchGamePick === 'league'
                  ? ['rgba(26, 107, 170, 0.15)', 'rgba(26, 107, 170, 0.04)']
                  : ['rgba(40, 40, 40, 0.6)', 'rgba(26, 26, 26, 0.6)']}
                style={styles.gameCardGradient}
              >
                <Image
                  source={require('@/assets/images/lol-icon.png')}
                  style={[
                    styles.gameCardIcon,
                    searchGamePick !== 'league' && { opacity: 0.4 },
                  ]}
                  resizeMode="contain"
                />
                <ThemedText style={[
                  styles.gameCardText,
                  searchGamePick === 'league' && styles.gameCardTextActive,
                ]}>LEAGUE</ThemedText>
                {searchGamePick === 'league' && (
                  <View style={styles.gameCardIndicatorWrap}>
                    <View style={[styles.gameCardIndicator, { backgroundColor: '#1a6baa' }]} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Search Button */}
      <Animated.View style={[styles.searchBtnWrapper, buttonStyle]}>
        <TouchableOpacity
          style={[
            styles.searchBtn,
            searchGamePick && {
              borderColor: searchGamePick === 'league'
                ? 'rgba(26, 107, 170, 0.5)'
                : 'rgba(196, 39, 67, 0.5)',
              shadowColor: accentColor,
            },
          ]}
          onPress={onSearch}
          activeOpacity={0.85}
          disabled={!searchGamePick}
        >
          <ThemedText style={[
            styles.searchBtnText,
            searchGamePick && { color: accentColor },
          ]}>
            Search For Players
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>

      {/* No cards hint */}
      {!hasCards && (
        <TouchableOpacity
          style={[styles.createCardBtn, { borderColor: accentColorFaint, backgroundColor: accentColorFaint }]}
          onPress={onCreateCard}
          activeOpacity={0.7}
        >
          <IconSymbol size={14} name="plus" color={accentColor} />
          <ThemedText style={[styles.createCardText, { color: accentColor }]}>Create a duo card to start</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // Orb
  orbSection: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  orbGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  orb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  orbGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
  },
  centerLogo: {
    width: 44,
    height: 44,
  },

  // Title
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
    marginBottom: 28,
  },

  // Game Picker
  gamePicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
    maxWidth: 300,
  },
  gameCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 60, 60, 0.5)',
    overflow: 'hidden',
  },
  gameCardActiveValorant: {
    borderColor: 'rgba(196, 39, 67, 0.5)',
  },
  gameCardActiveLeague: {
    borderColor: 'rgba(26, 107, 170, 0.5)',
  },
  gameCardOnly: {
    maxWidth: 170,
  },
  gameCardGradient: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  gameCardIcon: {
    width: 28,
    height: 28,
  },
  gameCardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.5,
  },
  gameCardTextActive: {
    color: '#ddd',
  },
  gameCardIndicatorWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gameCardIndicator: {
    width: 40,
    height: 2,
    borderRadius: 1,
  },

  // Search Button
  searchBtnWrapper: {
    width: '100%',
    maxWidth: 300,
  },
  searchBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(60, 60, 60, 0.4)',
    backgroundColor: 'rgba(20, 20, 20, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
  },

  // Create card hint
  createCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
  createCardText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
