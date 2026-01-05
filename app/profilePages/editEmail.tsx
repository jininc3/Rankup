import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { auth } from '@/config/firebase';
import { updateEmail, sendEmailVerification } from 'firebase/auth';

export default function EditEmailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUpdateEmail = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    // Validate new email
    if (newEmail === currentUser.email) {
      Alert.alert('No Change', 'Please enter a different email address');
      return;
    }

    if (!validateEmail(newEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsUpdating(true);

    try {
      // Update email in Firebase Auth
      await updateEmail(currentUser, newEmail);

      // Send verification email to new address
      await sendEmailVerification(currentUser);

      // Navigate to verification page
      router.push({
        pathname: '/profilePages/settingsVerifyEmail',
        params: { email: newEmail },
      });
    } catch (error: any) {
      console.error('Error updating email:', error);

      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Email Already in Use', 'This email address is already registered with another account.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Session Expired', 'Please sign out and sign back in to update your email.');
      } else {
        Alert.alert('Error', 'Failed to update email. Please try again.');
      }
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
        <ThemedText style={styles.headerTitle}>Edit Email</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <IconSymbol size={24} name="info.circle" color="#666" />
          <ThemedText style={styles.infoText}>
            You'll need to verify your new email address. A verification email will be sent to your new address.
          </ThemedText>
        </View>

        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>Current Email</ThemedText>
          <View style={styles.currentEmailContainer}>
            <ThemedText style={styles.currentEmail}>{user?.email}</ThemedText>
          </View>

          <ThemedText style={styles.label}>New Email Address</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter new email address"
            placeholderTextColor="#999"
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleUpdateEmail}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.updateButtonText}>Update Email</ThemedText>
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
  currentEmailContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 24,
  },
  currentEmail: {
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
