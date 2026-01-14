import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, ActivityIndicator, Animated, Easing } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function EditUsernameScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [isUpdating, setIsUpdating] = useState(false);
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
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
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

    setIsUpdating(true);

    try {
      // Double-check if we don't have a definitive answer yet
      if (usernameAvailable === null) {
        const isAvailable = await checkUsernameAvailable(newUsername);
        if (!isAvailable) {
          Alert.alert('Username Taken', 'This username is already in use. Please choose another.');
          setIsUpdating(false);
          return;
        }
      }

      // Update username in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        username: newUsername,
      });

      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert(
        'Success',
        'Your username has been updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating username:', error);
      Alert.alert('Error', 'Failed to update username. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Edit Username</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <IconSymbol size={24} name="info.circle" color="#666" />
          <ThemedText style={styles.infoText}>
            Choose a unique username. It must be 6-20 characters and can only contain letters, numbers, and underscores.
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
              style={styles.input}
              placeholder="Enter new username"
              placeholderTextColor="#999"
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {/* Loading spinner inside input */}
            {isCheckingRealtime && newUsername.trim().length >= 6 && (
              <View style={styles.inputSpinner}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <IconSymbol size={20} name="arrow.trianglehead.2.clockwise" color="#000" />
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
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleUpdateUsername}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.updateButtonText}>Update Username</ThemedText>
          )}
        </TouchableOpacity>
      </View>
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
  backButton: {
    padding: 4,
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  currentUsernameContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 24,
  },
  currentUsername: {
    fontSize: 16,
    color: '#666',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 48,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
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
    color: '#999',
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
