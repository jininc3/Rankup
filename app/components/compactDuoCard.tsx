import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const cardWidth = screenWidth - 40;
const cardHeight = screenHeight * 0.32;

interface CompactDuoCardProps {
  game: 'valorant' | 'league';
  username?: string;
  avatar?: string;
  peakRank?: string;
  currentRank?: string;
  mainRole?: string;
  preferredDuoRole?: string;
  onPress?: () => void;
  onAvatarLoad?: () => void;
  showContent?: boolean;
  isEditMode?: boolean;
}

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

// Game logo mapping
const GAME_LOGOS: { [key: string]: any } = {
  valorant: require('@/assets/images/valorant-red.png'),
  league: require('@/assets/images/lol-icon.png'),
};

export default function CompactDuoCard({
  game,
  username = 'YourUsername',
  avatar,
  peakRank = 'Unranked',
  currentRank = 'Unranked',
  mainRole = 'Mid',
  preferredDuoRole = 'Any',
  onPress,
  onAvatarLoad,
  showContent = true,
  isEditMode = false,
}: CompactDuoCardProps) {
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [hasNotifiedParent, setHasNotifiedParent] = useState(false);

  useEffect(() => {
    if (!avatar || !avatar.startsWith('http')) {
      setAvatarLoaded(true);
    } else {
      setAvatarLoaded(false);
      setHasNotifiedParent(false);
    }
  }, [avatar]);

  useEffect(() => {
    if (avatarLoaded && onAvatarLoad && !hasNotifiedParent) {
      onAvatarLoad();
      setHasNotifiedParent(true);
    }
  }, [avatarLoaded, onAvatarLoad, hasNotifiedParent]);

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

  const CardContent = (
    <View style={styles.card}>
      <LinearGradient
        colors={['#1a1d21', '#131518']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardBackground}
      />

      {/* Header: Avatar + Username | Game Logo */}
      <View style={styles.header}>
        <View style={styles.userSection}>
          {/* Square Profile Icon */}
          <View style={styles.avatarFrame}>
            {avatar && avatar.startsWith('http') ? (
              <Image
                source={{ uri: avatar }}
                style={styles.avatar}
                onLoad={() => setAvatarLoaded(true)}
                onError={() => setAvatarLoaded(true)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <ThemedText style={styles.avatarInitial}>
                  {username[0]?.toUpperCase() || '?'}
                </ThemedText>
              </View>
            )}
          </View>
          {/* Username */}
          <ThemedText style={styles.username} numberOfLines={1}>
            {username}
          </ThemedText>
        </View>

        {/* Game Logo */}
        <Image
          source={GAME_LOGOS[game]}
          style={styles.gameLogo}
          resizeMode="contain"
        />
      </View>

      {/* Stats - Vertical Layout */}
      <View style={styles.statsContainer}>
        {/* Peak Rank */}
        <View style={styles.statRow}>
          <ThemedText style={styles.statLabel}>Peak Rank</ThemedText>
          <View style={styles.statValue}>
            <Image
              source={getRankIcon(peakRank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.rankText}>{peakRank}</ThemedText>
          </View>
        </View>

        {/* Current Rank */}
        <View style={styles.statRow}>
          <ThemedText style={styles.statLabel}>Current Rank</ThemedText>
          <View style={styles.statValue}>
            <Image
              source={getRankIcon(currentRank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.rankText}>{currentRank}</ThemedText>
          </View>
        </View>

        {/* Role/Position */}
        <View style={styles.statRow}>
          <ThemedText style={styles.statLabel}>Role</ThemedText>
          <View style={styles.statValue}>
            <Image
              source={getRoleIcon(mainRole)}
              style={styles.roleIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.rankText}>{mainRole}</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.cardWrapper}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return <View style={styles.cardWrapper}>{CardContent}</View>;
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: cardWidth,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    height: cardHeight,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#232528',
    padding: 16,
    justifyContent: 'space-between',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarFrame: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1c1e',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#3a3d42',
  },
  username: {
    fontSize: 17,
    fontWeight: '700',
    color: '#e5e5e5',
    letterSpacing: -0.3,
    flex: 1,
  },
  gameLogo: {
    width: 26,
    height: 26,
    opacity: 0.7,
  },
  // Stats
  statsContainer: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  statValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankIcon: {
    width: 24,
    height: 24,
  },
  roleIcon: {
    width: 22,
    height: 22,
    opacity: 0.9,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
