import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, useRef, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Keyboard, Animated, Easing, Image, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import StepProgressIndicator from '@/components/ui/StepProgressIndicator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { deleteIncompleteAccount } from '@/services/authService';
import * as ImagePicker from 'expo-image-picker';

// Default avatar images
const defaultAvatars = [
  require('@/assets/images/avatar1.png'),
  require('@/assets/images/avatar2.png'),
  require('@/assets/images/avatar3.png'),
  require('@/assets/images/avatar4.png'),
  require('@/assets/images/avatar5.png'),
];

export default function GoogleSignUpScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCheckingRealtime, setIsCheckingRealtime] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const usernameInputRef = useRef<View>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Avatar selection state
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState<number | null>(null);
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Randomly select a default avatar on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
    setSelectedAvatarIndex(randomIndex);
  }, []);

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

    // Validate format first
    if (!validateUsername(username)) {
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

  const validateUsername = (text: string): boolean => {
    // Username should be 6-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{6,20}$/;
    return usernameRegex.test(text);
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleContinue = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!dateOfBirth) {
      Alert.alert('Error', 'Please select your date of birth');
      return;
    }

    if (!validateUsername(username)) {
      Alert.alert(
        'Invalid Username',
        'Username must be 6-20 characters long and can only contain letters, numbers, and underscores.'
      );
      return;
    }

    // Validate age (must be at least 13 years old)
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    const dayDiff = today.getDate() - dateOfBirth.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    if (actualAge < 13) {
      Alert.alert('Error', 'You must be at least 13 years old to sign up');
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

    setLoading(true);

    try {
      // Double-check if we don't have a definitive answer yet
      if (usernameAvailable === null) {
        const isAvailable = await checkUsernameAvailability(username);
        if (!isAvailable) {
          Alert.alert('Username Taken', 'This username is already in use. Please choose another one.');
          setLoading(false);
          return;
        }
      }

      // Navigate to step 2 with params
      router.push({
        pathname: '/(auth)/googleSignUpStep2',
        params: {
          username: username.trim(),
          dateOfBirth: dateOfBirth.toISOString(),
          avatarType: customAvatarUri ? 'custom' : (selectedAvatarIndex !== null ? 'default' : 'none'),
          avatarValue: customAvatarUri || (selectedAvatarIndex !== null ? selectedAvatarIndex.toString() : ''),
        },
      });
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameFocus = () => {
    setTimeout(() => {
      usernameInputRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
        },
        () => {}
      );
    }, 100);
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

  const handleBack = () => {
    Alert.alert(
      'Are you sure?',
      'Your progress will be lost.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, go back',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the incomplete account (both Auth and Firestore)
              await deleteIncompleteAccount();
            } catch (error: any) {
              // If deletion fails (e.g., requires-recent-login), just continue with sign out
              console.log('Could not delete account, signing out instead:', error?.code);
            }

            // Always sign out and redirect to login
            try {
              await signOut();
            } catch (e) {
              // Ignore sign out errors
            }
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              disabled={loading}
            >
              <IconSymbol size={20} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.title}>Let's create your profile</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <StepProgressIndicator currentStep={1} totalSteps={4} />
          </View>

          <View style={styles.content}>
            <ThemedText style={styles.subtitle}>
              Pick a unique username that represents you
            </ThemedText>

            {/* Profile Icon Selection */}
            <View style={styles.avatarSection}>
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
                  Tap to change avatar
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
          <View style={styles.inputContainer} ref={usernameInputRef}>
            <ThemedText style={styles.label}>Username *</ThemedText>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="person" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Enter username"
                placeholderTextColor="#999"
                value={username}
                onChangeText={(text) => setUsername(text.toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                onFocus={handleUsernameFocus}
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
            {/* Username feedback - fixed height container */}
            <View style={styles.feedbackContainer}>
              {username.trim().length >= 6 && validateUsername(username) && !isCheckingRealtime && usernameAvailable !== null ? (
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
              ) : username.trim().length > 0 && username.trim().length < 6 ? (
                <View style={styles.availabilityContainer}>
                  <IconSymbol size={16} name="info.circle" color="#999" />
                  <ThemedText style={styles.hint}>
                    Username must be at least 6 characters
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.hint}>
                  6-20 characters, letters, numbers, and underscores only
                </ThemedText>
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Date of Birth *</ThemedText>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                Keyboard.dismiss();
                setShowDatePicker(true);
              }}
              disabled={loading}
            >
              <ThemedText style={[styles.dateText, !dateOfBirth && styles.placeholderText]}>
                {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.hint}>
              You must be at least 13 years old
            </ThemedText>
          </View>

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={dateOfBirth || new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                themeVariant="dark"
                style={styles.datePicker}
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              (loading || !usernameAvailable || !dateOfBirth || isCheckingRealtime) && styles.buttonDisabled
            ]}
            onPress={handleContinue}
            disabled={loading || !usernameAvailable || !dateOfBirth || isCheckingRealtime}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={[
                styles.buttonText,
                (!usernameAvailable || !dateOfBirth || isCheckingRealtime) && styles.buttonTextDisabled
              ]}>Continue</ThemedText>
            )}
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
    backgroundColor: '#0f0f0f',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerSpacer: {
    width: 20,
  },
  progressContainer: {
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  form: {
    gap: 12,
  },
  inputContainer: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2f33',
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3a3f44',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    backgroundColor: '#2c2f33',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3a3f44',
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 30,
    fontSize: 15,
    color: '#fff',
  },
  inputSpinner: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  feedbackContainer: {
    height: 20,
    marginTop: 4,
    justifyContent: 'center',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#a82239',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#3a3f44',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#72767d',
  },
  dateText: {
    fontSize: 15,
    color: '#fff',
  },
  placeholderText: {
    color: '#999',
  },
  datePickerContainer: {
    backgroundColor: '#2c2f33',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePicker: {
    height: 200,
    width: '100%',
    backgroundColor: '#2c2f33',
  },
  // Avatar selection styles
  avatarSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarSelector: {
    alignItems: 'center',
  },
  avatarPreview: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
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
    borderColor: '#0f0f0f',
  },
  avatarHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f0f0f',
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
