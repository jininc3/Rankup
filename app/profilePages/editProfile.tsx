import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useNavigation } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/authService';
import { uploadProfilePicture, uploadCoverPhoto } from '@/services/storageService';
import * as ImagePicker from 'expo-image-picker';
import { db } from '@/config/firebase';
import { doc } from 'firebase/firestore';

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || user?.username?.[0] || 'U');
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatar || null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(user?.coverPhoto || null);
  const [discord, setDiscord] = useState(user?.discordLink || '');
  const [instagram, setInstagram] = useState(user?.instagramLink || '');
  const [isLoading, setIsLoading] = useState(false);
  const [changesSaved, setChangesSaved] = useState(false);

  // Pending changes (not saved until "Save Changes" is pressed)
  const [pendingProfileImageUri, setPendingProfileImageUri] = useState<string | null>(null);
  const [pendingCoverPhotoUri, setPendingCoverPhotoUri] = useState<string | null>(null);
  const [pendingRemoveProfileImage, setPendingRemoveProfileImage] = useState(false);
  const [pendingRemoveCoverPhoto, setPendingRemoveCoverPhoto] = useState(false);
  const [postsCount, setPostsCount] = useState(0);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || user.username?.[0] || 'U');
      setProfileImage(user.avatar || null);
      setCoverPhoto(user.coverPhoto || null);
      setDiscord(user.discordLink || '');
      setInstagram(user.instagramLink || '');
    }
  }, [user]);

  // Intercept back navigation (including swipe gestures)
  useEffect(() => {
    const beforeRemoveListener = (e: any) => {
      // If changes were saved, allow navigation without confirmation
      if (changesSaved) {
        return;
      }

      // Check if any field has changed from original user data
      const changesExist =
        username !== (user?.username || '') ||
        bio !== (user?.bio || '') ||
        discord !== (user?.discordLink || '') ||
        instagram !== (user?.instagramLink || '') ||
        pendingProfileImageUri !== null ||
        pendingCoverPhotoUri !== null ||
        pendingRemoveProfileImage ||
        pendingRemoveCoverPhoto;

      if (!changesExist) {
        // If no changes, allow navigation
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Show confirmation dialog
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              // Allow navigation to proceed
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    };

    // Add the listener
    navigation.addListener('beforeRemove', beforeRemoveListener);

    // Clean up
    return () => {
      navigation.removeListener('beforeRemove', beforeRemoveListener);
    };
  }, [navigation, username, bio, discord, instagram, pendingProfileImageUri, pendingCoverPhotoUri, pendingRemoveProfileImage, pendingRemoveCoverPhoto, user, changesSaved]);

  const showImageOptions = () => {
    const options: any[] = [
      {
        text: 'Take Photo',
        onPress: () => takePhoto(),
      },
      {
        text: 'Choose from Library',
        onPress: () => pickImage(),
      },
    ];

    // Add remove option if user has a profile picture
    if (profileImage) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => removeProfilePicture(),
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      options,
      { cancelable: true }
    );
  };

  const takePhoto = async () => {
    try {
      // Request camera permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Store the URI locally - don't upload until save
        setPendingProfileImageUri(result.assets[0].uri);
        setPendingRemoveProfileImage(false);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Store the URI locally - don't upload until save
        setPendingProfileImageUri(result.assets[0].uri);
        setPendingRemoveProfileImage(false);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const showCoverPhotoOptions = () => {
    const options: any[] = [
      {
        text: 'Take Photo',
        onPress: () => takeCoverPhoto(),
      },
      {
        text: 'Choose from Library',
        onPress: () => pickCoverPhoto(),
      },
    ];

    // Add remove option if user has a cover photo
    if (coverPhoto) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => removeCoverPhoto(),
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert(
      'Change Cover Photo',
      'Choose an option',
      options,
      { cancelable: true }
    );
  };

  const takeCoverPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Store the URI locally - don't upload until save
        setPendingCoverPhotoUri(result.assets[0].uri);
        setPendingRemoveCoverPhoto(false);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickCoverPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Store the URI locally - don't upload until save
        setPendingCoverPhotoUri(result.assets[0].uri);
        setPendingRemoveCoverPhoto(false);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeProfilePicture = () => {
    Alert.alert(
      'Remove Profile Picture',
      'This will be applied when you press "Save Changes"',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Mark for removal - don't actually remove until save
            setPendingRemoveProfileImage(true);
            setPendingProfileImageUri(null);
          },
        },
      ]
    );
  };

  const removeCoverPhoto = () => {
    Alert.alert(
      'Remove Cover Photo',
      'This will be applied when you press "Save Changes"',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Mark for removal - don't actually remove until save
            setPendingRemoveCoverPhoto(true);
            setPendingCoverPhotoUri(null);
          },
        },
      ]
    );
  };

  const hasChanges = () => {
    // Check if any field has changed from original user data
    if (username !== (user?.username || '')) return true;
    if (bio !== (user?.bio || '')) return true;
    if (discord !== (user?.discordLink || '')) return true;
    if (instagram !== (user?.instagramLink || '')) return true;
    if (pendingProfileImageUri !== null) return true;
    if (pendingCoverPhotoUri !== null) return true;
    if (pendingRemoveProfileImage) return true;
    if (pendingRemoveCoverPhoto) return true;
    return false;
  };

  const handleBack = () => {
    if (hasChanges()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    if (bio.length > 150) {
      Alert.alert('Error', 'Bio must be 150 characters or less');
      return;
    }

    // Show confirmation dialog before saving
    Alert.alert(
      'Save Changes?',
      'Are you sure you want to save these changes to your profile?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: async () => {
            try {
              setIsLoading(true);

              // Prepare update data
              const updateData: any = {
                username: username.trim().toLowerCase(),
                bio: bio.trim(),
                discordLink: discord.trim(),
                instagramLink: instagram.trim(),
              };

              // Handle profile image changes
              if (pendingRemoveProfileImage) {
                // User wants to remove profile picture
                updateData.avatar = '';
              } else if (pendingProfileImageUri) {
                // User selected a new profile picture - upload it
                const avatarUrl = await uploadProfilePicture(user.id, pendingProfileImageUri);
                updateData.avatar = avatarUrl;
              }

              // Handle cover photo changes
              if (pendingRemoveCoverPhoto) {
                // User wants to remove cover photo
                updateData.coverPhoto = '';
              } else if (pendingCoverPhotoUri) {
                // User selected a new cover photo - upload it
                const coverUrl = await uploadCoverPhoto(user.id, pendingCoverPhotoUri);
                updateData.coverPhoto = coverUrl;
              }

              // Save all changes at once
              await updateUserProfile(user.id, updateData);

              // Refresh user data to reflect changes
              await refreshUser();

              // Mark changes as saved to skip confirmation dialog
              setChangesSaved(true);

              // Navigate back to profile immediately after saving
              router.back();
            } catch (error: any) {
              console.error('Profile update error:', error);
              Alert.alert('Error', error.message || 'Failed to update profile');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <IconSymbol size={28} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cover Photo Section */}
        <View style={styles.headerSection}>
          <View style={styles.coverPhotoWrapper}>
            {pendingRemoveCoverPhoto ? (
              <View style={styles.coverPhotoGradient} />
            ) : pendingCoverPhotoUri ? (
              <Image source={{ uri: pendingCoverPhotoUri }} style={styles.coverPhotoImage} />
            ) : coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={styles.coverPhotoImage} />
            ) : (
              <View style={styles.coverPhotoGradient} />
            )}
            <TouchableOpacity
              style={styles.editCoverButton}
              onPress={showCoverPhotoOptions}
              disabled={isLoading}
            >
              <IconSymbol size={24} name="camera.fill" color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Profile Card - matches profile.tsx */}
          <View style={styles.profileCard}>
            {/* Top Row: Avatar on Left, Username + Stats on Right */}
            <View style={styles.profileTopRow}>
              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarCircle}>
                  {pendingRemoveProfileImage ? (
                    <ThemedText style={styles.avatarInitial}>{user?.username?.[0]?.toUpperCase() || 'U'}</ThemedText>
                  ) : pendingProfileImageUri ? (
                    <Image source={{ uri: pendingProfileImageUri }} style={styles.avatarImage} />
                  ) : profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                  ) : (
                    <ThemedText style={styles.avatarInitial}>{avatar}</ThemedText>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.editAvatarButton}
                  onPress={showImageOptions}
                  disabled={isLoading}
                >
                  <IconSymbol size={18} name="camera.fill" color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Right Side: Username and Stats */}
              <View style={styles.profileRightSide}>
                {/* Editable Username */}
                <TextInput
                  style={styles.usernameInput}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase())}
                  placeholder="Username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />

                {/* Stats in individual cards */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statNumber}>{postsCount}</ThemedText>
                    <ThemedText style={styles.statLabel}>Posts</ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statNumber}>{user?.followersCount || 0}</ThemedText>
                    <ThemedText style={styles.statLabel}>Followers</ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statNumber}>{user?.followingCount || 0}</ThemedText>
                    <ThemedText style={styles.statLabel}>Following</ThemedText>
                  </View>
                </View>
              </View>
            </View>

            {/* Bio Row */}
            <View style={styles.bioContainer}>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Add a bio..."
                placeholderTextColor="#72767d"
                multiline
                numberOfLines={3}
                maxLength={150}
              />
              <ThemedText style={styles.characterCount}>{bio.length}/150</ThemedText>
            </View>

            {/* Socials Section */}
            <View style={styles.socialsSection}>
              <ThemedText style={styles.socialsSectionTitle}>Socials</ThemedText>

              {/* Instagram */}
              <View style={styles.socialInputContainer}>
                <View style={styles.socialIconInputWrapper}>
                  <Image
                    source={require('@/assets/images/instagram.png')}
                    style={styles.socialInputIcon}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={styles.socialInput}
                    value={instagram}
                    onChangeText={setInstagram}
                    placeholder="Instagram username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Discord */}
              <View style={styles.socialInputContainer}>
                <View style={styles.socialIconInputWrapper}>
                  <Image
                    source={require('@/assets/images/discord.png')}
                    style={styles.socialInputIcon}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={styles.socialInput}
                    value={discord}
                    onChangeText={setDiscord}
                    placeholder="Discord username"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Save Button at Bottom */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.4,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    position: 'relative',
  },
  coverPhotoWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  coverPhotoImage: {
    width: '100%',
    height: '100%',
  },
  coverPhotoGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: '#667eea',
  },
  editCoverButton: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    marginTop: -24,
    marginHorizontal: 0,
    backgroundColor: '#1e2124',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 12,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  avatarWrapper: {
    marginTop: 0,
    position: 'relative',
  },
  profileRightSide: {
    flex: 1,
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2c2f33',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e2124',
  },
  usernameInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
    padding: 0,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#b9bbbe',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  bioContainer: {
    marginBottom: 10,
    backgroundColor: '#2c2f33',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#40444b',
    padding: 10,
  },
  bioInput: {
    fontSize: 12,
    color: '#b9bbbe',
    lineHeight: 16,
    fontWeight: '400',
    padding: 0,
    textAlignVertical: 'top',
    minHeight: 48,
  },
  characterCount: {
    fontSize: 10,
    color: '#72767d',
    marginTop: 4,
    textAlign: 'right',
  },
  socialsSection: {
    marginTop: 8,
  },
  socialsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  socialInputContainer: {
    marginBottom: 12,
  },
  socialIconInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#36393e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2c2f33',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  socialInputIcon: {
    width: 24,
    height: 24,
  },
  socialInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    padding: 0,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e2124',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#2c2f33',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    backgroundColor: '#c42743',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
