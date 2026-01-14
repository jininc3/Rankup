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
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function EmailSignUpStep1() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckingRealtime, setIsCheckingRealtime] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
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

      // Navigate to step 2 with username
      router.push({
        pathname: '/(auth)/emailSignUp2',
        params: { username: username.trim() },
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
});
