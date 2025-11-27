import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

const settingsData = [
  {
    id: 'account',
    title: 'Account',
    items: [
      {
        id: 2,
        icon: 'gearshape',
        title: 'Account Settings',
        hasChevron: true,
      },
    ],
  },
  {
    id: 'preferences',
    title: 'Preferences',
    items: [
      {
        id: 4,
        icon: 'bell',
        title: 'Notifications & Preferences',
        hasChevron: true,
      },
      {
        id: 5,
        icon: 'lock.shield',
        title: 'Privacy & Safety',
        hasChevron: true,
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    items: [
      {
        id: 11,
        icon: 'questionmark.circle',
        title: 'Help Center',
        hasChevron: false,
      },
      {
        id: 12,
        icon: 'doc.text',
        title: 'Privacy Policy',
        hasChevron: false,
      },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
              console.error(error);
            }
          },
        },
      ]
    );
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
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Settings Sections */}
        {settingsData.map((section) => (
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
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>
                      <IconSymbol size={22} name={item.icon} color="#000" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <ThemedText style={styles.settingTitle}>{item.title}</ThemedText>
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

        {/* Account Info & Sign Out */}
        {user && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>
            <View style={styles.settingsGroup}>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <IconSymbol size={22} name="person.circle" color="#000" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <ThemedText style={styles.settingTitle}>{user.username}</ThemedText>
                    <ThemedText style={styles.settingSubtitle}>
                      Signed in with {user.provider}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Sign Out Button */}
        <View style={styles.section}>
          <View style={styles.settingsGroup}>
            <TouchableOpacity
              style={[styles.settingItem, styles.settingItemLast, styles.signOutButton]}
              onPress={handleSignOut}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <IconSymbol size={22} name="rectangle.portrait.and.arrow.right" color="#ef4444" />
                </View>
                <ThemedText style={[styles.settingTitle, styles.signOutText]}>Sign Out</ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  bottomSpacer: {
    height: 40,
  },
  signOutButton: {
    backgroundColor: '#fff',
  },
  signOutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});