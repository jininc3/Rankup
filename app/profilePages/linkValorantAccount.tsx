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
import { useRouter } from 'expo-router';
import { linkValorantAccount } from '@/services/valorantService';
import { db, auth } from '@/config/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Stack } from 'expo-router';

export default function LinkValorantAccountScreen() {
  const router = useRouter();
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('na');
  const [loading, setLoading] = useState(false);

  const regions = [
    { value: 'na', label: 'North America' },
    { value: 'eu', label: 'Europe' },
    { value: 'ap', label: 'Asia Pacific' },
    { value: 'kr', label: 'Korea' },
    { value: 'latam', label: 'Latin America' },
    { value: 'br', label: 'Brazil' },
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
        Alert.alert(
          'Success!',
          `Linked Valorant account: ${response.account?.gameName}#${response.account?.tag}\n\nYou can now add a Valorant rank card from your profile settings.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to profile, going back twice (past newRankCard)
                router.back();
                router.back();
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Link Valorant Account</ThemedText>
      </View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/valorant-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <ThemedText style={styles.infoTitle}>Connect Your Valorant Account</ThemedText>
        <ThemedText style={styles.infoText}>
          Enter your Valorant Riot ID to display your competitive stats and rank on your profile.
        </ThemedText>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Game Name Input */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Game Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="e.g., SEN TenZ"
            placeholderTextColor="#999"
            value={gameName}
            onChangeText={setGameName}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ThemedText style={styles.hint}>Your Valorant in-game name</ThemedText>
        </View>

        {/* Tag Line Input */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Tag Line</ThemedText>
          <View style={styles.tagLineContainer}>
            <ThemedText style={styles.hashSymbol}>#</ThemedText>
            <TextInput
              style={styles.tagLineInput}
              placeholder="e.g., SEN"
              placeholderTextColor="#999"
              value={tagLine}
              onChangeText={setTagLine}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
            />
          </View>
          <ThemedText style={styles.hint}>Your tag (e.g., NA1, 0000)</ThemedText>
        </View>

        {/* Region Selector */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Region</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroll}>
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
          </ScrollView>
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
            <>
              <ThemedText style={styles.linkButtonText}>Link Account</ThemedText>
              <IconSymbol size={20} name="arrow.right" color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Example */}
      <View style={styles.exampleCard}>
        <ThemedText style={styles.exampleTitle}>Example</ThemedText>
        <ThemedText style={styles.exampleText}>
          If your Riot ID is <ThemedText style={styles.exampleBold}>SEN TenZ#SEN</ThemedText>:
        </ThemedText>
        <View style={styles.exampleRow}>
          <ThemedText style={styles.exampleLabel}>Game Name:</ThemedText>
          <ThemedText style={styles.exampleValue}>SEN TenZ</ThemedText>
        </View>
        <View style={styles.exampleRow}>
          <ThemedText style={styles.exampleLabel}>Tag Line:</ThemedText>
          <ThemedText style={styles.exampleValue}>SEN</ThemedText>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B2313B', // Valorant red background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logo: {
    width: 100,
    height: 100,
    tintColor: '#fff',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  tagLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  hashSymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginRight: 4,
  },
  tagLineInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  regionScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  regionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  regionButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  regionButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  regionButtonTextActive: {
    color: '#B2313B',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  linkButtonDisabled: {
    opacity: 0.6,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B2313B',
  },
  exampleCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  exampleBold: {
    fontWeight: '700',
    color: '#fff',
  },
  exampleRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  exampleLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    width: 100,
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
