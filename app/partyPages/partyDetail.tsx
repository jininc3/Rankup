import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  'Valorant': require('@/assets/images/valorant.png'),
  'League of Legends': require('@/assets/images/lol-icon.png'),
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
            <TouchableOpacity style={styles.headerIconButton} onPress={() => router.replace('/(tabs)/leaderboard')}>
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
              <ThemedText style={styles.partyNameLarge}>{partyName}</ThemedText>
              <ThemedText style={styles.partySubtitle}>{game} • {memberCount} Members</ThemedText>
            </View>
          </View>
        </View>

        {/* Invite Section */}
        <View style={styles.inviteSection}>
          <TouchableOpacity style={styles.inviteButton} onPress={handleShowInviteCode}>
            <IconSymbol size={16} name="person.badge.plus" color="rgba(255, 255, 255, 0.6)" />
            <ThemedText style={styles.inviteButtonText}>Invite Friends</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <ThemedText style={styles.sectionTitle}>MEMBERS</ThemedText>

          <View style={styles.membersList}>
            {members.map((member, index) => (
              <View
                key={member.userId}
                style={[
                  styles.memberRow,
                  member.isCurrentUser && styles.currentUserRow,
                ]}
              >
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
                    <ThemedText style={styles.memberName}>{member.username}</ThemedText>
                  </TouchableOpacity>
                  {partyData?.createdBy === member.userId && (
                    <View style={styles.leaderBadge}>
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
  membersSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  membersList: {
    gap: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
  },
  currentUserRow: {
    backgroundColor: '#1f1f1f',
  },
  memberAvatar: {
    width: 28,
    height: 28,
    backgroundColor: '#252525',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  leaderBadge: {
    backgroundColor: '#c42743',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  bottomSpacer: {
    height: 40,
  },
});
