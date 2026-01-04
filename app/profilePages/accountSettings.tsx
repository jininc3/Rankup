import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { deleteUserAccount } from '@/services/deleteAccountService';
import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { EmailAuthProvider, reauthenticateWithCredential, GoogleAuthProvider } from 'firebase/auth';

const accountSettingsData = [
  {
    id: 'profile',
    title: 'Profile Information',
    items: [
      {
        id: 1,
        icon: 'person',
        title: 'Edit Username',
        subtitle: 'Change your display name',
        hasChevron: true,
      },
      {
        id: 2,
        icon: 'envelope',
        title: 'Email Address',
        subtitle: 'Update your email',
        hasChevron: true,
      },
      {
        id: 3,
        icon: 'phone',
        title: 'Phone Number',
        subtitle: 'Add or change phone',
        hasChevron: true,
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    items: [
      {
        id: 4,
        icon: 'lock',
        title: 'Change Password',
        subtitle: 'Update your password',
        hasChevron: true,
      },
    ],
  },
  {
    id: 'data',
    title: 'Data & Privacy',
    items: [
      {
        id: 7,
        icon: 'arrow.down.doc',
        title: 'Download Your Data',
        subtitle: 'Request a copy of your data',
        hasChevron: true,
      },
      {
        id: 8,
        icon: 'trash',
        title: 'Delete Account',
        subtitle: 'Permanently delete your account',
        hasChevron: true,
        isDangerous: true,
      },
    ],
  },
];

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [authProvider, setAuthProvider] = useState<'password' | 'google.com' | null>(null);
  const googleAuth = useGoogleAuth();

  // Edit Username states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEditUsernameFlow, setIsEditUsernameFlow] = useState(false);
  const [isEditEmailFlow, setIsEditEmailFlow] = useState(false);
  const [isChangePasswordFlow, setIsChangePasswordFlow] = useState(false);

  // Detect the authentication provider when component mounts
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.providerData.length > 0) {
      const providerId = currentUser.providerData[0]?.providerId;
      setAuthProvider(providerId as 'password' | 'google.com');
    }
  }, []);

  // Handle Google re-authentication response
  useEffect(() => {
    if (googleAuth.response?.type === 'success') {
      if (isEditUsernameFlow) {
        handleGoogleEditUsernameSuccess(googleAuth.response);
      } else if (isDeleting) {
        handleGoogleDeleteSuccess(googleAuth.response);
      }
    }
  }, [googleAuth.response]);

  // Handle Edit Username
  const handleEditUsername = async () => {
    // Handle Gmail/Google users - re-authenticate with Google
    if (user?.provider === 'google') {
      Alert.alert(
        'Verify Your Identity',
        'Please sign in with your Google account to verify your identity before editing your username.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Sign In with Google',
            onPress: async () => {
              try {
                setIsEditUsernameFlow(true);
                await googleAuth.promptAsync();
              } catch (error: any) {
                console.error('Google sign-in prompt error:', error);
                Alert.alert('Error', 'Failed to open Google sign-in. Please try again.');
                setIsEditUsernameFlow(false);
              }
            },
          },
        ]
      );
      return;
    }

    // Handle email/password users - show password verification modal
    if (user?.provider === 'email') {
      setShowPasswordModal(true);
      return;
    }

    // For other providers (if any)
    Alert.alert(
      'Not Available',
      'Username editing is not available for your account type.',
      [{ text: 'OK' }]
    );
  };

  const handleGoogleEditUsernameSuccess = async (response: any) => {
    try {
      const { id_token } = response.params;

      if (id_token) {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          Alert.alert('Error', 'User not found');
          setIsEditUsernameFlow(false);
          return;
        }

        // Re-authenticate with Google credential
        const googleCredential = GoogleAuthProvider.credential(id_token);
        await reauthenticateWithCredential(currentUser, googleCredential);

        // Successfully re-authenticated, navigate to edit username page
        setIsEditUsernameFlow(false);
        router.push('/profilePages/editUsername');
      }
    } catch (error: any) {
      console.error('Google re-authentication error:', error);
      Alert.alert('Error', 'Failed to verify your identity. Please try again.');
      setIsEditUsernameFlow(false);
    }
  };

  const handleEditEmail = async () => {
    // Only available for email/password users
    if (user?.provider !== 'email') {
      Alert.alert(
        'Not Available',
        'Email editing is only available for email/password accounts.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsEditEmailFlow(true);
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    // Only available for email/password users
    if (user?.provider !== 'email') {
      Alert.alert(
        'Not Available',
        'Password change is only available for email/password accounts.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsChangePasswordFlow(true);
    setShowPasswordModal(true);
  };

  const handleVerifyPassword = async () => {
    // Validate passwords
    if (!verifyPassword || !confirmPassword) {
      Alert.alert('Error', 'Please enter your password in both fields');
      return;
    }

    if (verifyPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsVerifying(true);

    try {
      // Re-authenticate user with their password
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        Alert.alert('Error', 'User not found');
        setIsVerifying(false);
        return;
      }

      const credential = EmailAuthProvider.credential(currentUser.email, verifyPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Password is correct, navigate to appropriate page
      setShowPasswordModal(false);
      setVerifyPassword('');
      setConfirmPassword('');

      if (isEditEmailFlow) {
        setIsEditEmailFlow(false);
        router.push('/profilePages/editEmail');
      } else if (isChangePasswordFlow) {
        setIsChangePasswordFlow(false);
        router.push('/profilePages/changePassword');
      } else {
        router.push('/profilePages/editUsername');
      }
    } catch (error: any) {
      console.error('Re-authentication error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to verify password. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoogleDeleteSuccess = async (response: any) => {
    try {
      const { id_token } = response.params;
      if (id_token && user?.id) {
        await deleteUserAccount(user.id, undefined, id_token);
        handleDeleteSuccess();
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false);
    setPassword('');
    setDeleteConfirmText('');
    Alert.alert(
      'Account Deleted',
      'Your account has been permanently deleted.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/(auth)/login'),
        },
      ],
      { cancelable: false }
    );
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    // Validate password for email/password users
    if (authProvider === 'password' && !password.trim()) {
      Alert.alert('Error', 'Please enter your password to confirm deletion');
      return;
    }

    setIsDeleting(true);

    try {
      if (authProvider === 'password') {
        // Email/password authentication - delete with password
        await deleteUserAccount(user.id, password);
        handleDeleteSuccess();
      } else if (authProvider === 'google.com') {
        // Google authentication - prompt for Google sign-in
        await googleAuth.promptAsync();
        // The actual deletion will happen in the handleGoogleDeleteSuccess callback
      } else {
        Alert.alert('Error', 'Unknown authentication provider');
        setIsDeleting(false);
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to delete account. Please try again.'
      );
      setIsDeleting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color="#fff" />
          <ThemedText style={styles.backText}>Settings</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Account Settings</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Settings Sections */}
        {accountSettingsData.map((section) => (
          <View key={section.id} style={styles.section}>
            {section.title && (
              <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            )}
            <View style={styles.settingsGroup}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    index === section.items.length - 1 && styles.settingItemLast,
                  ]}
                  onPress={() => {
                    if (item.id === 1) {
                      // Edit Username
                      handleEditUsername();
                    } else if (item.id === 2) {
                      // Edit Email
                      handleEditEmail();
                    } else if (item.id === 4) {
                      // Change Password
                      handleChangePassword();
                    } else if (item.id === 8) {
                      // Delete Account
                      handleDeleteAccountPress();
                    }
                  }}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>
                      <IconSymbol
                        size={22}
                        name={item.icon}
                        color={item.isDangerous ? '#ef4444' : '#fff'}
                      />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <ThemedText style={[
                        styles.settingTitle,
                        item.isDangerous && styles.dangerousText
                      ]}>
                        {item.title}
                      </ThemedText>
                      {item.subtitle && (
                        <ThemedText style={styles.settingSubtitle}>{item.subtitle}</ThemedText>
                      )}
                    </View>
                  </View>
                  {item.hasChevron && (
                    <IconSymbol size={20} name="chevron.right" color="#b9bbbe" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <IconSymbol size={48} name="exclamationmark.triangle.fill" color="#ef4444" />
              <ThemedText style={styles.modalTitle}>Delete Account</ThemedText>
              <ThemedText style={styles.modalDescription}>
                This will permanently delete:
              </ThemedText>
            </View>

            <View style={styles.deleteListContainer}>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#b9bbbe" />
                <ThemedText style={styles.deleteListText}>All your posts and media</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#b9bbbe" />
                <ThemedText style={styles.deleteListText}>Your profile and photos</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#b9bbbe" />
                <ThemedText style={styles.deleteListText}>All comments and likes</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#b9bbbe" />
                <ThemedText style={styles.deleteListText}>Your followers and following</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#b9bbbe" />
                <ThemedText style={styles.deleteListText}>All chat messages</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#b9bbbe" />
                <ThemedText style={styles.deleteListText}>Leaderboard party memberships</ThemedText>
              </View>
            </View>

            {/* Password input for email/password users */}
            {authProvider === 'password' && (
              <View style={styles.confirmInputContainer}>
                <ThemedText style={styles.confirmInputLabel}>
                  Enter your password:
                </ThemedText>
                <TextInput
                  style={styles.confirmInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor="#72767d"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isDeleting}
                />
              </View>
            )}

            {/* Google re-authentication notice */}
            {authProvider === 'google.com' && (
              <View style={styles.confirmInputContainer}>
                <ThemedText style={styles.googleNotice}>
                  You will be prompted to sign in with Google to confirm this action.
                </ThemedText>
              </View>
            )}

            <View style={styles.confirmInputContainer}>
              <ThemedText style={styles.confirmInputLabel}>
                Type DELETE to confirm:
              </ThemedText>
              <TextInput
                style={styles.confirmInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="DELETE"
                placeholderTextColor="#72767d"
                autoCapitalize="characters"
                editable={!isDeleting}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setPassword('');
                  setIsDeleting(false);
                }}
                disabled={isDeleting}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalDeleteButton,
                  (deleteConfirmText.toUpperCase() !== 'DELETE' || isDeleting) &&
                    styles.modalDeleteButtonDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={deleteConfirmText.toUpperCase() !== 'DELETE' || isDeleting}
              >
                <ThemedText style={styles.modalDeleteText}>
                  {isDeleting ? 'Deleting...' : 'Delete Forever'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password Verification Modal for Edit Username */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Verify Password</ThemedText>
            <ThemedText style={styles.modalDescription}>
              Please enter your password twice to verify your identity
            </ThemedText>

            <View style={styles.confirmInputContainer}>
              <TextInput
                style={styles.confirmInput}
                placeholder="Enter password"
                placeholderTextColor="#72767d"
                secureTextEntry
                value={verifyPassword}
                onChangeText={setVerifyPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
            </View>

            <View style={styles.confirmInputContainer}>
              <TextInput
                style={styles.confirmInput}
                placeholder="Confirm password"
                placeholderTextColor="#72767d"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setVerifyPassword('');
                  setConfirmPassword('');
                }}
                disabled={isVerifying}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  isVerifying && styles.verifyButtonDisabled
                ]}
                onPress={handleVerifyPassword}
                disabled={isVerifying}
              >
                <ThemedText style={styles.verifyButtonText}>
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  backText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b9bbbe',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginHorizontal: 32,
  },
  settingsGroup: {
    marginHorizontal: 16,
    backgroundColor: '#36393e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2f33',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: -0.2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#b9bbbe',
    marginTop: 2,
  },
  dangerousText: {
    color: '#ef4444',
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#36393e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: '#b9bbbe',
    textAlign: 'center',
  },
  deleteListContainer: {
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  deleteListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteListText: {
    fontSize: 14,
    color: '#dcddde',
    flex: 1,
  },
  confirmInputContainer: {
    marginBottom: 24,
  },
  confirmInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: '#2c2f33',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#2c2f33',
  },
  googleNotice: {
    fontSize: 14,
    color: '#b9bbbe',
    textAlign: 'center',
    backgroundColor: '#2c2f33',
    padding: 12,
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalDeleteButtonDisabled: {
    backgroundColor: '#fca5a5',
    opacity: 0.5,
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  verifyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#c42743',
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
});
