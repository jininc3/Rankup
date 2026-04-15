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
  const ring1Scale = useSharedValue(0.6);
  const ring1Opacity = useSharedValue(0.4);
  const ring2Scale = useSharedValue(0.6);
  const ring2Opacity = useSharedValue(0.4);

  const dotOpacity1 = useSharedValue(0);
  const dotOpacity2 = useSharedValue(0);
  const dotOpacity3 = useSharedValue(0);

  useEffect(() => {
    const ringDuration = 2200;

    ring1Scale.value = withRepeat(
      withTiming(1.8, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
      -1, false
    );
    ring1Opacity.value = withRepeat(
      withTiming(0, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
      -1, false
    );

    ring2Scale.value = withDelay(800,
      withRepeat(
        withTiming(1.8, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
        -1, false
      )
    );
    ring2Opacity.value = withDelay(800,
      withRepeat(
        withTiming(0, { duration: ringDuration, easing: Easing.out(Easing.ease) }),
        -1, false
      )
    );

    const dotDuration = 400;
    dotOpacity1.value = withRepeat(
      withSequence(withTiming(1, { duration: dotDuration }), withTiming(0.3, { duration: dotDuration })),
      -1, true
    );
    dotOpacity2.value = withDelay(200,
      withRepeat(
        withSequence(withTiming(1, { duration: dotDuration }), withTiming(0.3, { duration: dotDuration })),
        -1, true
      )
    );
    dotOpacity3.value = withDelay(400,
      withRepeat(
        withSequence(withTiming(1, { duration: dotDuration }), withTiming(0.3, { duration: dotDuration })),
        -1, true
      )
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }], opacity: ring1Opacity.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }], opacity: ring2Opacity.value }));
  const dot1Style = useAnimatedStyle(() => ({ opacity: dotOpacity1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dotOpacity2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dotOpacity3.value }));

  return (
    <View style={styles.container}>
      <View style={styles.radarContainer}>
        <Animated.View style={[styles.ring, ring1Style]} />
        <Animated.View style={[styles.ring, ring2Style]} />
        <View style={styles.centerCircle}>
          <Image source={GAME_LOGOS[game]} style={styles.gameLogo} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.textContainer}>
        <View style={styles.searchingRow}>
          <ThemedText style={styles.searchingText}>Searching</ThemedText>
          <Animated.Text style={[styles.dot, dot1Style]}>.</Animated.Text>
          <Animated.Text style={[styles.dot, dot2Style]}>.</Animated.Text>
          <Animated.Text style={[styles.dot, dot3Style]}>.</Animated.Text>
        </View>
        <ThemedText style={styles.subtitleText}>
          {game === 'valorant' ? 'Valorant' : 'League of Legends'}
        </ThemedText>
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
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
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#555',
  },
  centerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gameLogo: {
    width: 34,
    height: 34,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchingText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  dot: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  subtitleText: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
});
