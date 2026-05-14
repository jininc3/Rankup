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

const VALORANT_RANK_ICONS: { [key: string]: any } = {
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
};

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

const getRankIcon = (rank: string, game: 'valorant' | 'league') => {
  if (!rank || rank === 'Unranked') {
    return game === 'valorant' ? VALORANT_RANK_ICONS.unranked : LEAGUE_RANK_ICONS.unranked;
  }
  const tier = rank.split(' ')[0].toLowerCase();
  if (game === 'valorant') return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
  return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
};

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
  const activeCard = searchGamePick === 'valorant' ? valorantCard : searchGamePick === 'league' ? leagueCard : null;

  // Auto-select game if none selected
  useEffect(() => {
    if (!searchGamePick && hasCards) {
      if (valorantCard) onPickGame('valorant');
      else if (leagueCard) onPickGame('league');
    }
  }, [hasCards, valorantCard, leagueCard]);

  // Animations
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.5);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);

  useEffect(() => {
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false
    );
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    contentTranslateY.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleGameChange = () => {
    if (valorantCard && leagueCard) {
      onPickGame(searchGamePick === 'valorant' ? 'league' : 'valorant');
    }
  };

  const canSearch = !!searchGamePick && !!searchModePick;

  return (
    <View style={styles.container}>
      {/* Animated Orb */}
      <View style={styles.orbContainer}>
        <Animated.View style={[styles.orbRing, ringStyle]} />
        <View style={styles.orbInner}>
          {searchGamePick ? (
            <Image
              source={searchGamePick === 'league'
                ? require('@/assets/images/lol-icon.png')
                : require('@/assets/images/valorant-red.png')}
              style={styles.orbLogo}
              resizeMode="contain"
            />
          ) : (
            <IconSymbol size={44} name="gamecontroller.fill" color="rgba(180, 170, 255, 0.45)" />
          )}
        </View>
      </View>

      {/* Title */}
      <Animated.View style={[styles.titleGroup, contentStyle]}>
        <ThemedText style={styles.title}>Ready Up</ThemedText>
        <ThemedText style={styles.subtitle}>Find teammates. Play better. Win together.</ThemedText>
      </Animated.View>

      <Animated.View style={[styles.content, contentStyle]}>
        {/* Mode Picker */}
        {hasCards && (
          <View style={styles.modeSection}>
            <ThemedText style={styles.sectionLabel}>CHOOSE A MODE</ThemedText>
            <View style={styles.modeCards}>
              <TouchableOpacity
                style={[styles.modeCard, searchModePick === 'lfg' && styles.modeCardActive]}
                onPress={() => onPickMode(searchModePick === 'lfg' ? null : 'lfg')}
                activeOpacity={0.7}
              >
                {searchModePick === 'lfg' && (
                  <View style={styles.modeCheckBadge}>
                    <ThemedText style={styles.modeCheckIcon}>{'\u2713'}</ThemedText>
                  </View>
                )}
                <IconSymbol size={30} name="person.3.fill" color={searchModePick === 'lfg' ? '#8b7fe8' : '#555'} />
                <ThemedText style={[styles.modeCardTitle, searchModePick === 'lfg' && styles.modeCardTitleActive]}>
                  LFG
                </ThemedText>
                <ThemedText style={styles.modeCardDesc}>
                  Find a full squad{'\n'}ready to compete
                </ThemedText>
                <View style={styles.modeCardCountRow}>
                  <View style={styles.greenDotSmall} />
                  <ThemedText style={styles.modeCardCount}>1.2K searching</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeCard, searchModePick === 'duo' && styles.modeCardActiveDuo]}
                onPress={() => onPickMode(searchModePick === 'duo' ? null : 'duo')}
                activeOpacity={0.7}
              >
                {searchModePick === 'duo' && (
                  <View style={[styles.modeCheckBadge, { backgroundColor: '#5BA0D6' }]}>
                    <ThemedText style={styles.modeCheckIcon}>{'\u2713'}</ThemedText>
                  </View>
                )}
                <IconSymbol size={30} name="person.2.fill" color={searchModePick === 'duo' ? '#5BA0D6' : '#555'} />
                <ThemedText style={[styles.modeCardTitle, searchModePick === 'duo' && styles.modeCardTitleActive]}>
                  Find Duo
                </ThemedText>
                <ThemedText style={styles.modeCardDesc}>
                  Find one teammate{'\n'}near your rank
                </ThemedText>
                <View style={styles.modeCardCountRow}>
                  <View style={styles.greenDotSmall} />
                  <ThemedText style={styles.modeCardCount}>2.1K searching</ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Game & Rank Bar */}
        {hasCards && activeCard && searchGamePick && (
          <View style={styles.settingsBar}>
            <TouchableOpacity style={styles.settingItem} onPress={handleGameChange} activeOpacity={0.7}>
              <Image
                source={searchGamePick === 'valorant'
                  ? require('@/assets/images/valorant-red.png')
                  : require('@/assets/images/lol-icon.png')}
                style={styles.settingItemIcon}
                resizeMode="contain"
              />
              <View>
                <ThemedText style={styles.settingItemTitle}>
                  {searchGamePick === 'valorant' ? 'Valorant' : 'League'}
                </ThemedText>
                <ThemedText style={styles.settingItemSub}>
                  {valorantCard && leagueCard ? 'Change' : 'Game'}
                </ThemedText>
              </View>
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <View style={styles.settingItem}>
              <Image
                source={getRankIcon(activeCard.currentRank, searchGamePick)}
                style={styles.settingItemIcon}
                resizeMode="contain"
              />
              <View>
                <ThemedText style={styles.settingItemTitle}>
                  {activeCard.currentRank || 'Unranked'}
                </ThemedText>
                <ThemedText style={styles.settingItemSub}>Rank range</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          {hasCards && (
            <View style={styles.waitTimeBox}>
              <ThemedText style={styles.waitTimeLabel}>Est. wait time</ThemedText>
              <ThemedText style={styles.waitTimeValue}>~18s</ThemedText>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.searchBtn,
              hasCards && !canSearch && styles.searchBtnDisabled,
            ]}
            onPress={hasCards ? onSearch : onCreateCard}
            activeOpacity={0.8}
            disabled={hasCards && !canSearch}
          >
            <ThemedText style={styles.searchBtnText}>
              {hasCards ? 'Start Match Search' : 'Create a Rank Card'}
            </ThemedText>
            <IconSymbol size={18} name="chevron.right" color="#333" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <IconSymbol size={12} name="lock.fill" color="#555" />
          <ThemedText style={styles.footerText}>
            Search settings can be changed anytime
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },

  // Orb
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
  },
  orbRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#8b7fe8',
  },
  orbInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbLogo: {
    width: 50,
    height: 50,
    opacity: 0.5,
  },

  // Title
  titleGroup: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },

  content: {
    flex: 1,
    width: '100%',
  },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Mode Section
  modeSection: {
    marginBottom: 20,
  },
  modeCards: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#161620',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  modeCardActive: {
    borderColor: 'rgba(139, 127, 232, 0.5)',
    backgroundColor: '#1a1a2e',
  },
  modeCardActiveDuo: {
    borderColor: 'rgba(91, 160, 214, 0.5)',
    backgroundColor: '#161a2e',
  },
  modeCheckBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8b7fe8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modeCheckIcon: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  modeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#888',
    marginTop: 2,
  },
  modeCardTitleActive: {
    color: '#fff',
  },
  modeCardDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 17,
  },
  modeCardCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  greenDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  modeCardCount: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },

  // Game & Rank Bar
  settingsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161620',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  settingItemIcon: {
    width: 22,
    height: 22,
  },
  settingItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ddd',
  },
  settingItemSub: {
    fontSize: 10,
    color: '#666',
  },
  settingDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 6,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  waitTimeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  waitTimeLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 1,
  },
  waitTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  searchBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchBtnDisabled: {
    opacity: 0.35,
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#555',
  },
});
