import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';

export default function PrivacySafetyScreen() {
  const router = useRouter();

  // Privacy toggles
  const [privateAccountEnabled, setPrivateAccountEnabled] = useState(false);
  const [showOnlineStatusEnabled, setShowOnlineStatusEnabled] = useState(true);
  const [showActivityEnabled, setShowActivityEnabled] = useState(true);
  const [allowTagsEnabled, setAllowTagsEnabled] = useState(true);

  const privacySettings = [
    {
      id: 'account',
      title: 'Account Privacy',
      items: [
        {
          id: 1,
          icon: 'lock.circle',
          title: 'Private Account',
          subtitle: 'Only approved followers can see your posts',
          value: privateAccountEnabled,
          onValueChange: setPrivateAccountEnabled,
        },
        {
          id: 2,
          icon: 'circle.fill',
          title: 'Show Online Status',
          subtitle: 'Let others see when you\'re active',
          value: showOnlineStatusEnabled,
          onValueChange: setShowOnlineStatusEnabled,
        },
        {
          id: 3,
          icon: 'clock',
          title: 'Show Activity Status',
          subtitle: 'Let others see your recent activity',
          value: showActivityEnabled,
          onValueChange: setShowActivityEnabled,
        },
      ],
    },
    {
      id: 'interactions',
      title: 'Interactions',
      items: [
        {
          id: 4,
          icon: 'at',
          title: 'Allow Tags',
          subtitle: 'Let others tag you in posts',
          value: allowTagsEnabled,
          onValueChange: setAllowTagsEnabled,
        },
      ],
    },
  ];

  const safetyOptions = [
    {
      id: 'controls',
      title: 'Safety Controls',
      items: [
        {
          id: 1,
          icon: 'hand.raised',
          title: 'Blocked Accounts',
          subtitle: 'Manage blocked users',
          hasChevron: true,
        },
        {
          id: 2,
          icon: 'eye.slash',
          title: 'Muted Accounts',
          subtitle: 'Manage muted users',
          hasChevron: true,
        },
        {
          id: 3,
          icon: 'exclamationmark.shield',
          title: 'Content Filtering',
          subtitle: 'Filter sensitive content',
          hasChevron: true,
        },
      ],
    },
    {
      id: 'data',
      title: 'Data & Permissions',
      items: [
        {
          id: 4,
          icon: 'location',
          title: 'Location Services',
          subtitle: 'Manage location access',
          hasChevron: true,
        },
        {
          id: 5,
          icon: 'photo',
          title: 'Photo Access',
          subtitle: 'Manage photo library permissions',
          hasChevron: true,
        },
        {
          id: 6,
          icon: 'video',
          title: 'Camera Access',
          subtitle: 'Manage camera permissions',
          hasChevron: true,
        },
        {
          id: 7,
          icon: 'doc.text',
          title: 'Data Usage',
          subtitle: 'See what data we collect',
          hasChevron: true,
        },
      ],
    },
  ];

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
        <ThemedText style={styles.headerTitle}>Privacy & Safety</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Privacy Settings with Toggles */}
        {privacySettings.map((section) => (
          <View key={section.id} style={styles.section}>
            {section.title && (
              <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            )}
            <View style={styles.settingsGroup}>
              {section.items.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.settingItem,
                    index === section.items.length - 1 && styles.settingItemLast,
                  ]}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>
                      <IconSymbol size={22} name={item.icon} color="#fff" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <ThemedText style={styles.settingTitle}>{item.title}</ThemedText>
                      {item.subtitle && (
                        <ThemedText style={styles.settingSubtitle}>{item.subtitle}</ThemedText>
                      )}
                    </View>
                  </View>
                  <Switch
                    value={item.value}
                    onValueChange={item.onValueChange}
                    trackColor={{ false: '#2c2f33', true: '#007AFF' }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Safety Options */}
        {safetyOptions.map((section) => (
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
                      <IconSymbol size={22} name={item.icon} color="#fff" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <ThemedText style={styles.settingTitle}>{item.title}</ThemedText>
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
    fontSize: 17,
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
  bottomSpacer: {
    height: 40,
  },
});
