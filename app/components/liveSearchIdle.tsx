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
  const orbPulse = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);

  useEffect(() => {
    orbPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );

    contentOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    contentTranslateY.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbPulse.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Orb */}
      <Animated.View style={[styles.orb, orbStyle]}>
        <Image
          source={searchGamePick === 'league'
            ? require('@/assets/images/lol-icon.png')
            : require('@/assets/images/valorant-red.png')}
          style={styles.centerLogo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.content, contentStyle]}>
        <ThemedText style={styles.title}>Ready Up</ThemedText>
        <ThemedText style={styles.subtitle}>
          Find a duo in your rank range
        </ThemedText>

        {/* Game Picker */}
        {hasCards && (
          <View style={styles.gamePicker}>
            {valorantCard && (
              <TouchableOpacity
                style={[
                  styles.gameCard,
                  searchGamePick === 'valorant' && styles.gameCardActive,
                  !leagueCard && styles.gameCardOnly,
                ]}
                onPress={() => onPickGame('valorant')}
                activeOpacity={0.7}
              >
                <Image
                  source={require('@/assets/images/valorant-red.png')}
                  style={[styles.gameCardIcon, searchGamePick !== 'valorant' && { opacity: 0.35 }]}
                  resizeMode="contain"
                />
                <ThemedText style={[
                  styles.gameCardText,
                  searchGamePick === 'valorant' && styles.gameCardTextActive,
                ]}>VALORANT</ThemedText>
              </TouchableOpacity>
            )}
            {leagueCard && (
              <TouchableOpacity
                style={[
                  styles.gameCard,
                  searchGamePick === 'league' && styles.gameCardActive,
                  !valorantCard && styles.gameCardOnly,
                ]}
                onPress={() => onPickGame('league')}
                activeOpacity={0.7}
              >
                <Image
                  source={require('@/assets/images/lol-icon.png')}
                  style={[styles.gameCardIcon, searchGamePick !== 'league' && { opacity: 0.35 }]}
                  resizeMode="contain"
                />
                <ThemedText style={[
                  styles.gameCardText,
                  searchGamePick === 'league' && styles.gameCardTextActive,
                ]}>LEAGUE</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search Button */}
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={onSearch}
          activeOpacity={0.85}
          disabled={!searchGamePick}
        >
          {searchGamePick ? (
            <LinearGradient
              colors={['#D4A843', '#c49a30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchBtnGradient}
            >
              <ThemedText style={styles.searchBtnTextActive}>Search</ThemedText>
            </LinearGradient>
          ) : (
            <View style={styles.searchBtnDisabled}>
              <ThemedText style={styles.searchBtnText}>Search</ThemedText>
            </View>
          )}
        </TouchableOpacity>

        {/* No cards hint */}
        {!hasCards && (
          <TouchableOpacity style={styles.createCardBtn} onPress={onCreateCard} activeOpacity={0.7}>
            <IconSymbol size={14} name="plus" color="#999" />
            <ThemedText style={styles.createCardText}>Create a duo card to start</ThemedText>
          </TouchableOpacity>
        )}
      </Animated.View>
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
  orb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  centerLogo: {
    width: 40,
    height: 40,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
  },
  gamePicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    width: '100%',
    maxWidth: 280,
  },
  gameCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  gameCardActive: {
    backgroundColor: '#222',
  },
  gameCardOnly: {
    maxWidth: 160,
  },
  gameCardIcon: {
    width: 26,
    height: 26,
  },
  gameCardText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 1,
  },
  gameCardTextActive: {
    color: '#ccc',
  },
  searchBtn: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  searchBtnGradient: {
    alignItems: 'center',
    paddingVertical: 16,
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  searchBtnDisabled: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
  },
  searchBtnTextActive: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  createCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  createCardText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
});
