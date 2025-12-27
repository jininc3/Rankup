import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface Player {
  rank: number;
  name: string;
  points: number;
  avatar: string;
  isCurrentUser?: boolean;
  dailyGain?: number;
}

export default function LeaderboardDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const leaderboardName = params.name as string;
  const leaderboardIcon = params.icon as string;
  const game = params.game as string;
  const members = Number(params.members);
  const players: Player[] = JSON.parse(params.players as string);

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#666';
  };

  const getPointsLabel = () => {
    if (game === 'Valorant') return 'RR';
    if (game === 'League of Legends') return 'LP';
    return 'Points';
  };


  // Duration tracking (mock data for now - can be passed via params later)
  const currentDay = 5;
  const totalDays = 30;
  const progress = (currentDay / totalDays) * 100;

  const getBorderColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#333';
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>{leaderboardName.toUpperCase()}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{game.toUpperCase()} • {members} PLAYERS</ThemedText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Duration Section */}
        <View style={styles.durationSection}>
          <View style={styles.progressCard}>
            <ThemedText style={styles.durationLabel}>DAY {currentDay}/{totalDays}</ThemedText>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Column Headers */}
        <View style={styles.columnHeaders}>
          <ThemedText style={[styles.columnHeaderText, { width: 50 }]}>RANK</ThemedText>
          <ThemedText style={[styles.columnHeaderText, { flex: 1 }]}>PLAYER</ThemedText>
          <ThemedText style={[styles.columnHeaderText, styles.alignRight, { width: 70 }]}>
            DAILY
          </ThemedText>
          <ThemedText style={[styles.columnHeaderText, styles.alignRight, { width: 80 }]}>
            {getPointsLabel()}
          </ThemedText>
        </View>

        {/* Player Rows (All Players) */}
        <View style={styles.playerList}>
          {players.map((player, index) => (
            <View
              key={player.rank}
              style={[
                styles.playerRow,
                player.isCurrentUser && styles.currentUserRow,
                { borderLeftWidth: 4, borderLeftColor: getBorderColor(player.rank) },
              ]}
            >
              {/* Rank Number */}
              <View style={styles.rankContainer}>
                <ThemedText style={styles.rankText}>
                  {player.rank}
                </ThemedText>
              </View>

              {/* Player Info */}
              <View style={styles.playerInfo}>
                <View style={styles.playerAvatar}>
                  <ThemedText style={styles.avatarText}>{player.avatar}</ThemedText>
                </View>
                <ThemedText style={styles.playerName} numberOfLines={1}>
                  {player.name.toUpperCase()}
                </ThemedText>
              </View>

              {/* Daily Gain */}
              <ThemedText
                style={[
                  styles.dailyGainText,
                  styles.alignRight,
                  { width: 70 },
                  (player.dailyGain ?? 0) > 0 && styles.positiveGain,
                  (player.dailyGain ?? 0) < 0 && styles.negativeGain,
                ]}
              >
                {(player.dailyGain ?? 0) > 0 ? '+' : ''}{player.dailyGain ?? 0}
              </ThemedText>

              {/* Points */}
              <ThemedText style={[styles.pointsText, styles.alignRight, { width: 80 }]}>
                {player.points.toLocaleString()}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 3,
    borderBottomColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 8,
    fontWeight: '400',
    color: '#999',
    letterSpacing: 1,
    fontFamily: 'System',
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  durationSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#0a0a0a',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#000',
    padding: 20,
    position: 'relative',
  },
  durationLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
    fontFamily: 'System',
  },
  progressBarContainer: {
    marginBottom: 0,
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'visible',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#000',
    position: 'relative',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 0,
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#333',
    borderBottomWidth: 3,
  },
  columnHeaderText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  alignRight: {
    textAlign: 'right',
  },
  playerList: {
    paddingHorizontal: 12,
    borderWidth: 3,
    borderColor: '#333',
    marginHorizontal: 16,
    borderTopWidth: 0,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    position: 'relative',
  },
  currentUserRow: {
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 4,
    borderLeftColor: '#fff',
  },
  rankContainer: {
    width: 50,
    alignItems: 'flex-start',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerAvatar: {
    width: 28,
    height: 28,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    textAlign: 'center',
  },
  playerName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0,
    fontFamily: 'System',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  dailyGainText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
    fontFamily: 'System',
  },
  positiveGain: {
    color: '#22c55e',
  },
  negativeGain: {
    color: '#ef4444',
  },
  bottomSpacer: {
    height: 40,
  },
});