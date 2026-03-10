import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

// League of Legends rank icon mapping
const LEAGUE_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/leagueranks/iron.png'),
  bronze: require('@/assets/images/leagueranks/bronze.png'),
  silver: require('@/assets/images/leagueranks/silver.png'),
  gold: require('@/assets/images/leagueranks/gold.png'),
  platinum: require('@/assets/images/leagueranks/platinum.png'),
  emerald: require('@/assets/images/leagueranks/emerald.png'),
  diamond: require('@/assets/images/leagueranks/diamond.png'),
  master: require('@/assets/images/leagueranks/masters.png'),
  grandmaster: require('@/assets/images/leagueranks/grandmaster.png'),
  challenger: require('@/assets/images/leagueranks/challenger.png'),
  unranked: require('@/assets/images/leagueranks/unranked.png'),
};

// Valorant rank icon mapping
const VALORANT_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/valorantranks/iron.png'),
  bronze: require('@/assets/images/valorantranks/bronze.png'),
  silver: require('@/assets/images/valorantranks/silver.png'),
  gold: require('@/assets/images/valorantranks/gold.png'),
  platinum: require('@/assets/images/valorantranks/platinum.png'),
  diamond: require('@/assets/images/valorantranks/diamond.png'),
  ascendant: require('@/assets/images/valorantranks/ascendant.png'),
  immortal: require('@/assets/images/valorantranks/immortal.png'),
  radiant: require('@/assets/images/valorantranks/radiant.png'),
  unranked: require('@/assets/images/valorantranks/unranked.png'),
  iron1: require('@/assets/images/valorantranks/iron1.png'),
  iron2: require('@/assets/images/valorantranks/iron2.png'),
  iron3: require('@/assets/images/valorantranks/iron3.png'),
  bronze1: require('@/assets/images/valorantranks/bronze1.png'),
  bronze2: require('@/assets/images/valorantranks/bronze2.png'),
  bronze3: require('@/assets/images/valorantranks/bronze3.png'),
  silver1: require('@/assets/images/valorantranks/silver1.png'),
  silver2: require('@/assets/images/valorantranks/silver2.png'),
  silver3: require('@/assets/images/valorantranks/silver3.png'),
  gold1: require('@/assets/images/valorantranks/gold1.png'),
  gold2: require('@/assets/images/valorantranks/gold2.png'),
  gold3: require('@/assets/images/valorantranks/gold3.png'),
  platinum1: require('@/assets/images/valorantranks/platinum1.png'),
  platinum2: require('@/assets/images/valorantranks/platinum2.png'),
  platinum3: require('@/assets/images/valorantranks/platinum3.png'),
  diamond1: require('@/assets/images/valorantranks/diamond1.png'),
  diamond2: require('@/assets/images/valorantranks/diamond2.png'),
  diamond3: require('@/assets/images/valorantranks/diamond3.png'),
  ascendant1: require('@/assets/images/valorantranks/ascendant1.png'),
  ascendant2: require('@/assets/images/valorantranks/ascendant2.png'),
  ascendant3: require('@/assets/images/valorantranks/ascendant3.png'),
  immortal1: require('@/assets/images/valorantranks/immortal1.png'),
  immortal2: require('@/assets/images/valorantranks/immortal2.png'),
  immortal3: require('@/assets/images/valorantranks/immortal3.png'),
};

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

// Helper function to get League rank icon
const getLeagueRankIcon = (rank: string) => {
  if (!rank || rank === 'Unranked') {
    return LEAGUE_RANK_ICONS.unranked;
  }
  const tier = rank.split(' ')[0].toLowerCase();
  return LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked;
};

