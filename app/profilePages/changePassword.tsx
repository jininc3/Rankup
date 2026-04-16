import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { auth } from '@/config/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isValid = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleChangePassword = async () => {
    if (!isValid) return;

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      Alert.alert('Error', 'No authenticated user found.');
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      Alert.alert('Success', 'Your password has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Current password is incorrect.');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Error', 'New password is too weak. Please use at least 8 characters.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Error', 'Please sign out and sign back in, then try again.');
      } else {
        Alert.alert('Error', 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Change Password</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Current Password</ThemedText>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor="#555"
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeButton}>
              <IconSymbol size={18} name={showCurrent ? 'eye.slash' : 'eye'} color="#555" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>New Password</ThemedText>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#555"
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeButton}>
              <IconSymbol size={18} name={showNew ? 'eye.slash' : 'eye'} color="#555" />
            </TouchableOpacity>
          </View>
          {newPassword.length > 0 && newPassword.length < 8 && (
            <ThemedText style={styles.hint}>Must be at least 8 characters</ThemedText>
          )}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Confirm New Password</ThemedText>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#555"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
              <IconSymbol size={18} name={showConfirm ? 'eye.slash' : 'eye'} color="#555" />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <ThemedText style={styles.hintError}>Passwords do not match</ThemedText>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!isValid || loading) && styles.saveButtonDisabled]}
          onPress={handleChangePassword}
          disabled={!isValid || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Update Password</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  eyeButton: {
    padding: 4,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  hintError: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#D4A843',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#2c2f33',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
