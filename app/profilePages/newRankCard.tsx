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
          <IconSymbol size={24} name="chevron.left" color="#fff" />
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
            <ActivityIndicator size="large" color="#c42743" />
          </View>
        ) : (
          <>
            {/* League of Legends */}
            <View style={styles.gameSection}>
              <View style={styles.gameTitleRow}>
                <ThemedText style={styles.gameTitle}>League of Legends</ThemedText>
                {riotAccount && (
                  <View style={styles.statusBadge}>
                    <IconSymbol size={14} name="checkmark.circle.fill" color="#4ade80" />
                    <ThemedText style={styles.statusBadgeText}>
                      {riotAccount.gameName}#{riotAccount.tagLine}
                    </ThemedText>
                  </View>
                )}
              </View>

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
                    ? 'Active ✓'
                    : riotAccount
                    ? 'Add Rank Card'
                    : 'Connect Account'}
                </ThemedText>
              </TouchableOpacity>

              {/* Secondary Actions */}
              {(enabledRankCards.includes('league') || riotAccount) && (
                <View style={styles.secondaryActions}>
                  {enabledRankCards.includes('league') && (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleRemoveRankCard('league')}
                      activeOpacity={0.7}
                    >
                      <IconSymbol size={14} name="minus.circle" color="#999" />
                      <ThemedText style={styles.secondaryButtonText}>Remove</ThemedText>
                    </TouchableOpacity>
                  )}
                  {riotAccount && (
                    <TouchableOpacity
                      style={styles.unlinkButtonLarge}
                      onPress={handleUnlinkRiotAccount}
                      activeOpacity={0.7}
                    >
                      <IconSymbol size={14} name="link.badge.minus" color="#c42743" />
                      <ThemedText style={styles.unlinkButtonText}>Unlink</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Valorant */}
            <View style={styles.gameSection}>
              <View style={styles.gameTitleRow}>
                <ThemedText style={styles.gameTitle}>Valorant</ThemedText>
                {valorantAccount && (
                  <View style={styles.statusBadge}>
                    <IconSymbol size={14} name="checkmark.circle.fill" color="#4ade80" />
                    <ThemedText style={styles.statusBadgeText}>
                      {valorantAccount.gameName}#{valorantAccount.tagLine}
                    </ThemedText>
                  </View>
                )}
              </View>

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
                    ? 'Active ✓'
                    : valorantAccount
                    ? 'Add Rank Card'
                    : 'Connect Account'}
                </ThemedText>
              </TouchableOpacity>

              {/* Secondary Actions */}
              {(enabledRankCards.includes('valorant') || valorantAccount) && (
                <View style={styles.secondaryActions}>
                  {enabledRankCards.includes('valorant') && (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleRemoveRankCard('valorant')}
                      activeOpacity={0.7}
                    >
                      <IconSymbol size={14} name="minus.circle" color="#999" />
                      <ThemedText style={styles.secondaryButtonText}>Remove</ThemedText>
                    </TouchableOpacity>
                  )}
                  {valorantAccount && (
                    <TouchableOpacity
                      style={styles.unlinkButtonLarge}
                      onPress={handleUnlinkValorantAccount}
                      activeOpacity={0.7}
                    >
                      <IconSymbol size={14} name="link.badge.minus" color="#c42743" />
                      <ThemedText style={styles.unlinkButtonText}>Unlink</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
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
                  Coming Soon
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
    backgroundColor: '#1e2124',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#2c2f33',
    borderBottomWidth: 1,
    borderBottomColor: '#1e2124',
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
    color: '#fff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    lineHeight: 24,
    marginBottom: 32,
  },
  gameSection: {
    marginBottom: 16,
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3a3f47',
  },
  gameTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 0,
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e2124',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3f47',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ade80',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e2124',
    borderWidth: 1,
    borderColor: '#3a3f47',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  unlinkButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e2124',
    borderWidth: 1,
    borderColor: '#3a3f47',
  },
  unlinkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c42743',
  },
  comingSoonBadge: {
    backgroundColor: '#1e2124',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.5,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c42743',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  connectButtonDisabled: {
    backgroundColor: '#1e2124',
    borderWidth: 1,
    borderColor: '#3a3f47',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  buttonTextDisabled: {
    color: '#4ade80',
  },
  buttonIconDisabled: {
    tintColor: '#4ade80',
  },
  comingSoonButton: {
    backgroundColor: '#1e2124',
    borderWidth: 1,
    borderColor: '#3a3f47',
    shadowOpacity: 0,
    elevation: 0,
  },
  comingSoonIcon: {
    tintColor: '#999',
  },
  comingSoonButtonText: {
    color: '#999',
  },
  buttonIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: '#fff',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 60,
  },
});
