import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, ActivityIndicator, Animated, Easing, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db, functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import { LinearGradient } from 'expo-linear-gradient';

const COOLDOWN_DAYS = 30;

export default function EditUsernameScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckingRealtime, setIsCheckingRealtime] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [cooldownDaysLeft, setCooldownDaysLeft] = useState<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Check cooldown on mount
  useEffect(() => {
    const checkCooldown = async () => {
      if (!user?.id) return;
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.lastUsernameChange) {
            const lastChange = data.lastUsernameChange.toDate();
            const now = new Date();
            const daysSince = Math.floor(
              (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSince < COOLDOWN_DAYS) {
              setCooldownDaysLeft(COOLDOWN_DAYS - daysSince);
            }
          }
        }
      } catch (error) {
        console.error('Error checking cooldown:', error);
      }
    };
    checkCooldown();
  }, [user?.id]);

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

    // Reset state if username is same as current, too short, or empty
    if (!newUsername.trim() || newUsername.trim().length < 6 || newUsername === user?.username) {
      setUsernameAvailable(null);
      setIsCheckingRealtime(false);
      return;
    }

    // Validate format first
    if (!validateUsername(newUsername)) {
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
        const isAvailable = await checkUsernameAvailable(newUsername.trim());
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
  }, [newUsername, user?.username]);

  const validateUsername = (username: string): boolean => {
    // Username must be 6-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{6,20}$/;
    return usernameRegex.test(username);
  };

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('usernameLower', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      // Allow if no matches, or the only match is the current user (case change)
      if (querySnapshot.empty) return true;
      if (querySnapshot.size === 1 && querySnapshot.docs[0].id === user?.id) return true;
      return false;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  };

  const handleUpdateUsername = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    if (cooldownDaysLeft !== null && cooldownDaysLeft > 0) {
      Alert.alert(
        'Cooldown Active',
        `You can only change your username once every 30 days. Please wait ${cooldownDaysLeft} more day${cooldownDaysLeft === 1 ? '' : 's'}.`
      );
      return;
    }

    // Validate new username
    if (newUsername === user.username) {
      Alert.alert('No Change', 'Please enter a different username');
      return;
    }

    if (!validateUsername(newUsername)) {
      Alert.alert(
        'Invalid Username',
        'Username must be 6-20 characters and contain only letters, numbers, and underscores'
      );
      return;
    }

    // If we already know username is taken from real-time check
    if (usernameAvailable === false) {
      Alert.alert('Username Taken', 'This username is already in use. Please choose another.');
      return;
    }

    // If still checking, wait for check to complete
    if (isCheckingRealtime) {
      Alert.alert('Please Wait', 'Still checking username availability...');
      return;
    }

    Alert.alert(
      'Confirm Username Change',
      `Are you sure you want to change your username to "${newUsername}"? You won't be able to change it again for 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            setIsUpdating(true);

            try {
              const updateUsername = httpsCallable(functions, 'updateUsername');
              await updateUsername({ newUsername });

              if (refreshUser) {
                await refreshUser();
              }

              Alert.alert(
                'Success',
                'Your username has been updated everywhere!',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error updating username:', error);
              const message = error?.message || 'Failed to update username. Please try again.';
              Alert.alert('Error', message);
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const isCooldownActive = cooldownDaysLeft !== null && cooldownDaysLeft > 0;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <ThemedView style={styles.container}>
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Edit Username</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {isCooldownActive && (
          <View style={styles.cooldownCard}>
            <IconSymbol size={20} name="clock" color="#f59e0b" />
            <ThemedText style={styles.cooldownText}>
              You can change your username again in {cooldownDaysLeft} day{cooldownDaysLeft === 1 ? '' : 's'}.
            </ThemedText>
          </View>
        )}

        <View style={styles.infoCard}>
          <IconSymbol size={24} name="info.circle" color="#888" />
          <ThemedText style={styles.infoText}>
            Choose a unique username. It must be 6-20 characters and can only contain letters, numbers, and underscores. You can only change your username once every 30 days.
          </ThemedText>
        </View>

        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>Current Username</ThemedText>
          <View style={styles.currentUsernameContainer}>
            <ThemedText style={styles.currentUsername}>{user?.username}</ThemedText>
          </View>

          <ThemedText style={styles.label}>New Username</ThemedText>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, isCooldownActive && styles.inputDisabled]}
              placeholder="Enter new username"
              placeholderTextColor="#666"
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              editable={!isCooldownActive}
            />
            {/* Loading spinner inside input */}
            {isCheckingRealtime && newUsername.trim().length >= 6 && (
              <View style={styles.inputSpinner}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <IconSymbol size={20} name="arrow.trianglehead.2.clockwise" color="#fff" />
                </Animated.View>
              </View>
            )}
          </View>

          {/* Username availability feedback */}
          {newUsername !== user?.username && newUsername.trim().length >= 6 && validateUsername(newUsername) && !isCheckingRealtime && usernameAvailable !== null && (
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

          <ThemedText style={styles.helperText}>
            {newUsername.length}/20 characters
          </ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, (isUpdating || isCooldownActive) && styles.updateButtonDisabled]}
          onPress={handleUpdateUsername}
          disabled={isUpdating || isCooldownActive}
        >
          {isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.updateButtonText}>Update Username</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  cooldownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 16,
  },
  cooldownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#f59e0b',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252525',
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  currentUsernameContainer: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 24,
  },
  currentUsername: {
    fontSize: 16,
    color: '#888',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 48,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#252525',
  },
  inputDisabled: {
    opacity: 0.5,
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  updateButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  updateButtonDisabled: {
    opacity: 0.5,
  },
});
