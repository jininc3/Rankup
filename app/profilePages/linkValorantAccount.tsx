import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, Image, BackHandler, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { linkValorantAccount } from '@/services/valorantService';
import { useValorantStats } from '@/contexts/ValorantStatsContext';
import { db, auth } from '@/config/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function LinkValorantAccountScreen() {
  const router = useRouter();
  const { fromSignup } = useLocalSearchParams<{ fromSignup?: string }>();
  const { fetchStats: fetchValorantStatsContext } = useValorantStats();
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('na');
  const [loading, setLoading] = useState(false);
  const [preparingCard, setPreparingCard] = useState(false);
  const tagLineRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!preparingCard) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [preparingCard]);

  const regions = [
    { value: 'na', label: 'NA' }, { value: 'eu', label: 'EU' },
    { value: 'ap', label: 'AP' }, { value: 'kr', label: 'KR' },
    { value: 'latam', label: 'LATAM' }, { value: 'br', label: 'BR' },
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
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          enabledRankCards: arrayUnion('valorant'),
        });

        if (fromSignup === 'true') {
          Alert.alert('Success!', `Linked Valorant account: ${response.account?.gameName}#${response.account?.tag}`,
            [{ text: 'OK', onPress: () => router.back() }]);
        } else {
          setPreparingCard(true);
          try { await fetchValorantStatsContext(true); } catch {}
          router.replace('/(tabs)/profile');
        }
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ThemedView style={styles.container}>
          {preparingCard && (
            <View style={styles.preparingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <ThemedText style={styles.preparingText}>Preparing your rank card...</ThemedText>
            </View>
          )}

          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={preparingCard}>
              <IconSymbol size={22} name="chevron.left" color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Link Valorant</ThemedText>
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.content}>
            <View style={styles.logoRow}>
              <Image source={require('@/assets/images/valorantlogo.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <ThemedText style={styles.subtitle}>
              Connect your Riot ID to display your competitive stats and rank
            </ThemedText>

            {/* Riot ID */}
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
              <ThemedText style={styles.hashSymbol}>#</ThemedText>
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
            <ThemedText style={styles.hint}>e.g. SEN TenZ#SEN</ThemedText>

            {/* Region */}
            <ThemedText style={[styles.label, { marginTop: 24 }]}>Region</ThemedText>
            <View style={styles.regionContainer}>
              {regions.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.regionChip, region === r.value && styles.regionChipSelected]}
                  onPress={() => setRegion(r.value)}
                >
                  <ThemedText style={[styles.regionChipText, region === r.value && styles.regionChipTextSelected]}>
                    {r.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Link Button */}
            <TouchableOpacity
              style={[styles.linkButton, loading && styles.linkButtonDisabled]}
              onPress={handleLinkAccount}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#0f0f0f" />
              ) : (
                <ThemedText style={styles.linkButtonText}>Link Account</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </TouchableWithoutFeedback>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  content: { paddingHorizontal: 28, paddingTop: 16 },
  logoRow: { alignItems: 'center', marginBottom: 12 },
  logo: { width: 48, height: 48 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 28 },
  label: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 10 },
  riotIdWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  gameNameInput: { flex: 1, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, color: '#fff' },
  hashSymbol: { fontSize: 18, fontWeight: '600', color: '#555' },
  tagLineInput: { width: 90, paddingLeft: 6, paddingRight: 18, paddingVertical: 16, fontSize: 16, color: '#fff' },
  hint: { fontSize: 12, color: '#555', marginTop: 6 },
  regionContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  regionChip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  regionChipSelected: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: '#fff' },
  regionChipText: { fontSize: 13, fontWeight: '600', color: '#999' },
  regionChipTextSelected: { color: '#fff' },
  linkButton: {
    marginTop: 28, backgroundColor: '#fff', borderRadius: 28,
    paddingVertical: 16, alignItems: 'center',
  },
  linkButtonDisabled: { opacity: 0.4 },
  linkButtonText: { fontSize: 16, fontWeight: '700', color: '#0f0f0f' },
  preparingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: '#0f0f0f',
    justifyContent: 'center', alignItems: 'center', zIndex: 100, gap: 16,
  },
  preparingText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
