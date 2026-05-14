import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { auth, db } from '@/config/firebase';
import { verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditEmailScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const isPhoneUser = user?.provider === 'phone';
  const hasRealEmail = user?.email && !user.email.endsWith('@peakd-phone.internal');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone users: just save to Firestore (don't touch Firebase Auth email)
  const handleSaveEmail = async () => {
    if (!validateEmail(newEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsUpdating(true);
    try {
      if (user?.id) {
        await updateDoc(doc(db, 'users', user.id), {
          email: newEmail.toLowerCase().trim(),
          updatedAt: new Date(),
        });
      }
      await refreshUser();
      Alert.alert('Email Updated', 'Your email address has been saved!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving email:', error);
      Alert.alert('Error', 'Failed to save email. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Non-phone users: use Firebase Auth verifyBeforeUpdateEmail
  const handleSendVerification = async () => {
    if (!validateEmail(newEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setIsUpdating(true);
    try {
      await verifyBeforeUpdateEmail(currentUser, newEmail.toLowerCase().trim());
      setLinkSent(true);
    } catch (error: any) {
      console.error('Error sending verification:', error);
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Email Already in Use', 'This email address is already registered with another account.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Session Expired', 'Please sign out and sign back in to update your email.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
      } else {
        Alert.alert('Error', 'Failed to send verification email. Please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCheckVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsChecking(true);
    try {
      await currentUser.reload();
      const updatedEmail = currentUser.email;

      if (updatedEmail === newEmail.toLowerCase().trim()) {
        if (user?.id) {
          await updateDoc(doc(db, 'users', user.id), {
            email: newEmail.toLowerCase().trim(),
            updatedAt: new Date(),
          });
        }
        await refreshUser();
        Alert.alert('Email Updated', 'Your email address has been verified and saved!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Not Yet Verified', 'Please click the verification link in your email first.');
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      Alert.alert('Error', 'Failed to check verification status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {isPhoneUser && !hasRealEmail ? 'Add Email' : 'Edit Email'}
        </ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        {!isPhoneUser && (
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Current Email</ThemedText>
            <View style={styles.inputWrapper}>
              <ThemedText style={styles.currentEmail}>{user?.email}</ThemedText>
            </View>
          </View>
        )}

        {hasRealEmail && isPhoneUser && (
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Current Email</ThemedText>
            <View style={styles.inputWrapper}>
              <ThemedText style={styles.currentEmail}>{user?.email}</ThemedText>
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>
            {isPhoneUser && !hasRealEmail ? 'Email Address' : 'New Email Address'}
          </ThemedText>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor="#555"
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!linkSent}
            />
          </View>
        </View>

        {isPhoneUser ? (
          <TouchableOpacity
            style={[styles.saveButton, (isUpdating || !validateEmail(newEmail)) && styles.saveButtonDisabled]}
            onPress={handleSaveEmail}
            disabled={isUpdating || !validateEmail(newEmail)}
            activeOpacity={0.8}
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save Email</ThemedText>
            )}
          </TouchableOpacity>
        ) : linkSent ? (
          <>
            <View style={styles.sentNotice}>
              <IconSymbol size={18} name="checkmark.circle.fill" color="#4ade80" />
              <ThemedText style={styles.sentNoticeText}>
                Verification email sent to {newEmail}. Tap the link in your email, then confirm below.
              </ThemedText>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isChecking && styles.saveButtonDisabled]}
              onPress={handleCheckVerification}
              disabled={isChecking}
              activeOpacity={0.8}
            >
              {isChecking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.saveButtonText}>I've Verified My Email</ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => { setLinkSent(false); }}
            >
              <ThemedText style={styles.resendButtonText}>Change email or resend</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.saveButton, (isUpdating || !validateEmail(newEmail)) && styles.saveButtonDisabled]}
            onPress={handleSendVerification}
            disabled={isUpdating || !validateEmail(newEmail)}
            activeOpacity={0.8}
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Send Verification Email</ThemedText>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
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
  currentEmail: {
    paddingVertical: 14,
    fontSize: 15,
    color: '#555',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  sentNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderRadius: 12,
    padding: 14,
  },
  sentNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#000',
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
  resendButton: {
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
});
