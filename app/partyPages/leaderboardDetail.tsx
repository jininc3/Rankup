import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, Alert, RefreshControl, Modal, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, deleteDoc, onSnapshot, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { uploadPartyIcon, uploadPartyCoverPhoto } from '@/services/storageService';
import { useAuth } from '@/contexts/AuthContext';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
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
  lp?: number;
  rr?: number;
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

  if (subdivision) {
    const subdivisionKey = tier + subdivision;
    if (VALORANT_RANK_ICONS[subdivisionKey]) {
      return VALORANT_RANK_ICONS[subdivisionKey];
    }
  }

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
  const game = params.game as string;
  const isLeague = game === 'League of Legends' || game === 'League';

  const [partyData, setPartyData] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [partyDocId, setPartyDocId] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [mutuals, setMutuals] = useState<{ id: string; username: string; avatar: string }[]>([]);
  const [loadingMutuals, setLoadingMutuals] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [invitingUsers, setInvitingUsers] = useState<Set<string>>(new Set());
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar: string }[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [kickingMember, setKickingMember] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<{ id: string; username: string; avatar: string }[]>([]);
  const [showInvitePermissionModal, setShowInvitePermissionModal] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState(false);
  const [startingChallenge, setStartingChallenge] = useState(false);

  const isCreator = partyData?.createdBy === user?.id;
  const isMember = partyData?.members?.includes(user?.id);
  const invitePermission = partyData?.invitePermission || 'leader_only';
  const challengeStatus = partyData?.challengeStatus || 'active';
  const isPending = challengeStatus === 'pending';
  const isActive = challengeStatus === 'active';
  const canInvite = (isCreator || invitePermission === 'anyone') && isPending;

  // Leave party function
  const handleLeaveParty = async () => {
    if (!user?.id || !partyDocId) {
      Alert.alert('Error', 'Unable to leave leaderboard. Please try again.');
      return;
    }

    const currentMembers = partyData?.members || [];
    const hasNoMembers = !currentMembers.length || currentMembers.length === 0;

    if (hasNoMembers || (isCreator && currentMembers.length <= 1)) {
      Alert.alert(
        'Delete Leaderboard',
        'Do you want to delete this leaderboard?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const partyRef = doc(db, 'parties', partyDocId);
                await deleteDoc(partyRef);
                Alert.alert('Leaderboard Deleted', 'The leaderboard has been deleted.');
                router.replace('/(tabs)/leaderboards');
              } catch (error) {
                console.error('Error deleting leaderboard:', error);
                Alert.alert('Error', 'Failed to delete leaderboard. Please try again.');
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Leave Leaderboard',
      'Are you sure you want to leave this leaderboard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const partyRef = doc(db, 'parties', partyDocId);

              const updatedMembers = partyData.members.filter((memberId: string) => memberId !== user.id);
              const updatedMemberDetails = partyData.memberDetails.filter(
                (member: any) => member.userId !== user.id
              );

              if (updatedMembers.length === 0) {
                await deleteDoc(partyRef);
                Alert.alert('Leaderboard Deleted', 'You were the last member. The leaderboard has been deleted.');
                router.replace('/(tabs)/leaderboards');
                return;
              }

              if (isCreator) {
                const newLeader = updatedMembers[0];
                const newLeaderDetails = updatedMemberDetails[0];

                await updateDoc(partyRef, {
                  members: updatedMembers,
                  memberDetails: updatedMemberDetails,
                  createdBy: newLeader,
                });

                Alert.alert(
                  'Leadership Transferred',
                  `You have left the leaderboard. Leadership has been transferred to ${newLeaderDetails?.username || 'another member'}.`
                );
              } else {
                await updateDoc(partyRef, {
                  members: updatedMembers,
                  memberDetails: updatedMemberDetails,
                });

                Alert.alert('Success', 'You have left the leaderboard.');
              }

              router.replace('/(tabs)/leaderboards');
            } catch (error) {
              console.error('Error leaving leaderboard:', error);
              Alert.alert('Error', 'Failed to leave leaderboard. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Copy invite code to clipboard
  const handleCopyInviteCode = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  // Open invite modal and fetch mutuals
  const handleOpenInviteModal = async () => {
    setShowInviteModal(true);
    setInviteSearchQuery('');
    setLoadingMutuals(true);

    try {
      if (!user?.id) return;

      // Set pending invites from party data
      const currentPendingInvites = partyData?.pendingInvites || [];
      setPendingInvites(currentPendingInvites.map((inv: any) => ({
        id: inv.userId,
        username: inv.username,
        avatar: inv.avatar || '',
      })));

      const followingRef = collection(db, 'users', user.id, 'following');
      const followingSnapshot = await getDocs(followingRef);
      const followingIds = followingSnapshot.docs.map(doc => doc.data().followingId);

      const followersRef = collection(db, 'users', user.id, 'followers');
      const followersSnapshot = await getDocs(followersRef);
      const followerIds = followersSnapshot.docs.map(doc => doc.data().followerId);

      const mutualIds = followingIds.filter(id => followerIds.includes(id));

      const mutualUsers: { id: string; username: string; avatar: string }[] = [];
      for (const mutualId of mutualIds) {
        if (partyData?.members?.includes(mutualId)) continue;
        if (partyData?.pendingInvites?.some((inv: any) => inv.userId === mutualId)) continue;

        const userDoc = await getDoc(doc(db, 'users', mutualId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          mutualUsers.push({
            id: mutualId,
            username: userData.username || 'Unknown',
            avatar: userData.avatar || '',
          });
        }
      }

      setMutuals(mutualUsers);
    } catch (error) {
      console.error('Error fetching mutuals:', error);
    } finally {
      setLoadingMutuals(false);
    }
  };

  // Invite a user
  const handleInviteUser = async (invitee: { id: string; username: string; avatar: string }) => {
    if (!user?.id || !partyDocId) return;

    setInvitingUsers(prev => new Set(prev).add(invitee.id));

    try {
      const partyRef = doc(db, 'parties', partyDocId);

      const newPendingInvite = {
        userId: invitee.id,
        username: invitee.username,
        avatar: invitee.avatar,
        invitedAt: new Date().toISOString(),
        status: 'pending',
      };

      const currentPendingInvites = partyData?.pendingInvites || [];
      await updateDoc(partyRef, {
        pendingInvites: [...currentPendingInvites, newPendingInvite],
      });

      const notificationRef = collection(db, 'users', invitee.id, 'notifications');
      await addDoc(notificationRef, {
        type: 'party_invite',
        fromUserId: user.id,
        fromUsername: user.username || user.email?.split('@')[0] || 'Unknown',
        fromAvatar: user.avatar || '',
        partyId: id,
        partyName: partyData?.partyName || leaderboardName,
        game: game,
        read: false,
        createdAt: serverTimestamp(),
      });

      setInvitedUsers(prev => new Set(prev).add(invitee.id));
      setMutuals(prev => prev.filter(m => m.id !== invitee.id));
    } catch (error) {
      console.error('Error inviting user:', error);
      Alert.alert('Error', 'Failed to send invite');
    } finally {
      setInvitingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitee.id);
        return newSet;
      });
    }
  };

  // Search users
  const handleInviteSearch = async (query: string) => {
    setInviteSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      const results: { id: string; username: string; avatar: string }[] = [];
      usersSnapshot.docs.forEach(userDoc => {
        const userData = userDoc.data();
        const username = userData.username || '';

        if (userDoc.id === user?.id) return;
        if (partyData?.members?.includes(userDoc.id)) return;
        if (partyData?.pendingInvites?.some((inv: any) => inv.userId === userDoc.id)) return;

        if (username.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: userDoc.id,
            username: username,
            avatar: userData.avatar || '',
          });
        }
      });

      setSearchResults(results.slice(0, 20));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const displayUsers = inviteSearchQuery.trim().length >= 2 ? searchResults : mutuals;

  // Handle changing cover photo
  const handleChangeCoverPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setShowEditModal(false);
        setUploading(true);
        try {
          const coverPhotoUrl = await uploadPartyCoverPhoto(partyDocId, result.assets[0].uri);
          const partyRef = doc(db, 'parties', partyDocId);
          await updateDoc(partyRef, { coverPhoto: coverPhotoUrl });
        } catch (error) {
          console.error('Error uploading cover photo:', error);
          Alert.alert('Error', 'Failed to update cover photo');
        }
        setUploading(false);
      }
    } catch (error) {
      console.error('Error picking cover photo:', error);
      Alert.alert('Error', 'Failed to select cover photo');
    }
  };

  // Handle changing leaderboard icon
  const handleChangeLeaderboardIcon = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setShowEditModal(false);
        setUploading(true);
        try {
          const iconUrl = await uploadPartyIcon(partyDocId, result.assets[0].uri);
          const partyRef = doc(db, 'parties', partyDocId);
          await updateDoc(partyRef, { partyIcon: iconUrl });
        } catch (error) {
          console.error('Error uploading leaderboard icon:', error);
          Alert.alert('Error', 'Failed to update leaderboard icon');
        }
        setUploading(false);
      }
    } catch (error) {
      console.error('Error picking leaderboard icon:', error);
      Alert.alert('Error', 'Failed to select leaderboard icon');
    }
  };

  // Handle starting the challenge
  const handleStartChallenge = async () => {
    if (!partyDocId || !isCreator) return;

    const startChallenge = async () => {
      setStartingChallenge(true);
      try {
        const partyRef = doc(db, 'parties', partyDocId);
        const duration = partyData?.duration || 30;

        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + duration);

        const formatDateStr = (date: Date) => {
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        };

        await updateDoc(partyRef, {
          challengeStatus: 'active',
          startDate: formatDateStr(now),
          endDate: formatDateStr(end),
          pendingInvites: [],
        });
      } catch (error) {
        console.error('Error starting challenge:', error);
        Alert.alert('Error', 'Failed to start challenge');
      } finally {
        setStartingChallenge(false);
      }
    };

    const pendingCount = partyData?.pendingInvites?.length || 0;

    if (pendingCount > 0) {
      Alert.alert(
        'Pending Invites',
        `You have ${pendingCount} pending invite${pendingCount > 1 ? 's' : ''}. Starting the challenge will cancel all pending invites and no new members can join. Are you sure you want to start?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Anyway',
            style: 'destructive',
            onPress: startChallenge,
          },
        ]
      );
    } else {
      Alert.alert(
        'Start Challenge',
        'Are you sure you want to start the challenge? The timer will begin and no new members can join.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start',
            onPress: startChallenge,
          },
        ]
      );
    }
  };

  // Handle updating invite permission
  const handleUpdateInvitePermission = async (newPermission: 'leader_only' | 'anyone') => {
    if (!partyDocId) return;

    setUpdatingPermission(true);
    try {
      const partyRef = doc(db, 'parties', partyDocId);
      await updateDoc(partyRef, { invitePermission: newPermission });
      setShowInvitePermissionModal(false);
    } catch (error) {
      console.error('Error updating invite permission:', error);
      Alert.alert('Error', 'Failed to update invite permission');
    } finally {
      setUpdatingPermission(false);
    }
  };

  // Handle kicking a member
  const handleKickMember = (player: Player) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${player.username} from the leaderboard?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setKickingMember(player.userId);
            try {
              const partyRef = doc(db, 'parties', partyDocId);
              const updatedMembers = (partyData?.members || []).filter((id: string) => id !== player.userId);
              const updatedMemberDetails = (partyData?.memberDetails || []).filter(
                (m: any) => m.userId !== player.userId
              );

              await updateDoc(partyRef, {
                members: updatedMembers,
                memberDetails: updatedMemberDetails,
              });
            } catch (error) {
              console.error('Error kicking member:', error);
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setKickingMember(null);
            }
          },
        },
      ]
    );
  };

  // Set up real-time listener
  useEffect(() => {
    if (!id) return;

    let unsubscribe: (() => void) | undefined;

    const setupRealtimeListener = async () => {
      try {
        const partyRef = doc(db, 'parties', id);

        unsubscribe = onSnapshot(partyRef, async (docSnapshot) => {
          if (!docSnapshot.exists()) {
            console.log('Leaderboard document no longer exists');
            return;
          }

          const partyDoc = docSnapshot.data();
          setPartyData(partyDoc);
          setPartyDocId(id);
          setInviteCode(partyDoc.inviteCode || '');

          if (!partyDoc.memberDetails || partyDoc.memberDetails.length === 0) {
            setPlayers([]);
            setRefreshing(false);
            return;
          }

          const gameStatsPath = isLeague ? 'league' : 'valorant';

          const memberPromises = partyDoc.memberDetails.map(async (member: any, index: number) => {
            let stats: any = null;

            try {
              const userStatsDoc = await getDoc(doc(db, 'users', member.userId, 'gameStats', gameStatsPath));
              stats = userStatsDoc.data();

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
            } catch (error) {
              // Handle permission errors gracefully - use default values
              console.log(`Could not fetch stats for member ${member.userId}:`, error);
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

          fetchedPlayers.forEach((player, index) => {
            player.rank = index + 1;
          });

          setPlayers(fetchedPlayers);
          setRefreshing(false);
        }, (error) => {
          console.error('Error in real-time listener:', error);
          setRefreshing(false);
        });
      } catch (error) {
        console.error('Error setting up real-time listener:', error);
      }
    };

    setupRealtimeListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id, game, isLeague, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const leaderboardName = partyData?.partyName || params.name as string;
  const memberCount = partyData?.members?.length || Number(params.members);

  // Convert to Date helper
  const convertToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    if (dateValue instanceof Date) {
      return dateValue;
    }
    if (typeof dateValue === 'string') {
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const startDate = partyData?.startDate || params.startDate;
  const endDate = partyData?.endDate || params.endDate;

  const calculateDaysRemaining = () => {
    const start = convertToDate(startDate);
    const end = convertToDate(endDate);

    if (!start || !end) return null;

    const today = new Date();
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return { currentDay: Math.max(1, Math.min(currentDay, totalDays)), totalDays };
  };

  const daysInfo = calculateDaysRemaining();
  const progress = daysInfo ? (daysInfo.currentDay / daysInfo.totalDays) * 100 : 0;

  const getBorderColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#333';
  };

  const handlePlayerPress = (player: Player) => {
    if (player.userId === user?.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profilePages/profileView?userId=${player.userId}`);
    }
  };

  const coverPhoto = partyData?.coverPhoto;
  const leaderboardIcon = partyData?.partyIcon;
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
          {/* Header Icons */}
          <View style={styles.headerIconsRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <IconSymbol size={18} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerRightButtons}>
              {isCreator && (
                <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
                  <IconSymbol size={16} name="pencil" color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveParty}>
                <IconSymbol size={16} name="rectangle.portrait.and.arrow.right" color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Cover Photo */}
          <View style={styles.coverPhotoWrapper}>
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={styles.coverPhotoImage} />
            ) : (
              <LinearGradient
                colors={['#252525', '#1a1a1a', '#0f0f0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.coverPhotoGradient}
              />
            )}
            <LinearGradient
              colors={['rgba(15, 15, 15, 0.25)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeTop}
            />
            <LinearGradient
              colors={['transparent', '#0f0f0f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeBottom}
            />
          </View>
        </View>

        {/* Leaderboard Info Section */}
        <View style={styles.leaderboardInfoSection}>
          {/* Leaderboard Icon */}
          <View style={styles.leaderboardIconWrapper}>
            {leaderboardIcon ? (
              <Image source={{ uri: leaderboardIcon }} style={styles.leaderboardIcon} />
            ) : gameLogo ? (
              <View style={styles.leaderboardIconPlaceholder}>
                <Image source={gameLogo} style={styles.leaderboardIconGameLogo} resizeMode="contain" />
              </View>
            ) : (
              <View style={styles.leaderboardIconPlaceholder}>
                <ThemedText style={styles.leaderboardIconInitial}>{leaderboardName?.[0]?.toUpperCase()}</ThemedText>
              </View>
            )}
          </View>

          {/* Leaderboard Name */}
          <ThemedText style={styles.leaderboardName}>{leaderboardName}</ThemedText>

          {/* Game & Members */}
          <View style={styles.leaderboardMeta}>
            {gameLogo && (
              <Image source={gameLogo} style={styles.gameLogoSmall} resizeMode="contain" />
            )}
            <ThemedText style={styles.leaderboardMetaText}>{game}</ThemedText>
            <View style={styles.metaDot} />
            <ThemedText style={styles.leaderboardMetaText}>{memberCount} {memberCount === 1 ? 'Player' : 'Players'}</ThemedText>
          </View>

          {/* Challenge Status */}
          {isPending ? (
            <View style={styles.pendingSection}>
              {isCreator ? (
                <TouchableOpacity
                  style={styles.startChallengeButton}
                  onPress={handleStartChallenge}
                  disabled={startingChallenge}
                >
                  {startingChallenge ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <IconSymbol size={16} name="play.fill" color="#fff" />
                      <ThemedText style={styles.startChallengeButtonText}>Start Challenge</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.waitingBadge}>
                  <IconSymbol size={14} name="clock" color="#888" />
                  <ThemedText style={styles.waitingText}>Waiting for leader to start</ThemedText>
                </View>
              )}
              <ThemedText style={styles.durationPreview}>
                {partyData?.duration || 30} day challenge
              </ThemedText>
            </View>
          ) : daysInfo && (
            <View style={styles.durationSection}>
              <View style={styles.durationHeader}>
                <ThemedText style={styles.durationLabel}>
                  Day {daysInfo.currentDay} of {daysInfo.totalDays}
                </ThemedText>
              </View>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {canInvite && (
              <TouchableOpacity style={styles.inviteButton} onPress={handleOpenInviteModal}>
                <IconSymbol size={14} name="person.badge.plus" color="#666" />
                <ThemedText style={styles.inviteButtonText}>Invite</ThemedText>
              </TouchableOpacity>
            )}
            {inviteCode && isPending && (
              <TouchableOpacity style={styles.codeButton} onPress={handleCopyInviteCode}>
                <ThemedText style={styles.codeButtonText}>{inviteCode}</ThemedText>
                <IconSymbol size={12} name="doc.on.doc" color="#444" />
              </TouchableOpacity>
            )}
          </View>
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
              <View
                key={player.userId}
                style={[
                  styles.playerRow,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow,
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
                  <TouchableOpacity
                    style={styles.playerAvatar}
                    onPress={() => handlePlayerPress(player)}
                    activeOpacity={0.7}
                  >
                    {player.avatar && player.avatar.startsWith('http') ? (
                      <Image source={{ uri: player.avatar }} style={styles.playerAvatarImage} />
                    ) : (
                      <ThemedText style={styles.avatarText}>
                        {player.avatar || player.username[0].toUpperCase()}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                  <View style={styles.playerNameContainer}>
                    <TouchableOpacity onPress={() => handlePlayerPress(player)} activeOpacity={0.7}>
                      <ThemedText style={styles.playerName} numberOfLines={1}>
                        {player.username}
                      </ThemedText>
                    </TouchableOpacity>
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
              </View>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <ThemedText style={styles.editModalTitle}>Edit Leaderboard</ThemedText>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <IconSymbol size={20} name="xmark" color="#888" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.editModalOption} onPress={handleChangeCoverPhoto}>
              <View style={styles.editModalOptionIcon}>
                <IconSymbol size={18} name="photo" color="#888" />
              </View>
              <View style={styles.editModalOptionText}>
                <ThemedText style={styles.editModalOptionTitle}>Change Cover Photo</ThemedText>
                <ThemedText style={styles.editModalOptionSubtitle}>Update the banner image</ThemedText>
              </View>
              <IconSymbol size={16} name="chevron.right" color="#444" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.editModalOption} onPress={handleChangeLeaderboardIcon}>
              <View style={styles.editModalOptionIcon}>
                <IconSymbol size={18} name="square.and.pencil" color="#888" />
              </View>
              <View style={styles.editModalOptionText}>
                <ThemedText style={styles.editModalOptionTitle}>Change Leaderboard Icon</ThemedText>
                <ThemedText style={styles.editModalOptionSubtitle}>Update the leaderboard icon</ThemedText>
              </View>
              <IconSymbol size={16} name="chevron.right" color="#444" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editModalOption}
              onPress={() => {
                setShowEditModal(false);
                setShowInvitePermissionModal(true);
              }}
            >
              <View style={styles.editModalOptionIcon}>
                <IconSymbol size={18} name="person.badge.plus" color="#888" />
              </View>
              <View style={styles.editModalOptionText}>
                <ThemedText style={styles.editModalOptionTitle}>Invite Permissions</ThemedText>
                <ThemedText style={styles.editModalOptionSubtitle}>
                  {invitePermission === 'anyone' ? 'Anyone can invite' : 'Only leader can invite'}
                </ThemedText>
              </View>
              <IconSymbol size={16} name="chevron.right" color="#444" />
            </TouchableOpacity>

            {players.filter(p => p.userId !== user?.id).length > 0 && (
              <TouchableOpacity
                style={styles.editModalOption}
                onPress={() => {
                  setShowEditModal(false);
                  setShowManageMembersModal(true);
                }}
              >
                <View style={[styles.editModalOptionIcon, { backgroundColor: 'rgba(255,100,100,0.1)' }]}>
                  <IconSymbol size={18} name="person.badge.minus" color="#ff6b6b" />
                </View>
                <View style={styles.editModalOptionText}>
                  <ThemedText style={styles.editModalOptionTitle}>Manage Members</ThemedText>
                  <ThemedText style={styles.editModalOptionSubtitle}>Remove members from the leaderboard</ThemedText>
                </View>
                <IconSymbol size={16} name="chevron.right" color="#444" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInviteModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.inviteModalContent}
          >
            <View style={styles.inviteModalHandle} />

            <View style={styles.inviteModalHeader}>
              <ThemedText style={styles.inviteModalTitle}>Invite to Leaderboard</ThemedText>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <IconSymbol size={20} name="xmark" color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.inviteSearchContainer}>
              <IconSymbol size={16} name="magnifyingglass" color="#555" />
              <TextInput
                style={styles.inviteSearchInput}
                placeholder="Search users..."
                placeholderTextColor="#555"
                value={inviteSearchQuery}
                onChangeText={handleInviteSearch}
              />
              {inviteSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setInviteSearchQuery(''); setSearchResults([]); }}>
                  <IconSymbol size={16} name="xmark.circle.fill" color="#555" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.inviteUsersList} showsVerticalScrollIndicator={false}>
              {loadingMutuals || searchingUsers ? (
                <View style={styles.inviteLoadingContainer}>
                  <ActivityIndicator size="small" color="#c42743" />
                </View>
              ) : (
                <>
                  {/* Pending Invites Section */}
                  {inviteSearchQuery.trim().length < 2 && pendingInvites.length > 0 && (
                    <>
                      <ThemedText style={styles.inviteSectionLabel}>Pending Invites</ThemedText>
                      {pendingInvites.map((userItem) => (
                        <View key={userItem.id} style={styles.inviteUserItem}>
                          <View style={styles.inviteUserAvatar}>
                            {userItem.avatar && userItem.avatar.startsWith('http') ? (
                              <Image source={{ uri: userItem.avatar }} style={styles.inviteUserAvatarImage} />
                            ) : (
                              <ThemedText style={styles.inviteUserAvatarText}>
                                {userItem.username[0].toUpperCase()}
                              </ThemedText>
                            )}
                          </View>
                          <ThemedText style={styles.inviteUserName}>{userItem.username}</ThemedText>
                          <View style={styles.pendingBadge}>
                            <IconSymbol size={12} name="clock" color="#888" />
                            <ThemedText style={styles.pendingBadgeText}>Pending</ThemedText>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Suggestions Section */}
                  {inviteSearchQuery.trim().length < 2 && mutuals.length > 0 && (
                    <ThemedText style={[styles.inviteSectionLabel, pendingInvites.length > 0 && { marginTop: 16 }]}>Suggestions</ThemedText>
                  )}

                  {displayUsers.length === 0 && pendingInvites.length === 0 ? (
                    <View style={styles.inviteEmptyContainer}>
                      <ThemedText style={styles.inviteEmptyText}>
                        {inviteSearchQuery.trim().length >= 2
                          ? 'No users found'
                          : 'No suggestions available'
                        }
                      </ThemedText>
                    </View>
                  ) : (
                    displayUsers.map((userItem) => (
                      <View key={userItem.id} style={styles.inviteUserItem}>
                        <View style={styles.inviteUserAvatar}>
                          {userItem.avatar && userItem.avatar.startsWith('http') ? (
                            <Image source={{ uri: userItem.avatar }} style={styles.inviteUserAvatarImage} />
                          ) : (
                            <ThemedText style={styles.inviteUserAvatarText}>
                              {userItem.username[0].toUpperCase()}
                            </ThemedText>
                          )}
                        </View>
                        <ThemedText style={styles.inviteUserName}>{userItem.username}</ThemedText>
                        <TouchableOpacity
                          style={[
                            styles.inviteSendButton,
                            invitedUsers.has(userItem.id) && styles.inviteSendButtonSent
                          ]}
                          onPress={() => handleInviteUser(userItem)}
                          disabled={invitingUsers.has(userItem.id) || invitedUsers.has(userItem.id)}
                        >
                          {invitingUsers.has(userItem.id) ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : invitedUsers.has(userItem.id) ? (
                            <IconSymbol size={14} name="checkmark" color="#fff" />
                          ) : (
                            <ThemedText style={styles.inviteSendButtonText}>Invite</ThemedText>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Manage Members Modal */}
      <Modal
        visible={showManageMembersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManageMembersModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowManageMembersModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.manageMembersModalContent}
          >
            <View style={styles.inviteModalHandle} />

            <View style={styles.inviteModalHeader}>
              <ThemedText style={styles.inviteModalTitle}>Manage Members</ThemedText>
              <TouchableOpacity onPress={() => setShowManageMembersModal(false)}>
                <IconSymbol size={20} name="xmark" color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.manageMembersList} showsVerticalScrollIndicator={false}>
              {players
                .filter(player => player.userId !== user?.id)
                .map((player) => (
                  <View key={player.userId} style={styles.manageMemberItem}>
                    <View style={styles.manageMemberAvatar}>
                      {player.avatar && player.avatar.startsWith('http') ? (
                        <Image source={{ uri: player.avatar }} style={styles.manageMemberAvatarImage} />
                      ) : (
                        <ThemedText style={styles.manageMemberAvatarText}>
                          {player.username[0].toUpperCase()}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.manageMemberInfo}>
                      <ThemedText style={styles.manageMemberName}>{player.username}</ThemedText>
                      <ThemedText style={styles.manageMemberRank}>
                        Rank #{player.rank} • {player.currentRank}
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleKickMember(player)}
                      disabled={kickingMember === player.userId}
                    >
                      {kickingMember === player.userId ? (
                        <ActivityIndicator size="small" color="#ff6b6b" />
                      ) : (
                        <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}

              {players.filter(p => p.userId !== user?.id).length === 0 && (
                <View style={styles.inviteEmptyContainer}>
                  <ThemedText style={styles.inviteEmptyText}>No other members in this leaderboard</ThemedText>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Invite Permission Modal */}
      <Modal
        visible={showInvitePermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInvitePermissionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInvitePermissionModal(false)}
        >
          <View style={styles.permissionModalContent}>
            <View style={styles.editModalHeader}>
              <ThemedText style={styles.editModalTitle}>Invite Permissions</ThemedText>
              <TouchableOpacity onPress={() => setShowInvitePermissionModal(false)}>
                <IconSymbol size={20} name="xmark" color="#888" />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.permissionDescription}>
              Choose who can invite new members to this leaderboard
            </ThemedText>

            <TouchableOpacity
              style={[
                styles.permissionOption,
                invitePermission === 'leader_only' && styles.permissionOptionActive
              ]}
              onPress={() => handleUpdateInvitePermission('leader_only')}
              disabled={updatingPermission}
            >
              <View style={styles.permissionOptionLeft}>
                <View style={[
                  styles.permissionOptionIcon,
                  invitePermission === 'leader_only' && styles.permissionOptionIconActive
                ]}>
                  <IconSymbol size={12} name="crown.fill" color={invitePermission === 'leader_only' ? '#fff' : '#666'} />
                </View>
                <ThemedText style={[
                  styles.permissionOptionTitle,
                  invitePermission === 'leader_only' && styles.permissionOptionTitleActive
                ]}>Leader Only</ThemedText>
              </View>
              {invitePermission === 'leader_only' && (
                <IconSymbol size={14} name="checkmark.circle.fill" color="#c42743" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.permissionOption,
                invitePermission === 'anyone' && styles.permissionOptionActive
              ]}
              onPress={() => handleUpdateInvitePermission('anyone')}
              disabled={updatingPermission}
            >
              <View style={styles.permissionOptionLeft}>
                <View style={[
                  styles.permissionOptionIcon,
                  invitePermission === 'anyone' && styles.permissionOptionIconActive
                ]}>
                  <IconSymbol size={12} name="person.2.fill" color={invitePermission === 'anyone' ? '#fff' : '#666'} />
                </View>
                <ThemedText style={[
                  styles.permissionOptionTitle,
                  invitePermission === 'anyone' && styles.permissionOptionTitleActive
                ]}>Anyone</ThemedText>
              </View>
              {invitePermission === 'anyone' && (
                <IconSymbol size={14} name="checkmark.circle.fill" color="#c42743" />
              )}
            </TouchableOpacity>

            {updatingPermission && (
              <View style={styles.permissionUpdating}>
                <ActivityIndicator size="small" color="#c42743" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Uploading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContent}>
            <ActivityIndicator size="large" color="#c42743" />
            <ThemedText style={styles.uploadingText}>Uploading...</ThemedText>
          </View>
        </View>
      )}
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoWrapper: {
    width: '100%',
    height: 180,
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
    height: 50,
    zIndex: 1,
  },
  coverPhotoFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 1,
  },
  // Leaderboard Info Section
  leaderboardInfoSection: {
    alignItems: 'center',
    marginTop: -44,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  leaderboardIconWrapper: {
    marginBottom: 14,
  },
  leaderboardIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#0f0f0f',
  },
  leaderboardIconPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    borderWidth: 4,
    borderColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardIconGameLogo: {
    width: 40,
    height: 40,
    opacity: 0.8,
  },
  leaderboardIconInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
  },
  leaderboardName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  leaderboardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  gameLogoSmall: {
    width: 16,
    height: 16,
    opacity: 0.6,
  },
  leaderboardMetaText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#333',
  },
  // Pending Section
  pendingSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  startChallengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c42743',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 180,
  },
  startChallengeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#252525',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  waitingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  durationPreview: {
    fontSize: 12,
    color: '#555',
  },
  // Duration Section
  durationSection: {
    width: '100%',
    marginBottom: 14,
  },
  durationHeader: {
    marginBottom: 8,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#c42743',
    borderRadius: 2,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  codeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 1.5,
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
  bottomSpacer: {
    height: 40,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  editModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    gap: 14,
  },
  editModalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalOptionText: {
    flex: 1,
  },
  editModalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  editModalOptionSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  // Invite Modal
  inviteModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    paddingBottom: 20,
  },
  inviteModalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  inviteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  inviteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  inviteSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
  },
  inviteSearchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  inviteSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  inviteUsersList: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  inviteLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  inviteEmptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  inviteEmptyText: {
    fontSize: 14,
    color: '#555',
  },
  inviteUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  inviteUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inviteUserAvatarImage: {
    width: '100%',
    height: '100%',
  },
  inviteUserAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  inviteUserName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  inviteSendButton: {
    backgroundColor: '#c42743',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  inviteSendButtonSent: {
    backgroundColor: '#333',
  },
  inviteSendButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#252525',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
  },
  // Uploading Overlay
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  uploadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  // Manage Members Modal
  manageMembersModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: 40,
  },
  manageMembersList: {
    paddingHorizontal: 20,
  },
  manageMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
    gap: 12,
  },
  manageMemberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  manageMemberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  manageMemberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  manageMemberInfo: {
    flex: 1,
  },
  manageMemberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  manageMemberRank: {
    fontSize: 12,
    color: '#555',
  },
  removeButton: {
    backgroundColor: 'rgba(255,100,100,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  // Permission Modal
  permissionModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    height: '60%',
  },
  permissionDescription: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 2,
    backgroundColor: '#252525',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  permissionOptionActive: {
    backgroundColor: '#1f1518',
    borderColor: '#c42743',
  },
  permissionOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionOptionIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionOptionIconActive: {
    backgroundColor: '#c42743',
  },
  permissionOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  permissionOptionTitleActive: {
    color: '#fff',
  },
  permissionOptionSubtitle: {
    fontSize: 10,
    color: '#555',
  },
  permissionUpdating: {
    paddingVertical: 10,
    alignItems: 'center',
  },
});
