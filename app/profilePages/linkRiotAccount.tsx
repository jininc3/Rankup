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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { linkRiotAccount } from '@/services/riotService';
import { db, auth } from '@/config/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function LinkRiotAccountScreen() {
  const router = useRouter();
  const { selectedGame } = useLocalSearchParams<{ selectedGame?: string }>();
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('euw1');
  const [loading, setLoading] = useState(false);

  const regions = [
    { value: 'euw1', label: 'Europe West' },
    { value: 'eun1', label: 'Europe Nordic & East' },
    { value: 'na1', label: 'North America' },
    { value: 'kr', label: 'Korea' },
    { value: 'br1', label: 'Brazil' },
    { value: 'la1', label: 'Latin America North' },
    { value: 'la2', label: 'Latin America South' },
    { value: 'tr1', label: 'Turkey' },
    { value: 'ru', label: 'Russia' },
    { value: 'jp1', label: 'Japan' },
    { value: 'oc1', label: 'Oceania' },
  ];

  const handleLinkAccount = async () => {
    if (!gameName.trim() || !tagLine.trim()) {
      Alert.alert('Error', 'Please enter both Game Name and Tag Line');
      return;
    }

    setLoading(true);
    try {
      // Debug: Check auth state
      console.log('Current user:', auth.currentUser?.uid);
      console.log('Current user email:', auth.currentUser?.email);

      const response = await linkRiotAccount(gameName.trim(), tagLine.trim(), region);

      if (response.success && auth.currentUser) {
        // If a game was selected, add it to enabledRankCards
        if (selectedGame) {
          try {
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              enabledRankCards: arrayUnion(selectedGame),
            });
          } catch (error) {
            console.error('Error adding rank card:', error);
          }
        }

        Alert.alert(
          'Success!',
          `Linked account: ${response.account?.gameName}#${response.account?.tagLine}${selectedGame ? `\n\n${getGameDisplayName(selectedGame)} rank card added to your profile!` : ''}`,
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
      Alert.alert('Error', error.message || 'Failed to link Riot account');
    } finally {
      setLoading(false);
    }
  };

  const getGameDisplayName = (game: string) => {
    switch (game) {
      case 'league':
        return 'League of Legends';
      case 'valorant':
        return 'Valorant';
      case 'tft':
        return 'TFT';
      default:
        return game;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Link Riot Account</ThemedText>
      </View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/riotgames.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <ThemedText style={styles.infoTitle}>Connect Your Riot Account</ThemedText>
        <ThemedText style={styles.infoText}>
          Enter your Riot ID to link your Riot Games account and display your stats for League of Legends, TFT, and Valorant.
        </ThemedText>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Game Name Input */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Game Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="e.g., PlayerName"
            placeholderTextColor="#999"
            value={gameName}
            onChangeText={setGameName}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ThemedText style={styles.hint}>Your in-game name (3-16 characters)</ThemedText>
        </View>

        {/* Tag Line Input */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Tag Line</ThemedText>
          <View style={styles.tagLineContainer}>
            <ThemedText style={styles.hashSymbol}>#</ThemedText>
            <TextInput
              style={styles.tagLineInput}
              placeholder="e.g., EUW"
              placeholderTextColor="#999"
              value={tagLine}
              onChangeText={setTagLine}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
            />
          </View>
          <ThemedText style={styles.hint}>Your tag (2-5 characters)</ThemedText>
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
          If your Riot ID is <ThemedText style={styles.exampleBold}>HideOnBush#KR1</ThemedText>:
        </ThemedText>
        <View style={styles.exampleRow}>
          <ThemedText style={styles.exampleLabel}>Game Name:</ThemedText>
          <ThemedText style={styles.exampleValue}>HideOnBush</ThemedText>
        </View>
        <View style={styles.exampleRow}>
          <ThemedText style={styles.exampleLabel}>Tag Line:</ThemedText>
          <ThemedText style={styles.exampleValue}>KR1</ThemedText>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logo: {
    width: 80,
    height: 80,
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
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
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  tagLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
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
    backgroundColor: '#f9f9f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  regionButtonActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  regionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  regionButtonTextActive: {
    color: '#fff',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
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
    color: '#fff',
  },
  exampleCard: {
    backgroundColor: '#f0f8ff',
    marginHorizontal: 20,
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  exampleBold: {
    fontWeight: '700',
    color: '#000',
  },
  exampleRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  exampleLabel: {
    fontSize: 13,
    color: '#666',
    width: 100,
  },
  exampleValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  bottomSpacer: {
    height: 40,
  },
});
