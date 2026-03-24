import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
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

interface DuoSearchingAnimationProps {
  game: 'valorant' | 'league';
  onCancel: () => void;
}

const GAME_LOGOS: { [key: string]: any } = {
  valorant: require('@/assets/images/valorant-red.png'),
  league: require('@/assets/images/lol.png'),
};

export default function DuoSearchingAnimation({ game, onCancel }: DuoSearchingAnimationProps) {
  // Pulsing rings
  const ring1Scale = useSharedValue(0.6);
  const ring1Opacity = useSharedValue(0.6);
  const ring2Scale = useSharedValue(0.6);
  const ring2Opacity = useSharedValue(0.6);
  const ring3Scale = useSharedValue(0.6);
  const ring3Opacity = useSharedValue(0.6);

  // Dot animation for "Searching..."
  const dotOpacity1 = useSharedValue(0);
  const dotOpacity2 = useSharedValue(0);
  const dotOpacity3 = useSharedValue(0);

  useEffect(() => {
    // Expanding rings with staggered delays
    const ringDuration = 2000;

    ring1Scale.value = withRepeat(
      withTiming(1.8, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    ring1Opacity.value = withRepeat(
      withTiming(0, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    ring2Scale.value = withDelay(
      600,
      withRepeat(
        withTiming(1.8, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    ring2Opacity.value = withDelay(
      600,
      withRepeat(
        withTiming(0, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );

    ring3Scale.value = withDelay(
      1200,
      withRepeat(
        withTiming(1.8, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    ring3Opacity.value = withDelay(
      1200,
      withRepeat(
        withTiming(0, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );

    // Dot animation
    const dotDuration = 400;
    dotOpacity1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dotDuration }),
        withTiming(0.3, { duration: dotDuration }),
      ),
      -1,
      true
    );
    dotOpacity2.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: dotDuration }),
          withTiming(0.3, { duration: dotDuration }),
        ),
        -1,
        true
      )
    );
    dotOpacity3.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: dotDuration }),
          withTiming(0.3, { duration: dotDuration }),
        ),
        -1,
        true
      )
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({ opacity: dotOpacity1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dotOpacity2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dotOpacity3.value }));

  return (
    <View style={styles.container}>
      <View style={styles.radarContainer}>
        {/* Pulsing rings */}
        <Animated.View style={[styles.ring, ring1Style]} />
        <Animated.View style={[styles.ring, ring2Style]} />
        <Animated.View style={[styles.ring, ring3Style]} />

        {/* Center icon */}
        <View style={styles.centerCircle}>
          <Image
            source={GAME_LOGOS[game]}
            style={styles.gameLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.textContainer}>
        <View style={styles.searchingRow}>
          <ThemedText style={styles.searchingText}>Searching for a duo</ThemedText>
          <Animated.Text style={[styles.dot, dot1Style]}>.</Animated.Text>
          <Animated.Text style={[styles.dot, dot2Style]}>.</Animated.Text>
          <Animated.Text style={[styles.dot, dot3Style]}>.</Animated.Text>
        </View>
        <ThemedText style={styles.subtitleText}>
          Looking for a {game === 'valorant' ? 'Valorant' : 'League'} player
        </ThemedText>
      </View>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onCancel}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.cancelText}>Cancel</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  radarContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#c42743',
  },
  centerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gameLogo: {
    width: 40,
    height: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  dot: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  subtitleText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
});
