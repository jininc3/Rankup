import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import rankCard from '@/app/components/rankCard';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLeagueStats, getTftStats, formatRank } from '@/services/riotService';

const RankCard = rankCard;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 60;
const CARD_HEIGHT = 220;
const STACK_OFFSET = 12; // Vertical offset for stacked cards
const SCALE_OFFSET = 0.05; // Scale reduction for cards in the back

export default function RankCardWalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Fetch Riot account and stats
  useEffect(() => {
    const fetchRiotData = async () => {
      if (!user?.uid) return;

      try {
        const account = user.riotAccount;
        if (account) {
          setRiotAccount(account);

          // Fetch League stats
          const leagueStats = await getLeagueStats(account.puuid, account.region);
          setRiotStats(leagueStats);
        }
      } catch (error) {
        console.error('Error fetching Riot data:', error);
      }
    };

    fetchRiotData();
  }, [user]);

  // Build games array
  const userGames = riotAccount ? [
    {
      id: 2,
      name: 'League of Legends',
      rank: riotStats?.rankedSolo
        ? formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank)
        : 'Unranked',
      trophies: riotStats?.rankedSolo?.leaguePoints || 0,
      icon: '⚔️',
      image: require('@/assets/images/leagueoflegends.png'),
      wins: riotStats?.rankedSolo?.wins || 0,
      losses: riotStats?.rankedSolo?.losses || 0,
      winRate: riotStats?.rankedSolo?.winRate || 0,
      recentMatches: ['+15', '-18', '+20', '+17', '-14'],
      profileIconId: riotStats?.profileIconId,
    },
  ] : [];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: 0,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow vertical movement
        pan.setValue({ x: 0, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        // Determine if we should move to next/previous card
        const threshold = 50;

        if (gestureState.dy < -threshold && currentIndex < userGames.length - 1) {
          // Swipe up - next card
          moveToCard(currentIndex + 1);
        } else if (gestureState.dy > threshold && currentIndex > 0) {
          // Swipe down - previous card
          moveToCard(currentIndex - 1);
        } else {
          // Return to current position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const moveToCard = (index: number) => {
    setCurrentIndex(index);
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  };

  const getCardStyle = (index: number) => {
    const relativeIndex = index - currentIndex;

    if (relativeIndex < 0) {
      // Cards that have been swiped past (hide them)
      return {
        opacity: 0,
        transform: [
          { translateY: -200 },
          { scale: 0.8 },
        ],
      };
    }

    if (index === currentIndex) {
      // Current active card
      return {
        opacity: 1,
        transform: [
          { translateY: pan.y },
          { scale: scale },
        ],
        zIndex: userGames.length - relativeIndex,
      };
    }

    // Cards stacked below
    const stackPosition = Math.min(relativeIndex, 3); // Limit stack depth
    return {
      opacity: 1 - (stackPosition * 0.2),
      transform: [
        { translateY: stackPosition * STACK_OFFSET },
        { scale: 1 - (stackPosition * SCALE_OFFSET) },
      ],
      zIndex: userGames.length - relativeIndex,
    };
  };

  if (userGames.length === 0) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol size={24} name="chevron.left" color="#000" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Card Wallet</ThemedText>
        </View>

        <View style={styles.emptyContainer}>
          <IconSymbol size={64} name="rectangle.stack" color="#ccc" />
          <ThemedText style={styles.emptyText}>No Rank Cards</ThemedText>
          <ThemedText style={styles.emptySubtext}>Connect your gaming accounts to add rank cards</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Card Wallet</ThemedText>
        <View style={styles.headerRight}>
          <ThemedText style={styles.cardCounter}>
            {currentIndex + 1} / {userGames.length}
          </ThemedText>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <IconSymbol size={16} name="hand.draw" color="#666" />
        <ThemedText style={styles.instructionsText}>Swipe up or down to browse cards</ThemedText>
      </View>

      {/* Stacked Cards Container */}
      <View style={styles.cardsContainer}>
        {userGames.map((game, index) => {
          const displayUsername = (game.name === 'League of Legends' || game.name === 'TFT') && riotAccount
            ? `${riotAccount.gameName}#${riotAccount.tagLine}`
            : user?.username || 'User';

          const isActive = index === currentIndex;

          return (
            <Animated.View
              key={game.id}
              style={[
                styles.cardWrapper,
                getCardStyle(index),
              ]}
              {...(isActive ? panResponder.panHandlers : {})}
            >
              <View pointerEvents={isActive ? 'auto' : 'none'}>
                <RankCard game={game} username={displayUsername} />
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={() => currentIndex > 0 && moveToCard(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <IconSymbol size={24} name="chevron.up" color={currentIndex === 0 ? '#ccc' : '#000'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentIndex === userGames.length - 1 && styles.navButtonDisabled]}
          onPress={() => currentIndex < userGames.length - 1 && moveToCard(currentIndex + 1)}
          disabled={currentIndex === userGames.length - 1}
        >
          <IconSymbol size={24} name="chevron.down" color={currentIndex === userGames.length - 1 ? '#ccc' : '#000'} />
        </TouchableOpacity>
      </View>

      {/* Card Indicators */}
      <View style={styles.indicators}>
        {userGames.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.indicatorActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCounter: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#666',
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  cardWrapper: {
    position: 'absolute',
    width: CARD_WIDTH,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 20,
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ccc',
  },
  indicatorActive: {
    backgroundColor: '#000',
    width: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
});
