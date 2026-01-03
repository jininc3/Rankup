import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import * as Clipboard2 from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore';

interface Follower {
  id: string;
  username: string;
  avatar: string;
}

export default function AddParty1Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const gameName = params.game as string;
  const gameId = params.gameId as string;

  const scrollViewRef = useRef<ScrollView>(null);
  const searchSectionRef = useRef<View>(null);

  // Helper function to format date as MM/DD/YYYY
  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Calculate default dates
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    return {
      start: formatDate(today),
      end: formatDate(thirtyDaysLater),
    };
  };

  const defaultDates = getDefaultDates();

  const [partyName, setPartyName] = useState('');
  const [partyId, setPartyId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [challengeType, setChallengeType] = useState<'climbing' | 'rank'>('climbing');

  // Generate unique invite code on component mount
  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInviteCode(code);
  }, []);

  // Fetch real followers from Firestore
  useEffect(() => {
    const fetchFollowers = async () => {
      if (!user?.id) {
        setLoadingFollowers(false);
        return;
      }

      try {
        // Get the current user's following subcollection
        const followingRef = collection(db, 'users', user.id, 'following');
        const followingSnapshot = await getDocs(followingRef);

        if (followingSnapshot.empty) {
          setFollowers([]);
          setLoadingFollowers(false);
          return;
        }

        // Fetch user details for each following user
        const followerPromises = followingSnapshot.docs.map(async (followDoc) => {
          const followingData = followDoc.data();
          const followingId = followingData.followingId;

          if (!followingId) return null;

          const followingUserDoc = await getDoc(doc(db, 'users', followingId));
          if (followingUserDoc.exists()) {
            const followingUserData = followingUserDoc.data();
            return {
              id: followingId,
              username: followingUserData.username || 'Unknown',
              avatar: followingUserData.avatar || '👤',
            };
          }
          return null;
        });

        const fetchedFollowers = (await Promise.all(followerPromises)).filter(
          (follower): follower is Follower => follower !== null
        );

        setFollowers(fetchedFollowers);
      } catch (error) {
        console.error('Error fetching followers:', error);
        Alert.alert('Error', 'Failed to load followers');
      } finally {
        setLoadingFollowers(false);
      }
    };

    fetchFollowers();
  }, [user?.id]);

  const handlePartyIdChange = (text: string) => {
    // Convert to uppercase and limit to 5 characters, only letters
    const uppercased = text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    setPartyId(uppercased);
  };

  const toggleFollower = (followerId: string) => {
    if (selectedFollowers.includes(followerId)) {
      setSelectedFollowers(selectedFollowers.filter(id => id !== followerId));
    } else {
      setSelectedFollowers([...selectedFollowers, followerId]);
    }
  };

  // Filter followers based on search query and limit to 5
  const getFilteredFollowers = () => {
    const filtered = followers.filter(follower =>
      follower.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.slice(0, 5);
  };

  const filteredFollowers = getFilteredFollowers();

  const handleSearchFocus = () => {
    setTimeout(() => {
      searchSectionRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
        },
        () => {}
      );
    }, 100);
  };

  const handleCopyInviteCode = async () => {
    if (inviteCode) {
      await Clipboard2.setStringAsync(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  const handleCreateParty = async () => {
    if (!partyName.trim()) {
      Alert.alert('Error', 'Please enter a party name');
      return;
    }
    if (!partyId.trim() || partyId.length < 5) {
      Alert.alert('Error', 'Party ID must be 5 letters');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please set start and end dates');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a party');
      return;
    }

    try {
      console.log('Starting party creation...');
      console.log('User ID:', user.id);
      console.log('Party ID:', partyId);

      // Check if party ID already exists
      const partiesRef = collection(db, 'parties');
      console.log('Checking if party ID exists...');
      const partyIdQuery = query(partiesRef, where('partyId', '==', partyId), limit(1));
      const existingParties = await getDocs(partyIdQuery);
      console.log('Party ID check complete');

      if (!existingParties.empty) {
        Alert.alert('Error', 'Party ID already exists. Please choose a different ID.');
        return;
      }

      // Get current user details
      console.log('Fetching user details...');
      const userDoc = await getDoc(doc(db, 'users', user.id));
      const userData = userDoc.data();
      console.log('User data:', userData);

      // Prepare member details (only creator initially)
      const now = new Date();
      const memberDetails = [
        {
          userId: user.id,
          username: userData?.username || 'Unknown',
          avatar: userData?.avatar || '👤',
          joinedAt: now.toISOString(),
        },
      ];

      // Prepare pending invites for selected followers
      const pendingInvites = [];
      for (const followerId of selectedFollowers) {
        const followerDoc = await getDoc(doc(db, 'users', followerId));
        if (followerDoc.exists()) {
          const followerData = followerDoc.data();
          pendingInvites.push({
            userId: followerId,
            username: followerData.username || 'Unknown',
            avatar: followerData.avatar || '👤',
            invitedAt: now.toISOString(),
            status: 'pending', // pending, accepted, declined
          });
        }
      }

      // Create party document (only creator as member initially)
      const partyData = {
        partyId: partyId,
        partyName: partyName,
        game: gameName,
        gameId: gameId,
        startDate: startDate,
        endDate: endDate,
        challengeType: challengeType, // 'climbing' or 'rank'
        inviteCode: inviteCode || '',
        createdBy: user.id,
        createdAt: serverTimestamp(),
        members: [user.id], // Only creator initially
        memberDetails: memberDetails, // Only creator's details
        pendingInvites: pendingInvites, // Store invited users separately
      };

      console.log('Creating party with data:', partyData);
      console.log('Members array:', partyData.members);
      console.log('Created by:', partyData.createdBy);

      const docRef = await addDoc(partiesRef, partyData);
      console.log('Party created successfully! Doc ID:', docRef.id);

      // Send invitations to selected followers
      if (selectedFollowers.length > 0) {
        console.log('Sending invitations to', selectedFollowers.length, 'followers');

        for (const invite of pendingInvites) {
          try {
            // Create in-app notification
            const notificationRef = collection(db, 'users', invite.userId, 'notifications');
            await addDoc(notificationRef, {
              type: 'party_invite',
              fromUserId: user.id,
              fromUsername: userData?.username || 'Unknown',
              fromAvatar: userData?.avatar || '👤',
              partyId: partyId,
              partyName: partyName,
              game: gameName,
              read: false,
              createdAt: serverTimestamp(),
            });

            // Send push notification
            const invitedUserDoc = await getDoc(doc(db, 'users', invite.userId));
            const invitedUserData = invitedUserDoc.data();
            const expoPushToken = invitedUserData?.expoPushToken;

            if (expoPushToken) {
              try {
                await fetch('https://exp.host/--/api/v2/push/send', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    to: expoPushToken,
                    title: 'Party Invitation',
                    body: `${userData?.username} invited you to join "${partyName}" for ${gameName}!`,
                    data: {
                      type: 'party_invite',
                      partyId: partyId,
                      partyName: partyName,
                      game: gameName,
                    },
                  }),
                });
                console.log('Push notification sent to', invite.username);
              } catch (pushError) {
                console.error('Error sending push notification:', pushError);
                // Don't fail the whole operation if push fails
              }
            }
          } catch (notifError) {
            console.error('Error sending notification to', invite.username, ':', notifError);
            // Continue with other notifications even if one fails
          }
        }
      }

      Alert.alert(
        'Success',
        selectedFollowers.length > 0
          ? `Party created! Invitations sent to ${selectedFollowers.length} ${selectedFollowers.length === 1 ? 'player' : 'players'}.`
          : 'Leaderboard party created!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the party detail page
              router.push({
                pathname: '/leaderboardPages/leaderboardDetail',
                params: {
                  name: partyName,
                  partyId: partyId,
                  game: gameName,
                  members: '1', // Only creator initially
                  startDate: startDate,
                  endDate: endDate,
                  players: JSON.stringify([]),
                },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating party:', error);
      Alert.alert('Error', 'Failed to create party. Please try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Party Details</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Game Info */}
        <View style={styles.gameInfoSection}>
          <ThemedText style={styles.gameInfoLabel}>Game</ThemedText>
          <ThemedText style={styles.gameInfoValue}>{gameName}</ThemedText>
        </View>

        {/* Party Name */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Party Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter party name"
            placeholderTextColor="#999"
            value={partyName}
            onChangeText={setPartyName}
            maxLength={30}
          />
        </View>

        {/* Party ID */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Party ID</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            5 letters, all caps (e.g., SQUAD)
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="ABCDE"
            placeholderTextColor="#999"
            value={partyId}
            onChangeText={handlePartyIdChange}
            maxLength={5}
            autoCapitalize="characters"
          />
          <ThemedText style={styles.characterCount}>{partyId.length}/5</ThemedText>
        </View>

        {/* Start Date */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Start Date</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            When does this leaderboard competition begin?
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#999"
            value={startDate}
            onChangeText={setStartDate}
            maxLength={10}
          />
        </View>

        {/* End Date */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>End Date</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            When does this leaderboard competition end?
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#999"
            value={endDate}
            onChangeText={setEndDate}
            maxLength={10}
          />
        </View>

        {/* Challenge Type */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Challenge Type</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Choose how the winner is determined
          </ThemedText>

          <View style={styles.challengeTypeContainer}>
            <TouchableOpacity
              style={[
                styles.challengeTypeButton,
                challengeType === 'climbing' && styles.challengeTypeButtonActive
              ]}
              onPress={() => setChallengeType('climbing')}
            >
              <View style={styles.challengeTypeHeader}>
                <IconSymbol
                  size={24}
                  name="chart.line.uptrend.xyaxis"
                  color={challengeType === 'climbing' ? '#fff' : '#000'}
                />
                <ThemedText style={[
                  styles.challengeTypeTitle,
                  challengeType === 'climbing' && styles.challengeTypeTitleActive
                ]}>
                  Climbing Challenge
                </ThemedText>
              </View>
              <ThemedText style={[
                styles.challengeTypeDescription,
                challengeType === 'climbing' && styles.challengeTypeDescriptionActive
              ]}>
                Most LP/RR gained wins
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.challengeTypeButton,
                challengeType === 'rank' && styles.challengeTypeButtonActive
              ]}
              onPress={() => setChallengeType('rank')}
            >
              <View style={styles.challengeTypeHeader}>
                <IconSymbol
                  size={24}
                  name="trophy.fill"
                  color={challengeType === 'rank' ? '#fff' : '#000'}
                />
                <ThemedText style={[
                  styles.challengeTypeTitle,
                  challengeType === 'rank' && styles.challengeTypeTitleActive
                ]}>
                  Rank Challenge
                </ThemedText>
              </View>
              <ThemedText style={[
                styles.challengeTypeDescription,
                challengeType === 'rank' && styles.challengeTypeDescriptionActive
              ]}>
                Highest rank wins
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Invite Code */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Invite Code</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Share this code with others to invite them
          </ThemedText>

          <View style={styles.inviteCodeContainer}>
            <View style={styles.inviteCodeBox}>
              <ThemedText style={styles.inviteCodeText}>{inviteCode}</ThemedText>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyInviteCode}
            >
              <IconSymbol size={20} name="doc.on.doc" color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Add from Followers */}
        <View style={styles.section} ref={searchSectionRef}>
          <ThemedText style={styles.sectionTitle}>Add Members</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Select people you follow to add to this party
          </ThemedText>

          {/* Search Bar */}
          {!loadingFollowers && followers.length > 0 && (
            <TextInput
              style={styles.searchInput}
              placeholder="Search followers..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
            />
          )}

          {loadingFollowers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000" />
              <ThemedText style={styles.loadingText}>Loading followers...</ThemedText>
            </View>
          ) : followers.length === 0 ? (
            <View style={styles.emptyFollowersContainer}>
              <ThemedText style={styles.emptyFollowersText}>
                You're not following anyone yet
              </ThemedText>
              <ThemedText style={styles.emptyFollowersSubtext}>
                Follow users to add them to your party
              </ThemedText>
            </View>
          ) : filteredFollowers.length === 0 ? (
            <View style={styles.emptyFollowersContainer}>
              <ThemedText style={styles.emptyFollowersText}>
                No followers found
              </ThemedText>
              <ThemedText style={styles.emptyFollowersSubtext}>
                Try a different search term
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.followersList}>
                {filteredFollowers.map((follower) => (
                  <TouchableOpacity
                    key={follower.id}
                    style={[
                      styles.followerCard,
                      selectedFollowers.includes(follower.id) && styles.followerCardSelected
                    ]}
                    onPress={() => toggleFollower(follower.id)}
                  >
                    <View style={styles.followerLeft}>
                      <View style={styles.followerAvatar}>
                        {follower.avatar && follower.avatar.startsWith('http') ? (
                          <Image source={{ uri: follower.avatar }} style={styles.followerAvatarImage} />
                        ) : (
                          <ThemedText style={styles.followerAvatarText}>
                            {follower.avatar || follower.username[0].toUpperCase()}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText style={styles.followerUsername}>{follower.username}</ThemedText>
                    </View>
                    {selectedFollowers.includes(follower.id) && (
                      <IconSymbol size={20} name="checkmark.circle.fill" color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.followerStats}>
                {searchQuery && (
                  <ThemedText style={styles.followerCount}>
                    Showing {filteredFollowers.length} of {followers.length} followers
                  </ThemedText>
                )}
                {selectedFollowers.length > 0 && (
                  <ThemedText style={styles.selectedCount}>
                    {selectedFollowers.length} member{selectedFollowers.length !== 1 ? 's' : ''} selected
                  </ThemedText>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateParty}
        >
          <ThemedText style={styles.createButtonText}>Create Party</ThemedText>
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerSpacer: {
    width: 28,
  },
  scrollView: {
    flex: 1,
  },
  gameInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  gameInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  gameInfoValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 12,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteCodeBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
  },
  inviteCodeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 4,
  },
  copyButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followersList: {
    gap: 8,
  },
  followerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  followerCardSelected: {
    backgroundColor: '#fff',
    borderColor: '#000',
    borderWidth: 2,
  },
  followerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  followerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followerAvatarText: {
    fontSize: 18,
  },
  followerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  followerUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  followerStats: {
    marginTop: 8,
    gap: 4,
    alignItems: 'center',
  },
  followerCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  selectedCount: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyFollowersContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyFollowersText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyFollowersSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  createButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacer: {
    height: 400,
  },
  challengeTypeContainer: {
    gap: 12,
  },
  challengeTypeButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  challengeTypeButtonActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  challengeTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  challengeTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  challengeTypeTitleActive: {
    color: '#fff',
  },
  challengeTypeDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 36,
  },
  challengeTypeDescriptionActive: {
    color: '#ccc',
  },
});
