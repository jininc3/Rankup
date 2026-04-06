import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import StepProgressIndicator from '@/components/ui/StepProgressIndicator';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/config/firebase';
import { doc, updateDoc, addDoc, collection, Timestamp, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video, ResizeMode } from 'expo-av';
import { uploadProfilePicture, uploadCoverPhoto } from '@/services/storageService';
import { Asset } from 'expo-asset';

const { width: screenWidth } = Dimensions.get('window');

const availableGames = [
  { id: 'valorant', name: 'Valorant' },
  { id: 'league', name: 'League of Legends' },
];

// Default avatar assets (local images)
const defaultAvatarAssets = [
  require('@/assets/images/avatar1.png'),
  require('@/assets/images/avatar2.png'),
  require('@/assets/images/avatar3.png'),
  require('@/assets/images/avatar4.png'),
  require('@/assets/images/avatar5.png'),
];

export default function OnboardingSignUp4() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, refreshUser } = useAuth();

  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Get profile data from params
  const username = params.username as string;
  const avatarType = params.avatarType as string;
  const avatarValue = params.avatarValue as string;
  const bio = params.bio as string;
  const discordLink = params.discordLink as string;
  const instagramLink = params.instagramLink as string;
  const coverPhotoUri = params.coverPhotoUri as string;

  const getAvatarSource = () => {
    if (avatarType === 'custom' && avatarValue) {
      return { uri: avatarValue };
    }
    if (avatarType === 'default' && avatarValue) {
      const index = parseInt(avatarValue, 10);
      if (!isNaN(index) && index >= 0 && index < defaultAvatarAssets.length) {
        return defaultAvatarAssets[index];
      }
    }
    return null;
  };

  const handleSelectVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload videos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const MAX_VIDEO_SIZE_MB = 20;
      const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileSizeInMB = (blob.size / (1024 * 1024)).toFixed(2);

      if (blob.size > MAX_VIDEO_SIZE_BYTES) {
        Alert.alert(
          'Video Too Large',
          `The selected video is ${fileSizeInMB} MB. Please select a video under ${MAX_VIDEO_SIZE_MB} MB.`
        );
        return;
      }

      setSelectedVideo(asset);
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
  };

  const saveProfileData = async () => {
    if (!user?.id) return;

    // Get params
    const username = params.username as string;
    const dateOfBirth = params.dateOfBirth as string;
    const avatarType = params.avatarType as string;
    const avatarValue = params.avatarValue as string;
    const bio = params.bio as string;
    const discordLink = params.discordLink as string;
    const instagramLink = params.instagramLink as string;
    const coverPhotoUri = params.coverPhotoUri as string;
    const enabledRankCardsParam = params.enabledRankCards as string;

    console.log('Saving profile with params:', { avatarType, avatarValue, username });

    // Prepare avatar URL - upload to Firebase Storage
    let avatarUrl: string | undefined;
    if (avatarType === 'custom' && avatarValue) {
      // Custom avatar from gallery - upload the image
      avatarUrl = await uploadProfilePicture(user.id, avatarValue);
      console.log('Uploaded custom avatar:', avatarUrl);
    } else if (avatarType === 'default') {
      // Default avatar from local assets - upload to Firebase Storage
      const index = parseInt(avatarValue, 10);
      if (!isNaN(index) && index >= 0 && index < defaultAvatarAssets.length) {
        try {
          console.log('Uploading default avatar index:', index);
          // Load the local asset
          const asset = Asset.fromModule(defaultAvatarAssets[index]);
          await asset.downloadAsync();

          if (asset.localUri) {
            // Upload the local asset to Firebase Storage
            avatarUrl = await uploadProfilePicture(user.id, asset.localUri);
            console.log('Uploaded default avatar:', avatarUrl);
          }
        } catch (error) {
          console.error('Error uploading default avatar:', error);
        }
      }
    }

    // Fallback: if no avatar was set, upload a random default
    if (!avatarUrl) {
      try {
        const randomIndex = Math.floor(Math.random() * defaultAvatarAssets.length);
        console.log('Uploading fallback random avatar:', randomIndex);
        const asset = Asset.fromModule(defaultAvatarAssets[randomIndex]);
        await asset.downloadAsync();

        if (asset.localUri) {
          avatarUrl = await uploadProfilePicture(user.id, asset.localUri);
          console.log('Uploaded fallback avatar:', avatarUrl);
        }
      } catch (error) {
        console.error('Error uploading fallback avatar:', error);
      }
    }

    // Upload cover photo if provided
    let coverPhotoUrl: string | undefined;
    if (coverPhotoUri) {
      try {
        coverPhotoUrl = await uploadCoverPhoto(user.id, coverPhotoUri);
        console.log('Cover photo uploaded:', coverPhotoUrl);
      } catch (error) {
        console.error('Error uploading cover photo:', error);
      }
    }

    // Update user profile - only set fields that have values
    // (email signup already saves username, dateOfBirth, avatar before verification)
    const updateData: any = {
      needsUsernameSetup: false,
      updatedAt: new Date(),
    };

    // Only set these if they have values (avoids overwriting already-saved data from email signup)
    if (username) {
      updateData.username = username.toLowerCase();
    }
    if (dateOfBirth) {
      updateData.dateOfBirth = dateOfBirth;
    }
    if (avatarUrl) {
      updateData.avatar = avatarUrl;
    }

    if (coverPhotoUrl) {
      updateData.coverPhoto = coverPhotoUrl;
    }
    if (bio) {
      updateData.bio = bio;
    }
    if (discordLink) {
      updateData.discordLink = discordLink;
    }
    if (instagramLink) {
      updateData.instagramLink = instagramLink;
    }

    // Parse and save enabled rank cards
    if (enabledRankCardsParam) {
      try {
        const enabledRankCards = JSON.parse(enabledRankCardsParam);
        if (Array.isArray(enabledRankCards)) {
          updateData.enabledRankCards = enabledRankCards;
          console.log('Saving enabledRankCards:', enabledRankCards);
        }
      } catch (error) {
        console.error('Error parsing enabledRankCards:', error);
      }
    }

    await updateDoc(doc(db, 'users', user.id), updateData);
  };

  const uploadClip = async () => {
    if (!user?.id || !selectedVideo || !selectedGame) return;

    const timestamp = Date.now();
    const fileExtension = selectedVideo.uri.split('.').pop() || 'mp4';
    const fileName = `posts/${user.id}/${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    // Upload video
    const response = await fetch(selectedVideo.uri);
    const blob = await response.blob();
    const uploadTask = await uploadBytesResumable(storageRef, blob);
    const downloadURL = await getDownloadURL(uploadTask.ref);

    // Generate thumbnail
    let thumbnailUrl: string | undefined;
    try {
      const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(selectedVideo.uri, {
        time: 1000,
      });
      const thumbnailFileName = `posts/${user.id}/${timestamp}_thumb.jpg`;
      const thumbnailRef = ref(storage, thumbnailFileName);
      const thumbnailResponse = await fetch(thumbnailUri);
      const thumbnailBlob = await thumbnailResponse.blob();
      const thumbnailUploadTask = await uploadBytesResumable(thumbnailRef, thumbnailBlob);
      thumbnailUrl = await getDownloadURL(thumbnailUploadTask.ref);
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
    }

    // Get username from params
    const username = params.username as string;

    // Create post
    const postData: any = {
      userId: user.id,
      username: username?.toLowerCase() || user.email?.split('@')[0] || 'User',
      mediaUrl: downloadURL,
      mediaUrls: [downloadURL],
      mediaType: 'video',
      mediaTypes: ['video'],
      taggedGame: selectedGame,
      createdAt: Timestamp.now(),
      likes: 0,
    };

    if (thumbnailUrl) {
      postData.thumbnailUrl = thumbnailUrl;
    }
    if (caption.trim()) {
      postData.caption = caption.trim();
    }
    if (selectedVideo.duration) {
      postData.duration = Math.round(selectedVideo.duration / 1000);
    }

    await addDoc(collection(db, 'posts'), postData);

    // Increment posts count
    await updateDoc(doc(db, 'users', user.id), {
      postsCount: increment(1),
    });
  };

  const handleFinish = async () => {
    setLoading(true);

    try {
      // Save profile data
      await saveProfileData();

      // Upload clip if selected
      if (selectedVideo && selectedGame) {
        await uploadClip();
      }

      // Refresh user and navigate to profile with refresh flag
      await refreshUser();
      router.replace('/(tabs)/profile?refresh=true');
    } catch (error) {
      console.error('Error finishing setup:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);

    try {
      // Save profile data without clip
      await saveProfileData();
      await refreshUser();
      router.replace('/(tabs)/profile?refresh=true');
    } catch (error) {
      console.error('Error finishing setup:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const canFinish = selectedVideo && selectedGame;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={loading}>
            <IconSymbol size={20} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.title}>First Clip</ThemedText>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={loading}>
            <ThemedText style={styles.skipText}>Skip</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <StepProgressIndicator currentStep={5} totalSteps={5} />
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.subtitle}>
            Share your first gaming clip (optional)
          </ThemedText>

          {/* Video Selection Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol size={18} name="video.fill" color="#72767d" />
              <ThemedText style={styles.cardHeaderTitle}>Video</ThemedText>
            </View>

            {!selectedVideo ? (
              <TouchableOpacity style={styles.addMediaButton} onPress={handleSelectVideo} activeOpacity={0.6}>
                <View style={styles.addMediaContent}>
                  <View style={styles.addMediaIconWrapper}>
                    <IconSymbol size={24} name="plus" color="#666" />
                  </View>
                  <ThemedText style={styles.addMediaTitle}>Add Video</ThemedText>
                  <ThemedText style={styles.addMediaSubtext}>Tap to select - Max 20 MB</ThemedText>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.mediaPreviewContainer}>
                <Video
                  source={{ uri: selectedVideo.uri }}
                  style={styles.mediaPreview}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                />
                <TouchableOpacity style={styles.removeMediaButton} onPress={handleRemoveVideo}>
                  <IconSymbol size={20} name="xmark" color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Caption Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol size={18} name="text.alignleft" color="#72767d" />
              <ThemedText style={styles.cardHeaderTitle}>Caption</ThemedText>
            </View>
            <View style={styles.captionContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor="#4a4d52"
                multiline
                value={caption}
                onChangeText={setCaption}
                maxLength={500}
              />
            </View>
          </View>

          {/* Game Tag Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol size={18} name="gamecontroller.fill" color="#72767d" />
              <ThemedText style={styles.cardHeaderTitle}>Game Tag</ThemedText>
              {selectedVideo && !selectedGame && (
                <View style={styles.requiredBadge}>
                  <ThemedText style={styles.requiredText}>Required</ThemedText>
                </View>
              )}
            </View>
            <View style={styles.gameOptionsContainer}>
              {availableGames.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={[
                    styles.gameOption,
                    selectedGame === game.id && styles.gameOptionSelected,
                  ]}
                  onPress={() => setSelectedGame(selectedGame === game.id ? null : game.id)}
                  activeOpacity={0.7}
                >
                  <ThemedText
                    style={[
                      styles.gameOptionText,
                      selectedGame === game.id && styles.gameOptionTextSelected,
                    ]}
                  >
                    {game.name}
                  </ThemedText>
                  {selectedGame === game.id && (
                    <IconSymbol size={16} name="checkmark" color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preview Profile Button */}
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setShowPreview(true)}
            activeOpacity={0.7}
          >
            <IconSymbol size={16} name="eye.fill" color="#D4A843" />
            <ThemedText style={styles.previewButtonText}>Preview Profile</ThemedText>
          </TouchableOpacity>

          {/* Finish Button */}
          <TouchableOpacity
            style={[
              styles.finishButton,
              (loading || (selectedVideo && !selectedGame)) && styles.finishButtonDisabled,
            ]}
            onPress={handleFinish}
            disabled={loading || (selectedVideo && !selectedGame) as boolean}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.finishButtonText}>
                {selectedVideo ? 'Share & Finish' : 'Finish Setup'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <ThemedText style={styles.previewTitle}>Profile Preview</ThemedText>
            <TouchableOpacity
              style={styles.previewCloseButton}
              onPress={() => setShowPreview(false)}
            >
              <IconSymbol size={24} name="xmark" color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.previewContent} showsVerticalScrollIndicator={false}>
            {/* Cover Photo */}
            <View style={styles.previewCoverContainer}>
              {coverPhotoUri ? (
                <Image source={{ uri: coverPhotoUri }} style={styles.previewCoverImage} />
              ) : (
                <View style={styles.previewCoverPlaceholder} />
              )}
            </View>

            {/* Profile Info */}
            <View style={styles.previewProfileSection}>
              {/* Avatar and Username Row */}
              <View style={styles.previewUsernameRow}>
                <ThemedText style={styles.previewUsername}>{username || 'username'}</ThemedText>
                <View style={styles.previewAvatarContainer}>
                  {getAvatarSource() ? (
                    <Image source={getAvatarSource()!} style={styles.previewAvatar} />
                  ) : (
                    <View style={styles.previewAvatarPlaceholder}>
                      <ThemedText style={styles.previewAvatarInitial}>
                        {username?.[0]?.toUpperCase() || 'U'}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.previewStatsRow}>
                <View style={styles.previewStatItem}>
                  <ThemedText style={styles.previewStatNumber}>0</ThemedText>
                  <ThemedText style={styles.previewStatLabel}> Followers</ThemedText>
                </View>
                <View style={styles.previewStatDivider} />
                <View style={styles.previewStatItem}>
                  <ThemedText style={styles.previewStatNumber}>0</ThemedText>
                  <ThemedText style={styles.previewStatLabel}> Following</ThemedText>
                </View>
              </View>

              {/* Social Icons */}
              <View style={styles.previewSocialRow}>
                <View style={[styles.previewSocialIcon, !instagramLink && styles.previewSocialIconInactive]}>
                  <Image
                    source={require('@/assets/images/instagram.png')}
                    style={styles.previewSocialImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.previewSocialIcon, !discordLink && styles.previewSocialIconInactive]}>
                  <Image
                    source={require('@/assets/images/discord.png')}
                    style={styles.previewSocialImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.previewSocialIcon}>
                  <IconSymbol size={18} name="envelope.fill" color="#fff" />
                </View>
              </View>

              {/* Bio */}
              <View style={styles.previewBioSection}>
                <ThemedText style={styles.previewBio}>
                  {bio || 'No bio yet...'}
                </ThemedText>
              </View>

              {/* Clips Section */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <IconSymbol size={16} name="play.fill" color="#fff" />
                  <ThemedText style={styles.previewSectionTitle}>Clips</ThemedText>
                </View>
                {selectedVideo ? (
                  <View style={styles.previewClipContainer}>
                    <Video
                      source={{ uri: selectedVideo.uri }}
                      style={styles.previewClipVideo}
                      useNativeControls
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={false}
                    />
                    {selectedGame && (
                      <View style={styles.previewClipGameTag}>
                        <ThemedText style={styles.previewClipGameTagText}>
                          {availableGames.find(g => g.id === selectedGame)?.name}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.previewEmptyState}>
                    <ThemedText style={styles.previewEmptyText}>No clips yet</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.previewFooter}>
            <ThemedText style={styles.previewFooterText}>
              This is how your profile will appear to others
            </ThemedText>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#666" />
            <ThemedText style={styles.loadingText}>
              {selectedVideo ? 'Uploading clip...' : 'Setting up profile...'}
            </ThemedText>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    padding: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4A843',
  },
  progressContainer: {
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#151515',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  addMediaButton: {
    margin: 12,
    marginTop: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    backgroundColor: '#1a1a1a',
  },
  addMediaContent: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addMediaIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addMediaTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  addMediaSubtext: {
    fontSize: 11,
    color: '#555',
  },
  mediaPreviewContainer: {
    position: 'relative',
    height: (screenWidth - 48) * 0.5625,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionContainer: {
    padding: 14,
    paddingTop: 0,
  },
  captionInput: {
    fontSize: 14,
    color: '#999',
    minHeight: 60,
    textAlignVertical: 'top',
    padding: 10,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  requiredBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  requiredText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#555',
  },
  gameOptionsContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    paddingTop: 0,
  },
  gameOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  gameOptionSelected: {
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#444',
  },
  gameOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  gameOptionTextSelected: {
    color: '#999',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4A843',
    marginBottom: 12,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4A843',
  },
  // Preview Modal
  previewModal: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  previewCloseButton: {
    padding: 4,
  },
  previewContent: {
    flex: 1,
  },
  previewCoverContainer: {
    width: '100%',
    height: 180,
  },
  previewCoverImage: {
    width: '100%',
    height: '100%',
  },
  previewCoverPlaceholder: {
    flex: 1,
    backgroundColor: '#2c2f33',
  },
  previewProfileSection: {
    paddingHorizontal: 20,
  },
  previewUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  previewUsername: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  previewAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2c2f33',
  },
  previewAvatar: {
    width: '100%',
    height: '100%',
  },
  previewAvatarPlaceholder: {
    flex: 1,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  previewStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewStatNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  previewStatLabel: {
    fontSize: 14,
    color: '#72767d',
  },
  previewStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#72767d',
    marginHorizontal: 12,
  },
  previewSocialRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  previewSocialIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSocialIconInactive: {
    opacity: 0.4,
  },
  previewSocialImage: {
    width: 18,
    height: 18,
  },
  previewBioSection: {
    marginBottom: 24,
  },
  previewBio: {
    fontSize: 14,
    color: '#b9bbbe',
    lineHeight: 20,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  previewClipContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  previewClipVideo: {
    width: '100%',
    height: (screenWidth - 40) * 0.5625,
  },
  previewClipGameTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewClipGameTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  previewEmptyState: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
  },
  previewEmptyText: {
    fontSize: 13,
    color: '#666',
  },
  previewFooter: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingBottom: 36,
  },
  previewFooterText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  finishButton: {
    backgroundColor: '#D4A843',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 'auto',
  },
  finishButtonDisabled: {
    backgroundColor: '#3a3f44',
  },
  finishButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#151515',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
});
