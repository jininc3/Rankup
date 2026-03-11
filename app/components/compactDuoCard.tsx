import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useState, useEffect } from 'react';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const cardWidth = screenWidth - 32;
const cardHeight = screenHeight * 0.26;

interface MutualFollower {
  odId?: string;
  photoUrl?: string | null;
  displayName?: string;
  username?: string;
}

interface CompactDuoCardProps {
  game: 'valorant' | 'league';
  username?: string;
  avatar?: string;
  peakRank?: string;
  currentRank?: string;
  mainRole?: string;
  preferredDuoRole?: string;
  mutualFollowers?: MutualFollower[];
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
  mutualFollowers = [],
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
      <BlurView intensity={40} tint="dark" style={styles.blurBackground} />

      <View style={styles.cardContent}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
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

          <View style={styles.userInfo}>
            <ThemedText style={styles.username} numberOfLines={1}>
              {username}
            </ThemedText>
            <View style={styles.subRow}>
              <View style={styles.gameTag}>
                <Image
                  source={GAME_LOGOS[game]}
                  style={styles.gameIcon}
                  resizeMode="contain"
                />
                <ThemedText style={styles.gameText}>
                  {game === 'valorant' ? 'VALORANT' : 'LEAGUE'}
                </ThemedText>
              </View>

              {mutualFollowers.length > 0 && (
                <View style={styles.mutualsContainer}>
                  <View style={styles.mutualsDot} />
                  <View style={styles.stackedAvatars}>
                    {mutualFollowers.slice(0, 3).map((follower, index) => (
                      <View
                        key={follower.odId || index}
                        style={[
                          styles.stackedAvatarContainer,
                          { zIndex: 5 - index, marginLeft: index === 0 ? 0 : -6 }
                        ]}
                      >
                        {follower.photoUrl ? (
                          <Image
                            source={{ uri: follower.photoUrl }}
                            style={styles.stackedAvatar}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.stackedAvatarPlaceholder}>
                            <ThemedText style={styles.stackedAvatarText}>
                              {(follower.displayName || follower.username || '?').charAt(0).toUpperCase()}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                  <ThemedText style={styles.mutualsText}>
                    {mutualFollowers.length} mutual{mutualFollowers.length !== 1 ? 's' : ''}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Main Role */}
          <View style={styles.roleContainer}>
            <Image
              source={getRoleIcon(mainRole)}
              style={styles.roleIcon}
              resizeMode="contain"
            />
            <ThemedText style={styles.roleText}>{mainRole}</ThemedText>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Current</ThemedText>
            <View style={styles.statContent}>
              <Image
                source={getRankIcon(currentRank)}
                style={styles.rankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankText} numberOfLines={1}>{currentRank}</ThemedText>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Peak</ThemedText>
            <View style={styles.statContent}>
              <Image
                source={getRankIcon(peakRank)}
                style={styles.rankIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankText} numberOfLines={1}>{peakRank}</ThemedText>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>LF Duo</ThemedText>
            <View style={styles.statContent}>
              <Image
                source={getRoleIcon(preferredDuoRole === 'Any' ? mainRole : preferredDuoRole)}
                style={styles.smallRoleIcon}
                resizeMode="contain"
              />
              <ThemedText style={styles.rankText} numberOfLines={1}>{preferredDuoRole}</ThemedText>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.cardWrapper}>
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
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(18, 18, 22, 0.9)',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  // Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gameIcon: {
    width: 12,
    height: 12,
    opacity: 0.6,
  },
  gameText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    letterSpacing: 0.3,
  },
  // Mutuals
  mutualsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mutualsDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#444',
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatarContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(18, 18, 22, 1)',
    overflow: 'hidden',
  },
  stackedAvatar: {
    width: '100%',
    height: '100%',
  },
  stackedAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedAvatarText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#666',
  },
  mutualsText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#555',
  },
  // Role (right side)
  roleContainer: {
    alignItems: 'center',
    gap: 4,
  },
  roleIcon: {
    width: 32,
    height: 32,
    opacity: 0.9,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#777',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rankIcon: {
    width: 26,
    height: 26,
  },
  smallRoleIcon: {
    width: 20,
    height: 20,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#ccc',
    maxWidth: 55,
  },
});
