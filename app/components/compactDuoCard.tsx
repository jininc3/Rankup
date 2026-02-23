import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';

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

  const gameAccentColor = game === 'valorant' ? '#ff4655' : '#c89b3c';

  const CardContent = (
    <View style={[styles.card, isEditMode && styles.cardEditMode]}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#252830', '#1c1f24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardBackground}
      />

      {/* Left accent line */}
      <View style={[styles.accentLine, { backgroundColor: isEditMode ? '#c42743' : gameAccentColor }]} />

      {/* Edit mode indicator */}
      {isEditMode && (
        <View style={styles.editBadge}>
          <IconSymbol size={12} name="pencil" color="#fff" />
        </View>
      )}

      <View style={styles.cardContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: gameAccentColor }]}>
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
          <View style={styles.onlineIndicator} />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Username Row */}
          <View style={styles.usernameRow}>
            <ThemedText style={styles.username} numberOfLines={1}>
              {username}
            </ThemedText>
            <View style={[styles.gameTag, { backgroundColor: `${gameAccentColor}20` }]}>
              <ThemedText style={[styles.gameTagText, { color: gameAccentColor }]}>
                {game === 'valorant' ? 'VAL' : 'LOL'}
              </ThemedText>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {/* Rank */}
            <View style={styles.statItem}>
              <Image
                source={getRankIcon(peakRank)}
                style={styles.rankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankText}>{peakRank}</ThemedText>
            </View>

            {/* Divider */}
            <View style={styles.statDivider} />

            {/* Role */}
            <View style={styles.statItem}>
              <Image
                source={getRoleIcon(mainRole)}
                style={styles.roleIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.roleText}>{mainRole}</ThemedText>
            </View>
          </View>

          {/* Looking For */}
          <View style={styles.lookingForRow}>
            <IconSymbol size={12} name="eyes" color="#666" />
            <ThemedText style={styles.lookingForText}>
              Looking for: <ThemedText style={styles.lookingForValue}>{preferredDuoRole}</ThemedText>
            </ThemedText>
          </View>
        </View>

        {/* Arrow indicator */}
        <View style={styles.arrowContainer}>
          <IconSymbol size={18} name="chevron.right" color="#444" />
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardEditMode: {
    borderWidth: 1,
    borderColor: '#c42743',
  },
  editBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c42743',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 14,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    padding: 2,
    backgroundColor: '#1a1d20',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#2c2f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#1c1f24',
  },
  infoSection: {
    flex: 1,
    gap: 6,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  gameTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gameTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#333',
  },
  rankIcon: {
    width: 18,
    height: 18,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  roleIcon: {
    width: 16,
    height: 16,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  lookingForRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lookingForText: {
    fontSize: 12,
    color: '#666',
  },
  lookingForValue: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  arrowContainer: {
    paddingLeft: 8,
  },
});
