import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';

interface Player {
  rank: number;
  username: string;
  avatar: string;
  isCurrentUser?: boolean;
  currentRank: string; // e.g., "Gold 3"
  rr: number; // Rank Rating
  dailyGain?: number; // Daily RR gain/loss
}

export default function ValorantLeaderboardDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const partyIdParam = params.partyId as string;
  const [partyData, setPartyData] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch party data and member stats
  useEffect(() => {
    const fetchPartyData = async () => {
      console.log('Valorant Detail - Party ID param:', partyIdParam);

      if (!partyIdParam) {
        console.log('No partyIdParam provided');
        setLoading(false);
        return;
      }

      try {
        // Query for party by partyId
        const partiesRef = collection(db, 'parties');
        const partyQuery = query(partiesRef, where('partyId', '==', partyIdParam), limit(1));
        const partySnapshot = await getDocs(partyQuery);

        if (partySnapshot.empty) {
          console.log('Party not found for ID:', partyIdParam);
          setLoading(false);
          return;
        }

        const partyDoc = partySnapshot.docs[0].data();
        console.log('Party found:', partyDoc.partyName);
        console.log('Member details:', partyDoc.memberDetails);
        setPartyData(partyDoc);

        // Check if memberDetails exists
        if (!partyDoc.memberDetails || partyDoc.memberDetails.length === 0) {
          console.log('No member details found in party');
          setLoading(false);
          return;
        }

        // Fetch rank data for each member
        const memberPromises = partyDoc.memberDetails.map(async (member: any, index: number) => {
          console.log(`Fetching stats for member: ${member.username} (${member.userId})`);
          const userStatsDoc = await getDoc(doc(db, 'users', member.userId, 'gameStats', 'valorant'));
          const stats = userStatsDoc.data();
          console.log(`Stats for ${member.username}:`, stats);

          return {
            rank: index + 1, // Temporary ranking, should be calculated based on actual RR
            username: member.username,
            avatar: member.avatar,
            currentRank: stats?.currentRank || 'Unranked',
            rr: stats?.rr || 0,
            dailyGain: stats?.dailyGain || 0,
            isCurrentUser: false, // TODO: Check if current user
          };
        });

        const fetchedPlayers = await Promise.all(memberPromises);
        console.log('Fetched players before sorting:', fetchedPlayers);

        // Sort players by RR (descending) and assign ranks
        fetchedPlayers.sort((a, b) => b.rr - a.rr);
        fetchedPlayers.forEach((player, index) => {
          player.rank = index + 1;
        });

        console.log('Final players to display:', fetchedPlayers);
        setPlayers(fetchedPlayers);
      } catch (error) {
        console.error('Error fetching party data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartyData();
  }, [partyIdParam]);

  const leaderboardName = partyData?.partyName || params.name as string;
  const members = partyData?.members?.length || Number(params.members);
  const startDate = partyData?.startDate || params.startDate as string;
  const endDate = partyData?.endDate || params.endDate as string;

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { currentDay: Math.max(1, Math.min(currentDay, totalDays)), totalDays };
  };

  const daysInfo = calculateDaysRemaining();
  const progress = daysInfo ? (daysInfo.currentDay / daysInfo.totalDays) * 100 : 0;

  const getBorderColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#333';
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/leaderboard')}>
            <IconSymbol size={20} name="chevron.left" color="#000" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Loading...</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <ThemedText style={styles.loadingText}>Loading party data...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/leaderboard')}>
          <IconSymbol size={20} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>{leaderboardName}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Valorant • {members} Players</ThemedText>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Duration Section */}
        {daysInfo && (
          <View style={styles.durationSection}>
            <View style={styles.progressCard}>
              <ThemedText style={styles.durationLabel}>
                DAY {daysInfo.currentDay}/{daysInfo.totalDays}
              </ThemedText>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
              </View>
              {startDate && endDate && (
                <View style={styles.dateRangeContainer}>
                  <ThemedText style={styles.dateText}>{startDate}</ThemedText>
                  <ThemedText style={styles.dateText}>{endDate}</ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Column Headers */}
        <View style={styles.columnHeaders}>
          <ThemedText style={[styles.columnHeaderText, { width: 50 }]}>RANK</ThemedText>
          <ThemedText style={[styles.columnHeaderText, { flex: 1 }]}>PLAYER</ThemedText>
          <ThemedText style={[styles.columnHeaderText, styles.alignRight, { width: 70 }]}>
            DAILY
          </ThemedText>
          <ThemedText style={[styles.columnHeaderText, styles.alignRight, { width: 80 }]}>
            RR
          </ThemedText>
        </View>

        {/* Player Rows */}
        <View style={styles.playerList}>
          {players.map((player) => (
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
                <ThemedText style={styles.rankText}>{player.rank}</ThemedText>
              </View>

              {/* Player Info */}
              <View style={styles.playerInfo}>
                <View style={styles.playerAvatar}>
                  {player.avatar && player.avatar.startsWith('http') ? (
                    <Image source={{ uri: player.avatar }} style={styles.playerAvatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarText}>
                      {player.avatar || player.username[0].toUpperCase()}
                    </ThemedText>
                  )}
                </View>
                <ThemedText style={styles.playerName} numberOfLines={1}>
                  {player.username}
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
                {(player.dailyGain ?? 0) > 0 ? '+' : ''}
                {player.dailyGain ?? 0}
              </ThemedText>

              {/* RR */}
              <ThemedText style={[styles.rrText, styles.alignRight, { width: 80 }]}>
                {player.rr || 0}
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    letterSpacing: 0,
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  durationSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  durationLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 4,
    position: 'relative',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 0,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  columnHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  alignRight: {
    textAlign: 'right',
  },
  playerList: {
    paddingHorizontal: 20,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    position: 'relative',
    borderLeftWidth: 3,
  },
  currentUserRow: {
    backgroundColor: '#fafafa',
  },
  rankContainer: {
    width: 50,
    alignItems: 'flex-start',
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
    gap: 8,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  avatarText: {
    fontSize: 14,
    textAlign: 'center',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },
  rrText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  dailyGainText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  positiveGain: {
    color: '#22c55e',
  },
  negativeGain: {
    color: '#ef4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  bottomSpacer: {
    height: 40,
  },
});
