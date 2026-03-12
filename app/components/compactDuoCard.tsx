import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth - 32;
const cardHeight = cardWidth * 0.55; // Credit card aspect ratio

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

// Game background images
const GAME_BACKGROUNDS: { [key: string]: any } = {
  valorant: require('@/assets/images/valorant-background.png'),
  league: require('@/assets/images/lol-background.png'),
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
      {/* Background Image */}
      <Image
        source={GAME_BACKGROUNDS[game]}
        style={styles.backgroundImage}
        resizeMode="cover"
        blurRadius={10}
      />
      {/* Angled Fade Overlay */}
      <LinearGradient
        colors={['rgb(18, 18, 22)', 'rgba(18, 18, 22, 0.9)', 'rgba(18, 18, 22, 0.5)', 'rgba(18, 18, 22, 0.3)']}
        locations={[0, 0.3, 0.6, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeOverlay}
      />

      <View style={styles.cardContent}>
        {/* Left Side: Avatar + User Info */}
        <View style={styles.leftSection}>
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
                <View style={styles.stackedAvatars}>
                  {mutualFollowers.slice(0, 3).map((follower, index) => (
                    <View
                      key={follower.odId || index}
                      style={[
                        styles.stackedAvatarContainer,
                        { zIndex: 5 - index, marginLeft: index === 0 ? 0 : -5 }
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

        {/* Right Side: Stats Vertical */}
        <View style={styles.statsColumn}>
          {/* Current Rank */}
          <View style={styles.statItem}>
            <Image
              source={getRankIcon(currentRank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
            <View style={styles.statTextGroup}>
              <ThemedText style={styles.rankText} numberOfLines={1}>{currentRank}</ThemedText>
              <ThemedText style={styles.statLabel}>CURRENT</ThemedText>
            </View>
          </View>

          <View style={styles.statDivider} />

          {/* Peak Rank */}
          <View style={styles.statItem}>
            <Image
              source={getRankIcon(peakRank)}
              style={styles.rankIcon}
              resizeMode="contain"
            />
            <View style={styles.statTextGroup}>
              <ThemedText style={styles.rankText} numberOfLines={1}>{peakRank}</ThemedText>
              <ThemedText style={styles.statLabel}>PEAK</ThemedText>
            </View>
          </View>

          <View style={styles.statDivider} />

          {/* Main Role */}
          <View style={styles.statItem}>
            <Image
              source={getRoleIcon(mainRole)}
              style={styles.roleIcon}
              resizeMode="contain"
            />
            <View style={styles.statTextGroup}>
              <ThemedText style={styles.roleText} numberOfLines={1}>{mainRole}</ThemedText>
              <ThemedText style={styles.statLabelSmall}>ROLE</ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom Left Label */}
        <View style={styles.duoCardLabel}>
          <ThemedText style={styles.duoCardLabelText}>DUO CARD</ThemedText>
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
    // 3D Shadow effect
    shadowColor: '#000',
    shadowOffset: {
      width: -4,
      height: 6,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  card: {
    width: '100%',
    height: cardHeight,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgb(18, 18, 22)',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.95,
  },
  fadeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    padding: 12,
  },
  // Left Section
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  gameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  gameIcon: {
    width: 11,
    height: 11,
    opacity: 0.7,
  },
  gameText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#888',
    letterSpacing: 0.3,
  },
  // Mutuals
  mutualsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    borderColor: 'rgb(18, 18, 22)',
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
    fontSize: 7,
    fontWeight: '600',
    color: '#666',
  },
  mutualsText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#666',
  },
  // Stats Column (Right Side)
  statsColumn: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingLeft: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statTextGroup: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'flex-end',
  },
  rankIcon: {
    width: 28,
    height: 28,
    marginTop: 4,
  },
  roleIcon: {
    width: 20,
    height: 20,
    marginTop: 3,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  statLabelSmall: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.3,
  },
  // Duo Card Label
  duoCardLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  duoCardLabelText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 1,
  },
});
