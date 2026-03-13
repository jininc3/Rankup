import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, Alert, RefreshControl, Dimensions, Modal, ActivityIndicator, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadPartyIcon, uploadPartyCoverPhoto } from '@/services/storageService';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit, updateDoc, deleteDoc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant-red.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
  'League': require('@/assets/images/lol-icon.png'),
  'Apex Legends': require('@/assets/images/apex.png'),
};

interface Member {
  userId: string;
  username: string;
  avatar: string;
  joinedAt: string;
  isCurrentUser?: boolean;
}

export default function PartyDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const partyIdParam = params.partyId as string;
  const game = params.game as string;

  const [partyData, setPartyData] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
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
  const [showInvitePermissionModal, setShowInvitePermissionModal] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState(false);

  const isCreator = partyData?.createdBy === user?.id;
  const isMember = partyData?.members?.includes(user?.id);
  const invitePermission = partyData?.invitePermission || 'leader_only';
  const canInvite = isCreator || invitePermission === 'anyone';

  // Leave party function
  const handleLeaveParty = async () => {
    if (!user?.id || !partyDocId) {
      Alert.alert('Error', 'Unable to leave party. Please try again.');
      return;
    }

    // Check if user is the creator - show delete option
    const isCreator = partyData?.createdBy === user.id;
    const currentMembers = partyData?.members || [];
    const hasNoMembers = !currentMembers.length || currentMembers.length === 0;

    // If no members or user is creator of empty party, offer to delete
    if (hasNoMembers || (isCreator && currentMembers.length <= 1)) {
      Alert.alert(
        'Delete Party',
        'Do you want to delete this party?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const partyRef = doc(db, 'parties', partyDocId);
                await deleteDoc(partyRef);
                Alert.alert('Party Deleted', 'The party has been deleted.');
                router.replace('/(tabs)/parties');
              } catch (error) {
                console.error('Error deleting party:', error);
                Alert.alert('Error', 'Failed to delete party. Please try again.');
              }
            },
          },
        ]
      );
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
              const updatedMembers = (partyData?.members || []).filter((id: string) => id !== user.id);
              const updatedMemberDetails = (partyData?.memberDetails || []).filter(
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
                  `You have left the party. Leadership has been transferred to ${newLeaderDetails?.username || 'another member'}.`
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

  // Open invite modal and fetch mutuals
  const handleOpenInviteModal = async () => {
    setShowInviteModal(true);
    setInviteSearchQuery('');
    setLoadingMutuals(true);

    try {
      if (!user?.id) return;

      // Get users the current user is following
      const followingRef = collection(db, 'users', user.id, 'following');
      const followingSnapshot = await getDocs(followingRef);
      const followingIds = followingSnapshot.docs.map(doc => doc.data().followingId);

      // Get users who are following the current user
      const followersRef = collection(db, 'users', user.id, 'followers');
      const followersSnapshot = await getDocs(followersRef);
      const followerIds = followersSnapshot.docs.map(doc => doc.data().followerId);

      // Find mutuals (intersection of following and followers)
      const mutualIds = followingIds.filter(id => followerIds.includes(id));

      // Fetch user details for mutuals
      const mutualUsers: { id: string; username: string; avatar: string }[] = [];
      for (const mutualId of mutualIds) {
        // Skip if already a member or has pending invite
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

  // Copy invite code to clipboard
  const handleCopyInviteCode = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  // Invite a user to the party
  const handleInviteUser = async (invitee: { id: string; username: string; avatar: string }) => {
    if (!user?.id || !partyDocId) return;

    setInvitingUsers(prev => new Set(prev).add(invitee.id));

    try {
      const partyRef = doc(db, 'parties', partyDocId);

      // Add to pending invites
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

      // Send notification to the invited user
      const notificationRef = collection(db, 'users', invitee.id, 'notifications');
      await addDoc(notificationRef, {
        type: 'party_invite',
        fromUserId: user.id,
        fromUsername: user.username || user.email?.split('@')[0] || 'Unknown',
        fromAvatar: user.avatar || '',
        partyId: partyIdParam,
        partyName: partyData?.partyName || partyName,
        game: game,
        read: false,
        createdAt: serverTimestamp(),
      });

      setInvitedUsers(prev => new Set(prev).add(invitee.id));
      // Remove from mutuals list
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

  // Search users when query changes
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

        // Skip current user, existing members, and pending invites
        if (userDoc.id === user?.id) return;
        if (partyData?.members?.includes(userDoc.id)) return;
        if (partyData?.pendingInvites?.some((inv: any) => inv.userId === userDoc.id)) return;

        // Check if username matches search query
        if (username.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: userDoc.id,
            username: username,
            avatar: userData.avatar || '',
          });
        }
      });

      setSearchResults(results.slice(0, 20)); // Limit to 20 results
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Get display list - search results if searching, otherwise mutuals
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

  // Handle changing party icon
  const handleChangePartyIcon = async () => {
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
          const partyIconUrl = await uploadPartyIcon(partyDocId, result.assets[0].uri);
          const partyRef = doc(db, 'parties', partyDocId);
          await updateDoc(partyRef, { partyIcon: partyIconUrl });
        } catch (error) {
          console.error('Error uploading party icon:', error);
          Alert.alert('Error', 'Failed to update party icon');
        }
        setUploading(false);
      }
    } catch (error) {
      console.error('Error picking party icon:', error);
      Alert.alert('Error', 'Failed to select party icon');
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
  const handleKickMember = (member: Member, fromModal: boolean = false) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.username} from the party?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (fromModal) setKickingMember(member.userId);
            try {
              const partyRef = doc(db, 'parties', partyDocId);
              const updatedMembers = (partyData?.members || []).filter((id: string) => id !== member.userId);
              const updatedMemberDetails = (partyData?.memberDetails || []).filter(
                (m: any) => m.userId !== member.userId
              );

              await updateDoc(partyRef, {
                members: updatedMembers,
                memberDetails: updatedMemberDetails,
              });
            } catch (error) {
              console.error('Error kicking member:', error);
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              if (fromModal) setKickingMember(null);
            }
          },
        },
      ]
    );
  };

  // Set up real-time listener for party updates
  useEffect(() => {
    if (!partyIdParam) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupRealtimeListener = async () => {
      try {
        // Query for party by partyId field
        const partiesRef = collection(db, 'parties');
        const partyQuery = query(partiesRef, where('partyId', '==', partyIdParam), limit(1));
        let partySnapshot = await getDocs(partyQuery);

        let partyDocumentId: string;

        if (partySnapshot.empty) {
          // Fallback: try to get the document directly by ID
          const directDocRef = doc(db, 'parties', partyIdParam);
          const directDocSnap = await getDoc(directDocRef);

          if (!directDocSnap.exists()) {
            console.log('Party not found for ID:', partyIdParam);
            return;
          }

          partyDocumentId = directDocSnap.id;
        } else {
          partyDocumentId = partySnapshot.docs[0].id;
        }
        const partyRef = doc(db, 'parties', partyDocumentId);

        // Set up real-time listener
        unsubscribe = onSnapshot(partyRef, async (docSnapshot) => {
          if (!docSnapshot.exists()) {
            console.log('Party document no longer exists');
            return;
          }

          const partyDoc = docSnapshot.data();
          setPartyData(partyDoc);
          setPartyDocId(partyDocumentId);
          setInviteCode(partyDoc.inviteCode || '');

          // Map member details
          if (partyDoc.memberDetails && partyDoc.memberDetails.length > 0) {
            const membersList = partyDoc.memberDetails.map((member: any) => ({
              userId: member.userId,
              username: member.username,
              avatar: member.avatar,
              joinedAt: member.joinedAt,
              isCurrentUser: member.userId === user?.id,
            }));
            setMembers(membersList);
          } else {
            setMembers([]);
          }

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

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [partyIdParam, user?.id]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const partyName = partyData?.partyName || params.name as string;
  const memberCount = members.length;

  // Navigate to member's profile
  const handleMemberPress = (member: Member) => {
    if (member.userId === user?.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/profilePages/profileView?userId=${member.userId}`);
    }
  };

  const coverPhoto = partyData?.coverPhoto;
  const partyIcon = partyData?.partyIcon;
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

          {/* Cover Photo Area */}
          <View style={styles.coverPhotoWrapper}>
            {coverPhoto ? (
              <Image
                source={{ uri: coverPhoto }}
                style={styles.coverPhotoImage}
              />
            ) : (
              <LinearGradient
                colors={['#252525', '#1a1a1a', '#0f0f0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.coverPhotoGradient}
              />
            )}
            {/* Top fade */}
            <LinearGradient
              colors={['rgba(15, 15, 15, 0.25)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeTop}
            />
            {/* Bottom fade */}
            <LinearGradient
              colors={['transparent', '#0f0f0f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.coverPhotoFadeBottom}
            />
          </View>
        </View>

        {/* Party Info Section */}
        <View style={styles.partyInfoSection}>
          {/* Party Icon */}
          <View style={styles.partyIconWrapper}>
            {partyIcon ? (
              <Image source={{ uri: partyIcon }} style={styles.partyIcon} />
            ) : gameLogo ? (
              <View style={styles.partyIconPlaceholder}>
                <Image source={gameLogo} style={styles.partyIconGameLogo} resizeMode="contain" />
              </View>
            ) : (
              <View style={styles.partyIconPlaceholder}>
                <ThemedText style={styles.partyIconInitial}>{partyName?.[0]?.toUpperCase()}</ThemedText>
              </View>
            )}
          </View>

          {/* Party Name */}
          <ThemedText style={styles.partyName}>{partyName}</ThemedText>

          {/* Game & Members */}
          <View style={styles.partyMeta}>
            {gameLogo && (
              <Image source={gameLogo} style={styles.gameLogoSmall} resizeMode="contain" />
            )}
            <ThemedText style={styles.partyMetaText}>{game}</ThemedText>
            <View style={styles.metaDot} />
            <ThemedText style={styles.partyMetaText}>{memberCount} {memberCount === 1 ? 'Member' : 'Members'}</ThemedText>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {canInvite && (
              <TouchableOpacity style={styles.inviteButton} onPress={handleOpenInviteModal}>
                <IconSymbol size={14} name="person.badge.plus" color="#666" />
                <ThemedText style={styles.inviteButtonText}>Invite</ThemedText>
              </TouchableOpacity>
            )}
            {inviteCode && (
              <TouchableOpacity style={styles.codeButton} onPress={handleCopyInviteCode}>
                <ThemedText style={styles.codeButtonText}>{inviteCode}</ThemedText>
                <IconSymbol size={12} name="doc.on.doc" color="#444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <ThemedText style={styles.sectionTitle}>MEMBERS</ThemedText>

          <View style={styles.membersList}>
            {members.map((member) => (
              <View key={member.userId} style={styles.memberCard}>
                {/* Member Avatar - Clickable */}
                <TouchableOpacity
                  style={styles.memberAvatar}
                  onPress={() => handleMemberPress(member)}
                  activeOpacity={0.7}
                >
                  {member.avatar && member.avatar.startsWith('http') ? (
                    <Image source={{ uri: member.avatar }} style={styles.memberAvatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarText}>
                      {member.username[0].toUpperCase()}
                    </ThemedText>
                  )}
                </TouchableOpacity>

                {/* Member Info */}
                <View style={styles.memberInfo}>
                  <TouchableOpacity onPress={() => handleMemberPress(member)} activeOpacity={0.7}>
                    <ThemedText style={[styles.memberName, member.isCurrentUser && styles.memberNameYou]}>
                      {member.username}
                    </ThemedText>
                  </TouchableOpacity>
                  {partyData?.createdBy === member.userId && (
                    <View style={styles.leaderBadge}>
                      <IconSymbol size={9} name="crown.fill" color="#555" />
                      <ThemedText style={styles.leaderBadgeText}>Leader</ThemedText>
                    </View>
                  )}
                </View>

              </View>
            ))}
          </View>
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
              <ThemedText style={styles.editModalTitle}>Edit Party</ThemedText>
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

            <TouchableOpacity style={styles.editModalOption} onPress={handleChangePartyIcon}>
              <View style={styles.editModalOptionIcon}>
                <IconSymbol size={18} name="square.and.pencil" color="#888" />
              </View>
              <View style={styles.editModalOptionText}>
                <ThemedText style={styles.editModalOptionTitle}>Change Party Icon</ThemedText>
                <ThemedText style={styles.editModalOptionSubtitle}>Update the party icon</ThemedText>
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

            {members.filter(m => m.userId !== user?.id).length > 0 && (
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
                  <ThemedText style={styles.editModalOptionSubtitle}>Remove members from the party</ThemedText>
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
              <ThemedText style={styles.inviteModalTitle}>Invite to Party</ThemedText>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <IconSymbol size={20} name="xmark" color="#888" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
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

            {/* Section Label */}
            {inviteSearchQuery.trim().length < 2 && mutuals.length > 0 && (
              <ThemedText style={styles.inviteSectionLabel}>Suggestions</ThemedText>
            )}

            {/* Users List */}
            <ScrollView style={styles.inviteUsersList} showsVerticalScrollIndicator={false}>
              {loadingMutuals || searchingUsers ? (
                <View style={styles.inviteLoadingContainer}>
                  <ActivityIndicator size="small" color="#c42743" />
                </View>
              ) : displayUsers.length === 0 ? (
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
              {members
                .filter(member => member.userId !== user?.id)
                .map((member) => (
                  <View key={member.userId} style={styles.manageMemberItem}>
                    <View style={styles.manageMemberAvatar}>
                      {member.avatar && member.avatar.startsWith('http') ? (
                        <Image source={{ uri: member.avatar }} style={styles.manageMemberAvatarImage} />
                      ) : (
                        <ThemedText style={styles.manageMemberAvatarText}>
                          {member.username[0].toUpperCase()}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.manageMemberInfo}>
                      <ThemedText style={styles.manageMemberName}>{member.username}</ThemedText>
                      <ThemedText style={styles.manageMemberJoined}>
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </ThemedText>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleKickMember(member, true)}
                      disabled={kickingMember === member.userId}
                    >
                      {kickingMember === member.userId ? (
                        <ActivityIndicator size="small" color="#ff6b6b" />
                      ) : (
                        <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}

              {members.filter(m => m.userId !== user?.id).length === 0 && (
                <View style={styles.inviteEmptyContainer}>
                  <ThemedText style={styles.inviteEmptyText}>No other members in this party</ThemedText>
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
              Choose who can invite new members to this party
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
  // Party Info Section
  partyInfoSection: {
    alignItems: 'center',
    marginTop: -44,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  partyIconWrapper: {
    marginBottom: 14,
  },
  partyIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#0f0f0f',
  },
  partyIconPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    borderWidth: 4,
    borderColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyIconGameLogo: {
    width: 40,
    height: 40,
    opacity: 0.8,
  },
  partyIconInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
  },
  partyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  partyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  gameLogoSmall: {
    width: 16,
    height: 16,
    opacity: 0.6,
  },
  partyMetaText: {
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
  // Members Section
  membersSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#444',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  membersList: {
    gap: 6,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#151515',
    borderRadius: 8,
    gap: 10,
  },
  memberAvatar: {
    width: 30,
    height: 30,
    backgroundColor: '#1f1f1f',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ccc',
  },
  memberNameYou: {
    color: '#b8a566',
  },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  leaderBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  bottomSpacer: {
    height: 40,
  },
  // Edit Modal
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
  manageMemberJoined: {
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
