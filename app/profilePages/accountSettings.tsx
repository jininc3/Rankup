import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from '@/hooks/useRouter';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { GoogleAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

const accountSettingsData = [
  {
    id: 'profile',
    title: 'Profile Information',
    items: [
      { id: 1, icon: 'person', title: 'Edit Username', subtitle: 'Change your display name', hasChevron: true },
      { id: 2, icon: 'envelope', title: 'Email Address', subtitle: 'Update your email', hasChevron: true },
      { id: 3, icon: 'phone', title: 'Phone Number', subtitle: 'Add or change phone', hasChevron: true },
      { id: 4, icon: 'lock', title: 'Change Password', subtitle: 'Update your password', hasChevron: true, passwordOnly: true },
    ],
  },
  {
    id: 'data',
    title: 'Data & Privacy',
    items: [
      { id: 7, icon: 'arrow.down.doc', title: 'Download Your Data', subtitle: 'Request a copy of your data', hasChevron: true },
      { id: 8, icon: 'trash', title: 'Delete Account', subtitle: 'Permanently delete your account', hasChevron: true, isDangerous: true },
    ],
  },
];

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [authProvider, setAuthProvider] = useState<'password' | 'google.com' | 'phone' | null>(null);
  const googleAuth = useGoogleAuth();
  const [isEditUsernameFlow, setIsEditUsernameFlow] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.providerData.length > 0) {
      setAuthProvider(currentUser.providerData[0]?.providerId as any);
    }
  }, []);

  useEffect(() => {
    if (googleAuth.response?.type === 'success' && isEditUsernameFlow) {
      handleGoogleEditUsernameSuccess(googleAuth.response);
    }
  }, [googleAuth.response]);

  const handleEditUsername = async () => {
    if (user?.provider === 'google') {
      Alert.alert(
        'Verify Your Identity',
        'Please sign in with your Google account to verify your identity.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In with Google',
            onPress: async () => {
              try {
                setIsEditUsernameFlow(true);
                await googleAuth.promptAsync();
              } catch (error: any) {
                Alert.alert('Error', 'Failed to open Google sign-in.');
                setIsEditUsernameFlow(false);
              }
            },
          },
        ]
      );
      return;
    }
    router.push('/profilePages/editUsername');
  };

  const handleGoogleEditUsernameSuccess = async (response: any) => {
    try {
      const { id_token } = response.params;
      if (id_token) {
        const currentUser = auth.currentUser;
        if (!currentUser) { setIsEditUsernameFlow(false); return; }
        const googleCredential = GoogleAuthProvider.credential(id_token);
        await reauthenticateWithCredential(currentUser, googleCredential);
        setIsEditUsernameFlow(false);
        router.push('/profilePages/editUsername');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to verify your identity.');
      setIsEditUsernameFlow(false);
    }
  };

  const handleEditEmail = async () => {
    if (user?.provider === 'google') {
      Alert.alert('Not Available', 'Email editing is not available for Google accounts.');
      return;
    }
    router.push('/profilePages/editEmail');
  };

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={22} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Account Settings</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {accountSettingsData.map((section) => {
          const filteredItems = section.items.filter((item: any) => !item.passwordOnly || authProvider === 'password');
          if (filteredItems.length === 0) return null;
          return (
          <View key={section.id} style={styles.section}>
            {section.title && (
              <View style={styles.sectionHeader}>
                <IconSymbol
                  size={18}
                  name={section.id === 'profile' ? 'person.fill' : 'doc.text'}
                  color="#fff"
                />
                <ThemedText style={styles.sectionHeaderTitle}>{section.title}</ThemedText>
              </View>
            )}
            <View style={styles.settingsGroup}>
              {filteredItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.settingItem, index === filteredItems.length - 1 && styles.settingItemLast]}
                  onPress={() => {
                    if (item.id === 1) handleEditUsername();
                    else if (item.id === 2) handleEditEmail();
                    else if (item.id === 4) router.push('/profilePages/changePassword');
                    else if (item.id === 8) router.push('/profilePages/deleteAccount');
                  }}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>
                      <IconSymbol size={20} name={item.icon} color={item.isDangerous ? '#c42743' : '#888'} />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <ThemedText style={[styles.settingTitle, item.isDangerous && styles.dangerousText]}>
                        {item.title}
                      </ThemedText>
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
          );
        })}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  sectionHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  settingsGroup: {
    marginHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingItemLast: { borderBottomWidth: 0 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconContainer: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '500', color: '#fff' },
  settingSubtitle: { fontSize: 12, color: '#555', marginTop: 2 },
  dangerousText: { color: '#c42743' },
  bottomSpacer: { height: 40 },
});
