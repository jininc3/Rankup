import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width: screenWidth } = Dimensions.get('window');

interface Game {
  id: number;
  name: string;
  rank: string;
  trophies: number;
  icon: string;
  wins: number;
  losses: number;
  winRate: number;
  recentMatches: string[];
  profileIconId?: number;
  valorantCard?: string;
}

interface ValorantRankCardProps {
  game: Game;
  username: string;
  viewOnly?: boolean;
  userId?: string;
}

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
  iron1: require('@/assets/images/valorantranks/iron1.png'),
  iron2: require('@/assets/images/valorantranks/iron2.png'),
  iron3: require('@/assets/images/valorantranks/iron3.png'),
  bronze1: require('@/assets/images/valorantranks/bronze1.png'),
  bronze2: require('@/assets/images/valorantranks/bronze2.png'),
  bronze3: require('@/assets/images/valorantranks/bronze3.png'),
  silver1: require('@/assets/images/valorantranks/silver1.png'),
  silver2: require('@/assets/images/valorantranks/silver2.png'),
  silver3: require('@/assets/images/valorantranks/silver3.png'),
  gold1: require('@/assets/images/valorantranks/gold1.png'),
  gold2: require('@/assets/images/valorantranks/gold2.png'),
  gold3: require('@/assets/images/valorantranks/gold3.png'),
  platinum1: require('@/assets/images/valorantranks/platinum1.png'),
  platinum2: require('@/assets/images/valorantranks/platinum2.png'),
  platinum3: require('@/assets/images/valorantranks/platinum3.png'),
  diamond1: require('@/assets/images/valorantranks/diamond1.png'),
  diamond2: require('@/assets/images/valorantranks/diamond2.png'),
  diamond3: require('@/assets/images/valorantranks/diamond3.png'),
  ascendant1: require('@/assets/images/valorantranks/ascendant1.png'),
  ascendant2: require('@/assets/images/valorantranks/ascendant2.png'),
  ascendant3: require('@/assets/images/valorantranks/ascendant3.png'),
  immortal1: require('@/assets/images/valorantranks/immortal1.png'),
  immortal2: require('@/assets/images/valorantranks/immortal2.png'),
  immortal3: require('@/assets/images/valorantranks/immortal3.png'),
};

export default function ValorantRankCard({ game, username, viewOnly = false, userId }: ValorantRankCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (viewOnly) return;
    router.push({
      pathname: '/components/valorantGameStats',
      params: {
        game: JSON.stringify(game),
        ...(userId && { userId }),
      },
    });
  };

  const getRankIcon = (rank: string) => {
    if (!rank || rank === 'Unranked') {
      return VALORANT_RANK_ICONS.unranked;
    }

    const parts = rank.split(' ');
    const tier = parts[0].toLowerCase();
    const subdivision = parts[1];

    if (subdivision) {
      const subdivisionKey = tier + subdivision;
      if (VALORANT_RANK_ICONS[subdivisionKey]) {
        return VALORANT_RANK_ICONS[subdivisionKey];
      }
    }

    return VALORANT_RANK_ICONS[tier] || VALORANT_RANK_ICONS.unranked;
  };

  const gameAccentColor = '#8c2a38';
  const gameAccentLight = '#a03542';

  return (
    <View style={styles.cardOuter}>
      {/* 3D Shadow layers */}
      <View style={styles.shadow3} />
      <View style={styles.shadow2} />
      <View style={styles.shadow1} />

      {/* Main Card */}
      <View style={styles.card}>
        {/* Background */}
        <LinearGradient
          colors={['#8c2a38', '#6d2230', '#5a1c28']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBackground}
        />

        {/* Valorant logo watermark */}
        <Image
          source={require('@/assets/images/valorant.png')}
          style={styles.backgroundLogo}
          resizeMode="contain"
        />

        {/* Header Bar */}
        <View style={styles.headerBar}>
          <ThemedText style={styles.headerTitle}>VALORANT</ThemedText>
          <View style={styles.headerDivider} />
          <ThemedText style={styles.headerSubtitle}>RANKCARD</ThemedText>
          <View style={styles.headerAccent}>
            <ThemedText style={[styles.headerAccentText, { color: gameAccentLight }]}>&gt;&gt;&gt;</ThemedText>
          </View>
        </View>

        {/* Divider Line */}
        <View style={styles.sectionDivider}>
          <View style={[styles.dividerAccent, { backgroundColor: gameAccentColor }]} />
          <View style={styles.dividerLine} />
        </View>

        {/* Main Content Area - Side by Side Layout */}
        <View style={styles.mainContent}>
          {/* Left: Photo + Username */}
          <View style={styles.leftSection}>
            <View style={styles.photoFrame}>
              {game.valorantCard ? (
                <Image
                  source={{ uri: game.valorantCard }}
                  defaultSource={require('@/assets/images/valorant-black.png')}
                  style={styles.photo}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <ThemedText style={styles.photoInitial}>
                    {username[0]?.toUpperCase() || '?'}
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={styles.username} numberOfLines={1}>
              {username}
            </ThemedText>
          </View>

          {/* Right: Rank Display */}
          <View style={styles.rankSection}>
            <ThemedText style={styles.rankLabel}>CURRENT RANK</ThemedText>
            <View style={styles.rankIconContainer}>
              <View style={[styles.rankGlow, { backgroundColor: gameAccentColor }]} />
              <Image
                source={getRankIcon(game.rank)}
                style={styles.rankIconMain}
                resizeMode="contain"
              />
            </View>
            <ThemedText style={styles.rankValue}>{game.rank}</ThemedText>
          </View>
        </View>

        {/* Footer Bar */}
        <View style={styles.footerBar}>
          <View style={[styles.footerAccent, { backgroundColor: gameAccentColor }]} />
          <View style={styles.footerContent}>
            <ThemedText style={styles.footerText}>RANKUP</ThemedText>
            <View style={styles.arrowSection}>
              <IconSymbol size={14} name="chevron.right" color="rgba(255,255,255,0.5)" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    height: 220,
  },
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
    height: 220,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#232528',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundLogo: {
    position: 'absolute',
    width: 100,
    height: 100,
    right: 16,
    top: '50%',
    marginTop: -50,
    opacity: 0.12,
  },
  // Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 1.5,
  },
  headerDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#3a3d42',
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
  // Section Divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 1,
  },
  dividerAccent: {
    width: 40,
    height: 2,
    opacity: 0.7,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2d32',
  },
  // Main Content Area
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  // Left Section: Photo + Username (positioned absolutely)
  leftSection: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFrame: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1c1e',
    borderWidth: 1,
    borderColor: '#2a2d30',
    marginBottom: 8,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#2a2d32',
  },
  username: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8a8d92',
    textAlign: 'center',
  },
  // Right Section: Rank Display
  rankSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rankGlow: {
    position: 'absolute',
    width: 85,
    height: 85,
    borderRadius: 42,
    opacity: 0.3,
  },
  rankIconMain: {
    width: 65,
    height: 65,
  },
  rankLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#5a5d62',
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  rankValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  // Footer Bar
  footerBar: {
    borderTopWidth: 1,
    borderTopColor: '#6d2230',
    backgroundColor: '#5a1c28',
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
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  arrowSection: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6d2230',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
