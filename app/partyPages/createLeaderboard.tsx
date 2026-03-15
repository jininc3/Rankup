import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
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
  Dimensions,
  Platform,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard2 from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, getDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { uploadPartyIcon, uploadPartyCoverPhoto } from '@/services/storageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Available games
const AVAILABLE_GAMES = [
  {
    id: 'valorant',
    name: 'Valorant',
    logo: require('@/assets/images/valorant-red.png'),
  },
  {
    id: 'league',
    name: 'League',
    logo: require('@/assets/images/lol-icon.png'),
  },
];

interface Follower {
  id: string;
  username: string;
  avatar: string;
}

export default function CreateLeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const tabScrollRef = useRef<ScrollView>(null);

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

  const [selectedGame, setSelectedGame] = useState<typeof AVAILABLE_GAMES[0] | null>(null);
  const [leaderboardName, setLeaderboardName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<Follower[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'invite'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [leaderboardIcon, setLeaderboardIcon] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(defaultDates.start);
  const [endDate, setEndDate] = useState<Date>(defaultDates.end);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [challengeType, setChallengeType] = useState<'climbing' | 'rank'>('climbing');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [invitePermission, setInvitePermission] = useState<'leader_only' | 'anyone'>('leader_only');
  const [maxMembers, setMaxMembers] = useState<number>(10);

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

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
      const diffTime = selectedDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setSelectedDuration(diffDays);
    }
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
          setMutualFollowers([]);
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

            // Check if they follow us back (mutual)
            const theirFollowingRef = collection(db, 'users', followingId, 'following');
            const theirFollowingSnapshot = await getDocs(theirFollowingRef);
            const isMutual = theirFollowingSnapshot.docs.some(
              (doc) => doc.data().followingId === user.id
            );

            return {
              id: followingId,
              username: followingUserData.username || 'Unknown',
              avatar: followingUserData.avatar || '',
              isMutual,
            };
          }
          return null;
        });

        const fetchedFollowers = (await Promise.all(followerPromises)).filter(
          (follower): follower is Follower & { isMutual: boolean } => follower !== null
        );

        // Set all followers
        setFollowers(fetchedFollowers.map(({ isMutual, ...rest }) => rest));

        // Set mutual followers (up to 5 for suggestions)
        const mutuals = fetchedFollowers
          .filter((f) => f.isMutual)
          .map(({ isMutual, ...rest }) => rest);
        setMutualFollowers(mutuals);
      } catch (error) {
        console.error('Error fetching followers:', error);
      } finally {
        setLoadingFollowers(false);
      }
    };

    fetchFollowers();
  }, [user?.id]);

  const toggleFollower = (followerId: string) => {
    if (selectedFollowers.includes(followerId)) {
      setSelectedFollowers(selectedFollowers.filter(id => id !== followerId));
    } else {
      setSelectedFollowers([...selectedFollowers, followerId]);
    }
  };

  const getFilteredFollowers = () => {
    return followers.filter(follower =>
      follower.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredFollowers = getFilteredFollowers();

  // Handle tab switching via tap
  const handleTabPress = (tab: 'leaderboard' | 'invite') => {
    setActiveTab(tab);
    const pageIndex = tab === 'leaderboard' ? 0 : 1;
    tabScrollRef.current?.scrollTo({ x: pageIndex * SCREEN_WIDTH, animated: true });
  };

  // Handle swipe between tabs (real-time sync)
  const handleTabScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    // Update tab when past 50% of the page width
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    const newTab = pageIndex === 0 ? 'leaderboard' : 'invite';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  const handleCopyInviteCode = async () => {
    if (inviteCode) {
      await Clipboard2.setStringAsync(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  const handlePickLeaderboardIcon = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLeaderboardIcon(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking leaderboard icon:', error);
      Alert.alert('Error', 'Failed to select leaderboard icon');
    }
  };

  const handlePickCoverPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking cover photo:', error);
      Alert.alert('Error', 'Failed to select cover photo');
    }
  };

  const handleCreateLeaderboard = async () => {
    if (!selectedGame) {
      Alert.alert('Error', 'Please select a game');
      return;
    }
    if (!leaderboardName.trim()) {
      Alert.alert('Error', 'Please enter a leaderboard name');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a leaderboard');
      return;
    }

    setUploading(true);

    try {
      const partiesRef = collection(db, 'parties');

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

      const leaderboardData = {
        partyName: leaderboardName,
        game: selectedGame.name,
        gameId: selectedGame.id,
        type: 'leaderboard',
        maxMembers,
        duration: selectedDuration,
        startDate: null,
        endDate: null,
        challengeStatus: 'pending',
        challengeType,
        inviteCode: inviteCode || '',
        invitePermission,
        createdBy: user.id,
        createdAt: serverTimestamp(),
        members: [user.id],
        memberDetails,
        pendingInvites,
      };

      // Create the leaderboard first to get the document ID
      const leaderboardDocRef = await addDoc(partiesRef, leaderboardData);
      const generatedPartyId = leaderboardDocRef.id;

      // Update with partyId field
      await updateDoc(leaderboardDocRef, { partyId: generatedPartyId });

      // Upload leaderboard icon if selected
      if (leaderboardIcon) {
        try {
          const iconUrl = await uploadPartyIcon(generatedPartyId, leaderboardIcon);
          await updateDoc(leaderboardDocRef, { partyIcon: iconUrl });
        } catch (uploadError) {
          console.error('Error uploading leaderboard icon:', uploadError);
        }
      }

      // Upload cover photo if selected
      if (coverPhoto) {
        try {
          const coverPhotoUrl = await uploadPartyCoverPhoto(generatedPartyId, coverPhoto);
          await updateDoc(leaderboardDocRef, { coverPhoto: coverPhotoUrl });
        } catch (uploadError) {
          console.error('Error uploading cover photo:', uploadError);
        }
      }

      if (selectedFollowers.length > 0) {
        for (const invite of pendingInvites) {
          try {
            const notificationRef = collection(db, 'users', invite.userId, 'notifications');
            await addDoc(notificationRef, {
              type: 'party_invite',
              fromUserId: user.id,
              fromUsername: userData?.username || 'Unknown',
              fromAvatar: userData?.avatar || '',
              partyId: generatedPartyId,
              partyName: leaderboardName,
              game: selectedGame.name,
              read: false,
              createdAt: serverTimestamp(),
            });
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
          }
        }
      }

      setUploading(false);

      Alert.alert(
        'Success',
        selectedFollowers.length > 0
          ? `Leaderboard created! Invitations sent to ${selectedFollowers.length} player${selectedFollowers.length !== 1 ? 's' : ''}.`
          : 'Leaderboard created!',
        [{
          text: 'OK',
          onPress: () => {
            router.replace({
              pathname: '/partyPages/leaderboardDetail',
              params: {
                id: generatedPartyId,
                name: leaderboardName,
                game: selectedGame.name,
                members: '1',
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
              },
            });
          },
        }]
      );
    } catch (error) {
      console.error('Error creating leaderboard:', error);
      setUploading(false);
      Alert.alert('Error', 'Failed to create leaderboard. Please try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Create Leaderboard</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => handleTabPress('leaderboard')}
        >
          <IconSymbol size={16} name="gearshape.fill" color={activeTab === 'leaderboard' ? '#fff' : '#666'} />
          <ThemedText style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
            LEADERBOARD
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invite' && styles.tabActive]}
          onPress={() => handleTabPress('invite')}
        >
          <IconSymbol size={16} name="person.badge.plus" color={activeTab === 'invite' ? '#fff' : '#666'} />
          <ThemedText style={[styles.tabText, activeTab === 'invite' && styles.tabTextActive]}>
            INVITE SETTINGS
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Swipeable Tab Content */}
      <ScrollView
        ref={tabScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleTabScroll}
        scrollEventThrottle={16}
        style={styles.tabContentScroll}
      >
        {/* Leaderboard Settings Tab */}
        <ScrollView
          style={styles.tabPage}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={styles.formContent}>
            {/* Name & Icon Row */}
            <View style={styles.nameIconRow}>
              {/* Leaderboard Icon */}
              <TouchableOpacity
                style={styles.leaderboardIconPicker}
                onPress={handlePickLeaderboardIcon}
                activeOpacity={0.7}
              >
                {leaderboardIcon ? (
                  <Image source={{ uri: leaderboardIcon }} style={styles.leaderboardIconPreview} />
                ) : (
                  <View style={styles.leaderboardIconPlaceholder}>
                    <IconSymbol size={24} name="camera.fill" color="#555" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Leaderboard Name */}
              <View style={styles.nameInputContainer}>
                <ThemedText style={styles.label}>Leaderboard Name</ThemedText>
                <TextInput
                  style={[styles.input, styles.inputUppercase]}
                  placeholder="Enter leaderboard name"
                  placeholderTextColor="#444"
                  value={leaderboardName}
                  onChangeText={(text) => setLeaderboardName(text.toUpperCase())}
                  maxLength={30}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Cover Photo */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Cover Photo</ThemedText>
              <TouchableOpacity
                style={styles.coverPhotoPicker}
                onPress={handlePickCoverPhoto}
                activeOpacity={0.7}
              >
                {coverPhoto ? (
                  <Image source={{ uri: coverPhoto }} style={styles.coverPhotoPreview} />
                ) : (
                  <View style={styles.coverPhotoPlaceholderInline}>
                    <IconSymbol size={28} name="photo" color="#555" />
                    <ThemedText style={styles.placeholderText}>Add Cover Photo</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Game Selection */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Game</ThemedText>
              <View style={styles.gameSelectionRow}>
                {AVAILABLE_GAMES.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={[
                      styles.gameOptionCircle,
                      selectedGame?.id === game.id && styles.gameOptionCircleSelected
                    ]}
                    onPress={() => setSelectedGame(game)}
                  >
                    <Image source={game.logo} style={styles.gameOptionLogoCircle} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Max Members */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Max Members</ThemedText>
              <View style={styles.membersRow}>
                {[5, 10, 20, 0].map((limit) => (
                  <TouchableOpacity
                    key={limit}
                    style={[
                      styles.membersChip,
                      maxMembers === limit && styles.membersChipActive
                    ]}
                    onPress={() => setMaxMembers(limit)}
                  >
                    <ThemedText style={[
                      styles.membersChipText,
                      maxMembers === limit && styles.membersChipTextActive
                    ]}>{limit === 0 ? 'NO LIMIT' : limit}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Duration */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Duration</ThemedText>
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

            {/* Challenge Type */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Challenge Type</ThemedText>
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
                    color={challengeType === 'climbing' ? '#c42743' : '#666'}
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
                    color={challengeType === 'rank' ? '#c42743' : '#666'}
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

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>

        {/* Invite Settings Tab */}
        <ScrollView
          style={styles.tabPage}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={styles.formContent}>
            {/* Invite Code */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Invite Code</ThemedText>
              <TouchableOpacity style={styles.codeButton} onPress={handleCopyInviteCode}>
                <ThemedText style={styles.codeText}>{inviteCode}</ThemedText>
                <IconSymbol size={16} name="doc.on.doc" color="#666" />
              </TouchableOpacity>
            </View>

            {/* Invite Permission */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Who Can Invite</ThemedText>
              <View style={styles.permissionRow}>
                <TouchableOpacity
                  style={[
                    styles.permissionButton,
                    invitePermission === 'leader_only' && styles.permissionButtonActive
                  ]}
                  onPress={() => setInvitePermission('leader_only')}
                >
                  <IconSymbol
                    size={16}
                    name="crown.fill"
                    color={invitePermission === 'leader_only' ? '#c42743' : '#666'}
                  />
                  <ThemedText style={[
                    styles.permissionButtonText,
                    invitePermission === 'leader_only' && styles.permissionButtonTextActive
                  ]}>Leader Only</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.permissionButton,
                    invitePermission === 'anyone' && styles.permissionButtonActive
                  ]}
                  onPress={() => setInvitePermission('anyone')}
                >
                  <IconSymbol
                    size={16}
                    name="person.2.fill"
                    color={invitePermission === 'anyone' ? '#c42743' : '#666'}
                  />
                  <ThemedText style={[
                    styles.permissionButtonText,
                    invitePermission === 'anyone' && styles.permissionButtonTextActive
                  ]}>Anyone</ThemedText>
                </TouchableOpacity>
              </View>
              <ThemedText style={styles.permissionHint}>You can change this later in leaderboard settings</ThemedText>
            </View>

            {/* Suggestions from Mutual Followers */}
            {!loadingFollowers && mutualFollowers.length > 0 && (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Suggestions</ThemedText>
                <View style={styles.suggestionsContainer}>
                  {mutualFollowers
                    .filter((f) => !selectedFollowers.includes(f.id))
                    .slice(0, 5)
                    .map((follower) => (
                      <TouchableOpacity
                        key={follower.id}
                        style={styles.suggestionItem}
                        onPress={() => toggleFollower(follower.id)}
                      >
                        <View style={styles.suggestionAvatarWrapper}>
                          <View style={styles.suggestionAvatar}>
                            {follower.avatar && follower.avatar.startsWith('http') ? (
                              <Image source={{ uri: follower.avatar }} style={styles.suggestionAvatarImage} />
                            ) : (
                              <ThemedText style={styles.suggestionAvatarText}>
                                {follower.username[0].toUpperCase()}
                              </ThemedText>
                            )}
                          </View>
                          <View style={styles.suggestionAddButton}>
                            <IconSymbol size={10} name="plus" color="#fff" />
                          </View>
                        </View>
                        <ThemedText style={styles.suggestionName} numberOfLines={1}>
                          {follower.username}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  {mutualFollowers.filter((f) => !selectedFollowers.includes(f.id)).length === 0 && (
                    <ThemedText style={styles.noSuggestionsText}>All mutual followers selected</ThemedText>
                  )}
                </View>
              </View>
            )}

            {/* Invite Members */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <ThemedText style={styles.label}>Invite Members</ThemedText>
                {selectedFollowers.length > 0 && (
                  <View style={styles.selectedBadge}>
                    <ThemedText style={styles.selectedBadgeText}>{selectedFollowers.length}</ThemedText>
                  </View>
                )}
              </View>

              {/* Selected followers chips */}
              {selectedFollowers.length > 0 && (
                <View style={styles.selectedChipsContainer}>
                  {followers
                    .filter(f => selectedFollowers.includes(f.id))
                    .map((follower) => (
                      <View key={follower.id} style={styles.selectedChip}>
                        <ThemedText style={styles.selectedChipText}>{follower.username}</ThemedText>
                        <TouchableOpacity onPress={() => toggleFollower(follower.id)}>
                          <IconSymbol size={14} name="xmark" color="#888" />
                        </TouchableOpacity>
                      </View>
                    ))}
                </View>
              )}

              {/* Touchable to open modal */}
              <TouchableOpacity
                style={styles.inviteSearchButton}
                onPress={() => setInviteModalVisible(true)}
              >
                <IconSymbol size={16} name="magnifyingglass" color="#444" />
                <ThemedText style={styles.inviteSearchPlaceholder}>
                  {loadingFollowers ? 'Loading...' : followers.length === 0 ? 'No followers to invite' : 'Search followers...'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, uploading && styles.createButtonDisabled]}
              onPress={handleCreateLeaderboard}
              disabled={uploading}
            >
              {uploading ? (
                <View style={styles.createButtonLoading}>
                  <ActivityIndicator size="small" color="#fff" />
                  <ThemedText style={styles.createButtonText}>Creating...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.createButtonText}>Create Leaderboard</ThemedText>
              )}
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </ScrollView>

      {/* Invite Members Modal */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Invite Members</ThemedText>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <IconSymbol size={24} name="xmark" color="#fff" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search followers..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <ScrollView style={styles.modalFollowersList} showsVerticalScrollIndicator={false}>
              {loadingFollowers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#c42743" />
                </View>
              ) : followers.length === 0 ? (
                <ThemedText style={styles.emptyText}>No followers to invite</ThemedText>
              ) : filteredFollowers.length === 0 ? (
                <ThemedText style={styles.emptyText}>No results</ThemedText>
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
                      <View style={[
                        styles.checkCircle,
                        selectedFollowers.includes(follower.id) && styles.checkCircleSelected
                      ]}>
                        {selectedFollowers.includes(follower.id) && (
                          <IconSymbol size={12} name="checkmark" color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setInviteModalVisible(false)}
            >
              <ThemedText style={styles.modalDoneButtonText}>Done</ThemedText>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#252525',
    borderColor: '#444',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContentScroll: {
    flex: 1,
  },
  tabPage: {
    width: SCREEN_WIDTH,
  },
  // Name & Icon Row
  nameIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginBottom: 24,
  },
  nameInputContainer: {
    flex: 1,
  },
  // Leaderboard Icon Picker
  leaderboardIconPicker: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  leaderboardIconPreview: {
    width: '100%',
    height: '100%',
  },
  leaderboardIconPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Cover Photo Picker
  coverPhotoPicker: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  coverPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholderInline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    fontSize: 13,
    color: '#555',
  },
  // Form
  formContent: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  inputUppercase: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Game Selection
  gameSelectionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gameOptionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gameOptionCircleSelected: {
    borderColor: '#c42743',
    backgroundColor: '#1f1518',
  },
  gameOptionLogoCircle: {
    width: 28,
    height: 28,
  },
  // Max Members
  membersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  membersChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  membersChipActive: {
    backgroundColor: '#252525',
    borderColor: '#c42743',
  },
  membersChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  membersChipTextActive: {
    color: '#c42743',
  },
  // Duration
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  durationButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  durationButtonActive: {
    backgroundColor: '#252525',
    borderColor: '#c42743',
  },
  durationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  durationButtonTextActive: {
    color: '#c42743',
  },
  endDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
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
  // Challenge Type
  challengeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  challengeButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  challengeButtonActive: {
    backgroundColor: '#252525',
    borderColor: '#c42743',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  challengeTitleActive: {
    color: '#c42743',
  },
  challengeDesc: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },
  challengeDescActive: {
    color: '#888',
  },
  // Invite Code
  codeButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 3,
  },
  // Permission
  permissionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  permissionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  permissionButtonActive: {
    backgroundColor: '#252525',
    borderColor: '#c42743',
  },
  permissionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  permissionButtonTextActive: {
    color: '#c42743',
  },
  permissionHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  // Suggestions
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  suggestionItem: {
    alignItems: 'center',
    width: 56,
  },
  suggestionAvatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  suggestionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  suggestionAvatarImage: {
    width: '100%',
    height: '100%',
  },
  suggestionAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  suggestionName: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'center',
  },
  suggestionAddButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f0f0f',
  },
  noSuggestionsText: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
  },
  // Search
  inviteSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  inviteSearchPlaceholder: {
    fontSize: 15,
    color: '#444',
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 30,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  modalSearchInput: {
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#fff',
    marginBottom: 10,
  },
  modalFollowersList: {
    flex: 1,
  },
  modalDoneButton: {
    borderWidth: 1,
    borderColor: '#c42743',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalDoneButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#c42743',
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
  emptyText: {
    fontSize: 14,
    color: '#444',
  },
  // Followers
  followersList: {
    gap: 2,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    gap: 10,
  },
  followerItemSelected: {
    backgroundColor: '#1f1518',
  },
  followerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  followerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  followerAvatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  followerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#c42743',
    borderColor: '#c42743',
  },
  // Create Button
  createButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#c42743',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomSpacer: {
    height: 40,
  },
});
