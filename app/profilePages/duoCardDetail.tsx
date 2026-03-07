import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, StyleSheet, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { getRecentMatches, RecentMatchResult } from '@/services/riotService';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

// League rank icon mapping
const LEAGUE_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/leagueranks/iron.png'),
  bronze: require('@/assets/images/leagueranks/bronze.png'),
  silver: require('@/assets/images/leagueranks/silver.png'),
  gold: require('@/assets/images/leagueranks/gold.png'),
  platinum: require('@/assets/images/leagueranks/platinum.png'),
  emerald: require('@/assets/images/leagueranks/emerald.png'),
  diamond: require('@/assets/images/leagueranks/diamond.png'),
  master: require('@/assets/images/leagueranks/masters.png'),
  grandmaster: require('@/assets/images/leagueranks/grandmaster.png'),
  challenger: require('@/assets/images/leagueranks/challenger.png'),
  unranked: require('@/assets/images/leagueranks/unranked.png'),
};

// Valorant rank icon mapping
const VALORANT_RANK_ICONS: { [key: string]: any } = {
  iron: require('@/assets/images/valorantranks/iron.png'),
  bronze: require('@/assets/images/valorantranks/bronze.png'),
  silver: require('@/assets/images/valorantranks/silver.png'),
  gold: require('@/assets/images/valorantranks/gold.png'),
  platinum: require('@/assets/images/valorantranks/platinum.png'),
  diamond: require('@/assets/images/valorantranks/diamond.png'),
  ascendant: require('@/assets/images/valorantranks/ascendant.png'),
  immortal: require('@/assets/images/valorantranks/immortal.png'),
  radiant: require('@/assets/images/valorantranks/radiant.png'),
  unranked: require('@/assets/images/valorantranks/unranked.png'),
};

// League lane icons
const LEAGUE_LANE_ICONS: { [key: string]: any } = {
  'Top': require('@/assets/images/leaguelanes/top.png'),
  'Jungle': require('@/assets/images/leaguelanes/jungle.png'),
  'Mid': require('@/assets/images/leaguelanes/mid.png'),
  'ADC': require('@/assets/images/leaguelanes/bottom.png'),
  'Support': require('@/assets/images/leaguelanes/support.png'),
};

// Valorant role icons
const VALORANT_ROLE_ICONS: { [key: string]: any } = {
  'Duelist': require('@/assets/images/valorantroles/Duelist.png'),
  'Initiator': require('@/assets/images/valorantroles/Initiator.png'),
  'Controller': require('@/assets/images/valorantroles/Controller.png'),
  'Sentinel': require('@/assets/images/valorantroles/Sentinel.png'),
};

// Role options
const VALORANT_ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];
const LEAGUE_ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

// Valorant agents grouped by role
const VALORANT_AGENTS: { [key: string]: string[] } = {
  'Duelist': ['Jett', 'Reyna', 'Raze', 'Phoenix', 'Yoru', 'Neon', 'Iso'],
  'Initiator': ['Sova', 'Breach', 'Skye', 'KAY/O', 'Fade', 'Gekko'],
  'Controller': ['Brimstone', 'Omen', 'Viper', 'Astra', 'Harbor', 'Clove'],
  'Sentinel': ['Sage', 'Cypher', 'Killjoy', 'Chamber', 'Deadlock', 'Vyse'],
};

// League champions grouped by role
const LEAGUE_CHAMPIONS: { [key: string]: string[] } = {
  'Top': ['Aatrox', 'Darius', 'Garen', 'Jax', 'Fiora', 'Camille', 'Ornn', 'Sett'],
  'Jungle': ['Lee Sin', 'Kha\'Zix', 'Graves', 'Elise', 'Vi', 'Rek\'Sai', 'Hecarim'],
  'Mid': ['Ahri', 'Zed', 'Yasuo', 'Syndra', 'Orianna', 'Viktor', 'LeBlanc'],
  'ADC': ['Jinx', 'Caitlyn', 'Kai\'Sa', 'Jhin', 'Vayne', 'Ezreal', 'Ashe'],
  'Support': ['Thresh', 'Leona', 'Lulu', 'Nami', 'Braum', 'Nautilus', 'Soraka'],
};