// Helper function to get Valorant rank icon
const getValorantRankIcon = (rank: string) => {
  if (!rank || rank === 'Unranked') {
    return VALORANT_RANK_ICONS.unranked;
  }

  const parts = rank.split(' ');
  const tier = parts[0].toLowerCase();
  const subdivision = parts[1];

  // Try to get subdivision rank first (e.g., "gold3")
  if (subdivision) {
    const subdivisionKey = tier + subdivision;
    if (VALORANT_RANK_ICONS[subdivisionKey]) {
      return VALORANT_RANK_ICONS[subdivisionKey];
    }
  }

  // Fallback to base tier or radiant
  return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
};

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

  const id = params.id as string;
  const game = params.game as string; // "Valorant" or "League of Legends"
  const isLeague = game === 'League of Legends';

  const [partyData, setPartyData] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [partyDocId, setPartyDocId] = useState<string>('');

  const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

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
                router.replace('/(tabs)/parties');
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

              router.replace('/(tabs)/parties');
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

  // Fetch party data from Firestore
  const fetchPartyDataFromFirestore = async () => {
    console.log(`${game} Detail - Fetching from Firestore for party:`, id);

    if (!id) {
      console.log('No id provided');
      return null;
    }

    try {
      // Get party document directly by ID
      const partyRef = doc(db, 'parties', id);
      const partySnapshot = await getDoc(partyRef);

      if (!partySnapshot.exists()) {
        console.log('Party not found for ID:', id);
        return null;
      }

      const partyDoc = partySnapshot.data();
      const partyDocumentId = partySnapshot.id;
      console.log('Party found:', partyDoc.partyName);

      setPartyData(partyDoc);
      setPartyDocId(partyDocumentId);
      setInviteCode(partyDoc.inviteCode || '');

      // Check if memberDetails exists
      if (!partyDoc.memberDetails || partyDoc.memberDetails.length === 0) {
        console.log('No member details found in party');
        return { partyDoc, players: [] };
      }

      // Determine which subcollection and stats to fetch based on game
      const gameStatsPath = isLeague ? 'league' : 'valorant';

      // Fetch rank data for each member
      const memberPromises = partyDoc.memberDetails.map(async (member: any, index: number) => {
        // Try to get from gameStats subcollection first
        const userStatsDoc = await getDoc(doc(db, 'users', member.userId, 'gameStats', gameStatsPath));
        let stats = userStatsDoc.data();

        // Fallback: If gameStats doesn't exist, read from main stats
        if (!stats || !stats.currentRank) {
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

      setPlayers(fetchedPlayers);

      // Cache the data
      const cacheData = {
        partyDoc,
        players: fetchedPlayers,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`party_${id}`, JSON.stringify(cacheData));

      return { partyDoc, players: fetchedPlayers };
    } catch (error) {
      console.error('Error fetching party data:', error);
      return null;
    }
  };

  // Load party data (from cache or Firestore)
  const loadPartyData = async (forceRefresh = false) => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = await AsyncStorage.getItem(`party_${id}`);
        if (cachedData) {
          const { partyDoc, players: cachedPlayers, timestamp } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;

          // Use cache if less than 3 hours old
          if (age < CACHE_DURATION) {
            console.log('Using cached party data (age:', Math.floor(age / 1000 / 60), 'minutes)');
            setPartyData(partyDoc);
            setPartyDocId(partyDoc.partyId);
            setInviteCode(partyDoc.inviteCode || '');
            setPlayers(cachedPlayers);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch fresh data from Firestore
      console.log('Cache miss or expired - fetching fresh data');
      await fetchPartyDataFromFirestore();
    } catch (error) {
      console.error('Error loading party data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Set up real-time listener for party updates
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupRealtimeListener = async () => {
      try {
        // Get party document directly by ID
        const partyRef = doc(db, 'parties', id);

        // Set up real-time listener
        unsubscribe = onSnapshot(partyRef, async (docSnapshot) => {
          if (!docSnapshot.exists()) {
            console.log('Party document no longer exists');
            setLoading(false);
            return;
          }

          const partyDoc = docSnapshot.data();
          console.log('Party data updated in real-time:', partyDoc.partyName);

          setPartyData(partyDoc);
          setPartyDocId(id);
          setInviteCode(partyDoc.inviteCode || '');

          // Check if memberDetails exists
          if (!partyDoc.memberDetails || partyDoc.memberDetails.length === 0) {
            console.log('No member details found in party');
            setPlayers([]);
            setLoading(false);
            return;
          }

          // Determine which subcollection and stats to fetch based on game
          const gameStatsPath = isLeague ? 'league' : 'valorant';

          // Fetch rank data for each member
          const memberPromises = partyDoc.memberDetails.map(async (member: any, index: number) => {
            // Try to get from gameStats subcollection first
            const userStatsDoc = await getDoc(doc(db, 'users', member.userId, 'gameStats', gameStatsPath));
            let stats = userStatsDoc.data();

            // Fallback: If gameStats doesn't exist, read from main stats
            if (!stats || !stats.currentRank) {
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

          setPlayers(fetchedPlayers);
          setLoading(false);
          setRefreshing(false);
        }, (error) => {
          console.error('Error in real-time listener:', error);
          setLoading(false);
          setRefreshing(false);
        });
      } catch (error) {
        console.error('Error setting up real-time listener:', error);
        setLoading(false);
      }
    };

    setupRealtimeListener();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id, game, isLeague, user?.id]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
    // This just provides user feedback that a refresh was triggered
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

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

  const coverPhoto = partyData?.coverPhoto;
  const gameLogo = GAME_LOGOS[game];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c42743" />
        }
      >
        {/* Cover Photo Section */}
        <View style={styles.coverPhotoSection}>
          {/* Header Icons - Overlaid on cover */}
          <View style={styles.headerIconsRow}>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => router.replace('/(tabs)/parties')}>
              <IconSymbol size={20} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleLeaveParty}>
              <IconSymbol size={20} name="rectangle.portrait.and.arrow.right" color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Cover Photo Area */}
          <View style={styles.coverPhotoWrapper}>
            {coverPhoto ? (
              <Image
                source={{ uri: coverPhoto }}
                style={styles.coverPhotoImage}
              />
            ) : (
              <LinearGradient
                colors={['#2c2f33', '#1a1a1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.coverPhotoGradient}
              />
            )}
            {/* Top fade */}
            <LinearGradient
              colors={['rgba(15, 15, 15, 0.7)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeTop}
            />
            {/* Bottom fade */}
            <LinearGradient
              colors={['transparent', 'rgba(15, 15, 15, 0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeBottom}
            />

            {/* Party Info Overlay */}
            <View style={styles.partyInfoOverlay}>
              {gameLogo && (
                <Image source={gameLogo} style={styles.gameLogoSmall} resizeMode="contain" />
              )}
              <ThemedText style={styles.partyNameLarge}>{leaderboardName}</ThemedText>
              <ThemedText style={styles.partySubtitle}>{game} • {members} Players</ThemedText>
            </View>
          </View>
        </View>

        {/* Duration Section */}
        {daysInfo && (
          <View style={styles.durationSection}>
            <ThemedText style={styles.durationLabel}>
              DAY {daysInfo.currentDay}/{daysInfo.totalDays}
            </ThemedText>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
            {startDate && endDate && daysInfo && (
              <View style={styles.dateRangeContainer}>
                <ThemedText style={styles.dateText}>
                  Day 1
                </ThemedText>
                <ThemedText style={styles.dateText}>
                  Day {daysInfo.totalDays}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Invite Section */}
        <View style={styles.inviteSection}>
          <TouchableOpacity style={styles.inviteButton} onPress={handleShowInviteCode}>
            <IconSymbol size={16} name="person.badge.plus" color="rgba(255, 255, 255, 0.6)" />
            <ThemedText style={styles.inviteButtonText}>Invite Friends</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Column Headers */}
        <View style={styles.columnHeaders}>
          <ThemedText style={[styles.columnHeaderText, { width: 40 }]}>RANK</ThemedText>
          <ThemedText style={[styles.columnHeaderText, { flex: 1, paddingLeft: 40 }]}>PLAYER</ThemedText>
          <ThemedText style={[styles.columnHeaderText, styles.alignRight, { width: 120 }]}>
            CURRENT RANK
          </ThemedText>
        </View>

        {/* Player Rows */}
        <View style={styles.playerList}>
          {players.map((player, index) => {
            const rankIcon = isLeague
              ? getLeagueRankIcon(player.currentRank)
              : getValorantRankIcon(player.currentRank);

            return (
              <TouchableOpacity
                key={player.rank}
                style={[
                  styles.playerRow,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow,
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
                  <View style={styles.playerNameContainer}>
                    <ThemedText style={styles.playerName} numberOfLines={1}>
                      {player.username}
                    </ThemedText>
                    {player.userId === partyData?.createdBy && (
                      <View style={styles.leaderBadge}>
                        <IconSymbol size={10} name="crown.fill" color="#FFD700" />
                        <ThemedText style={styles.leaderBadgeText}>Leader</ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                {/* Current Rank with Icon and LP/RR based on game */}
                <View style={styles.rankInfoContainer}>
                  <Image source={rankIcon} style={styles.rankIconSmall} resizeMode="contain" />
                  <View style={styles.rankTextContainer}>
                    <ThemedText style={styles.currentRankText}>
                      {player.currentRank}
                    </ThemedText>
                    <ThemedText style={styles.rankPointsText}>
                      {isLeague ? `${player.lp || 0} lp` : `${player.rr || 0} rr`}
                    </ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scrollView: {
    flex: 1,
  },
  // Cover Photo Section
  coverPhotoSection: {
    position: 'relative',
  },
  headerIconsRow: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoWrapper: {
    width: '100%',
    height: 220,
    backgroundColor: '#1a1a1a',
  },
  coverPhotoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  coverPhotoGradient: {
    width: '100%',
    height: '100%',
  },
  coverPhotoFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  coverPhotoFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  partyInfoOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 2,
  },
  gameLogoSmall: {
    width: 28,
    height: 28,
    marginBottom: 8,
    opacity: 0.9,
  },
  partyNameLarge: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  partySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  durationSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
    position: 'relative',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
  inviteSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 0,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  columnHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  alignRight: {
    textAlign: 'right',
  },
  playerList: {
    paddingHorizontal: 0,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    position: 'relative',
    borderLeftWidth: 3,
  },
  evenRow: {
    backgroundColor: '#141414',
  },
  oddRow: {
    backgroundColor: '#1a1a1a',
  },
  currentUserRow: {
    backgroundColor: '#252525',
  },
  rankContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
    backgroundColor: '#252525',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  avatarText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#888',
  },
  playerNameContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  leaderBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700',
  },
  rankInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 120,
    justifyContent: 'flex-end',
  },
  rankIconSmall: {
    width: 26,
    height: 26,
  },
  rankTextContainer: {
    alignItems: 'flex-end',
  },
  currentRankText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 14,
  },
  rankPointsText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
    lineHeight: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  bottomSpacer: {
    height: 20,
  },
});
