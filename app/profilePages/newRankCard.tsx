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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getValorantStats } from '@/services/valorantService';
import { unlinkRiotAccount } from '@/services/riotService';

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

  const handleUnlinkRiotAccount = () => {
    if (!riotAccount) return;

    Alert.alert(
      'Unlink League of Legends Account',
      `Are you sure you want to unlink ${riotAccount?.gameName}#${riotAccount?.tagLine}? All League and TFT rank cards will be removed from your profile.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkRiotAccount();

              // Remove League and TFT rank cards from enabled list
              if (user?.id) {
                const userDoc = await getDoc(doc(db, 'users', user.id));
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  const currentCards = data.enabledRankCards || [];
                  const updatedCards = currentCards.filter((card: string) => card !== 'league' && card !== 'tft');

                  await updateDoc(doc(db, 'users', user.id), {
                    enabledRankCards: updatedCards,
                  });

                  // Update local state
                  setEnabledRankCards(updatedCards);
                }
              }

              setRiotAccount(null);
              Alert.alert('Success', 'League of Legends account unlinked successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unlink League account');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleUnlinkValorantAccount = () => {
    if (!valorantAccount) return;

    Alert.alert(
      'Unlink Valorant Account',
      `Are you sure you want to unlink ${valorantAccount?.gameName}#${valorantAccount?.tagLine}? Your Valorant rank card will be removed from your profile.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove Valorant account from Firestore
              if (user?.id) {
                await updateDoc(doc(db, 'users', user.id), {
                  valorantAccount: null,
                  valorantStats: null,
                });

                // Remove Valorant rank card from enabled list
                const userDoc = await getDoc(doc(db, 'users', user.id));
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  const currentCards = data.enabledRankCards || [];
                  const updatedCards = currentCards.filter((card: string) => card !== 'valorant');

                  await updateDoc(doc(db, 'users', user.id), {
                    enabledRankCards: updatedCards,
                  });

                  // Update local state
                  setEnabledRankCards(updatedCards);
                }
              }

              setValorantAccount(null);
              Alert.alert('Success', 'Valorant account unlinked successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unlink Valorant account');
              console.error(error);
            }
          },
        },
      ]
    );
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
            <View style={styles.gameSection}>
              <ThemedText style={styles.gameTitle}>League of Legends</ThemedText>

              {/* Account Status */}
              {riotAccount && (
                <View style={styles.accountInfoBox}>
                  <IconSymbol size={18} name="checkmark.circle.fill" color="#2e7d32" />
                  <View style={styles.accountInfoTextContainer}>
                    <ThemedText style={styles.accountInfoLabel}>Connected Account</ThemedText>
                    <ThemedText style={styles.accountInfoText}>
                      {riotAccount.gameName}#{riotAccount.tagLine}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Main Action Button */}
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
                  style={[
                    styles.buttonIcon,
                    enabledRankCards.includes('league') && styles.buttonIconDisabled
                  ]}
                  resizeMode="contain"
                />
                <ThemedText style={[
                  styles.buttonText,
                  enabledRankCards.includes('league') && styles.buttonTextDisabled
                ]}>
                  {enabledRankCards.includes('league')
                    ? 'Rank Card Added ✓'
                    : riotAccount
                    ? 'Add League Rank Card'
                    : 'Connect to Riot Games'}
                </ThemedText>
              </TouchableOpacity>

              {/* Secondary Actions */}
              <View style={styles.secondaryActions}>
                {enabledRankCards.includes('league') && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleRemoveRankCard('league')}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={16} name="minus.circle" color="#666" />
                    <ThemedText style={styles.secondaryButtonText}>Remove Rank Card</ThemedText>
                  </TouchableOpacity>
                )}
                {riotAccount && (
                  <TouchableOpacity
                    style={styles.unlinkButtonLarge}
                    onPress={handleUnlinkRiotAccount}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={16} name="link.badge.minus" color="#ef4444" />
                    <ThemedText style={styles.unlinkButtonText}>Unlink Account</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Valorant */}
            <View style={styles.gameSection}>
              <ThemedText style={styles.gameTitle}>Valorant</ThemedText>

              {/* Account Status */}
              {valorantAccount && (
                <View style={styles.accountInfoBox}>
                  <IconSymbol size={18} name="checkmark.circle.fill" color="#2e7d32" />
                  <View style={styles.accountInfoTextContainer}>
                    <ThemedText style={styles.accountInfoLabel}>Connected Account</ThemedText>
                    <ThemedText style={styles.accountInfoText}>
                      {valorantAccount.gameName}#{valorantAccount.tagLine}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Main Action Button */}
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
                  style={[
                    styles.buttonIcon,
                    enabledRankCards.includes('valorant') && styles.buttonIconDisabled
                  ]}
                  resizeMode="contain"
                />
                <ThemedText style={[
                  styles.buttonText,
                  enabledRankCards.includes('valorant') && styles.buttonTextDisabled
                ]}>
                  {enabledRankCards.includes('valorant')
                    ? 'Rank Card Added ✓'
                    : valorantAccount
                    ? 'Add Valorant Rank Card'
                    : 'Connect to Valorant'}
                </ThemedText>
              </TouchableOpacity>

              {/* Secondary Actions */}
              <View style={styles.secondaryActions}>
                {enabledRankCards.includes('valorant') && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleRemoveRankCard('valorant')}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={16} name="minus.circle" color="#666" />
                    <ThemedText style={styles.secondaryButtonText}>Remove Rank Card</ThemedText>
                  </TouchableOpacity>
                )}
                {valorantAccount && (
                  <TouchableOpacity
                    style={styles.unlinkButtonLarge}
                    onPress={handleUnlinkValorantAccount}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={16} name="link.badge.minus" color="#ef4444" />
                    <ThemedText style={styles.unlinkButtonText}>Unlink Account</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* TFT */}
            <View style={styles.gameSection}>
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
            </View>
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
  gameSection: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  gameTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  accountInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#e8f5e9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  accountInfoTextContainer: {
    flex: 1,
  },
  accountInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2e7d32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  accountInfoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b5e20',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  unlinkButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  unlinkButtonText: {
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
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  connectButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#666',
  },
  buttonIconDisabled: {
    tintColor: '#666',
  },
  comingSoonButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
    opacity: 0.6,
  },
  comingSoonIcon: {
    tintColor: '#999',
  },
  comingSoonButtonText: {
    color: '#999',
  },
  buttonIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    tintColor: '#fff',
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
