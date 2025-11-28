import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/authService';
import { uploadProfilePicture, uploadCoverPhoto } from '@/services/storageService';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || user?.username?.[0] || 'U');
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatar || null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(user?.coverPhoto || null);
  const [discord, setDiscord] = useState(user?.discordLink || '');
  const [instagram, setInstagram] = useState(user?.instagramLink || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

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
        await uploadImage(result.assets[0].uri);
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
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setIsUploadingImage(true);

      // Upload to Firebase Storage
      if (user) {
        const downloadURL = await uploadProfilePicture(user.id, uri);
        setProfileImage(downloadURL);

        // Update user profile with new avatar URL
        await updateUserProfile(user.id, { avatar: downloadURL });
        await refreshUser();

        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
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
        await uploadCoverImage(result.assets[0].uri);
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
        await uploadCoverImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadCoverImage = async (uri: string) => {
    try {
      setIsUploadingCover(true);

      if (user) {
        const downloadURL = await uploadCoverPhoto(user.id, uri);
        setCoverPhoto(downloadURL);

        await updateUserProfile(user.id, { coverPhoto: downloadURL });
        await refreshUser();

        Alert.alert('Success', 'Cover photo updated!');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload cover photo');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const removeProfilePicture = async () => {
    try {
      if (!user) return;

      Alert.alert(
        'Remove Profile Picture',
        'Are you sure you want to remove your profile picture?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsUploadingImage(true);

                // Remove from Firestore (set to empty string)
                await updateUserProfile(user.id, { avatar: '' });
                setProfileImage(null);
                setAvatar(user.username?.[0] || 'U');

                await refreshUser();

                Alert.alert('Success', 'Profile picture removed');
              } catch (error: any) {
                console.error('Remove error:', error);
                Alert.alert('Error', 'Failed to remove profile picture');
              } finally {
                setIsUploadingImage(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Remove profile picture error:', error);
    }
  };

  const removeCoverPhoto = async () => {
    try {
      if (!user) return;

      Alert.alert(
        'Remove Cover Photo',
        'Are you sure you want to remove your cover photo?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsUploadingCover(true);

                // Remove from Firestore (set to empty string)
                await updateUserProfile(user.id, { coverPhoto: '' });
                setCoverPhoto(null);

                await refreshUser();

                Alert.alert('Success', 'Cover photo removed');
              } catch (error: any) {
                console.error('Remove error:', error);
                Alert.alert('Error', 'Failed to remove cover photo');
              } finally {
                setIsUploadingCover(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Remove cover photo error:', error);
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

    try {
      setIsLoading(true);

      await updateUserProfile(user.id, {
        username: username.trim(),
        bio: bio.trim(),
        discordLink: discord.trim(),
        instagramLink: instagram.trim(),
      });

      // Refresh user data to reflect changes
      await refreshUser();

      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={isLoading}>
          <ThemedText style={[styles.cancelButton, isLoading && styles.disabledText]}>
            Cancel
          </ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <ThemedText style={styles.saveButton}>Save</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cover Photo Section */}
        <View style={styles.coverPhotoSection}>
          <View style={styles.coverPhoto}>
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={styles.coverPhotoImage} />
            ) : null}
            <TouchableOpacity
              style={styles.editCoverButton}
              onPress={showCoverPhotoOptions}
              disabled={isUploadingCover}
            >
              {isUploadingCover ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <IconSymbol size={24} name="camera.fill" color="#fff" />
                  <ThemedText style={styles.editCoverText}>Edit Cover Photo</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <ThemedText style={styles.avatarInitial}>{avatar}</ThemedText>
              )}
            </View>
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={showImageOptions}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconSymbol size={20} name="camera.fill" color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Username Field */}
          <View style={styles.formField}>
            <ThemedText style={styles.fieldLabel}>Username</ThemedText>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor="#999"
            />
          </View>

          {/* Bio Field */}
          <View style={styles.formField}>
            <ThemedText style={styles.fieldLabel}>Bio</ThemedText>
            <TextInput
              style={[styles.textInput, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <ThemedText style={styles.characterCount}>{bio.length}/150</ThemedText>
          </View>

          {/* Socials Section */}
          <View style={styles.socialsSection}>
            <ThemedText style={styles.sectionTitle}>Social Links</ThemedText>

            {/* Discord Field */}
            <View style={styles.socialField}>
              <View style={styles.socialHeader}>
                <IconSymbol size={20} name="link" color="#5865F2" />
                <ThemedText style={styles.socialLabel}>Discord</ThemedText>
              </View>
              <TextInput
                style={styles.textInput}
                value={discord}
                onChangeText={setDiscord}
                placeholder="username#0000"
                placeholderTextColor="#999"
              />
            </View>

            {/* Instagram Field */}
            <View style={styles.socialField}>
              <View style={styles.socialHeader}>
                <IconSymbol size={20} name="link" color="#E4405F" />
                <ThemedText style={styles.socialLabel}>Instagram</ThemedText>
              </View>
              <TextInput
                style={styles.textInput}
                value={instagram}
                onChangeText={setInstagram}
                placeholder="@username"
                placeholderTextColor="#999"
              />
            </View>
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
  cancelButton: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  disabledText: {
    opacity: 0.4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  coverPhotoSection: {
    width: '100%',
    height: 180,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  editCoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
  },
  editCoverText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  profilePictureSection: {
    paddingHorizontal: 20,
    marginTop: -40,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarInitial: {
    fontSize: 40,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  formSection: {
    paddingHorizontal: 20,
  },
  formField: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#fafafa',
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  socialsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  socialField: {
    marginBottom: 20,
  },
  socialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  socialLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  bottomSpacer: {
    height: 40,
  },
});
