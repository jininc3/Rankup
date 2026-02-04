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
}: CompactDuoCardProps) {
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  // Track if we've already notified parent
  const [hasNotifiedParent, setHasNotifiedParent] = useState(false);

  // If no avatar URL (placeholder icon), mark as loaded immediately
  useEffect(() => {
    if (!avatar || !avatar.startsWith('http')) {
      setAvatarLoaded(true);
    } else {
      setAvatarLoaded(false);
      setHasNotifiedParent(false);
    }
  }, [avatar]);

  // Notify parent when avatar loads (for coordination)
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
        colors={game === 'valorant' ? ['#3a2c2f', '#2c2f33'] : ['#1e2a3d', '#2c2f33']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Game accent bar */}
        <View style={[styles.accentBar, game === 'valorant' ? styles.valorantAccent : styles.leagueAccent]} />

        {/* Left Section - Avatar */}
        <View style={styles.avatarContainer}>
          {avatar && avatar.startsWith('http') ? (
            <Image
              source={{ uri: avatar }}
              style={styles.avatar}
              onLoad={() => {
                console.log('CompactDuoCard - Avatar loaded successfully:', avatar);
                setAvatarLoaded(true);
              }}
              onError={(error) => {
                console.log('CompactDuoCard - Avatar load error:', error.nativeEvent.error);
                console.log('CompactDuoCard - Failed URL:', avatar);
                setAvatarLoaded(true);
              }}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <IconSymbol size={28} name="person.fill" color="#666" />
            </View>
          )}
        </View>

        {/* Right Section - Info */}
        <View style={styles.infoSection}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.username}>{username}</ThemedText>
            <View style={[styles.gameBadge, game === 'valorant' ? styles.valorantBadge : styles.leagueBadge]}>
              <ThemedText style={styles.gameBadgeText}>
                {game === 'valorant' ? 'VAL' : 'LOL'}
              </ThemedText>
            </View>
          </View>

          {/* Rank Badge */}
          <View style={styles.rankBadge}>
            <Image
              source={getRankIcon(peakRank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.rankText}>{peakRank}</ThemedText>
          </View>

          {/* Details Row */}
          <View style={styles.detailsRow}>
            {/* Main Role */}
            <View style={styles.detailItem}>
              <Image
                source={getRoleIcon(mainRole)}
                style={styles.roleIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.detailText}>{mainRole}</ThemedText>
            </View>

            {/* Looking For */}
            <View style={styles.detailItem}>
              <IconSymbol size={12} name="magnifyingglass" color="#94a3b8" />
              <ThemedText style={styles.detailLabel}>
                {preferredDuoRole === 'Any' ? 'Any Role' : preferredDuoRole}
              </ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
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
    borderWidth: 1,
    borderTopColor: '#3a3f44',
    borderLeftColor: '#3a3f44',
    borderBottomColor: '#16191b',
    borderRightColor: '#16191b',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  valorantAccent: {
    backgroundColor: '#B2313B',
  },
  leagueAccent: {
    backgroundColor: '#1e40af',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#2c2f33',
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#40444b',
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
  infoSection: {
    flex: 1,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    flex: 1,
  },
  gameBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  valorantBadge: {
    backgroundColor: '#B2313B',
  },
  leagueBadge: {
    backgroundColor: '#1e40af',
  },
  gameBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rankIcon: {
    width: 16,
    height: 16,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roleIcon: {
    width: 14,
    height: 14,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
