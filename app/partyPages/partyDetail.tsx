import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image, Alert, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';

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
        // Query for party by partyId
        const partiesRef = collection(db, 'parties');
        const partyQuery = query(partiesRef, where('partyId', '==', partyIdParam), limit(1));
        const partySnapshot = await getDocs(partyQuery);

        if (partySnapshot.empty) {
          console.log('Party not found for ID:', partyIdParam);
          return;
        }

        const partyDocumentId = partySnapshot.docs[0].id;
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

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/leaderboard')}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>{partyName}</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{game} • {memberCount} Members</ThemedText>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={handleLeaveParty}>
          <IconSymbol size={20} name="rectangle.portrait.and.arrow.right" color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c42743" />
        }
      >
        {/* Invite Section */}
        <View style={styles.inviteSection}>
          <TouchableOpacity style={styles.inviteButton} onPress={handleShowInviteCode}>
            <IconSymbol size={18} name="person.badge.plus" color="#fff" />
            <ThemedText style={styles.inviteButtonText}>Invite Friends</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <ThemedText style={styles.sectionTitle}>MEMBERS</ThemedText>

          <View style={styles.membersList}>
            {members.map((member, index) => (
              <TouchableOpacity
                key={member.userId}
                style={[
                  styles.memberRow,
                  member.isCurrentUser && styles.currentUserRow,
                ]}
                onPress={() => handleMemberPress(member)}
                activeOpacity={0.7}
              >
                {/* Member Avatar */}
                <View style={styles.memberAvatar}>
                  {member.avatar && member.avatar.startsWith('http') ? (
                    <Image source={{ uri: member.avatar }} style={styles.memberAvatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarText}>
                      {member.username[0].toUpperCase()}
                    </ThemedText>
                  )}
                </View>

                {/* Member Info */}
                <View style={styles.memberInfo}>
                  <ThemedText style={styles.memberName}>{member.username}</ThemedText>
                  {partyData?.createdBy === member.userId && (
                    <View style={styles.leaderBadge}>
                      <ThemedText style={styles.leaderBadgeText}>Leader</ThemedText>
                    </View>
                  )}
                </View>

                {/* Arrow */}
                <IconSymbol size={16} name="chevron.right" color="#444" />
              </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 12,
    backgroundColor: '#0f0f0f',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  headerButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  inviteSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#c42743',
    borderRadius: 12,
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  currentUserRow: {
    backgroundColor: '#1f1f1f',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#252525',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  leaderBadge: {
    backgroundColor: '#c42743',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaderBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  bottomSpacer: {
    height: 40,
  },
});
