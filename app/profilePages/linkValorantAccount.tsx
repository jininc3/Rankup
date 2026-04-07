import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { linkValorantAccount } from '@/services/valorantService';
import { db, auth } from '@/config/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function LinkValorantAccountScreen() {
  const router = useRouter();
  const { fromSignup } = useLocalSearchParams<{ fromSignup?: string }>();
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('na');
  const [loading, setLoading] = useState(false);
  const tagLineRef = useRef<TextInput>(null);

  const regions = [
    { value: 'na', label: 'NA' },
    { value: 'eu', label: 'EU' },
    { value: 'ap', label: 'AP' },
    { value: 'kr', label: 'KR' },
    { value: 'latam', label: 'LATAM' },
    { value: 'br', label: 'BR' },
    { value: 'mn', label: 'MENA' },
  ];

  const handleLinkAccount = async () => {
    if (!gameName.trim() || !tagLine.trim()) {
      Alert.alert('Error', 'Please enter both Game Name and Tag Line');
      return;
    }

    setLoading(true);
    try {
      const response = await linkValorantAccount(gameName.trim(), tagLine.trim(), region);

      if (response.success && auth.currentUser) {
        // Automatically add Valorant to enabled rank cards
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          enabledRankCards: arrayUnion('valorant')
        });

        Alert.alert(
          'Success!',
          `Linked Valorant account: ${response.account?.gameName}#${response.account?.tag}`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (fromSignup === 'true') {
                  // Go back to signup step 3
                  router.back();
                } else {
                  // Navigate directly to profile tab with refresh flag
                  router.replace('/(tabs)/profile?refresh=true');
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to link Valorant account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol size={24} name="chevron.left" color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Logo and Title Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('@/assets/images/valorantlogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <ThemedText style={styles.heroTitle}>Link Valorant</ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Connect your Riot ID to display your competitive stats and rank
          </ThemedText>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Riot ID Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Riot ID</ThemedText>
            <View style={styles.riotIdWrapper}>
              <TextInput
                style={styles.gameNameInput}
                placeholder="SEN TenZ"
                placeholderTextColor="#555"
                value={gameName}
                onChangeText={setGameName}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => tagLineRef.current?.focus()}
              />
              <View style={styles.hashContainer}>
                <ThemedText style={styles.hashSymbol}>#</ThemedText>
              </View>
              <TextInput
                ref={tagLineRef}
                style={styles.tagLineInput}
                placeholder="SEN"
                placeholderTextColor="#555"
                value={tagLine}
                onChangeText={setTagLine}
                autoCapitalize="sentences"
                autoCorrect={false}
                maxLength={5}
              />
            </View>
            <ThemedText style={styles.exampleHint}>e.g. SEN TenZ#SEN</ThemedText>
          </View>

          {/* Region Selector */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Region</ThemedText>
            <View style={styles.regionContainer}>
              {regions.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.regionButton, region === r.value && styles.regionButtonActive]}
                  onPress={() => setRegion(r.value)}
                >
                  <ThemedText
                    style={[styles.regionButtonText, region === r.value && styles.regionButtonTextActive]}
                  >
                    {r.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Link Button */}
          <TouchableOpacity
            style={[styles.linkButton, loading && styles.linkButtonDisabled]}
            onPress={handleLinkAccount}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.linkButtonText}>Link Account</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 70,
    paddingBottom: 12,
  },
  backButton: {
    padding: 6,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    overflow: 'visible',
  },
  logoWrapper: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 38,
    height: 38,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 6,
    overflow: 'visible',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.3,
  },
  riotIdWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gameNameInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  hashContainer: {
    justifyContent: 'center',
  },
  hashSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  tagLineInput: {
    width: 90,
    paddingLeft: 6,
    paddingRight: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  regionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  regionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#252525',
  },
  regionButtonActive: {
    backgroundColor: '#D4A843',
  },
  regionButtonText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  regionButtonTextActive: {
    color: '#fff',
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A843',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  linkButtonDisabled: {
    opacity: 0.6,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  exampleHint: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
});
