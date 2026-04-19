import CompactDuoCard from '@/app/components/compactDuoCard';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { DuoMatchCardData } from '@/services/duoMatchService';

interface DuoMatchResultProps {
  game: 'valorant' | 'league';
  matchedUser: DuoMatchCardData;
  myInGameName?: string;
  onSendUsername: () => Promise<void>;
  onViewProfile: () => void;
  onSearchAgain: () => void;
}

export default function DuoMatchResult({
  game,
  matchedUser,
  myInGameName,
  onSendUsername,
  onViewProfile,
  onSearchAgain,
}: DuoMatchResultProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Animations
  const matchedScale = useSharedValue(0);
  const matchedOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    // Ring burst
    ringScale.value = withTiming(2.5, { duration: 600, easing: Easing.out(Easing.ease) });
    ringOpacity.value = withSequence(
      withTiming(0.6, { duration: 200 }),
      withDelay(200, withTiming(0, { duration: 400 })),
    );

    // "Matched!" text pop
    matchedOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    matchedScale.value = withDelay(100, withSpring(1, { damping: 8, stiffness: 150 }));

    // Card slide up
    cardOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    cardTranslateY.value = withDelay(400, withSpring(0, { damping: 12, stiffness: 100 }));

    // Buttons fade in
    buttonsOpacity.value = withDelay(700, withTiming(1, { duration: 350 }));
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const matchedStyle = useAnimatedStyle(() => ({
    opacity: matchedOpacity.value,
    transform: [{ scale: matchedScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const handleSendUsername = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      await onSendUsername();
      setSent(true);
    } catch {
      // error handled by parent
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Ring burst animation */}
      <View style={styles.ringContainer}>
        <Animated.View style={[styles.ring, ringStyle]} />
      </View>

      {/* Matched! header */}
      <Animated.View style={[styles.headerContainer, matchedStyle]}>
        <ThemedText style={styles.matchedText}>Matched!</ThemedText>
      </Animated.View>

      {/* Matched user card */}
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

      {/* Buttons */}
      <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
        {myInGameName ? (
          <TouchableOpacity
            style={[styles.primaryButton, sent && styles.primaryButtonSent]}
            onPress={handleSendUsername}
            activeOpacity={0.8}
            disabled={sending || sent}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#0f0f0f" />
            ) : sent ? (
              <View style={styles.primaryButtonRow}>
                <IconSymbol size={16} name="checkmark" color="#0f0f0f" />
                <ThemedText style={styles.primaryButtonText}>Username Sent</ThemedText>
              </View>
            ) : (
              <View style={styles.primaryButtonRow}>
                <IconSymbol size={16} name="paperplane.fill" color="#0f0f0f" />
                <ThemedText style={styles.primaryButtonText}>Send Game Username</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSendUsername}
            activeOpacity={0.8}
          >
            <View style={styles.primaryButtonRow}>
              <IconSymbol size={16} name="bubble.left.fill" color="#0f0f0f" />
              <ThemedText style={styles.primaryButtonText}>Start Chat</ThemedText>
            </View>
          </TouchableOpacity>
        )}

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
    paddingTop: 40,
  },
  ringContainer: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
  },
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerContainer: {
    marginBottom: 20,
  },
  matchedText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  cardContainer: {
    width: '100%',
    paddingHorizontal: 4,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
    marginTop: 20,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 28,
  },
  primaryButtonSent: {
    opacity: 0.7,
  },
  primaryButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f0f0f',
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
