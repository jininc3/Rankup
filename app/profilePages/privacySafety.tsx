import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const ADMIN_IDS = ['VljkZhdkF3gCQI0clVkbQ0XCIxp1'];

export default function PrivacySafetyScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.id ? ADMIN_IDS.includes(user.id) : false;

  // Privacy toggles
  const [privateAccountEnabled, setPrivateAccountEnabled] = useState(user?.isPrivate || false);

  useEffect(() => {
    setPrivateAccountEnabled(user?.isPrivate || false);
  }, [user?.isPrivate]);
  const [showOnlineStatusEnabled, setShowOnlineStatusEnabled] = useState(true);
  const [allowTagsEnabled, setAllowTagsEnabled] = useState(true);

  // Load showOnlineStatus from Firestore
  useEffect(() => {
    const loadOnlineStatus = async () => {
      if (!user?.id) return;
      try {
        const { getDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setShowOnlineStatusEnabled(data.showOnlineStatus !== false); // default true
        }
      } catch (error) {
        console.error('Error loading online status setting:', error);
      }
    };
    loadOnlineStatus();
  }, [user?.id]);

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
          onValueChange: (newValue: boolean) => {
            if (newValue) {
              Alert.alert(
                'Switch to Private Account?',
                'Only approved followers will be able to see your posts. Your existing followers will not be affected.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Go Private',
                    onPress: async () => {
                      setPrivateAccountEnabled(true);
                      if (user?.id) {
                        try {
                          await updateDoc(doc(db, 'users', user.id), { isPrivate: true });
                          if (refreshUser) await refreshUser();
                        } catch (error) {
                          console.error('Error updating privacy setting:', error);
                          setPrivateAccountEnabled(false);
                        }
                      }
                    },
                  },
                ]
              );
            } else {
              setPrivateAccountEnabled(false);
              if (user?.id) {
                updateDoc(doc(db, 'users', user.id), { isPrivate: false })
                  .then(() => refreshUser?.())
                  .catch((error) => {
                    console.error('Error updating privacy setting:', error);
                    setPrivateAccountEnabled(true);
                  });
              }
            }
          },
        },
        {
          id: 2,
          icon: 'circle.fill',
          title: 'Show Online Status',
          subtitle: 'Let others see when you\'re active',
          value: showOnlineStatusEnabled,
          onValueChange: async (newValue: boolean) => {
            setShowOnlineStatusEnabled(newValue);
            if (user?.id) {
              try {
                await updateDoc(doc(db, 'users', user.id), { showOnlineStatus: newValue });
              } catch (error) {
                console.error('Error updating online status setting:', error);
                setShowOnlineStatusEnabled(!newValue);
              }
            }
          },
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
        ...(isAdmin ? [{
          id: 10,
          icon: 'flag' as const,
          title: 'Reports (Admin)',
          subtitle: 'Review reported posts',
          hasChevron: true,
        }] : []),
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
      {/* Top background gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
        pointerEvents="none"
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={20} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Privacy & Safety</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Privacy Settings with Toggles */}
        {privacySettings.map((section) => (
          <View key={section.id} style={styles.section}>
            {section.title && (
              <View style={styles.sectionHeader}>
                <IconSymbol
                  size={18}
                  name={section.id === 'account' ? 'lock.shield' : 'person.2.fill'}
                  color="#fff"
                />
                <ThemedText style={styles.sectionHeaderTitle}>{section.title}</ThemedText>
              </View>
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
                      <IconSymbol size={20} name={item.icon} color="#888" />
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
                    trackColor={{ false: '#252525', true: '#c42743' }}
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
              <View style={styles.sectionHeader}>
                <IconSymbol
                  size={18}
                  name={section.id === 'controls' ? 'hand.raised.fill' : 'doc.text.fill'}
                  color="#fff"
                />
                <ThemedText style={styles.sectionHeaderTitle}>{section.title}</ThemedText>
              </View>
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
                    if (item.id === 1) router.push('/profilePages/blockedUsers');
                    if (item.id === 10) router.push('/profilePages/adminReports');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>
                      <IconSymbol size={20} name={item.icon} color="#888" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <ThemedText style={styles.settingTitle}>{item.title}</ThemedText>
                      {item.subtitle && (
                        <ThemedText style={styles.settingSubtitle}>{item.subtitle}</ThemedText>
                      )}
                    </View>
                  </View>
                  {item.hasChevron && (
                    <IconSymbol size={18} name="chevron.right" color="#444" />
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
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 15,
  },
  backButton: {
    padding: 4,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  settingsGroup: {
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
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
    borderRadius: 8,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: -0.2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bottomSpacer: {
    height: 40,
  },
});
