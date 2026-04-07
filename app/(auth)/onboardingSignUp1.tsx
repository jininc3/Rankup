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
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { deleteIncompleteAccount } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const { width: screenWidth } = Dimensions.get('window');

// Default avatar images (local)
const defaultAvatars = [
  require('@/assets/images/avatar1.png'),
  require('@/assets/images/avatar2.png'),
  require('@/assets/images/avatar3.png'),
  require('@/assets/images/avatar4.png'),
  require('@/assets/images/avatar5.png'),
];

export default function OnboardingSignUp1() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signOut } = useAuth();

  const [bio, setBio] = useState('');
  const [discord, setDiscord] = useState('');
  const [instagram, setInstagram] = useState('');
  const [coverPhotoUri, setCoverPhotoUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Get avatar info from params
  const avatarType = params.avatarType as string;
  const avatarValue = params.avatarValue as string;
  const username = params.username as string;

  const getAvatarSource = () => {
    if (avatarType === 'custom' && avatarValue) {
      return { uri: avatarValue };
    }
    if (avatarType === 'default' && avatarValue) {
      const index = parseInt(avatarValue, 10);
      if (!isNaN(index) && index >= 0 && index < defaultAvatars.length) {
        return defaultAvatars[index];
      }
    }
    return null;
  };

  const handleContinue = () => {
    router.push({
      pathname: '/(auth)/onboardingSignUp2',
      params: {
        ...params,
        bio: bio.trim(),
        discordLink: discord.trim(),
        instagramLink: instagram.trim(),
        coverPhotoUri: coverPhotoUri || '',
      },
    });
  };

  const handleSkip = () => {
    router.push({
      pathname: '/(auth)/onboardingSignUp2',
      params: {
        ...params,
      },
    });
  };

  const handleBack = () => {
    Alert.alert(
      'Cancel Signup?',
      'Are you sure you want to cancel? Your account will be deleted.',
      [
        { text: 'No, Stay', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIncompleteAccount();
            } catch (error) {
              console.log('Could not delete account, signing out instead:', error);
            }
            try {
              await signOut();
            } catch (e) {}
            router.replace('/(auth)/login');
          },
        },
      ]
    );
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

    if (coverPhotoUri) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => setCoverPhotoUri(null),
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert('Cover Photo', 'Choose an option', options, { cancelable: true });
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
        setCoverPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
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
        setCoverPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <IconSymbol size={20} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.title}>About You</ThemedText>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <ThemedText style={styles.skipText}>Skip</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <StepProgressIndicator currentStep={2} totalSteps={5} />
          </View>

          <View style={styles.content}>
            <ThemedText style={styles.subtitle}>
              Tell others about yourself (optional)
            </ThemedText>

            {/* Cover Photo Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Cover Photo</ThemedText>
              <TouchableOpacity
                style={styles.coverPhotoContainer}
                onPress={showCoverPhotoOptions}
                activeOpacity={0.8}
              >
                {coverPhotoUri ? (
                  <Image source={{ uri: coverPhotoUri }} style={styles.coverPhotoImage} />
                ) : (
                  <View style={styles.coverPhotoPlaceholder}>
                    <IconSymbol size={28} name="photo.fill" color="#666" />
                    <ThemedText style={styles.coverPhotoPlaceholderText}>
                      Add cover photo
                    </ThemedText>
                  </View>
                )}
                <View style={styles.coverPhotoEditBadge}>
                  <IconSymbol size={14} name="camera.fill" color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Bio Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Bio</ThemedText>
              <View style={styles.bioInputContainer}>
                <TextInput
                  style={styles.bioInput}
                  placeholder="Write a short bio..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                  maxLength={150}
                  value={bio}
                  onChangeText={setBio}
                  textAlignVertical="top"
                />
                <ThemedText style={styles.characterCount}>{bio.length}/150</ThemedText>
              </View>
            </View>

            {/* Social Links Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Social Links</ThemedText>

              {/* Discord Input */}
              <View style={styles.socialInputContainer}>
                <View style={styles.socialIconInputWrapper}>
                  <Image
                    source={require('@/assets/images/discord.png')}
                    style={styles.socialInputIcon}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={styles.socialInput}
                    placeholder="Discord username"
                    placeholderTextColor="#666"
                    value={discord}
                    onChangeText={setDiscord}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Instagram Input */}
              <View style={styles.socialInputContainer}>
                <View style={styles.socialIconInputWrapper}>
                  <Image
                    source={require('@/assets/images/instagram.png')}
                    style={styles.socialInputIcon}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={styles.socialInput}
                    placeholder="Instagram username"
                    placeholderTextColor="#666"
                    value={instagram}
                    onChangeText={setInstagram}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
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

            {/* Continue Button */}
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
                <View style={[styles.previewSocialIcon, !instagram && styles.previewSocialIconInactive]}>
                  <Image
                    source={require('@/assets/images/instagram.png')}
                    style={styles.previewSocialImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.previewSocialIcon, !discord && styles.previewSocialIconInactive]}>
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

              {/* Empty Clips Section */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <IconSymbol size={16} name="play.fill" color="#fff" />
                  <ThemedText style={styles.previewSectionTitle}>Clips</ThemedText>
                </View>
                <View style={styles.previewEmptyState}>
                  <ThemedText style={styles.previewEmptyText}>No clips yet</ThemedText>
                </View>
              </View>

              {/* Empty Rank Cards Section */}
              <View style={styles.previewSection}>
                <View style={styles.previewSectionHeader}>
                  <IconSymbol size={16} name="star.fill" color="#fff" />
                  <ThemedText style={styles.previewSectionTitle}>Rank Cards</ThemedText>
                </View>
                <View style={styles.previewEmptyState}>
                  <ThemedText style={styles.previewEmptyText}>No rank cards linked</ThemedText>
                </View>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
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
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  // Cover Photo
  coverPhotoContainer: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  coverPhotoImage: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverPhotoPlaceholderText: {
    fontSize: 13,
    color: '#666',
  },
  coverPhotoEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bio
  bioInputContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2c2f33',
  },
  bioInput: {
    fontSize: 14,
    color: '#fff',
    minHeight: 80,
    padding: 0,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  // Social inputs
  socialInputContainer: {
    marginBottom: 12,
  },
  socialIconInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2c2f33',
  },
  socialInputIcon: {
    width: 24,
    height: 24,
  },
  socialInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    padding: 0,
  },
  // Preview button
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4A843',
    marginBottom: 16,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4A843',
  },
  // Continue button
  continueButton: {
    backgroundColor: '#D4A843',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
});
