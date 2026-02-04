import TagUsersModal, { TaggedUser } from '@/app/components/tagUsersModal';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db, storage } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { addDoc, collection, doc, increment, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  mediaUrl: string;
  mediaUrls?: string[];
  mediaType: 'image' | 'video';
  mediaTypes?: string[];
  thumbnailUrl?: string;
  thumbnailType?: 'auto' | 'frame' | 'custom'; // Track thumbnail source
  caption?: string;
  taggedUsers?: any[];
  taggedGame?: string;
  createdAt: any;
  likes: number;
  commentsCount?: number;
  duration?: number; // Video duration in seconds
}

interface NewPostProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
}

// Available games for tagging
const availableGames = [
  { id: 'valorant', name: 'Valorant', image: require('@/assets/images/valorantText.png') },
  { id: 'league', name: 'League of Legends', image: require('@/assets/images/leagueoflegends.png') },
];

export default function NewPost({ visible, onClose, onPostCreated }: NewPostProps) {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [selectedPostGame, setSelectedPostGame] = useState<string | null>(null);
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [showTagUsersModal, setShowTagUsersModal] = useState(false);
  const [showGameOptions, setShowGameOptions] = useState(false);
  const [thumbnailOption, setThumbnailOption] = useState<'auto' | 'frame' | 'custom'>('auto');
  const [selectedThumbnailUri, setSelectedThumbnailUri] = useState<string | null>(null);
  const [videoFrameOptions, setVideoFrameOptions] = useState<string[]>([]);
  const [showThumbnailOptions, setShowThumbnailOptions] = useState(false);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [generatingFrames, setGeneratingFrames] = useState(false);
  const postPreviewScrollRef = useRef<ScrollView>(null);
  const captionInputRef = useRef<View>(null);

  const handleAddPhoto = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload videos.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      videoMaxDuration: 60, // 60 seconds max for videos
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const MAX_VIDEO_SIZE_MB = 20;
      const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

      // Check video file size
      for (const asset of result.assets) {
        if (asset.type === 'video') {
          // Get file size
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const fileSizeInMB = (blob.size / (1024 * 1024)).toFixed(2);

          if (blob.size > MAX_VIDEO_SIZE_BYTES) {
            Alert.alert(
              'Video Too Large',
              `The selected video is ${fileSizeInMB} MB. Please select a video under ${MAX_VIDEO_SIZE_MB} MB.`,
              [{ text: 'OK' }]
            );
            return; // Don't add the video
          }
        }
      }

      setSelectedMedia([...selectedMedia, ...result.assets]);
      if (selectedMedia.length === 0) {
        setCurrentMediaIndex(0);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newMedia = selectedMedia.filter((_, i) => i !== index);
    setSelectedMedia(newMedia);

    if (currentMediaIndex >= newMedia.length && newMedia.length > 0) {
      setCurrentMediaIndex(newMedia.length - 1);
    }

    // Reset thumbnail selection when video is removed
    if (newMedia.length === 0) {
      setThumbnailOption('auto');
      setSelectedThumbnailUri(null);
      setVideoFrameOptions([]);
    }
  };

  const generateVideoFrames = async () => {
    if (selectedMedia.length === 0 || selectedMedia[0].type !== 'video') {
      Alert.alert('Error', 'Please select a video first');
      return;
    }

    const video = selectedMedia[0];
    const duration = video.duration ? video.duration / 1000 : 30; // Convert to seconds, default to 30s

    setGeneratingFrames(true);
    const frames: string[] = [];
    const timePoints = [0, 0.2, 0.4, 0.6, 0.8, 0.9]; // percentages

    try {
      for (const point of timePoints) {
        const timeMs = Math.floor(duration * point * 1000);
        const { uri } = await VideoThumbnails.getThumbnailAsync(video.uri, {
          time: timeMs,
          quality: 0.8,
        });
        frames.push(uri);
      }
      setVideoFrameOptions(frames);
      setShowFrameSelector(true);
    } catch (error) {
      console.error('Error generating frames:', error);
      Alert.alert('Error', 'Failed to generate video frames. Using auto-generated thumbnail.');
    } finally {
      setGeneratingFrames(false);
    }
  };

  const pickCustomThumbnail = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        // Validate file size (max 5MB)
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image under 5MB');
          return;
        }

        setSelectedThumbnailUri(result.assets[0].uri);
        setThumbnailOption('custom');
        setShowThumbnailOptions(false);
      } catch (error) {
        console.error('Error validating thumbnail:', error);
        Alert.alert('Error', 'Failed to process the selected image');
      }
    }
  };

  const handleSelectVideoFrame = (frameUri: string) => {
    setSelectedThumbnailUri(frameUri);
    setThumbnailOption('frame');
    setShowFrameSelector(false);
    setShowThumbnailOptions(false);
  };

  const handleSharePost = async () => {
    if (!user?.id) return;

    // Check post limit
    const MAX_POSTS = 5;
    const currentPostCount = user.postsCount || 0;

    if (currentPostCount >= MAX_POSTS) {
      Alert.alert(
        'Post Limit Reached',
        `You've reached the maximum of ${MAX_POSTS} posts. Please delete a post before creating a new one.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate that at least one photo/video is selected
    if (selectedMedia.length === 0) {
      Alert.alert('Error', 'Please add at least one video');
      return;
    }

    // Validate that a game tag is selected
    if (!selectedPostGame) {
      Alert.alert('Game Tag Required', 'Please select a game tag before posting');
      return;
    }

    setUploading(true);

    try {
      // Upload all media files
      const uploadedMediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      let thumbnailUrl: string | undefined;
      let videoDuration: number | undefined;

      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i];
        const timestamp = Date.now() + i; // Ensure unique filenames
        const fileExtension = media.uri.split('.').pop() || 'jpg';
        const fileName = `posts/${user.id}/${timestamp}.${fileExtension}`;

        // Create a reference to Firebase Storage
        const storageRef = ref(storage, fileName);

        // Fetch the file from the local URI
        const response = await fetch(media.uri);
        const blob = await response.blob();

        // Generate thumbnail for first video and extract duration
        if (media.type === 'video' && i === 0) {
          // Extract video duration (in milliseconds, convert to seconds)
          if (media.duration) {
            videoDuration = Math.round(media.duration / 1000);
          }

          try {
            let thumbnailUri = selectedThumbnailUri;

            // If no custom/frame selected, generate auto thumbnail
            if (!thumbnailUri || thumbnailOption === 'auto') {
              const { uri } = await VideoThumbnails.getThumbnailAsync(media.uri, {
                time: 1000, // 1 second mark
              });
              thumbnailUri = uri;
            }

            // Upload thumbnail to Firebase Storage
            const thumbnailSuffix = thumbnailOption === 'auto' ? '_thumb' : `_thumb_${thumbnailOption}`;
            const thumbnailFileName = `posts/${user.id}/${timestamp}${thumbnailSuffix}.jpg`;
            const thumbnailRef = ref(storage, thumbnailFileName);
            const thumbnailResponse = await fetch(thumbnailUri);
            const thumbnailBlob = await thumbnailResponse.blob();
            const thumbnailUploadTask = await uploadBytesResumable(thumbnailRef, thumbnailBlob);
            thumbnailUrl = await getDownloadURL(thumbnailUploadTask.ref);
          } catch (thumbError) {
            console.error('Error uploading thumbnail:', thumbError);
          }
        }

        // Upload the file
        const uploadTask = await uploadBytesResumable(storageRef, blob);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        uploadedMediaUrls.push(downloadURL);
        mediaTypes.push(media.type || 'video');
      }

      // Save post metadata to Firestore
      const postData: any = {
        userId: user.id,
        username: user.username || user.email?.split('@')[0] || 'User',
        avatar: user.avatar || null,
        mediaUrl: uploadedMediaUrls[0], // First media as primary
        mediaUrls: uploadedMediaUrls, // All media URLs
        mediaType: mediaTypes[0], // First media type as primary
        mediaTypes: mediaTypes, // All media types
        createdAt: Timestamp.now(),
        likes: 0,
      };

      // Only add optional fields if they have values
      if (thumbnailUrl) {
        postData.thumbnailUrl = thumbnailUrl;
        if (thumbnailOption !== 'auto') {
          postData.thumbnailType = thumbnailOption;
        }
      }
      if (videoDuration) {
        postData.duration = videoDuration;
      }
      if (caption && caption.trim()) {
        postData.caption = caption.trim();
      }
      if (selectedPostGame) {
        postData.taggedGame = selectedPostGame;
      }
      if (taggedUsers.length > 0) {
        // Store tagged users as plain objects (not class instances)
        postData.taggedUsers = taggedUsers.map(user => ({
          userId: user.userId,
          username: user.username,
          avatar: user.avatar || null
        }));
      }

      const postDocRef = await addDoc(collection(db, 'posts'), postData);
      const newPostId = postDocRef.id;

      // Increment user's post count in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        postsCount: increment(1),
      });

      // Send notifications to tagged users
      if (taggedUsers.length > 0) {
        try {
          const now = Timestamp.now();
          const notificationPromises = taggedUsers.map(async (taggedUser) => {
            // Don't notify yourself
            if (taggedUser.userId !== user.id) {
              try {
                const notificationDocRef = doc(
                  db,
                  `users/${taggedUser.userId}/notifications/${user.id}_tag_${newPostId}_${Date.now()}`
                );
                await setDoc(notificationDocRef, {
                  type: 'tag',
                  fromUserId: user.id,
                  fromUsername: user.username || user.email?.split('@')[0] || 'User',
                  fromUserAvatar: user.avatar || null,
                  postId: newPostId,
                  postThumbnail: thumbnailUrl || uploadedMediaUrls[0] || null,
                  read: false,
                  createdAt: now,
                });
              } catch (notifError) {
                console.log('Could not send notification to user:', taggedUser.username, notifError);
              }
            }
          });
          await Promise.all(notificationPromises);
        } catch (error) {
          console.log('Error sending notifications to tagged users:', error);
          // Don't fail the post creation if notifications fail
        }
      }

      setUploading(false);

      // Create the complete post object to pass back
      const createdPost: Post = {
        id: newPostId,
        ...postData,
        commentsCount: 0,
      };

      // Reset state
      setSelectedMedia([]);
      setCurrentMediaIndex(0);
      setCaption('');
      setSelectedPostGame(null);
      setTaggedUsers([]);
      setShowGameOptions(false);
      setThumbnailOption('auto');
      setSelectedThumbnailUri(null);
      setVideoFrameOptions([]);
      setShowThumbnailOptions(false);
      setShowFrameSelector(false);

      Alert.alert('Success', 'Post shared successfully!');

      // Refresh user data and notify parent with the new post
      await refreshUser();
      onPostCreated(createdPost);
      onClose();
    } catch (error) {
      console.error('Error uploading post:', error);
      setUploading(false);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const handleCaptionFocus = () => {
    setTimeout(() => {
      captionInputRef.current?.measureLayout(
        postPreviewScrollRef.current as any,
        (x, y) => {
          postPreviewScrollRef.current?.scrollTo({ y: y - 50, animated: true });
        },
        () => {}
      );
    }, 300);
  };

  const handleClose = () => {
    // Reset state when closing
    setSelectedMedia([]);
    setCurrentMediaIndex(0);
    setCaption('');
    setSelectedPostGame(null);
    setTaggedUsers([]);
    setShowGameDropdown(false);
    setShowGameOptions(false);
    setShowTagUsersModal(false);
    setThumbnailOption('auto');
    setSelectedThumbnailUri(null);
    setVideoFrameOptions([]);
    setShowThumbnailOptions(false);
    setShowFrameSelector(false);
    onClose();
  };

  return (
    <>
      {/* Upload Loading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <ThemedText style={styles.uploadingText}>Uploading post...</ThemedText>
          </View>
        </View>
      )}

      {/* Post Preview Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.postPreviewContainer}
        >
          {/* Header */}
          <View style={styles.postPreviewHeader}>
            <TouchableOpacity
              style={styles.postPreviewBackButton}
              onPress={handleClose}
            >
              <IconSymbol size={28} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.postPreviewTitle}>New Post</ThemedText>
            <TouchableOpacity
              style={styles.postPreviewShareButton}
              onPress={handleSharePost}
              disabled={uploading}
            >
              <ThemedText style={[styles.postPreviewShareText, uploading && styles.postPreviewShareTextDisabled]}>
                {uploading ? 'Sharing...' : 'Share'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={postPreviewScrollRef}
            style={styles.postPreviewContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Add Photo Button - shown when no media */}
            {selectedMedia.length === 0 ? (
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
                <View style={styles.addPhotoIconContainer}>
                  <IconSymbol size={48} name="video" color="#b9bbbe" />
                </View>
                <ThemedText style={styles.addPhotoText}>Add Video</ThemedText>
                <ThemedText style={styles.addPhotoSubtext}>Tap to select from your library</ThemedText>
                <ThemedText style={styles.addPhotoLimitText}>Video limit: 20 MB</ThemedText>
              </TouchableOpacity>
            ) : (
              <>
                {/* Media Preview with Swipe */}
                <View style={styles.mediaTopSpace} />
                <View style={styles.postPreviewMediaContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(event) => {
                      const offsetX = event.nativeEvent.contentOffset.x;
                      const index = Math.round(offsetX / screenWidth);
                      setCurrentMediaIndex(index);
                    }}
                    scrollEventThrottle={16}
                  >
                    {selectedMedia.map((media, index) => {
                      // Use same dimensions as feed: 16:9 for videos, full width for images
                      const mediaHeight = media.type === 'video' ? screenWidth * 0.5625 : screenWidth;

                      return (
                        <View key={index} style={{ width: screenWidth, height: mediaHeight }}>
                          {media.type === 'video' ? (
                            <Video
                              source={{ uri: media.uri }}
                              style={styles.postPreviewMedia}
                              useNativeControls
                              resizeMode={ResizeMode.COVER}
                              shouldPlay={false}
                            />
                          ) : (
                            <Image
                              source={{ uri: media.uri }}
                              style={styles.postPreviewMedia}
                              resizeMode="cover"
                            />
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>

                  {/* Dot indicators */}
                  {selectedMedia.length > 1 && (
                    <View style={styles.dotIndicatorContainer}>
                      {selectedMedia.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.dotIndicator,
                            index === currentMediaIndex && styles.dotIndicatorActive
                          ]}
                        />
                      ))}
                    </View>
                  )}

                  {/* Remove photo button */}
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(currentMediaIndex)}
                  >
                    <IconSymbol size={24} name="xmark.circle.fill" color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Caption Input */}
            <View style={styles.postPreviewCaptionSection} ref={captionInputRef}>
              <View style={styles.postPreviewUserInfo}>
                <View style={styles.postPreviewAvatar}>
                  {user?.avatar && user.avatar.startsWith('http') ? (
                    <Image source={{ uri: user.avatar }} style={styles.postPreviewAvatarImage} />
                  ) : (
                    <ThemedText style={styles.postPreviewAvatarInitial}>
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </ThemedText>
                  )}
                </View>
                <ThemedText style={styles.postPreviewUsername}>{user?.username || 'User'}</ThemedText>
              </View>

              <TextInput
                style={styles.postPreviewCaptionInput}
                placeholder="Write a caption..."
                placeholderTextColor="#72767d"
                multiline
                value={caption}
                onChangeText={setCaption}
                maxLength={500}
                onFocus={handleCaptionFocus}
              />
            </View>

            {/* Thumbnail Selection Expandable Section - Only show when video is selected */}
            {selectedMedia.length > 0 && selectedMedia[0].type === 'video' && (
              <View style={styles.thumbnailSection}>
                <TouchableOpacity
                  style={styles.thumbnailHeader}
                  onPress={() => setShowThumbnailOptions(!showThumbnailOptions)}
                  activeOpacity={0.6}
                >
                  <View style={styles.thumbnailHeaderLeft}>
                    <IconSymbol size={20} name="photo" color="#fff" />
                    <ThemedText style={styles.thumbnailHeaderText}>Thumbnail</ThemedText>
                    {selectedThumbnailUri && thumbnailOption !== 'auto' && (
                      <View style={styles.thumbnailSelectedBadge}>
                        <IconSymbol size={14} name="checkmark" color="#fff" />
                      </View>
                    )}
                  </View>
                  <IconSymbol
                    size={18}
                    name={showThumbnailOptions ? "chevron.up" : "chevron.down"}
                    color="#b9bbbe"
                  />
                </TouchableOpacity>

                {showThumbnailOptions && (
                  <View style={styles.thumbnailOptionsContainer}>
                    {/* Show selected thumbnail preview if exists */}
                    {selectedThumbnailUri && thumbnailOption !== 'auto' && (
                      <View style={styles.thumbnailPreviewContainer}>
                        <Image
                          source={{ uri: selectedThumbnailUri }}
                          style={styles.thumbnailPreview}
                          resizeMode="cover"
                        />
                        <ThemedText style={styles.thumbnailPreviewLabel}>
                          {thumbnailOption === 'frame' ? 'Selected Frame' : 'Custom Thumbnail'}
                        </ThemedText>
                      </View>
                    )}

                    {/* Thumbnail option buttons */}
                    <View style={styles.thumbnailButtonsContainer}>
                      <TouchableOpacity
                        style={styles.thumbnailButton}
                        onPress={generateVideoFrames}
                        disabled={generatingFrames}
                        activeOpacity={0.7}
                      >
                        {generatingFrames ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <IconSymbol size={20} name="film" color="#fff" />
                            <ThemedText style={styles.thumbnailButtonText}>
                              Select Video Frame
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.thumbnailButton}
                        onPress={pickCustomThumbnail}
                        activeOpacity={0.7}
                      >
                        <IconSymbol size={20} name="photo.on.rectangle" color="#fff" />
                        <ThemedText style={styles.thumbnailButtonText}>
                          Upload Custom Image
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.thumbnailButton,
                          thumbnailOption === 'auto' && styles.thumbnailButtonSelected
                        ]}
                        onPress={() => {
                          setThumbnailOption('auto');
                          setSelectedThumbnailUri(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <IconSymbol size={20} name="wand.and.stars" color="#fff" />
                        <ThemedText style={styles.thumbnailButtonText}>
                          Use Auto-Generated
                        </ThemedText>
                        {thumbnailOption === 'auto' && (
                          <IconSymbol size={16} name="checkmark" color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Tag Game Expandable Section */}
            <View style={styles.gameTagSection}>
              <TouchableOpacity
                style={styles.gameTagHeader}
                onPress={() => setShowGameOptions(!showGameOptions)}
                activeOpacity={0.6}
              >
                <View style={styles.gameTagHeaderLeft}>
                  <IconSymbol size={20} name="gamecontroller.fill" color="#fff" />
                  <ThemedText style={styles.gameTagHeaderText}>Tag Game</ThemedText>
                </View>
                <IconSymbol
                  size={18}
                  name={showGameOptions ? "chevron.up" : "chevron.down"}
                  color="#b9bbbe"
                />
              </TouchableOpacity>

              {showGameOptions && (
                <View style={styles.gameButtonsContainer}>
                  {availableGames.map((game) => (
                    <TouchableOpacity
                      key={game.id}
                      style={[
                        styles.gameButton,
                        selectedPostGame === game.id && styles.gameButtonSelected
                      ]}
                      onPress={() => {
                        setSelectedPostGame(selectedPostGame === game.id ? null : game.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[
                        styles.gameButtonText,
                        selectedPostGame === game.id && styles.gameButtonTextSelected
                      ]}>
                        {game.name}
                      </ThemedText>
                      {selectedPostGame === game.id && (
                        <IconSymbol size={16} name="checkmark" color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Tag People Button */}
            <TouchableOpacity
              style={styles.postPreviewOptionButton}
              onPress={() => {
                Keyboard.dismiss();
                setShowTagUsersModal(true);
              }}
              activeOpacity={0.6}
            >
              <View style={styles.postPreviewOptionLeft}>
                <IconSymbol size={20} name="person.2.fill" color="#fff" />
                <ThemedText style={styles.postPreviewOptionText}>
                  {taggedUsers.length > 0
                    ? `${taggedUsers.length} ${taggedUsers.length === 1 ? 'Person' : 'People'} Tagged`
                    : 'Tag People'}
                </ThemedText>
              </View>
              <View style={styles.postPreviewOptionRight}>
                {taggedUsers.length > 0 && (
                  <ThemedText style={styles.taggedUsersPreview}>
                    {taggedUsers.slice(0, 2).map(u => `@${u.username}`).join(', ')}
                    {taggedUsers.length > 2 && '...'}
                  </ThemedText>
                )}
                <IconSymbol size={18} name="chevron.right" color="#b9bbbe" />
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Tag Users Modal - Nested inside Post Preview Modal */}
          <TagUsersModal
            visible={showTagUsersModal}
            onClose={() => setShowTagUsersModal(false)}
            onTagsSelected={(users) => setTaggedUsers(users)}
            initialSelectedUsers={taggedUsers}
          />

          {/* Frame Selector Modal - Nested inside Post Preview Modal */}
          <Modal
            visible={showFrameSelector}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setShowFrameSelector(false)}
          >
            <View style={styles.frameSelectorContainer}>
              {/* Header */}
              <View style={styles.frameSelectorHeader}>
                <TouchableOpacity
                  style={styles.frameSelectorCloseButton}
                  onPress={() => setShowFrameSelector(false)}
                >
                  <IconSymbol size={28} name="xmark" color="#fff" />
                </TouchableOpacity>
                <ThemedText style={styles.frameSelectorTitle}>Select Frame</ThemedText>
                <View style={{ width: 28 }} />
              </View>

              {/* Frame Grid */}
              <ScrollView
                style={styles.frameSelectorContent}
                contentContainerStyle={styles.frameSelectorContentContainer}
              >
                <ThemedText style={styles.frameSelectorSubtitle}>
                  Choose a thumbnail from your video
                </ThemedText>
                <View style={styles.frameGrid}>
                  {videoFrameOptions.map((frameUri, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.frameItem,
                        selectedThumbnailUri === frameUri &&
                        thumbnailOption === 'frame' &&
                        styles.frameItemSelected
                      ]}
                      onPress={() => handleSelectVideoFrame(frameUri)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: frameUri }}
                        style={styles.frameImage}
                        resizeMode="cover"
                      />
                      {selectedThumbnailUri === frameUri && thumbnailOption === 'frame' && (
                        <View style={styles.frameSelectedOverlay}>
                          <View style={styles.frameSelectedBadge}>
                            <IconSymbol size={20} name="checkmark" color="#fff" />
                          </View>
                        </View>
                      )}
                      <ThemedText style={styles.frameLabel}>
                        Frame {index + 1}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  uploadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  uploadingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  postPreviewContainer: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  postPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
    backgroundColor: '#1e2124',
  },
  postPreviewBackButton: {
    padding: 4,
  },
  postPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  postPreviewShareButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#c42743',
    borderRadius: 8,
  },
  postPreviewShareText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  postPreviewShareTextDisabled: {
    opacity: 0.5,
  },
  postPreviewContent: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  mediaTopSpace: {
    height: 12,
    backgroundColor: '#1e2124',
  },
  postPreviewMediaContainer: {
    width: '100%',
    backgroundColor: '#36393e',
    position: 'relative',
  },
  postPreviewMedia: {
    width: '100%',
    height: '100%',
  },
  dotIndicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotIndicatorActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    width: '100%',
    height: 300,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  addPhotoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addPhotoText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  addPhotoSubtext: {
    fontSize: 14,
    color: '#72767d',
  },
  addPhotoLimitText: {
    fontSize: 12,
    color: '#b9bbbe',
    marginTop: 8,
  },
  addMorePhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
    backgroundColor: '#1e2124',
  },
  addMorePhotosText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  postPreviewCaptionSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
    backgroundColor: '#1e2124',
  },
  postPreviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  postPreviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postPreviewAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  postPreviewAvatarInitial: {
    fontSize: 18,
    fontWeight: '600',
  },
  postPreviewUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  postPreviewCaptionInput: {
    fontSize: 15,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
    backgroundColor: '#2c2f33',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderRadius: 8,
  },
  postPreviewOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
    backgroundColor: '#1e2124',
  },
  postPreviewOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postPreviewOptionText: {
    fontSize: 14,
    color: '#fff',
  },
  postPreviewOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedGameIcon: {
    fontSize: 20,
  },
  taggedUsersPreview: {
    fontSize: 13,
    color: '#b9bbbe',
    marginRight: 8,
  },
  gameTagSection: {
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  gameTagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  gameTagHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameTagHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  gameButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  gameButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#36393e',
    borderWidth: 2,
    borderColor: '#36393e',
  },
  gameButtonSelected: {
    backgroundColor: '#c42743',
    borderColor: '#c42743',
  },
  gameButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b9bbbe',
  },
  gameButtonTextSelected: {
    color: '#fff',
  },
  // Thumbnail Section Styles
  thumbnailSection: {
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  thumbnailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  thumbnailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbnailHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  thumbnailSelectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  thumbnailOptionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  thumbnailPreviewContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  thumbnailPreview: {
    width: 160,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#36393e',
  },
  thumbnailPreviewLabel: {
    fontSize: 12,
    color: '#b9bbbe',
    marginTop: 6,
  },
  thumbnailButtonsContainer: {
    gap: 8,
  },
  thumbnailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#36393e',
    borderWidth: 1,
    borderColor: '#36393e',
  },
  thumbnailButtonSelected: {
    backgroundColor: '#c42743',
    borderColor: '#c42743',
  },
  thumbnailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Frame Selector Modal Styles
  frameSelectorContainer: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  frameSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
    backgroundColor: '#1e2124',
  },
  frameSelectorCloseButton: {
    padding: 4,
  },
  frameSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  frameSelectorContent: {
    flex: 1,
  },
  frameSelectorContentContainer: {
    padding: 16,
  },
  frameSelectorSubtitle: {
    fontSize: 14,
    color: '#b9bbbe',
    marginBottom: 16,
    textAlign: 'center',
  },
  frameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  frameItem: {
    width: '48%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#36393e',
    borderWidth: 2,
    borderColor: '#36393e',
  },
  frameItemSelected: {
    borderColor: '#c42743',
  },
  frameImage: {
    width: '100%',
    height: '100%',
  },
  frameSelectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(196, 39, 67, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameSelectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
