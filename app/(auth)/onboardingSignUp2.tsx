import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import StepProgressIndicator from '@/components/ui/StepProgressIndicator';
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { formatRank } from '@/services/riotService';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 48;

export default function OnboardingSignUp2() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [riotAccount, setRiotAccount] = useState<any>(null);
  const [valorantAccount, setValorantAccount] = useState<any>(null);
  const [riotStats, setRiotStats] = useState<any>(null);
  const [valorantStats, setValorantStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Toggle states for adding rank cards to profile
  const [leagueEnabled, setLeagueEnabled] = useState(true);
  const [valorantEnabled, setValorantEnabled] = useState(true);

  // Fetch linked accounts when screen gains focus
  useFocusEffect(
    useCallback(() => {
      const fetchAccounts = async () => {
        if (!user?.id) {
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.id));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRiotAccount(data.riotAccount || null);
            setValorantAccount(data.valorantAccount || null);
            setRiotStats(data.riotStats || null);
            setValorantStats(data.valorantStats || null);
          }
        } catch (error) {
          console.error('Error fetching accounts:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchAccounts();
    }, [user?.id])
  );

  const handleContinue = () => {
    // Build enabledRankCards array based on toggles
    const enabledRankCards: string[] = [];
    if (riotAccount && leagueEnabled) {
      enabledRankCards.push('league');
    }
    if (valorantAccount && valorantEnabled) {
      enabledRankCards.push('valorant');
    }

    router.push({
      pathname: '/(auth)/onboardingSignUp3',
      params: {
        ...params,
        linkedRiot: riotAccount ? 'true' : 'false',
        linkedValorant: valorantAccount ? 'true' : 'false',
        enabledRankCards: JSON.stringify(enabledRankCards),
      },
    });
  };

  const handleSkip = () => {
    router.push({
      pathname: '/(auth)/onboardingSignUp3',
      params: {
        ...params,
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

  const handleLinkLeague = () => {
    router.push({
      pathname: '/profilePages/linkRiotAccount',
      params: { selectedGame: 'league', fromSignup: 'true' },
    });
  };

  const handleLinkValorant = () => {
    router.push({
      pathname: '/profilePages/linkValorantAccount',
      params: { fromSignup: 'true' },
    });
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
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol size={20} name="chevron.left" color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Link Accounts</ThemedText>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <ThemedText style={styles.skipText}>Skip</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <StepProgressIndicator currentStep={3} totalSteps={5} />
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.subtitle}>
            Link your gaming accounts to display rank cards (optional)
          </ThemedText>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#c42743" />
            </View>
          ) : (
            <>
              {/* League of Legends Card */}
              {riotAccount ? (
                <View style={styles.linkedCardContainer}>
                  <LinearGradient
                    colors={['#1a3a5c', '#0f1f3d', '#091428']}
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
                    </View>

                    {/* Linked Badge */}
                    <View style={styles.linkedBadge}>
                      <IconSymbol size={14} name="checkmark" color="#4ade80" />
                    </View>

                    {/* Decorative elements */}
                    <View style={[styles.glowOrb, styles.glowOrbTopRight, styles.glowOrbActive]} />
                    <View style={[styles.glowOrb, styles.glowOrbBottomLeft, styles.glowOrbActive]} />
                  </LinearGradient>

                  {/* Toggle Row */}
                  <View style={styles.toggleRow}>
                    <ThemedText style={styles.toggleLabel}>Show on profile</ThemedText>
                    <Switch
                      value={leagueEnabled}
                      onValueChange={setLeagueEnabled}
                      trackColor={{ false: '#3e3e3e', true: '#c42743' }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.gameCardWrapper}
                  onPress={handleLinkLeague}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#1a1a1a', '#141414', '#0f0f0f']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gameCard}
                  >
                    <View style={styles.logoContainer}>
                      <Image
                        source={require('@/assets/images/lol-icon.png')}
                        style={styles.gameLogo}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.gameInfo}>
                      <ThemedText style={styles.gameName}>League of Legends</ThemedText>
                      <View style={styles.notLinkedRow}>
                        <IconSymbol size={14} name="link" color="#666" />
                        <ThemedText style={styles.notLinkedText}>Not linked</ThemedText>
                      </View>
                    </View>

                    <View style={styles.cardAction}>
                      <View style={styles.linkButton}>
                        <IconSymbol size={16} name="link" color="#fff" />
                        <ThemedText style={styles.linkButtonText}>Link</ThemedText>
                      </View>
                    </View>

                    <View style={[styles.glowOrb, styles.glowOrbTopRight]} />
                    <View style={[styles.glowOrb, styles.glowOrbBottomLeft]} />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Valorant Card */}
              {valorantAccount ? (
                <View style={styles.linkedCardContainer}>
                  <LinearGradient
                    colors={['#DC3D4B', '#8B1E2B', '#5C141D']}
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
                    </View>

                    {/* Linked Badge */}
                    <View style={styles.linkedBadge}>
                      <IconSymbol size={14} name="checkmark" color="#4ade80" />
                    </View>

                    {/* Decorative elements */}
                    <View style={[styles.glowOrb, styles.glowOrbTopRight, styles.glowOrbActiveRed]} />
                    <View style={[styles.glowOrb, styles.glowOrbBottomLeft, styles.glowOrbActiveRed]} />
                  </LinearGradient>

                  {/* Toggle Row */}
                  <View style={styles.toggleRow}>
                    <ThemedText style={styles.toggleLabel}>Show on profile</ThemedText>
                    <Switch
                      value={valorantEnabled}
                      onValueChange={setValorantEnabled}
                      trackColor={{ false: '#3e3e3e', true: '#c42743' }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.gameCardWrapper}
                  onPress={handleLinkValorant}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#1a1a1a', '#141414', '#0f0f0f']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gameCard}
                  >
                    <View style={styles.logoContainer}>
                      <Image
                        source={require('@/assets/images/valorant.png')}
                        style={styles.gameLogo}
                        resizeMode="contain"
                      />
                    </View>

                    <View style={styles.gameInfo}>
                      <ThemedText style={styles.gameName}>Valorant</ThemedText>
                      <View style={styles.notLinkedRow}>
                        <IconSymbol size={14} name="link" color="#666" />
                        <ThemedText style={styles.notLinkedText}>Not linked</ThemedText>
                      </View>
                    </View>

                    <View style={styles.cardAction}>
                      <View style={styles.linkButton}>
                        <IconSymbol size={16} name="link" color="#fff" />
                        <ThemedText style={styles.linkButtonText}>Link</ThemedText>
                      </View>
                    </View>

                    <View style={[styles.glowOrb, styles.glowOrbTopRight]} />
                    <View style={[styles.glowOrb, styles.glowOrbBottomLeft]} />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Info text */}
              <View style={styles.infoContainer}>
                <IconSymbol size={16} name="info.circle" color="#666" />
                <ThemedText style={styles.infoText}>
                  Linked accounts will display your current rank on your profile.
                </ThemedText>
              </View>
            </>
          )}

          {/* Continue Button */}
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    padding: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c42743',
  },
  progressContainer: {
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCardWrapper: {
    marginBottom: 16,
  },
  linkedCardContainer: {
    marginBottom: 16,
  },
  gameCard: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  gameLogo: {
    width: 44,
    height: 44,
  },
  gameInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  gameName: {
    fontSize: 18,
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
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  rankValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  notLinkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notLinkedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  cardAction: {
    marginLeft: 'auto',
  },
  linkedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#b9bbbe',
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
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: '#c42743',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 'auto',
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
