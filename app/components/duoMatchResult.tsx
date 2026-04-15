import CompactDuoCard from '@/app/components/compactDuoCard';
import { ThemedText } from '@/components/themed-text';
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
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(20);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 350 });
    cardOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
    cardTranslateY.value = withDelay(150, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
    buttonsOpacity.value = withDelay(400, withTiming(1, { duration: 350 }));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value, transform: [{ translateY: cardTranslateY.value }] }));
  const buttonsStyle = useAnimatedStyle(() => ({ opacity: buttonsOpacity.value }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.headerContainer, headerStyle]}>
        <ThemedText style={styles.matchFoundText}>Match Found</ThemedText>
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
        <TouchableOpacity style={styles.primaryButton} onPress={onStartChat} activeOpacity={0.8}>
          <ThemedText style={styles.primaryButtonText}>Start Chat</ThemedText>
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onViewProfile} activeOpacity={0.7}>
            <ThemedText style={styles.secondaryButtonText}>View Profile</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onSearchAgain} activeOpacity={0.7}>
            <ThemedText style={styles.secondaryButtonText}>Search Again</ThemedText>
          </TouchableOpacity>
        </View>
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
    marginBottom: 14,
  },
  matchFoundText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  cardContainer: {
    width: '100%',
    paddingHorizontal: 4,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#D4A843',
    borderRadius: 24,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
});
