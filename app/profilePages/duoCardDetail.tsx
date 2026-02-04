import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image, StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { getRecentMatches, RecentMatchResult } from '@/services/riotService';

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

// Avatar component with error fallback
function AvatarWithFallback({ avatar }: { avatar?: string }) {
  const [imageError, setImageError] = useState(false);

  console.log('AvatarWithFallback - avatar:', avatar);
  console.log('AvatarWithFallback - imageError:', imageError);

  if (!avatar || !avatar.startsWith('http') || imageError) {
    return (
      <View style={styles.avatarPlaceholder}>
        <IconSymbol size={32} name="person.fill" color="#666" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: avatar }}
      style={styles.avatar}
      onError={(error) => {
        console.log('Avatar load error - Full details:', JSON.stringify(error.nativeEvent));
        console.log('Avatar that failed to load:', avatar);
        setImageError(true);
      }}
      onLoad={() => {
        console.log('Avatar loaded successfully:', avatar);
      }}
    />
  );
}

export default function DuoCardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse params
  const game = params.game as 'valorant' | 'league';
  const username = params.username as string;
  const rawAvatar = params.avatar;
  // Handle both string and array (expo-router sometimes converts params to arrays)
  let avatar = Array.isArray(rawAvatar) ? rawAvatar[0] : rawAvatar;

  // Fix: Re-encode the Firebase Storage URL path if it got decoded during navigation
  if (avatar && avatar.includes('firebasestorage.googleapis.com')) {
    // Split URL into base and query params
    const [urlWithPath, queryString] = avatar.split('?');
    const [baseUrl, ...pathParts] = urlWithPath.split('/o/');
    if (pathParts.length > 0) {
      // Re-encode the path portion (everything after /o/)
      const encodedPath = pathParts.join('/o/').split('/').map(encodeURIComponent).join('%2F');
      avatar = `${baseUrl}/o/${encodedPath}${queryString ? '?' + queryString : ''}`;
      console.log('Fixed avatar URL:', avatar);
    }
  }

  const peakRank = params.peakRank as string;
  const currentRank = params.currentRank as string;
  const region = params.region as string;
  const mainRole = params.mainRole as string;
  const mainAgent = params.mainAgent as string;
  const userId = params.userId as string | undefined;

  const [recentMatches, setRecentMatches] = useState<RecentMatchResult[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

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

  // Debug log
  console.log('DuoCardDetail - Raw avatar param:', rawAvatar);
  console.log('DuoCardDetail - Processed avatar:', avatar);

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
        {/* Header with Close Button */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Duo Profile</ThemedText>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <IconSymbol size={24} name="xmark" color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Detail Container */}
        <View style={styles.detailContainer}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['#2c2f33', '#23272a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileGradient}
            >
              {/* Background Game Logo */}
              <Image
                source={game === 'valorant'
                  ? require('@/assets/images/valorant-logo.png')
                  : require('@/assets/images/lol.png')
                }
                style={styles.backgroundGameLogo}
                resizeMode="contain"
              />

              <View style={styles.profileContent}>
                {/* RankUp Profile Icon (Square) */}
                <View style={styles.avatarContainer}>
                  <AvatarWithFallback avatar={avatar} />
                </View>
                <ThemedText style={styles.username}>{username}</ThemedText>
                <ThemedText style={styles.regionText}>{region.toUpperCase()}</ThemedText>

                {/* View Profile Button */}
                {userId && (
                  <TouchableOpacity
                    style={styles.viewProfileButton}
                    onPress={handleUserPress}
                  >
                    <LinearGradient
                      colors={game === 'valorant' ? ['#B2313B', '#9a2831'] : ['#1e3a8a', '#1e40af']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.viewProfileButtonGradient}
                    >
                      <IconSymbol size={14} name="person.fill" color="#fff" />
                      <ThemedText style={styles.viewProfileButtonText}>View Full Profile</ThemedText>
                      <IconSymbol size={14} name="arrow.right" color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Ranks Grid */}
          <View style={styles.ranksGrid}>
            {/* Peak Rank */}
            <View style={styles.rankCard}>
              <View style={styles.rankCardHeader}>
                <ThemedText style={styles.rankCardTitle}>Peak Rank</ThemedText>
              </View>
              <View style={styles.rankCardContent}>
                <Image
                  source={getRankIcon(peakRank)}
                  style={styles.rankIconLarge}
                  resizeMode="contain"
                />
                <ThemedText style={styles.rankText}>{peakRank}</ThemedText>
              </View>
            </View>

            {/* Current Rank */}
            <View style={styles.rankCard}>
              <View style={styles.rankCardHeader}>
                <ThemedText style={styles.rankCardTitle}>Current Rank</ThemedText>
              </View>
              <View style={styles.rankCardContent}>
                <Image
                  source={getRankIcon(currentRank)}
                  style={styles.rankIconLarge}
                  resizeMode="contain"
                />
                <ThemedText style={styles.rankText}>{currentRank}</ThemedText>
              </View>
            </View>
          </View>

          {/* Last 5 Games */}
          <View style={styles.recentGamesSection}>
            <View style={styles.recentGamesCard}>
              <ThemedText style={styles.recentGamesTitle}>Last 5 Games</ThemedText>
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
                        <ThemedText style={styles.gameCircleIcon}>
                          {match.won ? 'W' : 'L'}
                        </ThemedText>
                      </View>
                    );
                  })
                ) : (
                  <ThemedText style={styles.recentGamesEmpty}>No recent games</ThemedText>
                )}
              </View>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <ThemedText style={styles.sectionTitle}>Player Info</ThemedText>

            {/* Main Role */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Image
                  source={getRoleIcon(mainRole)}
                  style={styles.roleIcon}
                  resizeMode="contain"
                />
                <View style={styles.statInfo}>
                  <ThemedText style={styles.statLabel}>Main Role</ThemedText>
                  <ThemedText style={styles.statValue}>{mainRole}</ThemedText>
                </View>
              </View>
            </View>

            {/* Main Agent/Champion */}
            <View style={styles.statCard}>
              <View style={styles.statInfo}>
                <ThemedText style={styles.statLabel}>
                  {game === 'valorant' ? 'Main Agent' : 'Main Champion'}
                </ThemedText>
                <ThemedText style={styles.statValue}>{mainAgent}</ThemedText>
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
    backgroundColor: '#1e2124',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#40444b',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  detailContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#23272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderTopColor: '#3a3f44',
    borderLeftColor: '#3a3f44',
    borderBottomColor: '#16191b',
    borderRightColor: '#16191b',
  },
  profileCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileGradient: {
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundGameLogo: {
    position: 'absolute',
    width: 150,
    height: 150,
    top: '50%',
    left: '50%',
    marginTop: -75,
    marginLeft: -75,
    opacity: 0.08,
  },
  profileContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#40444b',
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#40444b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#40444b',
  },
  username: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 2,
  },
  regionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  viewProfileButton: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  viewProfileButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewProfileButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  ranksGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  rankCard: {
    flex: 1,
    backgroundColor: '#2c2f33',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#40444b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rankCardHeader: {
    marginBottom: 8,
  },
  rankCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rankCardContent: {
    alignItems: 'center',
    gap: 4,
  },
  rankIconLarge: {
    width: 48,
    height: 48,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  statsSection: {
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  statCard: {
    backgroundColor: '#2c2f33',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#40444b',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleIcon: {
    width: 28,
    height: 28,
  },
  statInfo: {
    gap: 2,
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  recentGamesSection: {
    marginBottom: 12,
  },
  recentGamesCard: {
    backgroundColor: 'rgba(44,47,51,0.55)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(64,68,75,0.6)',
  },
  recentGamesTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  recentGamesRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCircleWin: {
    backgroundColor: '#15803d',
  },
  gameCircleLoss: {
    backgroundColor: '#991b1b',
  },
  gameCirclePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#23272a',
    borderWidth: 1,
    borderColor: '#40444b',
  },
  gameCircleIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  recentGamesEmpty: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
