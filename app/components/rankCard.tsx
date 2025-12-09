import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface Game {
  id: number;
  name: string;
  rank: string;
  trophies: number;
  icon: string;
  wins: number;
  losses: number;
  winRate: number;
  recentMatches: string[];
}

interface RankCardProps {
  game: Game;
  username: string;
}

export default function RankCard({ game, username }: RankCardProps) {
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  return (
    <TouchableOpacity
      style={styles.rankCard}
      onPress={() => setIsCardFlipped(!isCardFlipped)}
      activeOpacity={0.9}
    >
      {!isCardFlipped ? (
        // Front of card - Credit card style
        <View style={styles.cardFront}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardGameIcon}>{game.icon}</ThemedText>
          </View>

          <View style={styles.cardMiddle}>
            <ThemedText style={styles.cardRankLabel}>CURRENT RANK</ThemedText>
            <ThemedText style={styles.cardRankValue}>{game.rank}</ThemedText>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.cardUserInfo}>
              <ThemedText style={styles.cardUsername}>@{username}</ThemedText>
            </View>
            <ThemedText style={styles.swipeHint}>Tap to view stats →</ThemedText>
          </View>
        </View>
      ) : (
        // Back of card - Detailed stats
        <View style={styles.cardBack}>
          <View style={styles.cardBackHeader}>
            <ThemedText style={styles.cardBackTitle}>Performance Stats</ThemedText>
            <ThemedText style={styles.swipeHint}>← Tap to go back</ThemedText>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <IconSymbol size={24} name="trophy.fill" color="#3b82f6" />
              <ThemedText style={styles.statItemValue}>{game.wins}</ThemedText>
              <ThemedText style={styles.statItemLabel}>Wins</ThemedText>
            </View>
            <View style={styles.statItem}>
              <IconSymbol size={24} name="percent" color="#22c55e" />
              <ThemedText style={styles.statItemValue}>{game.winRate}%</ThemedText>
              <ThemedText style={styles.statItemLabel}>Win Rate</ThemedText>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <IconSymbol size={24} name="star.fill" color="#FFD700" />
              <ThemedText style={styles.statItemValue}>Diamond 1</ThemedText>
              <ThemedText style={styles.statItemLabel}>Peak Rank</ThemedText>
            </View>
            <View style={styles.statItem}>
              <IconSymbol size={24} name="gamecontroller.fill" color="#8b5cf6" />
              <ThemedText style={styles.statItemValue}>{game.wins + game.losses}</ThemedText>
              <ThemedText style={styles.statItemLabel}>Games Played</ThemedText>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rankCard: {
    backgroundColor: '#1e1b4b',
    padding: 30,
    borderRadius: 24,
    height: 220,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardFront: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: {
    marginBottom: 30,
  },
  cardGameIcon: {
    fontSize: 42,
  },
  cardMiddle: {
    marginBottom: 30,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cardRankLabel: {
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardRankValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
    paddingVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardUserInfo: {
    flex: 1,
  },
  cardUsername: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  cardBack: {
    flex: 1,
  },
  cardBackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardBackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statItemLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
