import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const cardHeight = width * 1.0;

interface Duo {
  id: number;
  username: string;
  status: string;
  matchPercentage: number;
  currentRank: string;
  peakRank: string;
  favoriteAgent: string;
  favoriteRole: string;
  winRate: number;
  gamesPlayed: number;
}

interface DuoCardProps {
  duo: Duo;
}

export default function DuoCard({ duo }: DuoCardProps) {
  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return '#22c55e';
    if (percentage >= 80) return '#3b82f6';
    return '#f59e0b';
  };

  return (
    <View style={styles.duoCard}>
      <View style={styles.duoHeader}>
        <TouchableOpacity style={styles.duoLeft}>
          <View style={styles.avatarContainer}>
            <IconSymbol size={40} name="person.circle.fill" color="#3b82f6" />
            <View style={[styles.statusDot, duo.status === 'Online' ? styles.onlineDot : styles.offlineDot]} />
          </View>
          <View style={styles.duoInfo}>
            <ThemedText style={styles.duoName}>{duo.username}</ThemedText>
          </View>
        </TouchableOpacity>

        <View style={styles.matchBadge}>
          <ThemedText style={[styles.matchPercentage, { color: getMatchColor(duo.matchPercentage) }]}>
            {duo.matchPercentage}%
          </ThemedText>
          <ThemedText style={styles.matchLabel}>Match</ThemedText>
        </View>
      </View>

      <View style={styles.duoDetails}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Current Rank</ThemedText>
            <ThemedText style={styles.statValue}>{duo.currentRank}</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Peak Rank</ThemedText>
            <ThemedText style={styles.statValue}>{duo.peakRank}</ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Favorite Agent</ThemedText>
            <ThemedText style={styles.statValue}>{duo.favoriteAgent}</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Favorite Role</ThemedText>
            <ThemedText style={styles.statValue}>{duo.favoriteRole}</ThemedText>
          </View>
        </View>

        <View style={styles.listStats}>
          <View style={styles.listStatRow}>
            <ThemedText style={styles.listStatLabel}>Win Rate</ThemedText>
            <ThemedText style={styles.listStatValue}>{duo.winRate}%</ThemedText>
          </View>
          <View style={styles.listStatRow}>
            <ThemedText style={styles.listStatLabel}>Games Played</ThemedText>
            <ThemedText style={styles.listStatValue}>{duo.gamesPlayed}</ThemedText>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.inviteButton}>
        <IconSymbol size={16} name="paperplane.fill" color="#fff" />
        <ThemedText style={styles.inviteText}>Invite</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  duoCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    height: cardHeight,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  duoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  duoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineDot: {
    backgroundColor: '#22c55e',
  },
  offlineDot: {
    backgroundColor: '#9ca3af',
  },
  duoInfo: {
    flex: 1,
  },
  duoName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    color: '#000',
    letterSpacing: -0.3,
  },
  matchBadge: {
    alignItems: 'center',
  },
  matchPercentage: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  matchLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  duoDetails: {
    gap: 8,
    marginBottom: 0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 6,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  listStats: {
    gap: 8,
  },
  listStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  listStatLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  listStatValue: {
    fontSize: 13,
    color: '#000',
    fontWeight: '600',
  },
  inviteButton: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#000',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
