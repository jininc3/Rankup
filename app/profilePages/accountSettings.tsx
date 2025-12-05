import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

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
});
