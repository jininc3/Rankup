import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { useNavigation } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, Image, Dimensions, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/services/authService';
import { uploadProfilePicture, uploadCoverPhoto } from '@/services/storageService';
import * as ImagePicker from 'expo-image-picker';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getLeagueStats, formatRank } from '@/services/riotService';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCount } from '@/utils/formatCount';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Asset } from 'expo-asset';
import { getColors } from 'react-native-image-colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Default avatar images (local)
const defaultAvatars = [
  require('@/assets/images/avatar1.png'),
  require('@/assets/images/avatar2.png'),
  require('@/assets/images/avatar3.png'),
  require('@/assets/images/avatar4.png'),
  require('@/assets/images/avatar5.png'),
];

interface RankCardData {
  type: string;
  name: string;
  isEnabled: boolean;
}

const formatJoinDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Joined today';
  if (diffDays === 1) return 'Joined yesterday';
  if (diffDays < 30) return `Joined ${diffDays} days ago`;
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `Joined ${day} ${month} ${year}`;
};

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


  // Default avatar modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [pendingDefaultAvatarIndex, setPendingDefaultAvatarIndex] = useState<number | null>(null);

  // Social edit modal
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [editingSocial, setEditingSocial] = useState<'instagram' | 'discord' | null>(null);
  const [socialInputValue, setSocialInputValue] = useState('');

  // Rank cards state
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [originalEnabledRankCards, setOriginalEnabledRankCards] = useState<string[]>([]);
  const [loadingRankCards, setLoadingRankCards] = useState(true);
  const [joinedAt, setJoinedAt] = useState<Date | null>(null);

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

  // Fetch rank cards data
  useEffect(() => {
    const fetchRankCardsData = async () => {
      if (!user?.id) {
        setLoadingRankCards(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const data = userDoc.data();

          // Set Riot account info
          if (data.riotAccount) {
            setRiotAccount(data.riotAccount);
            if (data.riotStats) {
              setRiotStats(data.riotStats);
            }
          }

          // Set Valorant account info
          if (data.valorantAccount) {
            setValorantAccount(data.valorantAccount);
            if (data.valorantStats) {
              setValorantStats(data.valorantStats);
            }
          }

          // Ensure all linked accounts are in enabledRankCards
          const cards = data.enabledRankCards || [];
          const updatedCards = [...cards];
          if (data.riotAccount && !updatedCards.includes('league')) {
            updatedCards.push('league');
          }
          if (data.valorantAccount && !updatedCards.includes('valorant')) {
            updatedCards.push('valorant');
          }
          setEnabledRankCards(updatedCards);
          setOriginalEnabledRankCards(updatedCards);
          if (data.createdAt) {
            setJoinedAt(data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt));
          }
        }
      } catch (error) {
        console.error('Error fetching rank cards data:', error);
      } finally {
        setLoadingRankCards(false);
      }
    };

    fetchRankCardsData();
  }, [user?.id]);

  // Intercept back navigation (including swipe gestures)
  useEffect(() => {
    const beforeRemoveListener = (e: any) => {
      // If changes were saved, allow navigation without confirmation
      if (changesSaved) {
        return;
      }

      // Check if any field has changed from original user data
      const rankCardsChangedCheck = enabledRankCards.length !== originalEnabledRankCards.length ||
        !enabledRankCards.every(card => originalEnabledRankCards.includes(card));

      const changesExist =
        username !== (user?.username || '') ||
        bio !== (user?.bio || '') ||
        discord !== (user?.discordLink || '') ||
        instagram !== (user?.instagramLink || '') ||
        pendingProfileImageUri !== null ||
        pendingCoverPhotoUri !== null ||
        pendingRemoveProfileImage ||
        pendingRemoveCoverPhoto ||
        pendingDefaultAvatarIndex !== null ||
        rankCardsChangedCheck;

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
  }, [navigation, username, bio, discord, instagram, pendingProfileImageUri, pendingCoverPhotoUri, pendingRemoveProfileImage, pendingRemoveCoverPhoto, pendingDefaultAvatarIndex, user, changesSaved, enabledRankCards, originalEnabledRankCards]);

  const showImageOptions = () => {
    const options: any[] = [
      {
        text: 'Choose Default Avatar',
        onPress: () => setShowAvatarModal(true),
      },
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
    if (profileImage || pendingProfileImageUri || pendingDefaultAvatarIndex !== null) {
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

  const selectDefaultAvatar = (index: number) => {
    setPendingDefaultAvatarIndex(index);
    setPendingProfileImageUri(null);
    setPendingRemoveProfileImage(false);
    setShowAvatarModal(false);
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
            setPendingDefaultAvatarIndex(null);
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

  // Get all available cards (linked accounts are always enabled)
  const getAvailableCards = useCallback((): RankCardData[] => {
    const cards: RankCardData[] = [];

    // Add cards in their current order from enabledRankCards
    enabledRankCards.forEach(cardType => {
      if (cardType === 'league' && riotAccount) {
        cards.push({ type: 'league', name: 'League of Legends', isEnabled: true });
      } else if (cardType === 'valorant' && valorantAccount) {
        cards.push({ type: 'valorant', name: 'Valorant', isEnabled: true });
      }
    });

    // Add any linked accounts not yet in enabledRankCards
    if (riotAccount && !enabledRankCards.includes('league')) {
      cards.push({ type: 'league', name: 'League of Legends', isEnabled: true });
    }
    if (valorantAccount && !enabledRankCards.includes('valorant')) {
      cards.push({ type: 'valorant', name: 'Valorant', isEnabled: true });
    }

    return cards;
  }, [riotAccount, valorantAccount, enabledRankCards]);

  // Handle drag end - reorder enabled cards
  const handleDragEnd = useCallback(({ data }: { data: RankCardData[] }) => {
    const newEnabledCards = data
      .filter(card => card.isEnabled)
      .map(card => card.type);
    setEnabledRankCards(newEnabledCards);
  }, []);

  // Check if rank cards have changed (including order)
  const rankCardsChanged = () => {
    if (enabledRankCards.length !== originalEnabledRankCards.length) return true;
    // Check both content and order
    for (let i = 0; i < enabledRankCards.length; i++) {
      if (enabledRankCards[i] !== originalEnabledRankCards[i]) return true;
    }
    return false;
  };

  // Render draggable rank card item
  const renderRankCardItem = useCallback(({ item, drag, isActive }: RenderItemParams<RankCardData>) => {
    const logoSource = item.type === 'league'
      ? require('@/assets/images/lol-icon.png')
      : require('@/assets/images/valorant-red.png');

    const accountName = item.type === 'league'
      ? (riotAccount ? `${riotAccount.gameName}#${riotAccount.tagLine}` : '')
      : (valorantAccount ? `${valorantAccount.gameName}#${valorantAccount.tag || valorantAccount.tagLine || ''}` : '');

    const availableCards = getAvailableCards();
    const isEnabled = enabledRankCards.includes(item.type);

    return (
      <ScaleDecorator activeScale={1}>
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={availableCards.length > 1 ? drag : undefined}
          delayLongPress={150}
          disabled={isActive}
          style={[
            styles.rankCardItem,
            isEnabled && styles.rankCardItemActive,
            isActive && styles.rankCardItemDragging,
          ]}
        >
          {/* Logo */}
          <Image source={logoSource} style={styles.rankCardLogoImage} resizeMode="contain" />

          {/* Info */}
          <View style={styles.rankCardInfo}>
            <View style={styles.rankCardNameRow}>
              <ThemedText style={styles.rankCardName}>{item.name}</ThemedText>
              {isEnabled && <View style={styles.rankCardActiveDot} />}
            </View>
            {accountName ? (
              <ThemedText style={styles.rankCardAccountName}>{accountName}</ThemedText>
            ) : (
              <ThemedText style={styles.rankCardNotLinked}>Tap to link your account</ThemedText>
            )}
          </View>

          {/* Drag handle */}
          {availableCards.length > 1 && (
            <View style={styles.dragHandle}>
              <IconSymbol size={16} name="line.3.horizontal" color={isActive ? '#fff' : '#666'} />
            </View>
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [enabledRankCards, riotAccount, valorantAccount, getAvailableCards]);

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
    if (pendingDefaultAvatarIndex !== null) return true;
    if (rankCardsChanged()) return true;
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
                enabledRankCards: enabledRankCards,
              };

              // Handle profile image changes
              if (pendingRemoveProfileImage) {
                // User wants to remove profile picture
                updateData.avatar = '';
              } else if (pendingDefaultAvatarIndex !== null) {
                // User selected a default avatar - upload from local assets
                try {
                  const asset = Asset.fromModule(defaultAvatars[pendingDefaultAvatarIndex]);
                  await asset.downloadAsync();
                  if (asset.localUri) {
                    const avatarUrl = await uploadProfilePicture(user.id, asset.localUri);
                    updateData.avatar = avatarUrl;
                  }
                } catch (error) {
                  console.error('Error uploading default avatar:', error);
                }
              } else if (pendingProfileImageUri) {
                // User selected a new profile picture - upload it
                const avatarUrl = await uploadProfilePicture(user.id, pendingProfileImageUri);
                updateData.avatar = avatarUrl;
              }

              // Handle cover photo changes
              if (pendingRemoveCoverPhoto) {
                // User wants to remove cover photo
                updateData.coverPhoto = '';
                updateData.coverPhotoColor = '';
              } else if (pendingCoverPhotoUri) {
                // User selected a new cover photo - upload it
                const coverUrl = await uploadCoverPhoto(user.id, pendingCoverPhotoUri);
                updateData.coverPhoto = coverUrl;

                // Extract dominant color from the local image for profile gradient
                try {
                  const colors = await getColors(pendingCoverPhotoUri, {
                    fallback: '#24243e',
                    cache: true,
                  });
                  if (colors.platform === 'android') {
                    updateData.coverPhotoColor = colors.dominant ?? '#24243e';
                  } else if (colors.platform === 'ios') {
                    updateData.coverPhotoColor = colors.background ?? '#24243e';
                  }
                } catch {
                  updateData.coverPhotoColor = '#24243e';
                }
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
      {/* Background shimmer — matches tabs pages */}
      <View style={styles.backgroundGlow} pointerEvents="none">
        <View style={styles.shimmerBand} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.03)',
              'rgba(255, 255, 255, 0.065)',
              'rgba(255, 255, 255, 0.03)',
              'transparent',
            ]}
            locations={[0, 0.37, 0.5, 0.63, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={styles.shimmerBandSecondary} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 255, 255, 0.035)',
              'transparent',
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Section - matches profile page layout */}
        <View style={styles.headerSection}>
          {/* Cover Photo Area */}
          <View style={styles.coverPhotoWrapper}>
            {pendingRemoveCoverPhoto ? null : pendingCoverPhotoUri ? (
              <CachedImage uri={pendingCoverPhotoUri} style={styles.coverPhotoImage} />
            ) : coverPhoto ? (
              <CachedImage uri={coverPhoto} style={styles.coverPhotoImage} />
            ) : null}
            {/* Bottom fade - only when a cover photo is visible */}
            {!pendingRemoveCoverPhoto && (pendingCoverPhotoUri || coverPhoto) && (
              <LinearGradient
                colors={['transparent', 'rgba(15, 15, 15, 0.15)', 'rgba(15, 15, 15, 0.45)', 'rgba(15, 15, 15, 0.75)', '#0f0f0f']}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.coverPhotoFadeBottom}
              />
            )}

            {/* Header Icons overlaid on cover photo */}
            <View style={styles.headerIconsRow}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={handleBack}
                activeOpacity={0.7}
              >
                <IconSymbol size={20} name="chevron.left" color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerIconsSpacer} />
              <TouchableOpacity
                style={styles.editCoverButton}
                onPress={showCoverPhotoOptions}
                disabled={isLoading}
              >
                <IconSymbol size={20} name="camera.fill" color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Info Section - overlaps cover photo */}
          <View style={styles.profileInfoSection}>
            {/* Row: Avatar+Username group (left) + Stats (right) */}
            <View style={styles.avatarStatsRow}>
              <View style={styles.avatarUsernameGroup}>
                <TouchableOpacity
                  style={styles.profileAvatarButton}
                  onPress={showImageOptions}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View style={styles.profileAvatarCircle}>
                    {pendingRemoveProfileImage ? (
                      <ThemedText style={styles.profileAvatarInitial}>{user?.username?.[0]?.toUpperCase() || 'U'}</ThemedText>
                    ) : pendingDefaultAvatarIndex !== null ? (
                      <Image source={defaultAvatars[pendingDefaultAvatarIndex]} style={styles.profileAvatarImage} />
                    ) : pendingProfileImageUri ? (
                      <CachedImage uri={pendingProfileImageUri} style={styles.profileAvatarImage} />
                    ) : profileImage ? (
                      <CachedImage uri={profileImage} style={styles.profileAvatarImage} />
                    ) : (
                      <ThemedText style={styles.profileAvatarInitial}>{avatar}</ThemedText>
                    )}
                  </View>
                  <View style={styles.editAvatarBadge}>
                    <IconSymbol size={12} name="camera.fill" color="#fff" />
                  </View>
                </TouchableOpacity>

                {/* Username input under avatar */}
                <TextInput
                  style={styles.usernameInput}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase())}
                  placeholder="Username"
                  placeholderTextColor="#72767d"
                  autoCapitalize="none"
                />
                {joinedAt && (
                  <ThemedText style={styles.joinedText}>{formatJoinDate(joinedAt)}</ThemedText>
                )}
              </View>

              {/* Stats columns */}
              <View style={styles.statsColumns}>
                <View style={styles.statColumn}>
                  <ThemedText style={styles.statNumber}>{formatCount(user?.followersCount)}</ThemedText>
                  <ThemedText style={styles.statLabel}>Followers</ThemedText>
                </View>
                <View style={styles.statColumn}>
                  <ThemedText style={styles.statNumber}>{formatCount(user?.followingCount)}</ThemedText>
                  <ThemedText style={styles.statLabel}>Following</ThemedText>
                </View>
                <View style={styles.statColumn}>
                  <ThemedText style={styles.statNumber}>{formatCount(user?.postsCount)}</ThemedText>
                  <ThemedText style={styles.statLabel}>Posts</ThemedText>
                </View>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.bioSection}>
              <TextInput
                style={styles.bioText}
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

            {/* Action Row: Social Icons */}
            <View style={styles.socialIconsRow}>
              <TouchableOpacity
                style={[styles.socialIconButton, !instagram && styles.socialIconInactive]}
                onPress={() => {
                  setEditingSocial('instagram');
                  setSocialInputValue(instagram);
                  setShowSocialModal(true);
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={require('@/assets/images/instagram.png')}
                  style={styles.socialIconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialIconButton, !discord && styles.socialIconInactive]}
                onPress={() => {
                  setEditingSocial('discord');
                  setSocialInputValue(discord);
                  setShowSocialModal(true);
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={require('@/assets/images/discord.png')}
                  style={styles.socialIconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Button — flows with content */}
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
        </View>
      </ScrollView>

      {/* Default Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Choose Avatar</ThemedText>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAvatarModal(false)}
              >
                <IconSymbol size={24} name="xmark" color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarGrid}>
              {defaultAvatars.map((avatar, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.avatarOption,
                    pendingDefaultAvatarIndex === index && styles.avatarOptionSelected,
                  ]}
                  onPress={() => selectDefaultAvatar(index)}
                  activeOpacity={0.7}
                >
                  <Image source={avatar} style={styles.avatarOptionImage} />
                  {pendingDefaultAvatarIndex === index && (
                    <View style={styles.avatarCheckmark}>
                      <IconSymbol size={16} name="checkmark" color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Social Edit Modal */}
      <Modal
        visible={showSocialModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSocialModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.socialModalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <TouchableOpacity
            style={styles.socialModalDismiss}
            activeOpacity={1}
            onPress={() => setShowSocialModal(false)}
          />
          <View style={styles.socialModalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingSocial === 'instagram' ? 'Instagram Username' : 'Discord Username'}
              </ThemedText>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSocialModal(false)}
              >
                <IconSymbol size={24} name="xmark" color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.socialModalInputContainer}>
              <Image
                source={editingSocial === 'instagram'
                  ? require('@/assets/images/instagram.png')
                  : require('@/assets/images/discord.png')
                }
                style={styles.socialModalIcon}
                resizeMode="contain"
              />
              <TextInput
                style={styles.socialModalInput}
                value={socialInputValue}
                onChangeText={setSocialInputValue}
                placeholder={editingSocial === 'instagram' ? 'Enter username' : 'Enter username'}
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.socialModalSaveButton}
              onPress={() => {
                if (editingSocial === 'instagram') {
                  setInstagram(socialInputValue);
                } else if (editingSocial === 'discord') {
                  setDiscord(socialInputValue);
                }
                setShowSocialModal(false);
              }}
            >
              <ThemedText style={styles.socialModalSaveText}>Save</ThemedText>
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
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    top: -screenHeight * 0.35,
    left: -screenWidth * 0.6,
    width: screenWidth * 2.2,
    height: screenHeight * 1.7,
    transform: [{ rotate: '20deg' }],
  },
  shimmerBandSecondary: {
    position: 'absolute',
    top: -screenHeight * 0.2,
    left: -screenWidth * 0.1,
    width: screenWidth * 1.9,
    height: screenHeight * 1.5,
    transform: [{ rotate: '-15deg' }],
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {},
  // Cover photo area - reaches top of screen
  coverPhotoWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  coverPhotoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  coverPhotoGradient: {
    width: '100%',
    height: '100%',
  },
  coverPhotoFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    zIndex: 1,
  },
  // Header icons overlaid on cover photo
  headerIconsRow: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconsSpacer: {
    flex: 1,
  },
  editCoverButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Profile info section below cover
  profileInfoSection: {
    marginTop: -20,
    paddingHorizontal: 20,
    zIndex: 3,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  avatarUsernameGroup: {
    alignItems: 'flex-start',
  },
  profileAvatarButton: {
  },
  profileAvatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#36393e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0f0f0f',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  profileAvatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f0f0f',
  },
  // Stats columns beside avatar
  statsColumns: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    paddingBottom: 6,
  },
  statColumn: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#72767d',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  // Username input
  usernameInput: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginTop: 6,
    padding: 0,
    width: 96,
    height: 20,
    lineHeight: 20,
    includeFontPadding: false,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
    marginTop: 2,
    textAlignVertical: 'center',
  },
  // Bio section
  bioSection: {
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
  },
  bioText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    padding: 0,
    textAlignVertical: 'top',
    minHeight: 50,
  },
  characterCount: {
    fontSize: 11,
    color: '#72767d',
    marginTop: 8,
    textAlign: 'right',
  },
  // Social icons row
  socialIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  socialIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconInactive: {
    opacity: 0.4,
  },
  socialIconImage: {
    width: 20,
    height: 20,
  },
  // Section container
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  // Save button
  saveButtonContainer: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 24,
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Rank Cards Section Styles
  rankCardsSectionOuter: {
    paddingHorizontal: 28,
    marginTop: 8,
    marginBottom: 20,
  },
  rankCardsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankCardsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  linkAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  linkAccountText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  rankCardsLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noAccountsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noAccountsText: {
    fontSize: 13,
    color: '#555',
  },
  rankCardsList: {
    gap: 12,
  },
  rankCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  rankCardItemActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  rankCardItemDragging: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  dragHandle: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankCardLogoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  rankCardInfo: {
    flex: 1,
    gap: 2,
  },
  rankCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankCardName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  rankCardActiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  rankCardAccountName: {
    fontSize: 13,
    color: '#888',
  },
  rankCardNotLinked: {
    fontSize: 13,
    color: '#555',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  avatarOption: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: '#c42743',
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
  },
  avatarCheckmark: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Social Modal styles
  socialModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  socialModalDismiss: {
    flex: 1,
  },
  socialModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  socialModalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 20,
  },
  socialModalIcon: {
    width: 24,
    height: 24,
  },
  socialModalInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    padding: 0,
  },
  socialModalSaveButton: {
    backgroundColor: '#c42743',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  socialModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
