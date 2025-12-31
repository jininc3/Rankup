import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { unlinkRiotAccount } from '@/services/riotService';

const settingsData = [
  {
    id: 'preferences',
    title: 'Preferences',
    items: [
      {
        id: 4,
        icon: 'bell',
        title: 'Notifications & Preferences',
        hasChevron: true,
        route: '/profilePages/notificationsPreferences',
      },
      {
        id: 5,
        icon: 'lock.shield',
        title: 'Privacy & Safety',
        hasChevron: true,
        route: '/profilePages/privacySafety',
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
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    checkAccounts();
  }, [user]);

  // Refresh account status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkAccounts();
    }, [user])
  );

  const checkAccounts = async () => {
    if (!user || !user.id) {
      setLoadingAccounts(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('User data from Firestore:', data);

        // Check for Riot account (League of Legends)
        if (data.riotAccount) {
          setRiotAccount(data.riotAccount);
          console.log('Riot account set to:', data.riotAccount);
        } else {
          setRiotAccount(null);
          console.log('No riotAccount found in user data');
        }

        // Check for Valorant account
        if (data.valorantAccount) {
          setValorantAccount(data.valorantAccount);
          console.log('Valorant account set to:', data.valorantAccount);
        } else {
          setValorantAccount(null);
          console.log('No valorantAccount found in user data');
        }
      }
    } catch (error) {
      console.error('Error checking accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleLinkRiotAccount = () => {
    if (riotAccount) {
      Alert.alert(
        'Account Already Linked',
        'You already have a League of Legends account linked. Please unlink it first if you want to link a different one.',
        [{ text: 'OK' }]
      );
      return;
    }
    router.push('/profilePages/linkRiotAccount');
  };

  const handleLinkValorantAccount = () => {
    if (valorantAccount) {
      Alert.alert(
        'Account Already Linked',
        'You already have a Valorant account linked. Please unlink it first if you want to link a different one.',
        [{ text: 'OK' }]
      );
      return;
    }
    router.push('/profilePages/linkValorantAccount');
  };

  const handleUnlinkRiotAccount = () => {
    if (!riotAccount) {
      Alert.alert('No Account Linked', 'You don\'t have a League of Legends account linked yet. Connect one first!');
      return;
    }

    Alert.alert(
      'Unlink League Account',
      `Are you sure you want to unlink ${riotAccount?.gameName}#${riotAccount?.tagLine}? Your League rank card will be removed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkRiotAccount();

              // Remove League rank cards from enabled list
              if (user?.id) {
                const userDoc = await getDoc(doc(db, 'users', user.id));
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  const currentCards = data.enabledRankCards || [];
                  const updatedCards = currentCards.filter((card: string) => card !== 'league' && card !== 'tft');

                  await updateDoc(doc(db, 'users', user.id), {
                    enabledRankCards: updatedCards,
                  });
                }
              }

              setRiotAccount(null);
              Alert.alert('Success', 'League of Legends account unlinked successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unlink League account');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleUnlinkValorantAccount = async () => {
    if (!valorantAccount) {
      Alert.alert('No Account Linked', 'You don\'t have a Valorant account linked yet. Connect one first!');
      return;
    }

    Alert.alert(
      'Unlink Valorant Account',
      `Are you sure you want to unlink ${valorantAccount?.gameName}#${valorantAccount?.tagLine}? Your Valorant rank card will be removed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove Valorant account from Firestore
              if (user?.id) {
                await updateDoc(doc(db, 'users', user.id), {
                  valorantAccount: null,
                  valorantStats: null,
                });

                // Remove Valorant rank card from enabled list
                const userDoc = await getDoc(doc(db, 'users', user.id));
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  const currentCards = data.enabledRankCards || [];
                  const updatedCards = currentCards.filter((card: string) => card !== 'valorant');

                  await updateDoc(doc(db, 'users', user.id), {
                    enabledRankCards: updatedCards,
                  });
                }
              }

              setValorantAccount(null);
              Alert.alert('Success', 'Valorant account unlinked successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unlink Valorant account');
              console.error(error);
            }
          },
        },
      ]
    );
  };

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
        {/* Account Section with merged user info */}
        {user && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>
            <View style={styles.settingsGroup}>
              {/* User Info - Centered */}
              <View style={[styles.settingItem, styles.userInfoItem]}>
                <View style={styles.userInfoContent}>
                  <View style={styles.userInfoRow}>
                    <IconSymbol size={28} name="person.circle" color="#000" />
                    <ThemedText style={styles.userInfoTitle}>{user.username}</ThemedText>
                  </View>
                  <ThemedText style={styles.userInfoSubtitle}>
                    Signed in with {user.provider}
                  </ThemedText>
                </View>
              </View>

              {/* View Profile Preview */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => router.push('/profilePages/profilePreview')}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <IconSymbol size={22} name="eye" color="#000" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <ThemedText style={styles.settingTitle}>View Profile Preview</ThemedText>
                  </View>
                </View>
                <IconSymbol size={20} name="chevron.right" color="#666" />
              </TouchableOpacity>

              {/* Account Settings */}
              <TouchableOpacity
                style={[styles.settingItem, styles.settingItemLast]}
                onPress={() => router.push('/profilePages/accountSettings')}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.iconContainer}>
                    <IconSymbol size={22} name="gearshape" color="#000" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <ThemedText style={styles.settingTitle}>Account Settings</ThemedText>
                  </View>
                </View>
                <IconSymbol size={20} name="chevron.right" color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Connected Accounts Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Connected Accounts</ThemedText>
          <View style={styles.settingsGroup}>
            {/* League of Legends */}
            <TouchableOpacity
              style={[styles.settingItem, riotAccount && styles.disabledSettingItem]}
              onPress={handleLinkRiotAccount}
              disabled={!!riotAccount}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <IconSymbol size={22} name="gamecontroller" color={riotAccount ? "#999" : "#000"} />
                </View>
                <View style={styles.settingTextContainer}>
                  <ThemedText style={[styles.settingTitle, riotAccount && styles.disabledText]}>
                    {riotAccount ? 'League of Legends Account' : 'Connect to League of Legends'}
                  </ThemedText>
                  <ThemedText style={styles.settingSubtitle}>
                    {loadingAccounts
                      ? 'Checking...'
                      : riotAccount
                      ? `${riotAccount.gameName}#${riotAccount.tagLine}`
                      : 'Link your League account'}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.settingRight}>
                {riotAccount && (
                  <View style={styles.connectedBadge}>
                    <ThemedText style={styles.connectedBadgeText}>Connected</ThemedText>
                  </View>
                )}
                {!riotAccount && <IconSymbol size={20} name="chevron.right" color="#666" />}
              </View>
            </TouchableOpacity>

            {/* Unlink League Account - Only show if linked */}
            {riotAccount && (
              <TouchableOpacity
                style={styles.compactUnlinkButton}
                onPress={handleUnlinkRiotAccount}
              >
                <IconSymbol size={16} name="link.badge.minus" color="#ef4444" />
                <ThemedText style={styles.compactUnlinkText}>
                  Unlink
                </ThemedText>
              </TouchableOpacity>
            )}

            {/* Valorant */}
            <TouchableOpacity
              style={[styles.settingItem, valorantAccount && styles.disabledSettingItem]}
              onPress={handleLinkValorantAccount}
              disabled={!!valorantAccount}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <IconSymbol size={22} name="target" color={valorantAccount ? "#999" : "#000"} />
                </View>
                <View style={styles.settingTextContainer}>
                  <ThemedText style={[styles.settingTitle, valorantAccount && styles.disabledText]}>
                    {valorantAccount ? 'Valorant Account' : 'Connect to Valorant'}
                  </ThemedText>
                  <ThemedText style={styles.settingSubtitle}>
                    {loadingAccounts
                      ? 'Checking...'
                      : valorantAccount
                      ? `${valorantAccount.gameName}#${valorantAccount.tagLine}`
                      : 'Link your Valorant account'}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.settingRight}>
                {valorantAccount && (
                  <View style={styles.connectedBadge}>
                    <ThemedText style={styles.connectedBadgeText}>Connected</ThemedText>
                  </View>
                )}
                {!valorantAccount && <IconSymbol size={20} name="chevron.right" color="#666" />}
              </View>
            </TouchableOpacity>

            {/* Unlink Valorant Account - Only show if linked */}
            {valorantAccount && (
              <TouchableOpacity
                style={styles.compactUnlinkButton}
                onPress={handleUnlinkValorantAccount}
              >
                <IconSymbol size={16} name="link.badge.minus" color="#ef4444" />
                <ThemedText style={styles.compactUnlinkText}>
                  Unlink
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Other Settings Sections */}
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
                  onPress={() => item.route && router.push(item.route)}
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
  disabledSettingItem: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#999',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  connectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
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
  unlinkButton: {
    backgroundColor: '#fff',
  },
  unlinkText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  compactUnlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  compactUnlinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ef4444',
  },
  userInfoItem: {
    justifyContent: 'center',
    paddingVertical: 24,
  },
  userInfoContent: {
    alignItems: 'center',
    gap: 8,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  userInfoSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});