import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';

export default function NotificationsPreferencesScreen() {
  const router = useRouter();

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
          onValueChange: setLikesEnabled,
        },
        {
          id: 2,
          icon: 'bubble.left',
          title: 'Comments',
          subtitle: 'When someone comments on your post',
          value: commentsEnabled,
          onValueChange: setCommentsEnabled,
        },
        {
          id: 3,
          icon: 'person.badge.plus',
          title: 'New Followers',
          subtitle: 'When someone follows you',
          value: followersEnabled,
          onValueChange: setFollowersEnabled,
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
          onValueChange: setRankUpsEnabled,
        },
        {
          id: 5,
          icon: 'trophy',
          title: 'Achievements',
          subtitle: 'When you unlock achievements',
          value: achievementsEnabled,
          onValueChange: setAchievementsEnabled,
        },
        {
          id: 6,
          icon: 'gamecontroller',
          title: 'Challenge Invites',
          subtitle: 'When someone challenges you',
          value: challengesEnabled,
          onValueChange: setChallengesEnabled,
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
          onValueChange: setEmailDigestEnabled,
        },
        {
          id: 8,
          icon: 'envelope',
          title: 'Product Updates',
          subtitle: 'New features and improvements',
          value: emailUpdatesEnabled,
          onValueChange: setEmailUpdatesEnabled,
        },
        {
          id: 9,
          icon: 'megaphone',
          title: 'Marketing Emails',
          subtitle: 'Promotions and offers',
          value: emailMarketingEnabled,
          onValueChange: setEmailMarketingEnabled,
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
});
