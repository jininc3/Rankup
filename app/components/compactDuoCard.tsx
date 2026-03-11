import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const cardWidth = screenWidth - 40; // Full width with padding
const cardHeight = screenHeight * 0.65; // 65% of screen height

interface CompactDuoCardProps {
  game: 'valorant' | 'league';
  username?: string;
  avatar?: string;
  peakRank?: string;
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
  league: require('@/assets/images/lol.png'),
};

export default function CompactDuoCard({
  game,
  username = 'YourUsername',
  avatar,
  peakRank = 'Unranked',
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

      {/* Game Badge */}
      <View style={styles.gameBadge}>
        <Image
          source={GAME_LOGOS[game]}
          style={styles.gameLogo}
          resizeMode="contain"
        />
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarContainer}>
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
        {/* Online indicator */}
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
        </View>
      </View>

      {/* Username */}
      <ThemedText style={styles.username} numberOfLines={1}>
        {username}
      </ThemedText>

      {/* Rank Section */}
      <View style={styles.rankSection}>
        <Image
          source={getRankIcon(peakRank)}
          style={styles.rankIcon}
          resizeMode="contain"
        />
        <ThemedText style={styles.rankText} numberOfLines={1}>
          {peakRank}
        </ThemedText>
      </View>

      {/* Role Info */}
      <View style={styles.roleSection}>
        <View style={styles.roleItem}>
          <Image
            source={getRoleIcon(mainRole)}
            style={styles.roleIcon}
            resizeMode="contain"
          />
          <ThemedText style={styles.roleText}>{mainRole}</ThemedText>
        </View>
      </View>

      {/* Looking For */}
      <View style={styles.lookingForSection}>
        <ThemedText style={styles.lookingForLabel}>LF</ThemedText>
        <ThemedText style={styles.lookingForValue}>{preferredDuoRole}</ThemedText>
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
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#232528',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  // Game Badge
  gameBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f1114',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2d30',
  },
  gameLogo: {
    width: 22,
    height: 22,
  },
  // Avatar
  avatarContainer: {
    position: 'relative',
    marginTop: 20,
  },
  avatarFrame: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#1a1c1e',
    borderWidth: 3,
    borderColor: '#2a2d30',
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
    fontSize: 48,
    fontWeight: '700',
    color: '#3a3d42',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#131518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3d7a4a',
  },
  // Username
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e5e5',
    letterSpacing: -0.5,
    textAlign: 'center',
    maxWidth: '100%',
    marginTop: 16,
  },
  // Rank Section
  rankSection: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rankIcon: {
    width: 80,
    height: 80,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9a9da2',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  // Role Section
  roleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1c1e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2d30',
  },
  roleIcon: {
    width: 20,
    height: 20,
    opacity: 0.9,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9a9da2',
  },
  // Looking For Section
  lookingForSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  lookingForLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a4d52',
    letterSpacing: 0.3,
  },
  lookingForValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a7d82',
  },
});
