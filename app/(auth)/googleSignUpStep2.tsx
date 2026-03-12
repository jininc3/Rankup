import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import StepProgressIndicator from '@/components/ui/StepProgressIndicator';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function GoogleSignUpStep2() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [bio, setBio] = useState('');
  const [discord, setDiscord] = useState('');
  const [instagram, setInstagram] = useState('');

  const handleContinue = () => {
    router.push({
      pathname: '/(auth)/googleSignUpStep3',
      params: {
        ...params,
        bio: bio.trim(),
        discordLink: discord.trim(),
        instagramLink: instagram.trim(),
      },
    });
  };

  const handleSkip = () => {
    router.push({
      pathname: '/(auth)/googleSignUpStep3',
      params: {
        ...params,
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <IconSymbol size={20} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.title}>About You</ThemedText>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <ThemedText style={styles.skipText}>Skip</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <StepProgressIndicator currentStep={2} totalSteps={4} />
          </View>

          <View style={styles.content}>
            <ThemedText style={styles.subtitle}>
              Tell others about yourself (optional)
            </ThemedText>

            {/* Bio Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Bio</ThemedText>
              <View style={styles.bioInputContainer}>
                <TextInput
                  style={styles.bioInput}
                  placeholder="Write a short bio..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                  maxLength={150}
                  value={bio}
                  onChangeText={setBio}
                  textAlignVertical="top"
                />
                <ThemedText style={styles.characterCount}>{bio.length}/150</ThemedText>
              </View>
            </View>

            {/* Social Links Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Social Links</ThemedText>

              {/* Discord Input */}
              <View style={styles.socialInputContainer}>
                <View style={styles.socialIconInputWrapper}>
                  <Image
                    source={require('@/assets/images/discord.png')}
                    style={styles.socialInputIcon}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={styles.socialInput}
                    placeholder="Discord username"
                    placeholderTextColor="#666"
                    value={discord}
                    onChangeText={setDiscord}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Instagram Input */}
              <View style={styles.socialInputContainer}>
                <View style={styles.socialIconInputWrapper}>
                  <Image
                    source={require('@/assets/images/instagram.png')}
                    style={styles.socialInputIcon}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={styles.socialInput}
                    placeholder="Instagram username"
                    placeholderTextColor="#666"
                    value={instagram}
                    onChangeText={setInstagram}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    paddingBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  bioInputContainer: {
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3a3f44',
  },
  bioInput: {
    fontSize: 14,
    color: '#fff',
    minHeight: 80,
    padding: 0,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  socialInputContainer: {
    marginBottom: 12,
  },
  socialIconInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2f33',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3a3f44',
  },
  socialInputIcon: {
    width: 24,
    height: 24,
  },
  socialInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    padding: 0,
  },
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
