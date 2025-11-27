import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface Player {
  rank: number;
  name: string;
  points: number;
  avatar: string;
  isCurrentUser?: boolean;
}

interface LeaderboardViewProps {
  leaderboardName: string;
  leaderboardIcon: string;
  game: string;
  members: number;
  players: Player[];
}

export default function LeaderboardView({
  leaderboardName,
  leaderboardIcon,
  game,
  members,
  players,
}: LeaderboardViewProps) {
  const router = useRouter();

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#666';
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{leaderboardName}</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Column Headers */}
        <View style={styles.columnHeaders}>
          <ThemedText style={[styles.columnHeaderText, { width: 60 }]}>Rank</ThemedText>
          <ThemedText style={[styles.columnHeaderText, { flex: 1 }]}>Player</ThemedText>
          <ThemedText style={[styles.columnHeaderText, styles.alignRight, { width: 80 }]}>
            Points
          </ThemedText>
        </View>

        {/* Player Rows */}
        {players.map((player) => (
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

            {/* Points */}
            <ThemedText style={[styles.pointsText, styles.alignRight, { width: 80 }]}>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: '#fafafa',
  },
  columnHeaderText: {
    fontSize: 11,
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
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    position: 'relative',
  },
  topThreeRow: {
    backgroundColor: '#fafafa',
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
    width: 3,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  rankContainer: {
    width: 60,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentUserAvatar: {
    backgroundColor: '#fef3c7',
  },
  avatarText: {
    fontSize: 16,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    letterSpacing: -0.3,
  },
  currentUserName: {
    fontWeight: '600',
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  bottomSpacer: {
    height: 40,
  },
});