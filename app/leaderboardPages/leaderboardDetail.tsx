import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit, updateDoc, deleteDoc } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';

interface Player {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  isCurrentUser?: boolean;
  currentRank: string;
  lp?: number; // League Points (League of Legends)
  rr?: number; // Rank Rating (Valorant)
  dailyGain?: number;
}

// Helper function to calculate League rank value for sorting
const getLeagueRankValue = (currentRank: string, lp: number): number => {
  const rankOrder: { [key: string]: number } = {
    'CHALLENGER': 10,
    'GRANDMASTER': 9,
    'MASTER': 8,
    'DIAMOND': 7,
    'EMERALD': 6,
    'PLATINUM': 5,
    'GOLD': 4,
    'SILVER': 3,
    'BRONZE': 2,
    'IRON': 1,
    'UNRANKED': 0,
  };

  const divisionOrder: { [key: string]: number } = {
    'I': 4,
    'II': 3,
    'III': 2,
    'IV': 1,
  };

  const parts = currentRank.toUpperCase().split(' ');
  const tier = parts[0];
  const division = parts[1] || '';

  const tierValue = rankOrder[tier] || 0;
  const divisionValue = divisionOrder[division] || 0;

  return tierValue * 1000 + divisionValue * 100 + lp;
};

// Helper function to calculate Valorant rank value for sorting
const getValorantRankValue = (currentRank: string, rr: number): number => {
  const rankOrder: { [key: string]: number } = {
    'RADIANT': 9,
    'IMMORTAL': 8,
    'ASCENDANT': 7,
    'DIAMOND': 6,
    'PLATINUM': 5,
    'GOLD': 4,
    'SILVER': 3,
    'BRONZE': 2,
    'IRON': 1,
    'UNRANKED': 0,
  };

  const parts = currentRank.toUpperCase().split(' ');
  const tier = parts[0];
  const division = parts[1] || '0';

  const tierValue = rankOrder[tier] || 0;
  const divisionValue = parseInt(division) || 0;

  return tierValue * 1000 + divisionValue * 100 + rr;
};

