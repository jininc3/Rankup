import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getValorantStats } from '@/services/valorantService';
import { unlinkRiotAccount } from '@/services/riotService';
import { LinearGradient } from 'expo-linear-gradient';
import { formatRank } from '@/services/riotService';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;

type GameType = 'league' | 'valorant' | 'tft';

export default function NewRankCardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [enabledRankCards, setEnabledRankCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Riot account status and enabled rank cards
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setRiotAccount(data.riotAccount || null);
          setValorantAccount(data.valorantAccount || null);
          setRiotStats(data.riotStats || null);
          setValorantStats(data.valorantStats || null);
          setEnabledRankCards(data.enabledRankCards || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
              setRiotStats(null);
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
              setValorantStats(null);
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

  const getLeagueRank = () => {
    if (riotStats?.rankedSolo) {
      return formatRank(riotStats.rankedSolo.tier, riotStats.rankedSolo.rank);
    }
    return 'Unranked';
  };

  const getValorantRank = () => {
    return valorantStats?.currentRank || 'Unranked';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Rank Cards</ThemedText>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c42743" />
          </View>
        ) : (
          <>
            {/* League of Legends Card */}
            <TouchableOpacity
              style={styles.gameCardWrapper}
              onPress={() => !riotAccount && handleGameSelect('league')}
              activeOpacity={riotAccount ? 1 : 0.8}
            >
              <LinearGradient
                colors={riotAccount ? ['#1a3a5c', '#0f1f3d', '#091428'] : ['#1a1a1a', '#141414', '#0f0f0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gameCard}
              >
                {/* Game Logo */}
                <View style={styles.logoContainer}>
                  <Image
                    source={require('@/assets/images/lol-icon.png')}
                    style={styles.gameLogo}
                    resizeMode="contain"
                  />
                </View>

                {/* Game Info */}
                <View style={styles.gameInfo}>
                  <ThemedText style={styles.gameName}>League of Legends</ThemedText>

                  {riotAccount ? (
                    <>
                      <View style={styles.accountRow}>
                        <IconSymbol size={14} name="person.fill" color="rgba(255, 255, 255, 0.7)" />
                        <ThemedText style={styles.accountName}>
                          {riotAccount.gameName}#{riotAccount.tagLine}
                        </ThemedText>
                      </View>
                      <View style={styles.rankRow}>
                        <ThemedText style={styles.rankLabel}>Rank:</ThemedText>
                        <ThemedText style={styles.rankValue}>{getLeagueRank()}</ThemedText>
                      </View>
                    </>
                  ) : (
                    <View style={styles.notLinkedRow}>
                      <IconSymbol size={14} name="link" color="#666" />
                      <ThemedText style={styles.notLinkedText}>Not linked</ThemedText>
                    </View>
                  )}
                </View>

                {/* Active badge - top right */}
                {riotAccount && enabledRankCards.includes('league') && (
                  <View style={styles.activeBadge}>
                    <IconSymbol size={10} name="checkmark" color="#4ade80" />
                  </View>
                )}

                {/* Status/Action */}
                <View style={styles.cardAction}>
                  {riotAccount ? (
                    !enabledRankCards.includes('league') && (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleGameSelect('league')}
                      >
                        <IconSymbol size={18} name="plus" color="#fff" />
                        <ThemedText style={styles.addButtonText}>Add</ThemedText>
                      </TouchableOpacity>
                    )
                  ) : (
                    <View style={styles.linkButton}>
                      <IconSymbol size={16} name="link" color="#fff" />
                      <ThemedText style={styles.linkButtonText}>Link</ThemedText>
                    </View>
                  )}
                </View>

                {/* Decorative elements */}
                <View style={[styles.glowOrb, styles.glowOrbTopRight, riotAccount && styles.glowOrbActive]} />
                <View style={[styles.glowOrb, styles.glowOrbBottomLeft, riotAccount && styles.glowOrbActive]} />
              </LinearGradient>

              {/* Unlink option */}
              {riotAccount && (
                <TouchableOpacity
                  style={styles.unlinkButton}
                  onPress={handleUnlinkRiotAccount}
                >
                  <ThemedText style={styles.unlinkText}>Unlink Account</ThemedText>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Valorant Card */}
            <TouchableOpacity
              style={styles.gameCardWrapper}
              onPress={() => !valorantAccount && handleGameSelect('valorant')}
              activeOpacity={valorantAccount ? 1 : 0.8}
            >
              <LinearGradient
                colors={valorantAccount ? ['#DC3D4B', '#8B1E2B', '#5C141D'] : ['#1a1a1a', '#141414', '#0f0f0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gameCard}
              >
                {/* Game Logo */}
                <View style={styles.logoContainer}>
                  <Image
                    source={require('@/assets/images/valorant.png')}
                    style={styles.gameLogo}
                    resizeMode="contain"
                  />
                </View>

                {/* Game Info */}
                <View style={styles.gameInfo}>
                  <ThemedText style={styles.gameName}>Valorant</ThemedText>

                  {valorantAccount ? (
                    <>
                      <View style={styles.accountRow}>
                        <IconSymbol size={14} name="person.fill" color="rgba(255, 255, 255, 0.7)" />
                        <ThemedText style={styles.accountName}>
                          {valorantAccount.gameName}#{valorantAccount.tagLine}
                        </ThemedText>
                      </View>
                      <View style={styles.rankRow}>
                        <ThemedText style={styles.rankLabel}>Rank:</ThemedText>
                        <ThemedText style={styles.rankValue}>{getValorantRank()}</ThemedText>
                      </View>
                    </>
                  ) : (
                    <View style={styles.notLinkedRow}>
                      <IconSymbol size={14} name="link" color="#666" />
                      <ThemedText style={styles.notLinkedText}>Not linked</ThemedText>
                    </View>
                  )}
                </View>

                {/* Active badge - top right */}
                {valorantAccount && enabledRankCards.includes('valorant') && (
                  <View style={styles.activeBadge}>
                    <IconSymbol size={10} name="checkmark" color="#4ade80" />
                  </View>
                )}

                {/* Status/Action */}
                <View style={styles.cardAction}>
                  {valorantAccount ? (
                    !enabledRankCards.includes('valorant') && (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleGameSelect('valorant')}
                      >
                        <IconSymbol size={18} name="plus" color="#fff" />
                        <ThemedText style={styles.addButtonText}>Add</ThemedText>
                      </TouchableOpacity>
                    )
                  ) : (
                    <View style={styles.linkButton}>
                      <IconSymbol size={16} name="link" color="#fff" />
                      <ThemedText style={styles.linkButtonText}>Link</ThemedText>
                    </View>
                  )}
                </View>

                {/* Decorative elements */}
                <View style={[styles.glowOrb, styles.glowOrbTopRight, valorantAccount && styles.glowOrbActiveRed]} />
                <View style={[styles.glowOrb, styles.glowOrbBottomLeft, valorantAccount && styles.glowOrbActiveRed]} />
              </LinearGradient>

              {/* Unlink option */}
              {valorantAccount && (
                <TouchableOpacity
                  style={styles.unlinkButton}
                  onPress={handleUnlinkValorantAccount}
                >
                  <ThemedText style={styles.unlinkText}>Unlink Account</ThemedText>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Info text */}
            <View style={styles.infoContainer}>
              <IconSymbol size={16} name="info.circle" color="#666" />
              <ThemedText style={styles.infoText}>
                Linked accounts will display your current rank on your profile. You can manage visibility in Edit Profile.
              </ThemedText>
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
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCardWrapper: {
    marginBottom: 20,
  },
  gameCard: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  gameLogo: {
    width: 50,
    height: 50,
  },
  gameInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  gameName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  rankValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  notLinkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notLinkedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  cardAction: {
    marginLeft: 'auto',
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c42743',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  glowOrb: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  glowOrbTopRight: {
    top: -30,
    right: -30,
  },
  glowOrbBottomLeft: {
    bottom: -40,
    left: -40,
  },
  glowOrbActive: {
    backgroundColor: 'rgba(74, 180, 255, 0.15)',
  },
  glowOrbActiveRed: {
    backgroundColor: 'rgba(255, 100, 100, 0.15)',
  },
  unlinkButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: 4,
  },
  unlinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#c42743',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 60,
  },
});
