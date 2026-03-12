import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import StepProgressIndicator from '@/components/ui/StepProgressIndicator';
import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function OnboardingSignUp3() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Placeholder for contacts with RankUp accounts
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);

  const handleContinue = () => {
    router.push({
      pathname: '/(auth)/onboardingSignUp4',
      params: {
        ...params,
        followedUsers: JSON.stringify(followedUsers),
      },
    });
  };

  const handleSkip = () => {
    router.push({
      pathname: '/(auth)/onboardingSignUp4',
      params: {
        ...params,
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

  const toggleFollow = (userId: string) => {
    setFollowedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol size={20} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Find Friends</ThemedText>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <ThemedText style={styles.skipText}>Skip</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <StepProgressIndicator currentStep={4} totalSteps={5} />
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.subtitle}>
            Follow friends who are already on RankUp (optional)
          </ThemedText>

          {/* Placeholder State */}
          {suggestedUsers.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconContainer}>
                <IconSymbol size={48} name="person.2.fill" color="#444" />
              </View>
              <ThemedText style={styles.emptyTitle}>
                Find Your Friends
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Connect your contacts to see who's already on RankUp
              </ThemedText>

              {/* Coming Soon Badge */}
              <View style={styles.comingSoonBadge}>
                <IconSymbol size={14} name="clock.fill" color="#c42743" />
                <ThemedText style={styles.comingSoonText}>Coming Soon</ThemedText>
              </View>

              {/* Feature Preview Cards */}
              <View style={styles.featurePreviewContainer}>
                <View style={styles.featureCard}>
                  <View style={styles.featureIconWrapper}>
                    <IconSymbol size={20} name="person.crop.circle.badge.checkmark" color="#4ade80" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <ThemedText style={styles.featureTitle}>Sync Contacts</ThemedText>
                    <ThemedText style={styles.featureDescription}>
                      Find friends from your phone contacts
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.featureCard}>
                  <View style={styles.featureIconWrapper}>
                    <IconSymbol size={20} name="gamecontroller.fill" color="#60a5fa" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <ThemedText style={styles.featureTitle}>Gaming Friends</ThemedText>
                    <ThemedText style={styles.featureDescription}>
                      Discover players with similar ranks
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.featureCard}>
                  <View style={styles.featureIconWrapper}>
                    <IconSymbol size={20} name="star.fill" color="#fbbf24" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <ThemedText style={styles.featureTitle}>Suggested Users</ThemedText>
                    <ThemedText style={styles.featureDescription}>
                      Follow top players and content creators
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            // User list will go here when contacts sync is implemented
            <View style={styles.userListContainer}>
              {suggestedUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userCard}
                  onPress={() => toggleFollow(user.id)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                  <View style={styles.userInfo}>
                    <ThemedText style={styles.userName}>{user.username}</ThemedText>
                    {user.mutualFriends > 0 && (
                      <ThemedText style={styles.mutualFriends}>
                        {user.mutualFriends} mutual friends
                      </ThemedText>
                    )}
                  </View>
                  <View
                    style={[
                      styles.followButton,
                      followedUsers.includes(user.id) && styles.followButtonActive,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.followButtonText,
                        followedUsers.includes(user.id) && styles.followButtonTextActive,
                      ]}
                    >
                      {followedUsers.includes(user.id) ? 'Following' : 'Follow'}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    padding: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c42743',
  },
  progressContainer: {
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  // Empty State
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(196, 39, 67, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(196, 39, 67, 0.3)',
    marginBottom: 32,
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c42743',
  },
  // Feature Preview Cards
  featurePreviewContainer: {
    width: '100%',
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  featureIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
  },
  // User List
  userListContainer: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2c2f33',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  mutualFriends: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#c42743',
  },
  followButtonActive: {
    backgroundColor: '#2c2f33',
    borderWidth: 1,
    borderColor: '#444',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  followButtonTextActive: {
    color: '#999',
  },
  // Continue Button
  continueButton: {
    backgroundColor: '#c42743',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 'auto',
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
