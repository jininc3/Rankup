import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, StyleSheet, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getRecentMatches, RecentMatchResult } from '@/services/riotService';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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

// Valorant agent icon mapping
const AGENT_ICONS: { [key: string]: any } = {
  'jett': require('@/assets/images/valorantagents/jett.png'),
  'reyna': require('@/assets/images/valorantagents/reyna.png'),
  'raze': require('@/assets/images/valorantagents/raze.png'),
  'phoenix': require('@/assets/images/valorantagents/phoenix.png'),
  'yoru': require('@/assets/images/valorantagents/yoru.png'),
  'neon': require('@/assets/images/valorantagents/neon.png'),
  'iso': require('@/assets/images/valorantagents/iso.png'),
  'sova': require('@/assets/images/valorantagents/sova.png'),
  'breach': require('@/assets/images/valorantagents/breach.png'),
  'skye': require('@/assets/images/valorantagents/skye.png'),
  'kay/o': require('@/assets/images/valorantagents/kayo.png'),
  'kayo': require('@/assets/images/valorantagents/kayo.png'),
  'fade': require('@/assets/images/valorantagents/fade.png'),
  'gekko': require('@/assets/images/valorantagents/gekko.png'),
  'brimstone': require('@/assets/images/valorantagents/brimstone.png'),
  'omen': require('@/assets/images/valorantagents/omen.png'),
  'viper': require('@/assets/images/valorantagents/viper.png'),
  'astra': require('@/assets/images/valorantagents/astra.png'),
  'harbor': require('@/assets/images/valorantagents/harbor.png'),
  'clove': require('@/assets/images/valorantagents/clove.png'),
  'sage': require('@/assets/images/valorantagents/sage.png'),
  'cypher': require('@/assets/images/valorantagents/cypher.png'),
  'killjoy': require('@/assets/images/valorantagents/killjoy.png'),
  'chamber': require('@/assets/images/valorantagents/chamber.png'),
  'deadlock': require('@/assets/images/valorantagents/deadlock.png'),
  'vyse': require('@/assets/images/valorantagents/vyse.png'),
  'tejo': require('@/assets/images/valorantagents/tejo.png'),
  'waylay': require('@/assets/images/valorantagents/waylay.png'),
  'miks': require('@/assets/images/valorantagents/miks.png'),
  'veto': require('@/assets/images/valorantagents/veto.png'),
};

const getAgentIcon = (agentName: string) => {
  if (!agentName) return null;
  return AGENT_ICONS[agentName.toLowerCase()] || null;
};

// Helper function to format relative time
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return `${Math.floor(days / 7)}w ago`;
  }
};

