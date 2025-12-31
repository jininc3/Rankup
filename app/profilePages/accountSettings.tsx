import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { deleteUserAccount } from '@/services/deleteAccountService';
import { useState } from 'react';

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
      {
        id: 5,
        icon: 'checkmark.shield',
        title: 'Two-Factor Authentication',
        subtitle: 'Add extra security',
        hasChevron: true,
      },
      {
        id: 6,
        icon: 'app.connected.to.app.below.fill',
        title: 'Connected Accounts',
        subtitle: 'Manage linked accounts',
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
  const [isDeleting, setIsDeleting] = useState(false);

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

    setIsDeleting(true);

    try {
      await deleteUserAccount(user.id);

      // Close modal and navigate to login
      setShowDeleteModal(false);
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
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error',
        'Failed to delete account. Please try again or contact support.'
      );
    } finally {
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
          <IconSymbol size={24} name="chevron.left" color="#000" />
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
                    if (item.id === 8) {
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
                        color={item.isDangerous ? '#ef4444' : '#000'}
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
                    <IconSymbol size={20} name="chevron.right" color="#666" />
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
                <IconSymbol size={16} name="checkmark" color="#666" />
                <ThemedText style={styles.deleteListText}>All your posts and media</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#666" />
                <ThemedText style={styles.deleteListText}>Your profile and photos</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#666" />
                <ThemedText style={styles.deleteListText}>All comments and likes</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#666" />
                <ThemedText style={styles.deleteListText}>Your followers and following</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#666" />
                <ThemedText style={styles.deleteListText}>All chat messages</ThemedText>
              </View>
              <View style={styles.deleteListItem}>
                <IconSymbol size={16} name="checkmark" color="#666" />
                <ThemedText style={styles.deleteListText}>Leaderboard party memberships</ThemedText>
              </View>
            </View>

            <View style={styles.confirmInputContainer}>
              <ThemedText style={styles.confirmInputLabel}>
                Type DELETE to confirm:
              </ThemedText>
              <TextInput
                style={styles.confirmInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="DELETE"
                placeholderTextColor="#999"
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
  section: {
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginHorizontal: 32,
  },
  settingsGroup: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    color: '#000',
    letterSpacing: -0.2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: '#fff',
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
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  deleteListContainer: {
    backgroundColor: '#f9fafb',
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
    color: '#333',
    flex: 1,
  },
  confirmInputContainer: {
    marginBottom: 24,
  },
  confirmInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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
});
