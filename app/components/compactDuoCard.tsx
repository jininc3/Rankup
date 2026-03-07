import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';

const { width: screenWidth } = Dimensions.get('window');

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

  // Subtle muted colors
  const gameAccentColor = game === 'valorant' ? '#8b3d47' : '#3d6a70';
  const gameAccentLight = game === 'valorant' ? '#a85561' : '#4d8a92';

  const CardContent = (
    <View style={styles.cardOuter}>
      {/* 3D Shadow layers */}
      <View style={styles.shadow3} />
      <View style={styles.shadow2} />
      <View style={styles.shadow1} />

      {/* Main Card */}
      <View style={[styles.card, isEditMode && styles.cardEditMode]}>
        {/* Background */}
        <LinearGradient
          colors={['#1a1d21', '#0f1114']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardBackground}
        />

        {/* Header Bar - More subtle */}
        <View style={styles.headerBar}>
          <ThemedText style={styles.headerTitle}>
            {game === 'valorant' ? 'VALORANT' : 'LEAGUE'}
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>DUO CARD</ThemedText>
          <View style={styles.headerAccent}>
            <ThemedText style={[styles.headerAccentText, { color: gameAccentLight }]}>&gt;&gt;&gt;</ThemedText>
          </View>
        </View>

        {/* Edit mode indicator */}
        {isEditMode && (
          <View style={styles.editBadge}>
            <IconSymbol size={12} name="pencil" color="#fff" />
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Username - Top Row */}
          <ThemedText style={styles.name} numberOfLines={1}>
            {username}
          </ThemedText>

          {/* Content Row: Photo | Roles | Rank */}
          <View style={styles.contentRow}>
            {/* Left: Photo */}
            <View style={styles.photoSection}>
              <View style={styles.photoFrame}>
                {avatar && avatar.startsWith('http') ? (
                  <Image
                    source={{ uri: avatar }}
                    style={styles.photo}
                    onLoad={() => setAvatarLoaded(true)}
                    onError={() => setAvatarLoaded(true)}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <ThemedText style={styles.photoInitial}>
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

            {/* Center: Role Info */}
            <View style={styles.roleInfoContainer}>
              <View style={styles.roleItem}>
                <ThemedText style={styles.roleLabel}>MAIN</ThemedText>
                <View style={styles.roleValueRow}>
                  <Image
                    source={getRoleIcon(mainRole)}
                    style={styles.roleIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.roleValue}>{mainRole}</ThemedText>
                </View>
              </View>
              <View style={styles.roleItem}>
                <ThemedText style={styles.roleLabel}>LOOKING FOR</ThemedText>
                <View style={styles.roleValueRow}>
                  <Image
                    source={getRoleIcon(preferredDuoRole)}
                    style={styles.roleIcon}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.roleValue}>{preferredDuoRole}</ThemedText>
                </View>
              </View>
            </View>

            {/* Right: Rank */}
            <View style={styles.rankSection}>
              <ThemedText style={styles.rankText}>{peakRank}</ThemedText>
              <View style={styles.rankIconContainer}>
                <View style={[styles.rankGlow, { backgroundColor: gameAccentColor }]} />
                <View style={[styles.rankBadge, { borderColor: gameAccentColor }]}>
                  <Image
                    source={getRankIcon(peakRank)}
                    style={styles.rankIconMain}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer Bar */}
        <View style={styles.footerBar}>
          <View style={[styles.footerAccent, { backgroundColor: gameAccentColor }]} />
          <View style={styles.footerContent}>
            <ThemedText style={styles.footerText}>RANKUP</ThemedText>
            <View style={styles.arrowSection}>
              <IconSymbol size={14} name="chevron.right" color="#444" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    marginBottom: 8,
  },
  // 3D Shadow layers
  shadow3: {
    position: 'absolute',
    top: 10,
    left: 6,
    right: 6,
    bottom: -10,
    backgroundColor: '#000',
    borderRadius: 14,
    opacity: 0.15,
  },
  shadow2: {
    position: 'absolute',
    top: 6,
    left: 3,
    right: 3,
    bottom: -6,
    backgroundColor: '#000',
    borderRadius: 13,
    opacity: 0.2,
  },
  shadow1: {
    position: 'absolute',
    top: 3,
    left: 1,
    right: 1,
    bottom: -3,
    backgroundColor: '#000',
    borderRadius: 12,
    opacity: 0.25,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#232528',
  },
  cardEditMode: {
    borderWidth: 2,
    borderColor: '#6b4050',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  // Header Bar - Subtle
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2023',
    gap: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
  },
  headerAccent: {
    marginLeft: 'auto',
  },
  headerAccentText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  editBadge: {
    position: 'absolute',
    top: 44,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6b4050',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  // Main Content Area
  mainContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  // Username at top
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e5e5',
    letterSpacing: -0.2,
  },
  // Content Row: Photo | Roles | Rank
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Photo Section
  photoSection: {
    position: 'relative',
  },
  photoFrame: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1a1c1e',
    borderWidth: 1,
    borderColor: '#2a2d30',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151719',
  },
  photoInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2a2d32',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0f1114',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3d7a4a',
  },
  // Role Info - Horizontal Row in Center
  roleInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  roleItem: {
    gap: 1,
  },
  roleLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#4a4d52',
    letterSpacing: 0.5,
  },
  roleValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9a9da2',
  },
  roleIcon: {
    width: 13,
    height: 13,
    opacity: 0.85,
  },
  // Rank Section - Right Side
  rankSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  rankIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    opacity: 0.2,
  },
  rankBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#13151a',
    borderRadius: 8,
    padding: 5,
    borderWidth: 2,
  },
  rankIconMain: {
    width: 36,
    height: 36,
  },
  rankText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#7a7d82',
    marginBottom: 3,
    textAlign: 'center',
    letterSpacing: 0.2,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#3a3d42',
    letterSpacing: 2,
  },
  arrowSection: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#151719',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