// Check if most recent match is within 3 months
const isMatchesRecent = (matches: RecentMatchResult[]): boolean => {
  if (matches.length === 0) return false;
  const mostRecentMatch = matches[0];
  if (!mostRecentMatch.playedAt) return true; // Show if no timestamp available

  const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  return mostRecentMatch.playedAt > threeMonthsAgo;
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

  // Parse new stats params
  const rawInGameIcon = params.inGameIcon;
  const inGameIcon = Array.isArray(rawInGameIcon) ? rawInGameIcon[0] : rawInGameIcon;
  const rawInGameName = params.inGameName;
  const inGameName = Array.isArray(rawInGameName) ? rawInGameName[0] : rawInGameName;
  const rawWinRate = params.winRate;
  const winRateStr = Array.isArray(rawWinRate) ? rawWinRate[0] : rawWinRate;
  const winRate = winRateStr ? parseFloat(winRateStr) : undefined;
  const rawGamesPlayed = params.gamesPlayed;
  const gamesPlayedStr = Array.isArray(rawGamesPlayed) ? rawGamesPlayed[0] : rawGamesPlayed;
  const gamesPlayed = gamesPlayedStr ? parseInt(gamesPlayedStr, 10) : undefined;

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

  const gameAccentColor = game === 'valorant' ? '#8b3d47' : '#3d6a70';

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

      if (game === 'valorant') {
        // Read from Firestore cache instead of calling Cloud Function
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const matchHistory = userDoc.data().valorantStats?.matchHistory;
            if (matchHistory && Array.isArray(matchHistory) && matchHistory.length > 0) {
              const mapped: RecentMatchResult[] = matchHistory.map((m: any) => ({
                won: m.won,
                agent: m.agent,
                kills: m.kills,
                deaths: m.deaths,
                assists: m.assists,
                map: m.map,
                score: m.score,
                playedAt: m.playedAt || (m.gameStart ? m.gameStart * 1000 : undefined),
                placement: m.placement,
              }));
              setRecentMatches(mapped);
            } else {
              setRecentMatches([]);
            }
          } else {
            setRecentMatches([]);
          }
        } catch (error) {
          console.error('Error fetching Valorant matches from Firestore:', error);
          setRecentMatches([]);
        }
      } else {
        // League: use Cloud Function
        const result = await getRecentMatches(userId, game);
        setRecentMatches(result.matches);
      }

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
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <IconSymbol size={24} name="xmark" color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Profile Section */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={!isOwnCard ? handleUserPress : undefined}
          activeOpacity={!isOwnCard ? 0.7 : 1}
          disabled={isOwnCard}
        >
          <View style={styles.avatarContainer}>
            {inGameIcon && inGameIcon.startsWith('http') ? (
              <Image source={{ uri: inGameIcon }} style={styles.avatar} />
            ) : avatar && avatar.startsWith('http') ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <IconSymbol size={40} name="person.fill" color="#fff" />
              </View>
            )}
          </View>
          <ThemedText style={styles.username}>{inGameName || username}</ThemedText>
          {inGameName && inGameName !== username && (
            <ThemedText style={styles.inGameName}>{username}</ThemedText>
          )}
        </TouchableOpacity>

        {/* Ranks Section */}
        <View style={styles.ranksSection}>
          <View style={styles.rankBox}>
            <Image
              source={getRankIcon(peakRank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.rankLabel}>Peak Rank</ThemedText>
            <ThemedText style={styles.rankValue}>{peakRank}</ThemedText>
          </View>

          <View style={styles.rankBox}>
            <Image
              source={getRankIcon(currentRank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.rankLabel}>Current Rank</ThemedText>
            <ThemedText style={styles.rankValue}>{currentRank}</ThemedText>
          </View>
        </View>

        {/* Stats Section */}
        {(winRate !== undefined || gamesPlayed !== undefined) && (
          <View style={styles.statsSection}>
            {winRate !== undefined && (
              <View style={styles.statBox}>
                <IconSymbol size={20} name="chart.bar.fill" color="#4ade80" />
                <ThemedText style={styles.statValue}>
                  {winRate.toFixed(1)}%
                </ThemedText>
                <ThemedText style={styles.statLabel}>Win Rate</ThemedText>
              </View>
            )}
            {gamesPlayed !== undefined && (
              <View style={styles.statBox}>
                <IconSymbol size={20} name="gamecontroller.fill" color="#60a5fa" />
                <ThemedText style={styles.statValue}>{gamesPlayed}</ThemedText>
                <ThemedText style={styles.statLabel}>Games</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Recent Matches Section */}
        {!loadingMatches && isMatchesRecent(recentMatches) && (
          <View style={styles.matchesSection}>
            <ThemedText style={styles.matchesSectionLabel}>RECENT MATCHES</ThemedText>
            <View style={styles.matchList}>
              {recentMatches.slice(0, 5).map((match, i) => (
                <View key={i} style={[styles.matchRow, match.won ? styles.matchRowWin : styles.matchRowLoss]}>
                  <View style={[styles.matchResultBadge, match.won ? styles.matchResultWin : styles.matchResultLoss]}>
                    <ThemedText style={styles.matchResultText}>{match.won ? 'W' : 'L'}</ThemedText>
                  </View>
                  {getAgentIcon(match.agent || '') ? (
                    <Image source={getAgentIcon(match.agent || '')} style={styles.matchAgentIcon} />
                  ) : (
                    <View style={styles.matchAgentPlaceholder}>
                      <ThemedText style={styles.matchAgentPlaceholderText}>
                        {(match.agent || '?')[0].toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.matchInfo}>
                    <ThemedText style={styles.matchKda}>
                      {match.kills ?? 0}/{match.deaths ?? 0}/{match.assists ?? 0}
                    </ThemedText>
                  </View>
                  {match.placement && (
                    <View style={[
                      styles.matchPlacementPill,
                      match.placement === 1 && styles.matchPlacementPill1st,
                      match.placement === 2 && styles.matchPlacementPill2nd,
                      match.placement === 3 && styles.matchPlacementPill3rd,
                    ]}>
                      <ThemedText style={[
                        styles.matchPlacement,
                        match.placement === 1 && styles.matchPlacement1st,
                        match.placement === 2 && styles.matchPlacement2nd,
                        match.placement === 3 && styles.matchPlacement3rd,
                      ]}>
                        {match.placement === 1 ? 'MVP' : `${match.placement}${match.placement === 2 ? 'nd' : match.placement === 3 ? 'rd' : 'th'}`}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.matchMeta}>
                    {match.map && (
                      <ThemedText style={styles.matchMap} numberOfLines={1}>{match.map}</ThemedText>
                    )}
                    {match.playedAt && (
                      <ThemedText style={styles.matchTime}>{formatTimeAgo(match.playedAt)}</ThemedText>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Details / Edit Section */}
        <View style={styles.detailsSection}>
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
                    <IconSymbol size={14} name="chevron.down" color="#94a3b8" />
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
                    {mainRole && <IconSymbol size={14} name="chevron.down" color="#94a3b8" />}
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
                  <IconSymbol size={14} name="chevron.down" color="#94a3b8" />
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

              {/* Save Button */}
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
            </>
          ) : (
            <>
              {/* View Mode: Region and Main Role - Split Row */}
              <View style={styles.splitRow}>
                <View style={styles.detailRowHalf}>
                  <IconSymbol size={20} name="globe" color="#94a3b8" />
                  <View style={styles.detailTextContainer}>
                    <ThemedText style={styles.detailLabel}>Region</ThemedText>
                    <ThemedText style={styles.detailValue}>{region}</ThemedText>
                  </View>
                </View>

                <View style={styles.detailRowHalf}>
                  <Image
                    source={getRoleIcon(mainRole)}
                    style={styles.roleIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.detailTextContainer}>
                    <ThemedText style={styles.detailLabel}>Main Role</ThemedText>
                    <ThemedText style={styles.detailValue}>{mainRole}</ThemedText>
                  </View>
                </View>
              </View>

              {/* Main Agent - Full Width */}
              <View style={styles.detailRow}>
                <IconSymbol size={20} name="star.fill" color="#94a3b8" />
                <View style={styles.detailTextContainer}>
                  <ThemedText style={styles.detailLabel}>
                    {game === 'valorant' ? 'Main Agent' : 'Main Champion'}
                  </ThemedText>
                  <ThemedText style={styles.detailValue}>{mainAgent}</ThemedText>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  // Profile Section
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  inGameName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 4,
  },
  // Ranks Section
  ranksSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  rankBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  rankIcon: {
    width: 60,
    height: 60,
  },
  rankLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  // Stats Section
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Match List Styles
  matchesSection: {
    marginBottom: 24,
  },
  matchesSectionLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  matchList: {
    gap: 8,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    borderLeftWidth: 3,
  },
  matchRowWin: {
    borderLeftColor: '#4ade80',
  },
  matchRowLoss: {
    borderLeftColor: '#ef4444',
  },
  matchResultBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchResultWin: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  matchResultLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  matchResultText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  matchPlacementPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 4,
  },
  matchPlacementPill1st: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  matchPlacementPill2nd: {
    backgroundColor: 'rgba(192, 192, 192, 0.15)',
  },
  matchPlacementPill3rd: {
    backgroundColor: 'rgba(205, 127, 50, 0.15)',
  },
  matchPlacement: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
  },
  matchPlacement1st: {
    color: '#FFD700',
    fontWeight: '900',
  },
  matchPlacement2nd: {
    color: '#C0C0C0',
    fontWeight: '900',
  },
  matchPlacement3rd: {
    color: '#CD7F32',
    fontWeight: '900',
  },
  matchInfo: {
    flex: 1,
    gap: 2,
  },
  matchAgentIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  matchAgentPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchAgentPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  matchKda: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
  matchMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  matchMap: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    maxWidth: 60,
  },
  matchTime: {
    fontSize: 9,
    color: '#64748b',
  },
  // Details Section
  detailsSection: {
    gap: 12,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
  },
  detailRowHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
  },
  roleIcon: {
    width: 20,
    height: 20,
  },
  detailTextContainer: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  // Edit Fields
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  editRow: {
    flexDirection: 'row',
    gap: 12,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    width: 18,
    height: 18,
  },
  dropdownTextCompact: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  dropdownPlaceholderCompact: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  dropdownListAbsolute: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    zIndex: 100,
  },
  dropdownList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  dropdownScrollCompact: {
    maxHeight: 150,
  },
  dropdownOptionCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownOptionIconSmall: {
    width: 18,
    height: 18,
  },
  dropdownOptionTextCompact: {
    fontSize: 14,
    color: '#94a3b8',
  },
  // Save Button
  saveButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    color: '#64748b',
  },
});
