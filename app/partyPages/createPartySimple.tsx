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
} from 'react-native';
import * as Clipboard2 from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadPartyCoverPhoto } from '@/services/storageService';

// Available games
const AVAILABLE_GAMES = [
  {
    id: 'valorant',
    name: 'Valorant',
    logo: require('@/assets/images/valorant.png'),
  },
  {
    id: 'league',
    name: 'League of Legends',
    logo: require('@/assets/images/lol-icon.png'),
  },
];

interface Follower {
  id: string;
  username: string;
  avatar: string;
}

export default function CreatePartySimpleScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const scrollViewRef = useRef<ScrollView>(null);

  const [selectedGame, setSelectedGame] = useState<typeof AVAILABLE_GAMES[0] | null>(null);
  const [partyName, setPartyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

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

  const handleRemoveCoverPhoto = () => {
    setCoverPhoto(null);
  };

  const handleCreateParty = async () => {
    if (!selectedGame) {
      Alert.alert('Error', 'Please select a game');
      return;
    }
    if (!partyName.trim()) {
      Alert.alert('Error', 'Please enter a party name');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a party');
      return;
    }

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

      const partyData = {
        partyName,
        game: selectedGame.name,
        gameId: selectedGame.id,
        type: 'party',
        inviteCode: inviteCode || '',
        createdBy: user.id,
        createdAt: serverTimestamp(),
        members: [user.id],
        memberDetails,
        pendingInvites,
      };

      // Create the party first to get the document ID
      const partyDocRef = await addDoc(partiesRef, partyData);
      const generatedPartyId = partyDocRef.id;

      // Update the party with the partyId field (document ID)
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(partyDocRef, { partyId: generatedPartyId });

      // Upload cover photo if selected (using the generated party ID)
      if (coverPhoto) {
        setUploadingCover(true);
        try {
          const coverPhotoUrl = await uploadPartyCoverPhoto(generatedPartyId, coverPhoto);
          // Update the party with the cover photo URL
          await updateDoc(partyDocRef, { coverPhoto: coverPhotoUrl });
        } catch (uploadError) {
          console.error('Error uploading cover photo:', uploadError);
          // Continue without cover photo if upload fails
        }
        setUploadingCover(false);
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
              partyName,
              game: selectedGame.name,
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
              pathname: '/partyPages/partyDetail',
              params: {
                name: partyName,
                partyId: generatedPartyId,
                game: selectedGame.name,
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
        <ThemedText style={styles.headerTitle}>Create Party</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Game Selection Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Select Game</ThemedText>
          <View style={styles.gameSelectionRow}>
            {AVAILABLE_GAMES.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.gameOption,
                  selectedGame?.id === game.id && styles.gameOptionSelected
                ]}
                onPress={() => setSelectedGame(game)}
              >
                <Image source={game.logo} style={styles.gameOptionLogo} />
                <ThemedText style={[
                  styles.gameOptionName,
                  selectedGame?.id === game.id && styles.gameOptionNameSelected
                ]}>{game.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cover Photo Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Cover Photo</ThemedText>
          <ThemedText style={styles.cardSubtitle}>Add a cover photo to make your party stand out</ThemedText>

          {coverPhoto ? (
            <View style={styles.coverPhotoPreviewContainer}>
              <Image source={{ uri: coverPhoto }} style={styles.coverPhotoPreview} />
              <View style={styles.coverPhotoActions}>
                <TouchableOpacity style={styles.coverPhotoActionButton} onPress={handlePickCoverPhoto}>
                  <IconSymbol size={16} name="arrow.triangle.2.circlepath" color="#fff" />
                  <ThemedText style={styles.coverPhotoActionText}>Change</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.coverPhotoActionButton, styles.coverPhotoRemoveButton]} onPress={handleRemoveCoverPhoto}>
                  <IconSymbol size={16} name="xmark" color="#ff4444" />
                  <ThemedText style={[styles.coverPhotoActionText, { color: '#ff4444' }]}>Remove</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.coverPhotoPlaceholder} onPress={handlePickCoverPhoto}>
              <IconSymbol size={32} name="photo.badge.plus" color="#666" />
              <ThemedText style={styles.coverPhotoPlaceholderText}>Tap to add cover photo</ThemedText>
            </TouchableOpacity>
          )}
        </View>

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

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Invite Code</ThemedText>
            <TouchableOpacity style={styles.codeButton} onPress={handleCopyInviteCode}>
              <ThemedText style={styles.codeText}>{inviteCode}</ThemedText>
              <IconSymbol size={14} name="doc.on.doc" color="#888" />
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
        <TouchableOpacity
          style={[styles.createButton, uploadingCover && styles.createButtonDisabled]}
          onPress={handleCreateParty}
          disabled={uploadingCover}
        >
          {uploadingCover ? (
            <View style={styles.createButtonLoading}>
              <ActivityIndicator size="small" color="#fff" />
              <ThemedText style={styles.createButtonText}>Uploading...</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.createButtonText}>Create Party</ThemedText>
          )}
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
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#555',
    marginBottom: 12,
  },
  coverPhotoPreviewContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  coverPhotoPreview: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
  coverPhotoActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  coverPhotoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#252525',
    borderRadius: 8,
  },
  coverPhotoRemoveButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  coverPhotoActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#252525',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverPhotoPlaceholderText: {
    fontSize: 13,
    color: '#666',
  },
  gameSelectionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gameOption: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  gameOptionSelected: {
    backgroundColor: '#2a2020',
    borderColor: '#c42743',
  },
  gameOptionLogo: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  gameOptionName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textAlign: 'center',
  },
  gameOptionNameSelected: {
    color: '#fff',
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
