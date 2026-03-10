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
  thumbnailType?: 'auto' | 'frame' | 'custom';
  caption?: string;
  taggedUsers?: any[];
  taggedGame?: string;
  createdAt: any;
  likes: number;
  commentsCount?: number;
  duration?: number;
}

interface NewPostProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
}

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
  const [showGameOptions, setShowGameOptions] = useState(true);
  const [thumbnailOption, setThumbnailOption] = useState<'auto' | 'frame' | 'custom'>('auto');
  const [selectedThumbnailUri, setSelectedThumbnailUri] = useState<string | null>(null);
  const [videoFrameOptions, setVideoFrameOptions] = useState<string[]>([]);
  const [showThumbnailOptions, setShowThumbnailOptions] = useState(false);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [generatingFrames, setGeneratingFrames] = useState(false);
  const postPreviewScrollRef = useRef<ScrollView>(null);
  const captionInputRef = useRef<View>(null);

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload videos.',
        [{ text: 'OK' }]
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
      const MAX_VIDEO_SIZE_MB = 20;
      const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

      for (const asset of result.assets) {
        if (asset.type === 'video') {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const fileSizeInMB = (blob.size / (1024 * 1024)).toFixed(2);

          if (blob.size > MAX_VIDEO_SIZE_BYTES) {
            Alert.alert(
              'Video Too Large',
              `The selected video is ${fileSizeInMB} MB. Please select a video under ${MAX_VIDEO_SIZE_MB} MB.`,
              [{ text: 'OK' }]
            );
            return;
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
    const duration = video.duration ? video.duration / 1000 : 30;

    setGeneratingFrames(true);
    const frames: string[] = [];
    const timePoints = [0, 0.2, 0.4, 0.6, 0.8, 0.9];

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

    if (selectedMedia.length === 0) {
      Alert.alert('Error', 'Please add at least one video');
      return;
    }

    if (!selectedPostGame) {
      Alert.alert('Game Tag Required', 'Please select a game tag before posting');
      return;
    }

    setUploading(true);

    try {
      const uploadedMediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      let thumbnailUrl: string | undefined;
      let videoDuration: number | undefined;

      for (let i = 0; i < selectedMedia.length; i++) {
        const media = selectedMedia[i];
        const timestamp = Date.now() + i;
        const fileExtension = media.uri.split('.').pop() || 'jpg';
        const fileName = `posts/${user.id}/${timestamp}.${fileExtension}`;

        const storageRef = ref(storage, fileName);

        const response = await fetch(media.uri);
        const blob = await response.blob();

        if (media.type === 'video' && i === 0) {
          if (media.duration) {
            videoDuration = Math.round(media.duration / 1000);
          }

          try {
            let thumbnailUri = selectedThumbnailUri;

            if (!thumbnailUri || thumbnailOption === 'auto') {
              const { uri } = await VideoThumbnails.getThumbnailAsync(media.uri, {
                time: 1000,
              });
              thumbnailUri = uri;
            }

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

        const uploadTask = await uploadBytesResumable(storageRef, blob);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        uploadedMediaUrls.push(downloadURL);
        mediaTypes.push(media.type || 'video');
      }

      const postData: any = {
        userId: user.id,
        username: user.username || user.email?.split('@')[0] || 'User',
        avatar: user.avatar || null,
        mediaUrl: uploadedMediaUrls[0],
        mediaUrls: uploadedMediaUrls,
        mediaType: mediaTypes[0],
        mediaTypes: mediaTypes,
        createdAt: Timestamp.now(),
        likes: 0,
      };

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
        postData.taggedUsers = taggedUsers.map(user => ({
          userId: user.userId,
          username: user.username,
          avatar: user.avatar || null
        }));
      }

      const postDocRef = await addDoc(collection(db, 'posts'), postData);
      const newPostId = postDocRef.id;

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        postsCount: increment(1),
      });

      if (taggedUsers.length > 0) {
        try {
          const now = Timestamp.now();
          const notificationPromises = taggedUsers.map(async (taggedUser) => {
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
        }
      }

      setUploading(false);

      const createdPost: Post = {
        id: newPostId,
        ...postData,
        commentsCount: 0,
      };

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
            <ActivityIndicator size="small" color="#666" />
            <ThemedText style={styles.uploadingText}>Uploading...</ThemedText>
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
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleClose}
            >
              <IconSymbol size={24} name="xmark" color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>New Post</ThemedText>
            <TouchableOpacity
              style={[styles.shareButton, (!selectedMedia.length || !selectedPostGame) && styles.shareButtonDisabled]}
              onPress={handleSharePost}
              disabled={uploading || !selectedMedia.length || !selectedPostGame}
            >
              <ThemedText style={[styles.shareButtonText, (!selectedMedia.length || !selectedPostGame) && styles.shareButtonTextDisabled]}>
                Share
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={postPreviewScrollRef}
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContentContainer}
          >
            {/* Media Selection Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <IconSymbol size={18} name="video.fill" color="#72767d" />
                <ThemedText style={styles.cardHeaderTitle}>Video</ThemedText>
              </View>

              {selectedMedia.length === 0 ? (
                <TouchableOpacity style={styles.addMediaButton} onPress={handleAddPhoto} activeOpacity={0.6}>
                  <View style={styles.addMediaContent}>
                    <View style={styles.addMediaIconWrapper}>
                      <IconSymbol size={24} name="plus" color="#666" />
                    </View>
                    <ThemedText style={styles.addMediaTitle}>Add Video</ThemedText>
                    <ThemedText style={styles.addMediaSubtext}>Tap to select · Max 20 MB</ThemedText>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.mediaPreviewContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(event) => {
                      const offsetX = event.nativeEvent.contentOffset.x;
                      const index = Math.round(offsetX / (screenWidth - 32));
                      setCurrentMediaIndex(index);
                    }}
                    scrollEventThrottle={16}
                  >
                    {selectedMedia.map((media, index) => {
                      const mediaHeight = media.type === 'video' ? (screenWidth - 32) * 0.5625 : screenWidth - 32;

                      return (
                        <View key={index} style={[styles.mediaItem, { width: screenWidth - 32, height: mediaHeight }]}>
                          {media.type === 'video' ? (
                            <Video
                              source={{ uri: media.uri }}
                              style={styles.mediaPreview}
                              useNativeControls
                              resizeMode={ResizeMode.COVER}
                              shouldPlay={false}
                            />
                          ) : (
                            <Image
                              source={{ uri: media.uri }}
                              style={styles.mediaPreview}
                              resizeMode="cover"
                            />
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>

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

                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => handleRemovePhoto(currentMediaIndex)}
                  >
                    <IconSymbol size={20} name="xmark" color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Caption Card */}
            <View style={styles.card} ref={captionInputRef}>
              <View style={styles.cardHeader}>
                <IconSymbol size={18} name="text.alignleft" color="#72767d" />
                <ThemedText style={styles.cardHeaderTitle}>Caption</ThemedText>
              </View>

              <View style={styles.captionSection}>
                <View style={styles.userRow}>
                  <View style={styles.avatar}>
                    {user?.avatar && user.avatar.startsWith('http') ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                    ) : (
                      <ThemedText style={styles.avatarInitial}>
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.username}>{user?.username || 'User'}</ThemedText>
                </View>

                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption..."
                  placeholderTextColor="#4a4d52"
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={500}
                  onFocus={handleCaptionFocus}
                />
              </View>
            </View>

            {/* Game Tag Card */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeaderTouchable}
                onPress={() => setShowGameOptions(!showGameOptions)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderLeft}>
                  <IconSymbol size={18} name="gamecontroller.fill" color="#72767d" />
                  <ThemedText style={styles.cardHeaderTitle}>Game Tag</ThemedText>
                  {!selectedPostGame && (
                    <View style={styles.requiredBadge}>
                      <ThemedText style={styles.requiredText}>Required</ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.cardHeaderRight}>
                  {selectedPostGame && (
                    <View style={styles.selectedGameBadge}>
                      <ThemedText style={styles.selectedGameText}>
                        {availableGames.find(g => g.id === selectedPostGame)?.name}
                      </ThemedText>
                    </View>
                  )}
                  <IconSymbol
                    size={16}
                    name={showGameOptions ? "chevron.up" : "chevron.down"}
                    color="#4a4d52"
                  />
                </View>
              </TouchableOpacity>

              {showGameOptions && (
                <View style={styles.gameOptionsContainer}>
                  {availableGames.map((game) => (
                    <TouchableOpacity
                      key={game.id}
                      style={[
                        styles.gameOption,
                        selectedPostGame === game.id && styles.gameOptionSelected
                      ]}
                      onPress={() => setSelectedPostGame(selectedPostGame === game.id ? null : game.id)}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[
                        styles.gameOptionText,
                        selectedPostGame === game.id && styles.gameOptionTextSelected
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

            {/* Thumbnail Card - Only show for videos */}
            {selectedMedia.length > 0 && selectedMedia[0].type === 'video' && (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeaderTouchable}
                  onPress={() => setShowThumbnailOptions(!showThumbnailOptions)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeaderLeft}>
                    <IconSymbol size={18} name="photo.fill" color="#72767d" />
                    <ThemedText style={styles.cardHeaderTitle}>Thumbnail</ThemedText>
                    {selectedThumbnailUri && thumbnailOption !== 'auto' && (
                      <View style={styles.customBadge}>
                        <IconSymbol size={12} name="checkmark" color="#fff" />
                      </View>
                    )}
                  </View>
                  <IconSymbol
                    size={16}
                    name={showThumbnailOptions ? "chevron.up" : "chevron.down"}
                    color="#4a4d52"
                  />
                </TouchableOpacity>

                {showThumbnailOptions && (
                  <View style={styles.thumbnailOptionsContainer}>
                    {selectedThumbnailUri && thumbnailOption !== 'auto' && (
                      <View style={styles.thumbnailPreviewContainer}>
                        <Image
                          source={{ uri: selectedThumbnailUri }}
                          style={styles.thumbnailPreview}
                          resizeMode="cover"
                        />
                        <ThemedText style={styles.thumbnailPreviewLabel}>
                          {thumbnailOption === 'frame' ? 'Selected Frame' : 'Custom Image'}
                        </ThemedText>
                      </View>
                    )}

                    <View style={styles.thumbnailButtonsRow}>
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
                            <IconSymbol size={18} name="film" color="#9a9da2" />
                            <ThemedText style={styles.thumbnailButtonText}>Video Frame</ThemedText>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.thumbnailButton}
                        onPress={pickCustomThumbnail}
                        activeOpacity={0.7}
                      >
                        <IconSymbol size={18} name="photo.on.rectangle" color="#9a9da2" />
                        <ThemedText style={styles.thumbnailButtonText}>Custom</ThemedText>
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
                        <IconSymbol size={18} name="wand.and.stars" color={thumbnailOption === 'auto' ? '#fff' : '#9a9da2'} />
                        <ThemedText style={[styles.thumbnailButtonText, thumbnailOption === 'auto' && styles.thumbnailButtonTextSelected]}>Auto</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Tag People Card */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeaderTouchable}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowTagUsersModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderLeft}>
                  <IconSymbol size={18} name="person.2.fill" color="#72767d" />
                  <ThemedText style={styles.cardHeaderTitle}>Tag People</ThemedText>
                </View>
                <View style={styles.cardHeaderRight}>
                  {taggedUsers.length > 0 && (
                    <View style={styles.taggedCountBadge}>
                      <ThemedText style={styles.taggedCountText}>{taggedUsers.length}</ThemedText>
                    </View>
                  )}
                  <IconSymbol size={16} name="chevron.right" color="#4a4d52" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Tag Users Modal */}
          <TagUsersModal
            visible={showTagUsersModal}
            onClose={() => setShowTagUsersModal(false)}
            onTagsSelected={(users) => setTaggedUsers(users)}
            initialSelectedUsers={taggedUsers}
          />

          {/* Frame Selector Modal */}
          <Modal
            visible={showFrameSelector}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setShowFrameSelector(false)}
          >
            <View style={styles.frameSelectorContainer}>
              <View style={styles.frameSelectorHeader}>
                <TouchableOpacity
                  style={styles.frameSelectorCloseButton}
                  onPress={() => setShowFrameSelector(false)}
                >
                  <IconSymbol size={24} name="xmark" color="#fff" />
                </TouchableOpacity>
                <ThemedText style={styles.frameSelectorTitle}>Select Frame</ThemedText>
                <View style={{ width: 24 }} />
              </View>

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
                            <IconSymbol size={18} name="checkmark" color="#fff" />
                          </View>
                        </View>
                      )}
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
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: '#0f0f0f',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0,
  },
  shareButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#2c2f33',
    borderRadius: 6,
  },
  shareButtonDisabled: {
    backgroundColor: 'transparent',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  shareButtonTextDisabled: {
    color: '#444',
  },
  // Content
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    gap: 12,
  },
  // Cards
  card: {
    backgroundColor: '#151515',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeaderTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  // Add Media
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
  // Media Preview
  mediaPreviewContainer: {
    position: 'relative',
  },
  mediaItem: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  dotIndicatorContainer: {
    position: 'absolute',
    bottom: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotIndicatorActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
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
  // Caption
  captionSection: {
    padding: 14,
    gap: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  username: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
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
  // Game Tag
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
  selectedGameBadge: {
    backgroundColor: 'transparent',
  },
  selectedGameText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
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
  // Thumbnail
  customBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  thumbnailOptionsContainer: {
    padding: 14,
    paddingTop: 0,
    gap: 10,
  },
  thumbnailPreviewContainer: {
    alignItems: 'center',
    gap: 6,
  },
  thumbnailPreview: {
    width: 120,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  thumbnailPreviewLabel: {
    fontSize: 10,
    color: '#555',
  },
  thumbnailButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbnailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  thumbnailButtonSelected: {
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#444',
  },
  thumbnailButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#555',
  },
  thumbnailButtonTextSelected: {
    color: '#999',
  },
  // Tag People
  taggedCountBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taggedCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  // Bottom Spacer
  bottomSpacer: {
    height: 40,
  },
  // Upload Overlay
  uploadingOverlay: {
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
  uploadingContainer: {
    backgroundColor: '#151515',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  uploadingSubtext: {
    fontSize: 12,
    color: '#555',
  },
  // Frame Selector Modal
  frameSelectorContainer: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  frameSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: '#0f0f0f',
  },
  frameSelectorCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  frameSelectorContent: {
    flex: 1,
  },
  frameSelectorContentContainer: {
    padding: 16,
  },
  frameSelectorSubtitle: {
    fontSize: 12,
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },
  frameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  frameItem: {
    width: '48%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  frameItemSelected: {
    borderColor: '#444',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameSelectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
