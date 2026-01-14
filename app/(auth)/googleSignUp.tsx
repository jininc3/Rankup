import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useState, useRef, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Keyboard, Animated, Easing } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import DateTimePicker from '@react-native-community/datetimepicker';
import { deleteIncompleteAccount } from '@/services/authService';

export default function GoogleSignUpScreen() {
  const { user, refreshUser, signOut } = useAuth();
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

      // Update user profile in Firestore
      if (user?.id) {
        await updateDoc(doc(db, 'users', user.id), {
          username: username.toLowerCase(),
          dateOfBirth: dateOfBirth.toISOString(),
          needsUsernameSetup: false,
          updatedAt: new Date(),
        });

        // Refresh user data in context
        await refreshUser();

        // Navigate to main app
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      Alert.alert('Error', 'Failed to update username. Please try again.');
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

  const handleBack = async () => {
    try {
      // Delete the incomplete account (both Auth and Firestore)
      await deleteIncompleteAccount();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error deleting incomplete account:', error);
      Alert.alert('Error', 'Failed to go back. Please try again.');
    }
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={loading}
          >
            <IconSymbol size={24} name="chevron.left" color="#fff" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Choose Your Username</ThemedText>
              <ThemedText style={styles.subtitle}>
                Pick a unique username that represents you
              </ThemedText>
            </View>

            <View style={styles.form}>
          <View style={styles.inputContainer} ref={usernameInputRef}>
            <ThemedText style={styles.label}>Username *</ThemedText>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.inputWithSpinner}
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
            {/* Username availability feedback */}
            {username.trim().length >= 6 && validateUsername(username) && !isCheckingRealtime && usernameAvailable !== null && (
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
                <ThemedText style={styles.hint}>
                  Username must be at least 6 characters
                </ThemedText>
              </View>
            )}
            {username.trim().length === 0 && (
              <ThemedText style={styles.hint}>
                6-20 characters, letters, numbers, and underscores only
              </ThemedText>
            )}
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
                themeVariant="light"
                style={styles.datePicker}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Continue</ThemedText>
            )}
          </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    overflow: 'visible',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 36,
    overflow: 'visible',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#2c2f33',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3a3f44',
  },
  inputWithSpinner: {
    backgroundColor: '#2c2f33',
    paddingHorizontal: 16,
    paddingRight: 48,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3a3f44',
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
  hint: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#c42743',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
  },
  placeholderText: {
    color: '#999',
  },
  datePickerContainer: {
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePicker: {
    height: 200,
    width: '100%',
    backgroundColor: '#2c2f33',
  },
});