export default function DuoCardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse params
  const game = params.game as 'valorant' | 'league';
  const username = params.username as string;
  const rawAvatar = params.avatar;
  let avatar = Array.isArray(rawAvatar) ? rawAvatar[0] : rawAvatar;

  // Fix: Re-encode the Firebase Storage URL path if it got decoded during navigation
  if (avatar && avatar.includes('firebasestorage.googleapis.com')) {
    const [urlWithPath, queryString] = avatar.split('?');
    const [baseUrl, ...pathParts] = urlWithPath.split('/o/');
    if (pathParts.length > 0) {
      const encodedPath = pathParts.join('/o/').split('/').map(encodeURIComponent).join('%2F');
      avatar = `${baseUrl}/o/${encodedPath}${queryString ? '?' + queryString : ''}`;
    }
  }

  const peakRank = params.peakRank as string;
  const currentRank = params.currentRank as string;
  const region = params.region as string;
  const initialMainRole = params.mainRole as string;
  const initialMainAgent = params.mainAgent as string;
  const initialLookingFor = (params.lookingFor as string) || 'Any';
  const userId = params.userId as string | undefined;
  const isOwnCard = params.isOwnCard === 'true';

  const [recentMatches, setRecentMatches] = useState<RecentMatchResult[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [avatarError, setAvatarError] = useState(false);

  // Editable state for own card
  const [mainRole, setMainRole] = useState(initialMainRole);
  const [mainAgent, setMainAgent] = useState(initialMainAgent);
  const [lookingFor, setLookingFor] = useState(initialLookingFor);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showLookingForDropdown, setShowLookingForDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Track if user has made changes
  const hasChanges = mainRole !== initialMainRole ||
                     mainAgent !== initialMainAgent ||
                     lookingFor !== initialLookingFor;

  // Theme colors based on game
  const gameAccentColor = game === 'valorant' ? '#8b3d47' : '#3d6a70';
  const gameAccentLight = game === 'valorant' ? '#a85561' : '#4d8a92';

  const roles = game === 'valorant' ? VALORANT_ROLES : LEAGUE_ROLES;
  const agents = mainRole
    ? (game === 'valorant' ? VALORANT_AGENTS[mainRole] : LEAGUE_CHAMPIONS[mainRole])
    : [];

  const handleSaveChanges = async () => {
    if (!userId || !mainRole || !mainAgent) {
      Alert.alert('Missing Information', 'Please select your main role and main agent/champion');
      return;
    }

    setIsSaving(true);
    try {
      const duoCardRef = doc(db, 'duoCards', `${userId}_${game}`);
      await setDoc(duoCardRef, {
        mainRole,
        mainAgent,
        lookingFor,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      Alert.alert('Success', 'Your duo card has been updated!');
    } catch (error) {
      console.error('Error updating duo card:', error);
      Alert.alert('Error', 'Failed to update your duo card. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const fetchMatches = async () => {
      if (!userId || userId.trim() === '') {
        setLoadingMatches(false);
        return;
      }
      setLoadingMatches(true);
      const result = await getRecentMatches(userId, game);
      setRecentMatches(result.matches);
      setLoadingMatches(false);
    };

    fetchMatches();
  }, [userId, game]);

  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return game === 'valorant' ? VALORANT_RANK_ICONS.unranked : LEAGUE_RANK_ICONS.unranked;
    }
    const tier = rank.split(' ')[0].toLowerCase();
    return game === 'valorant'
      ? (VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked)
      : (LEAGUE_RANK_ICONS[tier] || LEAGUE_RANK_ICONS.unranked);
  };

  const getRoleIcon = (role: string) => {
    if (game === 'valorant') {
      return VALORANT_ROLE_ICONS[role] || VALORANT_ROLE_ICONS['Duelist'];
    } else {
      return LEAGUE_LANE_ICONS[role] || LEAGUE_LANE_ICONS['Mid'];
    }
  };

  const handleUserPress = () => {
    if (userId) {
      router.push(`/profilePages/profileView?userId=${userId}`);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol size={20} name="chevron.left" color="#888" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {isOwnCard ? 'EDIT CARD' : 'DUO PROFILE'}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main Card Container */}
        <View style={styles.cardOuter}>
          {/* 3D Shadow layers */}
          <View style={styles.shadow3} />
          <View style={styles.shadow2} />
          <View style={styles.shadow1} />

          {/* Main Card */}
          <View style={styles.card}>
            <LinearGradient
              colors={['#1a1d21', '#0f1114']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cardBackground}
            />

            {/* Card Header Bar */}
            <View style={styles.cardHeaderBar}>
              <ThemedText style={styles.cardHeaderTitle}>
                {game === 'valorant' ? 'VALORANT' : 'LEAGUE'}
              </ThemedText>
              <ThemedText style={styles.cardHeaderSubtitle}>DUO CARD</ThemedText>
              <View style={styles.cardHeaderAccent}>
                <ThemedText style={[styles.cardHeaderAccentText, { color: gameAccentLight }]}>&gt;&gt;&gt;</ThemedText>
              </View>
            </View>

            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileRow}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                  <View style={[styles.avatarFrame, { borderColor: gameAccentColor }]}>
                    {avatar && avatar.startsWith('http') && !avatarError ? (
                      <Image
                        source={{ uri: avatar }}
                        style={styles.avatar}
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <ThemedText style={styles.avatarInitial}>
                          {username?.[0]?.toUpperCase() || '?'}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                  </View>
                </View>

                {/* User Info */}
                <View style={styles.userInfo}>
                  <ThemedText style={styles.username} numberOfLines={1}>{username}</ThemedText>
                  <View style={styles.regionBadge}>
                    <ThemedText style={styles.regionText}>{region?.toUpperCase()}</ThemedText>
                  </View>
                </View>
              </View>

              {/* View Profile Button - Only for other users */}
              {userId && !isOwnCard && (
                <TouchableOpacity
                  style={[styles.viewProfileButton, { backgroundColor: gameAccentColor }]}
                  onPress={handleUserPress}
                >
                  <IconSymbol size={12} name="person.fill" color="#fff" />
                  <ThemedText style={styles.viewProfileText}>View Full Profile</ThemedText>
                  <IconSymbol size={12} name="chevron.right" color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Ranks Section */}
            <View style={styles.ranksSection}>
              <ThemedText style={styles.sectionLabel}>RANKS</ThemedText>
              <View style={styles.ranksRow}>
                {/* Peak Rank */}
                <View style={styles.rankBox}>
                  <ThemedText style={styles.rankLabel}>PEAK</ThemedText>
                  <View style={styles.rankIconContainer}>
                    <View style={[styles.rankGlow, { backgroundColor: gameAccentColor }]} />
                    <View style={[styles.rankBadge, { borderColor: gameAccentColor }]}>
                      <Image
                        source={getRankIcon(peakRank)}
                        style={styles.rankIcon}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                  <ThemedText style={styles.rankValue}>{peakRank}</ThemedText>
                </View>

                {/* Current Rank */}
                <View style={styles.rankBox}>
                  <ThemedText style={styles.rankLabel}>CURRENT</ThemedText>
                  <View style={styles.rankIconContainer}>
                    <View style={[styles.rankGlow, { backgroundColor: gameAccentColor }]} />
                    <View style={[styles.rankBadge, { borderColor: gameAccentColor }]}>
                      <Image
                        source={getRankIcon(currentRank)}
                        style={styles.rankIcon}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                  <ThemedText style={styles.rankValue}>{currentRank}</ThemedText>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Recent Games */}
            <View style={styles.recentGamesSection}>
              <ThemedText style={styles.sectionLabel}>LAST 5 GAMES</ThemedText>
              <View style={styles.recentGamesRow}>
                {loadingMatches ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.gameCirclePlaceholder} />
                  ))
                ) : recentMatches.length > 0 ? (
                  [0, 1, 2, 3, 4].map((i) => {
                    const match = recentMatches[i];
                    if (!match) {
                      return <View key={i} style={styles.gameCirclePlaceholder} />;
                    }
                    return (
                      <View key={i} style={[styles.gameCircle, match.won ? styles.gameCircleWin : styles.gameCircleLoss]}>
                        <ThemedText style={styles.gameCircleText}>
                          {match.won ? 'W' : 'L'}
                        </ThemedText>
                      </View>
                    );
                  })
                ) : (
                  <ThemedText style={styles.noGamesText}>No recent games</ThemedText>
                )}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Player Info / Edit Section */}
            <View style={styles.playerInfoSection}>
              <ThemedText style={styles.sectionLabel}>
                {isOwnCard ? 'EDIT DETAILS' : 'PLAYER INFO'}
              </ThemedText>

              {isOwnCard ? (
                <>
                  {/* Edit Mode: Main Role & Main Agent in same row */}
                  <View style={styles.editRow}>
                    {/* Main Role */}
                    <View style={styles.editFieldHalf}>
                      <ThemedText style={styles.fieldLabel}>Role</ThemedText>
                      <TouchableOpacity
                        style={styles.dropdownCompact}
                        onPress={() => {
                          setShowRoleDropdown(!showRoleDropdown);
                          setShowAgentDropdown(false);
                          setShowLookingForDropdown(false);
                        }}
                      >
                        <Image
                          source={getRoleIcon(mainRole)}
                          style={styles.dropdownIconSmall}
                          resizeMode="contain"
                        />
                        <ThemedText style={styles.dropdownTextCompact} numberOfLines={1}>{mainRole}</ThemedText>
                        <IconSymbol size={14} name="chevron.down" color="#4a4d52" />
                      </TouchableOpacity>
                      {showRoleDropdown && (
                        <View style={styles.dropdownListAbsolute}>
                          {roles.map((role) => (
                            <TouchableOpacity
                              key={role}
                              style={styles.dropdownOptionCompact}
                              onPress={() => {
                                setMainRole(role);
                                setMainAgent('');
                                setShowRoleDropdown(false);
                              }}
                            >
                              <Image
                                source={getRoleIcon(role)}
                                style={styles.dropdownOptionIconSmall}
                                resizeMode="contain"
                              />
                              <ThemedText style={styles.dropdownOptionTextCompact}>{role}</ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Main Agent */}
                    <View style={styles.editFieldHalf}>
                      <ThemedText style={styles.fieldLabel}>
                        {game === 'valorant' ? 'Agent' : 'Champion'}
                      </ThemedText>
                      <TouchableOpacity
                        style={[styles.dropdownCompact, !mainRole && styles.dropdownDisabled]}
                        onPress={() => {
                          if (mainRole) {
                            setShowAgentDropdown(!showAgentDropdown);
                            setShowRoleDropdown(false);
                            setShowLookingForDropdown(false);
                          }
                        }}
                        disabled={!mainRole}
                      >
                        <ThemedText
                          style={mainAgent ? styles.dropdownTextCompact : styles.dropdownPlaceholderCompact}
                          numberOfLines={1}
                        >
                          {mainAgent || 'Select'}
                        </ThemedText>
                        {mainRole && <IconSymbol size={14} name="chevron.down" color="#4a4d52" />}
                      </TouchableOpacity>
                      {showAgentDropdown && mainRole && (
                        <View style={styles.dropdownListAbsolute}>
                          <ScrollView style={styles.dropdownScrollCompact} nestedScrollEnabled={true}>
                            {agents.map((agent) => (
                              <TouchableOpacity
                                key={agent}
                                style={styles.dropdownOptionCompact}
                                onPress={() => {
                                  setMainAgent(agent);
                                  setShowAgentDropdown(false);
                                }}
                              >
                                <ThemedText style={styles.dropdownOptionTextCompact}>{agent}</ThemedText>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Looking For - Full width below */}
                  <View style={styles.editFieldFull}>
                    <ThemedText style={styles.fieldLabel}>Looking For</ThemedText>
                    <TouchableOpacity
                      style={styles.dropdownCompact}
                      onPress={() => {
                        setShowLookingForDropdown(!showLookingForDropdown);
                        setShowRoleDropdown(false);
                        setShowAgentDropdown(false);
                      }}
                    >
                      <View style={styles.dropdownContent}>
                        {lookingFor !== 'Any' && (
                          <Image
                            source={getRoleIcon(lookingFor)}
                            style={styles.dropdownIconSmall}
                            resizeMode="contain"
                          />
                        )}
                        <ThemedText style={styles.dropdownTextCompact}>{lookingFor}</ThemedText>
                      </View>
                      <IconSymbol size={14} name="chevron.down" color="#4a4d52" />
                    </TouchableOpacity>
                    {showLookingForDropdown && (
                      <View style={styles.dropdownList}>
                        <TouchableOpacity
                          style={styles.dropdownOptionCompact}
                          onPress={() => {
                            setLookingFor('Any');
                            setShowLookingForDropdown(false);
                          }}
                        >
                          <ThemedText style={styles.dropdownOptionTextCompact}>Any</ThemedText>
                        </TouchableOpacity>
                        {roles.map((role) => (
                          <TouchableOpacity
                            key={role}
                            style={styles.dropdownOptionCompact}
                            onPress={() => {
                              setLookingFor(role);
                              setShowLookingForDropdown(false);
                            }}
                          >
                            <Image
                              source={getRoleIcon(role)}
                              style={styles.dropdownOptionIconSmall}
                              resizeMode="contain"
                            />
                            <ThemedText style={styles.dropdownOptionTextCompact}>{role}</ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <>
                  {/* View Mode: Main Role */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Image
                        source={getRoleIcon(mainRole)}
                        style={styles.infoIcon}
                        resizeMode="contain"
                      />
                      <View style={styles.infoText}>
                        <ThemedText style={styles.infoLabel}>MAIN ROLE</ThemedText>
                        <ThemedText style={styles.infoValue}>{mainRole}</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* View Mode: Main Agent/Champion */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <IconSymbol size={18} name="star.fill" color="#4a4d52" />
                      <View style={styles.infoText}>
                        <ThemedText style={styles.infoLabel}>
                          {game === 'valorant' ? 'MAIN AGENT' : 'MAIN CHAMPION'}
                        </ThemedText>
                        <ThemedText style={styles.infoValue}>{mainAgent}</ThemedText>
                      </View>
                    </View>
                  </View>
                </>
              )}

              {/* Save Button - Only for own card */}
              {isOwnCard && (
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    hasChanges ? { backgroundColor: gameAccentColor } : styles.saveButtonInactive,
                    isSaving && styles.saveButtonDisabled
                  ]}
                  onPress={handleSaveChanges}
                  disabled={isSaving || !hasChanges}
                >
                  <ThemedText style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextInactive]}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {/* Footer Bar */}
            <View style={styles.footerBar}>
              <View style={[styles.footerAccent, { backgroundColor: gameAccentColor }]} />
              <View style={styles.footerContent}>
                <ThemedText style={styles.footerText}>RANKUP</ThemedText>
                <View style={styles.footerArrow}>
                  <ThemedText style={[styles.footerArrowText, { color: gameAccentLight }]}>&gt;&gt;&gt;</ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0b0d',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 1.5,
  },
  headerSpacer: {
    width: 36,
  },
  // Card Container with 3D shadows
  cardOuter: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 8,
  },
  // 3D Shadow layers - light from right side
  shadow3: {
    position: 'absolute',
    top: 8,
    left: -8,
    right: 12,
    bottom: -8,
    backgroundColor: '#000',
    borderRadius: 14,
    opacity: 0.2,
  },
  shadow2: {
    position: 'absolute',
    top: 5,
    left: -5,
    right: 8,
    bottom: -5,
    backgroundColor: '#000',
    borderRadius: 13,
    opacity: 0.25,
  },
  shadow1: {
    position: 'absolute',
    top: 2,
    left: -2,
    right: 4,
    bottom: -2,
    backgroundColor: '#000',
    borderRadius: 12,
    opacity: 0.3,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#232528',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  // Card Header Bar
  cardHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2023',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 1.5,
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
  },
  cardHeaderAccent: {
    marginLeft: 'auto',
  },
  cardHeaderAccentText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Profile Section
  profileSection: {
    padding: 16,
    gap: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarSection: {
    position: 'relative',
  },
  avatarFrame: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#151719',
    borderWidth: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151719',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2a2d32',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0f1114',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3d7a4a',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e5e5e5',
    letterSpacing: -0.3,
  },
  regionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1c1e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2a2d30',
  },
  regionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6a6d72',
    letterSpacing: 0.5,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#1e2023',
    marginHorizontal: 16,
  },
  // Ranks Section
  ranksSection: {
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4a4d52',
    letterSpacing: 1,
  },
  ranksRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rankBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#13151a',
    borderRadius: 10,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e2023',
  },
  rankLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#4a4d52',
    letterSpacing: 0.8,
  },
  rankIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.2,
  },
  rankBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1114',
    borderRadius: 8,
    padding: 6,
    borderWidth: 2,
  },
  rankIcon: {
    width: 48,
    height: 48,
  },
  rankValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9a9da2',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  // Recent Games
  recentGamesSection: {
    padding: 16,
    gap: 10,
  },
  recentGamesRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  gameCircle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCircleWin: {
    backgroundColor: '#1a4a2e',
    borderWidth: 1,
    borderColor: '#2d6b42',
  },
  gameCircleLoss: {
    backgroundColor: '#4a1a1a',
    borderWidth: 1,
    borderColor: '#6b2d2d',
  },
  gameCirclePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#13151a',
    borderWidth: 1,
    borderColor: '#1e2023',
  },
  gameCircleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  noGamesText: {
    fontSize: 11,
    color: '#4a4d52',
  },
  // Player Info Section
  playerInfoSection: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#13151a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e2023',
  },
  infoIcon: {
    width: 22,
    height: 22,
    opacity: 0.85,
  },
  infoText: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#4a4d52',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9a9da2',
  },
  // Edit Fields
  editField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6a6d72',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  // Compact Edit Layout
  editRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  editFieldHalf: {
    flex: 1,
    position: 'relative',
  },
  editFieldFull: {
    marginBottom: 4,
  },
  dropdownCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#13151a',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#1e2023',
    gap: 6,
  },
  dropdownDisabled: {
    opacity: 0.5,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dropdownIconSmall: {
    width: 16,
    height: 16,
    opacity: 0.85,
  },
  dropdownTextCompact: {
    fontSize: 12,
    color: '#9a9da2',
    fontWeight: '600',
    flex: 1,
  },
  dropdownPlaceholderCompact: {
    fontSize: 12,
    color: '#4a4d52',
    flex: 1,
  },
  dropdownListAbsolute: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1d21',
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#232528',
    overflow: 'hidden',
    zIndex: 100,
  },
  dropdownList: {
    backgroundColor: '#1a1d21',
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#232528',
    overflow: 'hidden',
  },
  dropdownScrollCompact: {
    maxHeight: 150,
  },
  dropdownOptionCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2023',
  },
  dropdownOptionIconSmall: {
    width: 16,
    height: 16,
    opacity: 0.85,
  },
  dropdownOptionTextCompact: {
    fontSize: 12,
    color: '#9a9da2',
  },
  // Save Button
  saveButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonInactive: {
    backgroundColor: '#2a2d32',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  saveButtonTextInactive: {
    color: '#4a4d52',
  },
  // Footer Bar
  footerBar: {
    borderTopWidth: 1,
    borderTopColor: '#1a1c1e',
    backgroundColor: '#0c0d0f',
  },
  footerAccent: {
    height: 2,
    width: '100%',
    opacity: 0.6,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3a3d42',
    letterSpacing: 2,
  },
  footerArrow: {
    marginLeft: 'auto',
  },
  footerArrowText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
