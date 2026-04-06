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
  ScrollView,
  Image,
} from 'react-native';
import { useState } from 'react';
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
        <ScrollView showsVerticalScrollIndicator={false}>
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
            {/* Game Name Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Game Name</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="SEN TenZ"
                  placeholderTextColor="#555"
                  value={gameName}
                  onChangeText={setGameName}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Tag Line Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Tag Line</ThemedText>
              <View style={styles.tagLineWrapper}>
                <View style={styles.hashContainer}>
                  <ThemedText style={styles.hashSymbol}>#</ThemedText>
                </View>
                <TextInput
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

          {/* Example Card */}
          <View style={styles.exampleCard}>
            <View style={styles.exampleHeader}>
              <IconSymbol size={16} name="info.circle" color="#666" />
              <ThemedText style={styles.exampleTitle}>Example</ThemedText>
            </View>
            <ThemedText style={styles.exampleText}>
              If your Riot ID is <ThemedText style={styles.exampleHighlight}>SEN TenZ#SEN</ThemedText>
            </ThemedText>
            <View style={styles.exampleDivider} />
            <View style={styles.exampleRow}>
              <ThemedText style={styles.exampleLabel}>Game Name</ThemedText>
              <ThemedText style={styles.exampleValue}>SEN TenZ</ThemedText>
            </View>
            <View style={styles.exampleRow}>
              <ThemedText style={styles.exampleLabel}>Tag Line</ThemedText>
              <ThemedText style={styles.exampleValue}>SEN</ThemedText>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
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
    paddingTop: 20,
    paddingBottom: 32,
    overflow: 'visible',
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 50,
    height: 50,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 8,
    overflow: 'visible',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    gap: 20,
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
  inputWrapper: {
    backgroundColor: '#252525',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  tagLineWrapper: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    borderRadius: 12,
    overflow: 'hidden',
  },
  hashContainer: {
    paddingLeft: 16,
    justifyContent: 'center',
  },
  hashSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  tagLineInput: {
    flex: 1,
    paddingHorizontal: 8,
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
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  linkButtonDisabled: {
    opacity: 0.6,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  exampleCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  exampleText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  exampleHighlight: {
    fontWeight: '700',
    color: '#D4A843',
  },
  exampleDivider: {
    height: 1,
    backgroundColor: '#252525',
    marginBottom: 12,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exampleLabel: {
    fontSize: 13,
    color: '#666',
  },
  exampleValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
});