export default function LeaderboardDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const partyIdParam = params.partyId as string;
  const game = params.game as string; // "Valorant" or "League of Legends"
  const isLeague = game === 'League of Legends';

  const [partyData, setPartyData] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [partyDocId, setPartyDocId] = useState<string>('');

  // Leave party function
  const handleLeaveParty = async () => {
    if (!user?.id || !partyDocId) {
      Alert.alert('Error', 'Unable to leave party. Please try again.');
      return;
    }

    Alert.alert(
      'Leave Party',
      'Are you sure you want to leave this party?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const partyRef = doc(db, 'parties', partyDocId);

              // Remove user from members and memberDetails arrays
              const updatedMembers = partyData.members.filter((id: string) => id !== user.id);
              const updatedMemberDetails = partyData.memberDetails.filter(
                (member: any) => member.userId !== user.id
              );

              // Check if this is the last member
              if (updatedMembers.length === 0) {
                // Delete the party entirely
                await deleteDoc(partyRef);
                Alert.alert('Party Deleted', 'You were the last member. The party has been deleted.');
                router.replace('/(tabs)/leaderboard');
                return;
              }

              // Check if user is the party creator
              const isCreator = partyData.createdBy === user.id;

              if (isCreator) {
                // Transfer leadership to the next member
                const newLeader = updatedMembers[0];
                const newLeaderDetails = updatedMemberDetails[0];

                await updateDoc(partyRef, {
                  members: updatedMembers,
                  memberDetails: updatedMemberDetails,
                  createdBy: newLeader,
                });

                Alert.alert(
                  'Leadership Transferred',
                  `You have left the party. Leadership has been transferred to ${newLeaderDetails.username}.`
                );
              } else {
                // Regular member leaving
                await updateDoc(partyRef, {
                  members: updatedMembers,
                  memberDetails: updatedMemberDetails,
                });

                Alert.alert('Success', 'You have left the party.');
              }

              router.replace('/(tabs)/leaderboard');
            } catch (error) {
              console.error('Error leaving party:', error);
              Alert.alert('Error', 'Failed to leave party. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Show invite code and copy to clipboard
  const handleShowInviteCode = async () => {
    if (!inviteCode) {
      Alert.alert('No Invite Code', 'This party does not have an invite code.');
      return;
    }

    Alert.alert(
      'Party Invite Code',
      inviteCode,
      [
        {
          text: 'Copy',
          onPress: async () => {
            await Clipboard.setStringAsync(inviteCode);
            Alert.alert('Copied!', 'Invite code copied to clipboard');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Fetch party data and member stats
  useEffect(() => {
    const fetchPartyData = async () => {
      console.log(`${game} Detail - Party ID param:`, partyIdParam);

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
        const partyDocumentId = partySnapshot.docs[0].id;
        console.log('Party found:', partyDoc.partyName);
        console.log('Member details:', partyDoc.memberDetails);
        setPartyData(partyDoc);
        setPartyDocId(partyDocumentId);
        setInviteCode(partyDoc.inviteCode || '');

        // Check if memberDetails exists
        if (!partyDoc.memberDetails || partyDoc.memberDetails.length === 0) {
          console.log('No member details found in party');
          setLoading(false);
          return;
        }

        // Determine which subcollection and stats to fetch based on game
        const gameStatsPath = isLeague ? 'league' : 'valorant';

        // Fetch rank data for each member
        const memberPromises = partyDoc.memberDetails.map(async (member: any, index: number) => {
          console.log(`Fetching stats for member: ${member.username} (${member.userId})`);

          // Try to get from gameStats subcollection first
          const userStatsDoc = await getDoc(doc(db, 'users', member.userId, 'gameStats', gameStatsPath));
          let stats = userStatsDoc.data();

          // Fallback: If gameStats doesn't exist, read from main stats
          if (!stats || !stats.currentRank) {
            console.log(`No gameStats found for ${member.username}, falling back to main stats`);
            const userDoc = await getDoc(doc(db, 'users', member.userId));
            const userData = userDoc.data();

            if (isLeague && userData?.riotStats?.rankedSolo) {
              stats = {
                currentRank: `${userData.riotStats.rankedSolo.tier} ${userData.riotStats.rankedSolo.rank}`,
                lp: userData.riotStats.rankedSolo.leaguePoints || 0,
                dailyGain: 0,
              };
            } else if (!isLeague && userData?.valorantStats) {
              stats = {
                currentRank: userData.valorantStats.currentRank || 'Unranked',
                rr: userData.valorantStats.rankRating || 0,
                dailyGain: 0,
              };
            }
          }

          console.log(`Stats for ${member.username}:`, stats);

          return {
            rank: index + 1,
            userId: member.userId,
            username: member.username,
            avatar: member.avatar,
            currentRank: stats?.currentRank || 'Unranked',
            lp: isLeague ? (stats?.lp || 0) : undefined,
            rr: !isLeague ? (stats?.rr || 0) : undefined,
            dailyGain: stats?.dailyGain || 0,
            isCurrentUser: member.userId === user?.id,
          };
        });

        const fetchedPlayers = await Promise.all(memberPromises);
        console.log('Fetched players before sorting:', fetchedPlayers);

        // Sort players by rank value based on game type
        fetchedPlayers.sort((a, b) => {
          if (isLeague) {
            const aValue = getLeagueRankValue(a.currentRank, a.lp || 0);
            const bValue = getLeagueRankValue(b.currentRank, b.lp || 0);
            return bValue - aValue;
          } else {
            const aValue = getValorantRankValue(a.currentRank, a.rr || 0);
            const bValue = getValorantRankValue(b.currentRank, b.rr || 0);
            return bValue - aValue;
          }
        });

        // Assign rank positions (1st, 2nd, 3rd, etc.)
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
  }, [partyIdParam, game, isLeague]);

  const leaderboardName = partyData?.partyName || params.name as string;
  const members = partyData?.members?.length || Number(params.members);

  // Helper function to convert Firestore Timestamp or string to Date
  const convertToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;

    // If it's a Firestore Timestamp
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }

    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // If it's a string, parse MM/DD/YYYY format
    if (typeof dateValue === 'string') {
      // Try MM/DD/YYYY format first
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1; // Months are 0-indexed
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);

        // Validate the date
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Fallback to standard Date parsing
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  };

  const startDate = partyData?.startDate || params.startDate;
  const endDate = partyData?.endDate || params.endDate;

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    const start = convertToDate(startDate);
    const end = convertToDate(endDate);

    if (!start || !end) {
      return null;
    }

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

  // Navigate to player's profile
  const handlePlayerPress = (player: Player) => {
    // Check if clicking on own profile
    if (player.userId === user?.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profilePages/profileView?userId=${player.userId}`);
    }
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
          <ThemedText style={styles.headerSubtitle}>{game} • {members} Players</ThemedText>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={handleLeaveParty}>
          <IconSymbol size={20} name="rectangle.portrait.and.arrow.right" color="#ef4444" />
        </TouchableOpacity>
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
                  <ThemedText style={styles.dateText}>
                    {convertToDate(startDate)?.toLocaleDateString() || 'Start Date'}
                  </ThemedText>
                  <ThemedText style={styles.dateText}>
                    {convertToDate(endDate)?.toLocaleDateString() || 'End Date'}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Invite Button */}
            <TouchableOpacity style={styles.inviteActionButton} onPress={handleShowInviteCode}>
              <IconSymbol size={16} name="person.badge.plus" color="#000" />
              <ThemedText style={styles.inviteActionButtonText}>Invite Code</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Column Headers */}
        <View style={styles.columnHeaders}>
          <ThemedText style={[styles.columnHeaderText, { width: 50 }]}>RANK</ThemedText>
          <ThemedText style={[styles.columnHeaderText, { flex: 1 }]}>PLAYER</ThemedText>
          <ThemedText style={[styles.columnHeaderText, styles.alignRight, { width: 140 }]}>
            CURRENT RANK
          </ThemedText>
        </View>

        {/* Player Rows */}
        <View style={styles.playerList}>
          {players.map((player) => (
            <TouchableOpacity
              key={player.rank}
              style={[
                styles.playerRow,
                player.isCurrentUser && styles.currentUserRow,
                { borderLeftWidth: 4, borderLeftColor: getBorderColor(player.rank) },
              ]}
              onPress={() => handlePlayerPress(player)}
              activeOpacity={0.7}
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

              {/* Current Rank with LP/RR based on game */}
              <ThemedText style={[styles.currentRankText, styles.alignRight, { width: 140 }]}>
                {player.currentRank} ({isLeague ? `${player.lp || 0} lp` : `${player.rr || 0} rr`})
              </ThemedText>
            </TouchableOpacity>
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
  headerButton: {
    padding: 4,
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
  inviteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inviteActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
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
  currentRankText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
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
