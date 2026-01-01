import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getValorantStats } from '@/services/valorantService';

type GameType = 'league' | 'valorant' | 'tft';

export default function NewRankCardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Riot account status and enabled rank cards
  useEffect(() => {
    const fetchRiotStatus = async () => {
      if (!user?.id) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setRiotAccount(data.riotAccount || null);
          setValorantAccount(data.valorantAccount || null);
          setEnabledRankCards(data.enabledRankCards || []);
        }
      } catch (error) {
        console.error('Error fetching Riot status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRiotStatus();
  }, [user?.id]);

  const handleGameSelect = async (game: GameType) => {
    if (!user?.id) return;

    // Valorant uses Henrik's API - separate flow
    if (game === 'valorant') {
      // Check if Valorant account is already linked
      if (valorantAccount) {
        // Account already linked, just add the rank card
        try {
          await updateDoc(doc(db, 'users', user.id), {
            enabledRankCards: arrayUnion(game),
          });
          // Update local state immediately
          setEnabledRankCards([...enabledRankCards, game]);

          // Fetch stats to ensure they're cached for profile viewing
          try {
            console.log('Fetching Valorant stats to cache for profile viewing');
            await getValorantStats(false);
          } catch (statsError) {
            console.warn('Failed to fetch stats, but rank card added:', statsError);
          }

          // Navigate back to profile to show the new rank card
          router.back();
        } catch (error) {
          console.error('Error adding rank card:', error);
        }
      } else {
        // Not linked yet, navigate to link page
        router.push('/profilePages/linkValorantAccount');
      }
      return;
    }

    // If already connected to Riot, just add the rank card
    if (riotAccount) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          enabledRankCards: arrayUnion(game),
        });
        // Update local state immediately
        setEnabledRankCards([...enabledRankCards, game]);

        // Navigate back to profile to show the new rank card
        router.back();
      } catch (error) {
        console.error('Error adding rank card:', error);
      }
    } else {
      // Navigate to link account with selected game
      router.push({
        pathname: '/profilePages/linkRiotAccount',
        params: { selectedGame: game },
      });
    }
  };

  const handleRemoveRankCard = async (game: GameType) => {
    if (!user?.id) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        enabledRankCards: arrayRemove(game),
      });
      // Update local state immediately
      setEnabledRankCards(enabledRankCards.filter(g => g !== game));
    } catch (error) {
      console.error('Error removing rank card:', error);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Add a RankCard</ThemedText>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={styles.title}>Connect Your Gaming Accounts</ThemedText>
        <ThemedText style={styles.subtitle}>
          Link your gaming accounts to display your ranks and stats on your profile
        </ThemedText>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <>
            {/* League of Legends */}
            <View style={styles.gameTitleRow}>
              <ThemedText style={styles.gameTitle}>League of Legends</ThemedText>
              {enabledRankCards.includes('league') && (
                <TouchableOpacity
                  onPress={() => handleRemoveRankCard('league')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.removeText}>Remove</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.connectButton,
                enabledRankCards.includes('league') && styles.connectButtonDisabled
              ]}
              onPress={() => handleGameSelect('league')}
              activeOpacity={0.7}
              disabled={enabledRankCards.includes('league')}
            >
              <Image
                source={require('@/assets/images/riotgames.png')}
                style={styles.buttonIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.buttonText}>
                {enabledRankCards.includes('league')
                  ? 'Already Added'
                  : riotAccount
                  ? 'Add League of Legends Rank Card'
                  : 'Connect to Riot Games'}
              </ThemedText>
            </TouchableOpacity>

            {/* Valorant */}
            <View style={styles.gameTitleRow}>
              <ThemedText style={styles.gameTitle}>Valorant</ThemedText>
              {enabledRankCards.includes('valorant') && (
                <TouchableOpacity
                  onPress={() => handleRemoveRankCard('valorant')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.removeText}>Remove</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.connectButton,
                enabledRankCards.includes('valorant') && styles.connectButtonDisabled
              ]}
              onPress={() => handleGameSelect('valorant')}
              activeOpacity={0.7}
              disabled={enabledRankCards.includes('valorant')}
            >
              <Image
                source={require('@/assets/images/riotgames.png')}
                style={styles.buttonIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.buttonText}>
                {enabledRankCards.includes('valorant')
                  ? 'Already Added'
                  : valorantAccount
                  ? 'Add Valorant Rank Card'
                  : 'Connect to Valorant'}
              </ThemedText>
            </TouchableOpacity>

            {/* TFT */}
            <View style={styles.gameTitleRow}>
              <ThemedText style={styles.gameTitle}>TFT</ThemedText>
              <View style={styles.comingSoonBadge}>
                <ThemedText style={styles.comingSoonText}>Coming Soon</ThemedText>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.connectButton, styles.comingSoonButton]}
              activeOpacity={1}
              disabled={true}
            >
              <Image
                source={require('@/assets/images/riotgames.png')}
                style={[styles.buttonIcon, styles.comingSoonIcon]}
                resizeMode="contain"
              />
              <ThemedText style={[styles.buttonText, styles.comingSoonButtonText]}>
                TFT Rank Card Coming Soon
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 32,
  },
  gameTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  removeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  comingSoonBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 24,
  },
  connectButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#e5e5e5',
  },
  comingSoonButton: {
    opacity: 0.4,
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
  },
  comingSoonIcon: {
    opacity: 0.5,
  },
  comingSoonButtonText: {
    color: '#999',
  },
  buttonIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
