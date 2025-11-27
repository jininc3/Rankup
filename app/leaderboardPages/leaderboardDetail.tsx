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

  const topThree = players.filter(p => p.rank <= 3);
  const restOfPlayers = players.filter(p => p.rank > 3);

  // Duration tracking (mock data for now - can be passed via params later)
  const currentDay = 5;
  const totalDays = 30;
  const progress = (currentDay / totalDays) * 100;

  const getPodiumOrder = () => {
    const first = topThree.find(p => p.rank === 1);
    const second = topThree.find(p => p.rank === 2);
    const third = topThree.find(p => p.rank === 3);
    return [second, first, third].filter(Boolean);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>{leaderboardName}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{game} • {members} players</ThemedText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Duration Section */}
        <View style={styles.durationSection}>
          <View style={styles.durationHeader}>
            <ThemedText style={styles.durationLabel}>Day {currentDay}</ThemedText>
            <ThemedText style={styles.durationTotal}>of {totalDays}</ThemedText>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
          </View>
          <View style={styles.durationFooter}>
            <ThemedText style={styles.durationFooterText}>0</ThemedText>
            <ThemedText style={styles.durationFooterText}>{totalDays} days</ThemedText>
          </View>
        </View>

        {/* Podium for Top 3 */}
        {topThree.length > 0 && (
          <View style={styles.podiumContainer}>
            <View style={styles.podiumRow}>
              {getPodiumOrder().map((player) => {
                if (!player) return null;
                return (
                  <View
                    key={player.rank}
                    style={[
                      styles.podiumItem,
                      player.rank === 1 && styles.firstPlace,
                      player.rank === 2 && styles.secondPlace,
                      player.rank === 3 && styles.thirdPlace,
                    ]}
                  >
                    <View
                      style={[
                        styles.podiumAvatar,
                        { borderColor: getRankColor(player.rank) },
                      ]}
                    >
                      <ThemedText style={styles.podiumAvatarText}>{player.avatar}</ThemedText>
                    </View>
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: getRankColor(player.rank) },
                      ]}
                    >
                      <ThemedText style={styles.rankBadgeText}>{player.rank}</ThemedText>
                    </View>
                    <ThemedText style={styles.podiumName} numberOfLines={1}>
                      {player.name}
                    </ThemedText>
                    <View style={styles.podiumStatsContainer}>
                      <ThemedText
                        style={[
                          styles.podiumDailyGain,
                          (player.dailyGain ?? 0) > 0 && styles.positiveGainPodium,
                          (player.dailyGain ?? 0) < 0 && styles.negativeGainPodium,
                        ]}
                      >
                        {(player.dailyGain ?? 0) > 0 ? '+' : ''}{player.dailyGain ?? 0}
                      </ThemedText>
                      <ThemedText style={styles.podiumPoints}>
                        {player.points.toLocaleString()}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Column Headers for Rest of List */}
        {restOfPlayers.length > 0 && (
          <View style={styles.columnHeaders}>
            <ThemedText style={[styles.columnHeaderText, { width: 40 }]}>Rank</ThemedText>
            <ThemedText style={[styles.columnHeaderText, { flex: 1 }]}>Player</ThemedText>
            <ThemedText style={[styles.columnHeaderText, styles.alignRight, { width: 60 }]}>
              Daily
            </ThemedText>
            <ThemedText style={[styles.columnHeaderText, styles.alignRight, { width: 70 }]}>
              {getPointsLabel()}
            </ThemedText>
          </View>
        )}

        {/* Player Rows (4th place onwards) */}
        {restOfPlayers.map((player) => (
          <View
            key={player.rank}
            style={[
              styles.playerRow,
              player.isCurrentUser && styles.currentUserRow,
              player.rank <= 3 && styles.topThreeRow,
            ]}
          >
            {/* Rank Indicator */}
            {player.rank <= 3 && (
              <View
                style={[
                  styles.rankIndicator,
                  { backgroundColor: getRankColor(player.rank) },
                ]}
              />
            )}

            {/* Rank Number */}
            <View style={styles.rankContainer}>
              <ThemedText
                style={[
                  styles.rankText,
                  player.rank <= 3 && { color: getRankColor(player.rank) },
                ]}
              >
                {player.rank}
              </ThemedText>
            </View>

            {/* Player Info */}
            <View style={styles.playerInfo}>
              <View
                style={[
                  styles.playerAvatar,
                  player.isCurrentUser && styles.currentUserAvatar,
                  player.rank <= 3 && {
                    borderColor: getRankColor(player.rank),
                    borderWidth: 2,
                  },
                ]}
              >
                <ThemedText style={styles.avatarText}>{player.avatar}</ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.playerName,
                  player.isCurrentUser && styles.currentUserName,
                ]}
              >
                {player.name}
              </ThemedText>
            </View>

            {/* Daily Gain */}
            <ThemedText
              style={[
                styles.dailyGainText,
                styles.alignRight,
                { width: 60 },
                (player.dailyGain ?? 0) > 0 && styles.positiveGain,
                (player.dailyGain ?? 0) < 0 && styles.negativeGain,
              ]}
            >
              {(player.dailyGain ?? 0) > 0 ? '+' : ''}{player.dailyGain ?? 0}
            </ThemedText>

            {/* Points */}
            <ThemedText style={[styles.pointsText, styles.alignRight, { width: 70 }]}>
              {player.points.toLocaleString()}
            </ThemedText>
          </View>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
    marginBottom: 2,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  durationSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  durationHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  durationLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  durationTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 4,
  },
  durationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationFooterText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 8,
    backgroundColor: '#fff',
  },
  columnHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alignRight: {
    textAlign: 'right',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#e5e5e5',
    position: 'relative',
  },
  topThreeRow: {
    backgroundColor: '#fff',
  },
  currentUserRow: {
    backgroundColor: '#fff9ed',
    borderColor: '#f59e0b',
  },
  rankIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  rankContainer: {
    width: 40,
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentUserAvatar: {
    backgroundColor: '#fef3c7',
  },
  avatarText: {
    fontSize: 12,
    textAlign: 'center',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
    letterSpacing: -0.2,
  },
  currentUserName: {
    fontWeight: '600',
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  bottomSpacer: {
    height: 40,
  },
  podiumContainer: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 16,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 110,
  },
  firstPlace: {
    marginBottom: 20,
  },
  secondPlace: {
    marginBottom: 0,
  },
  thirdPlace: {
    marginBottom: -10,
  },
  podiumAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 8,
  },
  podiumAvatarText: {
    fontSize: 32,
    textAlign: 'center',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    right: 8,
  },
  rankBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumPoints: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
  },
  podiumStatsContainer: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 12,
  },
  podiumDailyGain: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  dailyGainText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  positiveGain: {
    color: '#22c55e',
  },
  negativeGain: {
    color: '#ef4444',
  },
  positiveGainPodium: {
    color: '#22c55e',
  },
  negativeGainPodium: {
    color: '#ef4444',
  },
});
