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
import { ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

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
  caption?: string;
  taggedUsers?: any[];
  taggedGame?: string;
  createdAt: any;
  likes: number;
  commentsCount?: number;
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
  const postPreviewScrollRef = useRef<ScrollView>(null);
  const captionInputRef = useRef<View>(null);

  const handleAddPhoto = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload images and videos.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
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
      Alert.alert('Error', 'Please add at least one photo or video');
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

        // Generate thumbnail for first video
        if (media.type === 'video' && i === 0) {
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(
              media.uri,
              {
                time: 1000, // Get thumbnail at 1 second
              }
            );

            // Upload thumbnail to Firebase Storage
            const thumbnailFileName = `posts/${user.id}/${timestamp}_thumb.jpg`;
            const thumbnailRef = ref(storage, thumbnailFileName);
            const thumbnailResponse = await fetch(uri);
            const thumbnailBlob = await thumbnailResponse.blob();
            const thumbnailUploadTask = await uploadBytesResumable(thumbnailRef, thumbnailBlob);
            thumbnailUrl = await getDownloadURL(thumbnailUploadTask.ref);
          } catch (thumbError) {
            console.error('Error generating thumbnail:', thumbError);
          }
        }

        // Upload the file
        const uploadTask = await uploadBytesResumable(storageRef, blob);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        uploadedMediaUrls.push(downloadURL);
        mediaTypes.push(media.type || 'image');
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
    setShowTagUsersModal(false);
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
              <IconSymbol size={28} name="chevron.left" color="#000" />
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
                  <IconSymbol size={48} name="photo.on.rectangle" color="#000" />
                </View>
                <ThemedText style={styles.addPhotoText}>Add Photo or Video</ThemedText>
                <ThemedText style={styles.addPhotoSubtext}>Tap to select from your library</ThemedText>
                <ThemedText style={styles.addPhotoLimitText}>Video limit: 20 MB</ThemedText>
              </TouchableOpacity>
            ) : (
              <>
                {/* Media Preview with Swipe */}
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
                    {selectedMedia.map((media, index) => (
                      <View key={index} style={{ width: screenWidth, height: 400 }}>
                        {media.type === 'video' ? (
                          <Video
                            source={{ uri: media.uri }}
                            style={styles.postPreviewMedia}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
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
                    ))}
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

                {/* Add More Photos Button */}
                {selectedMedia[0].type !== 'video' && (
                  <TouchableOpacity style={styles.addMorePhotosButton} onPress={handleAddPhoto}>
                    <IconSymbol size={24} name="plus.circle.fill" color="#000" />
                    <ThemedText style={styles.addMorePhotosText}>Add More Photos</ThemedText>
                  </TouchableOpacity>
                )}
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
                placeholderTextColor="#999"
                multiline
                value={caption}
                onChangeText={setCaption}
                maxLength={500}
                onFocus={handleCaptionFocus}
              />
            </View>

            {/* Tag Game Button */}
            <View>
              <TouchableOpacity
                style={styles.postPreviewOptionButton}
                onPress={() => {
                  console.log('Tag Game button pressed');
                  setShowGameDropdown(!showGameDropdown);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.postPreviewOptionLeft}>
                  <IconSymbol size={20} name="gamecontroller.fill" color="#000" />
                  <ThemedText style={styles.postPreviewOptionText}>
                    {selectedPostGame
                      ? availableGames.find(g => g.id === selectedPostGame)?.name || 'Tag Game'
                      : 'Tag Game'}
                  </ThemedText>
                </View>
                <View style={styles.postPreviewOptionRight}>
                  <IconSymbol
                    size={18}
                    name={showGameDropdown ? "chevron.up" : "chevron.down"}
                    color="#999"
                  />
                </View>
              </TouchableOpacity>

              {/* Game Dropdown */}
              {showGameDropdown && (
                <View style={styles.gameDropdown}>
                  {availableGames.map((game) => (
                    <TouchableOpacity
                      key={game.id}
                      style={[
                        styles.gameDropdownItem,
                        selectedPostGame === game.id && styles.gameDropdownItemSelected
                      ]}
                      onPress={() => {
                        setSelectedPostGame(game.id);
                        setShowGameDropdown(false);
                      }}
                    >
                      <View style={styles.gameDropdownItemLeft}>
                        <Image
                          source={game.image}
                          style={styles.gameDropdownItemImage}
                          resizeMode="contain"
                        />
                        <ThemedText style={styles.gameDropdownItemName}>{game.name}</ThemedText>
                      </View>
                      {selectedPostGame === game.id && (
                        <IconSymbol size={20} name="checkmark" color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Tag People Button */}
            <TouchableOpacity
              style={styles.postPreviewOptionButton}
              onPress={() => setShowTagUsersModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.postPreviewOptionLeft}>
                <IconSymbol size={20} name="person.2.fill" color="#000" />
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
                <IconSymbol size={18} name="chevron.right" color="#999" />
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
    backgroundColor: '#fff',
  },
  postPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  postPreviewBackButton: {
    padding: 4,
  },
  postPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  postPreviewShareButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#000',
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
  },
  postPreviewMediaContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  addPhotoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addPhotoText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  addPhotoSubtext: {
    fontSize: 14,
    color: '#999',
  },
  addPhotoLimitText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  addMorePhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  addMorePhotosText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  postPreviewCaptionSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
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
    backgroundColor: '#f5f5f5',
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
    color: '#000',
  },
  postPreviewCaptionInput: {
    fontSize: 15,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  postPreviewOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  postPreviewOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postPreviewOptionText: {
    fontSize: 14,
    color: '#000',
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
    color: '#666',
    marginRight: 8,
  },
  gameDropdown: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  gameDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  gameDropdownItemSelected: {
    backgroundColor: '#f8f9fa',
  },
  gameDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gameDropdownItemIcon: {
    fontSize: 24,
  },
  gameDropdownItemImage: {
    height: 28,
    width: 90,
  },
  gameDropdownItemName: {
    fontSize: 14,
    color: '#000',
  },
});
