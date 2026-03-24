import CompactDuoCard from '@/app/components/compactDuoCard';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { DuoMatchCardData } from '@/services/duoMatchService';

interface DuoMatchResultProps {
  game: 'valorant' | 'league';
  matchedUser: DuoMatchCardData;
  onViewProfile: () => void;
  onStartChat: () => void;
  onSearchAgain: () => void;
}

export default function DuoMatchResult({
  game,
  matchedUser,
  onViewProfile,
  onStartChat,
  onSearchAgain,
}: DuoMatchResultProps) {
  const headerOpacity = useSharedValue(0);
  const headerScale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    // Header fade in
    headerOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    headerScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });

    // Card slide up
    cardOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    cardTranslateY.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));

    // Buttons fade in
    buttonsOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ scale: headerScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.headerContainer, headerStyle]}>
        <ThemedText style={styles.matchFoundText}>Match Found!</ThemedText>
      </Animated.View>

      <Animated.View style={[styles.cardContainer, cardStyle]}>
        <CompactDuoCard
          game={game}
          username={matchedUser.username}
          inGameName={matchedUser.inGameName || matchedUser.username}
          inGameIcon={matchedUser.inGameIcon || undefined}
          currentRank={matchedUser.currentRank || undefined}
          mainRole={matchedUser.mainRole || undefined}
          mainAgent={matchedUser.mainAgent || undefined}
          onViewProfile={onViewProfile}
          showContent={true}
        />
      </Animated.View>

      <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onViewProfile}
          activeOpacity={0.8}
        >
          <IconSymbol size={18} name="person.fill" color="#fff" />
          <ThemedText style={styles.primaryButtonText}>View Profile</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={onStartChat}
          activeOpacity={0.8}
        >
          <IconSymbol size={18} name="bubble.left.fill" color="#fff" />
          <ThemedText style={styles.chatButtonText}>Start Chat</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onSearchAgain}
          activeOpacity={0.7}
        >
          <IconSymbol size={16} name="arrow.clockwise" color="#888" />
          <ThemedText style={styles.secondaryButtonText}>Search Again</ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
  },
  headerContainer: {
    marginBottom: 16,
  },
  matchFoundText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#c42743',
    letterSpacing: 0.5,
  },
  cardContainer: {
    width: '100%',
    paddingHorizontal: 4,
  },
  buttonsContainer: {
    width: '100%',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#c42743',
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#2563eb',
    borderRadius: 12,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
});
