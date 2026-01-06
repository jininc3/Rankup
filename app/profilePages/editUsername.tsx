import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function EditUsernameScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [isUpdating, setIsUpdating] = useState(false);

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

    setIsUpdating(true);

    try {
      // Check if username is available
      const isAvailable = await checkUsernameAvailable(newUsername);
      if (!isAvailable) {
        Alert.alert('Username Taken', 'This username is already in use. Please choose another.');
        setIsUpdating(false);
        return;
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
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
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
