import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
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

interface LiveSearchIdleProps {
  hasCards: boolean;
  valorantCard: any;
  leagueCard: any;
  searchModePick: 'lfg' | 'duo' | null;
  onPickMode: (mode: 'lfg' | 'duo' | null) => void;
  searchGamePick: 'valorant' | 'league' | null;
  onPickGame: (game: 'valorant' | 'league') => void;
  onSearch: () => void;
  onCreateCard: () => void;
}

export default function LiveSearchIdle({
  hasCards,
  valorantCard,
  leagueCard,
  searchModePick,
  onPickMode,
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
      {/* Top Section */}
      <View style={styles.topSection}>
        <Animated.View style={[styles.orb, orbStyle]}>
          {searchGamePick ? (
            <Image
              source={searchGamePick === 'league'
                ? require('@/assets/images/lol-icon.png')
                : require('@/assets/images/valorant-red.png')}
              style={styles.centerLogo}
              resizeMode="contain"
            />
          ) : (
            <IconSymbol size={40} name="gamecontroller.fill" color="#555" />
          )}
        </Animated.View>

        <Animated.View style={[styles.titleGroup, contentStyle]}>
          <ThemedText style={styles.title}>Ready Up</ThemedText>
          <ThemedText style={styles.subtitle}>
            {searchModePick === 'lfg'
              ? 'Find a group — any rank welcome'
              : searchModePick === 'duo'
              ? 'Find a duo in your rank range'
              : 'Pick a mode to get started'}
          </ThemedText>
        </Animated.View>
      </View>

      <Animated.View style={[styles.content, contentStyle]}>
        {/* Mode Picker */}
        {hasCards && (
          <View style={styles.modePicker}>
            <TouchableOpacity
              style={[
                styles.modeCard,
                searchModePick === 'lfg' && styles.modeCardActive,
              ]}
              onPress={() => onPickMode(searchModePick === 'lfg' ? null : 'lfg')}
              activeOpacity={0.7}
            >
              <IconSymbol size={24} name="person.3.fill" color={searchModePick === 'lfg' ? '#ccc' : '#444'} />
              <ThemedText style={[
                styles.modeCardText,
                searchModePick === 'lfg' && styles.modeCardTextActive,
              ]}>LFG</ThemedText>
            </TouchableOpacity>
            {searchModePick !== 'lfg' && (
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  searchModePick === 'duo' && styles.modeCardActive,
                ]}
                onPress={() => onPickMode(searchModePick === 'duo' ? null : 'duo')}
                activeOpacity={0.7}
              >
                <IconSymbol size={24} name="person.2.fill" color={searchModePick === 'duo' ? '#ccc' : '#444'} />
                <ThemedText style={[
                  styles.modeCardText,
                  searchModePick === 'duo' && styles.modeCardTextActive,
                ]}>Find Duo</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Game Picker */}
        {hasCards && searchModePick && (
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
          style={[styles.searchBtn, (!searchGamePick || !searchModePick) && styles.searchBtnDisabled]}
          onPress={onSearch}
          activeOpacity={0.8}
          disabled={!searchGamePick || !searchModePick}
        >
          <ThemedText style={[styles.searchBtnText, searchGamePick && searchModePick && styles.searchBtnTextActive]}>
            Search now
          </ThemedText>
        </TouchableOpacity>

        {/* No cards hint */}
        {!hasCards && (
          <TouchableOpacity style={styles.createCardBtn} onPress={onCreateCard} activeOpacity={0.7}>
            <IconSymbol size={14} name="plus" color="#999" />
            <ThemedText style={styles.createCardText}>Create a rank card to start</ThemedText>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  topSection: {
    alignItems: 'center',
  },
  titleGroup: {
    alignItems: 'center',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  modePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    width: '100%',
    maxWidth: 280,
  },
  modeCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  modeCardActive: {
    backgroundColor: '#222',
  },
  modeCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
  },
  modeCardTextActive: {
    color: '#ccc',
  },
  gamePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f0f0f',
  },
  searchBtnTextActive: {
    color: '#0f0f0f',
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
