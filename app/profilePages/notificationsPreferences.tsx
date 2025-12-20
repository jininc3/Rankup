import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function NotificationsPreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Notification toggles
  const [likesEnabled, setLikesEnabled] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [followersEnabled, setFollowersEnabled] = useState(true);
  const [rankUpsEnabled, setRankUpsEnabled] = useState(true);
  const [achievementsEnabled, setAchievementsEnabled] = useState(true);
  const [challengesEnabled, setChallengesEnabled] = useState(true);

  // Email preferences
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(false);
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(true);
  const [emailMarketingEnabled, setEmailMarketingEnabled] = useState(false);

  // Load preferences from Firestore on mount
  useEffect(() => {
    if (!user?.id) return;

    const loadPreferences = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          const prefs = data.notificationPreferences;

          if (prefs) {
            // Load notification preferences
            if (prefs.likes !== undefined) setLikesEnabled(prefs.likes);
            if (prefs.comments !== undefined) setCommentsEnabled(prefs.comments);
            if (prefs.followers !== undefined) setFollowersEnabled(prefs.followers);
            if (prefs.rankUps !== undefined) setRankUpsEnabled(prefs.rankUps);
            if (prefs.achievements !== undefined) setAchievementsEnabled(prefs.achievements);
            if (prefs.challenges !== undefined) setChallengesEnabled(prefs.challenges);
            if (prefs.emailDigest !== undefined) setEmailDigestEnabled(prefs.emailDigest);
            if (prefs.emailUpdates !== undefined) setEmailUpdatesEnabled(prefs.emailUpdates);
            if (prefs.emailMarketing !== undefined) setEmailMarketingEnabled(prefs.emailMarketing);
          }
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  // Save preferences to Firestore whenever they change
  const savePreference = async (key: string, value: boolean) => {
    if (!user?.id) return;

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        [`notificationPreferences.${key}`]: value,
      });
      console.log(`Saved preference ${key}:`, value);
    } catch (error) {
      console.error('Error saving notification preference:', error);
    }
  };

  // Wrapper functions that save to Firestore
  const handleLikesChange = (value: boolean) => {
    setLikesEnabled(value);
    savePreference('likes', value);
  };

  const handleCommentsChange = (value: boolean) => {
    setCommentsEnabled(value);
    savePreference('comments', value);
  };

  const handleFollowersChange = (value: boolean) => {
    setFollowersEnabled(value);
    savePreference('followers', value);
  };

  const handleRankUpsChange = (value: boolean) => {
    setRankUpsEnabled(value);
    savePreference('rankUps', value);
  };

  const handleAchievementsChange = (value: boolean) => {
    setAchievementsEnabled(value);
    savePreference('achievements', value);
  };

  const handleChallengesChange = (value: boolean) => {
    setChallengesEnabled(value);
    savePreference('challenges', value);
  };

  const handleEmailDigestChange = (value: boolean) => {
    setEmailDigestEnabled(value);
    savePreference('emailDigest', value);
  };

  const handleEmailUpdatesChange = (value: boolean) => {
    setEmailUpdatesEnabled(value);
    savePreference('emailUpdates', value);
  };

  const handleEmailMarketingChange = (value: boolean) => {
    setEmailMarketingEnabled(value);
    savePreference('emailMarketing', value);
  };

  const notificationSettings = [
    {
      id: 'social',
      title: 'Social',
      items: [
        {
          id: 1,
          icon: 'heart',
          title: 'Likes',
          subtitle: 'When someone likes your post',
          value: likesEnabled,
          onValueChange: handleLikesChange,
        },
        {
          id: 2,
          icon: 'bubble.left',
          title: 'Comments',
          subtitle: 'When someone comments on your post',
          value: commentsEnabled,
          onValueChange: handleCommentsChange,
        },
        {
          id: 3,
          icon: 'person.badge.plus',
          title: 'New Followers',
          subtitle: 'When someone follows you',
          value: followersEnabled,
          onValueChange: handleFollowersChange,
        },
      ],
    },
    {
      id: 'gaming',
      title: 'Gaming Activity',
      items: [
        {
          id: 4,
          icon: 'arrow.up.circle',
          title: 'Rank Updates',
          subtitle: 'When you rank up or down',
          value: rankUpsEnabled,
          onValueChange: handleRankUpsChange,
        },
        {
          id: 5,
          icon: 'trophy',
          title: 'Achievements',
          subtitle: 'When you unlock achievements',
          value: achievementsEnabled,
          onValueChange: handleAchievementsChange,
        },
        {
          id: 6,
          icon: 'gamecontroller',
          title: 'Challenge Invites',
          subtitle: 'When someone challenges you',
          value: challengesEnabled,
          onValueChange: handleChallengesChange,
        },
      ],
    },
    {
      id: 'email',
      title: 'Email Preferences',
      items: [
        {
          id: 7,
          icon: 'envelope.badge',
          title: 'Weekly Digest',
          subtitle: 'Summary of your activity',
          value: emailDigestEnabled,
          onValueChange: handleEmailDigestChange,
        },
        {
          id: 8,
          icon: 'envelope',
          title: 'Product Updates',
          subtitle: 'New features and improvements',
          value: emailUpdatesEnabled,
          onValueChange: handleEmailUpdatesChange,
        },
        {
          id: 9,
          icon: 'megaphone',
          title: 'Marketing Emails',
          subtitle: 'Promotions and offers',
          value: emailMarketingEnabled,
          onValueChange: handleEmailMarketingChange,
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
          <IconSymbol size={24} name="chevron.left" color="#000" />
          <ThemedText style={styles.backText}>Settings</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
        {/* Settings Sections */}
        {notificationSettings.map((section) => (
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
                      <IconSymbol size={22} name={item.icon} color="#000" />
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
                    trackColor={{ false: '#e5e7eb', true: '#007AFF' }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Push Notification Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Notification Settings</ThemedText>
          <View style={styles.settingsGroup}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <IconSymbol size={22} name="bell.badge" color="#000" />
                </View>
                <View style={styles.settingTextContainer}>
                  <ThemedText style={styles.settingTitle}>Push Notification Sounds</ThemedText>
                  <ThemedText style={styles.settingSubtitle}>Customize notification tones</ThemedText>
                </View>
              </View>
              <IconSymbol size={20} name="chevron.right" color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
