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
  Image,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard2 from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore';

interface Follower {
  id: string;
  username: string;
  avatar: string;
}

export default function CreateParty1Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const gameName = params.game as string;
  const gameId = params.gameId as string;

  const scrollViewRef = useRef<ScrollView>(null);

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);
    return { start: today, end: thirtyDaysLater };
  };

  const defaultDates = getDefaultDates();

  const [partyName, setPartyName] = useState('');
  const [partyId, setPartyId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date>(defaultDates.start);
  const [endDate, setEndDate] = useState<Date>(defaultDates.end);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [challengeType, setChallengeType] = useState<'climbing' | 'rank'>('climbing');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDurationSelect = (days: number) => {
    setSelectedDuration(days);
    setShowEndDatePicker(false);
    const newEndDate = new Date(startDate);
    newEndDate.setDate(startDate.getDate() + days);
    setEndDate(newEndDate);
  };

  const handleCustomDuration = () => {
    setSelectedDuration(0);
    setShowEndDatePicker(!showEndDatePicker);
  };

  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInviteCode(code);
  }, []);

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!user?.id) {
        setLoadingFollowers(false);
        return;
      }

      try {
        const followingRef = collection(db, 'users', user.id, 'following');
        const followingSnapshot = await getDocs(followingRef);

        if (followingSnapshot.empty) {
          setFollowers([]);
          setLoadingFollowers(false);
          return;
        }

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
              avatar: followingUserData.avatar || '',
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
      } finally {
        setLoadingFollowers(false);
      }
    };

    fetchFollowers();
  }, [user?.id]);

  const handlePartyIdChange = (text: string) => {
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

  const getFilteredFollowers = () => {
    const filtered = followers.filter(follower =>
      follower.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.slice(0, 5);
  };

  const filteredFollowers = getFilteredFollowers();

  const handleCopyInviteCode = async () => {
    if (inviteCode) {
      await Clipboard2.setStringAsync(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
      // Calculate days difference for custom selection
      const diffTime = selectedDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setSelectedDuration(diffDays);
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
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a party');
      return;
    }

    try {
      const partiesRef = collection(db, 'parties');
      const partyIdQuery = query(partiesRef, where('partyId', '==', partyId), limit(1));
      const existingParties = await getDocs(partyIdQuery);

      if (!existingParties.empty) {
        Alert.alert('Error', 'Party ID already exists. Please choose a different ID.');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.id));
      const userData = userDoc.data();

      const now = new Date();
      const memberDetails = [{
        userId: user.id,
        username: userData?.username || 'Unknown',
        avatar: userData?.avatar || '',
        joinedAt: now.toISOString(),
      }];

      const pendingInvites = [];
      for (const followerId of selectedFollowers) {
        const followerDoc = await getDoc(doc(db, 'users', followerId));
        if (followerDoc.exists()) {
          const followerData = followerDoc.data();
          pendingInvites.push({
            userId: followerId,
            username: followerData.username || 'Unknown',
            avatar: followerData.avatar || '',
            invitedAt: now.toISOString(),
            status: 'pending',
          });
        }
      }

      const partyData = {
        partyId,
        partyName,
        game: gameName,
        gameId,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        challengeType,
        inviteCode: inviteCode || '',
        createdBy: user.id,
        createdAt: serverTimestamp(),
        members: [user.id],
        memberDetails,
        pendingInvites,
      };

      await addDoc(partiesRef, partyData);

      if (selectedFollowers.length > 0) {
        for (const invite of pendingInvites) {
          try {
            const notificationRef = collection(db, 'users', invite.userId, 'notifications');
            await addDoc(notificationRef, {
              type: 'party_invite',
              fromUserId: user.id,
              fromUsername: userData?.username || 'Unknown',
              fromAvatar: userData?.avatar || '',
              partyId,
              partyName,
              game: gameName,
              read: false,
              createdAt: serverTimestamp(),
            });
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
          }
        }
      }

      Alert.alert(
        'Success',
        selectedFollowers.length > 0
          ? `Party created! Invitations sent to ${selectedFollowers.length} player${selectedFollowers.length !== 1 ? 's' : ''}.`
          : 'Party created!',
        [{
          text: 'OK',
          onPress: () => {
            router.push({
              pathname: '/leaderboardPages/leaderboardDetail',
              params: {
                name: partyName,
                partyId,
                game: gameName,
                members: '1',
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                players: JSON.stringify([]),
              },
            });
          },
        }]
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
          <IconSymbol size={20} name="chevron.left" color="#fff" />
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
        {/* Party Info Card */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Party Name</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              placeholderTextColor="#555"
              value={partyName}
              onChangeText={setPartyName}
              maxLength={30}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Party ID</ThemedText>
              <View style={styles.idInputContainer}>
                <TextInput
                  style={styles.idInput}
                  placeholder="ABCDE"
                  placeholderTextColor="#666"
                  value={partyId}
                  onChangeText={handlePartyIdChange}
                  maxLength={5}
                  autoCapitalize="characters"
                  textAlign="left"
                />
                <ThemedText style={styles.idCount}>{partyId.length}/5</ThemedText>
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Invite Code</ThemedText>
              <TouchableOpacity style={styles.codeButton} onPress={handleCopyInviteCode}>
                <ThemedText style={styles.codeText}>{inviteCode}</ThemedText>
                <IconSymbol size={14} name="doc.on.doc" color="#888" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Duration Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Duration</ThemedText>
          <View style={styles.durationRow}>
            <TouchableOpacity
              style={[
                styles.durationButton,
                selectedDuration === 10 && styles.durationButtonActive
              ]}
              onPress={() => handleDurationSelect(10)}
            >
              <ThemedText style={[
                styles.durationButtonText,
                selectedDuration === 10 && styles.durationButtonTextActive
              ]}>10 days</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.durationButton,
                selectedDuration === 30 && styles.durationButtonActive
              ]}
              onPress={() => handleDurationSelect(30)}
            >
              <ThemedText style={[
                styles.durationButtonText,
                selectedDuration === 30 && styles.durationButtonTextActive
              ]}>30 days</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.durationButton,
                selectedDuration !== 10 && selectedDuration !== 30 && styles.durationButtonActive
              ]}
              onPress={handleCustomDuration}
            >
              <ThemedText style={[
                styles.durationButtonText,
                selectedDuration !== 10 && selectedDuration !== 30 && styles.durationButtonTextActive
              ]}>Custom</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.endDateRow}>
            <ThemedText style={styles.endDateLabel}>Ends on</ThemedText>
            <ThemedText style={styles.endDateValue}>{formatDateShort(endDate)}</ThemedText>
          </View>
          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
              minimumDate={startDate}
              textColor="#fff"
              themeVariant="dark"
            />
          )}
        </View>

        {/* Challenge Type Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Challenge Type</ThemedText>
          <View style={styles.challengeRow}>
            <TouchableOpacity
              style={[
                styles.challengeButton,
                challengeType === 'climbing' && styles.challengeButtonActive
              ]}
              onPress={() => setChallengeType('climbing')}
            >
              <IconSymbol
                size={18}
                name="chart.line.uptrend.xyaxis"
                color={challengeType === 'climbing' ? '#fff' : '#888'}
              />
              <View style={styles.challengeInfo}>
                <ThemedText style={[
                  styles.challengeTitle,
                  challengeType === 'climbing' && styles.challengeTitleActive
                ]}>Climbing</ThemedText>
                <ThemedText style={[
                  styles.challengeDesc,
                  challengeType === 'climbing' && styles.challengeDescActive
                ]}>Most LP/RR gained</ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.challengeButton,
                challengeType === 'rank' && styles.challengeButtonActive
              ]}
              onPress={() => setChallengeType('rank')}
            >
              <IconSymbol
                size={18}
                name="trophy.fill"
                color={challengeType === 'rank' ? '#fff' : '#888'}
              />
              <View style={styles.challengeInfo}>
                <ThemedText style={[
                  styles.challengeTitle,
                  challengeType === 'rank' && styles.challengeTitleActive
                ]}>Rank</ThemedText>
                <ThemedText style={[
                  styles.challengeDesc,
                  challengeType === 'rank' && styles.challengeDescActive
                ]}>Highest rank wins</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Invite Members Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Invite Members</ThemedText>
            {selectedFollowers.length > 0 && (
              <View style={styles.selectedBadge}>
                <ThemedText style={styles.selectedBadgeText}>{selectedFollowers.length}</ThemedText>
              </View>
            )}
          </View>

          {!loadingFollowers && followers.length > 0 && (
            <TextInput
              style={styles.searchInput}
              placeholder="Search followers..."
              placeholderTextColor="#555"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          )}

          {loadingFollowers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#c42743" />
            </View>
          ) : followers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No followers to invite</ThemedText>
            </View>
          ) : filteredFollowers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No results</ThemedText>
            </View>
          ) : (
            <View style={styles.followersList}>
              {filteredFollowers.map((follower) => (
                <TouchableOpacity
                  key={follower.id}
                  style={[
                    styles.followerItem,
                    selectedFollowers.includes(follower.id) && styles.followerItemSelected
                  ]}
                  onPress={() => toggleFollower(follower.id)}
                >
                  <View style={styles.followerAvatar}>
                    {follower.avatar && follower.avatar.startsWith('http') ? (
                      <Image source={{ uri: follower.avatar }} style={styles.followerAvatarImage} />
                    ) : (
                      <ThemedText style={styles.followerAvatarText}>
                        {follower.username[0].toUpperCase()}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.followerName}>{follower.username}</ThemedText>
                  {selectedFollowers.includes(follower.id) && (
                    <IconSymbol size={18} name="checkmark.circle.fill" color="#c42743" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Create Button */}
        <TouchableOpacity style={styles.createButton} onPress={handleCreateParty}>
          <ThemedText style={styles.createButtonText}>Create Party</ThemedText>
        </TouchableOpacity>

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
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 12,
    backgroundColor: '#0f0f0f',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 28,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  idInputContainer: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
    padding: 0,
    margin: 0,
    minHeight: 20,
  },
  idCount: {
    fontSize: 11,
    color: '#555',
  },
  codeButton: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c42743',
    letterSpacing: 2,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  durationButton: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  durationButtonActive: {
    backgroundColor: '#c42743',
    borderColor: '#c42743',
  },
  durationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  durationButtonTextActive: {
    color: '#fff',
  },
  endDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
  },
  endDateLabel: {
    fontSize: 13,
    color: '#666',
  },
  endDateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  challengeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  challengeButton: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  challengeButtonActive: {
    backgroundColor: '#c42743',
    borderColor: '#c42743',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  challengeTitleActive: {
    color: '#fff',
  },
  challengeDesc: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  challengeDescActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  searchInput: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#fff',
    marginBottom: 10,
  },
  selectedBadge: {
    backgroundColor: '#c42743',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#555',
  },
  followersList: {
    gap: 6,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#252525',
    borderRadius: 8,
    gap: 10,
  },
  followerItemSelected: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#c42743',
  },
  followerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  followerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  followerAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  followerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#c42743',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
});
