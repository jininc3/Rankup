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
  const { user, refreshUser } = useAuth();
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
      // Remove from the ordered array
      const updatedCards = enabledRankCards.filter(g => g !== game);
      await updateDoc(doc(db, 'users', user.id), {
        enabledRankCards: updatedCards,
      });
      // Update local state immediately
      setEnabledRankCards(updatedCards);
    } catch (error) {
      console.error('Error removing rank card:', error);
    }
  };

  const handleMoveRankCard = async (game: GameType, direction: 'up' | 'down') => {
    if (!user?.id) return;

    const currentIndex = enabledRankCards.indexOf(game);
    if (currentIndex === -1) return;

    // Prevent moving beyond bounds
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === enabledRankCards.length - 1) return;

    // Create new array with swapped positions
    const newOrder = [...enabledRankCards];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];

    try {
      // Update local state immediately for instant UI feedback
      setEnabledRankCards(newOrder);

      // Update Firestore
      await updateDoc(doc(db, 'users', user.id), {
        enabledRankCards: newOrder,
      });

      // Refresh user data in AuthContext so profile screen sees the new order immediately
      await refreshUser();
    } catch (error) {
      console.error('Error reordering rank cards:', error);
      // Revert local state on error
      const revertOrder = [...enabledRankCards];
      setEnabledRankCards(revertOrder);
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
        <ThemedText style={styles.subtitle}>
          Link your gaming accounts to display rank cards on your profile
        </ThemedText>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c42743" />
          </View>
        ) : (
          <>
            {/* Reorder Section - Only show if there are multiple enabled cards */}
            {enabledRankCards.length > 1 && (
              <View style={styles.reorderSection}>
                <ThemedText style={styles.sectionTitle}>Card Order</ThemedText>
                <ThemedText style={styles.sectionSubtitle}>
                  Cards at the top will appear in front when stacked
                </ThemedText>
                {enabledRankCards.map((game, index) => {
                  const gameNames = {
                    league: 'League of Legends',
                    valorant: 'Valorant',
                    tft: 'TFT',
                  };
                  const gameIcons = {
                    league: require('@/assets/images/lol-icon.png'),
                    valorant: require('@/assets/images/valorant-text.png'),
                    tft: require('@/assets/images/tft.png'),
                  };
                  const isFirst = index === 0;
                  const isLast = index === enabledRankCards.length - 1;
                  const totalCards = enabledRankCards.length;

                  // For 2 cards, only show arrow on the first card
                  if (totalCards === 2 && isLast) {
                    return (
                      <View key={game} style={styles.reorderCard}>
                        <View style={styles.reorderCardLeft}>
                          <Image
                            source={gameIcons[game as GameType]}
                            style={styles.reorderCardIcon}
                            resizeMode="contain"
                          />
                          <ThemedText style={styles.reorderCardTitle}>
                            {gameNames[game as GameType]}
                          </ThemedText>
                        </View>
                        <View style={styles.reorderButtonPlaceholder} />
                      </View>
                    );
                  }

                  // Determine which arrow to show
                  let arrowIcon = 'chevron.up';
                  let arrowAction: 'up' | 'down' = 'up';

                  if (isFirst) {
                    arrowIcon = 'chevron.down';
                    arrowAction = 'down';
                  } else if (isLast) {
                    arrowIcon = 'chevron.up';
                    arrowAction = 'up';
                  } else {
                    // Middle cards show up arrow (move toward front)
                    arrowIcon = 'chevron.up';
                    arrowAction = 'up';
                  }

                  return (
                    <View key={game} style={styles.reorderCard}>
                      <View style={styles.reorderCardLeft}>
                        <Image
                          source={gameIcons[game as GameType]}
                          style={styles.reorderCardIcon}
                          resizeMode="contain"
                        />
                        <ThemedText style={styles.reorderCardTitle}>
                          {gameNames[game as GameType]}
                        </ThemedText>
                      </View>
                      <TouchableOpacity
                        style={styles.reorderButton}
                        onPress={() => handleMoveRankCard(game as GameType, arrowAction)}
                        activeOpacity={0.6}
                      >
                        <IconSymbol
                          size={20}
                          name={arrowIcon}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            <ThemedText style={styles.sectionTitle}>Available Games</ThemedText>

            {/* League of Legends */}
            <TouchableOpacity
              style={[
                styles.gameCard,
                enabledRankCards.includes('league') && styles.gameCardActive
              ]}
              onPress={() => handleGameSelect('league')}
              activeOpacity={0.7}
              disabled={enabledRankCards.includes('league')}
            >
              <View style={styles.gameCardHeader}>
                <View style={styles.gameCardLeft}>
                  <Image
                    source={require('@/assets/images/lol.png')}
                    style={styles.gameCardIcon}
                    resizeMode="contain"
                  />
                  <View>
                    <ThemedText style={styles.gameCardTitle}>League of Legends</ThemedText>
                    {riotAccount && (
                      <ThemedText style={styles.gameCardSubtitle}>
                        {riotAccount.gameName}#{riotAccount.tagLine}
                      </ThemedText>
                    )}
                  </View>
                </View>
                {enabledRankCards.includes('league') ? (
                  <IconSymbol size={24} name="checkmark.circle.fill" color="#4ade80" />
                ) : (
                  <IconSymbol size={24} name="plus.circle" color="#b9bbbe" />
                )}
              </View>
            </TouchableOpacity>

            {/* Secondary Actions for League */}
            {(enabledRankCards.includes('league') || riotAccount) && (
              <View style={styles.actionsRow}>
                {enabledRankCards.includes('league') && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleRemoveRankCard('league')}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={16} name="minus.circle" color="#72767d" />
                    <ThemedText style={styles.actionButtonText}>Remove Card</ThemedText>
                  </TouchableOpacity>
                )}
                {riotAccount && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleUnlinkRiotAccount}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={16} name="link.badge.minus" color="#c42743" />
                    <ThemedText style={[styles.actionButtonText, styles.unlinkText]}>Unlink Account</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Valorant */}
            <TouchableOpacity
              style={[
                styles.gameCard,
                enabledRankCards.includes('valorant') && styles.gameCardActive
              ]}
              onPress={() => handleGameSelect('valorant')}
              activeOpacity={0.7}
              disabled={enabledRankCards.includes('valorant')}
            >
              <View style={styles.gameCardHeader}>
                <View style={styles.gameCardLeft}>
                  <Image
                    source={require('@/assets/images/valorant-text.png')}
                    style={styles.gameCardIcon}
                    resizeMode="contain"
                  />
                  <View>
                    <ThemedText style={styles.gameCardTitle}>Valorant</ThemedText>
                    {valorantAccount && (
                      <ThemedText style={styles.gameCardSubtitle}>
                        {valorantAccount.gameName}#{valorantAccount.tagLine}
                      </ThemedText>
                    )}
                  </View>
                </View>
                {enabledRankCards.includes('valorant') ? (
                  <IconSymbol size={24} name="checkmark.circle.fill" color="#4ade80" />
                ) : (
                  <IconSymbol size={24} name="plus.circle" color="#b9bbbe" />
                )}
              </View>
            </TouchableOpacity>

            {/* Secondary Actions for Valorant */}
            {(enabledRankCards.includes('valorant') || valorantAccount) && (
              <View style={styles.actionsRow}>
                {enabledRankCards.includes('valorant') && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleRemoveRankCard('valorant')}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={16} name="minus.circle" color="#72767d" />
                    <ThemedText style={styles.actionButtonText}>Remove Card</ThemedText>
                  </TouchableOpacity>
                )}
                {valorantAccount && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleUnlinkValorantAccount}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={16} name="link.badge.minus" color="#c42743" />
                    <ThemedText style={[styles.actionButtonText, styles.unlinkText]}>Unlink Account</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
    backgroundColor: '#1e2124',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2f33',
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
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#b9bbbe',
    marginBottom: 12,
    lineHeight: 18,
  },
  reorderSection: {
    marginBottom: 32,
  },
  reorderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#36393e',
  },
  reorderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reorderCardIcon: {
    width: 32,
    height: 32,
  },
  reorderCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  reorderButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#36393e',
    borderRadius: 8,
  },
  reorderButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  gameCard: {
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#36393e',
  },
  gameCardActive: {
    borderColor: '#4ade80',
    backgroundColor: '#2c2f33',
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gameCardIcon: {
    width: 40,
    height: 40,
  },
  gameCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  gameCardSubtitle: {
    fontSize: 13,
    color: '#fff',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  unlinkText: {
    color: '#c42743',
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
