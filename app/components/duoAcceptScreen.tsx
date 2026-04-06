import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DuoMatchCardData } from '@/services/duoMatchService';

interface DuoAcceptScreenProps {
  matchedUser: DuoMatchCardData;
  game: 'valorant' | 'league';
  expiresAt: Date;
  hasAccepted: boolean;
  otherAccepted: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function DuoAcceptScreen({
  matchedUser,
  game,
  expiresAt,
  hasAccepted,
  otherAccepted,
  onAccept,
  onDecline,
}: DuoAcceptScreenProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.8)).current;

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleIn, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const progress = timeLeft / 60;
  const isUrgent = timeLeft <= 10;

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn, transform: [{ scale: scaleIn }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.matchFoundDot, { opacity: pulseAnim }]} />
        <ThemedText style={styles.matchFoundText}>MATCH FOUND</ThemedText>
      </View>

      {/* Timer */}
      <View style={styles.timerSection}>
        <View style={styles.timerBarBackground}>
          <View style={[
            styles.timerBarFill,
            { width: `${progress * 100}%` },
            isUrgent && styles.timerBarUrgent,
          ]} />
        </View>
        <ThemedText style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
          {timeLeft}s
        </ThemedText>
      </View>

      {/* Player Card */}
      <View style={styles.playerCard}>
        <View style={styles.playerCardInner}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {matchedUser.avatar ? (
              <Image source={{ uri: matchedUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <ThemedText style={styles.avatarInitial}>
                  {matchedUser.username?.[0]?.toUpperCase() || '?'}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Info */}
          <ThemedText style={styles.username}>{matchedUser.username}</ThemedText>
          <ThemedText style={styles.rank}>{matchedUser.currentRank || 'Unranked'}</ThemedText>

          {matchedUser.inGameName && (
            <View style={styles.inGameRow}>
              <IconSymbol size={12} name="gamecontroller.fill" color="#888" />
              <ThemedText style={styles.inGameName}>{matchedUser.inGameName}</ThemedText>
            </View>
          )}

          {/* Status indicators */}
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, hasAccepted && styles.statusDotAccepted]} />
              <ThemedText style={styles.statusLabel}>You</ThemedText>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, otherAccepted && styles.statusDotAccepted]} />
              <ThemedText style={styles.statusLabel}>Opponent</ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Buttons */}
      {!hasAccepted ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.declineButtonText}>Decline</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={onAccept}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.acceptButtonText}>Accept</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.waitingSection}>
          <ThemedText style={styles.waitingText}>Waiting for opponent...</ThemedText>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  matchFoundDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D4A843',
  },
  matchFoundText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D4A843',
    letterSpacing: 2,
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 32,
  },
  timerBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: '#D4A843',
    borderRadius: 2,
  },
  timerBarUrgent: {
    backgroundColor: '#ef4444',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4A843',
    minWidth: 35,
    textAlign: 'right',
  },
  timerTextUrgent: {
    color: '#ef4444',
  },
  playerCard: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 32,
  },
  playerCardInner: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#D4A843',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D4A843',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  rank: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  inGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  inGameName: {
    fontSize: 13,
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  statusDotAccepted: {
    backgroundColor: '#22c55e',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  declineButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#D4A843',
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  waitingSection: {
    paddingVertical: 16,
  },
  waitingText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },
});
