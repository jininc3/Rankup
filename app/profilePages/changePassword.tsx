import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { auth } from '@/config/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const validatePassword = (password: string): boolean => {
    // Password must be at least 6 characters
    return password.length >= 6;
  };

  const handleChangePassword = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      Alert.alert('Error', 'User not found');
      return;
    }

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    setIsUpdating(true);

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      Alert.alert(
        'Password Updated',
        'Your password has been successfully changed!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error changing password:', error);

      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Current password is incorrect. Please try again.');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Weak Password', 'Please choose a stronger password.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Session Expired', 'Please sign out and sign back in to change your password.');
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
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
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Change Password</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <IconSymbol size={24} name="info.circle" color="#666" />
          <ThemedText style={styles.infoText}>
            Choose a strong password with at least 6 characters. We recommend using a mix of letters, numbers, and symbols.
          </ThemedText>
        </View>

        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>Current Password</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter current password"
            placeholderTextColor="#999"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ThemedText style={[styles.label, styles.labelSpacing]}>New Password</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            placeholderTextColor="#999"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ThemedText style={[styles.label, styles.labelSpacing]}>Confirm New Password</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.requirementsCard}>
            <ThemedText style={styles.requirementsTitle}>Password Requirements:</ThemedText>
            <View style={styles.requirementItem}>
              <IconSymbol
                size={16}
                name={newPassword.length >= 6 ? "checkmark.circle.fill" : "circle"}
                color={newPassword.length >= 6 ? "#22c55e" : "#999"}
              />
              <ThemedText style={[
                styles.requirementText,
                newPassword.length >= 6 && styles.requirementMet
              ]}>
                At least 6 characters
              </ThemedText>
            </View>
            <View style={styles.requirementItem}>
              <IconSymbol
                size={16}
                name={newPassword === confirmPassword && newPassword !== '' ? "checkmark.circle.fill" : "circle"}
                color={newPassword === confirmPassword && newPassword !== '' ? "#22c55e" : "#999"}
              />
              <ThemedText style={[
                styles.requirementText,
                newPassword === confirmPassword && newPassword !== '' && styles.requirementMet
              ]}>
                Passwords match
              </ThemedText>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
          onPress={handleChangePassword}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.updateButtonText}>Change Password</ThemedText>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  backText: {
    fontSize: 17,
    color: '#000',
    fontWeight: '400',
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
  labelSpacing: {
    marginTop: 20,
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
  requirementsCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
  },
  requirementMet: {
    color: '#22c55e',
    fontWeight: '500',
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
