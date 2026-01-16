import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  Image,
  Modal,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';

// Default avatar images
const defaultAvatars = [
  require('@/assets/images/avatar1.png'),
  require('@/assets/images/avatar2.png'),
  require('@/assets/images/avatar3.png'),
  require('@/assets/images/avatar4.png'),
  require('@/assets/images/avatar5.png'),
];

export default function EmailSignUpStep1() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckingRealtime, setIsCheckingRealtime] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Avatar selection state
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState<number | null>(null);
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Spinning animation
  useEffect(() => {
    if (isCheckingRealtime) {
      spinValue.setValue(0);
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.stopAnimation();
    }
  }, [isCheckingRealtime]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const checkUsernameAvailability = async (usernameToCheck: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', usernameToCheck.toLowerCase()));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking username availability:', error);
      throw error;
    }
  };

  // Debounced real-time username check
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Reset state if username is too short or empty
    if (!username.trim() || username.trim().length < 6) {
      setUsernameAvailable(null);
      setIsCheckingRealtime(false);
      return;
    }

    // Start checking indicator
    setIsCheckingRealtime(true);
    setUsernameAvailable(null);

    // Debounce the check by 500ms
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(username.trim());
        setUsernameAvailable(isAvailable);
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameAvailable(null);
      } finally {
        setIsCheckingRealtime(false);
      }
    }, 500);

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [username]);

  const handleContinue = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (username.trim().length < 6) {
      Alert.alert('Error', 'Username must be at least 6 characters');
      return;
    }

    // If we already know username is taken from real-time check
    if (usernameAvailable === false) {
      Alert.alert('Username Taken', 'This username is already in use. Please choose another one.');
      return;
    }

    // If still checking, wait for check to complete
    if (isCheckingRealtime) {
      Alert.alert('Please Wait', 'Still checking username availability...');
      return;
    }

    try {
      setIsChecking(true);

      // Double-check if we don't have a definitive answer yet
      if (usernameAvailable === null) {
        const isAvailable = await checkUsernameAvailability(username.trim());
        if (!isAvailable) {
          Alert.alert('Username Taken', 'This username is already in use. Please choose another one.');
          setIsChecking(false);
          return;
        }
      }

      // Navigate to step 2 with username and avatar info
      router.push({
        pathname: '/(auth)/emailSignUp2',
        params: {
          username: username.trim(),
          avatarType: customAvatarUri ? 'custom' : (selectedAvatarIndex !== null ? 'default' : 'none'),
          avatarValue: customAvatarUri || (selectedAvatarIndex !== null ? selectedAvatarIndex.toString() : ''),
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to check username availability. Please try again.');
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const selectDefaultAvatar = (index: number) => {
    setSelectedAvatarIndex(index);
    setCustomAvatarUri(null);
    setShowAvatarModal(false);
  };

  const pickCustomImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCustomAvatarUri(result.assets[0].uri);
        setSelectedAvatarIndex(null);
        setShowAvatarModal(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const getAvatarSource = () => {
    if (customAvatarUri) {
      return { uri: customAvatarUri };
    }
    if (selectedAvatarIndex !== null) {
      return defaultAvatars[selectedAvatarIndex];
    }
    return null;
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
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <IconSymbol size={24} name="chevron.left" color="#fff" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Choose Username</ThemedText>
              <ThemedText style={styles.subtitle}>
                Step 1 of 3
              </ThemedText>
            </View>

            {/* Profile Icon Selection */}
            <View style={styles.avatarSection}>
              <ThemedText style={styles.label}>Profile Icon</ThemedText>
              <TouchableOpacity
                style={styles.avatarSelector}
                onPress={() => setShowAvatarModal(true)}
              >
                <View style={styles.avatarPreview}>
                  {getAvatarSource() ? (
                    <Image source={getAvatarSource()!} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <IconSymbol size={40} name="person.fill" color="#999" />
                    </View>
                  )}
                  <View style={styles.editBadge}>
                    <IconSymbol size={14} name="pencil" color="#fff" />
                  </View>
                </View>
                <ThemedText style={styles.avatarHint}>
                  {getAvatarSource() ? 'Tap to change' : 'Tap to select an avatar'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Username *</ThemedText>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={(text) => setUsername(text.toLowerCase())}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                  />
                  {/* Loading spinner inside input */}
                  {isCheckingRealtime && username.trim().length >= 6 && (
                    <View style={styles.inputSpinner}>
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <IconSymbol size={20} name="arrow.trianglehead.2.clockwise" color="#c42743" />
                      </Animated.View>
                    </View>
                  )}
                </View>
                {/* Username availability feedback */}
                {username.trim().length >= 6 && !isCheckingRealtime && usernameAvailable !== null && (
                  <View style={styles.availabilityContainer}>
                    <IconSymbol
                      size={16}
                      name={usernameAvailable ? "checkmark.circle.fill" : "xmark.circle.fill"}
                      color={usernameAvailable ? "#22c55e" : "#ef4444"}
                    />
                    <ThemedText style={[
                      styles.availabilityText,
                      usernameAvailable ? styles.availableText : styles.takenText
                    ]}>
                      {usernameAvailable ? "Username is available" : "Username is already taken"}
                    </ThemedText>
                  </View>
                )}
                {/* Minimum length hint */}
                {username.trim().length > 0 && username.trim().length < 6 && (
                  <View style={styles.availabilityContainer}>
                    <IconSymbol size={16} name="info.circle" color="#999" />
                    <ThemedText style={styles.hintText}>
                      Username must be at least 6 characters
                    </ThemedText>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.continueButton, isChecking && styles.buttonDisabled]}
                onPress={handleContinue}
                disabled={isChecking}
              >
                <ThemedText style={styles.continueButtonText}>
                  {isChecking ? 'Checking...' : 'Continue'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                Already have an account?{' '}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <ThemedText style={styles.footerLink}>Sign In</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Choose Profile Icon</ThemedText>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAvatarModal(false)}
              >
                <IconSymbol size={24} name="xmark" color="#fff" />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalSectionTitle}>Default Avatars</ThemedText>
            <View style={styles.avatarGrid}>
              {defaultAvatars.map((avatar, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.avatarOption,
                    selectedAvatarIndex === index && !customAvatarUri && styles.avatarOptionSelected,
                  ]}
                  onPress={() => selectDefaultAvatar(index)}
                >
                  <Image source={avatar} style={styles.avatarOptionImage} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.customImageButton}
              onPress={pickCustomImage}
            >
              <IconSymbol size={24} name="photo.on.rectangle" color="#c42743" />
              <ThemedText style={styles.customImageButtonText}>
                Choose from Library
              </ThemedText>
            </TouchableOpacity>

            {customAvatarUri && (
              <View style={styles.customPreviewContainer}>
                <ThemedText style={styles.customPreviewLabel}>Your selected image:</ThemedText>
                <Image source={{ uri: customAvatarUri }} style={styles.customPreviewImage} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
    overflow: 'visible',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 40,
    overflow: 'visible',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 16,
    paddingRight: 48,
    fontSize: 16,
    color: '#fff',
  },
  inputSpinner: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  availabilityText: {
    fontSize: 14,
  },
  availableText: {
    color: '#22c55e',
  },
  takenText: {
    color: '#ef4444',
  },
  hintText: {
    fontSize: 14,
    color: '#999',
  },
  continueButton: {
    backgroundColor: '#c42743',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#ccc',
    fontSize: 14,
  },
  footerLink: {
    color: '#c42743',
    fontSize: 14,
    fontWeight: '600',
  },
  // Avatar selection styles
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarSelector: {
    alignItems: 'center',
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e2124',
  },
  avatarHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e2124',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: '#c42743',
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#3a3f44',
    marginVertical: 20,
  },
  customImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    gap: 10,
  },
  customImageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c42743',
  },
  customPreviewContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  customPreviewLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  customPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#c42743',
  },
});
